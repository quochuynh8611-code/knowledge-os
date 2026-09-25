/**
 * NotebookLM Enterprise Provider Skeleton
 * (Phase 4.4 Production Provider Implementation)
 *
 * Implements the ResearchProvider interface by delegating directly to an
 * injected NotebookLMClient boundary.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real Google Cloud network calls or hardcoded endpoints.
 * - NO credentials or private keys in source code.
 * - NO query or interactive chat capabilities exposed.
 * - Strict error sanitization and capability gating.
 */

import {
  ExecutionContext,
  JobRef,
  NOTEBOOKLM_ENTERPRISE_CAPABILITIES,
  ProviderAttemptRecord,
  ProviderCapabilities,
  ProviderHealthResult,
  ProviderJobStatus,
  ProviderMetadata,
  ReconciliationResult,
  ResearchProvider,
  SourcePayload,
} from "./types";
import {
  ProviderException,
  sanitizeProviderErrorMessage,
} from "./errors";
import { NotebookLMClient } from "./notebooklmClient";

export class NotebookLMEnterpriseProvider implements ResearchProvider {
  public readonly metadata: ProviderMetadata = Object.freeze({
    id: "notebooklm-enterprise",
    name: "NotebookLM Enterprise API (Official)",
    version: "1.0.0",
    type: "official",
    description: "Official NotebookLM Enterprise API provider adapter using injected client boundary",
  });

  constructor(
    private readonly client: NotebookLMClient,
    private readonly now: () => Date = () => new Date()
  ) {}

  public getCapabilities(): ProviderCapabilities {
    return NOTEBOOKLM_ENTERPRISE_CAPABILITIES;
  }

  public async healthCheck(_context: ExecutionContext): Promise<ProviderHealthResult> {
    return {
      isHealthy: true,
      providerId: this.metadata.id,
      message: "Client boundary configured",
    };
  }

  public async createWorkspace(
    params: { topicTitle: string; topicSlug: string; category?: string },
    context: ExecutionContext
  ): Promise<{ remoteWorkspaceId: string; attemptRecord: ProviderAttemptRecord }> {
    const startedAt = this.now().toISOString();

    try {
      const res = await this.client.createWorkspace({
        title: params.topicTitle,
        metadata: {
          slug: params.topicSlug,
          category: params.category || "",
        },
      });

      const attemptRecord: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: "COMPLETED",
        remoteWorkspaceId: res.workspaceId,
        startedAt,
        completedAt: this.now().toISOString(),
      };

      return {
        remoteWorkspaceId: res.workspaceId,
        attemptRecord,
      };
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  public async ingestSources(
    params: { remoteWorkspaceId: string; sources: SourcePayload[] },
    context: ExecutionContext
  ): Promise<{
    status: "COMPLETED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    ingestedCount: number;
    remoteSourceIds: string[];
    errors?: Array<{ sourceId: string; errorCode: "INVALID_ARGUMENT" | "AUTHENTICATION_FAILED" | "PERMISSION_DENIED" | "CAPABILITY_UNSUPPORTED" | "PROVIDER_TIMEOUT" | "PROVIDER_UNAVAILABLE" | "IDEMPOTENCY_CONFLICT" | "INTERNAL_ERROR"; message: string }>;
    attemptRecord: ProviderAttemptRecord;
  }> {
    const startedAt = this.now().toISOString();

    try {
      const res = await this.client.ingestSources({
        workspaceId: params.remoteWorkspaceId,
        sources: params.sources,
      });

      const isFailed = res.status === "FAILED";

      const attemptRecord: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: isFailed ? "FAILED" : "COMPLETED",
        remoteWorkspaceId: params.remoteWorkspaceId,
        startedAt,
        completedAt: this.now().toISOString(),
        ...(isFailed
          ? {
              errorCode: "INTERNAL_ERROR",
              errorMessage: "Ingestion failed at client boundary",
            }
          : {}),
      };

      return {
        status: res.status,
        ingestedCount: isFailed ? 0 : res.remoteSourceIds.length,
        remoteSourceIds: res.remoteSourceIds,
        attemptRecord,
      };
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  public async generateAudioOverview(
    params: { remoteWorkspaceId: string; format?: "deep_dive" | "brief" },
    context: ExecutionContext
  ): Promise<{ jobRef: JobRef; attemptRecord: ProviderAttemptRecord }> {
    const startedAt = this.now().toISOString();

    try {
      const res = await this.client.generateAudioOverview({
        workspaceId: params.remoteWorkspaceId,
        format: params.format || "deep_dive",
      });

      const jobRef: JobRef = {
        providerId: this.metadata.id,
        remoteJobId: res.operationId,
        workspaceId: params.remoteWorkspaceId,
        correlationId: context.correlationId,
        initiatedAt: startedAt,
      };

      const attemptRecord: ProviderAttemptRecord = {
        attemptId: context.attemptId,
        providerId: this.metadata.id,
        status: "IN_PROGRESS",
        remoteWorkspaceId: params.remoteWorkspaceId,
        startedAt,
        completedAt: this.now().toISOString(),
      };

      return {
        jobRef,
        attemptRecord,
      };
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  public async reconcileIngest(
    params: {
      remoteWorkspaceId: string;
      expectedSources: Array<{ sourceId: string; contentHash: string }>;
    },
    context: ExecutionContext
  ): Promise<ReconciliationResult> {
    try {
      return await this.client.reconcileWorkspace({
        workspaceId: params.remoteWorkspaceId,
        expectedSources: params.expectedSources,
      });
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  public async getJobStatus(jobRef: JobRef, context: ExecutionContext): Promise<ProviderJobStatus> {
    try {
      const op = await this.client.getOperationStatus(jobRef.remoteJobId);

      if (!op.isDone) {
        return {
          jobRef,
          status: "IN_PROGRESS",
        };
      }

      if (op.error) {
        return {
          jobRef,
          status: "FAILED",
          error: sanitizeProviderErrorMessage(op.error),
        };
      }

      if (op.resultUrl) {
        return {
          jobRef,
          status: "COMPLETED",
          resultUrl: op.resultUrl,
        };
      }

      return {
        jobRef,
        status: "PENDING",
      };
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  public async cancelJob(_jobRef: JobRef, _context: ExecutionContext): Promise<boolean> {
    return false;
  }

  public async deleteWorkspace(
    params: { remoteWorkspaceId: string; expectedSlug: string },
    context: ExecutionContext
  ): Promise<boolean> {
    if (!context.approvalProof || context.approvalProof.intent !== "delete_workspace") {
      throw new ProviderException(
        "PERMISSION_DENIED",
        "Workspace deletion requires explicit approvalProof with intent 'delete_workspace'",
        context.correlationId,
        this.metadata.id,
        false
      );
    }

    try {
      return await this.client.deleteWorkspace({ workspaceId: params.remoteWorkspaceId });
    } catch (error: unknown) {
      throw this.normalizeClientError(error, context.correlationId);
    }
  }

  private normalizeClientError(error: unknown, correlationId?: string): ProviderException {
    if (error instanceof ProviderException) {
      return error;
    }

    const rawMessage = error instanceof Error ? error.message : String(error);
    const sanitized = sanitizeProviderErrorMessage(rawMessage);

    // Detect common authentication / permission signatures while keeping error sanitized
    if (/auth|unauthorized|401/i.test(rawMessage)) {
      return new ProviderException(
        "AUTHENTICATION_FAILED",
        sanitized,
        correlationId,
        this.metadata.id,
        false
      );
    }

    if (/forbidden|permission|403/i.test(rawMessage)) {
      return new ProviderException(
        "PERMISSION_DENIED",
        sanitized,
        correlationId,
        this.metadata.id,
        false
      );
    }

    if (/unavailable|503|connect/i.test(rawMessage)) {
      return new ProviderException(
        "PROVIDER_UNAVAILABLE",
        sanitized,
        correlationId,
        this.metadata.id,
        true
      );
    }

    if (/timeout|timed out|deadline/i.test(rawMessage)) {
      return new ProviderException(
        "PROVIDER_TIMEOUT",
        sanitized,
        correlationId,
        this.metadata.id,
        false
      );
    }

    return new ProviderException(
      "INTERNAL_ERROR",
      sanitized,
      correlationId,
      this.metadata.id,
      false
    );
  }
}
