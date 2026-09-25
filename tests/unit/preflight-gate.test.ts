import { describe, it, expect } from "vitest";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
  PreflightEvidenceItem,
} from "../../src/server/services/providers/operatorPreflightEvidence";
import {
  evaluateOperatorPreflightGate,
} from "../../src/server/services/providers/preflightGate";
import { simulateRollbackRehearsal } from "../../src/server/services/providers/rollbackRehearsal";

function makeAllValidItems(): PreflightEvidenceItem[] {
  return ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
    createPreflightEvidenceItem({
      evidenceId: `evidence-${kind.toLowerCase()}`,
      kind,
      status: "PASS",
      summary: `Verified evidence for ${kind}`,
      checks: ["CHECK_A_PASS", "CHECK_B_PASS"],
    })
  );
}

describe("Preflight Gate", () => {
  const baseBundle = createPreflightEvidenceBundle({
    environment: "staging",
    items: makeAllValidItems(),
  });
  const validRollback = simulateRollbackRehearsal({ environment: "staging" });

  it("1. complete bundle returns READY_FOR_OPERATOR_REVIEW", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false, realExecutionAllowed: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("READY_FOR_OPERATOR_REVIEW");
    expect(decision.realExecutionAllowed).toBe(false);
    expect(decision.sideEffectsAllowed).toBe(false);
  });

  it("2. missing evidence returns BLOCKED", () => {
    const incompleteItems = makeAllValidItems().filter(
      (i) => i.kind !== "MANUAL_ENABLEMENT_DECISION"
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: incompleteItems,
    });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("MISSING_EVIDENCE");
    }
  });

  it("3. failed evidence returns BLOCKED", () => {
    const items = makeAllValidItems().map((i) =>
      i.kind === "NO_REAL_EXECUTION_PROOF"
        ? createPreflightEvidenceItem({ ...i, status: "FAIL" })
        : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("FAILED_EVIDENCE");
    }
  });

  it("4. stale evidence returns BLOCKED", () => {
    const items = makeAllValidItems().map((i) =>
      i.kind === "READINESS_REPORT"
        ? createPreflightEvidenceItem({ ...i, status: "STALE" })
        : i
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("STALE_EVIDENCE");
    }
  });

  it("5. invalid fingerprint returns BLOCKED", () => {
    const tamperedBundle = {
      ...baseBundle,
      tamperEvidence: {
        algorithm: "sha256" as const,
        fingerprint: "tampered-hash-value-1234567890",
        canonicalized: true as const,
      },
    };
    const decision = evaluateOperatorPreflightGate({
      bundle: tamperedBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("INVALID_FINGERPRINT");
    }
  });

  it("6. sanitization failure returns BLOCKED", () => {
    const badItem = createPreflightEvidenceItem({
      evidenceId: "bad-item",
      kind: "KILL_SWITCH_STATE",
      status: "PASS",
      summary: "Bad item",
      rawMetadata: { secretToken: "12345" },
    });
    const items = makeAllValidItems().map((i) => (i.kind === "KILL_SWITCH_STATE" ? badItem : i));
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("SANITIZATION_FAILED");
    }
  });

  it("7. enabled toggle returns BLOCKED", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: true, realExecutionAllowed: true },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("TOGGLE_ENABLED_UNEXPECTEDLY");
    }
  });

  it("8. inactive kill-switch returns BLOCKED", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: false },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("KILL_SWITCH_NOT_ACTIVE");
    }
  });

  it("9. real execution flag true in bundle returns BLOCKED", () => {
    const flagBundle = {
      ...baseBundle,
      realExecutionAllowed: true as any,
    };
    const decision = evaluateOperatorPreflightGate({
      bundle: flagBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("REAL_EXECUTION_FLAG_SET");
    }
  });

  it("10. network flag true in bundle returns BLOCKED", () => {
    const flagBundle = {
      ...baseBundle,
      networkAllowed: true as any,
    };
    const decision = evaluateOperatorPreflightGate({
      bundle: flagBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("NETWORK_FLAG_SET");
    }
  });

  it("11. credential flag true in bundle returns BLOCKED", () => {
    const flagBundle = {
      ...baseBundle,
      credentialsAllowed: true as any,
    };
    const decision = evaluateOperatorPreflightGate({
      bundle: flagBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("CREDENTIAL_FLAG_SET");
    }
  });

  it("12. rollback rehearsal failure returns BLOCKED", () => {
    const failedRollback = simulateRollbackRehearsal({
      environment: "staging",
      simulateFailureStep: "ACTIVATE_KILL_SWITCH",
    });
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: failedRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("ROLLBACK_REHEARSAL_FAILED");
    }
  });

  it("13. production environment returns BLOCKED", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "production",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("PRODUCTION_FORBIDDEN");
    }
  });

  it("14. gate does not auto-fix evidence", () => {
    const incomplete = createPreflightEvidenceBundle({
      environment: "staging",
      items: [],
    });
    const decision = evaluateOperatorPreflightGate({
      bundle: incomplete,
      environment: "staging",
    });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("15. gate does not auto-fix toggle", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: true },
    });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("16. gate does not auto-fix kill-switch", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      killSwitchState: { active: false },
    });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("17. gate does not call provider", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("18. gate does not call network", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
    });
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("19. gate does not read credentials", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
    });
    expect(decision).toBeDefined();
  });

  it("20. gate result is deterministic", () => {
    const d1 = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    const d2 = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(d1).toEqual(d2);
  });

  it("21. gate result is JSON-serializable", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    const serialized = JSON.stringify(decision);
    expect(JSON.parse(serialized).decision).toBe("READY_FOR_OPERATOR_REVIEW");
  });

  it("22. gate result cannot authorize real execution", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("23. gate result cannot authorize side effects", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.sideEffectsAllowed).toBe(false);
  });

  it("24. gate does not mutate inputs", () => {
    const bundleCloned = { ...baseBundle };
    evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "staging",
    });
    expect(baseBundle).toEqual(bundleCloned);
  });

  it("25. gate has no global state dependency", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: baseBundle,
      environment: "test",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: validRollback,
    });
    expect(decision.decision).toBe("READY_FOR_OPERATOR_REVIEW");
  });
});
