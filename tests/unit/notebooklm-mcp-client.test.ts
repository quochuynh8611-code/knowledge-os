/**
 * NotebookLM Direct MCP Client Runtime Tests
 * (Phase 2 — NotebookLMMcpClient Runtime Adapter)
 *
 * Verifies that NotebookLMMcpClient and StdioMcpTransport strictly adhere to:
 * - Executable resolution (explicit config vs PATH fallback)
 * - Tool mappings (notebook_create, source_add, notebook_query, studio_create, etc.)
 * - Defensive JSON parsing and malformed response rejection
 * - Timeout handling and cancellation
 * - Process error/close rejects pending requests
 * - Close lifecycle idempotency
 * - Secret sanitization (no credentials leaked in error payloads/logs)
 * - Provider compatibility with NotebookLMEnterpriseProvider
 * - Composition feature-flag safety gates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { Writable, Readable } from "node:stream";
import type { ChildProcess } from "node:child_process";
import {
  NotebookLMMcpClient,
  unpackMcpToolResult,
} from "../../src/server/services/providers/notebooklmMcpClient";
import {
  McpTransport,
  InMemoryMcpTransport,
  StdioMcpTransport,
  JsonRpcResponse,
} from "../../src/server/services/providers/notebooklmMcpTransport";
import {
  NotebookLMClient,
  NotebookLMClientError,
  MockNotebookLMClient,
} from "../../src/server/services/providers/notebooklmClient";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import {
  createDefaultProviderRegistry,
  composeResearchProviderDependencies,
} from "../../src/server/bootstrap/researchProviderComposition";
import {
  ResearchProviderConfig,
  DEFAULT_RESEARCH_PROVIDER_CONFIG,
  readResearchProviderConfig,
} from "../../src/server/config/researchProviderConfig";
import { ExecutionContext, SourcePayload } from "../../src/server/services/providers/types";

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    requestId: "req-mcp-test-01",
    correlationId: "corr-mcp-test-01",
    attemptId: "att-mcp-test-01",
    actor: { userId: "user-mcp", role: "user" },
    idempotencyKey: "idem-mcp-test-01",
    ...overrides,
  };
}

describe("NOTEBOOKLM DIRECT MCP CLIENT & TRANSPORT (PHASE 2)", () => {
  // -------------------------------------------------------------------------
  // Test 1: Resolve executable path from explicit config
  // -------------------------------------------------------------------------
  it("1. resolve executable path từ explicit config", () => {
    const transport = new StdioMcpTransport({
      binaryPath: "/Users/mr.chem/.local/bin/notebooklm-mcp",
    });
    const resolved = transport.resolveExecutable();
    expect(resolved.executable).toBe("/Users/mr.chem/.local/bin/notebooklm-mcp");
    expect(resolved.isExplicit).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 2: Fallback to binary name when no explicit path is provided
  // -------------------------------------------------------------------------
  it("2. fallback sang binary name khi không có explicit path", () => {
    const originalEnvBin = process.env.NOTEBOOKLM_MCP_BIN;
    const originalEnvPath = process.env.NOTEBOOKLM_MCP_PATH;
    delete process.env.NOTEBOOKLM_MCP_BIN;
    delete process.env.NOTEBOOKLM_MCP_PATH;

    try {
      const transport = new StdioMcpTransport({
        binaryName: "custom-notebooklm-mcp",
      });
      const resolved = transport.resolveExecutable();
      expect(resolved.executable).toBe("custom-notebooklm-mcp");
      expect(resolved.isExplicit).toBe(false);
    } finally {
      if (originalEnvBin) process.env.NOTEBOOKLM_MCP_BIN = originalEnvBin;
      if (originalEnvPath) process.env.NOTEBOOKLM_MCP_PATH = originalEnvPath;
    }
  });

  // -------------------------------------------------------------------------
  // Test 3: Create workspace mapping
  // -------------------------------------------------------------------------
  it("3. create workspace mapping: sends notebook_create tool call and returns workspaceId", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_create", (args) => {
      expect(args.title).toBe("Dự án Nghiên cứu Kinh tế");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              notebook_id: "nlm-ws-real-12345",
              title: args.title,
            }),
          },
        ],
      };
    });

    const client: NotebookLMClient = new NotebookLMMcpClient({ transport });
    const res = await client.createWorkspace({
      title: "Dự án Nghiên cứu Kinh tế",
    });

    expect(res).toBeDefined();
    expect(res.workspaceId).toBe("nlm-ws-real-12345");
  });

  // -------------------------------------------------------------------------
  // Test 4: Source ingestion mapping
  // -------------------------------------------------------------------------
  it("4. source ingestion mapping: sends source_add tool calls and aggregates remote IDs", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    const ingested: Array<Record<string, unknown>> = [];
    transport.registerToolHandler("source_add", (args) => {
      ingested.push(args);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              source_id: `src-nlm-${ingested.length}`,
              status: "success",
            }),
          },
        ],
      };
    });

    const client = new NotebookLMMcpClient({ transport });
    const sources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "s1",
        title: "Tài liệu A",
        mimeType: "text/markdown",
        textContent: "Nội dung nghiên cứu A",
        contentHash: "hash-a",
      },
      {
        type: "url",
        sourceId: "s2",
        title: "Báo cáo B",
        url: "https://example.com/report.pdf",
        contentHash: "hash-b",
      },
    ];

    const res = await client.ingestSources({
      workspaceId: "ws-123",
      sources,
    });

    expect(res.status).toBe("COMPLETED");
    expect(res.remoteSourceIds).toEqual(["src-nlm-1", "src-nlm-2"]);
    expect(ingested.length).toBe(2);
    expect(ingested[0].source_type).toBe("text");
    expect(ingested[0].text).toBe("Nội dung nghiên cứu A");
    expect(ingested[1].source_type).toBe("url");
    expect(ingested[1].url).toBe("https://example.com/report.pdf");
  });

  // -------------------------------------------------------------------------
  // Test 5: Query mapping
  // -------------------------------------------------------------------------
  it("5. query mapping: sends notebook_query tool call and extracts grounded answer", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_query", (args) => {
      expect(args.notebook_id).toBe("ws-123");
      expect(args.query).toBe("Phân tích động lực tăng trưởng GDP?");
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              answer: "Động lực tăng trưởng chủ yếu đến từ xuất khẩu và dịch vụ tiêu dùng.",
              cited_sources: ["src-nlm-1"],
            }),
          },
        ],
      };
    });

    const client = new NotebookLMMcpClient({ transport });
    const res = await client.query({
      workspaceId: "ws-123",
      prompt: "Phân tích động lực tăng trưởng GDP?",
      sourceIds: ["src-nlm-1"],
    });

    expect(res.answer).toContain("Động lực tăng trưởng chủ yếu");
    expect(res.citedSourceIds).toEqual(["src-nlm-1"]);
    expect(res.rawEnvelope).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Test 6: Malformed response handling
  // -------------------------------------------------------------------------
  it("6. malformed response: throws MALFORMED_RESPONSE when response shape lacks answer or id", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    // notebook_create returns empty dict without id
    transport.registerToolHandler("notebook_create", () => ({
      content: [{ type: "text", text: "{}" }],
    }));

    const client = new NotebookLMMcpClient({ transport });
    await expect(
      client.createWorkspace({ title: "Bad Response Workspace" })
    ).rejects.toThrowError(NotebookLMClientError);

    await expect(
      client.createWorkspace({ title: "Bad Response Workspace" })
    ).rejects.toMatchObject({
      code: "MALFORMED_RESPONSE",
    });
  });

  // -------------------------------------------------------------------------
  // Test 7: Timeout handling
  // -------------------------------------------------------------------------
  it("7. timeout: throws TIMEOUT error when MCP tool does not answer within deadline", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    // Hangs indefinitely
    transport.registerToolHandler("notebook_query", () => new Promise(() => {}));

    const client = new NotebookLMMcpClient({
      transport,
      requestTimeoutMs: 50,
      queryTimeoutMs: 50,
    });

    await expect(
      client.query({ workspaceId: "ws-hang", prompt: "Will hang" })
    ).rejects.toThrowError(NotebookLMClientError);

    await expect(
      client.query({ workspaceId: "ws-hang", prompt: "Will hang" })
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });

  // -------------------------------------------------------------------------
  // Test 8: Cancellation via AbortSignal
  // -------------------------------------------------------------------------
  it("8. cancellation: AbortSignal rejects request with CANCELLED error immediately", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler(
      "notebook_query",
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    const client = new NotebookLMMcpClient({ transport });
    const controller = new AbortController();

    const queryPromise = client.query({
      workspaceId: "ws-cancel",
      prompt: "Cancel this call",
      signal: controller.signal,
    });

    controller.abort();

    await expect(queryPromise).rejects.toThrowError(NotebookLMClientError);
    await expect(queryPromise).rejects.toMatchObject({
      code: "CANCELLED",
    });
  });

  // -------------------------------------------------------------------------
  // Test 9: Process close/error rejects pending requests
  // -------------------------------------------------------------------------
  it("9. process close/error rejects pending requests with UNAVAILABLE", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    let writtenLines: string[] = [];
    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        writtenLines.push(chunk.toString());
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockImplementation(() => {
      fakeChild.killed = true;
      return true;
    });

    const mockSpawn = vi.fn().mockReturnValue(fakeChild);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: mockSpawn as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
      skipInitialize: true,
    });

    await transport.connect();
    expect(transport.isAlive()).toBe(true);

    // Launch request that remains pending
    const reqPromise = transport.request("tools/call", { name: "test_tool" });

    // Simulate child process unexpected exit
    fakeChild.emit("close", 1, "SIGTERM");

    await expect(reqPromise).rejects.toThrowError(NotebookLMClientError);
    await expect(reqPromise).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(transport.isAlive()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 10: Close lifecycle is idempotent
  // -------------------------------------------------------------------------
  it("10. close lifecycle idempotent: repeated close calls succeed cleanly", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    const client = new NotebookLMMcpClient({ transport });
    expect(transport.isAlive()).toBe(true);

    await client.close();
    expect(transport.isAlive()).toBe(false);

    // Second call must not throw
    await expect(client.close()).resolves.toBeUndefined();

    // Subsequent operation throws UNAVAILABLE
    await expect(
      client.createWorkspace({ title: "After close" })
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });

  // -------------------------------------------------------------------------
  // Test 11: No secret leakage in error logs or serialization
  // -------------------------------------------------------------------------
  it("11. no secret leakage: stderr messages and exceptions sanitize Bearer tokens and keys", () => {
    const logs: string[] = [];
    const transport = new StdioMcpTransport({
      binaryPath: "/fake/binary",
      logger: (_level, msg) => logs.push(msg),
    });

    const googleApiKey = "AIzaSy" + "A".repeat(33);
    const sensitivePayload = {
      isError: true,
      content: [
        {
          type: "text",
          text: `Authentication error with Bearer ya29.a0AfH6SMDh123456789 and API key ${googleApiKey}`,
        },
      ],
    };

    try {
      unpackMcpToolResult(sensitivePayload);
      expect.fail("Expected unpackMcpToolResult to throw");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      // Must sanitize tokens
      expect(clientErr.message).not.toContain("ya29.a0AfH6SMDh123456789");
      expect(clientErr.message).not.toContain(googleApiKey);
      expect(clientErr.message).toContain("Bearer [REDACTED]");
      expect(clientErr.message).toContain("[REDACTED_API_KEY]");
    }
  });

  // -------------------------------------------------------------------------
  // Test 12: Provider compatibility with NotebookLMEnterpriseProvider
  // -------------------------------------------------------------------------
  it("12. provider compatibility: NotebookLMEnterpriseProvider works seamlessly with NotebookLMMcpClient", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("server_info", () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "success",
            version: "0.3.0",
            auth_status: "configured",
          }),
        },
      ],
    }));

    transport.registerToolHandler("notebook_create", (args) => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            notebook_id: "nlm-ws-compat-999",
            title: args.title,
          }),
        },
      ],
    }));

    const client: NotebookLMClient = new NotebookLMMcpClient({ transport });
    const provider = new NotebookLMEnterpriseProvider(client);
    const context = createMockContext();

    // 1. healthCheck
    const health = await provider.healthCheck(context);
    expect(health.isHealthy).toBe(true);
    expect(health.providerId).toBe("notebooklm-enterprise");

    // 2. createWorkspace
    const workspaceRes = await provider.createWorkspace(
      { topicTitle: "Compatibility Test", topicSlug: "compat-test" },
      context
    );
    expect(workspaceRes.remoteWorkspaceId).toBe("nlm-ws-compat-999");
  });

  // -------------------------------------------------------------------------
  // Test 13: Composition keeps Mock client when flags are not enabled
  // -------------------------------------------------------------------------
  it("13. composition giữ mock client khi flags chưa bật", () => {
    // Default config has enableProviderRouting=false, allowNotebookLM=false, useDirectMcpClient=false
    const registry = createDefaultProviderRegistry(DEFAULT_RESEARCH_PROVIDER_CONFIG);
    // When allowNotebookLM is false, enterprise provider is not registered in active providers
    const enterpriseProvider = registry.getProviderById("notebooklm-enterprise");
    expect(enterpriseProvider).toBeNull();

    // Read composition with routing disabled
    const comp = composeResearchProviderDependencies({
      config: DEFAULT_RESEARCH_PROVIDER_CONFIG,
    });
    expect(comp.enabledProviderIds).toEqual([]);
    expect(comp.orchestrator).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Test 14: Composition only selects MCP client when all safety conditions are met
  // -------------------------------------------------------------------------
  it("14. composition chỉ chọn MCP client khi đủ mọi điều kiện an toàn", () => {
    const safeDirectMcpConfig: ResearchProviderConfig = {
      enableProviderRouting: true,
      defaultProviderId: "notebooklm-enterprise",
      allowNotebookLM: true,
      allowProviderFallback: true,
      enableMcpServer: true,
      useDirectMcpClient: true,
      notebookLmMcpBinaryPath: "/Users/mr.chem/.local/bin/notebooklm-mcp",
    };

    const registry = createDefaultProviderRegistry(safeDirectMcpConfig);
    const enterpriseProvider = registry.getProviderById("notebooklm-enterprise");
    expect(enterpriseProvider).toBeDefined();
    expect(enterpriseProvider?.metadata.id).toBe("notebooklm-enterprise");

    // Composition confirms enterprise provider is included
    const comp = composeResearchProviderDependencies({
      config: safeDirectMcpConfig,
    });
    expect(comp.enabledProviderIds).toContain("notebooklm-enterprise");
  });

  // -------------------------------------------------------------------------
  // Test 15: Re-throw timeout and unavailable transport errors instead of absent
  // -------------------------------------------------------------------------
  it("rethrows timeout and unavailable transport errors instead of treating them as absent", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    // Case A: Transport throws TIMEOUT
    transport.registerToolHandler("notebook_get", () => {
      throw new NotebookLMClientError({
        code: "TIMEOUT",
        message: "MCP request 'tools/call' timed out after 5000ms",
      });
    });

    const client = new NotebookLMMcpClient({ transport });

    await expect(
      client.reconcileWorkspace({
        workspaceId: "ws-timeout",
        expectedSources: [{ sourceId: "s1", contentHash: "h1" }],
      })
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });

    // Case B: Transport throws UNAVAILABLE (e.g. process crash or network failure)
    transport.registerToolHandler("notebook_get", () => {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "MCP process exited unexpectedly",
      });
    });

    await expect(
      client.reconcileWorkspace({
        workspaceId: "ws-unavailable",
        expectedSources: [{ sourceId: "s1", contentHash: "h1" }],
      })
    ).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });

  // -------------------------------------------------------------------------
  // Test 15B: reconcileWorkspace maps NOT_FOUND / gRPC code 5 to CONFIRMED_ABSENT
  // -------------------------------------------------------------------------
  it("reconcileWorkspace maps NOT_FOUND and gRPC code 5 error to CONFIRMED_ABSENT", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    // Case A: MCP tool error envelope with gRPC code 5 NOT_FOUND
    transport.registerToolHandler("notebook_get", () => ({
      isError: true,
      content: [
        {
          type: "text",
          text: "Failed to get notebook: API error (code 5): NOT_FOUND",
        },
      ],
    }));

    const client = new NotebookLMMcpClient({ transport });

    const statusA = await client.reconcileWorkspace({
      workspaceId: "ws-deleted-001",
      expectedSources: [{ sourceId: "s1", contentHash: "h1" }],
    });

    expect(statusA).toBe("CONFIRMED_ABSENT");

    // Case B: Unpacked error object with NOT_FOUND
    transport.registerToolHandler("notebook_get", () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: "API error (code 5): NOT_FOUND",
          }),
        },
      ],
    }));

    const statusB = await client.reconcileWorkspace({
      workspaceId: "ws-deleted-002",
      expectedSources: [{ sourceId: "s1", contentHash: "h1" }],
    });

    expect(statusB).toBe("CONFIRMED_ABSENT");
  });

  // -------------------------------------------------------------------------
  // Test 16: Out-of-order responses using correlation id
  // -------------------------------------------------------------------------
  it("handles out-of-order responses using correlation id correctly", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    const writtenRequests: Array<{ id: number | string; method: string }> = [];
    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        const lines = chunk.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            try {
              writtenRequests.push(JSON.parse(line));
            } catch {
              // ignore non-json
            }
          }
        }
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockReturnValue(true);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
      skipInitialize: true,
    });

    await transport.connect();

    // Send two concurrent requests
    const p1 = transport.request<{ tag: string }>("tools/call", { name: "req_one" });
    const p2 = transport.request<{ tag: string }>("tools/call", { name: "req_two" });

    expect(writtenRequests.length).toBe(2);
    const id1 = writtenRequests[0].id;
    const id2 = writtenRequests[1].id;
    expect(id1).not.toBe(id2);

    // Respond out-of-order: Response 2 arrives FIRST
    fakeChild.stdout.push(
      JSON.stringify({
        jsonrpc: "2.0",
        id: id2,
        result: { tag: "response-to-second-request" },
      }) + "\n"
    );

    const res2 = await p2;
    expect(res2).toEqual({ tag: "response-to-second-request" });

    // Response 1 arrives SECOND
    fakeChild.stdout.push(
      JSON.stringify({
        jsonrpc: "2.0",
        id: id1,
        result: { tag: "response-to-first-request" },
      }) + "\n"
    );

    const res1 = await p1;
    expect(res1).toEqual({ tag: "response-to-first-request" });
  });

  // -------------------------------------------------------------------------
  // Test 17: Close transport with multiple in-flight pending requests
  // -------------------------------------------------------------------------
  it("rejects all pending requests when transport closes with active in-flight calls", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    fakeChild.stdin = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockImplementation(() => {
      fakeChild.killed = true;
      return true;
    });

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
      skipInitialize: true,
    });

    await transport.connect();

    // Create multiple concurrent in-flight requests
    const p1 = transport.request("tools/call", { name: "tool_1" });
    const p2 = transport.request("tools/call", { name: "tool_2" });
    const p3 = transport.request("tools/call", { name: "tool_3" });

    // Close transport while all 3 requests are pending
    await transport.close();

    const results = await Promise.allSettled([p1, p2, p3]);
    expect(results.length).toBe(3);

    for (const res of results) {
      expect(res.status).toBe("rejected");
      if (res.status === "rejected") {
        expect(res.reason).toBeInstanceOf(NotebookLMClientError);
        expect(res.reason.code).toBe("UNAVAILABLE");
        expect(res.reason.message).toContain("StdioMcpTransport is closing");
      }
    }
  });

  // -------------------------------------------------------------------------
  // Test 18: MCP initialize-first handshake
  // -------------------------------------------------------------------------
  it("performs MCP initialize handshake on connect before sending tool requests", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    const writtenMessages: Array<{ method?: string; id?: number | string; params?: any }> = [];
    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        const lines = chunk.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              writtenMessages.push(parsed);
              // When initialize request arrives, push initialize response
              if (parsed.method === "initialize") {
                fakeChild.stdout.push(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: parsed.id,
                    result: {
                      protocolVersion: "2024-11-05",
                      capabilities: { tools: { listChanged: true } },
                      serverInfo: { name: "notebooklm", version: "3.4.0" },
                    },
                  }) + "\n"
                );
              }
            } catch {
              // ignore
            }
          }
        }
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockReturnValue(true);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
    });

    await transport.connect();

    // The FIRST message sent must be JSON-RPC initialize
    expect(writtenMessages.length).toBeGreaterThanOrEqual(2);
    expect(writtenMessages[0].method).toBe("initialize");
    expect(writtenMessages[0].params?.protocolVersion).toBe("2024-11-05");

    // The SECOND message sent must be notification notifications/initialized
    expect(writtenMessages[1].method).toBe("notifications/initialized");
  });

  // -------------------------------------------------------------------------
  // Test 19: MCP initialize failure rejection
  // -------------------------------------------------------------------------
  it("rejects connect when initialize handshake returns protocol error", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        const lines = chunk.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.method === "initialize") {
                fakeChild.stdout.push(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: parsed.id,
                    error: {
                      code: -32600,
                      message: "Unsupported protocol version",
                    },
                  }) + "\n"
                );
              }
            } catch {
              // ignore
            }
          }
        }
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockReturnValue(true);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
    });

    await expect(transport.connect()).rejects.toThrowError(NotebookLMClientError);
  });

  // -------------------------------------------------------------------------
  // Test 20: Concurrent connect calls share the same initialize handshake
  // -------------------------------------------------------------------------
  it("deduplicates concurrent connect calls to a single initialize handshake", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    let initCallCount = 0;
    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        const lines = chunk.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.method === "initialize") {
                initCallCount++;
                setTimeout(() => {
                  fakeChild.stdout.push(
                    JSON.stringify({
                      jsonrpc: "2.0",
                      id: parsed.id,
                      result: {
                        protocolVersion: "2024-11-05",
                        capabilities: {},
                        serverInfo: { name: "notebooklm", version: "3.4.0" },
                      },
                    }) + "\n"
                  );
                }, 10);
              }
            } catch {
              // ignore
            }
          }
        }
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockReturnValue(true);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
      defaultTimeoutMs: 5000,
    });

    // Launch multiple concurrent connect calls
    await Promise.all([
      transport.connect(),
      transport.connect(),
      transport.connect(),
    ]);

    expect(initCallCount).toBe(1);
    expect(transport.isAlive()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 33: Provenance & Citation Preservation
  // -------------------------------------------------------------------------
  it("33. preserves raw citations and references separately from answer content", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_query", () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              answer: "Hàm sóng biểu diễn trạng thái lượng tử [1].",
              sources_used: ["remote-uuid-src-1"],
              citations: { "1": "remote-uuid-src-1" },
              references: [
                {
                  source_id: "remote-uuid-src-1",
                  citation_number: 1,
                  cited_text: "Trạng thái lượng tử được mô tả bằng hàm sóng phi.",
                },
              ],
            }),
          },
        ],
      };
    });

    const client = new NotebookLMMcpClient({ transport });
    const res = await client.query({
      workspaceId: "ws-test",
      prompt: "Tiên đề hàm sóng",
    });

    expect(res.answer).toBe("Hàm sóng biểu diễn trạng thái lượng tử [1].");
    expect(res.citedSourceIds).toEqual(["remote-uuid-src-1"]);
    expect(res.citations).toEqual({ "1": "remote-uuid-src-1" });
    expect(res.references).toHaveLength(1);
    expect(res.references![0]).toEqual({
      sourceId: "remote-uuid-src-1",
      citationNumber: 1,
      citedText: "Trạng thái lượng tử được mô tả bằng hàm sóng phi.",
    });
  });

  it("34. rejects synthetic fallback source IDs in ingestSources and throws MALFORMED_RESPONSE", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    // source_add returns empty object without source_id or id
    transport.registerToolHandler("source_add", () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ status: "success" }),
          },
        ],
      };
    });

    const client = new NotebookLMMcpClient({ transport });
    const res = await client.ingestSources({
      workspaceId: "ws-test",
      sources: [
        {
          type: "inline-text",
          sourceId: "src-real-01",
          title: "Test doc",
          mimeType: "text/markdown",
          textContent: "Text",
          contentHash: "hash-01",
        },
      ],
    });

    // Ingest fails because missing source_id is rejected instead of creating synthetic nlm-src-...
    expect(res.status).toBe("FAILED");
    expect(res.remoteSourceIds).toHaveLength(0);
  });

  it("35. query returns empty citedSourceIds when MCP does not cite sources, rejecting fallback to input sourceIds", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_query", () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              answer: "Câu trả lời chung không trích dẫn nguồn nào cụ thể.",
              sources_used: [],
            }),
          },
        ],
      };
    });

    const client = new NotebookLMMcpClient({ transport });
    const res = await client.query({
      workspaceId: "ws-test",
      prompt: "Hỏi tổng quát",
      sourceIds: ["input-src-1", "input-src-2"],
    });

    // Must NOT fall back to ["input-src-1", "input-src-2"]
    expect(res.citedSourceIds).toEqual([]);
    expect(res.citations).toBeUndefined();
    expect(res.references).toBeUndefined();
  });

  it("36. granular timeout: readiness and CRUD operations use 30000ms, notebook_query defaults to 90000ms, and timeoutMs is not leaked to tool arguments", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("server_info", () => ({
      auth_status: "configured",
      version: "3.4.0",
    }));
    transport.registerToolHandler("notebook_create", () => ({
      content: [{ type: "text", text: JSON.stringify({ notebook_id: "ws-timeout-test" }) }],
    }));
    transport.registerToolHandler("source_add", () => ({
      content: [{ type: "text", text: JSON.stringify({ source_id: "src-timeout-test" }) }],
    }));
    transport.registerToolHandler("notebook_get", () => ({
      content: [{ type: "text", text: JSON.stringify({ id: "ws-timeout-test", title: "Existing" }) }],
    }));
    transport.registerToolHandler("notebook_query", () => ({
      content: [{ type: "text", text: JSON.stringify({ answer: "Grounded answer" }) }],
    }));
    transport.registerToolHandler("notebook_delete", () => ({
      content: [{ type: "text", text: JSON.stringify({ status: "deleted" }) }],
    }));

    const requestSpy = vi.spyOn(transport, "request");
    const client = new NotebookLMMcpClient({ transport });

    // 1. Readiness: checkReadiness (server_info) uses default 30000ms
    await client.checkReadiness();
    const readinessCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "server_info");
    expect(readinessCall).toBeDefined();
    expect(readinessCall![2]?.timeoutMs).toBe(30000);

    // 2. CRUD: createWorkspace (notebook_create) uses default 30000ms
    await client.createWorkspace({ title: "Timeout Test Workspace" });
    const createCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "notebook_create");
    expect(createCall).toBeDefined();
    expect(createCall![2]?.timeoutMs).toBe(30000);

    // 3. CRUD: ingestSources (source_add) uses default 30000ms
    await client.ingestSources({
      workspaceId: "ws-timeout-test",
      sources: [
        {
          type: "inline-text",
          sourceId: "src-01",
          title: "Doc",
          mimeType: "text/plain",
          textContent: "Text",
          contentHash: "hash-01",
        },
      ],
    });
    const ingestCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "source_add");
    expect(ingestCall).toBeDefined();
    expect(ingestCall![2]?.timeoutMs).toBe(30000);

    // 4. CRUD: reconcileWorkspace (notebook_get) uses default 30000ms
    await client.reconcileWorkspace({
      workspaceId: "ws-timeout-test",
      expectedSources: [{ sourceId: "src-01", contentHash: "hash-01" }],
    });
    const reconcileCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "notebook_get");
    expect(reconcileCall).toBeDefined();
    expect(reconcileCall![2]?.timeoutMs).toBe(30000);

    // 5. Query: notebook_query uses granular 90000ms timeout by default
    await client.query({
      workspaceId: "ws-timeout-test",
      prompt: "What is the timeout?",
    });
    const queryCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "notebook_query");
    expect(queryCall).toBeDefined();
    expect(queryCall![2]?.timeoutMs).toBe(90000);

    // Verify timeoutMs is NOT leaked into tool arguments
    const queryArgs = (queryCall![1] as any)?.arguments;
    expect(queryArgs).toBeDefined();
    expect(queryArgs.timeoutMs).toBeUndefined();
    expect(queryArgs).toEqual({
      notebook_id: "ws-timeout-test",
      query: "What is the timeout?",
      source_ids: undefined,
    });

    // 6. CRUD: deleteWorkspace (notebook_delete) uses default 30000ms
    await client.deleteWorkspace({ workspaceId: "ws-timeout-test" });
    const deleteCall = requestSpy.mock.calls.find((c) => (c[1] as any)?.name === "notebook_delete");
    expect(deleteCall).toBeDefined();
    expect(deleteCall![2]?.timeoutMs).toBe(30000);
  });

  it("37. granular timeout: supports custom queryTimeoutMs in constructor and per-call timeoutMs override", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_query", () => ({
      content: [{ type: "text", text: JSON.stringify({ answer: "Custom timeout answer" }) }],
    }));

    const requestSpy = vi.spyOn(transport, "request");

    // Case A: constructor options queryTimeoutMs = 120000
    const clientA = new NotebookLMMcpClient({ transport, queryTimeoutMs: 120000 });
    expect(clientA.getQueryTimeoutMs()).toBe(120000);
    expect(clientA.getDefaultTimeoutMs()).toBe(30000);

    await clientA.query({
      workspaceId: "ws-timeout-test-a",
      prompt: "Query with constructor timeout",
    });
    expect(requestSpy.mock.calls[0][2]?.timeoutMs).toBe(120000);

    // Case B: per-call timeoutMs = 45000 overrides queryTimeoutMs
    requestSpy.mockClear();
    await clientA.query({
      workspaceId: "ws-timeout-test-b",
      prompt: "Query with per-call timeout",
      timeoutMs: 45000,
    });
    expect(requestSpy.mock.calls[0][2]?.timeoutMs).toBe(45000);

    // Ensure arguments did not leak timeoutMs
    const callArgs = (requestSpy.mock.calls[0][1] as any)?.arguments;
    expect(callArgs.timeoutMs).toBeUndefined();
  });

  it("38. StdioMcpTransport initialize handshake uses 30000ms timeout", async () => {
    const fakeChild = new EventEmitter() as ChildProcess & {
      stdin: Writable;
      stdout: Readable;
      stderr: Readable;
      exitCode: number | null;
      killed: boolean;
      kill: (sig?: string) => boolean;
    };

    fakeChild.stdin = new Writable({
      write(chunk, _encoding, callback) {
        const lines = chunk.toString().trim().split("\n");
        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.method === "initialize") {
                fakeChild.stdout.push(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: parsed.id,
                    result: {
                      protocolVersion: "2024-11-05",
                      capabilities: {},
                      serverInfo: { name: "notebooklm", version: "3.4.0" },
                    },
                  }) + "\n"
                );
              }
            } catch {
              // ignore
            }
          }
        }
        callback();
      },
    });
    fakeChild.stdout = new Readable({ read() {} });
    fakeChild.stderr = new Readable({ read() {} });
    fakeChild.exitCode = null;
    fakeChild.killed = false;
    fakeChild.kill = vi.fn().mockReturnValue(true);

    const transport = new StdioMcpTransport({
      binaryPath: "/fake/path/notebooklm-mcp",
      spawnFn: vi.fn().mockReturnValue(fakeChild) as unknown as typeof import("node:child_process").spawn,
    });

    const sendRawSpy = vi.spyOn(transport as any, "sendRawRequest");

    await transport.connect();

    expect(sendRawSpy).toHaveBeenCalledWith(
      "initialize",
      expect.objectContaining({ protocolVersion: "2024-11-05" }),
      { timeoutMs: 30000 }
    );
    expect(transport.isAlive()).toBe(true);
  });

  it("39. granular timeout: invalid timeout values (0, negative, NaN) safely fall back to defaults", async () => {
    const transport = new InMemoryMcpTransport();
    await transport.connect();

    transport.registerToolHandler("notebook_query", () => ({
      content: [{ type: "text", text: JSON.stringify({ answer: "Safe fallback answer" }) }],
    }));

    // Invalid values in constructor fall back safely to 30000ms and 90000ms
    const clientZero = new NotebookLMMcpClient({
      transport,
      requestTimeoutMs: 0,
      queryTimeoutMs: -500,
    });
    expect(clientZero.getDefaultTimeoutMs()).toBe(30000);
    expect(clientZero.getQueryTimeoutMs()).toBe(90000);

    const clientNaN = new NotebookLMMcpClient({
      transport,
      requestTimeoutMs: NaN,
      queryTimeoutMs: NaN,
    });
    expect(clientNaN.getDefaultTimeoutMs()).toBe(30000);
    expect(clientNaN.getQueryTimeoutMs()).toBe(90000);

    const requestSpy = vi.spyOn(transport, "request");

    // Invalid override in query() falls back to configured query timeout (90000ms)
    await clientZero.query({
      workspaceId: "ws-test",
      prompt: "Test query with 0 timeout",
      timeoutMs: 0,
    });
    expect(requestSpy.mock.calls[0][2]?.timeoutMs).toBe(90000);

    requestSpy.mockClear();
    await clientZero.query({
      workspaceId: "ws-test",
      prompt: "Test query with negative timeout",
      timeoutMs: -1000,
    });
    expect(requestSpy.mock.calls[0][2]?.timeoutMs).toBe(90000);

    requestSpy.mockClear();
    await clientZero.query({
      workspaceId: "ws-test",
      prompt: "Test query with NaN timeout",
      timeoutMs: NaN,
    });
    expect(requestSpy.mock.calls[0][2]?.timeoutMs).toBe(90000);
  });
});
