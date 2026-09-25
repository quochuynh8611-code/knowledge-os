# ADR-085: Staging Sandbox Contract & Provider-Specific Dry-Run

## Status
ACCEPTED (Phase 6.5)

## Context
Following the establishment of the Readiness Gate (ADR-083) and Manual Enablement Contract (ADR-084), Knowledge OS requires a staging-only sandbox and provider-specific dry-run execution layer. This allows simulating the full request lifecycle (success, transient failure, permanent failure, timeout, retry, and circuit breaker trip) without making actual calls to NotebookLM Enterprise API, Antigravity CLI, or Google Cloud.

## Decision

1. **Staging Sandbox Contract (`StagingSandboxRequest`, `StagingSandboxResult`):**
   - Strictly enforces `environment: "test" | "staging"` and `mode: "dry_run"`.
   - Production environment is unconditionally rejected (`PRODUCTION_FORBIDDEN`).
   - Every execution capability (`network`, `credentials`, `providerExecution`, `childProcess`) is hard-locked to literal `false`.
   - `createdResources` is always an empty list `[]`.

2. **Provider-Specific Dry-Run Contract (`ProviderDryRunContract`):**
   - Enforces provider-specific capability mapping:
     - `notebooklm-enterprise`: supports workspace management, source ingestion, audio overview.
     - `antigravity-legacy`: supports source ingestion only.
   - Unsupported tools return `PROVIDER_UNSUPPORTED` / `UNSUPPORTED_TOOL` without fallback.

3. **Fake Provider Transport (`FakeProviderTransport`, `DeterministicFakeProviderTransport`):**
   - Serves as the exclusive transport dependency for `ProviderDryRunAdapter`.
   - Provides deterministic scenario simulation (`accepted`, `replay`, `unsupported_tool`, `transient_failure`, `permanent_failure`, `timeout`, `rate_limited`).
   - Zero network, credentials, timers, or child processes.

4. **Pure Retry & Circuit Breaker Policies:**
   - Deterministic retry policy (`evaluateRetryPolicy`) bounded by max 3 attempts with fixed delays `[0, 100, 500]` ms.
   - Pure state-machine circuit breaker (`CircuitBreakerSnapshot`) with injected clock, transitioning `CLOSED -> OPEN -> HALF_OPEN`.

5. **Sanitized Execution Audit Events (`ExecutionAuditEvent`):**
   - Every dry-run request/response generates an immutable, sanitized audit event.
   - Strips API keys, Bearer tokens, filesystem paths, and environment variable references.

## Consequences

- Staging and test environments can thoroughly verify end-to-end handoff, validation, and dry-run execution flows.
- Production environment and live external providers remain strictly blocked (default-deny).
- Zero external side effects, zero credentials accessed, and zero network calls made.
