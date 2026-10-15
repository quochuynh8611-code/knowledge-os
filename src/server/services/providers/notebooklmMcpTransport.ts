/**
 * NotebookLM MCP Transport Layer
 * (Phase 2 — NotebookLMMcpClient Runtime Adapter)
 *
 * Provides transport abstraction for Model Context Protocol (MCP) JSON-RPC 2.0 communication.
 * Separates transport lifecycle (process spawn, streams, correlation, timeouts, cleanup)
 * from high-level domain tool mapping.
 */

import { spawn, ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import {
  NotebookLMClientError,
  withTimeout,
} from "./notebooklmClient";
import { sanitizeProviderErrorMessage } from "./errors";

export type JsonRpcId = string | number;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpToolCallResult {
  content?: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

export interface McpTransportOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Common Transport Abstraction for MCP Clients.
 */
export interface McpTransport {
  connect(): Promise<void>;
  request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    options?: McpTransportOptions
  ): Promise<T>;
  notify(method: string, params?: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  isAlive(): boolean;
}

// ---------------------------------------------------------------------------
// In-Memory Transport (Deterministic, Unit Testing & Fast CI)
// ---------------------------------------------------------------------------

export type InMemoryMcpHandler = (
  method: string,
  params?: Record<string, unknown>
) => Promise<unknown> | unknown;

export class InMemoryMcpTransport implements McpTransport {
  private connected: boolean = false;
  private closed: boolean = false;
  private handlers = new Map<string, InMemoryMcpHandler>();
  private defaultHandler?: InMemoryMcpHandler;
  public requestsReceived: Array<{ method: string; params?: Record<string, unknown> }> = [];

  constructor(handlers?: Record<string, InMemoryMcpHandler>) {
    if (handlers) {
      for (const [method, handler] of Object.entries(handlers)) {
        this.handlers.set(method, handler);
      }
    }
  }

  public registerHandler(method: string, handler: InMemoryMcpHandler): void {
    this.handlers.set(method, handler);
  }

  public registerToolHandler(
    toolName: string,
    handler: (args: Record<string, unknown>) => Promise<unknown> | unknown
  ): void {
    this.handlers.set(`tools/call:${toolName}`, async (_method, params) => {
      const args = (params?.arguments as Record<string, unknown>) || {};
      return handler(args);
    });
  }

  public setDefaultHandler(handler: InMemoryMcpHandler): void {
    this.defaultHandler = handler;
  }

  public async connect(): Promise<void> {
    if (this.closed) {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "InMemoryMcpTransport is closed and cannot be reconnected",
      });
    }
    this.connected = true;
  }

  public async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    options?: McpTransportOptions
  ): Promise<T> {
    if (!this.connected || this.closed) {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "InMemoryMcpTransport is not connected",
      });
    }

    if (options?.signal?.aborted) {
      throw new NotebookLMClientError({
        code: "CANCELLED",
        message: "MCP request cancelled by AbortSignal",
      });
    }

    this.requestsReceived.push({ method, params });

    const execPromise = (async () => {
      // Check tool-specific handler if method is tools/call
      if (method === "tools/call" && params?.name) {
        const toolKey = `tools/call:${params.name}`;
        const toolHandler = this.handlers.get(toolKey);
        if (toolHandler) {
          return (await toolHandler(method, params)) as T;
        }
      }

      const handler = this.handlers.get(method) || this.defaultHandler;
      if (!handler) {
        throw new NotebookLMClientError({
          code: "PROTOCOL_ERROR",
          message: `No handler registered for MCP method: ${method}`,
        });
      }

      return (await handler(method, params)) as T;
    })();

    let effectivePromise = execPromise;

    if (options?.signal) {
      const abortPromise = new Promise<never>((_, reject) => {
        options.signal!.addEventListener(
          "abort",
          () => {
            reject(
              new NotebookLMClientError({
                code: "CANCELLED",
                message: "MCP request cancelled by AbortSignal",
              })
            );
          },
          { once: true }
        );
      });
      effectivePromise = Promise.race([execPromise, abortPromise]);
    }

    if (options?.timeoutMs && options.timeoutMs > 0) {
      return withTimeout(effectivePromise, options.timeoutMs, `MCP request ${method}`);
    }

    return effectivePromise;
  }

  public async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.connected || this.closed) {
      return;
    }
    this.requestsReceived.push({ method, params });
  }

  public async close(): Promise<void> {
    this.connected = false;
    this.closed = true;
  }

  public isAlive(): boolean {
    return this.connected && !this.closed;
  }
}

// ---------------------------------------------------------------------------
// Stdio MCP Transport (Child Process over JSON-RPC 2.0 lines)
// ---------------------------------------------------------------------------

export interface StdioMcpTransportConfig {
  binaryPath?: string;
  binaryName?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  defaultTimeoutMs?: number;
  spawnFn?: typeof spawn;
  logger?: (level: "info" | "warn" | "error" | "debug", message: string) => void;
}

interface PendingRequestRecord {
  id: JsonRpcId;
  method: string;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeoutTimer?: NodeJS.Timeout;
  signalListener?: () => void;
  signal?: AbortSignal;
}

export class StdioMcpTransport implements McpTransport {
  private readonly config: StdioMcpTransportConfig;
  private readonly spawnFn: typeof spawn;
  private childProcess: ChildProcess | null = null;
  private stdoutBuffer: string = "";
  private pendingRequests = new Map<JsonRpcId, PendingRequestRecord>();
  private nextRequestId: number = 0;
  private isConnecting: boolean = false;
  private isClosed: boolean = false;

  constructor(config: StdioMcpTransportConfig = {}) {
    this.config = {
      defaultTimeoutMs: 30000,
      binaryName: "notebooklm-mcp",
      ...config,
    };
    this.spawnFn = config.spawnFn || spawn;
  }

  /**
   * Resolves the executable path to spawn according to strict precedence:
   * 1. Explicit config `binaryPath`
   * 2. Environment variable NOTEBOOKLM_MCP_BIN or NOTEBOOKLM_MCP_PATH
   * 3. Fallback to `binaryName` (PATH lookup)
   */
  public resolveExecutable(): { executable: string; isExplicit: boolean } {
    const explicitConfig = this.config.binaryPath?.trim();
    if (explicitConfig && explicitConfig.length > 0) {
      return { executable: explicitConfig, isExplicit: true };
    }

    const envBin = process.env.NOTEBOOKLM_MCP_BIN?.trim() || process.env.NOTEBOOKLM_MCP_PATH?.trim();
    if (envBin && envBin.length > 0) {
      return { executable: envBin, isExplicit: true };
    }

    const fallbackName = this.config.binaryName?.trim() || "notebooklm-mcp";
    return { executable: fallbackName, isExplicit: false };
  }

  public async connect(): Promise<void> {
    if (this.childProcess && this.isAlive()) {
      return;
    }
    if (this.isClosed) {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "StdioMcpTransport is closed and cannot be reconnected",
        retryable: false,
      });
    }
    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const { executable, isExplicit } = this.resolveExecutable();

      // If explicit path was given and not using custom spawnFn, check file accessibility before spawning
      if (isExplicit && !this.config.spawnFn && !fs.existsSync(executable)) {
        throw new NotebookLMClientError({
          code: "CONFIGURATION_ERROR",
          message: `Explicit NotebookLM MCP binary not found at path: ${executable}`,
          retryable: false,
        });
      }

      const spawnArgs = this.config.args || [];
      const spawnEnv = {
        ...process.env,
        ...(this.config.env || {}),
      };

      const proc = this.spawnFn(executable, spawnArgs, {
        cwd: this.config.cwd,
        env: spawnEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.childProcess = proc;

      // Handle stdout line-buffered streaming
      proc.stdout?.on("data", (chunk: Buffer | string) => {
        this.stdoutBuffer += chunk.toString("utf-8");
        this.processStdoutBuffer();
      });

      // Handle stderr with strict security sanitization
      proc.stderr?.on("data", (chunk: Buffer | string) => {
        const raw = chunk.toString("utf-8");
        const sanitized = sanitizeProviderErrorMessage(raw);
        if (this.config.logger) {
          this.config.logger("debug", `[MCP-STDERR] ${sanitized}`);
        }
      });

      // Handle unexpected process exit or crash
      proc.on("error", (err: Error) => {
        const sanitizedMsg = sanitizeProviderErrorMessage(err.message);
        this.handleProcessTermination(
          new NotebookLMClientError({
            code: "UNAVAILABLE",
            message: `MCP process error: ${sanitizedMsg}`,
            retryable: true,
          })
        );
      });

      proc.on("close", (code: number | null, signal: string | null) => {
        this.handleProcessTermination(
          new NotebookLMClientError({
            code: "UNAVAILABLE",
            message: `MCP process exited unexpectedly (code: ${code}, signal: ${signal})`,
            retryable: true,
          })
        );
      });
    } catch (err: unknown) {
      this.childProcess = null;
      if (err instanceof NotebookLMClientError) {
        throw err;
      }
      const rawMsg = err instanceof Error ? err.message : String(err);
      throw new NotebookLMClientError({
        code: "CONFIGURATION_ERROR",
        message: `Failed to initialize MCP transport: ${sanitizeProviderErrorMessage(rawMsg)}`,
        retryable: false,
      });
    } finally {
      this.isConnecting = false;
    }
  }

  public async request<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    options?: McpTransportOptions
  ): Promise<T> {
    if (!this.isAlive()) {
      await this.connect();
    }

    if (!this.childProcess || !this.childProcess.stdin || !this.childProcess.stdin.writable) {
      throw new NotebookLMClientError({
        code: "UNAVAILABLE",
        message: "MCP process stdin stream is not writable",
        retryable: true,
      });
    }

    if (options?.signal?.aborted) {
      throw new NotebookLMClientError({
        code: "CANCELLED",
        message: "MCP request was cancelled by AbortSignal before transmission",
        retryable: false,
      });
    }

    const requestId = ++this.nextRequestId;
    const timeoutMs = options?.timeoutMs || this.config.defaultTimeoutMs || 30000;

    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: requestId,
      method,
      params,
    };

    return new Promise<T>((resolve, reject) => {
      let timeoutTimer: NodeJS.Timeout | undefined;
      let signalListener: (() => void) | undefined;

      const cleanup = () => {
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        if (signalListener && options?.signal) {
          options.signal.removeEventListener("abort", signalListener);
        }
        this.pendingRequests.delete(requestId);
      };

      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          cleanup();
          reject(
            new NotebookLMClientError({
              code: "TIMEOUT",
              message: `MCP request '${method}' (id: ${requestId}) timed out after ${timeoutMs}ms`,
              retryable: false,
            })
          );
        }, timeoutMs);
      }

      if (options?.signal) {
        signalListener = () => {
          cleanup();
          reject(
            new NotebookLMClientError({
              code: "CANCELLED",
              message: `MCP request '${method}' (id: ${requestId}) was cancelled`,
              retryable: false,
            })
          );
        };
        options.signal.addEventListener("abort", signalListener, { once: true });
      }

      this.pendingRequests.set(requestId, {
        id: requestId,
        method,
        resolve: (val) => {
          cleanup();
          resolve(val as T);
        },
        reject: (err) => {
          cleanup();
          reject(err);
        },
        timeoutTimer,
        signalListener,
        signal: options?.signal,
      });

      try {
        const serialized = JSON.stringify(payload) + "\n";
        this.childProcess?.stdin?.write(serialized, "utf-8", (err) => {
          if (err) {
            cleanup();
            reject(
              new NotebookLMClientError({
                code: "UNAVAILABLE",
                message: `Failed to write to MCP stdin: ${sanitizeProviderErrorMessage(err.message)}`,
                retryable: true,
              })
            );
          }
        });
      } catch (err: unknown) {
        cleanup();
        const raw = err instanceof Error ? err.message : String(err);
        reject(
          new NotebookLMClientError({
            code: "PROTOCOL_ERROR",
            message: `Serialization failure for MCP request: ${sanitizeProviderErrorMessage(raw)}`,
            retryable: false,
          })
        );
      }
    });
  }

  public async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    if (!this.isAlive()) {
      return;
    }
    if (!this.childProcess?.stdin?.writable) {
      return;
    }

    const payload: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    try {
      this.childProcess.stdin.write(JSON.stringify(payload) + "\n");
    } catch {
      // Best-effort notification delivery
    }
  }

  public async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;

    // Reject all active requests cleanly
    const shutdownError = new NotebookLMClientError({
      code: "UNAVAILABLE",
      message: "StdioMcpTransport is closing",
      retryable: false,
    });

    for (const record of this.pendingRequests.values()) {
      if (record.timeoutTimer) {
        clearTimeout(record.timeoutTimer);
      }
      if (record.signalListener && record.signal) {
        record.signal.removeEventListener("abort", record.signalListener);
      }
      record.reject(shutdownError);
    }
    this.pendingRequests.clear();

    if (this.childProcess) {
      try {
        this.childProcess.stdin?.end();
        this.childProcess.kill("SIGTERM");
      } catch {
        // Process might already be dead
      }
      this.childProcess = null;
    }
  }

  public isAlive(): boolean {
    return (
      !this.isClosed &&
      this.childProcess !== null &&
      this.childProcess.exitCode === null &&
      !this.childProcess.killed
    );
  }

  private processStdoutBuffer(): void {
    let newlineIdx = this.stdoutBuffer.indexOf("\n");
    while (newlineIdx !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIdx).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIdx + 1);

      if (line.length > 0) {
        this.handleResponseLine(line);
      }

      newlineIdx = this.stdoutBuffer.indexOf("\n");
    }
  }

  private handleResponseLine(line: string): void {
    let parsed: JsonRpcResponse;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Discard malformed non-JSON lines or protocol chatter
      return;
    }

    if (!parsed || typeof parsed !== "object" || parsed.jsonrpc !== "2.0") {
      return;
    }

    const reqId = parsed.id;
    if (reqId === null || reqId === undefined) {
      return;
    }

    const pending = this.pendingRequests.get(reqId);
    if (!pending) {
      return;
    }

    if (parsed.error) {
      pending.reject(
        new NotebookLMClientError({
          code: "PROTOCOL_ERROR",
          message: `MCP JSON-RPC error (${parsed.error.code}): ${parsed.error.message}`,
          rawDetails: parsed.error,
        })
      );
      return;
    }

    pending.resolve(parsed.result);
  }

  private handleProcessTermination(cause: NotebookLMClientError): void {
    for (const record of this.pendingRequests.values()) {
      if (record.timeoutTimer) {
        clearTimeout(record.timeoutTimer);
      }
      if (record.signalListener && record.signal) {
        record.signal.removeEventListener("abort", record.signalListener);
      }
      record.reject(cause);
    }
    this.pendingRequests.clear();
    this.childProcess = null;
  }
}
