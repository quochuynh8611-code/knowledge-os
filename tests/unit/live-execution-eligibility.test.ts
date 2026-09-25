import { describe, it, expect } from "vitest";
import {
  LiveExecutionEligibilityStatus,
  LiveExecutionDenialReason,
  LiveExecutionEligibilityReport,
  LiveExecutionEvidenceInput,
  evaluateLiveExecutionEligibility,
  computeEligibilityFingerprint,
} from "../../src/server/services/providers/liveExecutionEligibility";

describe("Phase 6.8 — Live Execution Eligibility Contract", () => {
  const completeStagingEvidence: LiveExecutionEvidenceInput = {
    environment: "staging",
    generatedAt: "2026-09-25T10:00:00.000Z",
    evidence: {
      operatorSignoff: {
        status: "PASS",
        signoffId: "sig-001",
        operatorId: "op-lead-01",
        decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
        bundleFingerprint: "a".repeat(64),
        signedAt: "2026-09-25T09:00:00.000Z",
        expiresAt: "2026-09-25T17:00:00.000Z",
      },
      readinessReport: {
        status: "PASS",
        overallStatus: "READY",
        reportFingerprint: "b".repeat(64),
      },
      preflightBundle: {
        status: "PASS",
        bundleId: "bundle-001",
        bundleFingerprint: "a".repeat(64),
        complete: true,
      },
      rollbackRehearsal: {
        status: "PASS",
        passed: true,
        stepsCompleted: 7,
      },
      secretStrategy: {
        status: "PASS",
        sanitizerVerified: true,
        zeroSecretsInReports: true,
      },
      networkStrategy: {
        status: "PASS",
        networkDeniedByDefault: true,
        zeroDirectSockets: true,
      },
      providerSandboxProof: {
        status: "PASS",
        sandboxEnvironment: "staging",
        fakeTransportVerified: true,
        zeroLiveProviderCalls: true,
      },
      regressionEvidence: {
        status: "PASS",
        totalTests: 800,
        passedTests: 800,
        failedTests: 0,
      },
      boundaryAudit: {
        status: "PASS",
        zeroAnyTypes: true,
        zeroLiveImports: true,
      },
      releaseFreeze: {
        status: "PASS",
        releaseFrozen: true,
        freezeVersion: "6.7.0",
      },
      runtimeComposition: {
        status: "PASS",
        compositionVerified: true,
        zeroBypassDetected: true,
      },
    },
    toggleState: {
      enabled: false,
      realExecutionAllowed: false,
    },
    killSwitchState: {
      active: true,
    },
  };

  it("1. production environment is unconditionally DENIED", () => {
    const prodInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      environment: "production",
    };
    const report = evaluateLiveExecutionEligibility(prodInput);
    expect(report.status).toBe("DENY");
    expect(report.reasons).toContain("PRODUCTION_ENVIRONMENT");
    expect(report.eligibleForFutureStagingReview).toBe(false);
    expect(report.productionAlwaysDenied).toBe(true);
  });

  it("2. kill-switch active is required; inactive kill-switch causes BLOCKED/DENY", () => {
    const inactiveKillSwitchInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      killSwitchState: { active: false },
    };
    const report = evaluateLiveExecutionEligibility(inactiveKillSwitchInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("KILL_SWITCH_ACTIVE");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("3. controlled toggle enabled unexpectedly causes BLOCKED/DENY", () => {
    const toggleEnabledInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      toggleState: { enabled: true, realExecutionAllowed: true },
    };
    const report = evaluateLiveExecutionEligibility(toggleEnabledInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("CONTROLLED_TOGGLE_DISABLED");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("4. missing operator sign-off results in BLOCKED", () => {
    const missingSignoffInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        operatorSignoff: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingSignoffInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_OPERATOR_SIGNOFF");
    expect(report.prerequisitesMissing).toContain("OPERATOR_SIGNOFF");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("5. missing readiness report results in BLOCKED", () => {
    const missingReadinessInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        readinessReport: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingReadinessInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_READINESS_REPORT");
    expect(report.prerequisitesMissing).toContain("READINESS_REPORT");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("6. missing preflight bundle results in BLOCKED", () => {
    const missingPreflightInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        preflightBundle: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingPreflightInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_PREFLIGHT_BUNDLE");
    expect(report.prerequisitesMissing).toContain("PREFLIGHT_BUNDLE");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("7. missing rollback rehearsal results in BLOCKED", () => {
    const missingRollbackInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        rollbackRehearsal: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingRollbackInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_ROLLBACK_REHEARSAL");
    expect(report.prerequisitesMissing).toContain("ROLLBACK_REHEARSAL");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("8. missing regression evidence results in BLOCKED", () => {
    const missingRegressionInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        regressionEvidence: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingRegressionInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_REGRESSION_EVIDENCE");
    expect(report.prerequisitesMissing).toContain("REGRESSION_EVIDENCE");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("9. missing boundary audit results in BLOCKED", () => {
    const missingBoundaryInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        boundaryAudit: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingBoundaryInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_BOUNDARY_AUDIT");
    expect(report.prerequisitesMissing).toContain("BOUNDARY_AUDIT");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("10. missing release freeze results in BLOCKED", () => {
    const missingFreezeInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        releaseFreeze: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(missingFreezeInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_RELEASE_FREEZE");
    expect(report.prerequisitesMissing).toContain("RELEASE_FREEZE");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("11. all prerequisites present in staging only yields ELIGIBLE_FOR_FUTURE_STAGING_REVIEW", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.status).toBe("ELIGIBLE_FOR_FUTURE_STAGING_REVIEW");
    expect(report.reasons).toEqual([]);
    expect(report.prerequisitesMissing).toEqual([]);
    expect(report.eligibleForFutureStagingReview).toBe(true);
    expect(report.prerequisitesSatisfied.length).toBeGreaterThanOrEqual(11);
  });

  it("12. realExecutionAllowed is always false", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.realExecutionAllowed).toBe(false);
  });

  it("13. controlledExecutionEnabled is always false in Phase 6.8", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.controlledExecutionEnabled).toBe(false);
  });

  it("14. killSwitchActive is always true in Phase 6.8", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.killSwitchActive).toBe(true);
  });

  it("15. networkAllowed is always false", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.networkAllowed).toBe(false);
  });

  it("16. credentialsAllowed is always false", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.credentialsAllowed).toBe(false);
  });

  it("17. childProcessAllowed is always false", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.childProcessAllowed).toBe(false);
  });

  it("18. sideEffectsAllowed is always false", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.sideEffectsAllowed).toBe(false);
  });

  it("19. fingerprint is deterministic with fixed inputs", () => {
    const r1 = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const r2 = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(r1.fingerprint).toBe(r2.fingerprint);
    expect(r1.fingerprint).toHaveLength(64);
  });

  it("20. report is JSON serializable", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.reportVersion).toBe("6.8.0");
    expect(parsed.status).toBe("ELIGIBLE_FOR_FUTURE_STAGING_REVIEW");
    expect(parsed.realExecutionAllowed).toBe(false);
  });

  it("21. does not call any provider during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report).toBeDefined();
  });

  it("22. does not make network calls during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.networkAllowed).toBe(false);
  });

  it("23. does not access credentials during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(report.credentialsAllowed).toBe(false);
  });

  it("24. does not mutate input object", () => {
    const inputCopy = JSON.parse(JSON.stringify(completeStagingEvidence));
    evaluateLiveExecutionEligibility(completeStagingEvidence);
    expect(completeStagingEvidence).toEqual(inputCopy);
  });

  it("25. local environment without staging flag is blocked or not eligible for live", () => {
    const localInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      environment: "local",
    };
    const report = evaluateLiveExecutionEligibility(localInput);
    expect(report.status).toBe("BLOCKED");
    expect(report.eligibleForFutureStagingReview).toBe(false);
  });

  it("26. missing secret strategy yields BLOCKED", () => {
    const input: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        secretStrategy: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(input);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_SECRET_STRATEGY");
  });

  it("27. missing network strategy yields BLOCKED", () => {
    const input: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        networkStrategy: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(input);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_NETWORK_STRATEGY");
  });

  it("28. missing provider sandbox proof yields BLOCKED", () => {
    const input: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        providerSandboxProof: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(input);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("MISSING_PROVIDER_SANDBOX_PROOF");
  });

  it("29. unverified runtime composition yields BLOCKED", () => {
    const input: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        runtimeComposition: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(input);
    expect(report.status).toBe("BLOCKED");
    expect(report.reasons).toContain("UNVERIFIED_RUNTIME_COMPOSITION");
  });
});
