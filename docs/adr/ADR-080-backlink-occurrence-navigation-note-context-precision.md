# ADR-080 — Backlink Occurrence Resolution and Ephemeral Visual Highlighting

## Status

Proposed

## Context

Phase 21A introduced note-level citation backlinks discovery in `ReaderSidebar` and connected it to `NoteReaderModal`. When reading a document, clicking a backlink note opens that note in an overlay.

For notes containing multiple citations to the same document or long note bodies, opening at the top requires tedious manual scanning. We need an occurrence navigation mechanism to direct user focus to the exact citation inside the note body.

## Decision

Implement occurrence resolution in `NoteReaderModal` using a **DOM query contract** on existing rendered `data-archive-*` attributes, paired with `scrollIntoView` and a **transient visual focus state**.

### Key Mechanics:
1. `NoteReaderModal` accepts an optional `targetCitation?: { documentId: string; locator?: string }` prop as a navigation hint.
2. The resolution strategy follows a strict 3-tier precedence:
   - **Tier 1 (Exact Locator Match)**: Query `a[data-archive-document-id="${documentId}"][data-archive-locator="${locator}"]`.
   - **Tier 2 (First Document Occurrence)**: Query `a[data-archive-document-id="${documentId}"]`.
   - **Tier 3 (Safe Fallback)**: No-op, maintain top scroll.
3. Once the DOM node is identified:
   - Scroll into view using `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
   - Apply a transient visual focus CSS class/state that automatically expires after 2.5 seconds.
4. `targetCitation` is strictly a UI navigation hint, not a new persistence model or schema entity.

## Trade-offs and Rationale

### Why DOM-based query vs. AST/Parser token mapping?
- **AST / Parser token mapping**: Would require generating unique occurrence IDs in the markdown parser, threading token metadata through React components, and modifying AST structures. High blast radius and unnecessary complexity.
- **DOM-based query (Chosen)**: Leverages the existing `data-archive-document-id` and `data-archive-locator` attributes already emitted by `MarkdownReadabilityRenderer`. Zero changes to markdown parser rules, zero schema changes, and ultra-low blast radius.

## Blast Radius Classification

- **Low Blast Radius**:
  - `src/components/modals/NoteReaderModal.tsx`: Adds optional prop `targetCitation` and a DOM scroll effect.
  - `src/components/reader/UnifiedResearchReader.tsx`: Forwards `targetCitation` when opening `NoteReaderModal` from backlink click.
  - `src/components/reader/ReaderSidebar.tsx`: Forwards preferred locator on click.
- **Zero Blast Radius / Untouched**:
  - `src/lib/markdownReadability.tsx` (already emits required data attributes).
  - `src/lib/readerDocumentResolver.ts`.
  - Database schema, REST API, localStorage schema.
  - Obsidian Vault boundary.

## Rejected Alternatives

1. **Persistent Occurrence Indexing in Database**:
   - *Rejected*: Over-engineering for a client-side navigation hint; introduces stale index sync risks when notes are edited.
2. **Interactive Occurrence Carousel / Multi-Occurrence Stepper in V1**:
   - *Rejected*: Deferred to future iterations to keep V1 minimal, robust, and focused on instant single-target precision.
3. **Title / Path Heuristic Occurrence Matching**:
   - *Rejected*: High risk of false positives when multiple source references exist in the same note.

## Safety & Invariants

1. Purely non-mutating: does not write to Obsidian Vault, database, or localStorage.
2. Transient visual focus cleans up automatically via timeout; no permanent DOM mutation.
3. Safe degradation: missing occurrence or unmounted DOM safely falls back to standard note viewing.
