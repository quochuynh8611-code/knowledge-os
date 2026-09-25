# Phase 6.8 Runbook: Live Execution Prerequisites & Go/No-Go Gate Evaluation

## 1. Overview
This runbook describes the operational procedure for evaluating the **Phase 6.8 Live Execution Eligibility Spec** and executing the **Controlled Go/No-Go Gate**.

> **CRITICAL SAFETY INVARIANT:**
> Phase 6.8 does NOT execute any real research providers.
> All evaluations occur in fail-closed memory with zero network, zero credentials, and zero side effects.

---

## 2. Prerequisites Checklist

Before evaluating live execution eligibility for future staging reviews, ensure all 11 items are satisfied:

- [ ] **1. Operator Sign-off (`OPERATOR_SIGNOFF`)**
  - Valid `ACKNOWLEDGED_FOR_MANUAL_REVIEW` decision artifact.
  - Cryptographically bound to the bundle SHA-256 fingerprint.
  - Not expired (`expiresAt > now`).
- [ ] **2. Readiness Report (`READINESS_REPORT`)**
  - Phase 6.3 readiness report with status `READY`.
- [ ] **3. Preflight Bundle (`PREFLIGHT_BUNDLE`)**
  - Phase 6.6 bundle complete with 9 required evidence items.
- [ ] **4. Rollback Rehearsal (`ROLLBACK_REHEARSAL`)**
  - 7-step simulated rollback rehearsal passed with zero created resources.
- [ ] **5. Secret Strategy (`SECRET_STRATEGY`)**
  - Pure sanitizer verified; zero secrets present in reports.
- [ ] **6. Network Strategy (`NETWORK_STRATEGY`)**
  - Denied-by-default verified; zero direct socket or HTTP calls.
- [ ] **7. Provider Sandbox Proof (`PROVIDER_SANDBOX_PROOF`)**
  - Fake transport verified in staging/test; zero live provider calls.
- [ ] **8. Regression Evidence (`REGRESSION_EVIDENCE`)**
  - Full test suite passed (all unit and regression tests pass with 0 failures).
- [ ] **9. Boundary Audit (`BOUNDARY_AUDIT`)**
  - Static audit confirms zero `any` types and zero live imports in preflight modules.
- [ ] **10. Release Freeze (`RELEASE_FREEZE`)**
  - Phase 6.7 release freeze record confirmed.
- [ ] **11. Runtime Composition (`RUNTIME_COMPOSITION_VERIFIED`)**
  - Audit confirms zero provider bypasses and verified injection ports.

---

## 3. Evaluation Procedure

### Step 1: Run TypeScript Compilation Verification
```bash
npm run typecheck
```
*Expected: Clean exit code 0 with 0 errors.*

### Step 2: Run Phase 6.8 Unit & Gate Tests
```bash
npx vitest run \
  tests/unit/live-execution-eligibility.test.ts \
  tests/unit/live-execution-go-no-go-gate.test.ts
```
*Expected: 42/42 tests pass.*

### Step 3: Run Full Regression Suites
```bash
npx vitest run \
  tests/unit/research-execution-readiness.test.ts \
  tests/unit/runtime-composition-audit.test.ts \
  tests/unit/manual-enablement-contract.test.ts \
  tests/unit/manual-enablement-gate.test.ts \
  tests/unit/controlled-execution-toggle.test.ts \
  tests/unit/execution-kill-switch.test.ts \
  tests/unit/staging-sandbox-contract.test.ts \
  tests/unit/provider-dry-run-contract.test.ts \
  tests/unit/fake-provider-transport.test.ts \
  tests/unit/provider-dry-run-adapter.test.ts \
  tests/unit/operator-preflight-evidence.test.ts \
  tests/unit/operator-signoff-contract.test.ts \
  tests/unit/rollback-rehearsal.test.ts \
  tests/unit/evidence-bundle-fingerprint.test.ts \
  tests/unit/evidence-sanitizer.test.ts \
  tests/unit/preflight-gate.test.ts \
  tests/unit/phase-6-7-verification.test.ts \
  tests/unit/phase-6-7-release-freeze.test.ts \
  tests/unit/phase-6-7-boundary-audit.test.ts
```
*Expected: All test suites pass.*

---

## 4. Rollback Plan

If any anomaly, ambiguity, or unexpected behavior is detected during evaluation:
```bash
# 1. Engage immediate kill-switch invariant
# 2. Ensure controlled toggle is disabled
# 3. Discard untracked changes if rolling back Phase 6.8
git clean -fd src/server/services/providers/liveExecution*.ts tests/unit/live-execution*.test.ts
```
