/**
 * Contract Tests for NotebookLM Client Boundary
 * (Phase 1 — NotebookLM Client Contract Stabilization)
 *
 * Verifies that any client implementation (MockNotebookLMClient or future NotebookLMMcpClient)
 * strictly adheres to the NotebookLMClient interface, error taxonomy, cancellation,
 * and security invariants.
 */

import { describe, it, expect, vi } from "vitest";
import {
  NotebookLMClient,
  MockNotebookLMClient,
  NotebookLMClientError,
  NotebookLMClientErrorCode,
  withTimeout,
} from "../../src/server/services/providers/notebooklmClient";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { ExecutionContext, SourcePayload } from "../../src/server/services/providers/types";

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    requestId: "req-contract-test-01",
    correlationId: "corr-contract-test-01",
    attemptId: "att-contract-test-01",
    actor: { userId: "user-contract", role: "user" },
    idempotencyKey: "idem-contract-test-01",
    ...overrides,
  };
}

describe("NOTEBOOKLM CLIENT CONTRACT TESTS (PHASE 1)", () => {
  // Test 1: Notebook creation
  it("1. Notebook creation: returns stable identifier and valid shape", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient();
    const res = await client.createWorkspace({
      title: "Nghiên cứu Phật học & Triết học",
      metadata: { topic: "buddhism-philosophy" },
    });

    expect(res).toBeDefined();
    expect(typeof res.workspaceId).toBe("string");
    expect(res.workspaceId.length).toBeGreaterThan(0);
    expect(res.workspaceId).toMatch(/^nlm-ws-/);
  });

  // Test 2: Source ingestion
  it("2. Source ingestion: processes polymorphic sources and returns identifiers and status", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient();
    const testSources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "src-inline-01",
        title: "Tâm Kinh Giảng Luận",
        mimeType: "text/markdown",
        textContent: "Bát nhã Ba la mật đa...",
        contentHash: "hash-01",
      },
      {
        type: "url",
        sourceId: "src-url-02",
        title: "Nguồn tham khảo",
        url: "https://example.com/reference",
        contentHash: "hash-02",
      },
    ];

    const res = await client.ingestSources({
      workspaceId: "nlm-ws-valid-01",
      sources: testSources,
    });

    expect(res).toBeDefined();
    expect(res.status).toBe("COMPLETED");
    expect(Array.isArray(res.remoteSourceIds)).toBe(true);
    expect(res.remoteSourceIds).toHaveLength(2);
    expect(res.remoteSourceIds[0]).toContain("src-inline-01");
  });

  // Test 3: Query execution
  it("3. Query execution: returns grounded answer and result envelope", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient({
      queryHandler: async (params) => {
        expect(params.workspaceId).toBe("nlm-ws-valid-01");
        expect(params.prompt).toBe("Tóm tắt ý chính của Tâm Kinh");
        return {
          answer: "Tâm Kinh thuyết minh về tính Không của năm uẩn.",
          citedSourceIds: ["src-inline-01"],
          rawEnvelope: { model: "notebooklm-direct-v1" },
        };
      },
    });

    expect(client.query).toBeDefined();
    const res = await client.query!({
      workspaceId: "nlm-ws-valid-01",
      prompt: "Tóm tắt ý chính của Tâm Kinh",
    });

    expect(res.answer).toBe("Tâm Kinh thuyết minh về tính Không của năm uẩn.");
    expect(res.citedSourceIds).toEqual(["src-inline-01"]);
    expect(res.rawEnvelope?.model).toBe("notebooklm-direct-v1");
  });

  // Test 4: Invalid input validation
  it("4. Invalid input: throws typed NotebookLMClientError with VALIDATION_ERROR code", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient();

    // Empty title in createWorkspace
    await expect(
      client.createWorkspace({ title: "   " })
    ).rejects.toThrow(NotebookLMClientError);

    try {
      await client.createWorkspace({ title: "" });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      expect(clientErr.code).toBe<NotebookLMClientErrorCode>("VALIDATION_ERROR");
      expect(clientErr.retryable).toBe(false);
      expect(clientErr.fallbackEligible).toBe(false);
    }

    // Invalid sources in ingestSources
    try {
      await client.ingestSources({
        workspaceId: "nlm-ws-1",
        sources: null as unknown as SourcePayload[],
      });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      expect(clientErr.code).toBe<NotebookLMClientErrorCode>("VALIDATION_ERROR");
    }
  });

  // Test 5: Timeout handling
  it("5. Timeout handling: withTimeout helper throws TIMEOUT error and does not hang", async () => {
    const hangingPromise = new Promise<{ workspaceId: string }>((resolve) => {
      // Intentionally never resolves
      setTimeout(() => resolve({ workspaceId: "never" }), 5000);
    });

    await expect(
      withTimeout(hangingPromise, 50, "testOperation")
    ).rejects.toThrow(NotebookLMClientError);

    try {
      await withTimeout(hangingPromise, 50, "testOperation");
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      expect(clientErr.code).toBe<NotebookLMClientErrorCode>("TIMEOUT");
      expect(clientErr.retryable).toBe(true);
      expect(clientErr.fallbackEligible).toBe(true);
    }
  });

  // Test 6: Malformed response handling
  it("6. Malformed response handling: throws MALFORMED_RESPONSE when response shape is invalid", async () => {
    const malformedClient: NotebookLMClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        // Return malformed object missing workspaceId
        return {} as unknown as { workspaceId: string };
      },
    });

    // Mock client validates response shape when returning from handler
    await expect(
      malformedClient.createWorkspace({ title: "Valid Title" })
    ).rejects.toThrow(NotebookLMClientError);

    try {
      await malformedClient.createWorkspace({ title: "Valid Title" });
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      expect(clientErr.code).toBe<NotebookLMClientErrorCode>("MALFORMED_RESPONSE");
      expect(clientErr.retryable).toBe(false);
    }
  });

  // Test 7: Cancellation handling via AbortSignal
  it("7. Cancellation: AbortSignal triggers CANCELLED error cleanly", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient();
    const controller = new AbortController();
    controller.abort(); // Pre-aborted

    await expect(
      client.createWorkspace({
        title: "Test Abort",
        signal: controller.signal,
      })
    ).rejects.toThrow(NotebookLMClientError);

    try {
      await client.createWorkspace({
        title: "Test Abort",
        signal: controller.signal,
      })
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(NotebookLMClientError);
      const clientErr = err as NotebookLMClientError;
      expect(clientErr.code).toBe<NotebookLMClientErrorCode>("CANCELLED");
    }
  });

  // Test 8: No secret leakage in error messages and serialization
  it("8. No secret leakage: sensitive tokens, keys, passwords are redacted", () => {
    const sensitiveMessage =
      "Failed to connect using Bearer ya29.a0AfH6SM... and key AIzaSyD12345678901234567890123456789012 with postgres://user:super_secret_pwd@db.host:5432/db";

    const error = new NotebookLMClientError({
      code: "PROTOCOL_ERROR",
      message: sensitiveMessage,
    });

    expect(error.message).not.toContain("ya29.a0AfH6SM");
    expect(error.message).not.toContain("AIzaSyD12345678901234567890123456789012");
    expect(error.message).not.toContain("super_secret_pwd");
    expect(error.message).toContain("Bearer [REDACTED]");
    expect(error.message).toContain("[REDACTED_API_KEY]");
    expect(error.message).toContain("[REDACTED]");
  });

  // Test 9: Provider compatibility
  it("9. Provider compatibility: NotebookLMEnterpriseProvider normalizes NotebookLMClientError cleanly", async () => {
    const failingClient: NotebookLMClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        throw new NotebookLMClientError({
          code: "UNAVAILABLE",
          message: "MCP Server connection refused at socket",
          retryable: true,
          fallbackEligible: true,
        });
      },
    });

    const provider = new NotebookLMEnterpriseProvider(failingClient);
    const context = createMockContext();

    await expect(
      provider.createWorkspace(
        { topicTitle: "Test", topicSlug: "test" },
        context
      )
    ).rejects.toThrow();

    try {
      await provider.createWorkspace(
        { topicTitle: "Test", topicSlug: "test" },
        context
      );
    } catch (err: any) {
      expect(err.name).toBe("ProviderException");
      expect(err.errorCode).toBe("PROVIDER_UNAVAILABLE");
      expect(err.retryable).toBe(true);
    }
  });

  // Test 10: Client lifecycle / readiness and close
  it("10. Lifecycle: checkReadiness and close behave deterministically", async () => {
    const client: NotebookLMClient = new MockNotebookLMClient();

    if (client.checkReadiness) {
      const ready = await client.checkReadiness();
      expect(ready.isReady).toBe(true);
      expect(ready.status).toBe("READY");
    }

    if (client.close) {
      await expect(client.close()).resolves.toBeUndefined();
    }
  });
});
