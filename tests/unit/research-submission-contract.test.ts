/**
 * Research Submission Contract Tests (Phase 6.2)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - Contract shapes, safety flags, and boundary purity.
 * - JSON serialization safety, no functions or class instances in result envelopes.
 * - Zero real provider or network execution.
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

describe("RESEARCH SUBMISSION CONTRACT (PHASE 6.2)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let submissionPort: ResearchSubmissionPort;
  let mockPrisma: any;

  const validApproval: ExecutionApprovalProof = {
    approvedBy: "operator_security_officer",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-contract-002",
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

  async function createValidHandoff(correlationId = "corr-contract-1"): Promise<ResearchExecutionHandoff> {
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
      normalizedInput: { topicTitle: "Submission Contract Verification" },
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

  it("1. Accepted result satisfies exact contract", async () => {
    const handoff = await createValidHandoff("corr-contract-exact-acc");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.kind).toBe("accepted");
    if (res.kind === "accepted") {
      expect(res.mode).toBe("simulation_only");
      expect(res.simulation).toBe(true);
      expect(res.status).toBe("SIMULATED_ACCEPTED");
      expect(res.correlationId).toBe("corr-contract-exact-acc");
      expect(res.providerId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
      expect(res.tool).toBe("research_create_workspace");
      expect(typeof res.submissionId).toBe("string");
      expect(typeof res.handoffFingerprint).toBe("string");
      expect(typeof res.createdAt).toBe("string");
    }
  });

  it("2. Rejected result satisfies exact contract", async () => {
    const handoff = await createValidHandoff("corr-contract-exact-rej");
    const corruptedHandoff = {
      ...handoff,
      approval: { ...handoff.approval, intent: "invalid_intent" as any },
    };

    const res = await submissionPort.submit({
      handoff: corruptedHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(res.mode).toBe("simulation_only");
      expect(res.simulation).toBe(true);
      expect(res.status).toBe("SIMULATED_REJECTED");
      expect(res.failure).toBeDefined();
      expect(res.failure.code).toBe("APPROVAL_REQUIRED");
      expect(typeof res.failure.message).toBe("string");
    }
  });

  it("3. All safety flags remain false", async () => {
    const handoff = await createValidHandoff("corr-contract-flags");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.sideEffectsAllowed).toBe(false);
    expect(res.providerCallMade).toBe(false);
    expect(res.networkCallMade).toBe(false);
    expect(res.credentialAccessed).toBe(false);
  });

  it("4. mode is always simulation_only", async () => {
    const handoff = await createValidHandoff("corr-contract-mode");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.mode).toBe("simulation_only");
  });

  it("5. simulation is always true", async () => {
    const handoff = await createValidHandoff("corr-contract-sim-true");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.simulation).toBe(true);
  });

  it("6. No raw input is returned", async () => {
    const handoff = await createValidHandoff("corr-contract-no-raw");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect((res as any).normalizedInput).toBeUndefined();
    expect((res as any).rawInput).toBeUndefined();
  });

  it("7. No secret is returned", async () => {
    const handoff = await createValidHandoff("corr-contract-no-secret");
    const handoffWithSecret = {
      ...handoff,
      approval: {
        ...handoff.approval,
        approvedBy: "operator Bearer leaked-secret-token",
      },
    };

    const res = await submissionPort.submit({
      handoff: handoffWithSecret,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("leaked-secret-token");
  });

  it("8. No path is returned", async () => {
    const handoff = await createValidHandoff("corr-contract-no-path");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("/etc/");
    expect(serialized).not.toContain("/var/");
  });

  it("9. No provider instance is returned", async () => {
    const handoff = await createValidHandoff("corr-contract-no-inst");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect((res as any).providerInstance).toBeUndefined();
    expect((res as any).adapter).toBeUndefined();
  });

  it("10. No shell command is returned", async () => {
    const handoff = await createValidHandoff("corr-contract-no-cmd");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect((res as any).command).toBeUndefined();
    expect((res as any).exec).toBeUndefined();
  });

  it("11. Failure code is allowlisted", async () => {
    const allowlist = new Set([
      "INVALID_HANDOFF",
      "APPROVAL_REQUIRED",
      "IDEMPOTENCY_CONFLICT",
      "CAPABILITY_UNSUPPORTED",
      "PERSISTENCE_UNAVAILABLE",
      "SIMULATION_BLOCKED",
    ]);

    const handoff = await createValidHandoff("corr-contract-failure-code");
    const res = await submissionPort.submit({
      handoff: { ...handoff, mode: "invalid_mode" as any },
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(allowlist.has(res.failure.code)).toBe(true);
    }
  });

  it("12. Failure message is sanitized", async () => {
    const handoff = await createValidHandoff("corr-contract-sanitized-msg");
    const res = await submissionPort.submit({
      handoff: {
        ...handoff,
        approval: {
          ...handoff.approval,
          approvedBy: "operator Bearer token12345",
          intent: "invalid" as any,
        },
      },
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.kind).toBe("rejected");
    if (res.kind === "rejected") {
      expect(res.failure.message).not.toContain("token12345");
    }
  });

  it("13. submissionId remains deterministic", async () => {
    const handoff = await createValidHandoff("corr-contract-det-sub-id");
    const res1 = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const res2 = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res1.submissionId).toBe(res2.submissionId);
  });

  it("14. Replay reuses submissionId", async () => {
    const handoff = await createValidHandoff("corr-contract-replay-id");
    const res1 = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });
    const res2 = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res1.status).toBe("SIMULATED_ACCEPTED");
    expect(res2.status).toBe("SIMULATED_REPLAY");
    expect(res2.submissionId).toBe(res1.submissionId);
  });

  it("15. Conflict does not overwrite original", async () => {
    const handoff = await createValidHandoff("corr-contract-conflict-safe");
    await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const beforeSnapshot = await persistencePort.getExecutionByCorrelationId("corr-contract-conflict-safe");

    const conflictingHandoff = {
      ...handoff,
      inputFingerprint: "conflicting-fingerprint",
    };

    const conflictRes = await submissionPort.submit({
      handoff: conflictingHandoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(conflictRes.kind).toBe("rejected");
    const afterSnapshot = await persistencePort.getExecutionByCorrelationId("corr-contract-conflict-safe");
    expect(afterSnapshot).toEqual(beforeSnapshot);
  });

  it("16. Result is JSON-serializable", async () => {
    const handoff = await createValidHandoff("corr-contract-json");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const json = JSON.stringify(res);
    expect(JSON.parse(json)).toEqual(res);
  });

  it("17. Result has no functions", async () => {
    const handoff = await createValidHandoff("corr-contract-no-fn");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    for (const key of Object.keys(res)) {
      expect(typeof (res as any)[key]).not.toBe("function");
    }
  });

  it("18. Result has no class instances", async () => {
    const handoff = await createValidHandoff("corr-contract-no-class");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect(res.constructor.name).toBe("Object");
  });

  it("19. Result has no process.env", async () => {
    const handoff = await createValidHandoff("corr-contract-no-env");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toContain("NODE_ENV");
    expect(serialized).not.toContain("process.env");
  });

  it("20. Result has no network handles", async () => {
    const handoff = await createValidHandoff("corr-contract-no-handles");
    const res = await submissionPort.submit({
      handoff,
      mode: "simulation_only",
      allowSideEffects: false,
    });

    expect((res as any).socket).toBeUndefined();
    expect((res as any).stream).toBeUndefined();
  });
});
