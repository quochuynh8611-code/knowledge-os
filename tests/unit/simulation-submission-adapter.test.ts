/**
 * Simulation Submission Adapter Unit Tests (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Adapter implements ResearchSubmissionPort.
 * - Adapter acts as a safe bridge to ExecutionSimulationProvider.
 * - Zero real provider or network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimulationSubmissionAdapter } from "../../src/server/services/providers/simulationSubmissionAdapter.js";
import {
  ExecutionSimulationProvider,
  InMemoryExecutionSimulationProvider,
  SimulatedSubmissionResult,
} from "../../src/server/services/providers/executionSimulationStub.js";
import {
  ResearchSubmissionRequest,
  ResearchSubmissionPort,
} from "../../src/server/services/providers/types.js";
import {
  ResearchExecutionHandoff,
  ExecutionApprovalProof,
} from "../../src/server/services/researchSessionService.js";
import { InMemoryResearchPersistencePort } from "../../src/server/services/providers/researchPersistencePort.js";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig.js";

describe("SIMULATION SUBMISSION ADAPTER (PHASE 6.2)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let simulationProvider: InMemoryExecutionSimulationProvider;
  let adapter: SimulationSubmissionAdapter;

  const validApproval: ExecutionApprovalProof = {
    approvedBy: "security_auditor_adapter",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-adapter-01",
  };

  const sampleHandoff: ResearchExecutionHandoff = {
    handoffId: "handoff-adapter-test",
    correlationId: "corr-adapter-test",
    providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
    tool: "research_create_workspace",
    normalizedInput: { topicTitle: "Adapter Unit Testing" },
    inputFingerprint: JSON.stringify({
      tool: "research_create_workspace",
      input: { topicTitle: "Adapter Unit Testing" },
    }),
    approval: validApproval,
    requestedAt: "2026-09-24T12:00:00.000Z",
    mode: "handoff_only",
    sideEffectsAllowed: false,
  };

  beforeEach(async () => {
    persistencePort = new InMemoryResearchPersistencePort();
    await persistencePort.saveExecution({
      correlationId: "corr-adapter-test",
      providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      workspaceId: "ws-adapter-test",
      sourceCount: 0,
      audioJobId: null,
      attemptRecords: [
        {
          attemptId: "att-adapter-test",
          providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
          status: "IN_PROGRESS",
          startedAt: "2026-09-24T12:00:00.000Z",
          completedAt: "2026-09-24T12:00:00.000Z",
          rawErrorDetails: {
            tool: "research_create_workspace",
            inputFingerprint: JSON.stringify({
              tool: "research_create_workspace",
              input: { topicTitle: "Adapter Unit Testing" },
            }),
            capabilityCheck: { satisfied: true },
          },
        },
      ],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
      terminalStatus: "IN_PROGRESS",
    });

    simulationProvider = new InMemoryExecutionSimulationProvider({
      persistence: persistencePort,
      now: () => new Date("2026-09-24T12:05:00.000Z"),
    });
    adapter = new SimulationSubmissionAdapter(simulationProvider);
  });

  it("1. Adapter implements ResearchSubmissionPort", () => {
    const port: ResearchSubmissionPort = adapter;
    expect(port).toBeDefined();
    expect(typeof port.submit).toBe("function");
  });

  it("2. Adapter calls simulation provider exactly once for new handoff", async () => {
    const spy = vi.spyOn(simulationProvider, "simulateSubmission");
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await adapter.submit(request);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(sampleHandoff);
    expect(res.kind).toBe("accepted");
  });

  it("3. Adapter returns replay without duplicate simulation", async () => {
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const firstRes = await adapter.submit(request);
    const secondRes = await adapter.submit(request);

    expect(firstRes.status).toBe("SIMULATED_ACCEPTED");
    expect(secondRes.status).toBe("SIMULATED_REPLAY");
    expect(secondRes.submissionId).toBe(firstRes.submissionId);
  });

  it("4. Adapter maps provider result correctly", async () => {
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await adapter.submit(request);

    expect(res.kind).toBe("accepted");
    if (res.kind === "accepted") {
      expect(res.mode).toBe("simulation_only");
      expect(res.simulation).toBe(true);
      expect(res.correlationId).toBe(sampleHandoff.correlationId);
      expect(res.providerId).toBe(sampleHandoff.providerId);
      expect(res.tool).toBe(sampleHandoff.tool);
    }
  });

  it("5. Adapter maps provider failure correctly", async () => {
    const failingProvider: ExecutionSimulationProvider = {
      simulateSubmission: vi.fn().mockResolvedValue({
        simulation: true,
        submissionId: "sim-sub-mock-fail",
        correlationId: "corr-fail",
        providerId: "test-provider",
        tool: "research_create_workspace",
        status: "SIMULATED_REJECTED",
        mode: "simulation_only",
        sideEffectsAllowed: false,
        providerCallMade: false,
        networkCallMade: false,
        credentialAccessed: false,
        handoffFingerprint: "fp-fail",
        createdAt: "2026-09-24T12:00:00.000Z",
        failure: {
          code: "CAPABILITY_UNSUPPORTED",
          message: "Capability not supported.",
        },
      } as SimulatedSubmissionResult),
    };

    const customAdapter = new SimulationSubmissionAdapter(failingProvider);
    const res = await customAdapter.submit({
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(res.status).toBe("SIMULATED_REJECTED");
      expect(res.failure.code).toBe("CAPABILITY_UNSUPPORTED");
      expect(res.failure.message).toBe("Capability not supported.");
    }
  });

  it("6. Adapter does not call real provider", async () => {
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    const res = await adapter.submit(request);

    expect(res.providerCallMade).toBe(false);
    expect(res.networkCallMade).toBe(false);
    expect(res.credentialAccessed).toBe(false);
  });

  it("7. Adapter rejects real_execution", async () => {
    const request = {
      handoff: sampleHandoff,
      mode: "real_execution" as any,
      allowSideEffects: false as const,
    };

    const res = await adapter.submit(request);

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(res.status).toBe("SIMULATED_BLOCKED");
      expect(res.failure.code).toBe("SIMULATION_BLOCKED");
    }
  });

  it("8. Adapter rejects allowSideEffects=true", async () => {
    const request = {
      handoff: sampleHandoff,
      mode: "simulation_only" as const,
      allowSideEffects: true as any,
    };

    const res = await adapter.submit(request);

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(res.status).toBe("SIMULATED_BLOCKED");
      expect(res.failure.code).toBe("SIMULATION_BLOCKED");
    }
  });

  it("9. Adapter does not mutate handoff", async () => {
    const clone = JSON.parse(JSON.stringify(sampleHandoff));
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    await adapter.submit(request);

    expect(sampleHandoff).toEqual(clone);
  });

  it("10. Adapter is safe with repeated calls", async () => {
    const request: ResearchSubmissionRequest = {
      handoff: sampleHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    };

    for (let i = 0; i < 5; i++) {
      const res = await adapter.submit(request);
      expect(res.kind).toBe("accepted");
    }
  });
});
