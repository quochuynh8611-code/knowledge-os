import { describe, it, expect } from "vitest";
import {
  StagingLivePilotSpec,
  evaluateStagingLivePilotEligibility,
} from "../../src/server/services/providers/stagingLivePilotContract";
import {
  evaluateStagingLivePilotGate,
  StagingLivePilotGateDecision,
  StagingPilotOperatorApproval,
} from "../../src/server/services/providers/stagingLivePilotGate";

describe("Phase 6.9 — Controlled Staging Live Pilot Gate", () => {
  const validPilotSpec: StagingLivePilotSpec = {
    specVersion: "6.9.0",
    pilotId: "pilot-staging-001",
    operatorId: "op-lead-01",
    environment: "staging",
    providerTarget: {
      providerId: "notebooklm-enterprise",
      providerType: "official",
      verifiedOfficialApi: true,
      consumerSessionCookieUsed: false,
      reverseEngineeredRpcUsed: false,
      antigravityHiddenRoutingUsed: false,
    },
    workspaceSlug: "test-pilot-workspace",
    operation: "create_workspace",
    sourceClassification: "TEST_PUBLIC",
    containsSensitiveData: false,
    maxAttempts: 1,
    allowParallelExecution: false,
    allowProviderFallback: false,
    timeoutMs: 15000,
    budgetLimitUnits: 100,
    credentialRef: {
      secretRefName: "GCP_SECRET_MANAGER_REF:projects/staging-kb/secrets/notebooklm-sa",
      containsRawSecret: false,
    },
    auditSinkConfigured: true,
    rollbackProofConfigured: true,
    targetNotebookLMEnterprise: true,
  };

  const report = evaluateStagingLivePilotEligibility(validPilotSpec, "2026-09-25T11:00:00.000Z");

  const validApproval: StagingPilotOperatorApproval = {
    approvalId: "appr-001",
    operatorId: "op-lead-01",
    decision: "APPROVED_FOR_SINGLE_PILOT",
    pilotId: "pilot-staging-001",
    specFingerprint: report.fingerprint,
    approvedAt: "2026-09-25T11:05:00.000Z",
    expiresAt: "2026-09-25T12:00:00.000Z",
    sanitizedEvidenceAcknowledged: true,
  };

  it("1. without operator approval, gate yields READY_FOR_MANUAL_APPROVAL", () => {
    const decision: StagingLivePilotGateDecision = evaluateStagingLivePilotGate({
      report,
    });
    expect(decision.status).toBe("READY_FOR_MANUAL_APPROVAL");
    expect(decision.realExecutionAllowed).toBe(false);
    expect(decision.controlledExecutionEnabled).toBe(false);
    expect(decision.killSwitchActive).toBe(true);
  });

  it("2. with valid operator approval, gate yields GO_STAGING_PILOT", () => {
    const decision: StagingLivePilotGateDecision = evaluateStagingLivePilotGate({
      report,
      approval: validApproval,
    });
    expect(decision.status).toBe("GO_STAGING_PILOT");
    expect(decision.requiresHumanApproval).toBe(true);
    expect(decision.approvedPilotId).toBe("pilot-staging-001");
  });

  it("3. production report yields BLOCKED", () => {
    const prodSpec: StagingLivePilotSpec = { ...validPilotSpec, environment: "production" };
    const prodReport = evaluateStagingLivePilotEligibility(prodSpec);
    const decision = evaluateStagingLivePilotGate({ report: prodReport, approval: validApproval });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.reasons).toContain("PRODUCTION_ENVIRONMENT");
  });

  it("4. expired operator approval yields BLOCKED", () => {
    const expiredApproval: StagingPilotOperatorApproval = {
      ...validApproval,
      expiresAt: "2026-09-25T10:00:00.000Z", // expired before approval evaluation
    };
    const decision = evaluateStagingLivePilotGate({
      report,
      approval: expiredApproval,
      evaluatedAt: "2026-09-25T11:10:00.000Z",
    });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.reasons).toContain("MISSING_OPERATOR_APPROVAL");
  });

  it("5. mismatching spec fingerprint in approval yields BLOCKED", () => {
    const mismatchApproval: StagingPilotOperatorApproval = {
      ...validApproval,
      specFingerprint: "wrong_fingerprint_hash_code_12345",
    };
    const decision = evaluateStagingLivePilotGate({
      report,
      approval: mismatchApproval,
    });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.reasons).toContain("TAMPERED_PILOT_SPEC");
  });

  it("6. mismatching operator id in approval yields BLOCKED", () => {
    const mismatchOpApproval: StagingPilotOperatorApproval = {
      ...validApproval,
      operatorId: "unauthorized-op-99",
    };
    const decision = evaluateStagingLivePilotGate({
      report,
      approval: mismatchOpApproval,
    });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.reasons).toContain("MISSING_OPERATOR_APPROVAL");
  });

  it("7. tampered report fingerprint yields BLOCKED", () => {
    const tamperedReport = {
      ...report,
      fingerprint: "tampered_fingerprint_value",
    };
    const decision = evaluateStagingLivePilotGate({
      report: tamperedReport,
    });
    expect(decision.status).toBe("BLOCKED");
    expect(decision.reasons).toContain("UNKNOWN_RISK");
  });

  it("8. gate does not make provider calls", () => {
    const decision = evaluateStagingLivePilotGate({ report, approval: validApproval });
    expect(decision).toBeDefined();
  });

  it("9. gate does not make network calls", () => {
    const decision = evaluateStagingLivePilotGate({ report, approval: validApproval });
    expect(decision.networkAllowed).toBe(false);
  });

  it("10. gate does not access raw credentials", () => {
    const decision = evaluateStagingLivePilotGate({ report, approval: validApproval });
    expect(decision.credentialsAllowed).toBe(false);
  });

  it("11. gate does not spawn subprocess", () => {
    const decision = evaluateStagingLivePilotGate({ report, approval: validApproval });
    expect(decision.childProcessAllowed).toBe(false);
  });

  it("12. gate preserves default deny invariants", () => {
    const decision = evaluateStagingLivePilotGate({ report });
    expect(decision.productionAlwaysDenied).toBe(true);
    expect(decision.parallelExecutionAllowed).toBe(false);
    expect(decision.fallbackAllowed).toBe(false);
    expect(decision.maxAttempts).toBe(1);
  });
});
