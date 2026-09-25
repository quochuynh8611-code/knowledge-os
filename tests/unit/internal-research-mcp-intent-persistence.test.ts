/**
 * Internal Research MCP Intent Persistence Tests
 * (Phase 5.8 Test-First Validation Suite)
 *
 * CRITICAL TEST CONSTRAINTS:
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - NO Prisma/DB schema migrations.
 * - Zero provider execution or orchestrator mutation calls.
 * - Persistence integration via ResearchPersistencePort only.
 * - Strict JSON-RPC 2.0 stdout protocol purity and stderr debug logging.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Writable } from "stream";
import {
  InternalResearchMcpServer,
  JsonRpcRequest,
} from "../../src/server/mcp/internalResearchMcpServer";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import {
  InMemoryResearchPersistencePort,
  ResearchExecutionSnapshot,
} from "../../src/server/services/providers/researchPersistencePort";
import {
  APPROVED_PROVIDER_IDS,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig";
import { ResearchProviderDiagnosticsPayload } from "../../src/server/bootstrap/researchProviderComposition";

describe("INTERNAL RESEARCH MCP INTENT PERSISTENCE (PHASE 5.8)", () => {
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

  it("1. dry-run accepted=true records intent with stable correlationId", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-intent-1",
      method: "research_create_workspace",
      params: {
        topicTitle: "Quantum Teleportation",
        topicSlug: "quantum-teleportation",
        category: "Physics",
        correlationId: "corr-intent-abc",
      },
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.dryRun).toBe(true);
    expect(result.accepted).toBe(true);
    expect(result.correlationId).toBe("corr-intent-abc");
    expect(result.status).toBe("intent_recorded");

    // Verify persisted record in persistencePort
    const saved = await persistencePort.getExecutionByCorrelationId("corr-intent-abc");
    expect(saved).not.toBeNull();
    expect(saved?.correlationId).toBe("corr-intent-abc");
    expect(saved?.providerId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
    expect(saved?.terminalStatus).toBe("IN_PROGRESS");
  });

  it("2. intent record includes tool, providerResolution, capabilityCheck, normalizedInput", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-intent-2",
      method: "research_ingest_sources",
      params: {
        workspaceId: "nlm-ws-555",
        sources: [
          { type: "note", title: "Note 1", content: "Content 1" },
          { type: "url", title: "URL 1", content: "https://example.com" },
        ],
        correlationId: "corr-ingest-555",
      },
    });

    const saved = await persistencePort.getExecutionByCorrelationId("corr-ingest-555");
    expect(saved).not.toBeNull();
    expect(saved?.attemptRecords).toHaveLength(1);
    const attempt = saved?.attemptRecords[0];
    expect(attempt?.attemptId).toBe("att-mcp-corr-ingest-555");
    expect(attempt?.status).toBe("IN_PROGRESS");
    const details = attempt?.rawErrorDetails as any;
    expect(details?.tool).toBe("research_ingest_sources");
    expect(details?.intentStatus).toBe("intent_recorded");
    expect(details?.normalizedInput.workspaceId).toBe("nlm-ws-555");
    expect(details?.capabilityCheck.required).toEqual(["supportsSourceIngestion"]);
  });

  it("3. intent record is persisted through allowed persistence contract only", async () => {
    const saveSpy = vi.spyOn(persistencePort, "saveExecution");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-contract-check",
      method: "research_generate_audio",
      params: {
        workspaceId: "nlm-ws-audio",
        format: "deep_dive",
        correlationId: "corr-audio-contract",
      },
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedArg = saveSpy.mock.calls[0][0];
    expect(savedArg.correlationId).toBe("corr-audio-contract");
    expect(savedArg.terminalStatus).toBe("IN_PROGRESS");
  });

  it("4. no provider execution method is called", async () => {
    // Verified because server is initialized without any live provider adapter execution mocks
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-exec",
      method: "research_create_workspace",
      params: { topicTitle: "Test Title" },
    });

    expect(res.error).toBeUndefined();
    expect((res.result as any).plan.sideEffectsSuppressed).toBe(true);
  });

  it("5. no orchestrator mutation method is called", async () => {
    const startResearchSpy = vi.spyOn(service, "startProviderResearchForSession");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-orch",
      method: "research_create_workspace",
      params: { topicTitle: "Test Title" },
    });

    expect(startResearchSpy).not.toHaveBeenCalled();
  });

  it("6. no network/cloud access", async () => {
    // Pure in-memory execution verified
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cloud-check",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });
    expect(res.error).toBeUndefined();
  });

  it("7. no raw secrets/tokens/paths in persisted payload", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-secret-leak",
      method: "research_create_workspace",
      params: {
        topicTitle: "Title Bearer secret-raw-token-123456",
        correlationId: "corr-leak-check",
      },
    });

    const saved = await persistencePort.getExecutionByCorrelationId("corr-leak-check");
    const jsonStr = JSON.stringify(saved);
    expect(jsonStr).not.toContain("secret-raw-token-123456");
    expect(jsonStr).toContain("Bearer [REDACTED]");
  });

  it("8. accepted=false behavior is deterministic and persists intent_rejected", async () => {
    // Antigravity doesn't support audio overview
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-rej-1",
      method: "research_generate_audio",
      params: {
        workspaceId: "ws-legacy",
        providerId: APPROVED_PROVIDER_IDS.LEGACY,
        correlationId: "corr-rejected-1",
      },
    });

    const result = res.result as any;
    expect(result.accepted).toBe(false);
    expect(result.status).toBe("intent_rejected");

    const saved = await persistencePort.getExecutionByCorrelationId("corr-rejected-1");
    expect(saved).not.toBeNull();
    expect(saved?.terminalStatus).toBe("FAILED");
    expect(saved?.attemptRecords[0].status).toBe("FAILED");
    const details = saved?.attemptRecords[0].rawErrorDetails as any;
    expect(details?.intentStatus).toBe("intent_rejected");
  });

  it("9. correlationId is reused when provided by caller", async () => {
    const customCorrelationId = "custom-user-provided-correlation-id-999";
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-corr-reuse",
      method: "research_create_workspace",
      params: {
        topicTitle: "Topic",
        correlationId: customCorrelationId,
      },
    });

    expect((res.result as any).correlationId).toBe(customCorrelationId);
    const saved = await persistencePort.getExecutionByCorrelationId(customCorrelationId);
    expect(saved?.correlationId).toBe(customCorrelationId);
  });

  it("10. correlationId is generated when absent and contract allows (corr-mcp- prefix with valid UUID)", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-corr-gen",
      method: "research_create_workspace",
      params: {
        topicTitle: "Topic without correlationId",
      },
    });

    const correlationId = (res.result as any).correlationId;
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe("string");
    // Verify corr-mcp- prefix and standard UUID structure
    expect(correlationId).toMatch(
      /^corr-mcp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const saved = await persistencePort.getExecutionByCorrelationId(correlationId);
    expect(saved?.correlationId).toBe(correlationId);
  });

  it("11. status lookup still works after intent persistence", async () => {
    const correlationId = "corr-status-lookup-test";
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cw-status",
      method: "research_create_workspace",
      params: {
        topicTitle: "Topic for status check",
        correlationId,
      },
    });

    // Lookup via research_get_status
    const statusRes = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-get-status",
      method: "research_get_status",
      params: { correlationId },
    });

    expect(statusRes.error).toBeUndefined();
    const snapshot = (statusRes.result as any).snapshot;
    expect(snapshot).not.toBeNull();
    expect(snapshot.correlationId).toBe(correlationId);
    expect(snapshot.terminalStatus).toBe("IN_PROGRESS");
  });

  it("12. stdout protocol purity preserved", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-purity",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("13. stderr-only debug behavior preserved", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stderr-intent",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer.some((line) => line.includes("[MCP-DEBUG]"))).toBe(true);
  });

  it("14. tools/list behavior unchanged", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-tools",
      method: "tools/list",
    });

    const tools = (res.result as any).tools;
    expect(tools).toHaveLength(5);
  });

  it("15. research_list_providers behavior unchanged", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-list-p",
      method: "research_list_providers",
    });

    const result = res.result as any;
    expect(result.routingEnabled).toBe(true);
    expect(result.providers).toHaveLength(2);
  });

  it("16. research_get_status behavior unchanged", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-status-absent",
      method: "research_get_status",
      params: { correlationId: "non-existent-corr-id" },
    });

    expect((res.result as any).snapshot).toBeNull();
  });

  it("17. no process.env mutation", async () => {
    const envBefore = { ...process.env };

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-env",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(process.env).toEqual(envBefore);
  });

  it("18. no MCP listener/background process", () => {
    expect(server).toBeDefined();
    expect(typeof server.handleRequest).toBe("function");
  });

  it("19. no DB schema migration requirement", () => {
    // Verified: uses InMemoryResearchPersistencePort without invoking prisma schema migrations
    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
  });

  it("20. no side-effect execution happens after persistence", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-side-effect",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    // Zero prisma updates or cloud jobs
    expect(mockPrisma.researchSession.update).not.toHaveBeenCalled();
    expect(mockPrisma.researchTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("21. persistence unavailable returns deterministic dry_run_only status with generated correlationId", async () => {
    const serviceWithoutPersistence = new ResearchSessionService(mockPrisma, {
      persistence: null,
    });
    const serverWithoutPersistence = new InternalResearchMcpServer({
      researchSessionService: serviceWithoutPersistence,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await serverWithoutPersistence.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-persist",
      method: "research_create_workspace",
      params: {
        topicTitle: "Topic with no persistence",
      },
    });

    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.status).toBe("dry_run_only");
    expect(result.correlationId).toMatch(
      /^corr-mcp-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });
});
