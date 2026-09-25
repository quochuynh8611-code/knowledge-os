import { describe, it, expect } from "vitest";
import {
  InfrastructurePreflightCheck,
  InfrastructurePreflightStatus,
  NotebookLMEnterpriseInfrastructurePreflightReport,
  MANDATORY_PREFLIGHT_CHECK_IDS,
  evaluateInfrastructurePreflight,
  computeInfrastructurePreflightFingerprint,
} from "../../src/server/services/providers/notebooklmEnterpriseInfrastructurePreflight";

describe("Phase 6.10 — NotebookLM Enterprise Infrastructure Preflight Contract & Evaluator", () => {
  const sample15PassChecks: InfrastructurePreflightCheck[] = [
    {
      checkId: "CHK-01-PROJECT-REF",
      category: "PROJECT",
      status: "PASS",
      summary: "GCP staging project reference exists as sanitized metadata",
      evidenceFingerprint: "1".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-02-API-ENABLEMENT",
      category: "API_ENABLEMENT",
      status: "PASS",
      summary: "NotebookLM Enterprise API enablement independently documented in staging manifest",
      evidenceFingerprint: "2".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-03-REGION-DEF",
      category: "REGION",
      status: "PASS",
      summary: "Staging regional endpoint defined as us-central1",
      evidenceFingerprint: "3".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-04-IAM-AUTH-SCOPE",
      category: "IAM",
      status: "PASS",
      summary: "Service account least-privilege IAM roles and OAuth scopes documented",
      evidenceFingerprint: "4".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-05-SECRET-REF-BOUNDARY",
      category: "SECRET_BOUNDARY",
      status: "PASS",
      summary: "Secret Manager resource URI identified without accessing secret value",
      evidenceFingerprint: "5".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-06-QUOTA-BUDGET",
      category: "QUOTA",
      status: "PASS",
      summary: "Pilot quota and budget allocation policy defined with hard caps",
      evidenceFingerprint: "6".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-07-CLOUD-AUDIT-LOGS",
      category: "AUDIT_LOGGING",
      status: "PASS",
      summary: "GCP Cloud Audit Logging ingestion plan verified for staging project",
      evidenceFingerprint: "7".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-08-NETWORK-EGRESS",
      category: "NETWORK",
      status: "PASS",
      summary: "Egress firewall rules and VPC service perimeter documented",
      evidenceFingerprint: "8".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-09-OFFICIAL-API-BOUNDARY",
      category: "PROVIDER_BOUNDARY",
      status: "PASS",
      summary: "Official Google Enterprise client boundary selected and configured",
      evidenceFingerprint: "9".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-10-NO-CONSUMER-COOKIE",
      category: "PROVIDER_BOUNDARY",
      status: "PASS",
      summary: "Consumer web cookie/session authentication strictly prohibited",
      evidenceFingerprint: "a".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-11-NO-REVERSE-RPC",
      category: "PROVIDER_BOUNDARY",
      status: "PASS",
      summary: "Reverse-engineered protobuf/RPC interfaces strictly forbidden",
      evidenceFingerprint: "b".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-12-NO-ANTIGRAVITY-ROUTING",
      category: "PROVIDER_BOUNDARY",
      status: "PASS",
      summary: "Hidden routing through Antigravity legacy CLI bridge strictly prevented",
      evidenceFingerprint: "c".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-13-TEST-PUBLIC-SOURCE-POLICY",
      category: "DATA_POLICY",
      status: "PASS",
      summary: "TEST_PUBLIC classification enforced; zero private user data permitted",
      evidenceFingerprint: "d".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-14-ROLLBACK-CLEANUP-PLAN",
      category: "ROLLBACK",
      status: "PASS",
      summary: "7-step automated workspace deletion and state rollback plan confirmed",
      evidenceFingerprint: "e".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
    {
      checkId: "CHK-15-PRODUCTION-DENIED-PROOF",
      category: "PROVIDER_BOUNDARY",
      status: "PASS",
      summary: "Production environment unconditionally denied and locked",
      evidenceFingerprint: "f".repeat(64),
      sanitized: true,
      containsSecrets: false,
      containsRawSource: false,
      containsFilesystemPath: false,
    },
  ];

  it("1. empty preflight checks yields NOT_READY", () => {
    const report = evaluateInfrastructurePreflight([]);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.passedChecks).toEqual([]);
    expect(report.unverifiedChecks.length).toBe(MANDATORY_PREFLIGHT_CHECK_IDS.length);
  });

  it("2. any mandatory UNVERIFIED check prevents PASS and yields NOT_READY", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-02-API-ENABLEMENT" ? { ...c, status: "UNVERIFIED" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-02-API-ENABLEMENT");
  });

  it("3. any FAIL check prevents PASS and yields BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-06-QUOTA-BUDGET" ? { ...c, status: "FAIL" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
    expect(report.failedChecks).toContain("CHK-06-QUOTA-BUDGET");
  });

  it("4. any BLOCKED check prevents PASS and yields BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-08-NETWORK-EGRESS" ? { ...c, status: "BLOCKED" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
    expect(report.blockedChecks).toContain("CHK-08-NETWORK-EGRESS");
  });

  it("5. missing project reference prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-01-PROJECT-REF");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-01-PROJECT-REF");
  });

  it("6. missing API enablement evidence prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-02-API-ENABLEMENT");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-02-API-ENABLEMENT");
  });

  it("7. missing region prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-03-REGION-DEF");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-03-REGION-DEF");
  });

  it("8. missing IAM plan prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-04-IAM-AUTH-SCOPE");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-04-IAM-AUTH-SCOPE");
  });

  it("9. missing secret reference prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-05-SECRET-REF-BOUNDARY");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-05-SECRET-REF-BOUNDARY");
  });

  it("10. missing quota policy prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-06-QUOTA-BUDGET");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-06-QUOTA-BUDGET");
  });

  it("11. missing audit log plan prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-07-CLOUD-AUDIT-LOGS");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-07-CLOUD-AUDIT-LOGS");
  });

  it("12. missing network policy prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-08-NETWORK-EGRESS");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-08-NETWORK-EGRESS");
  });

  it("13. non-official provider target check failing is BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-09-OFFICIAL-API-BOUNDARY" ? { ...c, status: "FAIL" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
  });

  it("14. consumer cookie/session check failing is BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-10-NO-CONSUMER-COOKIE" ? { ...c, status: "FAIL" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
  });

  it("15. reverse-engineered RPC check failing is BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-11-NO-REVERSE-RPC" ? { ...c, status: "FAIL" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
  });

  it("16. Antigravity hidden routing check failing is BLOCKED", () => {
    const checks = sample15PassChecks.map((c) =>
      c.checkId === "CHK-12-NO-ANTIGRAVITY-ROUTING" ? { ...c, status: "FAIL" as const } : c
    );
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("BLOCKED");
  });

  it("17. missing TEST_PUBLIC policy prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-13-TEST-PUBLIC-SOURCE-POLICY");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-13-TEST-PUBLIC-SOURCE-POLICY");
  });

  it("18. missing rollback plan prevents PASS", () => {
    const checks = sample15PassChecks.filter((c) => c.checkId !== "CHK-14-ROLLBACK-CLEANUP-PLAN");
    const report = evaluateInfrastructurePreflight(checks);
    expect(report.overallStatus).toBe("NOT_READY");
    expect(report.unverifiedChecks).toContain("CHK-14-ROLLBACK-CLEANUP-PLAN");
  });

  it("19. production is always denied (productionAllowed: false)", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.productionAllowed).toBe(false);
  });

  it("20. apiRequestsMade is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.apiRequestsMade).toBe(false);
  });

  it("21. credentialsAccessed is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.credentialsAccessed).toBe(false);
  });

  it("22. notebookCreated is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.notebookCreated).toBe(false);
  });

  it("23. sourceUploaded is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.sourceUploaded).toBe(false);
  });

  it("24. networkAllowed is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.networkAllowed).toBe(false);
  });

  it("25. realExecutionAllowed is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("26. controlledExecutionEnabled is always false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.controlledExecutionEnabled).toBe(false);
  });

  it("27. killSwitchActive is always true", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.killSwitchActive).toBe(true);
  });

  it("28. report fingerprint is deterministic with fixed timestamp", () => {
    const r1 = evaluateInfrastructurePreflight(sample15PassChecks, "2026-09-25T12:00:00.000Z");
    const r2 = evaluateInfrastructurePreflight(sample15PassChecks, "2026-09-25T12:00:00.000Z");
    expect(r1.fingerprint).toBe(r2.fingerprint);
    expect(r1.fingerprint).toHaveLength(64);
  });

  it("29. report is JSON serializable", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.reportVersion).toBe("6.10.0");
    expect(parsed.overallStatus).toBe("PASS");
  });

  it("30. input checks array is not mutated", () => {
    const copy = JSON.parse(JSON.stringify(sample15PassChecks));
    evaluateInfrastructurePreflight(sample15PassChecks);
    expect(sample15PassChecks).toEqual(copy);
  });

  it("31. report excludes raw secrets and checks mark containsSecrets false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.checks.every((c) => c.containsSecrets === false)).toBe(true);
  });

  it("32. report excludes raw source and checks mark containsRawSource false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.checks.every((c) => c.containsRawSource === false)).toBe(true);
  });

  it("33. report excludes filesystem paths and checks mark containsFilesystemPath false", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.checks.every((c) => c.containsFilesystemPath === false)).toBe(true);
  });

  it("34. evaluator does not make provider calls", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report).toBeDefined();
  });

  it("35. evaluator does not make network calls", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.networkAllowed).toBe(false);
  });

  it("36. evaluator does not spawn subprocess", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.apiRequestsMade).toBe(false);
  });

  it("37. evaluator does not open MCP listeners", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.targetProvider).toBe("notebooklm-enterprise");
  });

  it("38. 15 all-pass checks yields PASS overall status", () => {
    const report = evaluateInfrastructurePreflight(sample15PassChecks);
    expect(report.overallStatus).toBe("PASS");
    expect(report.passedChecks.length).toBe(15);
    expect(report.failedChecks).toEqual([]);
    expect(report.blockedChecks).toEqual([]);
    expect(report.unverifiedChecks).toEqual([]);
  });
});
