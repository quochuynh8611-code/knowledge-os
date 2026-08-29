# ADR-050: Saved Views and Lightweight Retrieval Ranking

## Status
Accepted (Phase P7.3a & P7.3b Completed)

## Context
During deep research and comparative analysis (e.g. Abhidhamma mind-states, Duyên Hệ relations, or I Ching permutations), scholars frequently configure multidimensional search parameters combining text queries, domain categories, tags, and learning progress filters. 

Previously, searching required re-typing queries and manually re-selecting filters on every session. Furthermore, while exact title matching had high relevance, multi-token queries lacked coverage scoring, and whole-word boundary matching in descriptions was not differentiated.

## Decision
1. **Lightweight Additive Ranking Core (`scholarSearch.ts`)**:
   - **Multi-Token Title Coverage (+15 bonus)**: Awards bonus relevance score when all query tokens appear across a title.
   - **Word-Boundary Description Match (+10 bonus)**: Awards bonus relevance when the query phrase matches whole-word boundaries in description text.
   - **Precedence Invariants Preserved**: `Exact Title (100) > Prefix Title (80) > Multi-Token / Substring (65/50) > Description (40/30) > Content (10)`.

2. **Saved Views Storage Helper (`savedViewStorage.ts`)**:
   - **Storage Contract**: `SavedSearchView { id, name, query, filters?: ScholarSearchFilters, pinned: boolean, createdAt, updatedAt }`.
   - **Storage Key**: `phat_hoc_saved_views_v1`, capped at `MAX_SAVED_SEARCH_VIEWS = 20`.
   - **Deterministic Sorting**: Pinned views appear first, followed by `updatedAt` descending.
   - **Strict Mutability Separation**:
     - `updateSavedSearchView(id, { name?, query?, filters? })` cannot modify `pinned`.
     - `togglePinSavedSearchView(id)` exclusively manages pinning.
   - **Validation Contract**: Allows `query === ""` if at least one non-default filter (`domain`, `categoryId`, `tag`, `status`) is specified.

3. **User Interface Integration (`AdvancedSearch.tsx`)**:
   - **Saved Views Chip Stream**: Renders clickable saved view chips with pin badge and individual delete button.
   - **1-Click Replay**: Restores query text and active filter options synchronously.
   - **Event Propagation Guard**: Pin and delete button click handlers execute `e.stopPropagation()` to prevent accidental search replay.
   - **Inline Save Panel**: Expandable form to quickly name and optionally pin the current view when search parameters are valid.

4. **Command Palette Convergence (`useCommandPalette.ts`)**:
   - Accepts `savedViews?: SavedSearchView[]` via options (DI pattern).
   - Injects saved views as navigation command items prefixed with `[Góc nhìn]`.
   - Executing a saved view command invokes `onApplySavedView(view)` and switches tab to `"search"`.

## Consequences
- **Positive**:
  - Scholars can curate up to 20 persistent research lenses.
  - Zero external database or backend dependencies (100% local-first and resilient).
  - Clean separation of concerns between storage, UI component, and command palette hook.
- **Negative / Trade-offs**:
  - Pinned views order takes precedence over pure recency.
