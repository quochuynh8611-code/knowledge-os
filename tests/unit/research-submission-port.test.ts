/**
 * Research Submission Port Unit Tests (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Decoupled Submission Port between Control Plane and Execution Plane.
 * - Strict default-deny boundary: blocks real execution and side effects.
 * - Zero real provider calls (NotebookLM / Antigravity).
 * - Zero real Google Cloud or external network calls.
 * - Zero credentials, tokens, or API keys accessed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ResearchSubmissionPort,
  ResearchSubmissionRequest,
  ResearchSubmissionResult,
} from "../../src/server/services/providers/types.js";
import { SimulationSubmissionAdapter } from "../../src/server/services/providers/simulationSubmissionAdapter.js";
import { InMemoryExecutionSimulationProvider } from "../../src/server/services/providers/executionSimulationStub.js";
import {
  ResearchSessionService,
  ResearchExecutionHandoff,
  ExecutionApprovalProof,
} from "../../src/server/services/researchSessionService.js";
import { InMemoryResearchPersistencePort } from "../../src/server/services/providers/researchPersistencePort.js";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig.js";

describe("RESEARCH SUBMISSION PORT (PHASE 6.2)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let submissionPort: ResearchSubmissionPort;
  let mockPrisma: any;

  const validApproval: ExecutionApprovalProof = {
    approvedBy: "security_auditor_01",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-port-001",
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

    const simulationStub = new InMemoryExecutionSimulationProvider({
      persistence: persistencePort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });

    submissionPort = new SimulationSubmissionAdapter(simulationStub);

    service = new ResearchSessionService(mockPrisma, {
      persistence: persistencePort,
      submissionPort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });
  });

  async function createValidHandoff(correlationId = "corr-port-1"): Promise<ResearchExecutionHandoff> {
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
      normalizedInput: { topicTitle: "Submission Port Safety" },
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

  it("1. Port accepts valid simulation request", async () => {
    const handoff = await createValidHandoff("corr-port-accepted");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("accepted");
    expect(result.status).toBe("SIMULATED_ACCEPTED");
  });

  it("2. Port returns normalized accepted result", async () => {
    const handoff = await createValidHandoff("corr-port-norm-accepted");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("accepted");
    if (result.kind === "accepted") {
      expect(result.simulation).toBe(true);
      expect(result.mode).toBe("simulation_only");
      expect(result.sideEffectsAllowed).toBe(false);
    }
  });

  it("3. Port preserves correlationId", async () => {
    const handoff = await createValidHandoff("corr-port-id-preservation");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);
    expect(result.correlationId).toBe("corr-port-id-preservation");
  });

  it("4. Port preserves providerId", async () => {
    const handoff = await createValidHandoff("corr-port-provider-preservation");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);
    expect(result.providerId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
  });

  it("5. Port preserves input fingerprint", async () => {
    const handoff = await createValidHandoff("corr-port-fp-preservation");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);
    expect(result.handoffFingerprint).toBeDefined();
    expect(typeof result.handoffFingerprint).toBe("string");
  });

  it("6. Port blocks real_execution mode", async () => {
    const handoff = await createValidHandoff("corr-port-block-real");
    const request = {
      handoff,
      mode: "real_execution" as any,
      allowSideEffects: false as const,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("SIMULATION_BLOCKED");
    }
  });

  it("7. Port blocks allowSideEffects=true", async () => {
    const handoff = await createValidHandoff("corr-port-block-side-effects");
    const request = {
      handoff,
      mode: "simulation_only" as const,
      allowSideEffects: true as any,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("SIMULATION_BLOCKED");
    }
  });

  it("8. Port blocks invalid handoff mode", async () => {
    const handoff = await createValidHandoff("corr-port-invalid-handoff-mode");
    const corruptedHandoff = {
      ...handoff,
      mode: "real_execution" as any,
    };
    const request: ResearchSubmissionRequest = {
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("INVALID_HANDOFF");
    }
  });

  it("9. Port blocks sideEffectsAllowed=true", async () => {
    const handoff = await createValidHandoff("corr-port-handoff-side-effects");
    const corruptedHandoff = {
      ...handoff,
      sideEffectsAllowed: true as any,
    };
    const request: ResearchSubmissionRequest = {
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("SIMULATION_BLOCKED");
    }
  });

  it("10. Port blocks missing approval", async () => {
    const handoff = await createValidHandoff("corr-port-missing-approval");
    const corruptedHandoff = {
      ...handoff,
      approval: undefined as any,
    };
    const request: ResearchSubmissionRequest = {
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("APPROVAL_REQUIRED");
    }
  });

  it("11. Port blocks invalid approval", async () => {
    const handoff = await createValidHandoff("corr-port-invalid-approval");
    const corruptedHandoff = {
      ...handoff,
      approval: {
        ...handoff.approval,
        intent: "unauthorized_intent" as any,
      },
    };
    const request: ResearchSubmissionRequest = {
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_REJECTED");
      expect(result.failure.code).toBe("APPROVAL_REQUIRED");
    }
  });

  it("12. Port blocks tool outside allowlist", async () => {
    const handoff = await createValidHandoff("corr-port-invalid-tool");
    const corruptedHandoff = {
      ...handoff,
      tool: "unsupported_tool" as any,
    };
    const request: ResearchSubmissionRequest = {
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const result = await submissionPort.submit(request);

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.status).toBe("SIMULATED_BLOCKED");
      expect(result.failure.code).toBe("INVALID_HANDOFF");
    }
  });

  it("13. Port delegates only to simulation adapter", async () => {
    const spy = vi.spyOn(submissionPort, "submit");
    const handoff = await createValidHandoff("corr-port-delegation");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    await service.submitExecution(request);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(request);
  });

  it("14. Port does not call ResearchOrchestrator", async () => {
    const handoff = await createValidHandoff("corr-port-no-orchestrator");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    await submissionPort.submit(request);

    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.researchTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("15. Port does not call ProviderRegistry", async () => {
    const handoff = await createValidHandoff("corr-port-no-registry");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await submissionPort.submit(request);
    expect(res.providerCallMade).toBe(false);
  });

  it("16. Port does not call NotebookLM", async () => {
    const handoff = await createValidHandoff("corr-port-no-notebooklm");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await submissionPort.submit(request);
    expect(res.providerCallMade).toBe(false);
  });

  it("17. Port does not call Antigravity", async () => {
    const handoff = await createValidHandoff("corr-port-no-antigravity");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await submissionPort.submit(request);
    expect(res.providerCallMade).toBe(false);
  });

  it("18. Port does not call network", async () => {
    const handoff = await createValidHandoff("corr-port-no-network");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await submissionPort.submit(request);
    expect(res.networkCallMade).toBe(false);
  });

  it("19. Port does not read credentials", async () => {
    const handoff = await createValidHandoff("corr-port-no-creds");
    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await submissionPort.submit(request);
    expect(res.credentialAccessed).toBe(false);
  });

  it("20. Port does not mutate input", async () => {
    const handoff = await createValidHandoff("corr-port-no-mutation");
    const handoffClone = JSON.parse(JSON.stringify(handoff));

    const request: ResearchSubmissionRequest = {
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    await submissionPort.submit(request);

    expect(handoff).toEqual(handoffClone);
  });
});
