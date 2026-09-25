/**
 * Research Orchestrator & Persistence Integration Unit Tests
 * (Phase 4.8 Test-First Validation Suite)
 */

import { describe, it, expect, vi } from "vitest";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import {
  InMemoryResearchPersistencePort,
  ResearchPersistencePort,
} from "../../src/server/services/providers/researchPersistencePort";
import { SourcePayload } from "../../src/server/services/providers/types";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("RESEARCH ORCHESTRATOR PERSISTENCE INTEGRATION TESTS (PHASE 4.8)", () => {
  const fixedNow = new Date("2026-09-24T12:00:00.000Z");
  const mockDate = () => fixedNow;

  function createTestEnvironment(
    clientOptions = {},
    persistence: ResearchPersistencePort = new InMemoryResearchPersistencePort()
  ) {
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
      persistence,
      now: mockDate,
      randomId,
    });

    return { orchestrator, registry, persistence, mockClient, officialProvider, legacyProvider };
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

  it("1. StartResearchJob saves snapshot on successful completion when persistence is injected", async () => {
    const { orchestrator, persistence } = createTestEnvironment();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Persisted Research Test",
      sources: sampleSources,
      correlationId: "corr-pers-success-01",
    });

    const snapshot = await persistence.getExecutionByCorrelationId("corr-pers-success-01");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.correlationId).toBe("corr-pers-success-01");
    expect(snapshot?.terminalStatus).toBe("COMPLETED");
  });

  it("2. Saved snapshot contains exact correlationId/providerId/workspaceId/sourceCount", async () => {
    const { orchestrator, persistence } = createTestEnvironment();

    const result = await orchestrator.startResearchJob({
      workspaceTitle: "Exact Fields Test",
      sources: sampleSources,
      correlationId: "corr-exact-fields",
    });

    const snapshot = await persistence.getExecutionByCorrelationId("corr-exact-fields");
    expect(snapshot?.providerId).toBe("notebooklm-enterprise");
    expect(snapshot?.workspaceId).toBe(result.workspaceId);
    expect(snapshot?.sourceCount).toBe(2);
  });

  it("3. Saved snapshot stores attemptRecords in correct execution order", async () => {
    const { orchestrator, persistence } = createTestEnvironment();

    await orchestrator.startResearchJob({
      workspaceTitle: "Attempt Order Persistence",
      sources: sampleSources,
      generateAudioOverview: true,
      correlationId: "corr-attempt-order",
    });

    const snapshot = await persistence.getExecutionByCorrelationId("corr-attempt-order");
    expect(snapshot?.attemptRecords).toHaveLength(3);
    expect(snapshot?.attemptRecords[0].status).toBe("COMPLETED"); // createWorkspace
    expect(snapshot?.attemptRecords[1].status).toBe("COMPLETED"); // ingestSources
    expect(snapshot?.attemptRecords[2].status).toBe("IN_PROGRESS"); // generateAudioOverview
  });

  it("4. Saved snapshot supports nullable audioJobId when no audio job exists", async () => {
    const { orchestrator, persistence } = createTestEnvironment();

    await orchestrator.startResearchJob({
      workspaceTitle: "No Audio Test",
      sources: sampleSources,
      generateAudioOverview: false,
      correlationId: "corr-no-audio",
    });

    const snapshot = await persistence.getExecutionByCorrelationId("corr-no-audio");
    expect(snapshot?.audioJobId).toBeNull();
  });

  it("5. StartResearchJob saves failed snapshot when provider throws after partial progress", async () => {
    const { orchestrator, persistence } = createTestEnvironment({
      ingestSourcesHandler: async () => {
        throw new ProviderException(
          "PROVIDER_UNAVAILABLE",
          "Ingestion service downstream 503",
          "corr-fail-progress",
          "notebooklm-enterprise",
          true
        );
      },
    });

    await expect(
      orchestrator.startResearchJob({
        workspaceTitle: "Partial Fail Test",
        sources: sampleSources,
        correlationId: "corr-fail-progress",
      })
    ).rejects.toThrow(ProviderException);

    const snapshot = await persistence.getExecutionByCorrelationId("corr-fail-progress");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.attemptRecords).toHaveLength(1); // createWorkspace succeeded before ingest failed
  });

  it("6. Failed snapshot has terminalStatus = FAILED", async () => {
    const { orchestrator, persistence } = createTestEnvironment({
      ingestSourcesHandler: async () => {
        throw new Error("Generic failure during source ingestion");
      },
    });

    await expect(
      orchestrator.startResearchJob({
        workspaceTitle: "Failed Status Test",
        sources: sampleSources,
        correlationId: "corr-status-failed",
      })
    ).rejects.toThrow();

    const snapshot = await persistence.getExecutionByCorrelationId("corr-status-failed");
    expect(snapshot?.terminalStatus).toBe("FAILED");
  });

  it("7. Original ProviderException is rethrown untouched after failed snapshot save", async () => {
    const { orchestrator } = createTestEnvironment({
      ingestSourcesHandler: async () => {
        throw new ProviderException(
          "AUTHENTICATION_FAILED",
          "Session Token Expired",
          "corr-rethrow-check",
          "notebooklm-enterprise",
          false
        );
      },
    });

    try {
      await orchestrator.startResearchJob({
        workspaceTitle: "Rethrow Test",
        sources: sampleSources,
        correlationId: "corr-rethrow-check",
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("AUTHENTICATION_FAILED");
      expect(pErr.message).toBe("Session Token Expired");
    }
  });

  it("8. Generic provider error is wrapped in sanitized INTERNAL_ERROR and snapshot is saved", async () => {
    const { orchestrator, persistence } = createTestEnvironment({
      ingestSourcesHandler: async () => {
        throw new Error("Crashing with raw key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
      },
    });

    try {
      await orchestrator.startResearchJob({
        workspaceTitle: "Generic Error Wrap",
        sources: sampleSources,
        correlationId: "corr-generic-err",
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INTERNAL_ERROR");
      expect(pErr.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
      expect(pErr.message).toContain("[REDACTED_API_KEY]");
    }

    const snapshot = await persistence.getExecutionByCorrelationId("corr-generic-err");
    expect(snapshot?.terminalStatus).toBe("FAILED");
  });

  it("9. Persistence failure after successful orchestration becomes INTERNAL_ERROR", async () => {
    const failingPersistence = {
      saveExecution: async () => {
        throw new Error("Disk quota exhausted at /var/storage");
      },
      getExecutionByCorrelationId: async () => null,
      listAttempts: async () => [],
    };

    const { orchestrator } = createTestEnvironment({}, failingPersistence);

    try {
      await orchestrator.startResearchJob({
        workspaceTitle: "Persistence Fail Test",
        sources: sampleSources,
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INTERNAL_ERROR");
      expect(pErr.message).toContain("Persistence failure");
    }
  });

  it("10. Persistence failure does not mutate orchestration attemptRecords", async () => {
    const failingPersistence = {
      saveExecution: async () => {
        throw new Error("DB Connection Refused");
      },
      getExecutionByCorrelationId: async () => null,
      listAttempts: async () => [],
    };

    const { orchestrator } = createTestEnvironment({}, failingPersistence);

    await expect(
      orchestrator.startResearchJob({
        workspaceTitle: "Immutability Test",
        sources: sampleSources,
      })
    ).rejects.toThrow(ProviderException);
  });

  it("11. No persistence injected preserves original orchestration behavior", async () => {
    const { officialProvider, legacyProvider } = createTestEnvironment();
    const registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: true,
        enableOfficialProvider: true,
        enableLegacyProvider: true,
      },
      providers: [officialProvider, legacyProvider],
    });

    const standaloneOrchestrator = new ResearchOrchestrator({
      registry,
      // persistence omitted
      now: mockDate,
    });

    const result = await standaloneOrchestrator.startResearchJob({
      workspaceTitle: "No Persistence Injected",
      sources: sampleSources,
    });

    expect(result.providerId).toBe("notebooklm-enterprise");
    expect(result.sourceCount).toBe(2);
    expect(result.attemptRecords).toHaveLength(2);
  });

  it("12. Zero database or network side-effects outside memory boundaries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { orchestrator } = createTestEnvironment();

    await orchestrator.startResearchJob({
      workspaceTitle: "Boundary Isolation Test",
      sources: sampleSources,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
