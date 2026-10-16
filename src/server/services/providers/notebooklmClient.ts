/**
 * NotebookLM Client Boundary & In-Memory Fake Implementation
 * (Phase 1 — NotebookLM Client Contract Stabilization)
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real Google Cloud SDK calls.
 * - NO real HTTP/Axios/Fetch requests in this phase.
 * - ZERO hardcoded production credentials or unredacted secrets.
 * - Strict Dependency Injection boundary for NotebookLM Enterprise Provider.
 */

import {
  ReconciliationResult,
  SourcePayload,
} from "./types";
import {
  sanitizeProviderErrorMessage,
} from "./errors";

/**
 * Standardized Error Taxonomy for NotebookLM Client Operations.
 */
export type NotebookLMClientErrorCode =
  | "CONFIGURATION_ERROR"
  | "PROVIDER_DISABLED"
  | "VALIDATION_ERROR"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "PROTOCOL_ERROR"
  | "MALFORMED_RESPONSE"
  | "CANCELLED"
  | "INTERNAL_ERROR";

/**
 * Typed Exception for all NotebookLM Client implementations.
 * Automatically sanitizes all messages to prevent secret/token leakage.
 */
export class NotebookLMClientError extends Error {
  public readonly code: NotebookLMClientErrorCode;
  public readonly retryable: boolean;
  public readonly fallbackEligible: boolean;
  public readonly rawDetails?: unknown;

  constructor(params: {
    code: NotebookLMClientErrorCode;
    message: string;
    retryable?: boolean;
    fallbackEligible?: boolean;
    rawDetails?: unknown;
  }) {
    const cleanMessage = sanitizeProviderErrorMessage(params.message);
    super(cleanMessage);
    this.name = "NotebookLMClientError";
    this.code = params.code;
    this.retryable =
      params.retryable ??
      (params.code === "UNAVAILABLE" || params.code === "TIMEOUT");
    this.fallbackEligible =
      params.fallbackEligible ??
      (params.code === "UNAVAILABLE" ||
        params.code === "TIMEOUT" ||
        params.code === "PROVIDER_DISABLED");
    this.rawDetails = params.rawDetails;

    Object.setPrototypeOf(this, NotebookLMClientError.prototype);
  }
}

/**
 * Utility helper to enforce deterministic execution deadlines.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new NotebookLMClientError({
          code: "TIMEOUT",
          message: `Operation '${operationName}' timed out after ${timeoutMs}ms`,
          retryable: true,
          fallbackEligible: true,
        })
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new NotebookLMClientError({
      code: "CANCELLED",
      message: "Operation was cancelled by AbortSignal",
      retryable: false,
      fallbackEligible: false,
    });
  }
}

export interface NotebookLMClientReadiness {
  readonly isReady: boolean;
  readonly status: "READY" | "INITIALIZING" | "UNAVAILABLE" | "DISABLED";
  readonly message?: string;
  readonly latencyMs?: number;
}

export interface NotebookLMQueryInput {
  readonly workspaceId: string;
  readonly prompt: string;
  readonly sourceIds?: string[];
  readonly signal?: AbortSignal;
}

export interface NotebookLMCitationReference {
  readonly citationNumber: number;
  readonly sourceId: string;
  readonly citedText?: string;
  readonly sourceTitle?: string;
}

export interface NotebookLMQueryResult {
  readonly answer: string;
  readonly citedSourceIds?: string[];
  readonly rawEnvelope?: Record<string, unknown>;
  readonly citations?: Record<string, string>;
  readonly references?: NotebookLMCitationReference[];
}

/**
 * Clean boundary interface for NotebookLM communication.
 * Implemented by MockNotebookLMClient and future NotebookLMMcpClient.
 */
export interface NotebookLMClient {
  /**
   * Checks whether client/session is ready for operations.
   */
  checkReadiness?(params?: { signal?: AbortSignal }): Promise<NotebookLMClientReadiness>;

  /**
   * Creates a remote workspace (Notebook) in NotebookLM Enterprise.
   */
  createWorkspace(params: {
    title: string;
    metadata?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<{ workspaceId: string }>;

  /**
   * Ingests polymorphic sources (inline markdown text, safe file metadata, url) into workspace.
   */
  ingestSources(params: {
    workspaceId: string;
    sources: SourcePayload[];
    signal?: AbortSignal;
  }): Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }>;

  /**
   * Queries the grounded workspace/notebook with prompt.
   */
  query?(params: NotebookLMQueryInput): Promise<NotebookLMQueryResult>;

  /**
   * Triggers an asynchronous Audio Overview generation operation.
   */
  generateAudioOverview(params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
    signal?: AbortSignal;
  }): Promise<{ operationId: string }>;

  /**
   * Checks the execution status of an ongoing asynchronous operation.
   */
  getOperationStatus(
    operationId: string,
    params?: { signal?: AbortSignal }
  ): Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }>;

  /**
   * Reconciles whether ingested sources are present on the remote workspace.
   */
  reconcileWorkspace(params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
    signal?: AbortSignal;
  }): Promise<ReconciliationResult>;

  /**
   * Deletes a remote workspace permanently.
   */
  deleteWorkspace(params: { workspaceId: string; signal?: AbortSignal }): Promise<boolean>;

  /**
   * Deterministically cleans up any open sessions or child processes.
   */
  close?(): Promise<void>;
}

/**
 * Options for configuring MockNotebookLMClient test behavior.
 */
export interface MockNotebookLMClientOptions {
  checkReadinessHandler?: (params?: { signal?: AbortSignal }) => Promise<NotebookLMClientReadiness>;

  createWorkspaceHandler?: (params: {
    title: string;
    metadata?: Record<string, string>;
    signal?: AbortSignal;
  }) => Promise<{ workspaceId: string }>;

  ingestSourcesHandler?: (params: {
    workspaceId: string;
    sources: SourcePayload[];
    signal?: AbortSignal;
  }) => Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }>;

  queryHandler?: (params: NotebookLMQueryInput) => Promise<NotebookLMQueryResult>;

  generateAudioOverviewHandler?: (params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
    signal?: AbortSignal;
  }) => Promise<{ operationId: string }>;

  getOperationStatusHandler?: (
    operationId: string,
    params?: { signal?: AbortSignal }
  ) => Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }>;

  reconcileWorkspaceHandler?: (params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
    signal?: AbortSignal;
  }) => Promise<ReconciliationResult>;

  deleteWorkspaceHandler?: (params: {
    workspaceId: string;
    signal?: AbortSignal;
  }) => Promise<boolean>;

  closeHandler?: () => Promise<void>;
}

/**
 * Deterministic In-Memory Mock Implementation of NotebookLMClient for Unit Testing.
 */
export class MockNotebookLMClient implements NotebookLMClient {
  public createdWorkspaces: Array<{ title: string; metadata?: Record<string, string>; workspaceId: string }> = [];
  public ingestedBatches: Array<{ workspaceId: string; sources: SourcePayload[] }> = [];
  public generatedOperations: Array<{ workspaceId: string; format: "deep_dive" | "brief"; operationId: string }> = [];
  public deletedWorkspaceIds: string[] = [];
  public isClosed: boolean = false;

  constructor(private readonly options: MockNotebookLMClientOptions = {}) {}

  async checkReadiness(params?: { signal?: AbortSignal }): Promise<NotebookLMClientReadiness> {
    throwIfAborted(params?.signal);
    if (this.options.checkReadinessHandler) {
      return this.options.checkReadinessHandler(params);
    }
    return {
      isReady: true,
      status: "READY",
      message: "Client boundary configured",
      latencyMs: 1,
    };
  }

  async createWorkspace(params: {
    title: string;
    metadata?: Record<string, string>;
    signal?: AbortSignal;
  }): Promise<{ workspaceId: string }> {
    throwIfAborted(params.signal);

    if (!params || typeof params.title !== "string" || params.title.trim().length === 0) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "Workspace title must be a non-empty string",
        fallbackEligible: false,
      });
    }

    if (this.options.createWorkspaceHandler) {
      const res = await this.options.createWorkspaceHandler(params);
      if (!res || typeof res.workspaceId !== "string" || res.workspaceId.length === 0) {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "createWorkspace response missing valid workspaceId",
          retryable: false,
        });
      }
      return res;
    }

    const workspaceId = `nlm-ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.createdWorkspaces.push({ ...params, workspaceId });
    return { workspaceId };
  }

  async ingestSources(params: {
    workspaceId: string;
    sources: SourcePayload[];
    signal?: AbortSignal;
  }): Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }> {
    throwIfAborted(params.signal);

    if (!params || !params.workspaceId || !Array.isArray(params.sources)) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "Invalid ingestion parameters: workspaceId and sources array required",
        fallbackEligible: false,
      });
    }

    if (this.options.ingestSourcesHandler) {
      const res = await this.options.ingestSourcesHandler(params);
      if (!res || !Array.isArray(res.remoteSourceIds) || !res.status) {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "ingestSources response missing remoteSourceIds array or status",
          retryable: false,
        });
      }
      return res;
    }

    this.ingestedBatches.push(params);
    const remoteSourceIds = params.sources.map((s) => `nlm-src-${s.sourceId}`);
    return {
      remoteSourceIds,
      status: "COMPLETED",
    };
  }

  async query(params: NotebookLMQueryInput): Promise<NotebookLMQueryResult> {
    throwIfAborted(params.signal);

    if (
      !params ||
      !params.workspaceId ||
      typeof params.prompt !== "string" ||
      params.prompt.trim().length === 0
    ) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "Query requires workspaceId and non-empty prompt",
        fallbackEligible: false,
      });
    }

    if (this.options.queryHandler) {
      const res = await this.options.queryHandler(params);
      if (!res || typeof res.answer !== "string") {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "query response missing string answer",
          retryable: false,
        });
      }
      return res;
    }

    return {
      answer: `Mock grounded answer for: ${params.prompt}`,
      citedSourceIds: params.sourceIds || [],
      rawEnvelope: { mock: true },
    };
  }

  async generateAudioOverview(params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
    signal?: AbortSignal;
  }): Promise<{ operationId: string }> {
    throwIfAborted(params.signal);

    if (!params || !params.workspaceId) {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "generateAudioOverview requires workspaceId",
        fallbackEligible: false,
      });
    }

    if (this.options.generateAudioOverviewHandler) {
      const res = await this.options.generateAudioOverviewHandler(params);
      if (!res || typeof res.operationId !== "string") {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "generateAudioOverview response missing operationId",
          retryable: false,
        });
      }
      return res;
    }

    const operationId = `nlm-op-audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.generatedOperations.push({ ...params, operationId });
    return { operationId };
  }

  async getOperationStatus(
    operationId: string,
    params?: { signal?: AbortSignal }
  ): Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }> {
    throwIfAborted(params?.signal);

    if (!operationId || typeof operationId !== "string") {
      throw new NotebookLMClientError({
        code: "VALIDATION_ERROR",
        message: "getOperationStatus requires operationId",
        fallbackEligible: false,
      });
    }

    if (this.options.getOperationStatusHandler) {
      const res = await this.options.getOperationStatusHandler(operationId, params);
      if (!res || typeof res.isDone !== "boolean") {
        throw new NotebookLMClientError({
          code: "MALFORMED_RESPONSE",
          message: "getOperationStatus response missing isDone boolean",
          retryable: false,
        });
      }
      return res;
    }

    return {
      isDone: true,
      resultUrl: `https://notebooklm.google.com/audio/${operationId}.mp3`,
    };
  }

  async reconcileWorkspace(params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
    signal?: AbortSignal;
  }): Promise<ReconciliationResult> {
    throwIfAborted(params.signal);

    if (this.options.reconcileWorkspaceHandler) {
      return this.options.reconcileWorkspaceHandler(params);
    }
    if (!params.expectedSources || params.expectedSources.length === 0) {
      return "CONFIRMED_ABSENT";
    }
    return "CONFIRMED_PRESENT";
  }

  async deleteWorkspace(params: { workspaceId: string; signal?: AbortSignal }): Promise<boolean> {
    throwIfAborted(params.signal);

    if (this.options.deleteWorkspaceHandler) {
      return this.options.deleteWorkspaceHandler(params);
    }
    this.deletedWorkspaceIds.push(params.workspaceId);
    return true;
  }

  async close(): Promise<void> {
    if (this.options.closeHandler) {
      await this.options.closeHandler();
    }
    this.isClosed = true;
  }
}
