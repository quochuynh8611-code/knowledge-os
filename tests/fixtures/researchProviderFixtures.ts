import crypto from "crypto";
import path from "path";
import fs from "fs";

// ─── 1. Core Provider Contract & Types for Testing ────────────────────────────

export type ProviderType = "official" | "legacy" | "experimental";

export type ProviderErrorCode =
  | "INVALID_ARGUMENT"
  | "AUTHENTICATION_FAILED"
  | "PERMISSION_DENIED"
  | "CAPABILITY_UNSUPPORTED"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT"
  | "INTERNAL_ERROR";

export class ProviderException extends Error {
  constructor(
    public readonly errorCode: ProviderErrorCode,
    message: string,
    public readonly correlationId?: string,
    public readonly providerId?: string,
    public readonly retryable: boolean = false,
    public readonly rawDetails?: unknown
  ) {
    super(message);
    this.name = "ProviderException";
  }
}

export interface ProviderMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: ProviderType;
  readonly description: string;
}

export interface ProviderCapabilities {
  readonly supportsNotebookManagement: boolean;
  readonly supportsSourceIngestion: boolean;
  readonly supportsAudioOverview: boolean;
  readonly supportsBatchSourceDelete: boolean;
  readonly supportsQuery: boolean;
  readonly supportsInteractiveChat: boolean;
  readonly supportsStudyGuide: boolean;
  readonly supportsMindMap: boolean;
  readonly supportsSlides: boolean;
  readonly supportsAsyncHandoffCLI: boolean;
  readonly supportsLocalAgentHandoff: boolean;
}

export interface ExecutionContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly attemptId: string;
  readonly actor: {
    readonly userId?: string;
    readonly role: "user" | "system" | "agent";
  };
  readonly idempotencyKey: string;
  readonly allowFallback?: boolean;
  readonly approvalProof?: {
    readonly approvedBy: string;
    readonly approvedAt: string;
    readonly intent: "delete_workspace" | "force_retry_unknown" | "manual_fallback";
  };
}

export interface JobRef {
  readonly providerId: string;
  readonly remoteJobId: string;
  readonly workspaceId: string;
  readonly correlationId: string;
  readonly initiatedAt: string;
}

export interface ProviderAttemptRecord {
  readonly attemptId: string;
  readonly providerId: string;
  readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "UNKNOWN";
  readonly providerAttemptId?: string;
  readonly remoteWorkspaceId?: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly errorCode?: ProviderErrorCode;
  readonly errorMessage?: string;
  readonly rawErrorDetails?: unknown;
}

export type ReconciliationResult =
  | "CONFIRMED_PRESENT"
  | "CONFIRMED_ABSENT"
  | "INCONCLUSIVE";

export type SourcePayload =
  | {
      readonly type: "inline-text";
      readonly sourceId: string;
      readonly title: string;
      readonly mimeType: "text/markdown" | "text/plain";
      readonly textContent: string;
      readonly contentHash: string;
    }
  | {
      readonly type: "file";
      readonly sourceId: string;
      readonly title: string;
      readonly mimeType: "application/pdf" | "application/epub+zip" | "text/markdown";
      readonly sourceObjectId: string; // Safe internal identifier
      readonly byteSize: number;
      readonly contentHash: string;
    }
  | {
      readonly type: "url";
      readonly sourceId: string;
      readonly title: string;
      readonly url: string;
      readonly contentHash: string;
    };

export interface ProviderHealthResult {
  readonly isHealthy: boolean;
  readonly providerId: string;
  readonly message?: string;
  readonly latencyMs?: number;
  readonly authenticatedUserOrSa?: string;
}

export interface ResearchProvider {
  readonly metadata: ProviderMetadata;
  getCapabilities(): ProviderCapabilities;
  healthCheck(context: ExecutionContext): Promise<ProviderHealthResult>;
  createWorkspace(
    params: { topicTitle: string; topicSlug: string; category?: string },
    context: ExecutionContext
  ): Promise<{ remoteWorkspaceId: string; attemptRecord: ProviderAttemptRecord }>;
  ingestSources(
    params: { remoteWorkspaceId: string; sources: SourcePayload[] },
    context: ExecutionContext
  ): Promise<{
    status: "COMPLETED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    ingestedCount: number;
    remoteSourceIds: string[];
    errors?: Array<{ sourceId: string; errorCode: ProviderErrorCode; message: string }>;
    attemptRecord: ProviderAttemptRecord;
  }>;
  generateAudioOverview(
    params: { remoteWorkspaceId: string; format?: "deep_dive" | "brief" },
    context: ExecutionContext
  ): Promise<{ jobRef: JobRef; attemptRecord: ProviderAttemptRecord }>;
  reconcileIngest(
    params: {
      remoteWorkspaceId: string;
      expectedSources: Array<{ sourceId: string; contentHash: string }>;
    },
    context: ExecutionContext
  ): Promise<ReconciliationResult>;
  query?(params: { workspaceId: string; question: string }, context: ExecutionContext): Promise<unknown>;
}

// ─── 2. Hardcoded Standard Capability Sets ────────────────────────────────────

export const NOTEBOOKLM_ENTERPRISE_CAPABILITIES_SPEC: ProviderCapabilities = Object.freeze({
  supportsNotebookManagement: true,
  supportsSourceIngestion: true,
  supportsAudioOverview: true,
  supportsBatchSourceDelete: true,
  supportsQuery: false,
  supportsInteractiveChat: false,
  supportsStudyGuide: false,
  supportsMindMap: false,
  supportsSlides: false,
  supportsAsyncHandoffCLI: false,
  supportsLocalAgentHandoff: false,
});

export const ANTIGRAVITY_LEGACY_CAPABILITIES_SPEC: ProviderCapabilities = Object.freeze({
  supportsNotebookManagement: false,
  supportsSourceIngestion: true,
  supportsAudioOverview: false,
  supportsBatchSourceDelete: false,
  supportsQuery: false,
  supportsInteractiveChat: false,
  supportsStudyGuide: false,
  supportsMindMap: false,
  supportsSlides: false,
  supportsAsyncHandoffCLI: true,
  supportsLocalAgentHandoff: true,
});

// ─── 3. Fake In-Memory Research Provider (Contract Testing Harness) ───────────

export class FakeResearchProvider implements ResearchProvider {
  public readonly metadata: ProviderMetadata = {
    id: "fake-notebooklm-enterprise",
    name: "Fake NotebookLM Enterprise Provider (In-Memory)",
    version: "1.0.0",
    type: "official",
    description: "Mock test provider verifying compliance with Enterprise API specs",
  };

  public simulatedFailures: {
    healthCheck?: ProviderErrorCode;
    createWorkspace?: ProviderErrorCode;
    ingestSources?: ProviderErrorCode;
    reconciliationOutcome?: ReconciliationResult;
    networkDropAtAttempt?: number;
  } = {};

  public attemptHistory: ProviderAttemptRecord[] = [];
  public uploadedSources: Map<string, SourcePayload[]> = new Map();
  public currentAttemptCount = 0;

  constructor(private customCapabilities: Partial<ProviderCapabilities> = {}) {}

  getCapabilities(): ProviderCapabilities {
    return {
      ...NOTEBOOKLM_ENTERPRISE_CAPABILITIES_SPEC,
      ...this.customCapabilities,
    };
  }

  async healthCheck(context: ExecutionContext): Promise<ProviderHealthResult> {
    if (this.simulatedFailures.healthCheck) {
      throw new ProviderException(
        this.simulatedFailures.healthCheck,
        `Fake HealthCheck failed with ${this.simulatedFailures.healthCheck}`,
        context.correlationId,
        this.metadata.id
      );
    }
    return {
      isHealthy: true,
      providerId: this.metadata.id,
      latencyMs: 15,
      authenticatedUserOrSa: "service-account@test-gcp-project.iam.gserviceaccount.com",
    };
  }

  async createWorkspace(
    params: { topicTitle: string; topicSlug: string; category?: string },
    context: ExecutionContext
  ): Promise<{ remoteWorkspaceId: string; attemptRecord: ProviderAttemptRecord }> {
    this.currentAttemptCount++;
    const startedAt = new Date().toISOString();

    if (this.simulatedFailures.createWorkspace) {
      const err = new ProviderException(
        this.simulatedFailures.createWorkspace,
        `CreateWorkspace failed with ${this.simulatedFailures.createWorkspace}`,
        context.correlationId,
        this.metadata.id,
        this.simulatedFailures.createWorkspace === "PROVIDER_UNAVAILABLE"
      );
      const attempt: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: "FAILED",
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: this.simulatedFailures.createWorkspace,
        errorMessage: err.message,
      };
      this.attemptHistory.push(attempt);
      throw err;
    }

    const remoteWorkspaceId = `fake-ws-${params.topicSlug}-${Date.now()}`;
    const attempt: ProviderAttemptRecord = {
      attemptId: context.attemptId,
      providerId: this.metadata.id,
      status: "COMPLETED",
      remoteWorkspaceId,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    this.attemptHistory.push(attempt);
    return { remoteWorkspaceId, attemptRecord: attempt };
  }

  async ingestSources(
    params: { remoteWorkspaceId: string; sources: SourcePayload[] },
    context: ExecutionContext
  ): Promise<{
    status: "COMPLETED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    ingestedCount: number;
    remoteSourceIds: string[];
    errors?: Array<{ sourceId: string; errorCode: ProviderErrorCode; message: string }>;
    attemptRecord: ProviderAttemptRecord;
  }> {
    this.currentAttemptCount++;
    const startedAt = new Date().toISOString();

    if (this.simulatedFailures.ingestSources === "PROVIDER_TIMEOUT") {
      const attempt: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: "UNKNOWN",
        remoteWorkspaceId: params.remoteWorkspaceId,
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: "PROVIDER_TIMEOUT",
        errorMessage: "Network socket timed out waiting for Cloud Provider ACK",
      };
      this.attemptHistory.push(attempt);
      throw new ProviderException(
        "PROVIDER_TIMEOUT",
        "Upload exceeded 60s timeout",
        context.correlationId,
        this.metadata.id,
        false
      );
    }

    if (this.simulatedFailures.ingestSources) {
      const isRetryable =
        this.simulatedFailures.ingestSources === "PROVIDER_UNAVAILABLE";
      const err = new ProviderException(
        this.simulatedFailures.ingestSources,
        `Ingest failed with ${this.simulatedFailures.ingestSources}`,
        context.correlationId,
        this.metadata.id,
        isRetryable
      );
      const attempt: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: "FAILED",
        remoteWorkspaceId: params.remoteWorkspaceId,
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: this.simulatedFailures.ingestSources,
        errorMessage: err.message,
      };
      this.attemptHistory.push(attempt);
      throw err;
    }

    this.uploadedSources.set(params.remoteWorkspaceId, params.sources);
    const remoteSourceIds = params.sources.map(
      (s, idx) => `remote-src-${s.sourceId}-${idx}`
    );

    const attempt: ProviderAttemptRecord = {
      attemptId: context.attemptId,
      providerId: this.metadata.id,
      status: "COMPLETED",
      remoteWorkspaceId: params.remoteWorkspaceId,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    this.attemptHistory.push(attempt);

    return {
      status: "COMPLETED",
      ingestedCount: params.sources.length,
      remoteSourceIds,
      attemptRecord: attempt,
    };
  }

  async generateAudioOverview(
    params: { remoteWorkspaceId: string; format?: "deep_dive" | "brief" },
    context: ExecutionContext
  ): Promise<{ jobRef: JobRef; attemptRecord: ProviderAttemptRecord }> {
    if (!this.getCapabilities().supportsAudioOverview) {
      throw new ProviderException(
        "CAPABILITY_UNSUPPORTED",
        "Audio Overview generation is not supported by this provider",
        context.correlationId,
        this.metadata.id
      );
    }
    const startedAt = new Date().toISOString();
    const jobRef: JobRef = {
      providerId: this.metadata.id,
      remoteJobId: `fake-audio-job-${Date.now()}`,
      workspaceId: params.remoteWorkspaceId,
      correlationId: context.correlationId,
      initiatedAt: startedAt,
    };
    const attempt: ProviderAttemptRecord = {
      attemptId: context.attemptId,
      providerId: this.metadata.id,
      status: "COMPLETED",
      remoteWorkspaceId: params.remoteWorkspaceId,
      startedAt,
      completedAt: new Date().toISOString(),
    };
    this.attemptHistory.push(attempt);
    return { jobRef, attemptRecord: attempt };
  }

  async reconcileIngest(
    params: {
      remoteWorkspaceId: string;
      expectedSources: Array<{ sourceId: string; contentHash: string }>;
    },
    _context: ExecutionContext
  ): Promise<ReconciliationResult> {
    if (this.simulatedFailures.reconciliationOutcome) {
      return this.simulatedFailures.reconciliationOutcome;
    }
    const current = this.uploadedSources.get(params.remoteWorkspaceId);
    if (!current || current.length === 0) {
      return "CONFIRMED_ABSENT";
    }
    const matchAll = params.expectedSources.every((exp) =>
      current.some((c) => c.sourceId === exp.sourceId && c.contentHash === exp.contentHash)
    );
    return matchAll ? "CONFIRMED_PRESENT" : "INCONCLUSIVE";
  }

  async query(
    _params: { workspaceId: string; question: string },
    context: ExecutionContext
  ): Promise<unknown> {
    if (!this.getCapabilities().supportsQuery) {
      throw new ProviderException(
        "CAPABILITY_UNSUPPORTED",
        `Provider '${this.metadata.id}' does not support query/chat operations.`,
        context.correlationId,
        this.metadata.id
      );
    }
    return { answer: "Mock Answer" };
  }
}

// ─── 4. Secure Storage Object Resolver (Sandboxed Local File Resolution) ──────

export class SecureStorageResolver {
  constructor(private allowlistedRoots: string[]) {}

  public resolveSourceObjectId(sourceObjectId: string): {
    valid: boolean;
    absolutePath?: string;
    error?: string;
  } {
    // 1. Chặn path traversal & ký tự điều khiển
    if (!sourceObjectId || typeof sourceObjectId !== "string") {
      return { valid: false, error: "sourceObjectId is invalid or empty" };
    }
    if (sourceObjectId.includes("..") || sourceObjectId.includes("\\") || sourceObjectId.startsWith("/")) {
      return { valid: false, error: "Path traversal or absolute path violation rejected" };
    }

    // 2. Resolve trong từng allowlisted root
    for (const root of this.allowlistedRoots) {
      const targetPath = path.normalize(path.join(root, sourceObjectId));
      if (!targetPath.startsWith(path.normalize(root))) {
        return { valid: false, error: "Sandbox escape rejected" };
      }
      return { valid: true, absolutePath: targetPath };
    }

    return { valid: false, error: "Source object not found in allowlisted storage roots" };
  }
}

// ─── 5. Fake MCP Stdio Pipe Simulator ─────────────────────────────────────────

export interface McpRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
}

export class FakeMcpStdioRunner {
  public stdoutLines: string[] = [];
  public stderrLines: string[] = [];

  constructor(private provider: ResearchProvider) {}

  public async handleRawMessage(rawJson: string): Promise<void> {
    let parsed: McpRpcRequest;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      this.writeStdout({
        jsonrpc: "2.0",
        id: null as any,
        error: {
          code: -32700,
          message: "Parse error",
          data: { errorCode: "INVALID_ARGUMENT" },
        },
      });
      return;
    }

    if (parsed.method === "research_list_capabilities") {
      this.writeStderr(`[DEBUG] Processing capability listing for ${this.provider.metadata.id}`);
      this.writeStdout({
        jsonrpc: "2.0",
        id: parsed.id,
        result: {
          providerId: this.provider.metadata.id,
          capabilities: this.provider.getCapabilities(),
        },
      });
      return;
    }

    if (parsed.method === "research_query") {
      this.writeStderr(`[INFO] Query requested with correlationId=${parsed.params?.correlationId || "none"}`);
      if (!this.provider.getCapabilities().supportsQuery) {
        this.writeStdout({
          jsonrpc: "2.0",
          id: parsed.id,
          error: {
            code: -32000,
            message: "Capability unsupported",
            data: {
              errorCode: "CAPABILITY_UNSUPPORTED",
              correlationId: (parsed.params?.correlationId as string) || "corr-unknown",
            },
          },
        });
        return;
      }
    }

    this.writeStdout({
      jsonrpc: "2.0",
      id: parsed.id,
      result: { success: true },
    });
  }

  private writeStdout(res: McpRpcResponse): void {
    // Luồng stdout BẮT BUỘC chỉ chứa 1 dòng JSON-RPC chuẩn
    this.stdoutLines.push(JSON.stringify(res));
  }

  private writeStderr(logMsg: string): void {
    this.stderrLines.push(logMsg);
  }
}
