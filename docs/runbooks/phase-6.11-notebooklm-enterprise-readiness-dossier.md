# Phase 6.11 Runbook: NotebookLM Enterprise Readiness Dossier Compilation Protocol

## 1. Overview
This runbook governs the creation and validation of the **Evidence-Backed NotebookLM Enterprise Readiness Dossier** (Phase 6.11).

> **CRITICAL ARCHITECTURAL CONSTRAINTS:**
> - Zero live external calls to NotebookLM or Google Cloud.
> - Pure categorization based on existing repository artifacts and documentation.
> - No item is promoted to `SYSTEM_VERIFIED_EVIDENCE` without local automated test or code proof.

---

## 2. Four-Tier Classification Protocol

When reviewing any infrastructure prerequisite:
1. **`SYSTEM_VERIFIED_EVIDENCE`:** Code exists in repo, covered by passing unit tests, and enforced by fail-closed runtime gates.
2. **`DOCUMENTED_EVIDENCE`:** Claim is written in ADRs, session logs, or runbooks, but external cloud state has not been queried.
3. **`SPEC_ASSERTION`:** Claim is represented as an interface, constant, or data contract without empirical validation.
4. **`UNVERIFIED_ASSUMPTION`:** Claim lacks local documentation and automated test verification.

---

## 3. Verification Commands

### Step 1: TypeScript Compilation
```bash
npm run typecheck
```

### Step 2: Phase 6.11 Unit Tests
```bash
npx vitest run \
  tests/unit/notebooklm-enterprise-readiness-dossier.test.ts
```

### Step 3: Full Regression Suites
```bash
npx vitest run \
  tests/unit/notebooklm-enterprise-infrastructure-preflight.test.ts \
  tests/unit/staging-live-pilot-contract.test.ts \
  tests/unit/staging-live-pilot-gate.test.ts \
  tests/unit/live-execution-eligibility.test.ts \
  tests/unit/live-execution-go-no-go-gate.test.ts \
  tests/unit/phase-6-7-verification.test.ts \
  tests/unit/phase-6-7-release-freeze.test.ts \
  tests/unit/preflight-gate.test.ts
```

---

## 4. Emergency Abort & Rollback

If any anomaly occurs:
```bash
# Clean Phase 6.11 artifacts
git clean -fd \
  src/server/services/providers/notebooklmEnterpriseReadinessDossier.ts \
  tests/unit/notebooklm-enterprise-readiness-dossier.test.ts \
  docs/adr/ADR-090-notebooklm-enterprise-readiness-dossier.md \
  docs/session-logs/phase-6.11-notebooklm-enterprise-readiness-dossier.md \
  docs/runbooks/phase-6.11-notebooklm-enterprise-readiness-dossier.md
```
