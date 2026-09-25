# Phase 6.1 — Execution Plane Simulation & Provider Submission Stub Summary

**Date:** 2026-09-24  
**Scope:** Phase 6.1 — In-Memory Execution Simulation Provider and Submission Stub verifying Phase 6.0 Handoff Contracts.

---

## 1. Objectives & Scope Enforced

Phase 6.1 establishes a pure in-memory execution simulation stub to validate the execution handoff contract without connecting to any real provider execution plane:
1. **Execution Simulation Interface:** Typed `ExecutionSimulationProvider` and `InMemoryExecutionSimulationProvider`.
2. **Submission Result Envelope:** Standardized `SimulatedSubmissionResult` with strict safety flags:
   - `simulation: true`
   - `mode: "simulation_only"`
   - `sideEffectsAllowed: false`
   - `providerCallMade: false`
   - `networkCallMade: false`
   - `credentialAccessed: false`
3. **Deterministic Submission ID:** Computed via SHA-256 hash over canonical `(approvalId, correlationId, inputFingerprint, providerId, tool)`.
4. **Idempotency & Replay Support:** Returns `SIMULATED_REPLAY` on identical handoff submissions without creating duplicate persistence attempt records.
5. **Conflict & Capability Guards:** Returns `SIMULATED_REJECTED` with `IDEMPOTENCY_CONFLICT` on mismatched parameters, or `CAPABILITY_UNSUPPORTED` on missing provider capabilities.
6. **Strict Provider Blocking:** Absolute prohibition of calls to `NotebookLM`, `Antigravity`, `Google Cloud`, external networks, or real credentials.

---

## 2. Contracts Implemented

### 2.1 Simulation Submission Result (`SimulatedSubmissionResult`)

```typescript
export type SimulatedSubmissionStatus =
  | "SIMULATED_ACCEPTED"
  | "SIMULATED_REPLAY"
  | "SIMULATED_REJECTED"
  | "SIMULATED_BLOCKED";

export type SimulatedSubmissionFailureCode =
  | "INVALID_HANDOFF"
  | "APPROVAL_REQUIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "CAPABILITY_UNSUPPORTED"
  | "PERSISTENCE_UNAVAILABLE"
  | "SIMULATION_BLOCKED";

export type SimulatedSubmissionResult = {
  simulation: true;
  submissionId: string;
  correlationId: string;
  providerId: string;
  tool: "research_create_workspace" | "research_ingest_sources" | "research_generate_audio";
  status: SimulatedSubmissionStatus;
  mode: "simulation_only";
  sideEffectsAllowed: false;
  providerCallMade: false;
  networkCallMade: false;
  credentialAccessed: false;
  handoffFingerprint: string;
  createdAt: string;
  failure?: {
    code: SimulatedSubmissionFailureCode;
    message: string;
  };
};
```

### 2.2 Execution Simulation Provider (`ExecutionSimulationProvider`)

```typescript
export interface ExecutionSimulationProvider {
  simulateSubmission(
    handoff: ResearchExecutionHandoff
  ): Promise<SimulatedSubmissionResult>;
}
```

---

## 3. Execution Guard Matrix

| Guard | Condition Checked | Failure Status | Failure Code |
|---|---|---|---|
| Mode Guard | `handoff.mode === "handoff_only"` | `SIMULATED_BLOCKED` | `INVALID_HANDOFF` |
| Side Effect Guard | `handoff.sideEffectsAllowed === false` | `SIMULATED_BLOCKED` | `SIMULATION_BLOCKED` |
| Identity Fields | `correlationId`, `handoffId`, `providerId`, `tool`, `inputFingerprint` present | `SIMULATED_BLOCKED` | `INVALID_HANDOFF` |
| Tool Allowlist | `tool in ["research_create_workspace", "research_ingest_sources", "research_generate_audio"]` | `SIMULATED_BLOCKED` | `INVALID_HANDOFF` |
| Leakage Filter | No bearer tokens, API keys, passwords, process.env, or filesystem paths | `SIMULATED_BLOCKED` | `INVALID_HANDOFF` |
| Approval Guard | Valid `ExecutionApprovalProof` with valid intent, timestamp, unexpired | `SIMULATED_BLOCKED` / `REJECTED` | `APPROVAL_REQUIRED` |
| Idempotency / Conflict | Matching `providerId`, `inputFingerprint` with existing intent in persistence | `SIMULATED_REJECTED` | `IDEMPOTENCY_CONFLICT` |
| Capability Guard | Provider capability snapshot marked `satisfied: true` | `SIMULATED_REJECTED` | `CAPABILITY_UNSUPPORTED` |
| Persistence Health | Persistence read/write error | `SIMULATED_BLOCKED` | `PERSISTENCE_UNAVAILABLE` |

---

## 4. Deterministic Identity & Replay Behavior

- **Deterministic `submissionId` Formula:**  
  `sim-sub-` + `SHA256(canonicalPayload).slice(0, 32)`
- **Replay Outcome:**  
  When the same handoff is resubmitted, the stub returns `SIMULATED_REPLAY` with the identical `submissionId` without appending duplicate attempt records to the snapshot.
- **Persistence State:**  
  Accepted simulations record an attempt with `status: "IN_PROGRESS"` and update `terminalStatus: "IN_PROGRESS"`. It never falsely marks executions as `COMPLETED`.

---

## 5. Test Verification

- `tests/unit/execution-simulation-stub.test.ts` (25/25 tests passed)
- `tests/unit/execution-submission-contract.test.ts` (15/15 tests passed)
- Full Provider & Simulation Test Suite (24 test files, 392/392 tests passed)
- Legacy Provider Adapters Suite (13 test files, 127/127 tests passed)
- TypeScript Typecheck (`tsc --noEmit`): 0 errors
