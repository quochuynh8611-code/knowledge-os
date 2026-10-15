/**
 * NotebookLM Direct MCP Client Runtime Adapter
 * (Phase 2 — NotebookLMMcpClient Runtime Adapter)
 *
 * Implements NotebookLMClient contract over Model Context Protocol (MCP) JSON-RPC 2.0.
 * Bridges high-level domain operations to low-level MCP tools:
 * - server_info -> checkReadiness
 * - notebook_create -> createWorkspace
 * - source_add -> ingestSources
 * - notebook_query -> query
 * - studio_create -> generateAudioOverview
 * - studio_status -> getOperationStatus
 * - notebook_get -> reconcileWorkspace
 * - notebook_delete -> deleteWorkspace
 */

import {
  NotebookLMClient,
  NotebookLMClientError,
  NotebookLMClientReadiness,
  NotebookLMQueryInput,
  NotebookLMQueryResult,
} from "./notebooklmClient";
import { ReconciliationResult, SourcePayload } from "./types";
import { sanitizeProviderErrorMessage } from "./errors";
import {
  McpTransport,
  StdioMcpTransport,
  StdioMcpTransportConfig,
  InMemoryMcpTransport,
} from "./notebooklmMcpTransport";

export interface NotebookLMMcpClientOptions {
  transport?: McpTransport;
  stdioConfig?: StdioMcpTransportConfig;
  requestTimeoutMs?: number;
}

/**
 * Parses and extracts structured payload from MCP tools/call result envelope.
 * Supports both standard MCP `{ content: [{ type: "text", text: "..." }] }`
 * and direct dictionary results.
 */
export function unpackMcpToolResult(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") {
    throw new NotebookLMClientError({
      code: "MALFORMED_RESPONSE",
      message: "MCP tool response is null or not an object",
      retryable: false,
    });
  }

  const obj = raw as Record<string, unknown>;

  if (obj.isError === true) {
    const errorMsg =
      Array.isArray(obj.content) && obj.content[0]?.text
        ? String(obj.content[0].text)
        : "MCP tool returned isError=true";
    throw new NotebookLMClientError({
      code: "PROTOCOL_ERROR",
      message: sanitizeProviderErrorMessage(errorMsg),
      retryable: false,
      rawDetails: obj,
    });
  }

  if (Array.isArray(obj.content) && obj.content.length > 0) {
    const firstTextItem = obj.content.find(
      (c) => c && typeof c === "object" && typeof c.text === "string"
    );

    if (firstTextItem && typeof firstTextItem.text === "string") {
      const rawText = firstTextItem.text.trim();
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return { text: rawText };
      }
    }
  }

  return obj;
}

export class NotebookLMMcpClient implements NotebookLMClient {
  private readonly transport: McpTransport;
  private readonly defaultTimeoutMs: number;
  private isClosed: boolean = false;

  constructor(options: NotebookLMMcpClientOptions = {}) {
    this.defaultTimeoutMs = options.requestTimeoutMs || 30000;

    if (options.transport) {
      this.transport = options.transport;
    } else {
      this.transport = new StdioMcpTransport(options.stdioConfig);
    }
  }

  /**
   * Directly exposes the underlying transport (useful for test assertions and inspection).
   */
  public getTransport(): McpTransport {
    return this.transport;
  }

  public async checkReadiness(params?: {
    signal?: AbortSignal;
  }): Promise<NotebookLMClientReadiness> {
    this.assertNotClosed();
    const startTime = Date.now();

    try {
      if (!this.transport.isAlive()) {
        await this.transport.connect();
      }

      const rawResult = await this.transport.request<unknown>(
        "tools/call",
        {
          name: "server_info",
          arguments: {},
        },
        {
          timeoutMs: this.defaultTimeoutMs,
          signal: params?.signal,
        }
      );

      const unpacked = unpackMcpToolResult(rawResult);
      const authStatus = String(unpacked.auth_status || "unknown").toLowerCase();
      const latencyMs = Date.now() - startTime;

      if (authStatus === "configured") {
        return {
          isReady: true,
          status: "READY",
          message: `NotebookLM MCP server ready (v${unpacked.version || "unknown"})`,
          latencyMs,
        };
      }

      if (authStatus === "unverified") {
        return {
          isReady: true,
          status: "INITIALIZING",
          message: "NotebookLM authentication unverified (cached credentials may work)",
          latencyMs,
        };
      }

      if (authStatus === "stale") {
        return {
          isReady: false,
          status: "UNAVAILABLE",
          message: "NotebookLM authentication tokens are stale/expired. Run 'nlm login' to refresh.",
          latencyMs,
        };
      }

      if (authStatus === "not_configured") {
        return {
          isReady: false,
          status: "DISABLED",
          message: "NotebookLM authentication not configured. Run 'nlm login'.",
          latencyMs,
        };
      }

      return {
        isReady: false,
        status: "UNAVAILABLE",
        message: `NotebookLM authentication not configured (status: ${authStatus}). Run 'nlm login'.`,
        latencyMs,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      if (err instanceof NotebookLMClientError) {
        return {
          isReady: false,
          status: "UNAVAILABLE",
          message: `Readiness check failed: ${err.message}`,
          latencyMs,
        };
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      return {
        isReady: false,
        status: "UNAVAILABLE",
        message: `Readiness check failed: ${rawMsg}`,
        latencyMs,
      };
    }
  }

  public async createWorkspace(params: {
    title: string;
    metadata?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<{ workspaceId: string }> {
    this.assertNotClosed();

    if (!params || typeof params.title !== "string" || params.title.trim().length === 0) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "createWorkspace requires a non-empty title string",
        fallbackEligible: false,
      });
    }

    const rawResult = await this.transport.request<unknown>(
      "tools/call",
      {
        name: "notebook_create",
        arguments: {
          title: params.title.trim(),
        },
      },
      {
        timeoutMs: this.defaultTimeoutMs,
        signal: params.signal,
      }
    );

    const unpacked = unpackMcpToolResult(rawResult);

    const workspaceId =
      typeof unpacked.notebook_id === "string" && unpacked.notebook_id.length > 0
        ? unpacked.notebook_id
        : typeof unpacked.id === "string" && unpacked.id.length > 0
        ? unpacked.id
        : typeof unpacked.workspaceId === "string" && unpacked.workspaceId.length > 0
        ? unpacked.workspaceId
        : null;

    if (!workspaceId) {
      throw new NotebookLMClientError({
        code: "MALFORMED_RESPONSE",
        message: "notebook_create response missing valid notebook_id or workspace identifier",
        rawDetails: unpacked,
      });
    }

    return { workspaceId };
  }

  public async ingestSources(params: {
    workspaceId: string;
    sources: SourcePayload[];
    signal?: AbortSignal;
  }): Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }> {
    this.assertNotClosed();

    if (!params || !params.workspaceId || !Array.isArray(params.sources) || params.sources.length === 0) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "ingestSources requires valid workspaceId and non-empty sources array",
        fallbackEligible: false,
      });
    }

    const remoteSourceIds: string[] = [];
    let failureCount = 0;

    for (const source of params.sources) {
      try {
        const toolArgs: Record<string, unknown> = {
          notebook_id: params.workspaceId,
          title: source.title,
        };

        if (source.type === "inline-text") {
          toolArgs.source_type = "text";
          toolArgs.text = source.textContent;
        } else if (source.type === "url") {
          toolArgs.source_type = "url";
          toolArgs.url = source.url;
        } else {
          toolArgs.source_type = "text";
          toolArgs.text = `[Source ${source.sourceId}]`;
        }

        const rawResult = await this.transport.request<unknown>(
          "tools/call",
          {
            name: "source_add",
            arguments: toolArgs,
          },
          {
            timeoutMs: this.defaultTimeoutMs,
            signal: params.signal,
          }
        );

        const unpacked = unpackMcpToolResult(rawResult);
        const sourceId =
          typeof unpacked.source_id === "string"
            ? unpacked.source_id
            : typeof unpacked.id === "string"
            ? unpacked.id
            : `nlm-src-${source.sourceId}`;

        remoteSourceIds.push(sourceId);
      } catch (err: unknown) {
        failureCount++;
        if (params.signal?.aborted) {
          throw err;
        }
      }
    }

    if (failureCount === params.sources.length) {
      return { remoteSourceIds, status: "FAILED" };
    }

    if (failureCount > 0) {
      return { remoteSourceIds, status: "PARTIAL" };
    }

    return { remoteSourceIds, status: "COMPLETED" };
  }

  public async query(params: NotebookLMQueryInput): Promise<NotebookLMQueryResult> {
    this.assertNotClosed();

    if (
      !params ||
      !params.workspaceId ||
      typeof params.prompt !== "string" ||
      params.prompt.trim().length === 0
    ) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "query requires workspaceId and non-empty prompt",
        fallbackEligible: false,
      });
    }

    const rawResult = await this.transport.request<unknown>(
      "tools/call",
      {
        name: "notebook_query",
        arguments: {
          notebook_id: params.workspaceId,
          query: params.prompt,
          source_ids: params.sourceIds,
        },
      },
      {
        timeoutMs: this.defaultTimeoutMs,
        signal: params.signal,
      }
    );

    const unpacked = unpackMcpToolResult(rawResult);

    const answer =
      typeof unpacked.answer === "string"
        ? unpacked.answer
        : typeof unpacked.text === "string"
        ? unpacked.text
        : typeof unpacked.response === "string"
        ? unpacked.response
        : null;

    if (!answer) {
      throw new NotebookLMClientError({
        code: "MALFORMED_RESPONSE",
        message: "notebook_query response missing valid answer string",
        rawDetails: unpacked,
      });
    }

    const citedSourceIds: string[] = Array.isArray(unpacked.cited_sources)
      ? unpacked.cited_sources.map(String)
      : Array.isArray(unpacked.source_ids)
      ? unpacked.source_ids.map(String)
      : params.sourceIds || [];

    return {
      answer,
      citedSourceIds,
      rawEnvelope: unpacked,
    };
  }

  public async generateAudioOverview(params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
    signal?: AbortSignal;
  }): Promise<{ operationId: string }> {
    this.assertNotClosed();

    if (!params || !params.workspaceId) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "generateAudioOverview requires workspaceId",
        fallbackEligible: false,
      });
    }

    const rawResult = await this.transport.request<unknown>(
      "tools/call",
      {
        name: "studio_create",
        arguments: {
          notebook_id: params.workspaceId,
          artifact_type: "audio",
          audio_format: params.format || "deep_dive",
        },
      },
      {
        timeoutMs: this.defaultTimeoutMs,
        signal: params.signal,
      }
    );

    const unpacked = unpackMcpToolResult(rawResult);

    const operationId =
      typeof unpacked.artifact_id === "string"
        ? unpacked.artifact_id
        : typeof unpacked.operation_id === "string"
        ? unpacked.operation_id
        : typeof unpacked.id === "string"
        ? unpacked.id
        : `op-audio-${Date.now()}`;

    return { operationId };
  }

  public async getOperationStatus(
    operationId: string,
    params?: { signal?: AbortSignal }
  ): Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }> {
    this.assertNotClosed();

    if (!operationId || typeof operationId !== "string") {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "getOperationStatus requires operationId",
        fallbackEligible: false,
      });
    }

    const rawResult = await this.transport.request<unknown>(
      "tools/call",
      {
        name: "studio_status",
        arguments: {
          action: "status",
          artifact_id: operationId,
        },
      },
      {
        timeoutMs: this.defaultTimeoutMs,
        signal: params?.signal,
      }
    );

    const unpacked = unpackMcpToolResult(rawResult);

    const statusStr = String(unpacked.status || "").toLowerCase();
    const isDone =
      statusStr === "completed" ||
      statusStr === "done" ||
      statusStr === "success" ||
      unpacked.isDone === true;

    const resultUrl =
      typeof unpacked.url === "string"
        ? unpacked.url
        : typeof unpacked.resultUrl === "string"
        ? unpacked.resultUrl
        : undefined;

    const error = typeof unpacked.error === "string" ? unpacked.error : undefined;

    return {
      isDone,
      resultUrl,
      error,
    };
  }

  public async reconcileWorkspace(params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
    signal?: AbortSignal;
  }): Promise<ReconciliationResult> {
    this.assertNotClosed();

    if (!params.expectedSources || params.expectedSources.length === 0) {
      return "CONFIRMED_ABSENT";
    }

    try {
      const rawResult = await this.transport.request<unknown>(
        "tools/call",
        {
          name: "notebook_get",
          arguments: {
            notebook_id: params.workspaceId,
          },
        },
        {
          timeoutMs: this.defaultTimeoutMs,
          signal: params.signal,
        }
      );

      const unpacked = unpackMcpToolResult(rawResult);

      if (unpacked.not_found === true) {
        return "CONFIRMED_ABSENT";
      }

      if (typeof unpacked.error === "string") {
        const lowerErr = unpacked.error.toLowerCase();
        if (
          lowerErr.includes("not found") ||
          lowerErr.includes("404") ||
          lowerErr.includes("does not exist")
        ) {
          return "CONFIRMED_ABSENT";
        }
        throw new NotebookLMClientError({
          code: "PROTOCOL_ERROR",
          message: `notebook_get error during reconciliation: ${unpacked.error}`,
          rawDetails: unpacked,
        });
      }

      return "CONFIRMED_PRESENT";
    } catch (err: unknown) {
      if (err instanceof NotebookLMClientError) {
        const lowerMsg = err.message.toLowerCase();
        if (
          lowerMsg.includes("not found") ||
          lowerMsg.includes("404") ||
          lowerMsg.includes("does not exist")
        ) {
          return "CONFIRMED_ABSENT";
        }
        throw err;
      }
      throw err;
    }
  }

  public async deleteWorkspace(params: {
    workspaceId: string;
    signal?: AbortSignal;
  }): Promise<boolean> {
    this.assertNotClosed();

    if (!params || !params.workspaceId) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "deleteWorkspace requires workspaceId",
        fallbackEligible: false,
      });
    }

    const rawResult = await this.transport.request<unknown>(
      "tools/call",
      {
        name: "notebook_delete",
        arguments: {
          notebook_id: params.workspaceId,
          confirm: true,
        },
      },
      {
        timeoutMs: this.defaultTimeoutMs,
        signal: params.signal,
      }
    );

    const unpacked = unpackMcpToolResult(rawResult);
    return unpacked.status !== "failed";
  }

  public async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    await this.transport.close();
  }

  private assertNotClosed(): void {
    if (this.isClosed) {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "NotebookLMMcpClient is closed and cannot perform operations",
        retryable: false,
      });
    }
  }
}
