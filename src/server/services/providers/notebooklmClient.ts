/**
 * NotebookLM Client Boundary & In-Memory Fake Implementation
 * (Phase 4.4 Production Boundary Interface)
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
  ProviderException,
  sanitizeProviderErrorMessage,
} from "./errors";

/**
 * Clean boundary interface for NotebookLM Enterprise API communication.
 */
export interface NotebookLMClient {
  /**
   * Creates a remote workspace (Notebook) in NotebookLM Enterprise.
   */
  createWorkspace(params: {
    title: string;
    metadata?: Record<string, string>;
  }): Promise<{ workspaceId: string }>;

  /**
   * Ingests polymorphic sources (inline markdown text, safe file metadata, url) into workspace.
   */
  ingestSources(params: {
    workspaceId: string;
    sources: SourcePayload[];
  }): Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }>;

  /**
   * Triggers an asynchronous Audio Overview generation operation.
   */
  generateAudioOverview(params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
  }): Promise<{ operationId: string }>;

  /**
   * Checks the execution status of an ongoing asynchronous operation.
   */
  getOperationStatus(operationId: string): Promise<{
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
  }): Promise<ReconciliationResult>;

  /**
   * Deletes a remote workspace permanently.
   */
  deleteWorkspace(params: { workspaceId: string }): Promise<boolean>;
}

/**
 * Options for configuring MockNotebookLMClient test behavior.
 */
export interface MockNotebookLMClientOptions {
  createWorkspaceHandler?: (params: {
    title: string;
    metadata?: Record<string, string>;
  }) => Promise<{ workspaceId: string }>;

  ingestSourcesHandler?: (params: {
    workspaceId: string;
    sources: SourcePayload[];
  }) => Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }>;

  generateAudioOverviewHandler?: (params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
  }) => Promise<{ operationId: string }>;

  getOperationStatusHandler?: (operationId: string) => Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }>;

  reconcileWorkspaceHandler?: (params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
  }) => Promise<ReconciliationResult>;

  deleteWorkspaceHandler?: (params: {
    workspaceId: string;
  }) => Promise<boolean>;
}

/**
 * Deterministic In-Memory Mock Implementation of NotebookLMClient for Unit Testing.
 */
export class MockNotebookLMClient implements NotebookLMClient {
  public createdWorkspaces: Array<{ title: string; metadata?: Record<string, string>; workspaceId: string }> = [];
  public ingestedBatches: Array<{ workspaceId: string; sources: SourcePayload[] }> = [];
  public generatedOperations: Array<{ workspaceId: string; format: "deep_dive" | "brief"; operationId: string }> = [];
  public deletedWorkspaceIds: string[] = [];

  constructor(private readonly options: MockNotebookLMClientOptions = {}) {}

  async createWorkspace(params: {
    title: string;
    metadata?: Record<string, string>;
  }): Promise<{ workspaceId: string }> {
    if (this.options.createWorkspaceHandler) {
      return this.options.createWorkspaceHandler(params);
    }
    const workspaceId = `nlm-ws-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.createdWorkspaces.push({ ...params, workspaceId });
    return { workspaceId };
  }

  async ingestSources(params: {
    workspaceId: string;
    sources: SourcePayload[];
  }): Promise<{
    remoteSourceIds: string[];
    status: "COMPLETED" | "PARTIAL" | "FAILED";
  }> {
    if (this.options.ingestSourcesHandler) {
      return this.options.ingestSourcesHandler(params);
    }
    this.ingestedBatches.push(params);
    const remoteSourceIds = params.sources.map((s) => `nlm-src-${s.sourceId}`);
    return {
      remoteSourceIds,
      status: "COMPLETED",
    };
  }

  async generateAudioOverview(params: {
    workspaceId: string;
    format: "deep_dive" | "brief";
  }): Promise<{ operationId: string }> {
    if (this.options.generateAudioOverviewHandler) {
      return this.options.generateAudioOverviewHandler(params);
    }
    const operationId = `nlm-op-audio-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.generatedOperations.push({ ...params, operationId });
    return { operationId };
  }

  async getOperationStatus(operationId: string): Promise<{
    isDone: boolean;
    resultUrl?: string;
    error?: string;
  }> {
    if (this.options.getOperationStatusHandler) {
      return this.options.getOperationStatusHandler(operationId);
    }
    return {
      isDone: true,
      resultUrl: `https://notebooklm.google.com/audio/${operationId}.mp3`,
    };
  }

  async reconcileWorkspace(params: {
    workspaceId: string;
    expectedSources: Array<{ sourceId: string; contentHash: string }>;
  }): Promise<ReconciliationResult> {
    if (this.options.reconcileWorkspaceHandler) {
      return this.options.reconcileWorkspaceHandler(params);
    }
    if (params.expectedSources.length === 0) {
      return "CONFIRMED_ABSENT";
    }
    return "CONFIRMED_PRESENT";
  }

  async deleteWorkspace(params: { workspaceId: string }): Promise<boolean> {
    if (this.options.deleteWorkspaceHandler) {
      return this.options.deleteWorkspaceHandler(params);
    }
    this.deletedWorkspaceIds.push(params.workspaceId);
    return true;
  }
}
