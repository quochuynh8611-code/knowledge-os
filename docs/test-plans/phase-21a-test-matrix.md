# Phase 21A Test Matrix — Citation Backlinks & Reverse Reference Explorer

## Unit Tests

1. Extract valid `archive://` citations from note content.
2. Ignore malformed citations.
3. Ignore unsafe schemes.
4. Match backlinks by exact normalized `documentId` only.
5. Group multiple citations from the same note into one entry.
6. Produce accurate `referenceCount` and locator lists.
7. Ignore notes with no valid backlink to the active document.

## Integration Tests

1. `ReaderSidebar` renders backlink entries for the active document.
2. Unrelated notes are excluded.
3. Empty state is shown when no backlinks exist.
4. Backlinks refresh when active reader document changes.
5. Clicking a backlink opens note context.
6. Clicking a backlink preserves the active source document and reader position.
7. No Vault mutation occurs during backlink scan, render, or interaction.
