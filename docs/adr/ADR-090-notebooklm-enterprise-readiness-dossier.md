# ADR-090: Evidence-Backed NotebookLM Enterprise Readiness Dossier

## Status
Accepted (Phase 6.11)

## Context
In Phase 6.10, the infrastructure preflight contract proved evaluator correctness under simulated inputs, but did not distinguish between software boundaries verified locally versus external cloud infrastructure claims documented in design specifications. A formal, evidence-backed dossier is required to rigorously classify each claim into standardized evidence classes without initiating external network calls.

## Decision
1. **Four-Tier Evidence Classification Taxonomy (`EvidenceClass`):**
   - `SPEC_ASSERTION`: Claim exists solely as a schema, interface, or constant definition.
   - `DOCUMENTED_EVIDENCE`: Claim is documented in ADRs, runbooks, session logs, or architectural manifests.
   - `SYSTEM_VERIFIED_EVIDENCE`: Claim is proven by repository-local source code, static enforcement gates, or automated unit test suites.
   - `UNVERIFIED_ASSUMPTION`: Claim relies on external state without local artifacts or verification.

2. **Classification of 17 Infrastructure Claims:**
   - **Documented Evidence (External GCP Reality):**
     1. GCP Staging Project Reference (`DOS-01-PROJECT-REF`)
     2. NotebookLM Enterprise API Enablement (`DOS-02-API-ENABLEMENT`)
     3. Regional Routing Target `us-central1` (`DOS-03-REGION-ENDPOINT`)
     4. IAM Least-Privilege Plan (`DOS-04-IAM-ROLE-PLAN`)
     5. OAuth Scope Plan (`DOS-05-OAUTH-SCOPE-PLAN`)
     6. Secret Manager URI Format (`DOS-06-SECRET-MANAGER-NAMING`)
     7. Quota Allocation Policy (`DOS-07-QUOTA-POLICY`)
     8. Budget Cap Policy (`DOS-08-BUDGET-POLICY`)
     9. Cloud Audit Logging Topology (`DOS-09-AUDIT-LOGGING-PLAN`)
     10. VPC Egress Firewall Perimeter (`DOS-10-NETWORK-EGRESS-POLICY`)
   - **System Verified Evidence (Local Software Boundaries):**
     11. Official Provider Boundary Selection (`DOS-11-OFFICIAL-API-BOUNDARY`)
     12. Consumer Cookie Prohibition Gate (`DOS-12-NO-CONSUMER-COOKIE`)
     13. Reverse RPC Prohibition Gate (`DOS-13-NO-REVERSE-RPC`)
     14. Antigravity Hidden Routing Gate (`DOS-14-NO-ANTIGRAVITY-ROUTING`)
     15. `TEST_PUBLIC` Source Policy Gate (`DOS-15-TEST-PUBLIC-SOURCE-POLICY`)
     16. 7-Step Rollback Rehearsal Protocol (`DOS-16-ROLLBACK-PLAN`)
     17. Production Deny & Lock Invariant (`DOS-17-PRODUCTION-DENIED-PROOF`)

3. **Infrastructure Reality Status:**
   - Evaluated as `PARTIALLY_PROVEN`: Local application boundaries and safety gates are 100% system-verified, while external GCP cloud services are documented in architectural specifications and awaiting live credentialed operator verification.

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
- Full, honest transparency: Prevents any false impression that external cloud APIs have been contacted.
- Preserves 100% fail-closed safety and default-deny invariants.
- Establishes a concrete basis for human operators to audit documentation vs local code verification.
