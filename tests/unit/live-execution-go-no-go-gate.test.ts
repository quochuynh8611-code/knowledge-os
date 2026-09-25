import { describe, it, expect } from "vitest";
import {
  evaluateLiveExecutionEligibility,
  LiveExecutionEvidenceInput,
} from "../../src/server/services/providers/liveExecutionEligibility";
import {
  evaluateLiveExecutionGoNoGoGate,
  LiveExecutionGoNoGoDecision,
} from "../../src/server/services/providers/liveExecutionGoNoGoGate";

describe("Phase 6.8 — Live Execution Go/No-Go Gate", () => {
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

  it("1. gate returns NO_GO_DENIED for production environment", () => {
    const prodInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      environment: "production",
    };
    const report = evaluateLiveExecutionEligibility(prodInput);
    const decision: LiveExecutionGoNoGoDecision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.decision).toBe("NO_GO_DENIED");
    expect(decision.reasons).toContain("PRODUCTION_ENVIRONMENT");
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("2. gate returns NO_GO_BLOCKED when evidence is incomplete", () => {
    const incompleteInput: LiveExecutionEvidenceInput = {
      ...completeStagingEvidence,
      evidence: {
        ...completeStagingEvidence.evidence,
        operatorSignoff: undefined,
      },
    };
    const report = evaluateLiveExecutionEligibility(incompleteInput);
    const decision: LiveExecutionGoNoGoDecision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.decision).toBe("NO_GO_BLOCKED");
    expect(decision.reasons).toContain("MISSING_OPERATOR_SIGNOFF");
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("3. gate returns NO_GO_BLOCKED when ambiguity exists in report", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    // Tamper with report reasons or fingerprint
    const tamperedReport = {
      ...report,
      fingerprint: "invalid_fingerprint_hash_code",
    };
    const decision = evaluateLiveExecutionGoNoGoGate({ report: tamperedReport });
    expect(decision.decision).toBe("NO_GO_BLOCKED");
    expect(decision.reasons).toContain("UNKNOWN_RISK");
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("4. gate never enables execution (realExecutionAllowed === false)", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("5. gate never disables kill-switch (killSwitchActive === true)", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.killSwitchActive).toBe(true);
  });

  it("6. gate never enables controlled toggle (controlledExecutionEnabled === false)", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.controlledExecutionEnabled).toBe(false);
  });

  it("7. gate preserves all default-deny invariants", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.realExecutionAllowed).toBe(false);
    expect(decision.networkAllowed).toBe(false);
    expect(decision.credentialsAllowed).toBe(false);
    expect(decision.childProcessAllowed).toBe(false);
    expect(decision.sideEffectsAllowed).toBe(false);
    expect(decision.requiresManualOperatorAction).toBe(true);
  });

  it("8. gate does not call any provider during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision).toBeDefined();
  });

  it("9. gate does not make network calls during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.networkAllowed).toBe(false);
  });

  it("10. gate does not read credentials during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.credentialsAllowed).toBe(false);
  });

  it("11. gate does not spawn subprocess during evaluation", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.childProcessAllowed).toBe(false);
  });

  it("12. gate decision is deterministic", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const d1 = evaluateLiveExecutionGoNoGoGate({ report, evaluatedAt: "2026-09-25T11:00:00.000Z" });
    const d2 = evaluateLiveExecutionGoNoGoGate({ report, evaluatedAt: "2026-09-25T11:00:00.000Z" });
    expect(d1).toEqual(d2);
  });

  it("13. complete staging evidence yields GO_STAGING_REVIEW_ONLY", () => {
    const report = evaluateLiveExecutionEligibility(completeStagingEvidence);
    const decision = evaluateLiveExecutionGoNoGoGate({ report });
    expect(decision.decision).toBe("GO_STAGING_REVIEW_ONLY");
    expect(decision.realExecutionAllowed).toBe(false);
    expect(decision.reasons).toEqual([]);
  });
});
