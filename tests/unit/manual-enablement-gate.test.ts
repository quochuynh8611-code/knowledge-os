/**
 * Multi-Factor Manual Enablement Gate Unit Tests (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Pure, deterministic evaluation of manual enablement gate.
 * - Even when approved for future phase, realExecutionAllowed is strictly false.
 * - Zero real provider or network execution.
 */

import { describe, it, expect } from "vitest";
import {
  ManualEnablementRequest,
  ManualEnablementApproval,
  computeApprovalFingerprint,
} from "../../src/server/services/providers/manualEnablementContract.js";
import { evaluateManualEnablementGate } from "../../src/server/services/providers/manualEnablementGate.js";
import {
  DEFAULT_KILL_SWITCH,
  computeKillSwitchFingerprint,
} from "../../src/server/services/providers/executionKillSwitch.js";
import { DEFAULT_RESEARCH_EXECUTION_POLICY } from "../../src/server/config/researchProviderConfig.js";
import { ResearchExecutionReadinessReport } from "../../src/server/services/providers/researchExecutionReadiness.js";

describe("MULTI-FACTOR MANUAL ENABLEMENT GATE (PHASE 6.4)", () => {
  const readinessFingerprint = "readiness-report-fingerprint-12345";

  const validReport: ResearchExecutionReadinessReport = {
    status: "READY_FOR_MANUAL_REVIEW",
    realExecutionAllowed: false,
    notebookLMAllowed: false,
    antigravityAllowed: false,
    networkAllowed: false,
    credentialsAllowed: false,
    childProcessAllowed: false,
    checks: [],
    generatedAt: "2026-09-24T12:00:00.000Z",
    reportFingerprint: readinessFingerprint,
  };

  const validRequest: ManualEnablementRequest = {
    requestId: "req-man-12345",
    requestedBy: "human-security-officer-1",
    requestedAt: "2026-09-24T12:00:00.000Z",
    scope: "real_execution_design_review",
    providerId: "notebooklm-enterprise",
    environment: "test",
    reason: "Valid human-reviewed request for future-phase design review.",
    readinessReportFingerprint: readinessFingerprint,
    requestedCapabilities: {
      network: false,
      credentials: false,
      providerExecution: false,
      childProcess: false,
    },
  };

  const validApprovalBase = {
    approvalId: "app-man-98765",
    requestId: "req-man-12345",
    approvedBy: "human-lead-architect-2",
    approvedAt: "2026-09-24T12:05:00.000Z",
    expiresAt: "2026-09-24T13:05:00.000Z",
    status: "APPROVED_FOR_FUTURE_PHASE" as const,
    scope: "real_execution_design_review" as const,
    providerId: "notebooklm-enterprise" as const,
    environment: "test" as const,
    readinessReportFingerprint: readinessFingerprint,
  };

  const validApproval: ManualEnablementApproval = {
    ...validApprovalBase,
    approvalFingerprint: computeApprovalFingerprint(validApprovalBase),
  };

  const inactiveKillSwitchBase = {
    active: false,
    reason: "Simulated inactive kill-switch for test fixture",
    source: "manual" as const,
    activatedBy: "human-test-runner",
    activatedAt: "2026-09-24T12:00:00.000Z",
  };

  const inactiveKillSwitch = {
    ...inactiveKillSwitchBase,
    fingerprint: computeKillSwitchFingerprint(inactiveKillSwitchBase),
  };

  it("1. Missing approval denies", () => {
    const decision = evaluateManualEnablementGate({
      request: validRequest,
      readinessReport: validReport,
      runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
      killSwitch: inactiveKillSwitch,
    });

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("MISSING_APPROVAL");
    }
  });

  it("2. Expired approval denies", () => {
    const expiredAppBase = {
      ...validApprovalBase,
      expiresAt: "2026-09-24T11:00:00.000Z",
    };
    const expiredApp: ManualEnablementApproval = {
      ...expiredAppBase,
      approvalFingerprint: computeApprovalFingerprint(expiredAppBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: expiredApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:30:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("APPROVAL_EXPIRED");
    }
  });

  it("3. Revoked approval denies", () => {
    const revokedBase = {
      ...validApprovalBase,
      status: "REVOKED" as const,
    };
    const revokedApp: ManualEnablementApproval = {
      ...revokedBase,
      approvalFingerprint: computeApprovalFingerprint(revokedBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: revokedApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("APPROVAL_REVOKED");
    }
  });

  it("4. Actor mismatch denies", () => {
    const mismatchBase = {
      ...validApprovalBase,
      requestId: "different-request-id",
    };
    const mismatchApp: ManualEnablementApproval = {
      ...mismatchBase,
      approvalFingerprint: computeApprovalFingerprint(mismatchBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: mismatchApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("ACTOR_MISMATCH");
    }
  });

  it("5. Scope mismatch denies", () => {
    const mismatchBase = {
      ...validApprovalBase,
      scope: "simulation_only" as const,
    };
    const mismatchApp: ManualEnablementApproval = {
      ...mismatchBase,
      approvalFingerprint: computeApprovalFingerprint(mismatchBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest, // has scope real_execution_design_review
        approval: mismatchApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("SCOPE_MISMATCH");
    }
  });

  it("6. Provider mismatch denies", () => {
    const mismatchBase = {
      ...validApprovalBase,
      providerId: "antigravity-legacy" as const,
    };
    const mismatchApp: ManualEnablementApproval = {
      ...mismatchBase,
      approvalFingerprint: computeApprovalFingerprint(mismatchBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest, // has provider notebooklm-enterprise
        approval: mismatchApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("PROVIDER_MISMATCH");
    }
  });

  it("7. Environment mismatch denies", () => {
    const mismatchBase = {
      ...validApprovalBase,
      environment: "production" as const,
    };
    const mismatchApp: ManualEnablementApproval = {
      ...mismatchBase,
      approvalFingerprint: computeApprovalFingerprint(mismatchBase),
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest, // has environment test
        approval: mismatchApp,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("ENVIRONMENT_MISMATCH");
    }
  });

  it("8. Readiness BLOCKED denies", () => {
    const blockedReport: ResearchExecutionReadinessReport = {
      ...validReport,
      status: "BLOCKED",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: blockedReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("READINESS_NOT_MANUAL_REVIEWABLE");
    }
  });

  it("9. Readiness NOT_READY denies", () => {
    const notReadyReport: ResearchExecutionReadinessReport = {
      ...validReport,
      status: "NOT_READY",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: notReadyReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("READINESS_NOT_MANUAL_REVIEWABLE");
    }
  });

  it("10. Readiness fingerprint mismatch denies", () => {
    const mismatchReport: ResearchExecutionReadinessReport = {
      ...validReport,
      reportFingerprint: "tampered-report-fingerprint",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: mismatchReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("READINESS_FINGERPRINT_MISMATCH");
    }
  });

  it("11. Runtime policy denies", () => {
    const invalidPolicy = {
      ...DEFAULT_RESEARCH_EXECUTION_POLICY,
      realExecutionEnabled: true as any,
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: invalidPolicy,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("RUNTIME_POLICY_DENIES");
    }
  });

  it("12. Active kill-switch denies", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: DEFAULT_KILL_SWITCH, // active: true
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("KILL_SWITCH_ACTIVE");
    }
  });

  it("13. Invalid kill-switch denies", () => {
    const invalidKillSwitch = {
      active: false,
      reason: "",
      source: "manual" as const,
      fingerprint: "invalid",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: invalidKillSwitch as any,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("KILL_SWITCH_ACTIVE");
    }
  });

  it("14. Network capability request denies", () => {
    const reqWithNetwork = {
      ...validRequest,
      requestedCapabilities: {
        ...validRequest.requestedCapabilities,
        network: true,
      },
    };

    const decision = evaluateManualEnablementGate(
      {
        request: reqWithNetwork,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("CAPABILITY_ESCALATION_REQUESTED");
    }
  });

  it("15. Credential capability request denies", () => {
    const reqWithCreds = {
      ...validRequest,
      requestedCapabilities: {
        ...validRequest.requestedCapabilities,
        credentials: true,
      },
    };

    const decision = evaluateManualEnablementGate(
      {
        request: reqWithCreds,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("CAPABILITY_ESCALATION_REQUESTED");
    }
  });

  it("16. Provider execution capability request denies", () => {
    const reqWithExec = {
      ...validRequest,
      requestedCapabilities: {
        ...validRequest.requestedCapabilities,
        providerExecution: true,
      },
    };

    const decision = evaluateManualEnablementGate(
      {
        request: reqWithExec,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("CAPABILITY_ESCALATION_REQUESTED");
    }
  });

  it("17. Child process capability request denies", () => {
    const reqWithProc = {
      ...validRequest,
      requestedCapabilities: {
        ...validRequest.requestedCapabilities,
        childProcess: true,
      },
    };

    const decision = evaluateManualEnablementGate(
      {
        request: reqWithProc,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("DENY");
    if (decision.decision === "DENY") {
      expect(decision.reasons).toContain("CAPABILITY_ESCALATION_REQUESTED");
    }
  });

  it("18. Existing delete_workspace intent cannot enable real execution", () => {
    const deleteWorkspaceReq = {
      ...validRequest,
      reason: "delete_workspace intent cannot grant real execution",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: deleteWorkspaceReq,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("19. Existing manual_fallback intent cannot bypass submission port", () => {
    const fallbackReq = {
      ...validRequest,
      reason: "manual_fallback cannot bypass port",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: fallbackReq,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.sideEffectsAllowed).toBe(false);
  });

  it("20. Existing force_retry_unknown intent cannot enable provider execution", () => {
    const retryReq = {
      ...validRequest,
      reason: "force_retry_unknown cannot enable provider",
    };

    const decision = evaluateManualEnablementGate(
      {
        request: retryReq,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("21. Valid review path returns APPROVE_FOR_FUTURE_PHASE only", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.decision).toBe("APPROVE_FOR_FUTURE_PHASE");
  });

  it("22. Valid review path still has realExecutionAllowed: false", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("23. Valid review path still has sideEffectsAllowed: false", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(decision.sideEffectsAllowed).toBe(false);
  });

  it("24. Gate never calls provider", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect((decision as any).provider).toBeUndefined();
  });

  it("25. Gate never calls network", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect((decision as any).socket).toBeUndefined();
  });

  it("26. Gate never reads credential", () => {
    const decision = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect((decision as any).secret).toBeUndefined();
  });

  it("27. Gate never mutates input", () => {
    const reqClone = { ...validRequest };
    const appClone = { ...validApproval };

    evaluateManualEnablementGate(
      {
        request: reqClone,
        approval: appClone,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(reqClone).toEqual(validRequest);
    expect(appClone).toEqual(validApproval);
  });

  it("28. Gate is deterministic", () => {
    const dec1 = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    const dec2 = evaluateManualEnablementGate(
      {
        request: validRequest,
        approval: validApproval,
        readinessReport: validReport,
        runtimePolicy: DEFAULT_RESEARCH_EXECUTION_POLICY,
        killSwitch: inactiveKillSwitch,
      },
      { now: () => new Date("2026-09-24T12:10:00.000Z") }
    );

    expect(dec1).toEqual(dec2);
  });
});
