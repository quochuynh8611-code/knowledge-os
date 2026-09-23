# Phase 21A — Citation Backlinks & Reverse Reference Explorer

## Status

Draft

## Context

Phase 19 established bidirectional citation deep-link navigation for `archive://{documentId}?loc={locator}` markers and Phase 20 completed global citation orchestration across `Navbar`, `NotesManager`, and `TopicDetail` via `UnifiedResearchReader`. The current system supports the forward recovery path from note citation back to source document and locator, but it still lacks the inverse discovery path from an active source document to the internal notes that reference it.

`ReaderSidebar` already receives document-scoped notes, renders note markdown through `MarkdownReadabilityRenderer`, and delegates archive link clicks through `onOpenArchiveLink`. Notes are stored as internal Knowledge OS markdown entities in client state and local persistence, while the Obsidian Vault remains a strict read-only boundary. This creates a safe foundation for a notes-only backlink explorer that computes reverse references in-memory without changing citation format, database schema, or Vault behavior.

## Problem Statement

When a user is reading a document, they cannot currently see which internal notes already cite that document. As a result, reverse context discovery is missing:

- The user can jump from a citation back to the source.
- The user cannot discover from the source which notes already refer to it.

This weakens the research feedback loop:

```text
Reader → Excerpt → Note → Citation → Reader
```

Phase 21A extends it into a reverse-reference workflow:

```text
Reader ⇄ Citation ⇄ Note
        ↑
   Backlinks Explorer
```

## Goals

1. Show note backlinks for the active reader document inside `ReaderSidebar`.
2. Compute backlinks from internal Knowledge OS notes only.
3. Match backlinks using exact `documentId` from valid `archive://` citations.
4. Group multiple citations from the same note into one backlink entry.
5. Allow the user to open the related note context from a backlink entry.
6. Preserve reader stability, current source document, and Obsidian Vault read-only boundaries.

## Non-Goals

1. Do not scan or index raw Obsidian Vault markdown files.
2. Do not write backlink metadata into notes, the database, or the Vault.
3. Do not change the citation URI format.
4. Do not add graph visualization, backlink graphs, or network maps.
5. Do not add a database schema, localStorage schema, or backend contract change in V1.
6. Do not include flashcards, inbox items, or other artifacts in V1 unless they already share a verified citation contract.
7. Do not use title heuristics or weak source matching for backlink inclusion.
8. Do not alter EPUB/PDF/Markdown rendering engines beyond minimal sidebar integration.

## Users and Value

### Primary user value

When reading a source document, the user can immediately see which notes already reference it, reducing duplicate note creation and improving source-oriented knowledge recovery.

### Secondary value

- Supports knowledge graph behavior without requiring a separate graph feature.
- Increases reuse of existing notes during reading and annotation.
- Makes citations more useful as durable provenance anchors.

## Proposed UX

Add a backlink section to `ReaderSidebar` for the active reader document.

### Initial V1 behavior

- The sidebar shows backlink entries for notes whose markdown content contains one or more valid `archive://<activeDocumentId>` citations.
- Each entry represents one note.
- Each entry shows:
  - note title,
  - a short snippet derived from the note body,
  - reference count for citations to the active document.
- Clicking an entry opens note context using the existing note-context UI path.
- The reader remains on the current source document.
- The current reader position is preserved.

### Empty state

If no note references the active document, the sidebar shows a lightweight explanatory empty state.

## Data Model Assumptions

### Existing note shape

Notes are internal markdown entities with at least:

- `id`
- `title`
- `content`
- `topicId`
- optional `topicIds`
- timestamps

### Citation source of truth

Valid citations are embedded in markdown note content as `archive://{documentId}?loc={locator}` and are already parseable through archive URI parsing logic used by markdown rendering and Phase 19/20 navigation.

## Matching Strategy

Backlink inclusion uses strict identity matching only.

### Matching order

1. Parse markdown links and detect valid `archive://` citations.
2. Decode `documentId` from the archive URI.
3. Compare parsed `documentId` to the active reader `documentId` using exact normalized equality.
4. Ignore malformed citations.
5. Ignore citations with unsafe or disallowed schemes.
6. Ignore citations that do not exactly match the active document.

### Explicitly rejected in V1

- title-based matching,
- path-heuristic matching,
- fuzzy matching,
- cross-artifact inferred matches.

Reason: false-positive backlinks are worse than missing backlinks in the first release.

## Backlink Aggregation Model

Backlinks are grouped per note.

### V1 representation

One note becomes one backlink entry, even if the note contains multiple citations to the same active document.

Example:

```markdown
# Note N1

See [intro](archive://doc-A?loc=heading:intro)
See [chapter 1](archive://doc-A?loc=heading:chapter-1)
```

When reading `doc-A`, the sidebar shows one backlink entry for `N1` with `referenceCount = 2`.

### Proposed view model

```ts
interface CitationBacklinkEntry {
  noteId: string;
  noteTitle: string;
  snippet?: string;
  referenceCount: number;
  locators: string[];
}
```

This is a specification-level contract only, not an implementation commitment to a specific file or exact TypeScript name.

## Event and Data Flow

```text
activeReaderDoc
  → ReaderSidebar receives active document context
  → backlinks selector scans internal notes
  → valid archive:// citations are parsed
  → citations matching active documentId are grouped by note
  → ReaderSidebar renders backlink entries
  → user clicks backlink entry
  → note context UI opens
  → active reader document and position remain unchanged
```

## Safety Requirements

1. Only `archive://` citations are eligible for backlink extraction.
2. Unsafe schemes (`javascript:`, `data:`, `vbscript:`, `file:`) are ignored.
3. Backlink computation must not execute note content.
4. Backlink rendering must continue to use existing markdown sanitization boundaries.
5. No write operation may be sent to Obsidian Vault.
6. No note mutation may occur as part of backlink computation or backlink opening.

## Failure Taxonomy

| Failure class | Condition | Expected behavior |
|---|---|---|
| No citations | Note contains no archive citation | Note excluded from backlinks |
| Malformed citation | `archive:/broken`, missing document ID, invalid parse | Ignore citation, do not crash |
| Unsafe URI | `javascript:` or other disallowed scheme | Ignore citation, do not execute |
| Non-matching document | Citation points to another document | Exclude from current backlink list |
| Empty backlink set | No note cites the active document | Show empty state |
| Note context open failure | UI fails to open note context | Preserve reader stability and current position |

## Test Strategy

### Unit tests

1. Extract valid archive citations from note content.
2. Ignore malformed citations.
3. Ignore unsafe schemes.
4. Match only exact active `documentId`.
5. Group multiple citations from the same note into one entry.
6. Produce reference counts and locator arrays correctly.
7. Preserve read-only behavior.

### Integration tests

1. `ReaderSidebar` renders backlinks for the active document.
2. Unrelated notes are excluded.
3. Empty state is shown when no backlinks exist.
4. Switching active reader document refreshes backlink entries.
5. Clicking a backlink opens note context.
6. Clicking a backlink does not change the active source document.
7. Clicking a backlink does not mutate Vault or note persistence.

## Trade-offs

### Chosen trade-off

Use a notes-only in-memory backlink selector in V1.

Benefits:

- minimal blast radius,
- no schema migration,
- no backend dependency,
- exact identity matching,
- easy unit testing.

Costs:

- backlink computation scales with note count,
- no cross-artifact graph in V1,
- no locator-level ranking or occurrence highlighting yet.

### Deferred enhancements

- flashcard backlinks,
- locator-aware backlink grouping,
- occurrence-level highlighting inside note context,
- persisted backlink indexes,
- global graph view.

## Acceptance Criteria

1. When the active reader document has referencing notes, `ReaderSidebar` shows backlink entries for those notes.
2. Notes that cite other documents are not shown.
3. Multiple citations from the same note are grouped into one entry with a reference count.
4. Clicking a backlink opens note context without changing the active source document.
5. Malformed or unsafe citations do not crash the application and do not appear as valid backlinks.
6. No Vault write occurs during backlink scan, render, or click handling.
7. Typecheck, targeted tests, and relevant regression tests pass.
