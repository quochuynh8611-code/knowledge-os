# Post-Phase 6k.d: Runtime Crash Instrumentation for Full-App White Screen

**Status:** RED — design approved, awaiting Human Gate commit approval
**Phase:** 6k.d
**Depends on:** 6k.a, 6k.b, 6k.c

---

## Problem Statement

All known DataProvider / modal storage seams have been hardened (6k.a–6k.c). Unit tests prove
the jsdom environment never crashes. Yet the real browser still produces a full white screen
(Navbar absent) when the Export / Backup button is clicked.

Without a runtime stack trace, no further source-level fix can be applied confidently.

This phase adds **temporary, reversible instrumentation** to capture the actual error type,
message, and component stack in the real browser before the app goes blank.

---

## Design

### A. Global Listeners (`src/main.tsx`)

Registered before `createRoot` so they fire for **any** synchronous or asynchronous error,
including errors that occur before React has a chance to render:

```typescript
window.addEventListener('error', (event) => {
  console.error('[RUNTIME-CRASH] window.onerror:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[RUNTIME-CRASH] unhandledrejection:', {
    reason: String(event.reason),
    stack: event.reason?.stack,
  });
});
```

**Why in `main.tsx`:** Runs before any module-level code in the component tree. Captures
crashes in `new ApiDataRepository(...)` (module-level in `DataContext.tsx`), HMR errors,
dynamic imports, and React internal errors that escape the Error Boundary.

**Env guard:** Wrapped in `import.meta.env.DEV` so it **tree-shakes in production builds**
and does not appear in `npm run build` output.

---

### B. Root React Error Boundary (`src/components/error/AppErrorBoundary.tsx`)

A class component (required by React — hooks cannot implement `componentDidCatch`):

```typescript
export class AppErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RUNTIME-CRASH] React Error Boundary caught:', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }
  render() {
    if (this.state.hasError) return <CrashFallbackUI error={this.state.error} />;
    return this.props.children;
  }
}
```

**Placement in `App.tsx`:** Wraps `DataProvider` so it catches errors from:
- `DataProvider` render / `useEffect` throws that escape `try/catch`
- `AppContent` and all its children (Navbar, modals, tabs)
- Any lazily loaded component

```tsx
export function App() {
  return (
    <AppErrorBoundary>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AppErrorBoundary>
  );
}
```

---

### C. Crash Fallback UI

A minimal, styled `<CrashFallbackUI>` that:
- Replaces the blank white screen with a visible message.
- Renders the error `message` and first 10 lines of `stack` (dev only).
- Provides a "Tải lại trang" (Reload) button.
- Does NOT depend on `DataContext`, `useTheme`, or any other provider that may have crashed.

```
┌──────────────────────────────────────────────────────┐
│  ⚠️  Đã xảy ra lỗi không mong đợi                   │
│                                                      │
│  Cannot read properties of null (reading 'getItem')  │
│  [stack trace lines...]                              │
│                                                      │
│  [Tải lại trang]                                     │
└──────────────────────────────────────────────────────┘
```

In production: only shows "Đã xảy ra lỗi không mong đợi" + reload button, no stack details.

---

### D. Logging Strategy

All log lines prefixed with `[RUNTIME-CRASH]` for easy grep in DevTools:

| Prefix | Source |
|---|---|
| `[RUNTIME-CRASH] window.onerror:` | `main.tsx` global `error` listener |
| `[RUNTIME-CRASH] unhandledrejection:` | `main.tsx` global `unhandledrejection` listener |
| `[RUNTIME-CRASH] React Error Boundary caught:` | `AppErrorBoundary.componentDidCatch` |

---

## Blast Radius Analysis

| Risk | Mitigation |
|---|---|
| Global listeners fire on *every* error | Wrapped in `import.meta.env.DEV` — no production impact |
| Error Boundary changes renders output when crash occurs | Fallback only shown on actual crash; normal render path unchanged |
| Class component pattern adds ~60 LOC | No dependency on external library; fully reversible |
| `App.tsx` gains one wrapper element | Renders as `<>...</>` fragment — no DOM node added |
| TypeScript type errors if React types not up to date | `React.ErrorInfo` type is stable since React 16 |

**No business logic is changed. No data flows are modified. No existing tests are impacted.**

---

## Rollback Plan

To fully remove instrumentation:
1. Delete `src/components/error/AppErrorBoundary.tsx`
2. Revert `src/App.tsx` to remove `<AppErrorBoundary>` wrapper (2 lines changed)
3. Revert `src/main.tsx` to remove global listener block (10 lines changed)

All changes are isolated to 3 files, with clear surgical diff. No config or package changes.

---

## Files Planned

| File | Action |
|---|---|
| `src/components/error/AppErrorBoundary.tsx` | **NEW** — Error Boundary + Fallback UI |
| `src/App.tsx` | **MODIFY** — wrap with `<AppErrorBoundary>` |
| `src/main.tsx` | **MODIFY** — add global listeners (dev-only) |
| `docs/specs/post-phase6kd-runtime-crash-instrumentation.md` | **NEW** (this file) |
| `docs/gherkin/post-phase6kd-runtime-crash-instrumentation.feature` | **NEW** |
| `tests/unit/app-error-boundary.test.tsx` | **NEW** — verification tests |

---

## Verification Plan

### Automated (Vitest)
1. Error Boundary renders fallback UI when a child component throws.
2. Error Boundary logs `[RUNTIME-CRASH]` prefix via `console.error`.
3. Error Boundary captures `componentStack`.
4. Normal render path (no crash): Error Boundary is transparent, children render normally.
5. Global listeners are registered on `window` after `main.tsx` initialization.

### Manual (Browser)
After deploying:
1. Open DevTools Console (filter: `RUNTIME-CRASH`).
2. Click Export / Backup button.
3. Observe:
   - Either the Crash Fallback UI appears (meaning Error Boundary caught it)
   - Or a `[RUNTIME-CRASH]` line appears in console (meaning global listener caught it)
4. Copy the full stack trace and componentStack for source-level diagnosis.
