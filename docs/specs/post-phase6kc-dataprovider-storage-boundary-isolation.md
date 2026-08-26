# Post-Phase 6k.c: DataProvider / App Storage Boundary Isolation

**Status:** RESOLVED — hypothesis disproven; retained as regression defense
**Phase:** 6k.c
**Depends on:** Phase 6k.a (storage.ts), Phase 6k.b (NoteFormModal, ResourceFormModal)

---

## Problem Statement

Phase 6k.a and 6k.b hardened modal-level storage access. However, the full-app white screen
still reproduces in the runtime environment with the entire Navbar absent — indicating the crash
origin is **above** the modal layer.

The `App` component wraps all UI inside `<DataProvider>`:

```
StrictMode → App → DataProvider → AppContent → Navbar → [all modals]
```

If any code **within `DataProvider`** throws an unhandled exception during initialization or
during a React commit phase (e.g. in a `useEffect` that runs synchronously relative to commit),
the entire React fiber tree is unmounted. This produces a completely blank page with no Navbar.

---

## Crash Seam Inventory (DataProvider layer)

### Seam 1: `useState` lazy initializers — ALREADY PROTECTED

Lines 156–199 in `DataContext.tsx`.  
Each of the 5 state slices (`categories`, `topics`, `notes`, `resources`, `tags`) is initialized
inside a `try { localStorage.getItem(...); JSON.parse(...) } catch { return INITIAL_DATA }` block.

**Verdict:** Resilient. A `SecurityError` from `getItem` OR a `SyntaxError` from malformed JSON
is caught and falls back to seed data. **This seam cannot crash the app.**

### Seam 2: Auto-sync `useEffect` (persistence) — ALREADY PROTECTED

Lines 247–265 in `DataContext.tsx`.  
All `localStorage.setItem(...)` calls are inside `try/catch`. A `QuotaExceededError` or
`SecurityError` from `setItem` is swallowed with `console.error`.

**Verdict:** Resilient. **This seam cannot crash the app.**

### Seam 3: `LocalStorageDataRepository.loadInitialData()` — UNPROTECTED GETITEM

Line 75 in `dataRepository.ts`:
```typescript
const raw = typeof localStorage !== 'undefined'
  ? localStorage.getItem(this.storageKey)    // ← NO try/catch
  : null;
```
This call checks `typeof localStorage !== 'undefined'` (which is always true in a browser) but
**does NOT guard against `localStorage.getItem` throwing a `SecurityError`**. This is called
inside `dataRepository.loadInitialData()`, which is itself called inside a `useEffect` in
`DataContext.tsx`. Since the `useEffect` has a `.catch()` handler (line 238), a throw from
`loadInitialData` would be caught at the `useEffect` level — **not** during render/commit.

**Verdict:** Low risk for white-screen; effect errors are caught. However, the unguarded call
is a correctness bug that should be fixed.

### Seam 4: `LocalStorageDataRepository.syncHydrate()` — UNPROTECTED SETITEM

Line 102 in `dataRepository.ts`:
```typescript
if (typeof localStorage !== 'undefined') {
  localStorage.setItem(...)     // ← NO try/catch
}
```
`syncHydrate` is called from `importAllDataJSON` in DataContext. If `setItem` throws
`QuotaExceededError` or `SecurityError`, the error propagates up through `importAllDataJSON`'s
`try/catch` (line 771), which returns `false` — **this is already protected**.

**Verdict:** Safe at import path. No white-screen risk.

### Seam 5: `useTheme` lazy initializer — ALREADY PROTECTED

Lines 11–18 in `useTheme.ts`. `localStorage.getItem` is inside `try/catch`.

**Verdict:** Resilient. **This seam cannot crash the app.**

### Seam 6: `useTheme.setTheme` — ALREADY PROTECTED

Lines 74–78 in `useTheme.ts`. `localStorage.setItem` is inside `try/catch`.

**Verdict:** Resilient. **This seam cannot crash the app.**

---

## Root-Cause Hypothesis Revision

After full static analysis, **all DataProvider storage seams are already guarded by try/catch**.
The white-screen in runtime is NOT caused by any currently-unguarded localStorage access
in `DataContext.tsx` or `useTheme.ts`.

This forces a new hypothesis: the crash is occurring at a **different layer** not yet examined:

**Candidate layers (not yet analyzed or tested):**
1. **`LocalStorageDataRepository` constructor or module-level code** — module initialization
   at line 42–45 of `DataContext.tsx`:
   ```typescript
   const dataRepository: IDataRepository =
     typeof window !== 'undefined'
       ? new ApiDataRepository('/api', new LocalStorageDataRepository(STORAGE_KEY))
       : new LocalStorageDataRepository(STORAGE_KEY);
   ```
   This runs at **module import time**, outside any component. If this throws, the entire
   module fails to import and ALL components that depend on it crash immediately.

2. **`ApiDataRepository` constructor** — wraps the localStorage repo. Any constructor logic
   that throws at import time would manifest as a white screen.

3. **`normalizeCategories` / `normalizeTopics` / `generateCategorySlug`** called during
   useState initializers — if these utility functions throw, the `try/catch` in useState
   would catch them, so this is protected.

4. **React StrictMode double-invocation** — StrictMode calls render functions twice in
   development. If any state initializer has side effects that fail on the second call, this
   could manifest in development only.

5. **Browser extension interference** — extensions that modify the `localStorage` object
   prototype after page load can cause `getItem` to throw in ways that bypass `typeof`
   guards. The `typeof localStorage !== 'undefined'` guard in `dataRepository.ts` is
   insufficient against this class of failure.

---

## Testing Strategy

Since DataProvider's own storage code is already protected, the tests must prove:

1. **A.** Full `App` renders without crash when `localStorage.getItem` throws `SecurityError`.
2. **B.** Full `App` renders without crash when `localStorage.setItem` throws `QuotaExceededError`.
3. **C.** `DataProvider` renders without crash when stored JSON is malformed (`SyntaxError`).
4. **D.** `Navbar` element is present in DOM after mounting full `App` under storage restriction.

If tests A, B, C, D all pass GREEN in Vitest, this **proves** the DataProvider layer is safe,
and the crash must originate in:
- A browser extension modifying `window.localStorage`
- A runtime-only API call that is not reproducible in jsdom
- Network-level issues in `ApiDataRepository` that are not triggered by Vitest mocks

In that case, the next investigation step is **runtime instrumentation**: injecting a global
error boundary at the `App` level and adding `window.onerror` / `window.onunhandledrejection`
logging to capture the actual throw location.

---

## Files Produced

- `docs/specs/post-phase6kc-dataprovider-storage-boundary-isolation.md` (this file)
- `docs/gherkin/post-phase6kc-dataprovider-storage-boundary-isolation.feature`
- `tests/unit/dataprovider-storage-boundary.test.tsx`
