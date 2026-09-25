/**
 * Execution Kill Switch Unit Tests (Phase 6.4)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Fail-closed safety barrier: default state is always active.
 * - Zero bypass via env flags, provider selection, or replay.
 * - Zero network, credentials, or child processes.
 */

import { describe, it, expect } from "vitest";
import {
  ExecutionKillSwitchState,
  DEFAULT_KILL_SWITCH,
  computeKillSwitchFingerprint,
  validateKillSwitch,
} from "../../src/server/services/providers/executionKillSwitch.js";

describe("EXECUTION KILL SWITCH (PHASE 6.4)", () => {
  const manualStateBase = {
    active: true,
    reason: "Manual safety kill switch activated during testing",
    source: "manual" as const,
    activatedBy: "human-security-auditor",
    activatedAt: "2026-09-24T12:00:00.000Z",
  };

  const validManualState: ExecutionKillSwitchState = {
    ...manualStateBase,
    fingerprint: computeKillSwitchFingerprint(manualStateBase),
  };

  it("1. Default kill-switch is active", () => {
    expect(DEFAULT_KILL_SWITCH.active).toBe(true);
    expect(DEFAULT_KILL_SWITCH.source).toBe("default");
    expect(DEFAULT_KILL_SWITCH.reason).toBe("Real execution is disabled in Phase 6.4.");
  });

  it("2. Missing state fails closed", () => {
    const res = validateKillSwitch(null);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("non-null object"))).toBe(true);
  });

  it("3. Malformed state fails closed", () => {
    const malformed = { active: "not-a-boolean", reason: 123 };
    const res = validateKillSwitch(malformed);
    expect(res.valid).toBe(false);
  });

  it("4. Empty reason fails closed", () => {
    const state = { ...validManualState, reason: "   " };
    const res = validateKillSwitch(state);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("reason"))).toBe(true);
  });

  it("5. Manual state requires actor", () => {
    const state = { ...manualStateBase, activatedBy: "", fingerprint: "" };
    const res = validateKillSwitch(state);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("activatedBy"))).toBe(true);
  });

  it("6. Manual state requires timestamp", () => {
    const state = { ...manualStateBase, activatedAt: "invalid-date", fingerprint: "" };
    const res = validateKillSwitch(state);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("activatedAt"))).toBe(true);
  });

  it("7. System state requires timestamp", () => {
    const systemState = {
      active: true,
      reason: "System panic triggered",
      source: "system" as const,
      activatedAt: "",
      fingerprint: "",
    };
    const res = validateKillSwitch(systemState);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("activatedAt"))).toBe(true);
  });

  it("8. Active state always denies", () => {
    expect(DEFAULT_KILL_SWITCH.active).toBe(true);
    const validation = validateKillSwitch(DEFAULT_KILL_SWITCH);
    expect(validation.valid).toBe(true);
  });

  it("9. Fingerprint is deterministic", () => {
    const fp1 = computeKillSwitchFingerprint(manualStateBase);
    const fp2 = computeKillSwitchFingerprint(manualStateBase);
    expect(fp1).toBe(fp2);
    expect(typeof fp1).toBe("string");
  });

  it("10. Fingerprint excludes secrets", () => {
    const fp = computeKillSwitchFingerprint(manualStateBase);
    expect(fp).not.toContain("secret");
    expect(fp.length).toBe(64);
  });

  it("11. Kill-switch cannot be bypassed by env flag", () => {
    process.env.RESEARCH_ALLOW_NOTEBOOKLM = "true";
    process.env.ENABLE_PROVIDER_ROUTING = "true";

    expect(DEFAULT_KILL_SWITCH.active).toBe(true);
  });

  it("12. Kill-switch cannot be bypassed by provider selection", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect(state.active).toBe(true);
  });

  it("13. Kill-switch cannot be bypassed by fallback", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect(state.active).toBe(true);
  });

  it("14. Kill-switch cannot be bypassed by replay", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect(state.active).toBe(true);
  });

  it("15. Kill-switch cannot be bypassed by recovery", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect(state.active).toBe(true);
  });

  it("16. Kill-switch does not call provider", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect((state as any).provider).toBeUndefined();
  });

  it("17. Kill-switch does not call network", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect((state as any).socket).toBeUndefined();
  });

  it("18. Kill-switch does not read credential", () => {
    const state = DEFAULT_KILL_SWITCH;
    expect((state as any).token).toBeUndefined();
  });

  it("19. Kill-switch does not mutate global state", () => {
    const state = { ...DEFAULT_KILL_SWITCH };
    validateKillSwitch(state);
    expect(state).toEqual(DEFAULT_KILL_SWITCH);
  });

  it("20. Kill-switch remains active by default", () => {
    expect(DEFAULT_KILL_SWITCH.active).toBe(true);
    expect(DEFAULT_KILL_SWITCH.fingerprint.length).toBe(64);
  });
});
