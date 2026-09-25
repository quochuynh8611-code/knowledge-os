/**
 * Antigravity Legacy Research Provider Adapter
 * (Phase 4.3 Pure Wrapper Adapter for Legacy CLI & File-Based Handoff Workflow)
 */

import {
  ResearchProvider,
  ProviderMetadata,
  ProviderCapabilities,
  ExecutionContext,
  JobRef,
  ProviderAttemptRecord,
  ReconciliationResult,
  SourcePayload,
  ProviderHealthResult,
  ProviderJobStatus,
  ANTIGRAVITY_LEGACY_CAPABILITIES,
} from "./types";
import { ProviderException } from "./errors";
import {
  createAntigravityHandoffJob,
  serializeAntigravityJobManifest,
  buildAntigravityCLICommand,
  AntigravityHandoffJob,
} from "../../../lib/antigravityPipeline";
import { packageSourceForNotebookLM } from "../../../lib/notebooklm";
import { Topic, Note, Resource } from "../../../types";

export interface AntigravityProviderOptions {
  readonly now?: () => Date;
  readonly randomId?: () => string;
}

export class AntigravityProvider implements ResearchProvider {
  public readonly metadata: ProviderMetadata = {
    id: "antigravity-legacy",
    name: "Antigravity CLI Handoff",
    version: "1.0.0",
    type: "legacy",
    description:
      "Adapter tích hợp giữ nguyên 100% quy trình Handoff CLI và File-based protocol legacy của Antigravity 2.0",
  };

  private readonly nowProvider: () => Date;
  private readonly randomIdProvider: () => string;
  private readonly ingestedWorkspaces: Map<string, SourcePayload[]> = new Map();

  constructor(options?: AntigravityProviderOptions) {
    this.nowProvider = options?.now ?? (() => new Date());
    this.randomIdProvider =
      options?.randomId ?? (() => Math.random().toString(36).slice(2, 8));
  }

  public getCapabilities(): ProviderCapabilities {
    return ANTIGRAVITY_LEGACY_CAPABILITIES;
  }

  public async healthCheck(_context: ExecutionContext): Promise<ProviderHealthResult> {
    return {
      isHealthy: true,
      providerId: this.metadata.id,
      message: "Antigravity local CLI handoff provider sẵn sàng hoạt động (offline mode)",
      latencyMs: 0,
      authenticatedUserOrSa: "local-cli-environment",
    };
  }

  public async createWorkspace(
    params: { topicTitle: string; topicSlug: string; category?: string },
    context: ExecutionContext
  ): Promise<{ remoteWorkspaceId: string; attemptRecord: ProviderAttemptRecord }> {
    const now = this.nowProvider();
    const timestamp = now.getTime();
    const randomSuffix = this.randomIdProvider();
    const startedAt = now.toISOString();

    // Sinh remoteWorkspaceId theo đúng pattern legacy: job-nlm-{timestamp}-{suffix}
    const remoteWorkspaceId = `job-nlm-${timestamp}-${randomSuffix}`;

    const attemptRecord: ProviderAttemptRecord = {
      attemptId: context.attemptId,
      providerId: this.metadata.id,
      status: "COMPLETED",
      remoteWorkspaceId,
      startedAt,
      completedAt: this.nowProvider().toISOString(),
    };

    return {
      remoteWorkspaceId,
      attemptRecord,
    };
  }

  public async ingestSources(
    params: { remoteWorkspaceId: string; sources: SourcePayload[] },
    context: ExecutionContext
  ): Promise<{
    status: "COMPLETED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    ingestedCount: number;
    remoteSourceIds: string[];
    errors?: Array<{ sourceId: string; errorCode: any; message: string }>;
    attemptRecord: ProviderAttemptRecord;
  }> {
    const startedAt = this.nowProvider().toISOString();
    const { remoteWorkspaceId, sources } = params;

    // Chuyển đổi SourcePayload[] thành Notes và Resources mô phỏng để gọi helper legacy
    const mockNotes: Note[] = [];
    const mockResources: Resource[] = [];

    for (const source of sources) {
      if (source.type === "inline-text") {
        mockNotes.push({
          id: source.sourceId,
          topicId: remoteWorkspaceId,
          title: source.title,
          content: source.textContent,
          type: "insight",
          isPrivate: false,
          tags: ["source-payload"],
          createdAt: startedAt,
          updatedAt: startedAt,
        });
      } else if (source.type === "url") {
        mockResources.push({
          id: source.sourceId,
          topicId: remoteWorkspaceId,
          title: source.title,
          url: source.url,
          type: "article",
          createdAt: startedAt,
        });
      } else if (source.type === "file") {
        // Chỉ sử dụng safe metadata, không resolve file trên đĩa ở phase này
        mockResources.push({
          id: source.sourceId,
          topicId: remoteWorkspaceId,
          title: source.title,
          filePath: source.sourceObjectId,
          type: source.mimeType.includes("pdf") ? "pdf" : "book",
          notes: `SHA256:${source.contentHash} Size:${source.byteSize}B`,
          createdAt: startedAt,
        });
      }
    }

    const mockTopic: Topic = {
      id: remoteWorkspaceId,
      title: "Antigravity Handoff Workspace",
      slug: remoteWorkspaceId,
      categoryId: "cat-legacy-handoff",
      type: "phat-hoc",
      description: "Gói nguồn khảo cứu tự động đóng gói cho Antigravity CLI",
      content: "",
      tags: [],
      links: [],
      studyProgress: {
        topicId: remoteWorkspaceId,
        status: "not_started",
        progress: 0,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: mockNotes.length,
        timeSpent: 0,
      },
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    // Gọi trực tiếp helper legacy để tạo gói tài liệu nguồn sạch và manifest
    packageSourceForNotebookLM(mockTopic, mockNotes, mockResources);

    const legacyJob: AntigravityHandoffJob = {
      jobId: remoteWorkspaceId,
      status: "queued",
      artifactType: "study_guide",
      topicId: mockTopic.id,
      topicTitle: mockTopic.title,
      sourcePath: `.agents/handoffs/${remoteWorkspaceId}-source.md`,
      promptPath: `.agents/handoffs/${remoteWorkspaceId}-prompt.md`,
      manifestPath: `.agents/handoffs/${remoteWorkspaceId}-manifest.json`,
      resultPath: `.agents/handoffs/${remoteWorkspaceId}-result.md`,
      createdAt: startedAt,
      updatedAt: startedAt,
    };

    serializeAntigravityJobManifest(legacyJob);
    buildAntigravityCLICommand(legacyJob);

    // Lưu trữ in-memory cho việc đối soát reconciliation
    this.ingestedWorkspaces.set(remoteWorkspaceId, sources);

    const remoteSourceIds = sources.map((s) => s.sourceId);

    const attemptRecord: ProviderAttemptRecord = {
      attemptId: context.attemptId,
      providerId: this.metadata.id,
      status: "COMPLETED",
      remoteWorkspaceId,
      startedAt,
      completedAt: this.nowProvider().toISOString(),
    };

    return {
      status: "COMPLETED",
      ingestedCount: sources.length,
      remoteSourceIds,
      attemptRecord,
    };
  }

  public async generateAudioOverview(
    _params: { remoteWorkspaceId: string; format?: "deep_dive" | "brief" },
    context: ExecutionContext
  ): Promise<{ jobRef: JobRef; attemptRecord: ProviderAttemptRecord }> {
    throw new ProviderException(
      "CAPABILITY_UNSUPPORTED",
      "Antigravity Legacy Provider không hỗ trợ sinh Audio Overview (supportsAudioOverview = false)",
      context.correlationId,
      this.metadata.id,
      false
    );
  }

  public async reconcileIngest(
    params: {
      remoteWorkspaceId: string;
      expectedSources: Array<{ sourceId: string; contentHash: string }>;
    },
    _context: ExecutionContext
  ): Promise<ReconciliationResult> {
    const current = this.ingestedWorkspaces.get(params.remoteWorkspaceId);
    if (!current || current.length === 0) {
      return "CONFIRMED_ABSENT";
    }

    const matchAll = params.expectedSources.every((exp) =>
      current.some(
        (c) => c.sourceId === exp.sourceId && c.contentHash === exp.contentHash
      )
    );

    return matchAll ? "CONFIRMED_PRESENT" : "INCONCLUSIVE";
  }

  public async getJobStatus(
    jobRef: JobRef,
    _context: ExecutionContext
  ): Promise<ProviderJobStatus> {
    return {
      jobRef,
      status: "PENDING",
      progressPercentage: 0,
      error: undefined,
    };
  }

  public async cancelJob(
    _jobRef: JobRef,
    _context: ExecutionContext
  ): Promise<boolean> {
    return false;
  }

  public async deleteWorkspace(
    _params: { remoteWorkspaceId: string; expectedSlug: string },
    context: ExecutionContext
  ): Promise<boolean> {
    if (
      !context.approvalProof ||
      context.approvalProof.intent !== "delete_workspace"
    ) {
      throw new ProviderException(
        "PERMISSION_DENIED",
        "Thao tác xóa workspace trên Antigravity Provider yêu cầu bằng chứng phê duyệt (approvalProof) với intent 'delete_workspace'",
        context.correlationId,
        this.metadata.id
      );
    }
    // Không có remote cloud workspace để xóa
    return false;
  }
}
