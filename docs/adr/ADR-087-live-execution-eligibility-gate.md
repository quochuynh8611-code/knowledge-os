# ADR-087: Live Execution Eligibility Spec & Controlled Go/No-Go Gate

## Status
Accepted (Phase 6.8)

## Context
Following Phase 6.7 Post-Implementation Verification & Release Freeze, any future transition toward live execution staging review requires a strict, formal, fail-closed contract. This phase defines the preconditions and gates under which a non-production (staging) environment may be evaluated for future execution readiness without enabling real execution, without making network requests, without reading real credentials, and without modifying runtime behavior.

## Decision
1. **Live Execution Eligibility Contract (`liveExecutionEligibility.ts`):**
   - Defines formal evaluation status: `ELIGIBLE_FOR_FUTURE_STAGING_REVIEW`, `DENY`, `BLOCKED`.
   - Defines 15 exhaustive denial reasons covering environment violations, toggle/kill-switch states, and missing prerequisites.
   - Enforces 11 mandatory prerequisites:
     1. Operator Sign-off (`OPERATOR_SIGNOFF`)
     2. Readiness Report (`READINESS_REPORT`)
     3. Preflight Bundle (`PREFLIGHT_BUNDLE`)
     4. Rollback Rehearsal (`ROLLBACK_REHEARSAL`)
     5. Secret Safety Strategy (`SECRET_STRATEGY`)
     6. Network Safety Strategy (`NETWORK_STRATEGY`)
     7. Provider Sandbox Proof (`PROVIDER_SANDBOX_PROOF`)
     8. Regression Evidence (`REGRESSION_EVIDENCE`)
     9. Boundary Audit (`BOUNDARY_AUDIT`)
     10. Release Freeze (`RELEASE_FREEZE`)
     11. Runtime Composition Verification (`RUNTIME_COMPOSITION_VERIFIED`)
   - Unconditionally denies production (`PRODUCTION_ENVIRONMENT`).

2. **Controlled Go/No-Go Gate (`liveExecutionGoNoGoGate.ts`):**
   - Evaluates preflight evidence and eligibility reports fail-closed.
   - Output decisions: `GO_STAGING_REVIEW_ONLY`, `NO_GO_DENIED`, `NO_GO_BLOCKED`.
   - Cryptographic SHA-256 fingerprint verification ensures report tamper-evidence. Any corrupted or unverified report results in `NO_GO_BLOCKED` with `UNKNOWN_RISK`.

3. **Immutable Safety Invariants:**
   - `realExecutionAllowed === false`
   - `controlledExecutionEnabled === false`
   - `killSwitchActive === true`
   - `networkAllowed === false`
   - `credentialsAllowed === false`
   - `childProcessAllowed === false`
   - `sideEffectsAllowed === false`
   - `requiresHumanApproval === true`
   - `productionAlwaysDenied === true`

## Consequences
- No real provider execution (NotebookLM, Antigravity, Google Cloud) is triggered or enabled in Phase 6.8.
- No live network requests or credential readings occur.
- Human operators have a deterministic, mathematical contract and gate to audit prerequisites before any live staging review.
- Default-deny architecture is strictly preserved.
