# Phase 6.12 Runbook: Operator Cloud Evidence Intake Protocol

## 1. Overview
This runbook guides operators on submitting and classifying manual cloud infrastructure evidence for the **NotebookLM Enterprise Integration** without making live network requests.

> **CRITICAL ARCHITECTURAL CONSTRAINTS:**
> - Zero live automated queries to Google Cloud or NotebookLM APIs.
> - Operators submit sanitized metadata only (console exports, screenshots metadata, manual configs).
> - Raw secrets, tokens, or credentials are strictly rejected.

---

## 2. Operator Submission Format

Operators can submit JSON or typed evidence objects matching `RawOperatorEvidenceInput`:

```typescript
const input: RawOperatorEvidenceInput = {
  artifactId: "ART-OP-PROJECT-01",
  category: "PROJECT",
  sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
  summary: "GCP Console staging project export shows staging-kb-proj",
  payloadMetadata: { projectId: "staging-kb-proj", status: "ACTIVE" },
};
```

---

## 3. Verification Commands

### Step 1: TypeScript Compilation
```bash
npm run typecheck
```

### Step 2: Phase 6.12 Unit Tests
```bash
npx vitest run \
  tests/unit/notebooklm-enterprise-cloud-evidence-intake.test.ts
```

### Step 3: Full Regression Suite
```bash
npx vitest run \
  tests/unit/notebooklm-enterprise-readiness-dossier.test.ts \
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
# Clean Phase 6.12 artifacts
git clean -fd \
  src/server/services/providers/notebooklmEnterpriseCloudEvidenceIntake.ts \
  tests/unit/notebooklm-enterprise-cloud-evidence-intake.test.ts \
  docs/adr/ADR-091-notebooklm-enterprise-cloud-evidence-intake.md \
  docs/session-logs/phase-6.12-notebooklm-enterprise-cloud-evidence-intake.md \
  docs/runbooks/phase-6.12-notebooklm-enterprise-cloud-evidence-intake.md
```
