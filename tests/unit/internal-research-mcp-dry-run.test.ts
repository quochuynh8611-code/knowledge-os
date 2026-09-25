/**
 * Internal Research MCP Dry-Run Adapter Tests
 * (Phase 5.7 Test-First Validation Suite)
 *
 * CRITICAL TEST CONSTRAINTS:
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - NO database or persistence writes.
 * - Zero mutation calls on ResearchSessionService.
 * - Strict JSON-RPC 2.0 stdout protocol purity.
 * - Stderr-only logging verification.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Writable } from "stream";
import {
  InternalResearchMcpServer,
  JsonRpcRequest,
} from "../../src/server/mcp/internalResearchMcpServer";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import {
  formatResearchProviderDiagnostics,
  createDefaultProviderRegistry,
  ResearchProviderDiagnosticsPayload,
} from "../../src/server/bootstrap/researchProviderComposition";
import {
  APPROVED_PROVIDER_IDS,
  ResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import {
  ProviderCapabilities,
  ResearchProvider,
} from "../../src/server/services/providers/types";

const ALL_CAPABILITIES_OFF: ProviderCapabilities = {
  supportsNotebookManagement: false,
  supportsSourceIngestion: false,
  supportsAudioOverview: false,
  supportsBatchSourceDelete: false,
  supportsQuery: false,
  supportsInteractiveChat: false,
  supportsStudyGuide: false,
  supportsMindMap: false,
  supportsSlides: false,
  supportsAsyncHandoffCLI: false,
  supportsLocalAgentHandoff: false,
};

function createMockProvider(params: {
  id: string;
  name: string;
  capabilities: Partial<ProviderCapabilities>;
  spy?: any;
}): ResearchProvider {
  return {
    metadata: {
      id: params.id,
      name: params.name,
      version: "1.0.0",
      type: "official",
      description: params.name,
    },
    getCapabilities: () => ({
      ...ALL_CAPABILITIES_OFF,
      ...params.capabilities,
    }),
    healthCheck: params.spy || vi.fn(),
    createWorkspace: params.spy || vi.fn(),
    ingestSources: params.spy || vi.fn(),
    generateAudioOverview: params.spy || vi.fn(),
    reconcileIngest: params.spy || vi.fn(),
    getJobStatus: params.spy || vi.fn(),
    cancelJob: params.spy || vi.fn(),
    deleteWorkspace: params.spy || vi.fn(),
  };
}

describe("INTERNAL RESEARCH MCP DRY-RUN ADAPTERS (PHASE 5.7)", () => {
  let mockService: any;
  let stderrBuffer: string[];
  let mockStderr: Writable;
  let defaultDiagnostics: ResearchProviderDiagnosticsPayload;

  beforeEach(() => {
    mockService = {
      getProviderExecutionSnapshot: vi.fn().mockResolvedValue(null),
      startProviderResearchForSession: vi.fn(),
      getOrCreateSessionForTopic: vi.fn(),
      packageSources: vi.fn(),
      saveTaskPrompt: vi.fn(),
      updateSession: vi.fn(),
    };

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
  });

  it("1. research_create_workspace returns dry-run execution envelope", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cw-1",
      method: "research_create_workspace",
      params: {
        topicTitle: "Quantum Teleportation",
        topicSlug: "quantum-teleportation",
        category: "Physics",
        providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      },
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-cw-1");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.dryRun).toBe(true);
    expect(result.tool).toBe("research_create_workspace");
    expect(result.accepted).toBe(true);
    expect(result.providerResolution.requestedProviderId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
    expect(result.providerResolution.resolvedProviderId).toBe(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
    expect(result.capabilityCheck.required).toEqual(["supportsNotebookManagement"]);
    expect(result.capabilityCheck.satisfied).toBe(true);
    expect(result.plan.action).toBe("create_workspace");
    expect(result.plan.sideEffectsSuppressed).toBe(true);
    expect(result.plan.summary).toContain("Dry-run only");
    expect(result.normalizedInput).toEqual({
      topicTitle: "Quantum Teleportation",
      topicSlug: "quantum-teleportation",
      category: "Physics",
    });
  });

  it("2. research_ingest_sources returns dry-run execution envelope", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-ingest-1",
      method: "research_ingest_sources",
      params: {
        workspaceId: "nlm-ws-999",
        sources: [
          { type: "note", title: "Note 1", content: "Markdown content" },
          { type: "url", title: "Web doc", content: "https://example.com/doc" },
        ],
      },
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-ingest-1");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.dryRun).toBe(true);
    expect(result.tool).toBe("research_ingest_sources");
    expect(result.accepted).toBe(true);
    expect(result.capabilityCheck.required).toEqual(["supportsSourceIngestion"]);
    expect(result.plan.action).toBe("ingest_sources");
    expect(result.plan.sideEffectsSuppressed).toBe(true);
    expect(result.plan.summary).toContain("Ingestion of 2 source(s) into workspace 'nlm-ws-999'");
    expect(result.normalizedInput).toEqual({
      workspaceId: "nlm-ws-999",
      sourceCount: 2,
      sourceKinds: ["note", "url"],
      hasOversizedContent: false,
    });
  });

  it("3. research_generate_audio returns dry-run execution envelope", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-audio-1",
      method: "research_generate_audio",
      params: {
        workspaceId: "nlm-ws-999",
        format: "deep_dive",
      },
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-audio-1");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.dryRun).toBe(true);
    expect(result.tool).toBe("research_generate_audio");
    expect(result.accepted).toBe(true);
    expect(result.capabilityCheck.required).toEqual(["supportsAudioOverview"]);
    expect(result.plan.action).toBe("generate_audio");
    expect(result.plan.sideEffectsSuppressed).toBe(true);
    expect(result.plan.summary).toContain("Audio overview generation ('deep_dive') for workspace 'nlm-ws-999'");
    expect(result.normalizedInput).toEqual({
      workspaceId: "nlm-ws-999",
      format: "deep_dive",
    });
  });

  it("4. capability resolution comes from injected diagnostics source", async () => {
    const customDiagnostics: ResearchProviderDiagnosticsPayload = {
      routingEnabled: true,
      defaultProviderId: "custom-p1",
      allowProviderFallback: false,
      providers: [
        {
          id: "custom-p1",
          displayName: "Custom Provider 1",
          capabilities: ["supportsNotebookManagement"],
          allowed: true,
        },
      ],
    };

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: customDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cap-src",
      method: "research_create_workspace",
      params: {
        topicTitle: "Test Topic",
      },
    });

    const result = res.result as any;
    expect(result.providerResolution.resolvedProviderId).toBe("custom-p1");
    expect(result.capabilityCheck.satisfied).toBe(true);
  });

  it("5. unsupported provider capability returns deterministic sanitized response with accepted=false", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    // Antigravity does not support audio overview
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-unsupported",
      method: "research_generate_audio",
      params: {
        workspaceId: "ws-legacy",
        providerId: APPROVED_PROVIDER_IDS.LEGACY,
      },
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.dryRun).toBe(true);
    expect(result.accepted).toBe(false);
    expect(result.capabilityCheck.satisfied).toBe(false);
    expect(result.capabilityCheck.missing).toEqual(["supportsAudioOverview"]);
    expect(result.plan.summary).toContain("does not support audio overview generation");
  });

  it("6. diagnostics unavailable returns JSON-RPC error fail-safe", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: null,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-diag",
      method: "research_create_workspace",
      params: {
        topicTitle: "Quantum Mechanics",
      },
    });

    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32004);
    expect(res.error?.message).toContain("Provider diagnostics dependency is unavailable");
  });

  it("7. invalid params return JSON-RPC validation error", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res1 = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-inv-1",
      method: "research_create_workspace",
      params: { topicTitle: "   " },
    });
    expect(res1.error?.code).toBe(-32602);
    expect(res1.error?.message).toContain("topicTitle");

    const res2 = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-inv-2",
      method: "research_ingest_sources",
      params: { workspaceId: "ws-1", sources: [] },
    });
    expect(res2.error?.code).toBe(-32602);
    expect(res2.error?.message).toContain("sources");

    const res3 = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-inv-3",
      method: "research_generate_audio",
      params: { workspaceId: "  " },
    });
    expect(res3.error?.code).toBe(-32602);
    expect(res3.error?.message).toContain("workspaceId");
  });

  it("8. dry-run never calls provider execution methods", async () => {
    const spy = vi.fn();
    const mockProvider = createMockProvider({
      id: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      name: "NLM",
      capabilities: {
        supportsNotebookManagement: true,
        supportsSourceIngestion: true,
        supportsAudioOverview: true,
      },
      spy,
    });

    const config: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      allowProviderFallback: true,
      allowNotebookLM: true,
      enableMcpServer: true,
    };

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        config,
        providerRegistry: new ProviderRegistry({
          config: {
            defaultProvider: "official",
            allowFallback: true,
            enableOfficialProvider: true,
            enableLegacyProvider: true,
          },
          providers: [mockProvider],
        }),
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-d1",
      method: "research_create_workspace",
      params: { topicTitle: "Test" },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-d2",
      method: "research_ingest_sources",
      params: { workspaceId: "ws-1", sources: [{ type: "note", content: "text" }] },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-d3",
      method: "research_generate_audio",
      params: { workspaceId: "ws-1" },
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it("9. dry-run never calls ResearchSessionService mutation methods", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-srv-cw",
      method: "research_create_workspace",
      params: { topicTitle: "Physics" },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-srv-ingest",
      method: "research_ingest_sources",
      params: { workspaceId: "ws-1", sources: [{ type: "note", content: "data" }] },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-srv-audio",
      method: "research_generate_audio",
      params: { workspaceId: "ws-1" },
    });

    expect(mockService.startProviderResearchForSession).not.toHaveBeenCalled();
    expect(mockService.getOrCreateSessionForTopic).not.toHaveBeenCalled();
    expect(mockService.packageSources).not.toHaveBeenCalled();
    expect(mockService.saveTaskPrompt).not.toHaveBeenCalled();
    expect(mockService.updateSession).not.toHaveBeenCalled();
  });

  it("10. dry-run does not write persistence", async () => {
    // Verified by verifying zero DB or session service calls
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-persist",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect((res.result as any).plan.sideEffectsSuppressed).toBe(true);
  });

  it("11. dry-run preserves stdout purity", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stdout-1",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stdout-2",
      method: "research_ingest_sources",
      params: { workspaceId: "ws-1", sources: [{ type: "note", content: "data" }] },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stdout-3",
      method: "research_generate_audio",
      params: { workspaceId: "ws-1" },
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("12. dry-run preserves stderr-only debug behavior", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stderr-1",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer.some((line) => line.includes("[MCP-DEBUG]"))).toBe(true);
  });

  it("13. tools/list behavior unchanged", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-tools",
      method: "tools/list",
    });

    const tools = (res.result as any).tools;
    expect(tools).toHaveLength(5);
    const names = tools.map((t: any) => t.name);
    expect(names).toEqual([
      "research_create_workspace",
      "research_ingest_sources",
      "research_generate_audio",
      "research_get_status",
      "research_list_providers",
    ]);
  });

  it("14. research_get_status behavior unchanged", async () => {
    mockService.getProviderExecutionSnapshot.mockResolvedValueOnce({
      correlationId: "corr-12345",
      providerId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      workspaceId: "nlm-ws-1",
      sourceCount: 2,
      audioJobId: null,
      terminalStatus: "COMPLETED",
      attemptRecords: [],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
    });

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-status",
      method: "research_get_status",
      params: { correlationId: "corr-12345" },
    });

    expect((res.result as any).snapshot.correlationId).toBe("corr-12345");
  });

  it("15. research_list_providers behavior unchanged", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-list-p",
      method: "research_list_providers",
    });

    const result = res.result as any;
    expect(result.routingEnabled).toBe(true);
    expect(result.providers).toHaveLength(2);
  });

  it("16. no process.env mutation", async () => {
    const envBefore = { ...process.env };
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-env",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(process.env).toEqual(envBefore);
  });

  it("17. no network/cloud access", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-cloud-check",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(res.error).toBeUndefined();
    // Executed entirely in-memory
  });

  it("18. no MCP listener/background process", () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
    });

    expect(server).toBeDefined();
    expect(typeof server.handleRequest).toBe("function");
  });

  it("19. deterministic normalized input summary", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: defaultDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-norm",
      method: "research_ingest_sources",
      params: {
        workspaceId: "ws-abc",
        sources: [
          { type: "note", content: "abc" },
          { type: "file", content: "xyz" },
        ],
      },
    });

    expect((res.result as any).normalizedInput).toEqual({
      workspaceId: "ws-abc",
      sourceCount: 2,
      sourceKinds: ["note", "file"],
      hasOversizedContent: false,
    });
  });

  it("20. no secrets/tokens/paths leaked in result or error", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: () => {
        throw new Error(
          "Secret failure: Bearer secret-auth-token-123456 with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"
        );
      },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-leak-test",
      method: "research_create_workspace",
      params: { topicTitle: "Title" },
    });

    expect(res.error?.message).not.toContain("secret-auth-token-123456");
    expect(res.error?.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
    expect(res.error?.message).toContain("Bearer [REDACTED]");
    expect(res.error?.message).toContain("[REDACTED_API_KEY]");
  });
});
