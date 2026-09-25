# ADR-089: NotebookLM Enterprise Infrastructure Preflight Contract & Evaluator

## Status
Accepted (Phase 6.10)

## Context
Following Phase 6.9 Controlled Staging Live Pilot contract verification, an independent, read-only infrastructure preflight evaluation is required to formally document and verify Google Cloud / NotebookLM Enterprise environment prerequisites. This phase must strictly operate without initiating live external calls, without accessing raw credentials, without creating cloud resources, and without altering runtime safety flags.

## Decision
1. **Pure Infrastructure Preflight Contract (`notebooklmEnterpriseInfrastructurePreflight.ts`):**
   - Enforces 15 mandatory verification checks:
     1. `CHK-01-PROJECT-REF` (PROJECT): GCP staging project reference.
     2. `CHK-02-API-ENABLEMENT` (API_ENABLEMENT): NotebookLM Enterprise API enablement status.
     3. `CHK-03-REGION-DEF` (REGION): Staging regional endpoint (`us-central1`).
     4. `CHK-04-IAM-AUTH-SCOPE` (IAM / AUTH_SCOPE): Service account least-privilege IAM roles and OAuth scopes.
     5. `CHK-05-SECRET-REF-BOUNDARY` (SECRET_BOUNDARY): Secret Manager resource URI identifier without value access.
     6. `CHK-06-QUOTA-BUDGET` (QUOTA): Quota and budget limits.
     7. `CHK-07-CLOUD-AUDIT-LOGS` (AUDIT_LOGGING): Cloud Audit Logs ingestion plan.
     8. `CHK-08-NETWORK-EGRESS` (NETWORK): Egress policy and VPC perimeter.
     9. `CHK-09-OFFICIAL-API-BOUNDARY` (PROVIDER_BOUNDARY): Official Enterprise client boundary.
     10. `CHK-10-NO-CONSUMER-COOKIE` (PROVIDER_BOUNDARY): Ban on consumer web cookies.
     11. `CHK-11-NO-REVERSE-RPC` (PROVIDER_BOUNDARY): Ban on reverse-engineered RPCs.
     12. `CHK-12-NO-ANTIGRAVITY-ROUTING` (PROVIDER_BOUNDARY): Ban on hidden routing via Antigravity CLI.
     13. `CHK-13-TEST-PUBLIC-SOURCE-POLICY` (DATA_POLICY): Mandatory `TEST_PUBLIC` classification; zero user data.
     14. `CHK-14-ROLLBACK-CLEANUP-PLAN` (ROLLBACK): 7-step rollback & cleanup verification.
     15. `CHK-15-PRODUCTION-DENIED-PROOF` (PROVIDER_BOUNDARY): Production environment unconditionally locked.

2. **Deterministic Evaluation Engine:**
   - Any `UNVERIFIED` or `NOT_RUN` mandatory check yields `NOT_READY`.
   - Any `FAIL` or `BLOCKED` check yields `BLOCKED`.
   - All 15 checks passing yields `PASS`.
   - SHA-256 canonical hashing ensures tamper-evident reports.

3. **Immutable Safety Invariants:**
   - `apiRequestsMade: false`
   - `credentialsAccessed: false`
   - `notebookCreated: false`
   - `sourceUploaded: false`
   - `networkAllowed: false`
   - `realExecutionAllowed: false`
   - `controlledExecutionEnabled: false`
   - `killSwitchActive: true`
   - `productionAllowed: false`

## Consequences
- The system possesses a deterministic, tamper-evident contract to evaluate all 15 cloud infrastructure prerequisites.
- Zero network traffic, zero credential reading, zero resource creation, and zero production risk.
- Execution halts at Phase 6.10 pending human review of the 15 infrastructure areas.
