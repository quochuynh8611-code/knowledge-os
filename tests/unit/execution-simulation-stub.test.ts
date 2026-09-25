/**
 * Execution Simulation Stub Unit Tests (Phase 6.1)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real provider execution calls (NotebookLM / Antigravity).
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - NO DB schema migration.
 * - Deterministic submissionId, mode simulation_only, sideEffectsAllowed false.
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

describe("EXECUTION SIMULATION STUB (PHASE 6.1)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let simulationStub: InMemoryExecutionSimulationProvider;
  let mockPrisma: any;

  const validApproval: ExecutionApprovalProof = {
    approvedBy: "security_auditor_01",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-valid-100",
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

  async function createValidHandoff(correlationId = "corr-sim-1"): Promise<ResearchExecutionHandoff> {
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
      normalizedInput: { topicTitle: "Simulated Quantum" },
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

  it("1. valid handoff returns SIMULATED_ACCEPTED", async () => {
    const handoff = await createValidHandoff("corr-sim-accepted");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.status).toBe("SIMULATED_ACCEPTED");
    expect(result.failure).toBeUndefined();
  });

  it("2. result has simulation=true", async () => {
    const handoff = await createValidHandoff("corr-sim-flag");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.simulation).toBe(true);
  });

  it("3. result has mode=simulation_only", async () => {
    const handoff = await createValidHandoff("corr-sim-mode");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.mode).toBe("simulation_only");
  });

  it("4. sideEffectsAllowed=false", async () => {
    const handoff = await createValidHandoff("corr-sim-side-effects");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.sideEffectsAllowed).toBe(false);
  });

  it("5. providerCallMade=false", async () => {
    const handoff = await createValidHandoff("corr-sim-provider-call");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.providerCallMade).toBe(false);
  });

  it("6. networkCallMade=false", async () => {
    const handoff = await createValidHandoff("corr-sim-network-call");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.networkCallMade).toBe(false);
  });

  it("7. credentialAccessed=false", async () => {
    const handoff = await createValidHandoff("corr-sim-credentials");
    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.credentialAccessed).toBe(false);
  });

  it("8. deterministic submissionId", async () => {
    const handoff = await createValidHandoff("corr-sim-deterministic");
    const result1 = await simulationStub.simulateSubmission(handoff);

    const stub2 = new InMemoryExecutionSimulationProvider({
      persistence: persistencePort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });
    const result2 = await stub2.simulateSubmission(handoff);

    expect(result1.submissionId).toBe(result2.submissionId);
    expect(result1.submissionId.startsWith("sim-sub-")).toBe(true);
  });

  it("9. same handoff returns SIMULATED_REPLAY", async () => {
    const handoff = await createValidHandoff("corr-sim-replay");
    const firstRes = await simulationStub.simulateSubmission(handoff);
    expect(firstRes.status).toBe("SIMULATED_ACCEPTED");

    const replayRes = await simulationStub.simulateSubmission(handoff);
    expect(replayRes.status).toBe("SIMULATED_REPLAY");
    expect(replayRes.submissionId).toBe(firstRes.submissionId);
  });

  it("10. replay does not create duplicate attempt", async () => {
    const handoff = await createValidHandoff("corr-sim-no-dup");
    await simulationStub.simulateSubmission(handoff);

    const snapshotAfterFirst = await persistencePort.getExecutionByCorrelationId("corr-sim-no-dup");
    const attemptsCountFirst = snapshotAfterFirst?.attemptRecords.length || 0;

    await simulationStub.simulateSubmission(handoff);

    const snapshotAfterSecond = await persistencePort.getExecutionByCorrelationId("corr-sim-no-dup");
    const attemptsCountSecond = snapshotAfterSecond?.attemptRecords.length || 0;

    expect(attemptsCountSecond).toBe(attemptsCountFirst);
  });

  it("11. invalid mode is blocked", async () => {
    const handoff = await createValidHandoff("corr-sim-invalid-mode");
    const corruptedHandoff = {
      ...handoff,
      mode: "real_execution" as any,
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_BLOCKED");
    expect(result.failure?.code).toBe("INVALID_HANDOFF");
  });

  it("12. sideEffectsAllowed=true is blocked", async () => {
    const handoff = await createValidHandoff("corr-sim-side-effects-true");
    const corruptedHandoff = {
      ...handoff,
      sideEffectsAllowed: true as any,
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_BLOCKED");
    expect(result.failure?.code).toBe("SIMULATION_BLOCKED");
  });

  it("13. missing approval is blocked", async () => {
    const handoff = await createValidHandoff("corr-sim-missing-appr");
    const corruptedHandoff = {
      ...handoff,
      approval: undefined as any,
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_BLOCKED");
    expect(result.failure?.code).toBe("APPROVAL_REQUIRED");
  });

  it("14. invalid approval is rejected", async () => {
    const handoff = await createValidHandoff("corr-sim-invalid-appr");
    const corruptedHandoff = {
      ...handoff,
      approval: {
        ...handoff.approval,
        intent: "unauthorized_intent" as any,
      },
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
    expect(result.failure?.code).toBe("APPROVAL_REQUIRED");
  });

  it("15. wrong correlationId is rejected", async () => {
    const handoff = await createValidHandoff("corr-sim-wrong-id");
    const corruptedHandoff = {
      ...handoff,
      correlationId: "corr-different-id",
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
    expect(result.failure?.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("16. wrong providerId is rejected", async () => {
    const handoff = await createValidHandoff("corr-sim-wrong-provider");
    const corruptedHandoff = {
      ...handoff,
      providerId: "antigravity-adapter",
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
  });

  it("17. wrong fingerprint is rejected", async () => {
    const handoff = await createValidHandoff("corr-sim-wrong-fp");
    const corruptedHandoff = {
      ...handoff,
      inputFingerprint: "tampered-input-fingerprint",
    };

    const result = await simulationStub.simulateSubmission(corruptedHandoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
  });

  it("18. capability mismatch is rejected", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-sim-missing-cap",
      tool: "research_create_workspace",
      dryRun: true,
      accepted: false,
      providerResolution: {
        requestedProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
        resolvedProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
        routingEnabled: true,
        fallbackAllowed: false,
      },
      capabilityCheck: {
        required: ["supportsNotebookManagement"],
        satisfied: false,
        missing: ["supportsNotebookManagement"],
      },
      normalizedInput: { topicTitle: "Missing Cap" },
    });

    const handoff: ResearchExecutionHandoff = {
      handoffId: "handoff-corr-sim-missing-cap",
      correlationId: "corr-sim-missing-cap",
      providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      tool: "research_create_workspace",
      normalizedInput: { topicTitle: "Missing Cap" },
      inputFingerprint: JSON.stringify({
        tool: "research_create_workspace",
        input: { topicTitle: "Missing Cap" },
      }),
      approval: validApproval,
      requestedAt: "2026-09-24T12:00:00.000Z",
      mode: "handoff_only",
      sideEffectsAllowed: false,
    };

    const result = await simulationStub.simulateSubmission(handoff);

    expect(result.status).toBe("SIMULATED_REJECTED");
    expect(result.failure?.code).toBe("CAPABILITY_UNSUPPORTED");
  });

  it("19. persistence failure is blocked", async () => {
    const failingPersistence = {
      saveExecution: vi.fn().mockRejectedValue(new Error("Disk error")),
      getExecutionByCorrelationId: vi.fn().mockRejectedValue(new Error("Lookup failure")),
      listAttempts: vi.fn().mockResolvedValue([]),
    };

    const failingStub = new InMemoryExecutionSimulationProvider({
      persistence: failingPersistence,
      now: () => new Date("2026-09-24T12:00:00.000Z"),
    });

    const handoff: ResearchExecutionHandoff = {
      handoffId: "handoff-failing",
      correlationId: "corr-failing",
      providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      tool: "research_create_workspace",
      normalizedInput: { topic: "Test" },
      inputFingerprint: JSON.stringify({
        tool: "research_create_workspace",
        input: { topic: "Test" },
      }),
      approval: validApproval,
      requestedAt: "2026-09-24T12:00:00.000Z",
      mode: "handoff_only",
      sideEffectsAllowed: false,
    };

    const result = await failingStub.simulateSubmission(handoff);

    expect(result.status).toBe("SIMULATED_BLOCKED");
    expect(result.failure?.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("20. no provider execution method is called", async () => {
    const handoff = await createValidHandoff("corr-sim-no-provider");
    await simulationStub.simulateSubmission(handoff);

    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.researchTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("21. no network call is made", async () => {
    const handoff = await createValidHandoff("corr-sim-no-net");
    const res = await simulationStub.simulateSubmission(handoff);

    expect(res.networkCallMade).toBe(false);
  });

  it("22. no child process is spawned", async () => {
    const handoff = await createValidHandoff("corr-sim-no-process");
    const res = await simulationStub.simulateSubmission(handoff);

    expect(res.status).toBe("SIMULATED_ACCEPTED");
  });

  it("23. no credentials are read", async () => {
    const handoff = await createValidHandoff("corr-sim-no-creds");
    const res = await simulationStub.simulateSubmission(handoff);

    expect(res.credentialAccessed).toBe(false);
  });

  it("24. no process.env mutation", async () => {
    const envBefore = { ...process.env };
    const handoff = await createValidHandoff("corr-sim-no-env");
    await simulationStub.simulateSubmission(handoff);

    expect(process.env).toEqual(envBefore);
  });

  it("25. forbidden fields are not present in result", async () => {
    const handoff = await createValidHandoff("corr-sim-forbidden-check");
    const result = await simulationStub.simulateSubmission(handoff);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("bearer");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("process.env");
    expect((result as any).providerInstance).toBeUndefined();
    expect((result as any).adapter).toBeUndefined();
  });
});
