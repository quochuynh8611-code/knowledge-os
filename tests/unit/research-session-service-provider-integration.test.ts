/**
 * Research Session Service & Provider Integration Unit Tests
 * (Phase 5 Test-First Validation Suite)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { ProviderRegistry } from "../../src/server/services/providers/providerRegistry";
import { NotebookLMEnterpriseProvider } from "../../src/server/services/providers/notebooklmEnterpriseProvider";
import { AntigravityProvider } from "../../src/server/services/providers/antigravityProvider";
import { MockNotebookLMClient } from "../../src/server/services/providers/notebooklmClient";
import {
  InMemoryResearchPersistencePort,
  ResearchPersistencePort,
} from "../../src/server/services/providers/researchPersistencePort";
import { SourcePayload } from "../../src/server/services/providers/types";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("RESEARCH SESSION SERVICE PROVIDER INTEGRATION TESTS (PHASE 5)", () => {
  const fixedNow = new Date("2026-09-24T12:00:00.000Z");
  const mockDate = () => fixedNow;

  let mockPrisma: any;
  let mockClient: MockNotebookLMClient;
  let registry: ProviderRegistry;
  let persistence: ResearchPersistencePort;
  let orchestrator: ResearchOrchestrator;
  let service: ResearchSessionService;

  const sampleSession = {
    id: "session-test-01",
    topicId: "topic-bat-nha-01",
    status: "idle",
    notebookUrl: null,
    notebookId: null,
    sourcePackages: [] as any[],
    taskPrompts: [] as any[],
    artifacts: [] as any[],
    timelineEvents: [] as any[],
    createdAt: fixedNow,
    updatedAt: fixedNow,
  };

  const sampleSources: SourcePayload[] = [
    {
      type: "inline-text",
      sourceId: "src-1",
      title: "Bát Nhã Tâm Kinh",
      mimeType: "text/markdown",
      textContent: "Quán Tự Tại Bồ Tát...",
      contentHash: "hash-001",
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      researchSession: {
        findUnique: vi.fn().mockResolvedValue(sampleSession),
        findFirst: vi.fn().mockResolvedValue(sampleSession),
        create: vi.fn().mockResolvedValue(sampleSession),
        update: vi.fn().mockResolvedValue({ ...sampleSession, status: "completed" }),
      },
      topic: {
        findUnique: vi.fn().mockResolvedValue({ id: "topic-bat-nha-01", title: "Bát Nhã" }),
      },
      researchTimelineEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-01" }),
      },
      sourcePackage: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: "pkg-01", version: 1 }),
      },
      taskPrompt: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue({ id: "pmt-01", version: 1 }),
      },
      $transaction: vi.fn().mockImplementation((args: any[]) => Promise.all(args)),
    };

    mockClient = new MockNotebookLMClient();
    const officialProvider = new NotebookLMEnterpriseProvider(mockClient, mockDate);
    const legacyProvider = new AntigravityProvider({ now: mockDate });

    registry = new ProviderRegistry({
      config: {
        defaultProvider: "official",
        allowFallback: true,
        enableOfficialProvider: true,
        enableLegacyProvider: true,
      },
      providers: [officialProvider, legacyProvider],
    });

    persistence = new InMemoryResearchPersistencePort();
    orchestrator = new ResearchOrchestrator({
      registry,
      persistence,
      now: mockDate,
      randomId: () => "det-123",
    });

    service = new ResearchSessionService(mockPrisma, {
      orchestrator,
      persistence,
      now: mockDate,
    });
  });

  it("1. StartProviderResearchForSession throws when session does not exist", async () => {
    mockPrisma.researchSession.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.startProviderResearchForSession({
        sessionId: "non-existent-session",
        workspaceTitle: "Test",
        sources: sampleSources,
      })
    ).rejects.toThrow("Session with id non-existent-session not found");
  });

  it("2. StartProviderResearchForSession throws when orchestrator dependency is missing", async () => {
    const unconfiguredService = new ResearchSessionService(mockPrisma, {
      persistence,
    });

    await expect(
      unconfiguredService.startProviderResearchForSession({
        sessionId: "session-test-01",
        workspaceTitle: "Test",
        sources: sampleSources,
      })
    ).rejects.toThrow("ResearchOrchestrator dependency is not configured");
  });

  it("3. StartProviderResearchForSession throws when persistence dependency is missing", async () => {
    const unconfiguredService = new ResearchSessionService(mockPrisma, {
      orchestrator,
    });

    await expect(
      unconfiguredService.startProviderResearchForSession({
        sessionId: "session-test-01",
        workspaceTitle: "Test",
        sources: sampleSources,
      })
    ).rejects.toThrow("ResearchPersistencePort dependency is not configured");
  });

  it("4. StartProviderResearchForSession calls orchestrator with exact parameters", async () => {
    const spy = vi.spyOn(orchestrator, "startResearchJob");

    await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Khảo cứu Tứ Diệu Đế",
      sources: sampleSources,
      correlationId: "corr-custom-777",
    });

    expect(spy).toHaveBeenCalledWith({
      workspaceTitle: "Khảo cứu Tứ Diệu Đế",
      workspaceMetadata: undefined,
      sources: sampleSources,
      preferredProviderId: undefined,
      generateAudioOverview: undefined,
      audioFormat: undefined,
      correlationId: "corr-custom-777",
    });
  });

  it("5. StartProviderResearchForSession reads snapshot back from persistence by correlationId", async () => {
    const result = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Snapshot Persistence Verification",
      sources: sampleSources,
      correlationId: "corr-snap-read-01",
    });

    const storedSnapshot = await service.getProviderExecutionSnapshot({
      correlationId: "corr-snap-read-01",
    });

    expect(storedSnapshot).not.toBeNull();
    expect(storedSnapshot?.correlationId).toBe("corr-snap-read-01");
    expect(result.terminalStatus).toBe("COMPLETED");
  });

  it("6. StartProviderResearchForSession updates researchSession status through prisma", async () => {
    await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Session Status Update Test",
      sources: sampleSources,
    });

    expect(mockPrisma.researchSession.update).toHaveBeenCalledWith({
      where: { id: "session-test-01" },
      data: {
        status: "completed",
        notebookId: expect.stringContaining("nlm-ws"),
      },
    });
  });

  it("7. StartProviderResearchForSession creates timeline event with versioned eventData", async () => {
    await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Timeline Event Test",
      sources: sampleSources,
      correlationId: "corr-timeline-evt-01",
    });

    expect(mockPrisma.researchTimelineEvent.create).toHaveBeenCalledWith({
      data: {
        sessionId: "session-test-01",
        topicId: "topic-bat-nha-01",
        eventType: "provider_research_completed",
        eventData: {
          schemaVersion: 1,
          correlationId: "corr-timeline-evt-01",
          providerId: "notebooklm-enterprise",
          workspaceId: expect.any(String),
          sourceCount: 1,
          audioJobId: null,
          terminalStatus: "COMPLETED",
          attemptCount: 2, // createWorkspace + ingestSources
        },
      },
    });
  });

  it("8. Returned summary contains all required fields", async () => {
    const summary = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Summary Fields Test",
      sources: sampleSources,
      correlationId: "corr-summary-fields",
    });

    expect(summary.sessionId).toBe("session-test-01");
    expect(summary.correlationId).toBe("corr-summary-fields");
    expect(summary.providerId).toBe("notebooklm-enterprise");
    expect(summary.workspaceId).toBeDefined();
    expect(summary.sourceCount).toBe(1);
    expect(summary.audioJobId).toBeNull();
    expect(summary.terminalStatus).toBe("COMPLETED");
  });

  it("9. Supports audio overview with non-null audioJobId", async () => {
    const summary = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Audio Overview Run",
      sources: sampleSources,
      generateAudioOverview: true,
      audioFormat: "deep_dive",
      correlationId: "corr-audio-overview",
    });

    expect(summary.audioJobId).not.toBeNull();
    expect(summary.audioJobId).toContain("nlm-op-audio");
  });

  it("10. Works with successful official provider orchestration result", async () => {
    const summary = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Official Run",
      sources: sampleSources,
      preferredProviderId: "notebooklm-enterprise",
    });

    expect(summary.providerId).toBe("notebooklm-enterprise");
    expect(summary.terminalStatus).toBe("COMPLETED");
  });

  it("11. Works with successful legacy provider orchestration result", async () => {
    const summary = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Legacy Run",
      sources: sampleSources,
      preferredProviderId: "antigravity-legacy",
    });

    expect(summary.providerId).toBe("antigravity-legacy");
    expect(summary.terminalStatus).toBe("COMPLETED");
  });

  it("12. Sanitizes error if Prisma session update fails after orchestration success", async () => {
    mockPrisma.researchSession.update.mockRejectedValueOnce(
      new Error("DB error with Bearer secret-auth-token-123456")
    );

    try {
      await service.startProviderResearchForSession({
        sessionId: "session-test-01",
        workspaceTitle: "Prisma Fail",
        sources: sampleSources,
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INTERNAL_ERROR");
      expect(pErr.message).not.toContain("secret-auth-token-123456");
      expect(pErr.message).toContain("Bearer [REDACTED]");
    }
  });

  it("13. Sanitizes error if timeline event creation fails", async () => {
    mockPrisma.researchTimelineEvent.create.mockRejectedValueOnce(
      new Error("Timeline DB error with AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q")
    );

    try {
      await service.startProviderResearchForSession({
        sessionId: "session-test-01",
        workspaceTitle: "Timeline Fail",
        sources: sampleSources,
      });
      expect.unreachable("Should have thrown");
    } catch (err) {
      const pErr = err as ProviderException;
      expect(pErr.errorCode).toBe("INTERNAL_ERROR");
      expect(pErr.message).not.toContain("AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q");
      expect(pErr.message).toContain("[REDACTED_API_KEY]");
    }
  });

  it("14. GetProviderExecutionSnapshot returns snapshot from persistence", async () => {
    await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Retrieve Snapshot",
      sources: sampleSources,
      correlationId: "corr-retrieve-snap",
    });

    const retrieved = await service.getProviderExecutionSnapshot({
      correlationId: "corr-retrieve-snap",
    });

    expect(retrieved?.correlationId).toBe("corr-retrieve-snap");
    expect(retrieved?.providerId).toBe("notebooklm-enterprise");
  });

  it("15. GetProviderExecutionSnapshot returns null when correlationId not found", async () => {
    const retrieved = await service.getProviderExecutionSnapshot({
      correlationId: "corr-not-existing",
    });

    expect(retrieved).toBeNull();
  });

  it("16. Existing service methods remain functional and unaffected (smoke test)", async () => {
    // getOrCreateSessionForTopic
    const session = await service.getOrCreateSessionForTopic("topic-bat-nha-01");
    expect(session).toBeDefined();

    // packageSources
    mockPrisma.sourcePackage.create.mockResolvedValueOnce({ id: "pkg-1", version: 1 });
    const pkg = await service.packageSources("session-test-01", "# Markdown Source Content", 1);
    expect(pkg).toBeDefined();

    // saveTaskPrompt
    mockPrisma.taskPrompt.create.mockResolvedValueOnce({ id: "pmt-1", version: 1 });
    const pmt = await service.saveTaskPrompt(
      "session-test-01",
      "study_guide",
      "Prompt content"
    );
    expect(pmt).toBeDefined();
  });

  it("17. No direct route or UI wiring side effects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "No Side Effects",
      sources: sampleSources,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("18. Operates without any database schema migration requirement", async () => {
    // Uses only existing status field and eventData Json field
    const result = await service.startProviderResearchForSession({
      sessionId: "session-test-01",
      workspaceTitle: "Zero Migration Compatibility",
      sources: sampleSources,
    });

    expect(result.sessionId).toBe("session-test-01");
  });
});
