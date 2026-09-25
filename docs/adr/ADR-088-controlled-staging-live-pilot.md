# ADR-088: Controlled Staging Live Pilot Spec & Gate

## Status
Accepted (Phase 6.9 - Part A)

## Context
Following Phase 6.8 Live Execution Eligibility & Go/No-Go Gate, we require a highly bounded, fail-closed specification and gate for a singular, controlled staging live pilot. This specification dictates exact constraints ensuring that under no circumstances can an unauthorized, multi-attempt, parallel, unmonitored, or production execution occur.

## Decision
1. **Single-Attempt Staging Live Pilot Contract (`stagingLivePilotContract.ts`):**
   - Strictly limits execution to exactly one attempt (`maxAttempts === 1`).
   - Disallows parallel execution (`allowParallelExecution: false`).
   - Disallows silent provider fallback (`allowProviderFallback: false`).
   - Unconditionally denies production (`productionAlwaysDenied: true`).
   - Mandates non-sensitive test-only source data (`sourceClassification: "TEST_PUBLIC"`).
   - Enforces strict timeout (`timeoutMs`) and budget/quota bounds (`budgetLimitUnits`).
   - Requires credential references only (e.g. Secret Manager URI) and strictly forbids raw API keys, bearer tokens, or private keys.
   - Requires audit sink and rollback proof configuration.
   - Forbids consumer NotebookLM session cookies, reverse-engineered RPCs, or hidden routing through Antigravity.

2. **Controlled Staging Live Pilot Gate (`stagingLivePilotGate.ts`):**
   - Returns `READY_FOR_MANUAL_APPROVAL` when staging prerequisites are verified.
   - Transitions to `GO_STAGING_PILOT` strictly and exclusively when a cryptographically verified operator approval (`APPROVED_FOR_SINGLE_PILOT`) matching the pilot spec SHA-256 fingerprint is provided.
   - Fails closed with `BLOCKED` on any tampering, expiration, or mismatch.

3. **Immutable Safety Invariants:**
   - `realExecutionAllowed === false` prior to explicit, confirmed operator approval
   - `controlledExecutionEnabled === false` prior to explicit, confirmed operator approval
   - `killSwitchActive === true` prior to explicit, confirmed operator approval
   - `networkAllowed === false`
   - `credentialsAllowed === false`
   - `childProcessAllowed === false`
   - `sideEffectsAllowed === false`
   - `requiresHumanApproval === true`
   - `productionAlwaysDenied === true`

## Consequences
- The system is architecturally equipped to audit and validate a single staging pilot without any live execution side effects during Part A.
- Operators maintain 100% human-in-the-loop control.
- Hard stop enforced: No provider calls, no network access, and no credential reading occurs in Phase 6.9 Part A.
