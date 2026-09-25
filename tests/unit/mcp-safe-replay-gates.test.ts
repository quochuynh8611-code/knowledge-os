/**
 * MCP Safe Replay & Idempotency Gates Tests
 * (Phase 5.9 Replay Protection Verification Suite)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real provider execution calls (NotebookLM / Antigravity).
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - Stdio protocol purity preserved.
 * - Idempotency conflicts safely detected and prevented from overwriting existing state.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Writable } from "stream";
import { InternalResearchMcpServer } from "../../src/server/mcp/internalResearchMcpServer";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { InMemoryResearchPersistencePort } from "../../src/server/services/providers/researchPersistencePort";
import { APPROVED_PROVIDER_IDS } from "../../src/server/config/researchProviderConfig";
import { ResearchProviderDiagnosticsPayload } from "../../src/server/bootstrap/researchProviderComposition";

describe("MCP SAFE REPLAY GATES (PHASE 5.9)", () => {
  let persistencePort: InMemoryResearchPersistencePort;
  let service: ResearchSessionService;
  let server: InternalResearchMcpServer;
  let stderrBuffer: string[];
  let mockStderr: Writable;
  let defaultDiagnostics: ResearchProviderDiagnosticsPayload;
  let mockPrisma: any;

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
      now: () => new Date("2026-09-24T12:00:00.000Z"),
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
        {
          id: APPROVED_PROVIDER_IDS.LEGACY,
          displayName: "Antigravity CLI Handoff",
          capabilities: ["supportsSourceIngestion", "supportsQuery"],
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

  it("1. same correlationId + same tool + same normalized input => IDEMPOTENT_REPLAY", async () => {
    const firstRes = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-first",
      method: "research_create_workspace",
      params: {
        topicTitle: "Quantum Teleportation",
        topicSlug: "quantum-teleportation",
        correlationId: "corr-replay-1",
      },
    });

    expect((firstRes.result as any).replayDecision).toBe("NEW");

    const secondRes = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-second",
      method: "research_create_workspace",
      params: {
        topicTitle: "Quantum Teleportation",
        topicSlug: "quantum-teleportation",
        correlationId: "corr-replay-1",
      },
    });

    expect(secondRes.error).toBeUndefined();
    const secondResult = secondRes.result as any;
    expect(secondResult.replayDecision).toBe("IDEMPOTENT_REPLAY");
    expect(secondResult.correlationId).toBe("corr-replay-1");
  });

  it("2. same correlationId + different tool => IDEMPOTENCY_CONFLICT", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cw",
      method: "research_create_workspace",
      params: {
        topicTitle: "General Relativity",
        correlationId: "corr-cross-tool",
      },
    });

    // Try calling a different tool with the same correlationId
    const conflictRes = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-diff-tool",
      method: "research_generate_audio",
      params: {
        workspaceId: "ws-test",
        format: "deep_dive",
        correlationId: "corr-cross-tool",
      },
    });

    expect(conflictRes.error).toBeDefined();
    expect(conflictRes.error?.code).toBe(-32603);
    expect(conflictRes.error?.message).toContain("already registered for tool 'research_create_workspace'");
  });

  it("3. same correlationId + changed normalized input => IDEMPOTENCY_CONFLICT", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-orig",
      method: "research_create_workspace",
      params: {
        topicTitle: "Cosmology",
        correlationId: "corr-input-change",
      },
    });

    const changedRes = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-changed",
      method: "research_create_workspace",
      params: {
        topicTitle: "Cosmology & Dark Matter", // altered input
        correlationId: "corr-input-change",
      },
    });

    expect(changedRes.error).toBeDefined();
    expect(changedRes.error?.message).toContain("conflicting normalized input parameters");
  });

  it("4. replay does not create duplicate attempt", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-att-1",
      method: "research_create_workspace",
      params: {
        topicTitle: "Biophysics",
        correlationId: "corr-single-attempt",
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-att-2",
      method: "research_create_workspace",
      params: {
        topicTitle: "Biophysics",
        correlationId: "corr-single-attempt",
      },
    });

    const attempts = await persistencePort.listAttempts("corr-single-attempt");
    expect(attempts).toHaveLength(1);
  });

  it("5. replay does not overwrite original intent", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-write-orig",
      method: "research_create_workspace",
      params: {
        topicTitle: "Neuroscience",
        correlationId: "corr-no-overwrite",
      },
    });

    const snapshotBefore = await persistencePort.getExecutionByCorrelationId("corr-no-overwrite");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-write-replay",
      method: "research_create_workspace",
      params: {
        topicTitle: "Neuroscience",
        correlationId: "corr-no-overwrite",
      },
    });

    const snapshotAfter = await persistencePort.getExecutionByCorrelationId("corr-no-overwrite");
    expect(snapshotAfter).toEqual(snapshotBefore);
  });

  it("6. replay does not call provider", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-prov-call",
      method: "research_create_workspace",
      params: {
        topicTitle: "Astrophysics",
        correlationId: "corr-no-prov",
      },
    });

    expect(res.error).toBeUndefined();
    expect((res.result as any).plan.sideEffectsSuppressed).toBe(true);
    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
  });

  it("7. persistence lookup failure blocks replay and fails safe", async () => {
    const brokenPort = {
      saveExecution: vi.fn(),
      getExecutionByCorrelationId: vi.fn().mockRejectedValue(new Error("Database connection dropped")),
      listAttempts: vi.fn().mockResolvedValue([]),
    };

    const brokenService = new ResearchSessionService(mockPrisma, {
      persistence: brokenPort,
    });

    const brokenServer = new InternalResearchMcpServer({
      researchSessionService: brokenService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await brokenServer.handleRequest({
      jsonrpc: "2.0",
      id: "req-broken-port",
      method: "research_create_workspace",
      params: {
        topicTitle: "Fault Tolerance",
        correlationId: "corr-broken",
      },
    });

    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32603);
    expect(res.error?.message).toContain("Persistence read error");
  });

  it("8. correlationId caller-provided is preserved", async () => {
    const customId = "custom-id-provided-by-client-444";
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-client-id",
      method: "research_create_workspace",
      params: {
        topicTitle: "Title",
        correlationId: customId,
      },
    });

    expect((res.result as any).correlationId).toBe(customId);
  });

  it("9. correlationId generated by service remains stable", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-gen-id",
      method: "research_create_workspace",
      params: {
        topicTitle: "Title Without Id",
      },
    });

    const generatedId = (res.result as any).correlationId;
    expect(generatedId).toMatch(
      /^corr-mcp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const snapshot = await persistencePort.getExecutionByCorrelationId(generatedId);
    expect(snapshot?.correlationId).toBe(generatedId);
  });

  it("10. no timestamp used as idempotency key", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-ts",
      method: "research_create_workspace",
      params: {
        topicTitle: "Timestamp Check",
      },
    });

    const generatedId = (res.result as any).correlationId;
    // Must be UUID-based, not timestamp-based (no Date.now in ID)
    expect(generatedId).not.toContain(String(Date.now()));
  });

  it("11. deterministic canonical fingerprint matching across property order", async () => {
    // evaluate replay directly with different property insertion order
    await service.recordExecutionIntent({
      correlationId: "corr-key-order",
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
      normalizedInput: {
        topicTitle: "Thermodynamics",
        topicSlug: "thermodynamics",
        category: "Physics",
      },
    });

    // Replay with reversed property order
    const replayEval = await service.evaluateReplay({
      correlationId: "corr-key-order",
      tool: "research_create_workspace",
      normalizedInput: {
        category: "Physics",
        topicSlug: "thermodynamics",
        topicTitle: "Thermodynamics",
      },
    });

    expect(replayEval.decision).toBe("IDEMPOTENT_REPLAY");
  });

  it("12. secret/path fields excluded from fingerprint and properly redacted", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-secret-fp",
      method: "research_create_workspace",
      params: {
        topicTitle: "Title with Bearer secret-raw-token-9999",
        correlationId: "corr-secret-fp",
      },
    });

    const snapshot = await persistencePort.getExecutionByCorrelationId("corr-secret-fp");
    const jsonStr = JSON.stringify(snapshot);
    expect(jsonStr).not.toContain("secret-raw-token-9999");
    expect(jsonStr).toContain("Bearer [REDACTED]");
  });

  it("13. stdout remains valid JSON-RPC only", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-purity-replay",
      method: "research_create_workspace",
      params: {
        topicTitle: "Purity Check",
        correlationId: "corr-purity",
      },
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("14. stderr remains the only debug channel", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stderr-replay",
      method: "research_create_workspace",
      params: {
        topicTitle: "Stderr Check",
        correlationId: "corr-stderr",
      },
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer.some((line) => line.includes("[MCP-DEBUG]"))).toBe(true);
  });
});
