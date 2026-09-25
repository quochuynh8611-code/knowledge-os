/**
 * Internal Research MCP Server Facade & Protocol Purity Tests
 * (Phase 4.9 Test-First Validation Suite)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  InternalResearchMcpServer,
  JsonRpcRequest,
} from "../../src/server/mcp/internalResearchMcpServer";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ProviderException } from "../../src/server/services/providers/errors";
import { Writable } from "stream";

describe("INTERNAL RESEARCH MCP SERVER FACADE UNIT TESTS (PHASE 4.9)", () => {
  let mockService: any;
  let server: InternalResearchMcpServer;
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

    server = new InternalResearchMcpServer({
      researchSessionService: mockService as unknown as ResearchSessionService,
      stderr: mockStderr,
      providerDiagnostics: {
        routingEnabled: true,
        defaultProviderId: "notebooklm-enterprise",
        allowProviderFallback: true,
        providers: [
          {
            id: "notebooklm-enterprise",
            displayName: "NotebookLM Enterprise API (Official)",
            capabilities: [
              "supportsNotebookManagement",
              "supportsSourceIngestion",
              "supportsAudioOverview",
              "supportsBatchSourceDelete",
            ],
            allowed: true,
          },
          {
            id: "antigravity-legacy",
            displayName: "Antigravity CLI Handoff",
            capabilities: ["supportsSourceIngestion", "supportsQuery"],
            allowed: true,
          },
        ],
      },
    });
  });

  it("1. ListTools returns exactly 5 supported tools", () => {
    const tools = server.listTools();
    expect(tools).toHaveLength(5);
    const names = tools.map((t) => t.name);
    expect(names).toEqual([
      "research_create_workspace",
      "research_ingest_sources",
      "research_generate_audio",
      "research_get_status",
      "research_list_providers",
    ]);
  });

  it("2. HandleRequest returns error when jsonrpc version != '2.0'", async () => {
    const res = await server.handleRequest({
      jsonrpc: "1.0",
      id: "req-1",
      method: "research_list_providers",
    } as JsonRpcRequest);

    expect(res.jsonrpc).toBe("2.0");
    expect(res.id).toBe("req-1");
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32600);
  });

  it("3. HandleRequest returns error when method is unknown", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-2",
      method: "unknown_random_method",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.error?.code).toBe(-32601);
    expect(res.error?.message).toContain("not found");
  });

  it("4. Research_list_providers returns valid provider metadata and capabilities", async () => {
    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-3",
      method: "research_list_providers",
    });

    expect(res.jsonrpc).toBe("2.0");
    expect(res.error).toBeUndefined();
    expect((res.result as any).providers).toHaveLength(2);
    expect((res.result as any).providers[0].id).toBe("notebooklm-enterprise");
    expect((res.result as any).providers[1].id).toBe("antigravity-legacy");
  });

  it("5. Research_get_status invokes service with exact parameters", async () => {
    mockService.getProviderExecutionSnapshot.mockResolvedValueOnce({
      correlationId: "corr-test-123",
      providerId: "notebooklm-enterprise",
      workspaceId: "nlm-ws-1",
      sourceCount: 2,
      audioJobId: null,
      terminalStatus: "COMPLETED",
      attemptRecords: [],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
    });

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-4",
      method: "research_get_status",
      params: {
        correlationId: "corr-test-123",
      },
    });

    expect(mockService.getProviderExecutionSnapshot).toHaveBeenCalledWith({
      correlationId: "corr-test-123",
    });
    expect((res.result as any).snapshot.correlationId).toBe("corr-test-123");
  });

  it("6. Research_get_status returns null snapshot when not found", async () => {
    mockService.getProviderExecutionSnapshot.mockResolvedValueOnce(null);

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-5",
      method: "research_get_status",
      params: {
        correlationId: "non-existent-corr",
      },
    });

    expect(res.error).toBeUndefined();
    expect((res.result as any).snapshot).toBeNull();
  });

  it("7. Sanitizes secrets if service throws ProviderException or error", async () => {
    mockService.getProviderExecutionSnapshot.mockRejectedValueOnce(
      new ProviderException(
        "INVALID_ARGUMENT",
        "Invalid token Bearer secret-auth-token-123456 with AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q",
        "corr-err-1",
        "notebooklm-enterprise"
      )
    );

    const res = await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-6",
      method: "research_get_status",
      params: {
        correlationId: "corr-err-1",
      },
    });

    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32602);
    expect(res.error?.message).not.toContain("secret-auth-token-123456");
    expect(res.error?.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
    expect(res.error?.message).toContain("Bearer [REDACTED]");
    expect(res.error?.message).toContain("[REDACTED_API_KEY]");
  });

  it("8. Stdout purity: handleRequest does NOT emit to process.stdout", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write");

    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-7",
      method: "research_list_providers",
    });

    expect(stdoutSpy).not.toHaveBeenCalled();
    stdoutSpy.mockRestore();
  });

  it("9. Stderr receives debug logs when stream is injected", async () => {
    await server.handleRequest({
      jsonrpc: "2.0",
      id: "req-8",
      method: "research_list_providers",
    });

    expect(stderrBuffer.length).toBeGreaterThan(0);
    expect(stderrBuffer[0]).toContain("[MCP-DEBUG]");
  });

  it("10. Produces deterministic JSON-RPC response structure", async () => {
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: 999,
      method: "tools/list",
    };

    const res1 = await server.handleRequest(req);
    const res2 = await server.handleRequest(req);

    expect(res1).toEqual(res2);
    expect(res1.jsonrpc).toBe("2.0");
    expect(res1.id).toBe(999);
  });

  it("11. Does NOT expose query or interactive chat tools in listTools", () => {
    const tools = server.listTools();
    const toolNames = tools.map((t) => t.name);

    expect(toolNames).not.toContain("research_query");
    expect(toolNames).not.toContain("research_chat");
    expect(toolNames).not.toContain("research_mindmap");
    expect(toolNames).not.toContain("research_slides");
  });

  it("12. Gated individual step tools fail-fast safely rather than inventing behavior", async () => {
    const toolsToTest = [
      "research_create_workspace",
      "research_ingest_sources",
      "research_generate_audio",
    ];

    for (const tool of toolsToTest) {
      const res = await server.handleRequest({
        jsonrpc: "2.0",
        id: `req-${tool}`,
        method: tool,
        params: {},
      });

      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe(-32004);
      expect(res.error?.message).toContain("not directly invocable in isolation");
    }
  });
});
