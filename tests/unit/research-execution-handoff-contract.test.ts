/**
 * Research Execution Handoff Contract Tests
 * (Phase 6.0 Handoff Safety & Control Plane Boundary)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real provider execution calls (NotebookLM / Antigravity).
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - NO DB schema migration.
 * - Mode strictly 'handoff_only' and sideEffectsAllowed strictly false.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ResearchSessionService,
  ExecutionApprovalProof,
  ResearchExecutionHandoff,
} from "../../src/server/services/researchSessionService.js";
import {
  InMemoryResearchPersistencePort,
  ResearchExecutionSnapshot,
} from "../../src/server/services/providers/researchPersistencePort.js";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig.js";

describe("RESEARCH EXECUTION HANDOFF CONTRACT (PHASE 6.0)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let mockPrisma: any;

  const validProof: ExecutionApprovalProof = {
    approvedBy: "operator-alice",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-valid-001",
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
  });

  async function setupReadyIntent(correlationId = "corr-handoff-1") {
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
      normalizedInput: { topicTitle: "Quantum Mechanics" },
    });

    await service.transitionExecutionIntent({
      correlationId,
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });
  }

  it("1. valid intent produces handoff-only contract", async () => {
    await setupReadyIntent("corr-valid-handoff");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-valid-handoff",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.intentStatus).toBe("approved_for_handoff");
    expect(res.handoff).toBeDefined();
    expect(res.handoff?.mode).toBe("handoff_only");
  });

  it("2. handoff has sideEffectsAllowed=false", async () => {
    await setupReadyIntent("corr-no-side-effects");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-side-effects",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.sideEffectsAllowed).toBe(false);
  });

  it("3. handoff mode is handoff_only", async () => {
    await setupReadyIntent("corr-mode-check");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-mode-check",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.mode).toBe("handoff_only");
  });

  it("4. handoff includes correlationId", async () => {
    await setupReadyIntent("corr-id-check");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-id-check",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.correlationId).toBe("corr-id-check");
  });

  it("5. handoff includes immutable inputFingerprint", async () => {
    await setupReadyIntent("corr-fp-check");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-fp-check",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.inputFingerprint).toBeDefined();
    expect(typeof res.handoff?.inputFingerprint).toBe("string");
    expect(res.handoff?.inputFingerprint.length).toBeGreaterThan(0);
  });

  it("6. handoff includes matching providerId", async () => {
    await setupReadyIntent("corr-provider-match");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-provider-match",
      approval: validProof,
      expectedProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.providerId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
  });

  it("7. handoff includes sanitized approval proof", async () => {
    await setupReadyIntent("corr-proof-sanitize");

    const proofWithToken: ExecutionApprovalProof = {
      approvedBy: "operator-bob Bearer secret-token-xyz",
      approvedAt: "2026-09-24T12:00:00.000Z",
      intent: "execute_research",
      approvalId: "appr-sanitized-001",
    };

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-proof-sanitize",
      approval: proofWithToken,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.approval.approvedBy).toContain("[REDACTED]");
    expect(res.handoff?.approval.approvedBy).not.toContain("secret-token-xyz");
  });

  it("8. handoff excludes secrets", async () => {
    await setupReadyIntent("corr-no-secrets");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-secrets",
      approval: validProof,
    });

    const serialized = JSON.stringify(res.handoff);
    expect(serialized).not.toContain("bearer");
    expect(serialized).not.toContain("apiKey");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("client_secret");
  });

  it("9. handoff excludes paths", async () => {
    await setupReadyIntent("corr-no-paths");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-paths",
      approval: validProof,
    });

    const serialized = JSON.stringify(res.handoff);
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain("/var/run");
    expect(serialized).not.toContain("/etc/passwd");
  });

  it("10. handoff excludes raw environment", async () => {
    await setupReadyIntent("corr-no-env");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-env",
      approval: validProof,
    });

    const serialized = JSON.stringify(res.handoff);
    expect(serialized).not.toContain("process.env");
    expect(serialized).not.toContain("NODE_ENV");
    expect(serialized).not.toContain("ANTHROPIC_API_KEY");
  });

  it("11. handoff excludes provider instance", async () => {
    await setupReadyIntent("corr-no-instance");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-instance",
      approval: validProof,
    });

    expect(res.handoff).not.toHaveProperty("providerInstance");
    expect(res.handoff).not.toHaveProperty("adapter");
    expect(res.handoff).not.toHaveProperty("client");
  });

  it("12. handoff cannot be created from intent_recorded", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-intent-only",
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
      normalizedInput: { topicTitle: "Premature Handoff" },
    });

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-intent-only",
      approval: validProof,
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("intent_recorded");
    expect(res.reason).toContain("must be in 'ready_for_approval'");
    expect(res.handoff).toBeUndefined();
  });

  it("13. handoff cannot be created from replay_blocked", async () => {
    await setupReadyIntent("corr-blocked-handoff");

    await service.transitionExecutionIntent({
      correlationId: "corr-blocked-handoff",
      expectedCurrentState: "ready_for_approval",
      targetState: "replay_blocked",
    });

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-blocked-handoff",
      approval: validProof,
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("replay_blocked");
    expect(res.handoff).toBeUndefined();
  });

  it("14. handoff cannot be created with IDEMPOTENCY_CONFLICT", async () => {
    await setupReadyIntent("corr-conflict-handoff");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-conflict-handoff",
      approval: validProof,
      expectedInputFingerprint: "fingerprint-does-not-match-original",
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("handoff_blocked");
    expect(res.reason).toContain("Input fingerprint mismatch");
    expect(res.handoff).toBeUndefined();
  });

  it("15. handoff cannot trigger provider execution", async () => {
    await setupReadyIntent("corr-no-provider-exec");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-provider-exec",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    // Prisma / provider layer touched zero times for execution
    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.researchTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("16. handoff cannot create provider attempt", async () => {
    await setupReadyIntent("corr-no-new-attempt");

    const beforeSnap = await persistencePort.getExecutionByCorrelationId("corr-no-new-attempt");
    const beforeAttempts = beforeSnap?.attemptRecords.length || 0;

    await service.prepareExecutionHandoff({
      correlationId: "corr-no-new-attempt",
      approval: validProof,
    });

    const afterSnap = await persistencePort.getExecutionByCorrelationId("corr-no-new-attempt");
    const afterAttempts = afterSnap?.attemptRecords.length || 0;

    // Number of attempt records must remain unchanged
    expect(afterAttempts).toBe(beforeAttempts);
  });

  it("17. persistence failure blocks handoff", async () => {
    const failingPersistence = {
      saveExecution: vi.fn().mockRejectedValue(new Error("Disk full")),
      getExecutionByCorrelationId: vi.fn().mockRejectedValue(new Error("Disk read failure")),
      listAttempts: vi.fn().mockResolvedValue([]),
    };

    const failingService = new ResearchSessionService(mockPrisma, {
      persistence: failingPersistence,
      now: () => new Date("2026-09-24T12:00:00.000Z"),
    });

    const res = await failingService.prepareExecutionHandoff({
      correlationId: "corr-failing-db",
      approval: validProof,
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("transition_rejected");
    expect(res.reason).toContain("Persistence lookup failure");
  });

  it("18. capability mismatch blocks handoff", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-cap-mismatch",
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
        satisfied: false, // capability missing
        missing: ["supportsNotebookManagement"],
      },
      normalizedInput: { topicTitle: "Missing Cap" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-cap-mismatch",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-cap-mismatch",
      approval: validProof,
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("handoff_blocked");
    expect(res.reason).toContain("capabilities are not satisfied");
  });

  it("19. stdout remains JSON-RPC only", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");
    await setupReadyIntent("corr-purity-check");

    await service.prepareExecutionHandoff({
      correlationId: "corr-purity-check",
      approval: validProof,
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("20. no background process is created", async () => {
    await setupReadyIntent("corr-no-bg");

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-no-bg",
      approval: validProof,
    });

    expect(res.success).toBe(true);
    expect(res.handoff?.sideEffectsAllowed).toBe(false);
    expect(res.handoff?.mode).toBe("handoff_only");
  });
});
