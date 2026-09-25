# Phase 6.9 Runbook: Controlled Staging Live Pilot Protocol

## 1. Overview
This runbook governs the execution and gatekeeping of a singular, controlled staging live pilot for research provider integration.

> **CRITICAL ARCHITECTURAL CONSTRAINTS:**
> - Part A does NOT execute any live providers, does NOT open network sockets, and does NOT read raw credentials.
> - Part B is strictly conditional on explicit manual operator approval within the active session (`APPROVE PHASE 6.9 STAGING PILOT`).

---

## 2. Pre-Approval Checklist (Part A)

- [x] **1. Baseline Cleanliness:** Git status and diff checked.
- [x] **2. Single Target Provider:** Official NotebookLM Enterprise API adapter identified.
- [x] **3. Safe Credential Reference:** Secret reference name verified with zero raw secret leaks.
- [x] **4. Test-Only Source:** Source classified as `TEST_PUBLIC`.
- [x] **5. Single Attempt Constraint:** `maxAttempts === 1`.
- [x] **6. Zero Parallel Execution:** `allowParallelExecution === false`.
- [x] **7. Zero Silent Fallback:** `allowProviderFallback === false`.
- [x] **8. Bounded Timeout & Budget:** Timeout (e.g. 15,000ms) and quota limits set.
- [x] **9. Audit Sink & Rollback Configured:** Observability and rollback proofs verified.
- [x] **10. Kill-Switch Active:** Kill-switch actively engaged.

---

## 3. Execution Verification Commands

### Step 1: TypeScript Compilation
```bash
npm run typecheck
```

### Step 2: Phase 6.9 Unit & Gate Tests
```bash
npx vitest run \
  tests/unit/staging-live-pilot-contract.test.ts \
  tests/unit/staging-live-pilot-gate.test.ts
```

### Step 3: Regression Test Suite
```bash
npx vitest run \
  tests/unit/live-execution-eligibility.test.ts \
  tests/unit/live-execution-go-no-go-gate.test.ts \
  tests/unit/phase-6-7-verification.test.ts \
  tests/unit/phase-6-7-release-freeze.test.ts \
  tests/unit/preflight-gate.test.ts
```

---

## 4. Operator Approval Gate (Transition to Part B)

To authorize a single controlled staging live pilot:
1. Operator must verify the Preflight Summary.
2. Operator must confirm non-production staging environment.
3. Operator must provide explicit written approval: `APPROVE PHASE 6.9 STAGING PILOT`.
4. Any deviation from the approved spec immediately terminates execution (`STOPPED` / `BLOCKED`).

---

## 5. Rollback & Emergency Abort

In case of any unexpected anomaly:
1. **Engage Kill Switch:** Immediately trigger `EXECUTION_KILL_SWITCH`.
2. **Disable Controlled Toggle:** Confirm toggle is set to `false`.
3. **Clean Phase 6.9 Artifacts:**
```bash
git clean -fd \
  src/server/services/providers/stagingLivePilot*.ts \
  tests/unit/staging-live-pilot*.test.ts \
  docs/adr/ADR-088-controlled-staging-live-pilot.md \
  docs/session-logs/phase-6.9-controlled-staging-live-pilot-summary.md \
  docs/runbooks/phase-6.9-controlled-staging-live-pilot.md
```
