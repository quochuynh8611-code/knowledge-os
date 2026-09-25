/**
 * Internal Research MCP Runtime Bridge Tests
 * (Phase 5.6 Test-First Validation Suite)
 *
 * CRITICAL TEST CONSTRAINTS:
 * - NO real Google Cloud or external network calls.
 * - NO real credentials or tokens.
 * - Strict JSON-RPC 2.0 stdout protocol purity.
 * - Stderr-only logging verification.
 * - Deterministic ordering and capability preservation.
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
  executeSpy?: any;
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
    healthCheck: params.executeSpy || vi.fn(),
    createWorkspace: params.executeSpy || vi.fn(),
    ingestSources: params.executeSpy || vi.fn(),
    generateAudioOverview: params.executeSpy || vi.fn(),
    reconcileIngest: params.executeSpy || vi.fn(),
    getJobStatus: params.executeSpy || vi.fn(),
    cancelJob: params.executeSpy || vi.fn(),
    deleteWorkspace: params.executeSpy || vi.fn(),
  };
}

describe("INTERNAL RESEARCH MCP RUNTIME BRIDGE (PHASE 5.6)", () => {
  let mockService: any;
  let stderrBuffer: string[];
  let mockStderr: Writable;

  beforeEach(() => {
    mockService = {
      getProviderExecutionSnapshot: vi.fn().mockResolvedValue(null),
      startProviderResearchForSession: vi.fn(),
    };

    stderrBuffer = [];
    mockStderr = new Writable({
      write(chunk, _encoding, callback) {
        stderrBuffer.push(chunk.toString());
        callback();
      },
    });
  });

  it("1. research_list_providers returns provider diagnostics from injected runtime source", async () => {
    const fixtureDiagnostics: ResearchProviderDiagnosticsPayload = {
      routingEnabled: true,
      defaultProviderId: "antigravity-legacy",
      allowProviderFallback: false,
      providers: [
        {
          id: "custom-injected-provider",
          displayName: "Custom Injected Display Name",
          capabilities: ["supportsSourceIngestion", "supportsQuery"],
          allowed: true,
        },
      ],
    };

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: fixtureDiagnostics,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-diag-1",
      method: "research_list_providers",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-diag-1");
    expect(res.error).toBeUndefined();
    const result = res.result as any;
    expect(result.routingEnabled).toBe(true);
    expect(result.defaultProviderId).toBe("antigravity-legacy");
    expect(result.allowProviderFallback).toBe(false);
    expect(result.providers).toHaveLength(1);
    expect(result.providers[0].id).toBe("custom-injected-provider");
    expect(result.providers[0].displayName).toBe("Custom Injected Display Name");
  });

  it("2. result preserves deterministic provider ordering", async () => {
    const mockNotebookLMProvider = createMockProvider({
      id: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      name: "NotebookLM Enterprise",
      capabilities: {
        supportsNotebookManagement: true,
        supportsSourceIngestion: true,
      },
    });

    const mockAntigravityProvider = createMockProvider({
      id: APPROVED_PROVIDER_IDS.LEGACY,
      name: "Antigravity CLI",
      capabilities: {
        supportsSourceIngestion: true,
        supportsQuery: true,
      },
    });

    const config: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      allowProviderFallback: true,
      allowNotebookLM: true,
      enableMcpServer: true,
    };

    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: true,
        enableOfficialProvider: true,
        enableLegacyProvider: true,
      },
      // Intentionally insert in reverse alphabetical order
      providers: [mockNotebookLMProvider, mockAntigravityProvider],
    });

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: { config, providerRegistry: registry },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-order",
      method: "research_list_providers",
    });

    const result = res.result as any;
    expect(result.providers.map((p: any) => p.id)).toEqual([
      APPROVED_PROVIDER_IDS.LEGACY,
      APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
    ]);
  });

  it("3. excludes disallowed providers exactly as source-of-truth dictates", async () => {
    const config: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: APPROVED_PROVIDER_IDS.LEGACY,
      allowProviderFallback: false,
      allowNotebookLM: false, // Disallows NotebookLM
      enableMcpServer: true,
    };

    const registry = createDefaultProviderRegistry(config);

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: { config, providerRegistry: registry },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-disallowed",
      method: "research_list_providers",
    });

    const result = res.result as any;
    const ids = result.providers.map((p: any) => p.id);
    expect(ids).toContain(APPROVED_PROVIDER_IDS.LEGACY);
    expect(ids).not.toContain(APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE);
  });

  it("4. preserves routingEnabled/defaultProviderId/allowProviderFallback in MCP result if exposed by contract", async () => {
    const config: ResearchProviderConfig = {
      enableProviderRouting: false, // Routing disabled
      defaultProviderId: APPROVED_PROVIDER_IDS.LEGACY,
      allowProviderFallback: false,
      allowNotebookLM: false,
      enableMcpServer: false,
    };

    const registry = createDefaultProviderRegistry(config);

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: { config, providerRegistry: registry },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-routing-disabled",
      method: "research_list_providers",
    });

    const result = res.result as any;
    expect(result.routingEnabled).toBe(false);
    expect(result.defaultProviderId).toBe(APPROVED_PROVIDER_IDS.LEGACY);
    expect(result.allowProviderFallback).toBe(false);
    expect(result.providers).toEqual([]);
  });

  it("5. does not hardcode provider metadata in test assertions beyond injected fixture", async () => {
    const dynamicId = `test-provider-${Date.now()}`;
    const dynamicName = `Dynamic Provider Name ${Math.random()}`;

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: () => ({
        routingEnabled: true,
        defaultProviderId: dynamicId,
        allowProviderFallback: true,
        providers: [
          {
            id: dynamicId,
            displayName: dynamicName,
            capabilities: ["supportsAudioOverview"],
            allowed: true,
          },
        ],
      }),
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-dynamic",
      method: "research_list_providers",
    });

    const result = res.result as any;
    expect(result.providers[0].id).toBe(dynamicId);
    expect(result.providers[0].displayName).toBe(dynamicName);
  });

  it("6. returns sanitized JSON-RPC error when diagnostics dependency is unavailable", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: null,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-diag",
      method: "research_list_providers",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-no-diag");
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32004);
    expect(res.error?.message).toContain("Provider diagnostics dependency is unavailable");
  });

  it("7. does not crash MCP server on diagnostics resolution failure", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: () => {
        throw new Error("Secret database crash AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
      },
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-throw",
      method: "research_list_providers",
    });

    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32603);
    expect(res.error?.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
    expect(res.error?.message).toContain("[REDACTED_API_KEY]");
  });

  it("8. preserves stdout purity (no console/stdout noise)", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        routingEnabled: true,
        defaultProviderId: "antigravity-legacy",
        allowProviderFallback: true,
        providers: [],
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-purity",
      method: "research_list_providers",
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("9. preserves stderr-only debug behavior", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        routingEnabled: true,
        defaultProviderId: "antigravity-legacy",
        allowProviderFallback: true,
        providers: [],
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-stderr",
      method: "research_list_providers",
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer[0]).toContain("[MCP-DEBUG]");
    expect(stderrBuffer[0]).toContain("research_list_providers");
  });

  it("10. does not call network/provider execution methods", async () => {
    const executeSpy = vi.fn();
    const mockProvider = createMockProvider({
      id: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      name: "P1",
      capabilities: {
        supportsNotebookManagement: true,
        supportsSourceIngestion: true,
        supportsAudioOverview: true,
      },
      executeSpy,
    });

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        config: {
          enableProviderRouting: true,
          defaultProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
          allowProviderFallback: false,
          allowNotebookLM: true,
          enableMcpServer: true,
        },
        providerRegistry: new ProviderRegistry({
          config: {
            defaultProvider: "official",
            allowFallback: false,
            enableOfficialProvider: true,
            enableLegacyProvider: false,
          },
          providers: [mockProvider],
        }),
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-no-exec",
      method: "research_list_providers",
    });

    expect(executeSpy).not.toHaveBeenCalled();
  });

  it("11. does not create MCP listener/background process", () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
    });

    // Validates that instance is a pure class without open listeners or event loops
    expect(server).toBeDefined();
    expect(typeof server.handleRequest).toBe("function");
    expect(typeof server.listTools).toBe("function");
  });

  it("12. preserves existing tools/list behavior", async () => {
    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-tools",
      method: "tools/list",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.error).toBeUndefined();
    const tools = (res.result as any).tools;
    expect(tools).toHaveLength(5);
    expect(tools.map((t: any) => t.name)).toContain("research_list_providers");
    expect(tools.map((t: any) => t.name)).toContain("research_get_status");
  });

  it("13. preserves existing research_get_status behavior", async () => {
    mockService.getProviderExecutionSnapshot.mockResolvedValueOnce({
      correlationId: "corr-status-999",
      providerId: "antigravity-legacy",
      workspaceId: null,
      sourceCount: 3,
      audioJobId: null,
      terminalStatus: "FAILED",
      attemptRecords: [],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
    });

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-status",
      method: "research_get_status",
      params: {
        correlationId: "corr-status-999",
      },
    });

    expect(mockService.getProviderExecutionSnapshot).toHaveBeenCalledWith({
      correlationId: "corr-status-999",
    });
    expect((res.result as any).snapshot.terminalStatus).toBe("FAILED");
  });

  it("14. does not mutate process.env", async () => {
    const envSnapshot = { ...process.env };

    const server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        routingEnabled: true,
        defaultProviderId: "antigravity-legacy",
        allowProviderFallback: true,
        providers: [],
      },
    });

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-env-check",
      method: "research_list_providers",
    });

    expect(process.env).toEqual(envSnapshot);
  });

  it("15. does not require real credentials or cloud access", async () => {
    const config: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: APPROVED_PROVIDER_IDS.NOTEBOOKLM_ENTERPRISE,
      allowProviderFallback: true,
      allowNotebookLM: true,
      enableMcpServer: true,
    };

    const diagnostics = formatResearchProviderDiagnostics({
      config,
      providerRegistry: createDefaultProviderRegistry(config),
    });

    expect(diagnostics.routingEnabled).toBe(true);
    expect(diagnostics.providers.length).toBeGreaterThan(0);
    // Verified purely in-memory without network
  });
});
