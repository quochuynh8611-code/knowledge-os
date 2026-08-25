# Specification — Post-Phase 6k.b: Export / Backup Modal White-Screen Root-Cause Isolation & Render Resilience

## 1. Context & Problem Statement
In Phase 6k.a, storage access inside `ExportImportModal.tsx` was hardened using `safeGetLocalStorageItem` and `safeSetLocalStorageItem`.
However, during end-to-end user testing, opening the Export / Backup modal via the Navbar download button still produced a full application white-screen crash.

## 2. Root-Cause Investigation & Isolation

### Hypothesis 1 (Subtree Storage Leak in Navbar Modal Siblings):
`Navbar.tsx` renders four global modals concurrently at the component root:
- `<TopicFormModal />`
- `<NoteFormModal />`
- `<ResourceFormModal />`
- `<ExportImportModal />`

Investigation reveals that:
- `src/components/modals/NoteFormModal.tsx` (Line 27) directly invokes `localStorage.getItem('knowledge_os_library_root_path')` at component top-level without `try/catch`.
- `src/components/modals/ResourceFormModal.tsx` (Line 29) directly invokes `localStorage.getItem('knowledge_os_library_root_path')` at component top-level without `try/catch`.

When the user clicks the Download button on `Navbar`, `setShowExportModal(true)` triggers a re-render of `Navbar`. During this render pass, React executes `NoteFormModal` and `ResourceFormModal`. If storage access throws (e.g. `SecurityError` under sandbox / private mode / restricted permissions), unhandled exceptions crash the entire React fiber tree.

### Hypothesis 2 (Modal Computation Vulnerabilities):
Inside `ExportImportModal.tsx`, `useMemo` hooks call:
- `auditFileReferences(resources, notes, ...)`
- `calculateBackupReadiness(...)`

If `resources`, `notes`, `categories`, `topics`, or `tags` contain corrupted items (e.g., `null` elements or missing nested properties) or if an audit helper throws, unhandled exceptions during render crash the modal.

### Hypothesis 3 (Lack of Error Boundaries):
`App.tsx` and `Navbar.tsx` currently lack React Error Boundaries. Any render-phase exception in any modal completely destroys the top-level DOM tree, leaving a blank white screen instead of rendering a fallback UI or preserving the navigation shell.

## 3. Scope of Isolation & Contracts

### Layer A: Full Navbar & Modal Subtree Storage Isolation
- When storage access throws `SecurityError`, rendering `Navbar` and toggling `showExportModal(true)` must NOT throw uncaught errors.
- `NoteFormModal.tsx` and `ResourceFormModal.tsx` must use `safeGetLocalStorageItem` instead of direct `localStorage.getItem`.

### Layer B: Computation & Audit Fault-Tolerance
- `auditFileReferences` and `calculateBackupReadiness` inside `ExportImportModal` must be guarded with safe fallbacks so that calculation anomalies degrade gracefully to empty reports rather than crashing the component render.

### Layer C: Modal-Level Error Boundary / Degradation
- `ExportImportModal` must contain resilient error handling to display an in-modal fallback banner if an unexpected render crash occurs, preventing root-tree unmounting.

## 4. Verification Strategy
- Create failing regression tests in `tests/unit/export-modal-white-screen-root-cause-isolation.test.tsx` verifying:
  1. `Navbar` render and modal open when `localStorage.getItem` throws `SecurityError` (catching the sibling modal crash).
  2. `NoteFormModal` and `ResourceFormModal` rendering when `localStorage` throws `SecurityError`.
  3. `ExportImportModal` render resilience when `auditFileReferences` or `calculateBackupReadiness` encounters anomalies or throws.
