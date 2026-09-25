/**
 * Production Research Orchestration Service Skeleton
 * (Phase 4.6 & Phase 4.8 Production Core with Persistence Integration)
 *
 * Coordinates execution flow across ResearchProvider instances resolved
 * via ProviderRegistry and persists execution snapshots to ResearchPersistencePort.
 *
 * CRITICAL ARCHITECTURAL CONSTRAINTS:
 * - NO real Google Cloud network calls or SDK dependencies.
 * - NO direct database writes or route wiring in this skeleton.
 * - Strict capability gating before calling optional operations (e.g. audio overview).
 * - All error conditions use standardized ProviderException with sanitization.
 */

import {
  ExecutionContext,
  JobRef,
  ProviderAttemptRecord,
  ProviderCapabilities,
  ResearchProvider,
  SourcePayload,
} from "./types";
import {
  ProviderException,
  sanitizeProviderErrorMessage,
} from "./errors";
import { ProviderRegistry } from "./providerRegistry";
import {
  ResearchExecutionSnapshot,
  ResearchPersistencePort,
} from "./researchPersistencePort";

export class ResearchOrchestrator {
  private readonly registry: ProviderRegistry;
  private readonly persistence: ResearchPersistencePort | null;
  private readonly now: () => Date;
  private readonly randomId: () => string;

  constructor(params: {
    registry: ProviderRegistry;
    persistence?: ResearchPersistencePort | null;
    now?: () => Date;
    randomId?: () => string;
  }) {
    this.registry = params.registry;
    this.persistence = params.persistence || null;
    this.now = params.now || (() => new Date());
    this.randomId =
      params.randomId ||
      (() => Math.random().toString(36).substring(2, 9));
  }

  /**
   * Constructs a standardized ExecutionContext for tracking research operations.
   */
  public createExecutionContext(params?: {
    correlationId?: string;
    attemptId?: string;
    approvalProof?: {
      intent: "delete_workspace" | "force_retry_unknown" | "manual_fallback";
      actorId?: string;
      reason?: string;
    } | null;
  }): ExecutionContext {
    const correlationId = params?.correlationId || `corr-${this.randomId()}`;
    const attemptId = params?.attemptId || `att-${this.randomId()}`;
    const requestId = `req-${this.randomId()}`;
    const idempotencyKey = `idem-${this.randomId()}`;

    return {
      requestId,
      correlationId,
      attemptId,
      actor: {
        userId: params?.approvalProof?.actorId || "system",
        role: "system",
      },
      idempotencyKey,
      allowFallback: false,
      approvalProof: params?.approvalProof
        ? {
            approvedBy: params.approvalProof.actorId || "system",
            approvedAt: this.now().toISOString(),
            intent: params.approvalProof.intent,
          }
        : undefined,
    };
  }

  /**
   * Orchestrates the complete research job flow:
   * 1. Resolves appropriate provider via Registry.
   * 2. Creates remote workspace.
   * 3. Ingests polymorphic sources.
   * 4. Optionally generates Audio Overview if requested and supported.
   * 5. Persists execution snapshot via ResearchPersistencePort if injected.
   */
  public async startResearchJob(params: {
    preferredProviderId?: string | null;
    requireCapability?: keyof ProviderCapabilities;
    workspaceTitle: string;
    workspaceMetadata?: Record<string, string>;
    sources: SourcePayload[];
    generateAudioOverview?: boolean;
    audioFormat?: "deep_dive" | "brief";
    correlationId?: string;
  }): Promise<{
    providerId: string;
    workspaceId: string;
    sourceCount: number;
    audioJob?: JobRef | null;
    attemptRecords: ProviderAttemptRecord[];
  }> {
    const context = this.createExecutionContext({
      correlationId: params.correlationId,
    });

    let provider: ResearchProvider;
    try {
      provider = this.registry.resolveProviderForRequest({
        preferredProviderId: params.preferredProviderId,
        requireCapability: params.requireCapability,
      });
    } catch (err: unknown) {
      if (err instanceof ProviderException) {
        throw err;
      }
      const rawMessage = err instanceof Error ? err.message : String(err);
      throw new ProviderException(
        "INVALID_ARGUMENT",
        sanitizeProviderErrorMessage(rawMessage),
        context.correlationId,
        undefined,
        false
      );
    }

    // Capability check for audio overview before proceeding
    if (params.generateAudioOverview) {
      const caps = provider.getCapabilities();
      if (!caps.supportsAudioOverview) {
        throw new ProviderException(
          "CAPABILITY_UNSUPPORTED",
          `Provider '${provider.metadata.id}' does not support audio overview generation.`,
          context.correlationId,
          provider.metadata.id,
          false
        );
      }
    }

    const attemptRecords: ProviderAttemptRecord[] = [];
    let workspaceId = "";

    try {
      // Step 1: Create Workspace
      const createRes = await provider.createWorkspace(
        {
          topicTitle: params.workspaceTitle,
          topicSlug:
            params.workspaceMetadata?.slug ||
            params.workspaceTitle.toLowerCase().replace(/\s+/g, "-"),
          category: params.workspaceMetadata?.category,
        },
        context
      );
      attemptRecords.push(createRes.attemptRecord);
      workspaceId = createRes.remoteWorkspaceId;

      // Step 2: Ingest Sources
      const ingestRes = await provider.ingestSources(
        {
          remoteWorkspaceId: workspaceId,
          sources: params.sources,
        },
        context
      );
      attemptRecords.push(ingestRes.attemptRecord);

      // Step 3: Optional Audio Overview
      let audioJob: JobRef | null = null;
      if (params.generateAudioOverview) {
        const audioRes = await provider.generateAudioOverview(
          {
            remoteWorkspaceId: workspaceId,
            format: params.audioFormat || "deep_dive",
          },
          context
        );
        attemptRecords.push(audioRes.attemptRecord);
        audioJob = audioRes.jobRef;
      }

      // Step 4: Persist successful execution snapshot if persistence port is present
      if (this.persistence) {
        const snapshot: ResearchExecutionSnapshot = {
          correlationId: context.correlationId,
          providerId: provider.metadata.id,
          workspaceId,
          sourceCount: ingestRes.ingestedCount,
          audioJobId: audioJob ? audioJob.remoteJobId : null,
          attemptRecords,
          createdAt: attemptRecords[0]?.startedAt || this.now().toISOString(),
          updatedAt: this.now().toISOString(),
          terminalStatus: "COMPLETED",
        };

        try {
          await this.persistence.saveExecution(snapshot);
        } catch (persistErr: unknown) {
          const rawMsg =
            persistErr instanceof Error
              ? persistErr.message
              : String(persistErr);
          throw new ProviderException(
            "INTERNAL_ERROR",
            `Persistence failure: ${sanitizeProviderErrorMessage(rawMsg)}`,
            context.correlationId,
            provider.metadata.id,
            false
          );
        }
      }

      return {
        providerId: provider.metadata.id,
        workspaceId,
        sourceCount: ingestRes.ingestedCount,
        audioJob,
        attemptRecords,
      };
    } catch (error: unknown) {
      const errorToThrow: ProviderException =
        error instanceof ProviderException
          ? error
          : new ProviderException(
              "INTERNAL_ERROR",
              sanitizeProviderErrorMessage(
                error instanceof Error ? error.message : String(error)
              ),
              context.correlationId,
              provider.metadata.id,
              false
            );

      // Attempt to save failed snapshot if persistence is injected and partial progress exists
      if (this.persistence && attemptRecords.length > 0) {
        try {
          const failedSnapshot: ResearchExecutionSnapshot = {
            correlationId: context.correlationId,
            providerId: provider.metadata.id,
            workspaceId: workspaceId || "unassigned",
            sourceCount: 0,
            audioJobId: null,
            attemptRecords,
            createdAt:
              attemptRecords[0]?.startedAt || this.now().toISOString(),
            updatedAt: this.now().toISOString(),
            terminalStatus: "FAILED",
          };
          await this.persistence.saveExecution(failedSnapshot);
        } catch {
          // Preserve primary exception if secondary snapshot save fails
        }
      }

      throw errorToThrow;
    }
  }
}
