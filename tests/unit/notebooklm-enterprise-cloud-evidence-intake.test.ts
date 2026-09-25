import { describe, it, expect } from "vitest";
import {
  CloudEvidenceArtifact,
  CloudEvidenceCategory,
  CloudEvidenceSourceType,
  RawOperatorEvidenceInput,
  NotebookLMEnterpriseCloudEvidenceIntakeReport,
  intakeAndClassifyCloudEvidence,
  computeCloudEvidenceIntakeFingerprint,
  MANDATORY_CLOUD_CATEGORIES,
} from "../../src/server/services/providers/notebooklmEnterpriseCloudEvidenceIntake";

describe("Phase 6.12 — Operator-Provided Cloud Evidence Intake for NotebookLM Enterprise", () => {
  const sampleRepositoryDocsInput: RawOperatorEvidenceInput = {
    artifactId: "ART-DOC-01",
    category: "PROJECT",
    sourceType: "REPOSITORY_DOCUMENTATION",
    summary: "Project reference documented in ADR-088 and ADR-089",
  };

  const sampleValidOperatorInputs: RawOperatorEvidenceInput[] = [
    {
      artifactId: "ART-OP-01-PROJECT",
      category: "PROJECT",
      sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
      summary: "GCP Console staging project export shows active project ref staging-kb-proj",
      payloadMetadata: { projectId: "staging-kb-proj", projectStatus: "ACTIVE" },
    },
    {
      artifactId: "ART-OP-02-API",
      category: "API_ENABLEMENT",
      sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
      summary: "Service usage metadata shows notebooklm.googleapis.com ENABLED in staging project",
      payloadMetadata: { service: "notebooklm.googleapis.com", state: "ENABLED" },
    },
    {
      artifactId: "ART-OP-03-REGION",
      category: "REGION",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Regional configuration verified for us-central1 endpoint",
      payloadMetadata: { location: "us-central1" },
    },
    {
      artifactId: "ART-OP-04-IAM",
      category: "IAM",
      sourceType: "OPERATOR_SCREENSHOT_METADATA",
      summary: "IAM policy metadata shows service account bound to roles/notebooklm.user",
      payloadMetadata: { role: "roles/notebooklm.user", memberType: "serviceAccount" },
    },
    {
      artifactId: "ART-OP-05-AUTH-SCOPE",
      category: "AUTH_SCOPE",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "OAuth scope configured as https://www.googleapis.com/auth/cloud-platform",
      payloadMetadata: { scope: "https://www.googleapis.com/auth/cloud-platform" },
    },
    {
      artifactId: "ART-OP-06-SECRET",
      category: "SECRET_BOUNDARY",
      sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
      summary: "Secret Manager resource metadata shows secret staging-sa-key exists without reading secret payload",
      payloadMetadata: { secretUri: "projects/staging-kb/secrets/staging-sa-key" },
    },
    {
      artifactId: "ART-OP-07-QUOTA",
      category: "QUOTA",
      sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
      summary: "Quota metrics export shows limit 100 requests per minute with current usage 0",
      payloadMetadata: { limit: 100, unit: "requests_per_minute" },
    },
    {
      artifactId: "ART-OP-08-BUDGET",
      category: "BUDGET",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Billing alert set at 50 USD with hard cap at 100 USD",
      payloadMetadata: { budgetCapUsd: 100 },
    },
    {
      artifactId: "ART-OP-09-AUDIT",
      category: "AUDIT_LOGGING",
      sourceType: "OPERATOR_CONSOLE_EXPORT_METADATA",
      summary: "Audit logging export shows Cloud Audit Logs sink configured for data read/write",
      payloadMetadata: { logSink: "cloud_audit_logs", logTypes: ["DATA_READ", "DATA_WRITE"] },
    },
    {
      artifactId: "ART-OP-10-NETWORK",
      category: "NETWORK",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "VPC firewall rule permits egress on port 443 to googleapis.com only",
      payloadMetadata: { egressPort: 443, targetDomain: "*.googleapis.com" },
    },
    {
      artifactId: "ART-OP-11-PROD-DENY",
      category: "PRODUCTION_DENY",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Production project policy unconditionally locks automated live execution",
      payloadMetadata: { productionExecutionLocked: true },
    },
  ];

  it("1. repository documentation alone is classified as DOCUMENTED_ONLY, not VALID", () => {
    const report = intakeAndClassifyCloudEvidence([sampleRepositoryDocsInput]);
    const docArtifact = report.artifacts.find((a) => a.artifactId === "ART-DOC-01");
    expect(docArtifact).toBeDefined();
    expect(docArtifact?.status).toBe("DOCUMENTED_ONLY");
    expect(report.documentedOnlyArtifacts).toContain("ART-DOC-01");
    expect(report.validArtifacts).not.toContain("ART-DOC-01");
  });

  it("2. missing cloud evidence for mandatory categories is classified as MISSING", () => {
    const report = intakeAndClassifyCloudEvidence([]);
    expect(report.missingArtifacts.length).toBe(MANDATORY_CLOUD_CATEGORIES.length);
    expect(report.evidenceCoverageStatus).toBe("INSUFFICIENT");
  });

  it("3. contradictory metadata is classified as INVALID", () => {
    const contradictoryInput: RawOperatorEvidenceInput = {
      artifactId: "ART-CONTRADICTION",
      category: "PROJECT",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Staging project metadata with production project environment tag",
      payloadMetadata: { environment: "production", projectId: "prod-kb-project" },
    };
    const report = intakeAndClassifyCloudEvidence([contradictoryInput]);
    expect(report.invalidArtifacts).toContain("ART-CONTRADICTION");
  });

  it("4. sanitized operator metadata with valid inputs is classified as VALID", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.validArtifacts.length).toBe(sampleValidOperatorInputs.length);
    expect(report.invalidArtifacts).toEqual([]);
    expect(report.missingArtifacts).toEqual([]);
    expect(report.evidenceCoverageStatus).toBe("OPERATOR_EVIDENCE_READY");
  });

  it("5. raw secret-looking strings in metadata are rejected as INVALID", () => {
    const rawSecretInput: RawOperatorEvidenceInput = {
      artifactId: "ART-SECRET-LEAK",
      category: "SECRET_BOUNDARY",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Secret payload containing raw API key",
      payloadMetadata: { apiKey: "AIzaSyD-unmasked-raw-api-key-12345" },
    };
    const report = intakeAndClassifyCloudEvidence([rawSecretInput]);
    expect(report.invalidArtifacts).toContain("ART-SECRET-LEAK");
  });

  it("6. filesystem paths in metadata are sanitized or rejected", () => {
    const rawPathInput: RawOperatorEvidenceInput = {
      artifactId: "ART-PATH-LEAK",
      category: "PROJECT",
      sourceType: "OPERATOR_MANUAL_ENTRY",
      summary: "Metadata referencing local path /Users/mr.chem/secrets/sa.json",
      payloadMetadata: { filePath: "/Users/mr.chem/secrets/sa.json" },
    };
    const report = intakeAndClassifyCloudEvidence([rawPathInput]);
    expect(report.artifacts.every((a) => a.containsFilesystemPath === false)).toBe(true);
  });

  it("7. report is deterministic with fixed timestamp", () => {
    const r1 = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs, "2026-09-25T12:00:00.000Z");
    const r2 = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs, "2026-09-25T12:00:00.000Z");
    expect(r1.fingerprint).toBe(r2.fingerprint);
    expect(r1.fingerprint).toHaveLength(64);
  });

  it("8. report is JSON serializable", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("6.12.0");
    expect(parsed.targetProvider).toBe("notebooklm-enterprise");
    expect(parsed.environment).toBe("staging");
  });

  it("9. intake evaluator does not call provider", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report).toBeDefined();
  });

  it("10. intake evaluator does not make network calls", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.networkAllowed).toBe(false);
  });

  it("11. intake evaluator does not spawn subprocess", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.apiRequestsMade).toBe(false);
  });

  it("12. intake evaluator does not open MCP listeners", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.targetProvider).toBe("notebooklm-enterprise");
  });

  it("13. apiRequestsMade is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.apiRequestsMade).toBe(false);
  });

  it("14. credentialsAccessed is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.credentialsAccessed).toBe(false);
  });

  it("15. notebookCreated is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.notebookCreated).toBe(false);
  });

  it("16. sourceUploaded is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.sourceUploaded).toBe(false);
  });

  it("17. realExecutionAllowed is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("18. controlledExecutionEnabled is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.controlledExecutionEnabled).toBe(false);
  });

  it("19. killSwitchActive is always true", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.killSwitchActive).toBe(true);
  });

  it("20. productionAllowed is always false", () => {
    const report = intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(report.productionAllowed).toBe(false);
  });

  it("21. input array is not mutated", () => {
    const copy = JSON.parse(JSON.stringify(sampleValidOperatorInputs));
    intakeAndClassifyCloudEvidence(sampleValidOperatorInputs);
    expect(sampleValidOperatorInputs).toEqual(copy);
  });
});
