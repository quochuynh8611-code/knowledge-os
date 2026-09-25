# Phase 6.0 — Approval Gate & Execution Handoff Contract Summary

**Date:** 2026-09-24  
**Scope:** Phase 6.0 — Official Approval Gate (`ExecutionApprovalProof`) and Execution Handoff Contract (`ResearchExecutionHandoff`) for MCP execution intents originating from Phase 5.8 and Phase 5.9.

---

## 1. Objectives & Scope Enforced

Phase 6.0 establishes the formal control-plane gate and typed handoff contract before any provider execution plane interaction:
1. **Typed Approval Proof:** Standardized `ExecutionApprovalProof` without `any`.
2. **Approval Boundary Validation:** Rigorous validation of `approvedBy`, `approvalId`, `approvedAt`, `intent` allowlist, expiration, and correlation/fingerprint/provider binding.
3. **Execution Handoff Contract:** Typed `ResearchExecutionHandoff` strictly marked `mode: "handoff_only"` and `sideEffectsAllowed: false`.
4. **Strict Execution Blocking:** Absolute prohibition of transitions to `executing`, `in_progress_execution`, `provider_submitted`, `completed`, or `failed_provider_execution`.
5. **Zero Real Provider Calls:** No live invocations of NotebookLM Enterprise API, Antigravity CLI, or Google Cloud.
6. **No Background Processes:** No MCP listeners or async daemon workers spawned.

---

## 2. Contracts Implemented

### 2.1 Approval Proof Contract (`ExecutionApprovalProof`)

```typescript
export type ExecutionApprovalIntent =
  | "execute_research"
  | "force_retry_unknown"
  | "manual_fallback";

export type ExecutionApprovalProof = {
  approvedBy: string;
  approvedAt: string;
  intent: ExecutionApprovalIntent;
  approvalId: string;
  expiresAt?: string;
};
```

### 2.2 Execution Handoff Contract (`ResearchExecutionHandoff`)

```typescript
export type ResearchExecutionHandoff = {
  handoffId: string;
  correlationId: string;
  providerId: string;
  tool: "research_create_workspace" | "research_ingest_sources" | "research_generate_audio";
  normalizedInput: Record<string, unknown>;
  inputFingerprint: string;
  approval: ExecutionApprovalProof;
  requestedAt: string;
  mode: "handoff_only";
  sideEffectsAllowed: false;
};
```

---

## 3. State Machine Lifecyle in Phase 6.0

Supported Intent States:
- `intent_recorded`
- `ready_for_approval`
- `approved_for_handoff`
- `handoff_blocked`
- `replay_blocked`
- `transition_rejected`
- `dry_run_only`
- `intent_rejected`

Allowed Transitions:
- `intent_recorded` -> `ready_for_approval`, `replay_blocked`, `transition_rejected`
- `ready_for_approval` -> `approved_for_handoff`, `handoff_blocked`, `replay_blocked`, `transition_rejected`
- `approved_for_handoff` -> `handoff_blocked`, `replay_blocked`, `transition_rejected`

Strictly Blocked Targets:
- Any transition to `executing`, `in_progress_execution`, `provider_submitted`, `completed`, `failed_provider_execution` is rejected immediately with safe reason message.

---

## 4. Security & Isolation Controls

1. **Secret Redaction:** Approval fields (`approvedBy`, `approvalId`, error reasons) are sanitized using `sanitizeProviderErrorMessage` to prevent leakage of Bearer tokens, API keys, passwords, or filesystem paths.
2. **Immutability:** Correlation ID, tool, provider ID, and normalized input fingerprints are verified against the stored intent snapshot before handoff creation.
3. **No Process / Network Execution:** Zero network calls, zero sub-processes, and zero environment mutations.

---

## 5. Test Verification

- `tests/unit/research-approval-gate.test.ts` (20 tests passed)
- `tests/unit/research-execution-handoff-contract.test.ts` (20 tests passed)
- Provider Suite (22 test suites, 352 unit tests passed)
- Legacy Provider Adapters Suite (13 test suites, 127 tests passed)
- TypeScript Typecheck (`tsc --noEmit`): 0 errors
