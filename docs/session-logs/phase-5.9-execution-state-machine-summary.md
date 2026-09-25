# Phase 5.9 — MCP Execution State Machine & Safe Replay Gates Summary

**Date:** 2026-09-24
**Scope:** Lifecycle State Machine, Transition Guards, and Safe Replay / Idempotency Gates
**Status:** COMPLETED & VALIDATED

---

## 1. Objectives & Architectural Context
Phase 5.9 establishes the lifecycle state machine and safe replay/idempotency gates for research execution intents created via the MCP mutation surface (`research_create_workspace`, `research_ingest_sources`, `research_generate_audio`).

### Key Boundaries:
- **Zero real provider execution:** Absolutely no live calls to NotebookLM Enterprise API, Antigravity CLI, or Google Cloud.
- **Zero database schema modifications:** Preserves the existing `ResearchPersistencePort` interface and Prisma schema.
- **Strict lifecycle state machine:** Enforces explicit state transitions and prevents unapproved transitions to `executing`.
- **Safe Replay Gates:** Replaying the same request (identical `correlationId`, `tool`, and canonical input fingerprint) returns an idempotent result without creating duplicate attempts or snapshots. Conflicting requests with the same `correlationId` fail-safe with `IDEMPOTENCY_CONFLICT`.

---

## 2. State Machine & Lifecycle Model

### A. MCP Intent Lifecycle
- `intent_recorded`: Intent has been validated and persisted in the audit log (dry-run accepted).
- `ready_for_approval`: Intent has transitioned to awaiting operator/policy approval.
- `replay_blocked`: Intent has been blocked due to duplicate/replay policy.
- `transition_rejected`: Transition was rejected due to invalid target state or state mismatch.
- `dry_run_only`: Intent simulation performed without persistence layer connected.
- `intent_rejected`: Dry-run validation failed due to missing provider capability or disabled routing.

### B. Persistence Lifecycle Mapping (`ResearchExecutionSnapshot`)
- Active / Validated intents map to `terminalStatus: "IN_PROGRESS"` (strictly avoiding false `COMPLETED` markers before actual execution).
- Rejected intents map to `terminalStatus: "FAILED"`.
- Detailed state envelopes, transition history, and canonical input fingerprints are safely encapsulated inside `attemptRecords[0].rawErrorDetails`.

### C. Transition Rules
| Current State | Allowed Target State | Result | Notes |
| :--- | :--- | :--- | :--- |
| `intent_recorded` | `ready_for_approval` | Accepted | Standard promotion path |
| `intent_recorded` | `replay_blocked` | Accepted | Manual or policy block |
| `intent_recorded` | `transition_rejected` | Accepted | Guard failure record |
| `ready_for_approval` | `replay_blocked` | Accepted | Pre-execution block |
| `ready_for_approval` | `transition_rejected` | Accepted | Guard failure record |
| *Any* | `executing` | **REJECTED** | Blocked in Phase 5.9 (Approval Gate Required) |
| *Any* | *Unknown* | **REJECTED** | Invalid transition rejected |

---

## 3. Safe Replay & Idempotency Algorithm

1. **Fingerprint Generation (`computeCanonicalInputFingerprint`):**
   - Keys in `normalizedInput` are canonically sorted.
   - All string values (tokens, credentials, paths) are recursively sanitized using `sanitizeProviderErrorMessage`.
   - Produces a deterministic JSON string `JSON.stringify({ tool, input: sanitizedInput })`.
2. **Replay Decision Matrix (`evaluateReplay`):**
   - **`NEW`:** `correlationId` does not exist in persistence. Snapshot created.
   - **`IDEMPOTENT_REPLAY`:** `correlationId` exists, `tool` matches, and canonical fingerprint matches. Returns existing record without saving new attempt or snapshot.
   - **`IDEMPOTENCY_CONFLICT`:** `correlationId` exists, but `tool` differs or canonical fingerprint differs. Throws `ProviderException("IDEMPOTENCY_CONFLICT")`.
   - **`UNKNOWN_PERSISTENCE_ERROR`:** Persistence layer throws during lookup. Fail-safe error returned without executing any side-effect.

---

## 4. Verification & Test Matrix Results

1. **TypeScript Typecheck:**
   - `npm run typecheck` (`tsc --noEmit`): **0 errors**.
2. **New State Machine Test Suite:**
   - `tests/unit/research-execution-state-machine.test.ts`: **15/15 tests PASS**.
3. **New Safe Replay Gates Test Suite:**
   - `tests/unit/mcp-safe-replay-gates.test.ts`: **14/14 tests PASS**.
4. **Existing MCP Suites:**
   - `tests/unit/internal-research-mcp-intent-persistence.test.ts`: **21/21 tests PASS**.
   - `tests/unit/internal-research-mcp-dry-run.test.ts`: **20/20 tests PASS**.
   - `tests/unit/internal-research-mcp-runtime-bridge.test.ts`: **15/15 tests PASS**.
   - `tests/unit/internal-research-mcp-server.test.ts`: **12/12 tests PASS**.
5. **Full Provider & Server Runtime Regression Suite:**
   - 20 test suites: **312/312 tests PASS (100%)**.
6. **Legacy Regression Suites:**
   - 13 legacy test suites (`antigravity-*`, `notebooklm-*`): **127/127 tests PASS (100%)**.
7. **Total Test Count:** **439/439 tests PASS (100%)**.

---

## 5. Security & Safety Attestations
- No database migrations created.
- No UI modifications.
- No route contract modifications.
- No real Google Cloud API calls or credentials used.
- Zero orchestrator/provider execution calls.
- Strict stdout protocol purity and stderr-only debug logging preserved.
