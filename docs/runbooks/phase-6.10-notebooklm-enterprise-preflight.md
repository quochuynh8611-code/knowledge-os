# Phase 6.10 Runbook: NotebookLM Enterprise Infrastructure Preflight Protocol

## 1. Overview
This runbook guides the execution and verification of the **Phase 6.10 NotebookLM Enterprise Infrastructure Preflight Evaluation**.

> **CRITICAL ARCHITECTURAL CONSTRAINTS:**
> - Phase 6.10 is 100% READ-ONLY regarding external systems.
> - Zero calls to NotebookLM Enterprise API.
> - Zero calls to Google Cloud APIs.
> - Zero live subprocesses or `gcloud` invocations against live infrastructure.
> - If an item cannot be statically verified, it must be marked `UNVERIFIED` (yielding `NOT_READY`).

---

## 2. Infrastructure Preflight Checklist (15 Areas)

Ensure documentation and static evidence exist for each of the 15 areas:

1. **GCP Project Reference (`CHK-01-PROJECT-REF`):** Sanitized project ID reference.
2. **API Enablement (`CHK-02-API-ENABLEMENT`):** Manifest entry for NotebookLM Enterprise API.
3. **Regional Endpoint (`CHK-03-REGION-DEF`):** Regional routing target specified (`us-central1`).
4. **IAM / OAuth Scope Plan (`CHK-04-IAM-AUTH-SCOPE`):** Least privilege role definition.
5. **Secret Reference (`CHK-05-SECRET-REF-BOUNDARY`):** Secret Manager URI (without accessing value).
6. **Quota & Budget (`CHK-06-QUOTA-BUDGET`):** Hard allocation limits defined.
7. **Cloud Audit Logs (`CHK-07-CLOUD-AUDIT-LOGS`):** Log sink destination mapped.
8. **Network Egress Policy (`CHK-08-NETWORK-EGRESS`):** Egress firewall rules configured.
9. **Official API Boundary (`CHK-09-OFFICIAL-API-BOUNDARY`):** Official SDK boundary chosen.
10. **Consumer Cookie Ban (`CHK-10-NO-CONSUMER-COOKIE`):** Web session auth forbidden.
11. **Reverse RPC Ban (`CHK-11-NO-REVERSE-RPC`):** Unofficial protobuf forbidden.
12. **Hidden CLI Ban (`CHK-12-NO-ANTIGRAVITY-ROUTING`):** Hidden CLI routing forbidden.
13. **Data Safety Policy (`CHK-13-TEST-PUBLIC-SOURCE-POLICY`):** `TEST_PUBLIC` data only.
14. **Rollback Rehearsal (`CHK-14-ROLLBACK-CLEANUP-PLAN`):** 7-step cleanup workflow.
15. **Production Deny Proof (`CHK-15-PRODUCTION-DENIED-PROOF`):** Production locked.

---

## 3. Verification Commands

### Step 1: TypeScript Compilation
```bash
npm run typecheck
```

### Step 2: Phase 6.10 Unit Tests
```bash
npx vitest run \
  tests/unit/notebooklm-enterprise-infrastructure-preflight.test.ts
```

### Step 3: Full Regression Suite
```bash
npx vitest run \
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
# Clean Phase 6.10 artifacts
git clean -fd \
  src/server/services/providers/notebooklmEnterpriseInfrastructurePreflight.ts \
  tests/unit/notebooklm-enterprise-infrastructure-preflight.test.ts \
  docs/adr/ADR-089-notebooklm-enterprise-infrastructure-preflight.md \
  docs/session-logs/phase-6.10-notebooklm-enterprise-infrastructure-preflight.md \
  docs/runbooks/phase-6.10-notebooklm-enterprise-preflight.md
```
