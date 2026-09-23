# ADR-079 — Notes-Only Citation Backlinks in Unified Research Reader

## Status

Draft

## Context

Phase 19 introduced bidirectional citation navigation for `archive://` deep links, and Phase 20 wired this navigation through the global reader hosts. Users can now move from note citations back to source documents, but they still cannot inspect reverse references from an active source document to the notes that cite it.

The current architecture already provides the required foundations:

- `UnifiedResearchReader` owns active document context.
- `ReaderSidebar` renders document-scoped note content.
- `MarkdownReadabilityRenderer` parses and routes `archive://` links safely.
- Notes are stored internally in Knowledge OS state/local persistence.
- Obsidian Vault remains read-only.

This ADR addresses the first reverse-reference step without changing database schema, citation format, or Vault boundaries.

## Decision

Implement V1 backlinks as a **notes-only, in-memory selector** driven by the active reader document ID.

### Decision details

1. Only internal Knowledge OS notes are scanned in V1.
2. Backlinks are computed from markdown note content by extracting valid `archive://` citations.
3. Matching uses exact normalized `documentId` equality only.
4. Multiple matching citations within the same note are grouped into one backlink entry.
5. Backlinks render inside `ReaderSidebar`.
6. Clicking a backlink opens note context while preserving the current source document and reader position.
7. No backlink metadata is written to notes, database, localStorage schema, or Obsidian Vault.

## Rationale

This decision minimizes blast radius while delivering immediate user value.

- It reuses existing citation and markdown safety boundaries.
- It avoids false positives from weak heuristics.
- It avoids schema and API changes in the first release.
- It keeps the implementation reversible if future artifact types are added.

## Consequences

### Positive

- Adds reverse reference discovery to the reader workflow.
- Strengthens the research loop between sources and notes.
- Preserves current persistence and Vault boundaries.
- Keeps testing straightforward through pure selectors and sidebar integration tests.

### Negative

- Backlink scan cost scales with note volume.
- V1 excludes flashcards and other artifact types.
- V1 does not support occurrence-level highlighting inside note context.
- Exact-match-only behavior may omit weakly-related references until later phases.

## Rejected Alternatives

### 1. Full Vault backlink indexing

Rejected because it would cross the current bounded context and expand into raw Vault scanning, indexing, and boundary complexity.

### 2. Title or path heuristic matching

Rejected because backlink false positives are high-risk and difficult to trust.

### 3. Database-backed backlink table

Rejected in V1 because it adds schema, sync, and migration complexity without proving the minimal UX first.

### 4. Include flashcards in V1

Rejected because citation provenance and display contracts across artifact types have not yet been verified as equivalent.

### 5. Render each citation occurrence as a separate entry

Rejected because note-level grouping yields a cleaner UX and lowers noise for the first release.

## Safety Constraints

1. Only `archive://` links are processed for backlinks.
2. Unsafe schemes are ignored.
3. Backlink computation is read-only.
4. Opening backlink note context must not mutate source notes or Vault content.
5. Existing markdown sanitization remains the render boundary.

## Fitness Functions

1. Active document backlinks update deterministically when `documentId` changes.
2. A note with multiple citations to the same document produces one backlink entry with an accurate count.
3. Malformed citations never crash the sidebar.
4. No Vault write occurs during backlink computation or interaction.

## Follow-up

Potential future phases may add:

- flashcard backlinks,
- locator-aware grouping,
- backlink ranking,
- occurrence highlighting,
- persisted indexes,
- cross-artifact reference explorer.
