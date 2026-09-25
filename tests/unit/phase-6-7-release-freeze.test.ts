import { describe, it, expect } from "vitest";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
} from "../../src/server/services/providers/operatorPreflightEvidence";
import {
  createOperatorSignoff,
  validateOperatorSignoff,
} from "../../src/server/services/providers/operatorSignoffContract";
import { simulateRollbackRehearsal } from "../../src/server/services/providers/rollbackRehearsal";
import { evaluateOperatorPreflightGate } from "../../src/server/services/providers/preflightGate";

describe("Phase 6.7 — Release Freeze Invariants", () => {
  const makeFrozenBundle = () =>
    createPreflightEvidenceBundle({
      environment: "staging",
      items: ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
        createPreflightEvidenceItem({
          evidenceId: `freeze-item-${kind.toLowerCase()}`,
          kind,
          status: "PASS",
          summary: `Release freeze verified evidence for ${kind}`,
        })
      ),
    });

  it("1. release freeze strictly enforces realExecutionAllowed === false", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("2. release freeze strictly enforces networkAllowed === false", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.networkAllowed).toBe(false);
  });

  it("3. release freeze strictly enforces credentialsAllowed === false", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.credentialsAllowed).toBe(false);
  });

  it("4. release freeze strictly enforces childProcessAllowed === false", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.childProcessAllowed).toBe(false);
  });

  it("5. release freeze strictly enforces sideEffectsAllowed === false", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("6. controlled execution toggle remains disabled in frozen state", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.finalToggleEnabled).toBe(false);
  });

  it("7. kill-switch remains active in frozen state", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.finalKillSwitchActive).toBe(true);
  });

  it("8. operator sign-off does NOT open execution during freeze", () => {
    const bundle = makeFrozenBundle();
    const signoff = createOperatorSignoff({
      operatorId: "lead-operator",
      decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
      bundleId: bundle.bundleId,
      bundleFingerprint: bundle.tamperEvidence.fingerprint,
      environment: "staging",
      expiresAt: "2026-09-24T23:59:59.000Z",
    });
    expect(signoff.realExecutionAllowed).toBe(false);
    expect(signoff.runtimeToggleChanged).toBe(false);
    expect(signoff.killSwitchChanged).toBe(false);
  });

  it("9. preflight gate decision READY_FOR_OPERATOR_REVIEW remains non-authorizing", () => {
    const bundle = makeFrozenBundle();
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      toggleState: { enabled: false },
      killSwitchState: { active: true },
      rollbackRehearsalResult: rehearsal,
    });
    expect(decision.decision).toBe("READY_FOR_OPERATOR_REVIEW");
    expect(decision.realExecutionAllowed).toBe(false);
    expect(decision.sideEffectsAllowed).toBe(false);
  });

  it("10. production environment is unconditionally BLOCKED during freeze", () => {
    const bundle = makeFrozenBundle();
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "production",
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("PRODUCTION_FORBIDDEN");
    }
  });

  it("11. rollback rehearsal created resources remain empty array", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.createdResources).toEqual([]);
  });

  it("12. frozen bundle fingerprint is tamper-evident", () => {
    const bundle = makeFrozenBundle();
    expect(bundle.tamperEvidence.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(bundle.tamperEvidence.canonicalized).toBe(true);
  });
});
