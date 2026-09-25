/**
 * Controlled Execution Toggle Unit Tests (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - 'enabled' is always strictly literal false in Phase 6.4.
 * - Requested flags, single env vars, or approvals cannot force enabled: true.
 * - Zero real provider or network execution.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateControlledExecutionToggle,
  createControlledRollbackPolicy,
} from "../../src/server/services/providers/controlledExecutionToggle.js";
import {
  computeKillSwitchFingerprint,
  DEFAULT_KILL_SWITCH,
} from "../../src/server/services/providers/executionKillSwitch.js";
import {
  ManualEnablementApproval,
  computeApprovalFingerprint,
} from "../../src/server/services/providers/manualEnablementContract.js";
import {
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
  DEFAULT_RESEARCH_EXECUTION_POLICY,
} from "../../src/server/config/researchProviderConfig.js";

describe("CONTROLLED EXECUTION TOGGLE (PHASE 6.4)", () => {
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
    readinessReportFingerprint: "fingerprint-abc-123",
  };

  const validApproval: ManualEnablementApproval = {
    ...validApprovalBase,
    approvalFingerprint: computeApprovalFingerprint(validApprovalBase),
  };

  it("1. Default toggle is disabled", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect(toggle.enabled).toBe(false);
    expect(toggle.source).toBe("kill_switch");
  });

  it("2. requested: true does not imply enabled: true", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.requested).toBe(true);
    expect(toggle.enabled).toBe(false);
  });

  it("3. Environment flag alone cannot enable", () => {
    process.env.RESEARCH_ALLOW_NOTEBOOKLM = "true";
    process.env.ENABLE_PROVIDER_ROUTING = "true";

    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
  });

  it("4. NotebookLM flag alone cannot enable", () => {
    process.env.RESEARCH_ALLOW_NOTEBOOKLM = "true";
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
  });

  it("5. Provider routing flag alone cannot enable", () => {
    process.env.ENABLE_PROVIDER_ROUTING = "true";
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
  });

  it("6. Manual approval alone cannot enable", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      approval: validApproval,
      killSwitch: inactiveKillSwitch,
      now: () => new Date("2026-09-24T12:10:00.000Z"),
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.source).toBe("manual_approval");
  });

  it("7. Readiness report alone cannot enable", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
  });

  it("8. Production toggle remains disabled", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      environment: "production",
      approval: validApproval,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.reason).toContain("Production environment real execution is strictly disabled");
  });

  it("9. Expired approval disables toggle", () => {
    const expiredAppBase = {
      ...validApprovalBase,
      expiresAt: "2026-09-24T11:00:00.000Z",
    };
    const expiredApp: ManualEnablementApproval = {
      ...expiredAppBase,
      approvalFingerprint: computeApprovalFingerprint(expiredAppBase),
    };

    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      approval: expiredApp,
      killSwitch: inactiveKillSwitch,
      now: () => new Date("2026-09-24T12:10:00.000Z"),
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.reason).toContain("expired");
  });

  it("10. Revoked approval disables toggle", () => {
    const revokedAppBase = {
      ...validApprovalBase,
      status: "REVOKED" as const,
    };
    const revokedApp: ManualEnablementApproval = {
      ...revokedAppBase,
      approvalFingerprint: computeApprovalFingerprint(revokedAppBase),
    };

    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      approval: revokedApp,
      killSwitch: inactiveKillSwitch,
      now: () => new Date("2026-09-24T12:10:00.000Z"),
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.reason).toContain("REVOKED");
  });

  it("11. Active kill-switch disables toggle", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      approval: validApproval,
      killSwitch: DEFAULT_KILL_SWITCH, // active: true
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.source).toBe("kill_switch");
  });

  it("12. Invalid approval disables toggle", () => {
    const invalidApp = {
      ...validApproval,
      approvalFingerprint: "corrupted",
    };

    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      approval: invalidApp,
      killSwitch: inactiveKillSwitch,
      now: () => new Date("2026-09-24T12:10:00.000Z"),
    });
    expect(toggle.enabled).toBe(false);
    expect(toggle.reason).toContain("Invalid or expired approval");
  });

  it("13. Invalid config disables toggle", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
      config: { ...DEFAULT_RESEARCH_PROVIDER_CONFIG, defaultProviderId: "invalid" },
    });
    expect(toggle.enabled).toBe(false);
  });

  it("14. Capability escalation disables toggle", () => {
    const toggle = evaluateControlledExecutionToggle({
      requested: true,
      killSwitch: inactiveKillSwitch,
    });
    expect(toggle.enabled).toBe(false);
  });

  it("15. Toggle is immutable", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect(() => {
      (toggle as any).enabled = true;
    }).toThrow();
  });

  it("16. Toggle is JSON-serializable", () => {
    const toggle = evaluateControlledExecutionToggle();
    const json = JSON.stringify(toggle);
    expect(typeof json).toBe("string");
    const parsed = JSON.parse(json);
    expect(parsed.enabled).toBe(false);
  });

  it("17. Toggle contains no secret", () => {
    const toggle = evaluateControlledExecutionToggle({ approval: validApproval });
    expect((toggle as any).secret).toBeUndefined();
  });

  it("18. Toggle contains no path", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).filePath).toBeUndefined();
  });

  it("19. Toggle contains no provider instance", () => {
    const toggle = evaluateControlledExecutionToggle();
    expect((toggle as any).provider).toBeUndefined();
  });

  it("20. Toggle does not mutate process.env and Rollback Policy is valid", () => {
    const envBefore = { ...process.env };
    const rollback = createControlledRollbackPolicy();

    expect(process.env).toEqual(envBefore);
    expect(rollback.isRollbackComplete).toBe(true);
    expect(rollback.toggle.enabled).toBe(false);
    expect(rollback.killSwitch.active).toBe(true);
    expect(rollback.policy.realExecutionEnabled).toBe(false);
  });
});
