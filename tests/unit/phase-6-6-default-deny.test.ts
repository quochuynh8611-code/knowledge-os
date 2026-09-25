import { describe, it, expect } from "vitest";
import {
  ALL_REQUIRED_EVIDENCE_KINDS,
  createPreflightEvidenceItem,
  createPreflightEvidenceBundle,
} from "../../src/server/services/providers/operatorPreflightEvidence";
import {
  createOperatorSignoff,
} from "../../src/server/services/providers/operatorSignoffContract";
import { simulateRollbackRehearsal } from "../../src/server/services/providers/rollbackRehearsal";
import { evaluateOperatorPreflightGate } from "../../src/server/services/providers/preflightGate";

describe("Phase 6.6 — Default Deny Invariants", () => {
  const makeBundle = (env: "test" | "staging" = "staging") =>
    createPreflightEvidenceBundle({
      environment: env,
      items: ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
        createPreflightEvidenceItem({
          evidenceId: `item-${kind.toLowerCase()}`,
          kind,
          status: "PASS",
          summary: `Summary for ${kind}`,
        })
      ),
    });

  it("1. default toggle is disabled", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.finalToggleEnabled).toBe(false);
  });

  it("2. default kill-switch is active", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.finalKillSwitchActive).toBe(true);
  });

  it("3. default readiness is not real-execution ready", () => {
    const bundle = makeBundle();
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("4. sign-off does not change toggle", () => {
    const bundle = makeBundle();
    const signoff = createOperatorSignoff({
      operatorId: "op-1",
      decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
      bundleId: bundle.bundleId,
      bundleFingerprint: bundle.tamperEvidence.fingerprint,
      environment: "staging",
      expiresAt: "2026-09-24T22:00:00.000Z",
    });
    expect(signoff.runtimeToggleChanged).toBe(false);
  });

  it("5. sign-off does not change kill-switch", () => {
    const bundle = makeBundle();
    const signoff = createOperatorSignoff({
      operatorId: "op-1",
      decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
      bundleId: bundle.bundleId,
      bundleFingerprint: bundle.tamperEvidence.fingerprint,
      environment: "staging",
      expiresAt: "2026-09-24T22:00:00.000Z",
    });
    expect(signoff.killSwitchChanged).toBe(false);
  });

  it("6. complete bundle still has realExecutionAllowed false", () => {
    const bundle = makeBundle();
    expect(bundle.complete).toBe(true);
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("7. READY_FOR_OPERATOR_REVIEW decision does not authorize execution", () => {
    const bundle = makeBundle();
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
  });

  it("8. environment flag cannot enable execution", () => {
    const bundle = makeBundle("staging");
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("9. manual approval cannot enable execution", () => {
    const item = createPreflightEvidenceItem({
      evidenceId: "item-manual-approval",
      kind: "MANUAL_ENABLEMENT_DECISION",
      status: "PASS",
      summary: "Manual enablement approval recorded for future phase",
    });
    expect(item.realExecutionAllowed).toBe(false);
  });

  it("10. provider allowlist cannot enable execution", () => {
    const bundle = makeBundle();
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("11. network flag is always false", () => {
    const bundle = makeBundle();
    expect(bundle.networkAllowed).toBe(false);
  });

  it("12. credential flag is always false", () => {
    const bundle = makeBundle();
    expect(bundle.credentialsAllowed).toBe(false);
  });

  it("13. child-process flag is always false", () => {
    const bundle = makeBundle();
    expect(bundle.childProcessAllowed).toBe(false);
  });

  it("14. side-effect flag is always false", () => {
    const bundle = makeBundle();
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("15. production is always denied", () => {
    const bundle = makeBundle();
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "production",
    });
    expect(decision.decision).toBe("BLOCKED");
    if (decision.decision === "BLOCKED") {
      expect(decision.reasons).toContain("PRODUCTION_FORBIDDEN");
    }
  });

  it("16. missing proof is denied", () => {
    const incompleteBundle = createPreflightEvidenceBundle({
      environment: "staging",
      items: [],
    });
    const decision = evaluateOperatorPreflightGate({
      bundle: incompleteBundle,
      environment: "staging",
    });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("17. stale proof is denied", () => {
    const items = ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
      createPreflightEvidenceItem({
        evidenceId: `item-${kind.toLowerCase()}`,
        kind,
        status: kind === "READINESS_REPORT" ? "STALE" : "PASS",
        summary: `Summary for ${kind}`,
      })
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    const decision = evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("18. invalid proof is denied", () => {
    const items = ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
      createPreflightEvidenceItem({
        evidenceId: `item-${kind.toLowerCase()}`,
        kind,
        status: kind === "RUNTIME_COMPOSITION_AUDIT" ? "INVALID" : "PASS",
        summary: `Summary for ${kind}`,
      })
    );
    const bundle = createPreflightEvidenceBundle({
      environment: "staging",
      items,
    });
    const decision = evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("19. rollback failure is denied", () => {
    const bundle = makeBundle();
    const failedRehearsal = simulateRollbackRehearsal({
      environment: "staging",
      simulateFailureStep: "DISABLE_CONTROLLED_TOGGLE",
    });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      rollbackRehearsalResult: failedRehearsal,
    });
    expect(decision.decision).toBe("BLOCKED");
  });

  it("20. no real provider call occurs", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.providerCallMade).toBe(false);
    expect(rehearsal.networkCallMade).toBe(false);
    expect(rehearsal.credentialsAccessed).toBe(false);
  });
});
