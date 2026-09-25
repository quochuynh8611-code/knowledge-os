# ADR-091: Operator-Provided Cloud Evidence Intake for NotebookLM Enterprise

## Status
Accepted (Phase 6.12)

## Context
Following Phase 6.11 Readiness Dossier, external Google Cloud / NotebookLM Enterprise prerequisites were identified as `DOCUMENTED_EVIDENCE` awaiting operator verification. To bridge this without initiating automated, unmonitored live network queries to external APIs, an explicit, pure, sanitized intake layer is required for human operators to provide evidence metadata.

## Decision
1. **Cloud Evidence Classification Model (`notebooklmEnterpriseCloudEvidenceIntake.ts`):**
   - Four evidence statuses: `VALID`, `INVALID`, `MISSING`, `DOCUMENTED_ONLY`.
   - Four allowed source types: `OPERATOR_SCREENSHOT_METADATA`, `OPERATOR_CONSOLE_EXPORT_METADATA`, `OPERATOR_MANUAL_ENTRY`, `REPOSITORY_DOCUMENTATION`.
   - Enforces 11 cloud evidence categories: `PROJECT`, `API_ENABLEMENT`, `REGION`, `IAM`, `AUTH_SCOPE`, `SECRET_BOUNDARY`, `QUOTA`, `BUDGET`, `AUDIT_LOGGING`, `NETWORK`, `PRODUCTION_DENY`.

2. **Strict Sanitization & Redaction Rules:**
   - Raw secret values, API keys (regex `AIzaSy...`), bearer tokens, and private keys are immediately rejected and marked `INVALID`.
   - Filesystem paths (`/Users/`, `/home/`, `/var/`, `/tmp/`) are sanitized or rejected.
   - Repository documentation alone is classified as `DOCUMENTED_ONLY`, never `VALID`.
   - Contradictory evidence (e.g. production metadata in a staging intake) is marked `INVALID`.

3. **Deterministic Canonical SHA-256 Fingerprinting:**
   - Guarantees tamper-evident intake reports with sorted keys.

4. **Immutable Safety Invariants:**
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
- Operators have a pure, mathematical interface to submit and classify cloud evidence artifacts.
- Zero network calls or credentials access occur during intake.
- Clear separation between proven operator evidence vs documented claims.
