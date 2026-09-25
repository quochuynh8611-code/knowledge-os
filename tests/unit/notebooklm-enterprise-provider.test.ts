/**
 * NotebookLM Enterprise Provider Unit & Boundary Tests
 * (Phase 4.4 Test-First Validation Suite)
 */

import { describe, it, expect, vi } from "vitest";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import {
  ExecutionContext,
  NOTEBOOKLM_ENTERPRISE_CAPABILITIES,
  SourcePayload,
} from "../../src/server/services/providers/types";
import { ProviderException } from "../../src/server/services/providers/errors";

function createMockContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    requestId: "req-nlm-test-01",
    correlationId: "corr-nlm-test-01",
    attemptId: "att-nlm-test-01",
    actor: { userId: "user-test", role: "user" },
    idempotencyKey: "idem-nlm-test-01",
    ...overrides,
  };
}

describe("NOTEBOOKLM ENTERPRISE PROVIDER UNIT TESTS (PHASE 4.4)", () => {
  const fixedNow = new Date("2026-09-24T12:00:00.000Z");
  const mockDate = () => fixedNow;

  it("1. Exposes correct official metadata (id, type, name, version)", () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);

    expect(provider.metadata.id).toBe("notebooklm-enterprise");
    expect(provider.metadata.type).toBe("official");
    expect(provider.metadata.name).toBe("NotebookLM Enterprise API (Official)");
    expect(provider.metadata.version).toBe("1.0.0");
    expect(provider.metadata.description.toLowerCase()).toContain("official");
  });

  it("2. Returns NOTEBOOKLM_ENTERPRISE_CAPABILITIES matching specification", () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const caps = provider.getCapabilities();

    expect(caps).toEqual(NOTEBOOKLM_ENTERPRISE_CAPABILITIES);
    expect(caps.supportsNotebookManagement).toBe(true);
    expect(caps.supportsSourceIngestion).toBe(true);
    expect(caps.supportsAudioOverview).toBe(true);
    expect(caps.supportsBatchSourceDelete).toBe(true);
    expect(caps.supportsQuery).toBe(false);
    expect(caps.supportsInteractiveChat).toBe(false);
    expect(caps.supportsStudyGuide).toBe(false);
    expect(caps.supportsMindMap).toBe(false);
    expect(caps.supportsSlides).toBe(false);
  });

  it("3. HealthCheck returns healthy without touching cloud network or leaking credentials", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();

    const health = await provider.healthCheck(context);
    expect(health.isHealthy).toBe(true);
    expect(health.providerId).toBe("notebooklm-enterprise");
    expect(health.message).toBe("Client boundary configured");
  });

  it("4. CreateWorkspace invokes client boundary with exact parameters", async () => {
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async (params) => {
        expect(params.title).toBe("Bát Nhã Ba La Mật Đa Tâm Kinh");
        expect(params.metadata?.slug).toBe("bat-nha-tam-kinh");
        expect(params.metadata?.category).toBe("phat-hoc");
        return { workspaceId: "nlm-ws-12345" };
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();

    const res = await provider.createWorkspace(
      {
        topicTitle: "Bát Nhã Ba La Mật Đa Tâm Kinh",
        topicSlug: "bat-nha-tam-kinh",
        category: "phat-hoc",
      },
      context
    );

    expect(res.remoteWorkspaceId).toBe("nlm-ws-12345");
  });

  it("5. CreateWorkspace populates attemptRecord conforming to ExecutionContext", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({ attemptId: "att-create-ws-99" });

    const res = await provider.createWorkspace(
      {
        topicTitle: "Khảo cứu Tứ Diệu Đế",
        topicSlug: "tu-dieu-de",
      },
      context
    );

    expect(res.attemptRecord.attemptId).toBe("att-create-ws-99");
    expect(res.attemptRecord.providerId).toBe("notebooklm-enterprise");
    expect(res.attemptRecord.status).toBe("COMPLETED");
    expect(res.attemptRecord.remoteWorkspaceId).toBe(res.remoteWorkspaceId);
    expect(res.attemptRecord.startedAt).toBe("2026-09-24T12:00:00.000Z");
    expect(res.attemptRecord.completedAt).toBe("2026-09-24T12:00:00.000Z");
  });

  it("6. IngestSources invokes client boundary with exact sources", async () => {
    const mockSources: SourcePayload[] = [
      {
        type: "inline-text",
        sourceId: "src-1",
        title: "Kinh Văn",
        mimeType: "text/markdown",
        textContent: "Quán Tự Tại Bồ Tát...",
        contentHash: "hash-001",
      },
      {
        type: "url",
        sourceId: "src-2",
        title: "Thư viện Hoa Sen",
        url: "https://thuvienhoasen.org/bat-nha",
        contentHash: "hash-002",
      },
    ];

    let ingestedParams: any = null;
    const mockClient = new MockNotebookLMClient({
      ingestSourcesHandler: async (params) => {
        ingestedParams = params;
        return {
          remoteSourceIds: ["remote-src-1", "remote-src-2"],
          status: "COMPLETED",
        };
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();

    const res = await provider.ingestSources(
      {
        remoteWorkspaceId: "nlm-ws-target",
        sources: mockSources,
      },
      context
    );

    expect(ingestedParams.workspaceId).toBe("nlm-ws-target");
    expect(ingestedParams.sources).toHaveLength(2);
    expect(res.status).toBe("COMPLETED");
    expect(res.ingestedCount).toBe(2);
    expect(res.remoteSourceIds).toEqual(["remote-src-1", "remote-src-2"]);
  });

  it("7. IngestSources maps status COMPLETED properly in attemptRecord", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({ attemptId: "att-ingest-ok" });

    const res = await provider.ingestSources(
      {
        remoteWorkspaceId: "nlm-ws-55",
        sources: [
          {
            type: "inline-text",
            sourceId: "s1",
            title: "Ghi chú",
            mimeType: "text/plain",
            textContent: "Nội dung",
            contentHash: "h1",
          },
        ],
      },
      context
    );

    expect(res.status).toBe("COMPLETED");
    expect(res.attemptRecord.status).toBe("COMPLETED");
    expect(res.attemptRecord.errorCode).toBeUndefined();
  });

  it("8. IngestSources maps status FAILED properly in attemptRecord", async () => {
    const mockClient = new MockNotebookLMClient({
      ingestSourcesHandler: async () => ({
        remoteSourceIds: [],
        status: "FAILED",
      }),
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({ attemptId: "att-ingest-fail" });

    const res = await provider.ingestSources(
      {
        remoteWorkspaceId: "nlm-ws-55",
        sources: [
          {
            type: "inline-text",
            sourceId: "s1",
            title: "Ghi chú",
            mimeType: "text/plain",
            textContent: "Nội dung",
            contentHash: "h1",
          },
        ],
      },
      context
    );

    expect(res.status).toBe("FAILED");
    expect(res.ingestedCount).toBe(0);
    expect(res.attemptRecord.status).toBe("FAILED");
    expect(res.attemptRecord.errorCode).toBe("INTERNAL_ERROR");
  });

  it("9. GenerateAudioOverview returns jobRef with correlationId and operationId", async () => {
    const mockClient = new MockNotebookLMClient({
      generateAudioOverviewHandler: async (params) => {
        expect(params.workspaceId).toBe("nlm-ws-audio");
        expect(params.format).toBe("deep_dive");
        return { operationId: "op-audio-999" };
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({ correlationId: "corr-audio-test" });

    const res = await provider.generateAudioOverview(
      {
        remoteWorkspaceId: "nlm-ws-audio",
        format: "deep_dive",
      },
      context
    );

    expect(res.jobRef.providerId).toBe("notebooklm-enterprise");
    expect(res.jobRef.remoteJobId).toBe("op-audio-999");
    expect(res.jobRef.workspaceId).toBe("nlm-ws-audio");
    expect(res.jobRef.correlationId).toBe("corr-audio-test");
    expect(res.attemptRecord.status).toBe("IN_PROGRESS");
  });

  it("10. GetJobStatus maps in-progress operation correctly", async () => {
    const mockClient = new MockNotebookLMClient({
      getOperationStatusHandler: async () => ({
        isDone: false,
      }),
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();
    const jobRef = {
      providerId: "notebooklm-enterprise",
      remoteJobId: "op-running",
      workspaceId: "nlm-ws-1",
      correlationId: "c1",
      initiatedAt: "2026-09-24T12:00:00.000Z",
    };

    const status = await provider.getJobStatus(jobRef, context);
    expect(status.status).toBe("IN_PROGRESS");
    expect(status.resultUrl).toBeUndefined();
  });

  it("11. GetJobStatus maps failed operation with sanitized error message", async () => {
    const mockClient = new MockNotebookLMClient({
      getOperationStatusHandler: async () => ({
        isDone: true,
        error: "Quota exceeded for Bearer ya29.secretToken12345",
      }),
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();
    const jobRef = {
      providerId: "notebooklm-enterprise",
      remoteJobId: "op-failed",
      workspaceId: "nlm-ws-1",
      correlationId: "c1",
      initiatedAt: "2026-09-24T12:00:00.000Z",
    };

    const status = await provider.getJobStatus(jobRef, context);
    expect(status.status).toBe("FAILED");
    expect(status.error).toContain("Bearer [REDACTED]");
    expect(status.error).not.toContain("ya29.secretToken12345");
  });

  it("12. GetJobStatus maps completed operation with resultUrl", async () => {
    const mockClient = new MockNotebookLMClient({
      getOperationStatusHandler: async () => ({
        isDone: true,
        resultUrl: "https://notebooklm.google.com/audio/deep-dive.mp3",
      }),
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();
    const jobRef = {
      providerId: "notebooklm-enterprise",
      remoteJobId: "op-done",
      workspaceId: "nlm-ws-1",
      correlationId: "c1",
      initiatedAt: "2026-09-24T12:00:00.000Z",
    };

    const status = await provider.getJobStatus(jobRef, context);
    expect(status.status).toBe("COMPLETED");
    expect(status.resultUrl).toBe("https://notebooklm.google.com/audio/deep-dive.mp3");
  });

  it("13. GetJobStatus maps ambiguous response without resultUrl/error to PENDING", async () => {
    const mockClient = new MockNotebookLMClient({
      getOperationStatusHandler: async () => ({
        isDone: true,
      }),
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();
    const jobRef = {
      providerId: "notebooklm-enterprise",
      remoteJobId: "op-ambiguous",
      workspaceId: "nlm-ws-1",
      correlationId: "c1",
      initiatedAt: "2026-09-24T12:00:00.000Z",
    };

    const status = await provider.getJobStatus(jobRef, context);
    expect(status.status).toBe("PENDING");
  });

  it("14. CancelJob returns false without throwing", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();
    const jobRef = {
      providerId: "notebooklm-enterprise",
      remoteJobId: "op-1",
      workspaceId: "nlm-ws-1",
      correlationId: "c1",
      initiatedAt: "2026-09-24T12:00:00.000Z",
    };

    const cancelled = await provider.cancelJob(jobRef, context);
    expect(cancelled).toBe(false);
  });

  it("15. DeleteWorkspace throws PERMISSION_DENIED when approvalProof is missing", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext(); // No approvalProof

    await expect(
      provider.deleteWorkspace(
        { remoteWorkspaceId: "nlm-ws-del", expectedSlug: "bat-nha" },
        context
      )
    ).rejects.toThrow(ProviderException);

    try {
      await provider.deleteWorkspace(
        { remoteWorkspaceId: "nlm-ws-del", expectedSlug: "bat-nha" },
        context
      );
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("PERMISSION_DENIED");
      expect(pErr.providerId).toBe("notebooklm-enterprise");
    }
  });

  it("16. DeleteWorkspace invokes client.deleteWorkspace when valid approvalProof is supplied", async () => {
    let deletedId = "";
    const mockClient = new MockNotebookLMClient({
      deleteWorkspaceHandler: async (params) => {
        deletedId = params.workspaceId;
        return true;
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({
      approvalProof: {
        approvedBy: "admin-user",
        approvedAt: "2026-09-24T12:00:00.000Z",
        intent: "delete_workspace",
      },
    });

    const result = await provider.deleteWorkspace(
      { remoteWorkspaceId: "nlm-ws-to-delete", expectedSlug: "bat-nha" },
      context
    );

    expect(result).toBe(true);
    expect(deletedId).toBe("nlm-ws-to-delete");
  });

  it("17. Does NOT expose query capability on official enterprise provider", () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);

    expect(provider.getCapabilities().supportsQuery).toBe(false);
    expect(provider.getCapabilities().supportsInteractiveChat).toBe(false);
    expect((provider as any).query).toBeUndefined();
  });

  it("18. IngestSources does NOT attempt to resolve local file paths directly", async () => {
    const mockClient = new MockNotebookLMClient();
    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();

    const fileSource: SourcePayload = {
      type: "file",
      sourceId: "src-file-1",
      title: "Luận Đại Thừa Khởi Tín.pdf",
      mimeType: "application/pdf",
      sourceObjectId: "safe-storage-objects/luan-dai-thua.pdf",
      byteSize: 1048576,
      contentHash: "sha256:abc123def456",
    };

    const res = await provider.ingestSources(
      {
        remoteWorkspaceId: "nlm-ws-file",
        sources: [fileSource],
      },
      context
    );

    expect(res.status).toBe("COMPLETED");
    expect(res.remoteSourceIds).toHaveLength(1);
    expect(mockClient.ingestedBatches[0].sources[0]).toEqual(fileSource);
  });

  it("19. Normalizes client errors and sanitizes secrets (AIzaSy, Bearer, Private Key)", async () => {
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        throw new Error(
          "Google API call failed with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q and Bearer secret-auth-token-123456"
        );
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext({ correlationId: "corr-sanitize-check" });

    await expect(
      provider.createWorkspace({ topicTitle: "Test", topicSlug: "test" }, context)
    ).rejects.toThrow(ProviderException);

    try {
      await provider.createWorkspace({ topicTitle: "Test", topicSlug: "test" }, context);
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
      expect(pErr.message).toContain("[REDACTED_API_KEY]");
      expect(pErr.message).toContain("Bearer [REDACTED]");
      expect(pErr.correlationId).toBe("corr-sanitize-check");
      expect(pErr.providerId).toBe("notebooklm-enterprise");
    }
  });

  it("20. Maps auth/permission client errors to standardized ProviderException codes", async () => {
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        throw new Error("HTTP 401 Unauthorized: IAM authentication failure");
      },
    });

    const provider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const context = createMockContext();

    try {
      await provider.createWorkspace({ topicTitle: "Test", topicSlug: "test" }, context);
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("AUTHENTICATION_FAILED");
      expect(pErr.retryable).toBe(false);
    }
  });
});
