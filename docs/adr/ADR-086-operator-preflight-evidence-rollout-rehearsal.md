# ADR-086: Operator Preflight Evidence Bundle & Rollout Rehearsal Gate

## Status
Accepted (Phase 6.6)

## Context
Following the implementation of the staging sandbox and provider dry-run layer in Phase 6.5, a structured, tamper-evident, deterministic preflight gate is required to aggregate, sanitize, and verify all safety evidence before any live rollout can even be contemplated by human operators.

## Decision
1. **Preflight Evidence Bundle Contract (`OperatorPreflightEvidenceBundle`):**
   - Collects 9 mandatory evidence kinds: `READINESS_REPORT`, `RUNTIME_COMPOSITION_AUDIT`, `MANUAL_ENABLEMENT_DECISION`, `CONTROLLED_TOGGLE_STATE`, `KILL_SWITCH_STATE`, `STAGING_DRY_RUN_RESULT`, `NO_REAL_EXECUTION_PROOF`, `REGRESSION_TEST_RESULT`, and `ROLLBACK_REHEARSAL_RESULT`.
   - Staging/test environments only; production is unconditionally denied (`PRODUCTION_FORBIDDEN`).
   - Strict completeness: Every item must be `PASS` and sanitized; missing, failed, stale, or unsanitized items fail-closed with decision `BLOCKED`.

2. **Evidence Sanitizer (`evidenceSanitizer.ts`):**
   - Pure, deterministic, fail-closed redaction and field allowlisting.
   - Redacts credentials, tokens (Bearer, OAuth, API keys), private keys, cookies, database URLs, and filesystem paths (`/Users/`, `/home/`, `/var/`, `/tmp/`, etc.).
   - Denies non-allowlisted properties (`rawSource`, `processEnv`, `socket`, `providerInstance`, `shellCommand`, etc.).

3. **Canonical Fingerprinting (`evidenceBundleFingerprint.ts`):**
   - Uses SHA-256 with sorted and canonicalized JSON representations.
   - Guarantees tamper-evidence across evidence items and bundle metadata.

4. **Operator Sign-off Contract (`operatorSignoffContract.ts`):**
   - Serves solely as a manual review acknowledgement artifact (`ACKNOWLEDGED_FOR_MANUAL_REVIEW`).
   - Does NOT open runtime execution, does NOT mutate toggle state, does NOT disable the kill switch, and does NOT permit side effects.
   - Cryptographically binds to the bundle fingerprint and enforces strict expiry timestamps.

5. **Rollback Rehearsal Protocol (`rollbackRehearsal.ts`):**
   - Executes a simulated 7-step rollback verification ensuring kill-switch engagement, toggle disabling, in-flight dry-run cancellation, zero provider calls, zero network calls, zero credential accesses, and final default-deny invariant preservation.

6. **Preflight Evaluation Gate (`preflightGate.ts`):**
   - Yields `READY_FOR_OPERATOR_REVIEW` strictly when all 9 items pass, fingerprint is valid, environment is non-production, toggle is disabled, kill-switch is active, and rollback rehearsal succeeds.
   - Returns `BLOCKED` on any anomaly.

## Invariants & Safety Guarantees
- `realExecutionAllowed === false`
- `networkAllowed === false`
- `credentialsAllowed === false`
- `childProcessAllowed === false`
- `sideEffectsAllowed === false`
- `providerCallMade === false`
- `networkCallMade === false`
- `credentialsAccessed === false`
- `createdResources === []`
- Zero real provider execution, zero child process spawning, zero live network requests, zero database migrations.

## Consequences
Human operators have full visibility into deterministic, sanitized preflight evidence before review, with complete mathematical assurance of zero unauthorized side effects.
