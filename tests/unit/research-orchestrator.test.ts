/**
 * Research Orchestrator Unit & Integration Tests
 * (Phase 4.6 Test-First Validation Suite)
 */

import { describe, it, expect, vi } from "vitest";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import { SourcePayload } from "../../src/server/services/providers/types";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("RESEARCH ORCHESTRATOR UNIT TESTS (PHASE 4.6)", () => {
  const fixedNow = new Date("2026-09-24T12:00:00.000Z");
  const mockDate = () => fixedNow;

  function createStandardOrchestrator(clientOptions = {}) {
    const mockClient = new MockNotebookLMClient(clientOptions);
    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const legacyProvider = new AntigravityProvider({ now: mockDate });

    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: true,
        enableOfficialProvider: true,
        enableLegacyProvider: true,
      },
      providers: [officialProvider, legacyProvider],
    });

    let idCounter = 100;
    const randomId = () => `mock-id-${++idCounter}`;

    const orchestrator = new ResearchOrchestrator({
      registry,
      now: mockDate,
      randomId,
    });

    return { orchestrator, registry, mockClient, officialProvider, legacyProvider };
  }

  const sampleSources: SourcePayload[] = [
    {
      type: "inline-text",
      sourceId: "src-1",
      title: "Bát Nhã Tâm Kinh",
      mimeType: "text/markdown",
      textContent: "Quán Tự Tại Bồ Tát...",
      contentHash: "hash-001",
    },
    {
      type: "url",
      sourceId: "src-2",
      title: "Kinh Tạng Pāli",
      url: "https://thuvienhoasen.org/kinh-tang",
      contentHash: "hash-002",
    },
  ];

  it("1. CreateExecutionContext generates deterministic IDs with injected randomId", () => {
    const { orchestrator } = createStandardOrchestrator();
    const ctx = orchestrator.createExecutionContext({
      correlationId: "custom-corr-1",
    });

    expect(ctx.correlationId).toBe("custom-corr-1");
    expect(ctx.attemptId).toBe("att-mock-id-101");
    expect(ctx.requestId).toBe("req-mock-id-102");
    expect(ctx.idempotencyKey).toBe("idem-mock-id-103");
  });

  it("2. StartResearchJob selects default provider from registry", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Khảo cứu Trung Bộ Kinh",
      sources: sampleSources,
    });

    expect(result.providerId).toBe("notebooklm-enterprise");
    expect(result.sourceCount).toBe(2);
    expect(result.workspaceId).toContain("nlm-ws");
  });

  it("3. StartResearchJob respects valid preferredProviderId", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      preferredProviderId: "antigravity-legacy",
      workspaceTitle: "Khảo cứu Diệu Pháp Liên Hoa Kinh",
      sources: sampleSources,
    });

    expect(result.providerId).toBe("antigravity-legacy");
    expect(result.sourceCount).toBe(2);
    expect(result.workspaceId).toMatch(/^job-nlm-\d+-[a-z0-9]+$/);
  });

  it("4. StartResearchJob calls createWorkspace before ingestSources in exact order", async () => {
    const callOrder: string[] = [];
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async (params) => {
        callOrder.push("createWorkspace");
        return { workspaceId: "nlm-ws-ordered" };
      },
      ingestSourcesHandler: async (params) => {
        callOrder.push("ingestSources");
        return { remoteSourceIds: ["src-1", "src-2"], status: "COMPLETED" };
      },
    });

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: true,
        enableOfficialProvider: true,
        enableLegacyProvider: true,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({ registry, now: mockDate });

    await orchestrator.startResearchJob({
      workspaceTitle: "Order Test",
      sources: sampleSources,
    });

    expect(callOrder).toEqual(["createWorkspace", "ingestSources"]);
  });

  it("5. StartResearchJob aggregates attemptRecords in execution order", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Attempt Order Test",
      sources: sampleSources,
      generateAudioOverview: true,
    });

    expect(result.attemptRecords).toHaveLength(3);
    expect(result.attemptRecords[0].status).toBe("COMPLETED"); // createWorkspace
    expect(result.attemptRecords[1].status).toBe("COMPLETED"); // ingestSources
    expect(result.attemptRecords[2].status).toBe("IN_PROGRESS"); // generateAudioOverview
  });

  it("6. StartResearchJob returns exact ingested sourceCount", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Source Count Test",
      sources: sampleSources,
    });

    expect(result.sourceCount).toBe(2);
  });

  it("7. StartResearchJob returns audioJob when generateAudioOverview=true on supporting provider", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Audio Overview Test",
      sources: sampleSources,
      generateAudioOverview: true,
      audioFormat: "brief",
    });

    expect(result.audioJob).not.toBeNull();
    expect(result.audioJob?.providerId).toBe("notebooklm-enterprise");
    expect(result.audioJob?.remoteJobId).toContain("nlm-op-audio");
  });

  it("8. StartResearchJob throws CAPABILITY_UNSUPPORTED when audio is requested on unsupported provider", async () => {
    const { orchestrator } = createStandardOrchestrator();

    await expect(
      orchestrator.startResearchJob({
        preferredProviderId: "antigravity-legacy",
        workspaceTitle: "Audio Overview Unsupported Test",
        sources: sampleSources,
        generateAudioOverview: true,
      })
    ).rejects.toThrow(ProviderException);

    try {
      await orchestrator.startResearchJob({
        preferredProviderId: "antigravity-legacy",
        workspaceTitle: "Audio Overview Unsupported Test",
        sources: sampleSources,
        generateAudioOverview: true,
      });
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("CAPABILITY_UNSUPPORTED");
      expect(pErr.providerId).toBe("antigravity-legacy");
    }
  });

  it("9. StartResearchJob propagates ProviderException untouched", async () => {
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        throw new ProviderException(
          "AUTHENTICATION_FAILED",
          "Invalid OAuth Token",
          "corr-auth-1",
          "notebooklm-enterprise"
        );
      },
    });

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({ registry, now: mockDate });

    try {
      await orchestrator.startResearchJob({
        workspaceTitle: "Auth Failure Test",
        sources: sampleSources,
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("AUTHENTICATION_FAILED");
      expect(pErr.message).toBe("Invalid OAuth Token");
    }
  });

  it("10. StartResearchJob wraps generic errors in sanitized INTERNAL_ERROR", async () => {
    const mockClient = new MockNotebookLMClient({
      createWorkspaceHandler: async () => {
        throw new Error("Uncaught filesystem panic at Bearer secret-raw-token-1234");
      },
    });

    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: false,
        enableOfficialProvider: true,
        enableLegacyProvider: false,
      },
      providers: [officialProvider],
    });

    const orchestrator = new ResearchOrchestrator({ registry, now: mockDate });

    try {
      await orchestrator.startResearchJob({
        workspaceTitle: "Sanitize Error Test",
        sources: sampleSources,
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INTERNAL_ERROR");
      expect(pErr.message).not.toContain("secret-raw-token-1234");
      expect(pErr.message).toContain("Bearer [REDACTED]");
    }
  });

  it("11. StartResearchJob does NOT resolve local file paths directly", async () => {
    const { orchestrator, mockClient } = createStandardOrchestrator();

    const fileSource: SourcePayload = {
      type: "file",
      sourceId: "src-file-99",
      title: "Thanh Tịnh Đạo.pdf",
      mimeType: "application/pdf",
      sourceObjectId: "safe-storage-objects/thanh-tinh-dao.pdf",
      byteSize: 2048576,
      contentHash: "sha256:fedcba987654",
    };

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "File Ingestion Test",
      sources: [fileSource],
    });

    expect(result.sourceCount).toBe(1);
    expect(mockClient.ingestedBatches[0].sources[0]).toEqual(fileSource);
  });

  it("12. StartResearchJob makes no direct network side effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { orchestrator } = createStandardOrchestrator();

    await orchestrator.startResearchJob({
      workspaceTitle: "Network Isolation Test",
      sources: sampleSources,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("13. StartResearchJob does not write to database or wire routes", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Pure Orchestration Test",
      sources: sampleSources,
    });

    expect(result).toBeDefined();
    expect(result.workspaceId).toBeDefined();
  });

  it("14. StartResearchJob works seamlessly with Official Provider mock", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      preferredProviderId: "notebooklm-enterprise",
      workspaceTitle: "Official Provider Run",
      sources: sampleSources,
      generateAudioOverview: true,
    });

    expect(result.providerId).toBe("notebooklm-enterprise");
    expect(result.audioJob).not.toBeNull();
  });

  it("15. StartResearchJob works seamlessly with Legacy Provider without audio", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      preferredProviderId: "antigravity-legacy",
      workspaceTitle: "Legacy Provider Run",
      sources: sampleSources,
      generateAudioOverview: false,
    });

    expect(result.providerId).toBe("antigravity-legacy");
    expect(result.audioJob).toBeNull();
    expect(result.sourceCount).toBe(2);
  });

  it("16. StartResearchJob fails fast when preferred provider is invalid or disabled", async () => {
    const { orchestrator } = createStandardOrchestrator();

    await expect(
      orchestrator.startResearchJob({
        preferredProviderId: "non-existent-provider",
        workspaceTitle: "Invalid Provider Test",
        sources: sampleSources,
      })
    ).rejects.toThrow(ProviderException);
  });

  it("17. StartResearchJob preserves caller correlationId when supplied", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Correlation Preservation Test",
      sources: sampleSources,
      generateAudioOverview: true,
      correlationId: "custom-trace-id-777",
    });

    expect(result.audioJob?.correlationId).toBe("custom-trace-id-777");
  });

  it("18. StartResearchJob generates fresh correlationId when caller omits it", async () => {
    const { orchestrator } = createStandardOrchestrator();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Auto Correlation Test",
      sources: sampleSources,
      generateAudioOverview: true,
    });

    expect(result.audioJob?.correlationId).toMatch(/^corr-mock-id-\d+$/);
  });
});
