# Phase 21B Test Matrix — Backlink Occurrence Navigation & Note Context Precision

## 1. Unit / Modal DOM Behavior Tests (`tests/unit/note-reader-archive-deeplink.test.tsx`)

| Test ID | Description | Target / Conditions | Expected Behavior |
|---|---|---|---|
| **UT-21B.1** | Exact Locator Occurrence Match | `NoteReaderModal` receives `targetCitation={{ documentId: 'doc-1', locator: 'loc-B' }}` | Calls `scrollIntoView` on citation element matching `loc-B` and applies transient visual focus class. |
| **UT-21B.2** | First Document Occurrence Fallback | `targetCitation={{ documentId: 'doc-1', locator: 'loc-nonexistent' }}` | Calls `scrollIntoView` on the first element matching `doc-1` and applies transient visual focus class. |
| **UT-21B.3** | Missing Target / Safe Degradation | `targetCitation={{ documentId: 'doc-unrelated' }}` with no matches in note | Does not call `scrollIntoView`, renders note at top without errors. |
| **UT-21B.4** | Transient Highlight Cleanup | Modal open with matched occurrence | Visual focus class is applied initially, then removed when timeout expires. |

*Note on Testing Strategy*: In JSDOM unit tests, `Element.prototype.scrollIntoView` is mocked/spied with `vi.fn()` to verify execution without asserting browser-specific layout animations.

## 2. Integration / Reader Sidebar to Note Modal Tests (`tests/unit/reader-sidebar-citation-jump.test.tsx`)

| Test ID | Description | Target / Conditions | Expected Behavior |
|---|---|---|---|
| **IT-21B.1** | Backlink Click passes Target Citation | Click backlink entry in `ReaderSidebar` when reader is on `doc-triet-hoc` (loc `chuong-2`) | `NoteReaderModal` mounts with `targetCitation={{ documentId: 'doc-triet-hoc', locator: 'chuong-2' }}` and triggers occurrence focus. |
| **IT-21B.2** | Session Continuity on Modal Close | Open note context via backlink, then click close (Esc or close button) | Source document `doc-triet-hoc` remains active in `UnifiedResearchReader` with identical locator and position. |

## 3. Safety & Boundary Regression Tests

| Test ID | Description | Target / Conditions | Expected Behavior |
|---|---|---|---|
| **ST-21B.1** | Read-Only & Zero Vault Write Invariant | Execute complete occurrence jump flow | 0 mutating HTTP calls (`POST`, `PUT`, `DELETE`, `PATCH`), 0 note updates, 0 Vault mutations. |
