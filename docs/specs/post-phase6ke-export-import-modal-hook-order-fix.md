# Post-Phase 6k.e: Fix Rules of Hooks Violation in ExportImportModal

**Status:** IN PROGRESS (TDD Phase 6k.e)
**Phase:** 6k.e
**Root Cause:** Rules of Hooks order violation across modal open/close toggle
**Component:** `src/components/modals/ExportImportModal.tsx`

---

## 1. Problem Statement & Root Cause

In runtime environments, clicking the **Export / Backup** button on the Navbar triggered a full application crash (white screen prior to Phase 6k.d, or Error Boundary crash fallback after Phase 6k.d):

```
Error: Rendered more hooks than during the previous render.
```

### Exact Hook Ordering Trace:
When `isOpen === false` (default state when Navbar mounts):
- Hooks 1–22 are called (state, memos, effect for dbHealth).
- Line 173: `if (!isOpen) return null;` returns early.
- Total hooks called: **22 hooks**.

When `isOpen === true` (when user clicks Export / Backup button):
- Hooks 1–22 are called.
- Line 173: `if (!isOpen) return null;` does NOT return early.
- Line 317: An additional `useEffect` for restore drill simulation is executed.
- Total hooks called: **23 hooks**.

React strictly forbids conditional hook execution across renders. When transitioning from 22 hooks to 23 hooks, React throws `Rendered more hooks than during the previous render.`

---

## 2. Solution Design

### Principle: Unconditional Hook Declaration
All 23 hooks in `ExportImportModal` must execute unconditionally in the exact same order on every render, regardless of whether `isOpen` is `true` or `false`.

### Blast Radius Analysis:
- Move the `useEffect` for restore drill (lines 317–323) from below `if (!isOpen) return null;` to the hook initialization block at lines 134–172 (above `if (!isOpen) return null;`).
- All 23 hooks execute unconditionally on every render.
- `if (!isOpen) return null;` executes after all hooks are completed.
- No business logic, validation, or data flow is modified.
- Zero impact on external components or APIs.

---

## 3. Verification Plan

1. **Regression Test (`tests/unit/export-modal-hook-order-resilience.test.tsx`):**
   - Render `ExportImportModal` with `isOpen={false}`.
   - Rerender with `isOpen={true}`.
   - Rerender with `isOpen={false}`.
   - Verify no hook-order mismatch exception is thrown.
   - Mount full `Navbar` in DataProvider and click Export button, asserting successful modal display.
2. **Full Suite Execution:**
   - Verify all existing test files continue to pass 100% GREEN.
3. **Type & Build Verification:**
   - `npm run lint` (tsc --noEmit)
   - `npm run build` (vite build + server bundle)
   - `git diff --check`
