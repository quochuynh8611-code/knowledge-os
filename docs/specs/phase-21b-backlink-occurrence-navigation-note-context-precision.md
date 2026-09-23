# Phase 21B — Backlink Occurrence Navigation & Note Context Precision

## Status

Draft

## Context

Phase 21A established note-level reverse reference discovery: when a user is reading a source document in `UnifiedResearchReader`, `ReaderSidebar` computes and renders internal notes that contain valid `archive://{documentId}` citations. Clicking a backlink opens the note inside `NoteReaderModal` as an overlay, preserving the active source document and reading position.

However, in Phase 21A, `NoteReaderModal` opens at the top of the note. When a note is long or contains multiple citations to the active source document (or to different sections/locators within that document), the user must manually scroll and locate the relevant citation.

Phase 21B introduces **Occurrence Navigation & Precision Context**: resolving, scrolling, and transiently highlighting the specific citation occurrence inside `NoteReaderModal` based on the active reader's navigation intent.

## Problem Statement

1. **Lack of In-Note Precision**: Notes can contain multiple citations. Opening a note at the top forces manual scanning.
2. **Context Disconnect**: The user clicked a backlink to see how the source document or a specific section was cited. The UI should guide their attention directly to that citation marker.
3. **Graceful Fallback**: If an occurrence cannot be located (e.g. malformed link, deleted section, or timing delay), the system must degrade safely to opening the note normally without throwing errors or breaking the reading session.

## Goals

1. Support passing a `targetCitation` navigation hint (`{ documentId: string; locator?: string }`) to `NoteReaderModal`.
2. Resolve citation occurrences in the rendered note body using a deterministic 3-tier strategy:
   - **Tier 1 (Exact Locator Match)**: Find the citation element matching both `targetCitation.documentId` and `targetCitation.locator`.
   - **Tier 2 (First Document Occurrence)**: If no locator matches or none was provided, find the first citation element matching `targetCitation.documentId`.
   - **Tier 3 (Safe Fallback)**: If no citation matches, keep the note at the default scroll position.
3. Scroll the resolved citation element into view smoothly (`scrollIntoView`).
4. Apply a transient visual focus state (e.g. temporary highlight pulse/ring) to the citation element that automatically clears after a short duration (~2–3 seconds).
5. Maintain strict safety invariants: 100% read-only, 0 Obsidian Vault writes, 0 note mutations, 0 schema changes, and no distortion of the source reader's position or state.

## Non-Goals

1. Do not change the canonical citation format: `archive://{documentId}?loc={locator}`.
2. Do not mutate note markdown, database schema, or localStorage schema.
3. Do not index or write backlink occurrence positions into persistent storage.
4. Do not build an in-modal occurrence carousel/stepper (Next/Prev buttons) in V1.
5. Do not use title or path heuristics for occurrence matching.
6. Do not execute scripts or parse unverified HTML tags.

## DOM & Render Contract

`MarkdownReadabilityRenderer` already emits structured data attributes on all rendered `archive://` link elements:

```html
<a
  href="archive://doc-triet-hoc?loc=chuong-2"
  data-archive-document-id="doc-triet-hoc"
  data-archive-locator="chuong-2"
  ...
>
  [Xem tài liệu]
</a>
```

### Occurrence Resolution Algorithm:
1. When `NoteReaderModal` opens with `isOpen = true`, `note !== null`, and an optional `targetCitation`:
2. After component mount and layout render, query container DOM for citation anchors:
   - Priority 1: `a[data-archive-document-id="${targetCitation.documentId}"][data-archive-locator="${targetCitation.locator}"]` (when `locator` is provided).
   - Priority 2: `a[data-archive-document-id="${targetCitation.documentId}"]` (first matching occurrence).
3. If an element is found:
   - Invoke `element.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
   - Add a transient visual focus class/attribute to the element.
   - Schedule a timer (~2.5s) to remove the transient focus state.
4. If no element is found:
   - Fall back silently to default scroll position.

### Timing & Lifecycle Risk Mitigation:
- In React/JSDOM environments, DOM nodes rendered by markdown components may not be immediately queryable synchronously in the first render tick.
- Use `useEffect` with `requestAnimationFrame` or a microtask/short timeout (~50ms) to ensure the markdown DOM tree is attached before executing the query and scroll.

## UX & Visual Focus Contract

- **Scroll Behavior**: Centered vertically within the modal's scroll container (`block: 'center'`).
- **Visual Focus State**: A noticeable, non-destructive transient highlight (e.g. pulsating focus ring) indicating the exact citation clicked.
- **Session Continuity**: Closing `NoteReaderModal` leaves the user on their original source document at the exact same reading position.

## Failure Taxonomy

| Scenario | Condition | System Behavior |
|---|---|---|
| Exact Match | Both `documentId` and `locator` match a rendered citation | Scroll to element + apply transient visual focus |
| Document Match | `documentId` matches, but `locator` is absent or not found in note | Scroll to first occurrence of `documentId` + apply visual focus |
| Unresolved Occurrence | Note has no citations matching `documentId` | Open modal at top (safe no-op, no error) |
| Missing Target | `NoteReaderModal` opened without `targetCitation` hint | Open modal at top normally |
| Execution Error | `scrollIntoView` fails or unsupported in environment | Catch gracefully, do not throw or crash UI |

## Acceptance Criteria

1. Clicking a backlink entry from `ReaderSidebar` passes the document ID and preferred locator into `NoteReaderModal`.
2. `NoteReaderModal` scrolls to and transiently highlights the matching citation element.
3. If multiple citations exist, the specific locator occurrence is focused if matched; otherwise the first occurrence is focused.
4. Closing the modal preserves the active reader document and reading position.
5. No writes to Obsidian Vault, no note mutations, and no schema modifications occur.
