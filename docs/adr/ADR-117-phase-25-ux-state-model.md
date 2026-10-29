# ADR-117: Phase 25 UX State Models for Idempotency Feedback and Synchronization

- **Status:** Approved
- **Date:** 2026-10-29
- **Deciders:** Technical Architect / Staff Engineer, Project Owner
- **Scope:** Frontend UI Feedback, Artifact Synchronization, Flashcard Idempotency Signalling

---

## 1. Context

During Phases 11–24, Knowledge OS implemented and released robust backend idempotency:
- Flashcard backend idempotency with unique `idempotencyKey` and Prisma `P2002` race-condition recovery (`PR #2`).
- NotebookLM Studio artifact ingestion with deduplication and contract validation (`PR #3`).
- Structured observability emitting `FLASHCARD_P2002_RECOVERED` and `ARTIFACT_INGEST_DUPLICATE` (`PR #6`).

However, the user experience currently faces two feedback gaps:
1. **Artifact Ingestion Contract Gap**: The backend endpoint `POST /api/artifacts/ingest` already returns `{ artifact, isDuplicate }`. However, `NotebookLMStudioModal.tsx` ignores `isDuplicate`, flattening all successful responses into `syncStatus = 'synced'`. Furthermore, local artifacts only support `'synced' | 'pending' | 'failed'`, lacking an in-flight `'retrying'` indicator and an explicit `'already_synced'` state.
2. **Flashcard Creation Contract Gap**: The endpoint `POST /api/flashcards` currently returns HTTP 201 with the `Flashcard` entity regardless of whether the card was newly created or recovered via `findUnique` / `P2002`. Consequently, the frontend cannot distinguish between "Card created" (`201`) and "Card already exists" (`200` / duplicate hit), showing "Đã tạo thẻ ôn tập thành công!" even when an existing card was preserved.

---

## 2. Decision

### 2.1 Artifact Synchronization State Model
We adopt an additive extension to `NotebookLMArtifact` and client state:
- Extend client-side artifact sync status:
  `type ArtifactSyncStatus = 'synced' | 'pending' | 'failed' | 'retrying' | 'already_synced'`
- Consume the existing `isDuplicate` boolean returned by `POST /api/artifacts/ingest`. When `isDuplicate === true`, mark the local artifact as `already_synced`.
- Render a distinct visual badge for `already_synced`: "Đã lưu trên máy chủ" (Sky/Indigo badge), separating it from a newly synced artifact ("Đã đồng bộ" - Emerald badge).
- During active retry, set local state to `'retrying'` to disable the retry button and display a spinning indicator, preventing rapid multi-click submissions.

### 2.2 Flashcard Idempotency Feedback Signalling
- **Contract Standard**:
  - Newly created card: Returns HTTP 201 Created with JSON payload `{ card: Flashcard, outcome: "created" }` (or `card` with additive `outcome: "created"`).
  - Idempotent hit / P2002 recovered card: Returns HTTP 200 OK with JSON payload `{ card: Flashcard, outcome: "existing" }` (or `card` with additive `outcome: "existing"`) and header `X-Idempotency-Status: HIT`.
  - Frontend UI uses the `outcome` field to display:
    - `outcome === "created"` $\rightarrow$ `"Đã tạo thẻ ôn tập thành công."`
    - `outcome === "existing"` $\rightarrow$ `"Thẻ này đã tồn tại — không tạo trùng."`
  - In offline / LocalStorage mode: `LocalStorageDataRepository` sets `outcome: "created"` or `outcome: "existing"` on the returned card object.
  - Zero database migration, zero schema change, Flashcard database entity remains untouched.

---

## 3. Alternatives Considered

1. **Changing JSON Response Envelope to `{ data: card, isDuplicate: boolean }`**:
   - *Rejected*: Breaks backwards compatibility with hundreds of unit/integration tests expecting `res.body` to be a `Flashcard`.
2. **Pure Client Heuristic (Option B)**:
   - *Rejected*: Unreliable under clock skew or rapid consecutive creations within sub-second intervals.
3. **No Distinction (Status Quo)**:
   - *Rejected*: Leaves users confused when clicking "Tạo thẻ" on an existing node and seeing "Đã tạo thẻ thành công" when no new card was added.

---

## 4. Consequences

### Positive
- Users receive instant, truthful feedback: "Flashcard already exists" vs "Flashcard created".
- Artifact sync visibly tracks `Pending` $\rightarrow$ `Retrying` $\rightarrow$ `Synced` / `Already synchronized`.
- 100% backwards compatible with all existing API contracts and tests.

### Negative / Trade-offs
- `FlashcardFormModal` and `MindMapNodeDrawer` must check `res.status === 200` or `(card as any).isExisting` to branch the toast message.

---

## 5. Rollback Strategy
Because the JSON payload shape is unchanged and changes are strictly additive:
- If issues arise, the frontend can revert to displaying the generic success message without breaking the backend.
- Reverting PR 1 or PR 2 requires no database rollback or schema migration.

---

## 6. One-Way vs Two-Way Decision
This is a **Two-Way Door Decision** (fully reversible):
- No database migrations or schema alterations.
- No permanent serialization changes in persistent storage.

