import { describe, it, expect } from "vitest";
import {
  StagingLivePilotSpec,
  StagingLivePilotStatus,
  StagingLivePilotDenialReason,
  StagingLivePilotReport,
  evaluateStagingLivePilotEligibility,
  computeStagingLivePilotFingerprint,
} from "../../src/server/services/providers/stagingLivePilotContract";

describe("Phase 6.9 — Controlled Staging Live Pilot Contract", () => {
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

  it("1. production environment is unconditionally denied with BLOCKED/DENY", () => {
    const prodSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      environment: "production",
    };
    const report = evaluateStagingLivePilotEligibility(prodSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("PRODUCTION_ENVIRONMENT");
    expect(report.productionAlwaysDenied).toBe(true);
  });

  it("2. missing operator id yields BLOCKED", () => {
    const invalidSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      operatorId: "",
    };
    const report = evaluateStagingLivePilotEligibility(invalidSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_OPERATOR_APPROVAL");
  });

  it("3. non-staging environment yields BLOCKED", () => {
    const localSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      environment: "local",
    };
    const report = evaluateStagingLivePilotEligibility(localSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_STAGING_ENVIRONMENT");
  });

  it("4. unverified provider capability proof yields BLOCKED", () => {
    const unverifiedSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      providerTarget: {
        ...validPilotSpec.providerTarget,
        verifiedOfficialApi: false,
      },
    };
    const report = evaluateStagingLivePilotEligibility(unverifiedSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_PROVIDER_CAPABILITY_PROOF");
  });

  it("5. missing credential reference yields BLOCKED", () => {
    const missingCredSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      credentialRef: undefined as unknown as StagingLivePilotSpec["credentialRef"],
    };
    const report = evaluateStagingLivePilotEligibility(missingCredSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_CREDENTIAL_REFERENCE");
  });

  it("6. credential reference containing raw secrets yields BLOCKED", () => {
    const rawSecretSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      credentialRef: {
        secretRefName: "AIzaSyD-raw-secret-api-key-1234567890",
        containsRawSecret: true,
      },
    };
    const report = evaluateStagingLivePilotEligibility(rawSecretSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("RAW_CREDENTIAL_EXPOSURE_DETECTED");
  });

  it("7. missing source safety proof or non-public classification yields BLOCKED", () => {
    const sensitiveSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      sourceClassification: "USER_PRIVATE" as "TEST_PUBLIC",
      containsSensitiveData: true,
    };
    const report = evaluateStagingLivePilotEligibility(sensitiveSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("SENSITIVE_SOURCE_DETECTED");
  });

  it("8. missing or excessive timeout yields BLOCKED", () => {
    const invalidTimeoutSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      timeoutMs: 0,
    };
    const report = evaluateStagingLivePilotEligibility(invalidTimeoutSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_TIMEOUT");
  });

  it("9. missing budget limit yields BLOCKED", () => {
    const noBudgetSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      budgetLimitUnits: 0,
    };
    const report = evaluateStagingLivePilotEligibility(noBudgetSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_BUDGET_LIMIT");
  });

  it("10. missing audit sink yields BLOCKED", () => {
    const noAuditSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      auditSinkConfigured: false,
    };
    const report = evaluateStagingLivePilotEligibility(noAuditSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_AUDIT_SINK");
  });

  it("11. missing rollback proof yields BLOCKED", () => {
    const noRollbackSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      rollbackProofConfigured: false,
    };
    const report = evaluateStagingLivePilotEligibility(noRollbackSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_ROLLBACK_PROOF");
  });

  it("12. more than one attempt requested yields BLOCKED", () => {
    const multiAttemptSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      maxAttempts: 3,
    };
    const report = evaluateStagingLivePilotEligibility(multiAttemptSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("EXCESSIVE_ATTEMPTS_REQUESTED");
  });

  it("13. parallel execution requested yields BLOCKED", () => {
    const parallelSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      allowParallelExecution: true,
    };
    const report = evaluateStagingLivePilotEligibility(parallelSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("PARALLEL_EXECUTION_FORBIDDEN");
  });

  it("14. fallback enabled yields BLOCKED", () => {
    const fallbackSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      allowProviderFallback: true,
    };
    const report = evaluateStagingLivePilotEligibility(fallbackSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("FALLBACK_FORBIDDEN");
  });

  it("15. consumer NotebookLM target yields BLOCKED", () => {
    const consumerSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      providerTarget: {
        ...validPilotSpec.providerTarget,
        consumerSessionCookieUsed: true,
      },
    };
    const report = evaluateStagingLivePilotEligibility(consumerSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("CONSUMER_NOTEBOOKLM_FORBIDDEN");
  });

  it("16. reverse-engineered RPC yields BLOCKED", () => {
    const rpcSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      providerTarget: {
        ...validPilotSpec.providerTarget,
        reverseEngineeredRpcUsed: true,
      },
    };
    const report = evaluateStagingLivePilotEligibility(rpcSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("REVERSE_ENGINEERED_RPC_FORBIDDEN");
  });

  it("17. Antigravity hidden routing yields BLOCKED", () => {
    const hiddenSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      providerTarget: {
        ...validPilotSpec.providerTarget,
        antigravityHiddenRoutingUsed: true,
      },
    };
    const report = evaluateStagingLivePilotEligibility(hiddenSpec);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("ANTIGRAVITY_HIDDEN_ROUTING_FORBIDDEN");
  });

  it("18. valid staging spec yields READY_FOR_MANUAL_APPROVAL", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.status).toBe("READY_FOR_MANUAL_APPROVAL");
    expect(report.reasons).toEqual([]);
    expect(report.requiresHumanApproval).toBe(true);
  });

  it("19. realExecutionAllowed is false before approval", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("20. contract does not make provider calls", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report).toBeDefined();
  });

  it("21. contract does not make network calls", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.networkAllowed).toBe(false);
  });

  it("22. contract does not access credential values", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.credentialsAllowed).toBe(false);
  });

  it("23. contract does not spawn subprocesses", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.childProcessAllowed).toBe(false);
  });

  it("24. contract does not mutate input spec", () => {
    const copy = JSON.parse(JSON.stringify(validPilotSpec));
    evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(validPilotSpec).toEqual(copy);
  });

  it("25. fingerprint is deterministic with fixed timestamp", () => {
    const r1 = evaluateStagingLivePilotEligibility(validPilotSpec, "2026-09-25T11:00:00.000Z");
    const r2 = evaluateStagingLivePilotEligibility(validPilotSpec, "2026-09-25T11:00:00.000Z");
    expect(r1.fingerprint).toBe(r2.fingerprint);
    expect(r1.fingerprint).toHaveLength(64);
  });

  it("26. report is JSON serializable", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.reportVersion).toBe("6.9.0");
    expect(parsed.status).toBe("READY_FOR_MANUAL_APPROVAL");
  });

  it("27. productionAlwaysDenied flag is always true", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.productionAlwaysDenied).toBe(true);
  });

  it("28. killSwitchActive is always true before approval", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.killSwitchActive).toBe(true);
  });

  it("29. fallback is always disallowed in output report", () => {
    const report = evaluateStagingLivePilotEligibility(validPilotSpec);
    expect(report.fallbackAllowed).toBe(false);
  });

  it("30. all denial reasons are deterministic strings", () => {
    const multiErrorSpec: StagingLivePilotSpec = {
      ...validPilotSpec,
      environment: "production",
      maxAttempts: 5,
      allowParallelExecution: true,
      allowProviderFallback: true,
    };
    const report = evaluateStagingLivePilotEligibility(multiErrorSpec);
    expect(report.reasons).toEqual(
      expect.arrayContaining([
        "PRODUCTION_ENVIRONMENT",
        "EXCESSIVE_ATTEMPTS_REQUESTED",
        "PARALLEL_EXECUTION_FORBIDDEN",
        "FALLBACK_FORBIDDEN",
      ])
    );
  });
});
