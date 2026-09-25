import { describe, it, expect, beforeEach, vi } from "vitest";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import {
  ExecutionContext,
  SourcePayload,
  ANTIGRAVITY_LEGACY_CAPABILITIES,
} from "../../src/server/services/providers/types";
import { ProviderException } from "../../src/server/services/providers/errors";
import * as legacyPipeline from "../../src/lib/antigravityPipeline";
import * as legacyNotebooklm from "../../src/lib/notebooklm";

describe("ANTIGRAVITY PROVIDER ADAPTER UNIT TESTS (PHASE 4.3)", () => {
  let provider: AntigravityProvider;
  let testContext: ExecutionContext;
  const fixedDate = new Date("2026-09-24T12:00:00Z");

  beforeEach(() => {
    provider = new AntigravityProvider({
      now: () => fixedDate,
      randomId: () => "testxyz",
    });

    testContext = {
      requestId: "req-ag-001",
      correlationId: "corr-trace-ag-123",
      attemptId: "att-ag-999",
      actor: { userId: "user-1", role: "user" },
      idempotencyKey: "idem-ag-123",
      allowFallback: false,
    };
  });

  // ─── 1. Metadata ────────────────────────────────────────────────────────────
  it("1. Exposes correct metadata (id, type, name, version)", () => {
    expect(provider.metadata.id).toBe("antigravity-legacy");
    expect(provider.metadata.type).toBe("legacy");
    expect(provider.metadata.name).toBe("Antigravity CLI Handoff");
    expect(provider.metadata.version).toBe("1.0.0");
    expect(provider.metadata.description).toContain("Antigravity 2.0");
  });

  // ─── 2. Capabilities ────────────────────────────────────────────────────────
  it("2. Returns ANTIGRAVITY_LEGACY_CAPABILITIES matching specification", () => {
    const caps = provider.getCapabilities();
    expect(caps).toEqual(ANTIGRAVITY_LEGACY_CAPABILITIES);
    expect(caps.supportsAsyncHandoffCLI).toBe(true);
    expect(caps.supportsLocalAgentHandoff).toBe(true);
    expect(caps.supportsAudioOverview).toBe(false);
    expect(caps.supportsNotebookManagement).toBe(false);
  });

  // ─── 3. HealthCheck ─────────────────────────────────────────────────────────
  it("3. HealthCheck returns healthy without touching cloud network", async () => {
    const health = await provider.healthCheck(testContext);
    expect(health.isHealthy).toBe(true);
    expect(health.providerId).toBe("antigravity-legacy");
    expect(health.authenticatedUserOrSa).toBe("local-cli-environment");
    expect(health.latencyMs).toBe(0);
  });

  // ─── 4. CreateWorkspace Pattern ─────────────────────────────────────────────
  it("4. Creates remoteWorkspaceId matching legacy pattern job-nlm-{timestamp}-{suffix}", async () => {
    const res = await provider.createWorkspace(
      { topicTitle: "Vi Diệu Pháp", topicSlug: "vi-dieu-phap" },
      testContext
    );
    expect(res.remoteWorkspaceId).toBe(`job-nlm-${fixedDate.getTime()}-testxyz`);
  });

  // ─── 5. CreateWorkspace AttemptRecord ───────────────────────────────────────
  it("5. Sets attemptRecord correctly conforming to ExecutionContext", async () => {
    const res = await provider.createWorkspace(
      { topicTitle: "Vi Diệu Pháp", topicSlug: "vi-dieu-phap" },
      testContext
    );
    expect(res.attemptRecord.attemptId).toBe("att-ag-999");
    expect(res.attemptRecord.providerId).toBe("antigravity-legacy");
    expect(res.attemptRecord.status).toBe("COMPLETED");
    expect(res.attemptRecord.remoteWorkspaceId).toBe(res.remoteWorkspaceId);
    expect(res.attemptRecord.startedAt).toBe(fixedDate.toISOString());
    expect(res.attemptRecord.completedAt).toBe(fixedDate.toISOString());
  });

  // ─── 6. IngestSources: Inline Text ──────────────────────────────────────────
  it("6. Ingests inline-text sources correctly via legacy packaging", async () => {
    const spyPackage = vi.spyOn(legacyNotebooklm, "packageSourceForNotebookLM");

    const sources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "src-inline-1",
        title: "Ghi chú Khảo cứu",
        mimeType: "text/markdown",
        textContent: "Luận cứ về 52 Tâm sở",
        contentHash: "hash-text-123",
      },
    ];

    const res = await provider.ingestSources(
      { remoteWorkspaceId: "job-nlm-123-abc", sources },
      testContext
    );

    expect(res.status).toBe("COMPLETED");
    expect(res.ingestedCount).toBe(1);
    expect(res.remoteSourceIds).toEqual(["src-inline-1"]);
    expect(spyPackage).toHaveBeenCalled();
  });

  // ─── 7. IngestSources: URL ──────────────────────────────────────────────────
  it("7. Ingests url sources correctly as legacy resources", async () => {
    const sources: SourcePayload[] = [
      {
        type: "url",
        sourceId: "src-url-1",
        title: "Kinh Điển Tham Khảo",
        url: "https://tipitaka.org/sutta",
        contentHash: "hash-url-456",
      },
    ];

    const res = await provider.ingestSources(
      { remoteWorkspaceId: "job-nlm-123-abc", sources },
      testContext
    );

    expect(res.status).toBe("COMPLETED");
    expect(res.ingestedCount).toBe(1);
    expect(res.remoteSourceIds).toEqual(["src-url-1"]);
  });

  // ─── 8. IngestSources: File Metadata ────────────────────────────────────────
  it("8. Ingests file sources using safe metadata without resolving local file on disk", async () => {
    const sources: SourcePayload[] = [
      {
        type: "file",
        sourceId: "src-file-1",
        title: "Tài liệu Abhidhamma",
        mimeType: "application/pdf",
        sourceObjectId: "pdf/abhidhamma.pdf",
        byteSize: 1048576,
        contentHash: "hash-pdf-789",
      },
    ];

    const res = await provider.ingestSources(
      { remoteWorkspaceId: "job-nlm-123-abc", sources },
      testContext
    );

    expect(res.status).toBe("COMPLETED");
    expect(res.ingestedCount).toBe(1);
    expect(res.remoteSourceIds).toEqual(["src-file-1"]);
  });

  // ─── 9. IngestSources: SourceId Preservation ────────────────────────────────
  it("9. Preserves exact sourceIds in remoteSourceIds array", async () => {
    const sources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "id-1",
        title: "Note 1",
        mimeType: "text/plain",
        textContent: "Content 1",
        contentHash: "h1",
      },
      {
        type: "url",
        sourceId: "id-2",
        title: "Url 2",
        url: "https://example.com",
        contentHash: "h2",
      },
    ];

    const res = await provider.ingestSources(
      { remoteWorkspaceId: "job-nlm-123-abc", sources },
      testContext
    );

    expect(res.remoteSourceIds).toEqual(["id-1", "id-2"]);
  });

  // ─── 10. IngestSources: Legacy Helper Delegation ────────────────────────────
  it("10. Delegates to serializeAntigravityJobManifest and buildAntigravityCLICommand", async () => {
    const spyManifest = vi.spyOn(legacyPipeline, "serializeAntigravityJobManifest");
    const spyCLI = vi.spyOn(legacyPipeline, "buildAntigravityCLICommand");

    await provider.ingestSources(
      {
        remoteWorkspaceId: "job-nlm-delegate",
        sources: [
          {
            type: "inline-text",
            sourceId: "src-1",
            title: "T",
            mimeType: "text/plain",
            textContent: "C",
            contentHash: "h",
          },
        ],
      },
      testContext
    );

    expect(spyManifest).toHaveBeenCalled();
    expect(spyCLI).toHaveBeenCalled();
  });

  // ─── 11. GenerateAudioOverview Unsupported ──────────────────────────────────
  it("11. Throws CAPABILITY_UNSUPPORTED when generateAudioOverview is invoked", async () => {
    await expect(
      provider.generateAudioOverview({ remoteWorkspaceId: "job-1" }, testContext)
    ).rejects.toThrow(ProviderException);

    try {
      await provider.generateAudioOverview({ remoteWorkspaceId: "job-1" }, testContext);
    } catch (err: any) {
      expect(err.errorCode).toBe("CAPABILITY_UNSUPPORTED");
      expect(err.providerId).toBe("antigravity-legacy");
      expect(err.retryable).toBe(false);
    }
  });

  // ─── 12. GetJobStatus ───────────────────────────────────────────────────────
  it("12. GetJobStatus returns PENDING without fabricating remote cloud success", async () => {
    const jobRef = {
      providerId: "antigravity-legacy",
      remoteJobId: "job-nlm-123",
      workspaceId: "job-nlm-123",
      correlationId: "corr-1",
      initiatedAt: fixedDate.toISOString(),
    };

    const status = await provider.getJobStatus(jobRef, testContext);
    expect(status.status).toBe("PENDING");
    expect(status.jobRef).toEqual(jobRef);
  });

  // ─── 13. CancelJob ──────────────────────────────────────────────────────────
  it("13. CancelJob returns false without throwing", async () => {
    const jobRef = {
      providerId: "antigravity-legacy",
      remoteJobId: "job-nlm-123",
      workspaceId: "job-nlm-123",
      correlationId: "corr-1",
      initiatedAt: fixedDate.toISOString(),
    };

    const result = await provider.cancelJob(jobRef, testContext);
    expect(result).toBe(false);
  });

  // ─── 14. DeleteWorkspace without approval ───────────────────────────────────
  it("14. Throws PERMISSION_DENIED on deleteWorkspace without valid approvalProof", async () => {
    await expect(
      provider.deleteWorkspace({ remoteWorkspaceId: "ws-1", expectedSlug: "slug-1" }, testContext)
    ).rejects.toThrow(ProviderException);

    try {
      await provider.deleteWorkspace({ remoteWorkspaceId: "ws-1", expectedSlug: "slug-1" }, testContext);
    } catch (err: any) {
      expect(err.errorCode).toBe("PERMISSION_DENIED");
    }
  });

  // ─── 15. DeleteWorkspace with approval ──────────────────────────────────────
  it("15. Returns false on deleteWorkspace with approvalProof because no remote cloud workspace exists", async () => {
    const approvedContext: ExecutionContext = {
      ...testContext,
      approvalProof: {
        approvedBy: "scholar-1",
        approvedAt: fixedDate.toISOString(),
        intent: "delete_workspace",
      },
    };

    const result = await provider.deleteWorkspace(
      { remoteWorkspaceId: "ws-1", expectedSlug: "slug-1" },
      approvedContext
    );
    expect(result).toBe(false);
  });

  // ─── 16. Manifest Format Invariance ─────────────────────────────────────────
  it("16. Preserves standard Antigravity Job Manifest format (pipeline: antigravity-notebooklm-mediator)", async () => {
    const res = await provider.createWorkspace(
      { topicTitle: "Title", topicSlug: "title" },
      testContext
    );

    const legacyJob: legacyPipeline.AntigravityHandoffJob = {
      jobId: res.remoteWorkspaceId,
      status: "queued",
      artifactType: "study_guide",
      topicId: "t-1",
      topicTitle: "Title",
      sourcePath: `.agents/handoffs/${res.remoteWorkspaceId}-source.md`,
      promptPath: `.agents/handoffs/${res.remoteWorkspaceId}-prompt.md`,
      manifestPath: `.agents/handoffs/${res.remoteWorkspaceId}-manifest.json`,
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    };

    const manifestJson = legacyPipeline.serializeAntigravityJobManifest(legacyJob);
    const validated = legacyPipeline.validateAntigravityJobManifest(manifestJson);

    expect(validated.valid).toBe(true);
    expect(validated.manifest?.pipeline).toBe("antigravity-notebooklm-mediator");
    expect(validated.manifest?.files.source).toBe(`.agents/handoffs/${res.remoteWorkspaceId}-source.md`);
  });

  // ─── 17. CLI Command Format Invariance ──────────────────────────────────────
  it("17. Preserves exact headless CLI command shape: agy -p ...", () => {
    const legacyJob: legacyPipeline.AntigravityHandoffJob = {
      jobId: "job-nlm-test",
      status: "queued",
      artifactType: "study_guide",
      topicId: "t-1",
      topicTitle: "Tứ Diệu Đế",
      sourcePath: ".agents/handoffs/job-nlm-test-source.md",
      promptPath: ".agents/handoffs/job-nlm-test-prompt.md",
      manifestPath: ".agents/handoffs/job-nlm-test-manifest.json",
      resultPath: ".agents/handoffs/job-nlm-test-result.md",
      createdAt: fixedDate.toISOString(),
      updatedAt: fixedDate.toISOString(),
    };

    const cmd = legacyPipeline.buildAntigravityCLICommand(legacyJob);
    expect(cmd).toContain('agy -p "Khảo cứu NotebookLM: Xử lý chủ đề \'Tứ Diệu Đế\'');
    expect(cmd).toContain('--output ".agents/handoffs/job-nlm-test-result.md"');
  });
});
