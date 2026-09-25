# ADR-083: Real-Execution Readiness Gate & Runtime Composition Audit

## Status
ACCEPTED (Phase 6.3)

## Context
In Phases 6.0 through 6.2, we established the Control-Plane Approval Gate (`ExecutionApprovalProof`), Typed Execution Handoff Contract (`ResearchExecutionHandoff`), In-Memory Execution Simulation Stub (`InMemoryExecutionSimulationProvider`), and Decoupled Submission Port (`ResearchSubmissionPort`).

Before any real provider execution can ever be considered, the architecture must formalize an immutable, fail-closed **Readiness Gate** and **Runtime Composition Audit**. This ensures that the system defaults to safe simulation, prevents bypasses, and requires human-in-the-loop manual review.

## Decision

1. **Readiness Status Restrictions:**
   The readiness report can only return `NOT_READY`, `READY_FOR_MANUAL_REVIEW`, or `BLOCKED`. Under no circumstances will the system emit a state indicating automatic authorization for live execution.

2. **Immutable Safety Invariants:**
   Every readiness evaluation hard-locks safety invariants:
   - `realExecutionAllowed = false`
   - `notebookLMAllowed = false`
   - `antigravityAllowed = false`
   - `networkAllowed = false`
   - `credentialsAllowed = false`
   - `childProcessAllowed = false`

3. **12 Architectural Readiness Checks:**
   - `SAFE_DEFAULT_CONFIG`
   - `PROVIDER_SELECTION_POLICY`
   - `SUBMISSION_PORT_BOUNDARY`
   - `APPROVAL_GATE_BOUNDARY`
   - `CAPABILITY_POLICY`
   - `SECRET_BOUNDARY`
   - `NETWORK_BOUNDARY`
   - `MCP_BOUNDARY`
   - `PERSISTENCE_BOUNDARY`
   - `REAL_EXECUTION_DISABLED`
   - `BYPASS_DETECTED`
   - `UNVERIFIED_DEPENDENCY`

4. **Runtime Composition Audit Service:**
   `DefaultRuntimeCompositionAudit` performs pure inspection of runtime dependencies, provider registries, and submission port bindings, ensuring mock adapters (e.g. `MockNotebookLMClient`) are never mistaken for real execution readiness.

5. **Default-Deny at Runtime:**
   Environment variables such as `RESEARCH_ALLOW_NOTEBOOKLM` or `ENABLE_PROVIDER_ROUTING` cannot independently activate real execution without crossing the submission port boundary and explicit approval gates.

## Consequences

- Real provider execution remains strictly blocked across all codepaths.
- Any architectural bypass or configuration discrepancy triggers immediate fail-closed `BLOCKED` status.
- Zero network, credential, or subprocess capabilities are granted to runtime components in Phase 6.3.
