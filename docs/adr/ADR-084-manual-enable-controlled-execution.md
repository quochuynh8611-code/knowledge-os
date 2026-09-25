# ADR-084: Manual Enablement Spec & Controlled Real-Execution Toggle

## Status
ACCEPTED (Phase 6.4)

## Context
Following the establishment of the Readiness Gate (ADR-083) and Submission Port Boundary (ADR-082), Knowledge OS requires a formal, auditable, and fail-closed specification for how human operators may evaluate and approve provider execution in future phases.

Under Phase 6.4 rules, the system remains strictly non-executable against live providers. All toggles and gates are specified at the contract, type, and verification level without activating real execution.

## Decision

1. **Manual Enablement Contract (`ManualEnablementRequest`, `ManualEnablementApproval`):**
   - Explicit binding between human requester (`requestedBy`), human approver (`approvedBy`), execution scope, provider ID, environment, and readiness report fingerprint.
   - Actor cannot be default/system; explicit human identity is mandatory.
   - `expiresAt` must be strictly greater than `approvedAt`. Expired or revoked approvals fail-closed.
   - Payloads strictly forbid API keys, Bearer tokens, raw sources, filesystem paths, or runtime handles.

2. **Multi-Factor Manual Enablement Gate (`evaluateManualEnablementGate`):**
   - Strictly returns `APPROVE_FOR_FUTURE_PHASE` or `DENY`.
   - Under no circumstances does the gate emit an approval for immediate live execution.
   - Invariants: `realExecutionAllowed = false` and `sideEffectsAllowed = false`.
   - Enforces 15 discrete safety checks: valid request, valid human approval, unexpired token, matching scope/provider/environment, readiness report in `READY_FOR_MANUAL_REVIEW` status, matching readiness fingerprint, valid policy, inactive kill-switch, and zero capability escalation.

3. **Execution Kill Switch (`ExecutionKillSwitchState`):**
   - Defaults to `active: true` with a deterministic SHA-256 fingerprint.
   - Active kill-switch overrides all requested flags and approvals.
   - Pure, immutable, and side-effect free (zero process.env mutation, zero child processes).

4. **Controlled Execution Toggle (`evaluateControlledExecutionToggle`):**
   - `enabled` is typed as a literal `false` throughout Phase 6.4.
   - Environment variables (including `RESEARCH_ALLOW_NOTEBOOKLM=true` or `ENABLE_PROVIDER_ROUTING=true`) cannot override the toggle.
   - Production environment is unconditionally disabled.

5. **Rollback Contract (`createControlledRollbackPolicy`):**
   - Provides a deterministic, idempotent rollback policy restoring safe defaults, active kill-switch, and disabled provider routing.

## Consequences

- Real provider execution remains strictly blocked across all codepaths.
- Live calls to NotebookLM, Antigravity CLI, or Google Cloud remain completely uninstantiated and uncalled.
- Zero network, credential, or subprocess handles are opened.
