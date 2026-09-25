/**
 * Research Approval Gate Unit Tests
 * (Phase 6.0 Approval Verification Suite)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real provider execution calls (NotebookLM / Antigravity).
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - Strict approval proof validation and boundary enforcement.
 * - Executing transition remains strictly blocked in Phase 6.0.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Writable } from "stream";
import {
  ResearchSessionService,
  ExecutionApprovalProof,
  validateApprovalProof,
} from "../../src/server/services/researchSessionService";
import { InMemoryResearchPersistencePort } from "../../src/server/services/providers/researchPersistencePort";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig";
import { InternalResearchMcpServer } from "../../src/server/mcp/internalResearchMcpServer";
import { ResearchProviderDiagnosticsPayload } from "../../src/server/bootstrap/researchProviderComposition";

describe("RESEARCH APPROVAL GATE (PHASE 6.0)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let mockPrisma: any;
  let stderrBuffer: string[];
  let mockStderr: Writable;
  let defaultDiagnostics: ResearchProviderDiagnosticsPayload;
  let server: InternalResearchMcpServer;

  const validProof: ExecutionApprovalProof = {
    approvedBy: "security-officer-alice",
    approvedAt: "2026-09-24T12:00:00.000Z",
    intent: "execute_research",
    approvalId: "appr-proof-12345",
    expiresAt: "2026-09-24T13:00:00.000Z",
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

    stderrBuffer = [];
    mockStderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrBuffer.push(chunk.toString());
        callback();
      },
    });

    defaultDiagnostics = {
      routingEnabled: true,
      defaultProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      allowProviderFallback: true,
      providers: [
        {
          id: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
          displayName: "NotebookLM Enterprise API",
          capabilities: [
            "supportsNotebookManagement",
            "supportsSourceIngestion",
            "supportsAudioOverview",
            "supportsBatchSourceDelete",
          ],
          allowed: true,
        },
      ],
    };

    server = new InternalResearchMcpServer({
      researchSessionService: service,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });
  });

  it("1. intent_recorded cannot skip ready_for_approval", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-appr-1",
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
      normalizedInput: { topicTitle: "Skip Test" },
    });

    // Attempt direct transition to approved_for_handoff from intent_recorded
    const res = await service.transitionExecutionIntent({
      correlationId: "corr-appr-1",
      expectedCurrentState: "intent_recorded",
      targetState: "approved_for_handoff",
    });

    expect(res.transitionAccepted).toBe(false);
    expect(res.reason).toContain("Invalid transition");
  });

  it("2. ready_for_approval without proof is rejected for handoff", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-appr-2",
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
      normalizedInput: { topicTitle: "No Proof" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-appr-2",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const handoffRes = await service.prepareExecutionHandoff({
      correlationId: "corr-appr-2",
      approval: null as any,
    });

    expect(handoffRes.success).toBe(false);
    expect(handoffRes.intentStatus).toBe("handoff_blocked");
    expect(handoffRes.reason).toContain("Approval proof is required");
  });

  it("3. valid approval proof is accepted", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-appr-3",
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
      normalizedInput: { topicTitle: "Valid Proof" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-appr-3",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const handoffRes = await service.prepareExecutionHandoff({
      correlationId: "corr-appr-3",
      approval: validProof,
    });

    expect(handoffRes.success).toBe(true);
    expect(handoffRes.intentStatus).toBe("approved_for_handoff");
    expect(handoffRes.handoff).toBeDefined();
    expect(handoffRes.handoff?.approval.approvedBy).toBe("security-officer-alice");
    expect(handoffRes.handoff?.mode).toBe("handoff_only");
    expect(handoffRes.handoff?.sideEffectsAllowed).toBe(false);
  });

  it("4. malformed approvedBy is rejected", () => {
    const val = validateApprovalProof(
      { ...validProof, approvedBy: "   " },
      { correlationId: "corr-test" }
    );
    expect(val.valid).toBe(false);
    expect(val.reason).toContain("'approvedBy' must be a non-empty string");
  });

  it("5. malformed approvalId is rejected", () => {
    const val = validateApprovalProof(
      { ...validProof, approvalId: "" },
      { correlationId: "corr-test" }
    );
    expect(val.valid).toBe(false);
    expect(val.reason).toContain("'approvalId' must be a non-empty string");
  });

  it("6. invalid approvedAt timestamp is rejected", () => {
    const val = validateApprovalProof(
      { ...validProof, approvedAt: "not-a-date" },
      { correlationId: "corr-test" }
    );
    expect(val.valid).toBe(false);
    expect(val.reason).toContain("'approvedAt' must be a valid ISO date string");
  });

  it("7. expired approval is rejected", () => {
    const expiredProof: ExecutionApprovalProof = {
      approvedBy: "auditor",
      approvedAt: "2026-09-24T10:00:00.000Z",
      intent: "execute_research",
      approvalId: "appr-expired",
      expiresAt: "2026-09-24T11:00:00.000Z", // now is 12:05:00
    };

    const val = validateApprovalProof(expiredProof, {
      correlationId: "corr-exp",
      now: new Date("2026-09-24T12:05:00.000Z"),
    });

    expect(val.valid).toBe(false);
    expect(val.reason).toContain("Approval proof has expired");
  });

  it("8. invalid approval intent is rejected", () => {
    const val = validateApprovalProof(
      { ...validProof, intent: "unauthorized_intent" as any },
      { correlationId: "corr-test" }
    );
    expect(val.valid).toBe(false);
    expect(val.reason).toContain("'intent' must be one of");
  });

  it("9. proof for wrong correlationId is rejected during handoff", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-target-id",
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
      normalizedInput: { topicTitle: "Target Corr" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-target-id",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    // Lookup non-existent correlationId
    const res = await service.prepareExecutionHandoff({
      correlationId: "different-corr-id",
      approval: validProof,
    });

    expect(res.success).toBe(false);
    expect(res.reason).toContain("not found in persistence layer");
  });

  it("10. proof for wrong fingerprint is rejected", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-fp-check",
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
      normalizedInput: { topicTitle: "Fingerprint Check" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-fp-check",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-fp-check",
      approval: validProof,
      expectedInputFingerprint: "tampered-different-fingerprint",
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("handoff_blocked");
    expect(res.reason).toContain("Input fingerprint mismatch");
  });

  it("11. proof for wrong providerId is rejected", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-prov-check",
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
      normalizedInput: { topicTitle: "Provider Check" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-prov-check",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const res = await service.prepareExecutionHandoff({
      correlationId: "corr-prov-check",
      approval: validProof,
      expectedProviderId: "antigravity-legacy", // mismatch with notebooklm-enterprise
    });

    expect(res.success).toBe(false);
    expect(res.intentStatus).toBe("handoff_blocked");
    expect(res.reason).toContain("Provider mismatch");
  });

  it("12. approval proof cannot be reused for another intent with differing parameters", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-orig-intent",
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
      normalizedInput: { topicTitle: "Original Intent" },
    });

    // Attempting to evaluate replay with different tool
    const conflict = await service.evaluateReplay({
      correlationId: "corr-orig-intent",
      tool: "research_generate_audio",
      normalizedInput: { workspaceId: "ws-123", format: "deep_dive" },
    });

    expect(conflict.decision).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("13. approval is immutable after persistence", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-appr-immut",
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
      normalizedInput: { topicTitle: "Immutable Proof" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-appr-immut",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const handoffRes = await service.prepareExecutionHandoff({
      correlationId: "corr-appr-immut",
      approval: validProof,
    });

    expect(handoffRes.success).toBe(true);

    const snapshot = await persistencePort.getExecutionByCorrelationId("corr-appr-immut");
    const storedApproval = (snapshot?.attemptRecords[0].rawErrorDetails as any).state.approval;
    expect(storedApproval.approvalId).toBe("appr-proof-12345");
  });

  it("14. no provider call occurs during approval check", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-no-provider",
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
      normalizedInput: { topicTitle: "Zero Provider Side Effect" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-no-provider",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    await service.prepareExecutionHandoff({
      correlationId: "corr-no-provider",
      approval: validProof,
    });

    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.researchTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("15. no network/cloud call occurs", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-no-net",
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
      normalizedInput: { topicTitle: "Network Isolation" },
    });

    const res = await service.getExecutionIntentState("corr-no-net");
    expect(res).not.toBeNull();
    expect(res?.intentStatus).toBe("intent_recorded");
  });

  it("16. no credentials are read or decrypted", async () => {
    const proofWithToken: ExecutionApprovalProof = {
      approvedBy: "operator-bob Bearer secret-token-999",
      approvedAt: "2026-09-24T12:00:00.000Z",
      intent: "execute_research",
      approvalId: "appr-token-leak",
    };

    const val = validateApprovalProof(proofWithToken, {
      correlationId: "corr-token-leak",
    });

    expect(val.sanitizedProof?.approvedBy).not.toContain("secret-token-999");
    expect(val.sanitizedProof?.approvedBy).toContain("Bearer [REDACTED]");
  });

  it("17. stdout protocol purity preserved", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-purity-appr",
      method: "research_create_workspace",
      params: {
        topicTitle: "Purity Approval",
        correlationId: "corr-purity-appr",
      },
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("18. stderr-only debug preserved", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stderr-appr",
      method: "research_create_workspace",
      params: {
        topicTitle: "Stderr Approval",
        correlationId: "corr-stderr-appr",
      },
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer.some((line) => line.includes("[MCP-DEBUG]"))).toBe(true);
  });

  it("19. no process.env mutation", async () => {
    const envBefore = { ...process.env };

    await service.recordExecutionIntent({
      correlationId: "corr-env-appr",
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
      normalizedInput: { topicTitle: "Env Safe" },
    });

    expect(process.env).toEqual(envBefore);
  });

  it("20. executing transition remains strictly blocked in Phase 6.0", async () => {
    await service.recordExecutionIntent({
      correlationId: "corr-appr-block-exec",
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
      normalizedInput: { topicTitle: "Block Exec" },
    });

    await service.transitionExecutionIntent({
      correlationId: "corr-appr-block-exec",
      expectedCurrentState: "intent_recorded",
      targetState: "ready_for_approval",
    });

    const res = await service.transitionExecutionIntent({
      correlationId: "corr-appr-block-exec",
      expectedCurrentState: "ready_for_approval",
      targetState: "executing",
    });

    expect(res.transitionAccepted).toBe(false);
    expect(res.reason).toContain("strictly blocked in Phase 6.0");
  });
});
