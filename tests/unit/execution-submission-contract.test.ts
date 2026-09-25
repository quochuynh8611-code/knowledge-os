/**
 * Execution Submission Contract Tests (Phase 6.1)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real provider execution calls (NotebookLM / Antigravity).
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - NO DB schema migration.
 * - Submission envelope safety, secret sanitization, terminalStatus preservation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  InMemoryExecutionSimulationProvider,
  SimulatedSubmissionResult,
} from "../../src/server/services/providers/executionSimulationStub.js";
import {
  ResearchExecutionHandoff,
  ExecutionApprovalProof,
  ResearchSessionService,
} from "../../src/server/services/researchSessionService.js";
import {
  InMemoryResearchPersistencePort,
  ResearchExecutionSnapshot,
} from "../../src/server/services/providers/researchPersistencePort.js";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig.js";

describe("EXECUTION SUBMISSION CONTRACT (PHASE 6.1)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let simulationStub: InMemoryExecutionSimulationProvider;
  let mockPrisma: any;

  const validApproval: ExecutionApprovalProof = {
    approvedBy: "operator_security_lead",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-sub-contract-01",
  };

  beforeEach(() => {
    persistencePort = new InMemoryResearchPersistencePort();
    mockPrisma = {
      researchSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      researchTimelineEvent: {
        create: vi.fn(),
      },
    };

    service = new ResearchSessionService(mockPrisma, {
      persistence: persistencePort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });

    simulationStub = new InMemoryExecutionSimulationProvider({
      persistence: persistencePort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });
  });

  async function createReadyHandoff(correlationId = "corr-sub-contract"): Promise<ResearchExecutionHandoff> {
    await service.recordExecutionIntent({
      correlationId,
      tool: "research_create_workspace",
      dryRun: true,
      accepted: true,
      providerResolution: {
        requestedProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
        resolvedProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
        routingEnabled: true,
        fallbackAllowed: false,
      },
      capabilityCheck: {
        required: ["supportsNotebookManagement"],
        satisfied: true,
        missing: [],
      },
      normalizedInput: { topicTitle: "Submission Contract" },
    });

    await service.transitionExecutionIntent({
      correlationId,
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const handoffRes = await service.prepareExecutionHandoff({
      correlationId,
      approval: validApproval,
    });

    if (!handoffRes.handoff) {
      throw new Error(`Failed to create handoff: ${handoffRes.reason}`);
    }

    return handoffRes.handoff;
  }

  it("1. submission result shape is typed and deterministic", async () => {
    const handoff = await createReadyHandoff("corr-shape-test");
    const result: SimulatedSubmissionResult = await simulationStub.simulateSubmission(handoff);

    expect(result).toHaveProperty("simulation", true);
    expect(result).toHaveProperty("submissionId");
    expect(result).toHaveProperty("correlationId", "corr-shape-test");
    expect(result).toHaveProperty("providerId", APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
    expect(result).toHaveProperty("tool", "research_create_workspace");
    expect(result).toHaveProperty("status", "SIMULATED_ACCEPTED");
    expect(result).toHaveProperty("mode", "simulation_only");
    expect(result).toHaveProperty("sideEffectsAllowed", false);
    expect(result).toHaveProperty("handoffFingerprint");
    expect(result).toHaveProperty("createdAt");
  });

  it("2. accepted result has all false safety flags", async () => {
    const handoff = await createReadyHandoff("corr-safety-flags");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.sideEffectsAllowed).toBe(false);
    expect(result.providerCallMade).toBe(false);
    expect(result.networkCallMade).toBe(false);
    expect(result.credentialAccessed).toBe(false);
  });

  it("3. rejected result has sanitized failure code", async () => {
    const handoff = await createReadyHandoff("corr-rejected-sanitized");
    const corruptedHandoff = {
      ...handoff,
      approval: {
        ...handoff.approval,
        intent: "invalid_intent" as any,
      },
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
    expect(result.failure?.code).toBe("APPROVAL_REQUIRED");
    expect(result.failure?.message).toBeDefined();
  });

  it("4. replay result reuses submissionId", async () => {
    const handoff = await createReadyHandoff("corr-replay-reuse-id");
    const firstRes = await simulationStub.simulateSubmission(handoff);
    const replayRes = await simulationStub.simulateSubmission(handoff);

    expect(firstRes.status).toBe("SIMULATED_ACCEPTED");
    expect(replayRes.status).toBe("SIMULATED_REPLAY");
    expect(replayRes.submissionId).toBe(firstRes.submissionId);
  });

  it("5. conflict result never overwrites original", async () => {
    const handoff = await createReadyHandoff("corr-conflict-no-overwrite");
    await simulationStub.simulateSubmission(handoff);

    const snapshotBefore = await persistencePort.getExecutionByCorrelationId("corr-conflict-no-overwrite");

    const conflictingHandoff = {
      ...handoff,
      inputFingerprint: "conflicting-input-fingerprint",
    };

    const conflictRes = await simulationStub.simulateSubmission(conflictingHandoff);
    expect(conflictRes.status).toBe("SIMULATED_REJECTED");
    expect(conflictRes.failure?.code).toBe("IDEMPOTENCY_CONFLICT");

    const snapshotAfter = await persistencePort.getExecutionByCorrelationId("corr-conflict-no-overwrite");
    expect(snapshotAfter).toEqual(snapshotBefore);
  });

  it("6. raw input is not returned in submission result", async () => {
    const handoff = await createReadyHandoff("corr-no-raw-input");
    const result = await simulationStub.simulateSubmission(handoff);

    expect((result as any).normalizedInput).toBeUndefined();
    expect((result as any).rawInput).toBeUndefined();
  });

  it("7. secrets are redacted", async () => {
    const handoff = await createReadyHandoff("corr-redacted-secrets");
    const handoffWithSecret = {
      ...handoff,
      approval: {
        ...handoff.approval,
        approvedBy: "operator Bearer top-secret-token",
      },
    };

    const result = await simulationStub.simulateSubmission(handoffWithSecret);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("top-secret-token");
  });

  it("8. filesystem paths are excluded", async () => {
    const handoff = await createReadyHandoff("corr-no-paths");
    const result = await simulationStub.simulateSubmission(handoff);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("/home/");
    expect(serialized).not.toContain("/var/");
  });

  it("9. provider instance is excluded", async () => {
    const handoff = await createReadyHandoff("corr-no-instance");
    const result = await simulationStub.simulateSubmission(handoff);

    expect((result as any).providerInstance).toBeUndefined();
    expect((result as any).adapter).toBeUndefined();
  });

  it("10. shell command is excluded", async () => {
    const handoff = await createReadyHandoff("corr-no-command");
    const result = await simulationStub.simulateSubmission(handoff);

    expect((result as any).command).toBeUndefined();
    expect((result as any).shell).toBeUndefined();
    expect((result as any).exec).toBeUndefined();
  });

  it("11. simulation metadata is persistence-safe", async () => {
    const handoff = await createReadyHandoff("corr-persistence-safe");
    await simulationStub.simulateSubmission(handoff);

    const snapshot = await persistencePort.getExecutionByCorrelationId("corr-persistence-safe");
    expect(snapshot).not.toBeNull();
    const simAttempt = snapshot?.attemptRecords.find((a) => a.attemptId.startsWith("sim-sub-"));

    expect(simAttempt).toBeDefined();
    expect((simAttempt?.rawErrorDetails as any)?.simulation).toBe(true);
    expect((simAttempt?.rawErrorDetails as any)?.providerCallMade).toBe(false);
  });

  it("12. terminalStatus is not falsely COMPLETED", async () => {
    const handoff = await createReadyHandoff("corr-terminal-status-safe");
    await simulationStub.simulateSubmission(handoff);

    const snapshot = await persistencePort.getExecutionByCorrelationId("corr-terminal-status-safe");
    expect(snapshot?.terminalStatus).not.toBe("COMPLETED");
    expect(snapshot?.terminalStatus).toBe("IN_PROGRESS");
  });

  it("13. no provider attempt is created for rejected request", async () => {
    const handoff = await createReadyHandoff("corr-rejected-no-attempt");
    const beforeSnap = await persistencePort.getExecutionByCorrelationId("corr-rejected-no-attempt");
    const beforeCount = beforeSnap?.attemptRecords.length || 0;

    const corruptedHandoff = {
      ...handoff,
      providerId: "non-existent-provider",
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);
    expect(result.status).toBe("SIMULATED_REJECTED");

    const afterSnap = await persistencePort.getExecutionByCorrelationId("corr-rejected-no-attempt");
    const afterCount = afterSnap?.attemptRecords.length || 0;

    expect(afterCount).toBe(beforeCount);
  });

  it("14. no real execution transition is allowed", async () => {
    await createReadyHandoff("corr-no-real-transition");

    const res = await service.transitionExecutionIntent({
      correlationId: "corr-no-real-transition",
      expectedCurrentState: "approved_for_handoff",
      targetState: "executing",
    });

    expect(res.transitionAccepted).toBe(false);
    expect(res.reason).toContain("strictly blocked");
  });

  it("15. stdout protocol remains pure if invoked through existing service path", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");
    const handoff = await createReadyHandoff("corr-stdout-purity");

    await service.simulateExecutionSubmission(handoff);

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });
});
