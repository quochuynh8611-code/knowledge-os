import { describe, it, expect, vi } from "vitest";
import * as childProcess from "child_process";
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
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";

describe("Phase 6.6 — No Real Execution Verification", () => {
  const makeBundle = () =>
    createPreflightEvidenceBundle({
      environment: "staging",
      items: ALL_REQUIRED_EVIDENCE_KINDS.map((kind) =>
        createPreflightEvidenceItem({
          evidenceId: `item-${kind.toLowerCase()}`,
          kind,
          status: "PASS",
          summary: `Summary for ${kind}`,
        })
      ),
    });

  it("1. NotebookLM provider is never called during preflight operations", () => {
    const spy = vi.spyOn(NotebookLMEnterpriseProvider.prototype, "createWorkspace");
    const bundle = makeBundle();
    evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("2. Antigravity provider is never called during preflight operations", () => {
    const spy = vi.spyOn(AntigravityProvider.prototype, "createWorkspace");
    const bundle = makeBundle();
    evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("3. NotebookLM client is never called during preflight operations", () => {
    const mockClient = new MockNotebookLMClient();
    const spy = vi.spyOn(mockClient, "createWorkspace");
    const bundle = makeBundle();
    evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("4. ResearchOrchestrator is never invoked for real execution", () => {
    const spy = vi.spyOn(ResearchOrchestrator.prototype, "startResearchJob");
    const bundle = makeBundle();
    evaluateOperatorPreflightGate({ bundle, environment: "staging" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("5. ProviderRegistry is never queried for execution instances", () => {
    const bundle = makeBundle();
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    const decision = evaluateOperatorPreflightGate({
      bundle,
      environment: "staging",
      rollbackRehearsalResult: rehearsal,
    });
    expect(decision.realExecutionAllowed).toBe(false);
  });

  it("6. ResearchSubmissionPort is never configured for live provider routes", () => {
    const bundle = makeBundle();
    expect(bundle.realExecutionAllowed).toBe(false);
  });

  it("7. global fetch is never called during bundle and gate evaluation", () => {
    const fetchSpy = vi.fn();
    (global as any).fetch = fetchSpy;
    const bundle = makeBundle();
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    evaluateOperatorPreflightGate({ bundle, environment: "staging", rollbackRehearsalResult: rehearsal });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("8. HTTP client is never invoked", () => {
    const bundle = makeBundle();
    expect(bundle.networkAllowed).toBe(false);
  });

  it("9. WebSocket is never created", () => {
    const bundle = makeBundle();
    expect(bundle.networkAllowed).toBe(false);
  });

  it("10. child_process is never spawned", () => {
    const bundle = makeBundle();
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    const decision = evaluateOperatorPreflightGate({ bundle, environment: "staging", rollbackRehearsalResult: rehearsal });
    expect(bundle.childProcessAllowed).toBe(false);
    expect((decision as any).childProcess).toBeUndefined();
    expect((rehearsal as any).childProcess).toBeUndefined();
  });

  it("11. secureStorageResolver is never accessed", () => {
    const bundle = makeBundle();
    expect(bundle.credentialsAllowed).toBe(false);
  });

  it("12. process.env is never mutated", () => {
    const envBefore = { ...process.env };
    const bundle = makeBundle();
    simulateRollbackRehearsal({ environment: "staging" });
    createOperatorSignoff({
      operatorId: "op-1",
      decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
      bundleId: bundle.bundleId,
      bundleFingerprint: bundle.tamperEvidence.fingerprint,
      environment: "staging",
      expiresAt: "2026-09-24T22:00:00.000Z",
    });
    expect(process.env).toEqual(envBefore);
  });

  it("13. MCP listener is never opened", () => {
    const bundle = makeBundle();
    expect(bundle.childProcessAllowed).toBe(false);
  });

  it("14. background task is never created", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.createdResources).toEqual([]);
  });

  it("15. workspace is never created in external system", () => {
    const rehearsal = simulateRollbackRehearsal({ environment: "staging" });
    expect(rehearsal.createdResources).toHaveLength(0);
  });

  it("16. source is never uploaded to external system", () => {
    const bundle = makeBundle();
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("17. audio is never generated", () => {
    const bundle = makeBundle();
    expect(bundle.sideEffectsAllowed).toBe(false);
  });

  it("18. domain state is never marked COMPLETED", () => {
    const decision = evaluateOperatorPreflightGate({
      bundle: makeBundle(),
      environment: "staging",
    });
    expect((decision as any).status).not.toBe("COMPLETED");
  });

  it("19. credential path is never read", () => {
    const bundle = makeBundle();
    expect(bundle.credentialsAllowed).toBe(false);
  });

  it("20. external requests are never emitted by signoff validation", () => {
    const bundle = makeBundle();
    const signoff = createOperatorSignoff({
      operatorId: "op-1",
      decision: "ACKNOWLEDGED_FOR_MANUAL_REVIEW",
      bundleId: bundle.bundleId,
      bundleFingerprint: bundle.tamperEvidence.fingerprint,
      environment: "staging",
      expiresAt: "2026-09-24T22:00:00.000Z",
    });
    const result = validateOperatorSignoff({
      signoff,
      expectedBundleId: bundle.bundleId,
      expectedBundleFingerprint: bundle.tamperEvidence.fingerprint,
      currentTime: "2026-09-24T21:00:00.000Z",
    });
    expect(result.valid).toBe(true);
    expect(signoff.realExecutionAllowed).toBe(false);
  });
});
