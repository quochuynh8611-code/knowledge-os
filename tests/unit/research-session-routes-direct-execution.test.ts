/**
 * Research Session Routes - Direct Live Execution Endpoint Unit Tests
 * (Phase 2 Validation Suite: POST /api/research-sessions/:sessionId/execute-live)
 *
 * Validates:
 * 1. Gating Semantics: 403 Forbidden when NOTEBOOKLM_DIRECT_EXECUTION is disabled/unset
 * 2. Route Validation: 404 when session does not exist, 503 when orchestrator unavailable
 * 3. Successful Live Execution: 200 OK with GroundedArtifact creation & ephemeral cleanup verification
 * 4. Error Propagation: Maps ProviderException codes accurately to HTTP status codes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createResearchSessionRouter } from "../../src/server/routes/researchSessionRoutes";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ResearchOrchestrator } from "../../src/server/services/providers/researchOrchestrator";
import { ProviderException } from "../../src/server/services/providers/errors";

describe("RESEARCH SESSION ROUTES — DIRECT LIVE EXECUTION ENDPOINT (PHASE 2)", () => {
  let mockPrisma: any;
  let mockSessionService: Partial<ResearchSessionService>;
  let mockOrchestrator: Partial<ResearchOrchestrator>;
  let app: express.Express;

  const validSessionId = "session-test-01";
  const validTopicId = "topic-test-01";

  const sampleSession = {
    id: validSessionId,
    topicId: validTopicId,
    status: "idle",
    notebookUrl: null,
    notebookId: null,
    topic: { id: validTopicId, title: "Kỳ Môn Độn Giáp Toàn Thư" },
    sourcePackages: [
      {
        id: "pkg-01",
        version: 1,
        content: "Nội dung tài liệu nguồn về Bát Môn và Cửu Tinh...",
        contentHash: "hash-pkg-01",
      },
    ],
    taskPrompts: [
      {
        id: "prompt-01",
        promptText: "Trình bày cấu trúc Tam Điệp và Bát Môn",
      },
    ],
    artifacts: [],
    timelineEvents: [],
  };

  const sampleDirectResult = {
    providerId: "notebooklm-enterprise",
    workspaceId: "ws-temp-789",
    answer: "# Bản Khảo Cứu Chuyên Sâu\n\nNội dung được NotebookLM đúc kết từ tài liệu...",
    citedSourceIds: ["src-01"],
    citations: { "1": "src-01" },
    references: [
      {
        sourceId: "src-01",
        citationNumber: 1,
        citedText: "Trích đoạn thực tế",
        sourceTitle: "Kỳ Môn Độn Giáp Toàn Thư",
      },
    ],
    cleanupStatus: "CLEANED" as const,
    attemptRecords: [
      {
        attemptId: "att-01",
        providerId: "notebooklm-enterprise",
        status: "COMPLETED" as const,
        startedAt: "2026-10-15T12:00:00.000Z",
      },
    ],
  };

  beforeEach(() => {
    delete process.env.NOTEBOOKLM_DIRECT_EXECUTION;

    mockPrisma = {
      researchSession: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === validSessionId) {
            return sampleSession;
          }
          return null;
        }),
      },
      groundedArtifact: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          return {
            id: "art-saved-123",
            ...data,
          };
        }),
      },
      researchTimelineEvent: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          return {
            id: "evt-saved-123",
            ...data,
          };
        }),
      },
      artifactCitation: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          return {
            id: "cite-saved-123",
            ...data,
          };
        }),
      },
    };

    mockSessionService = {
      getSessionById: vi.fn().mockImplementation(async (id: string) => {
        if (id === validSessionId) {
          return sampleSession;
        }
        return null;
      }),
    };

    mockOrchestrator = {
      executeDirectResearch: vi.fn().mockResolvedValue(sampleDirectResult),
    };
  });

  afterEach(() => {
    delete process.env.NOTEBOOKLM_DIRECT_EXECUTION;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. GATING SEMANTICS
  // =========================================================================
  describe("Gating Semantics (Fail-Closed by Default)", () => {
    it("returns 403 Forbidden when NOTEBOOKLM_DIRECT_EXECUTION is unset", async () => {
      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          researchOrchestrator: mockOrchestrator as any,
        })
      );

      const res = await request(app)
        .post(`/api/research-sessions/${validSessionId}/execute-live`)
        .send({ promptArtifactType: "study_guide" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("DIRECT_EXECUTION_DISABLED");
      expect(mockOrchestrator.executeDirectResearch).not.toHaveBeenCalled();
    });

    it("returns 403 Forbidden when directExecutionGating.isEnabled returns false", async () => {
      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          researchOrchestrator: mockOrchestrator as any,
          directExecutionGating: { isEnabled: () => false },
        })
      );

      const res = await request(app)
        .post(`/api/research-sessions/${validSessionId}/execute-live`)
        .send({ promptArtifactType: "study_guide" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("DIRECT_EXECUTION_DISABLED");
      expect(mockOrchestrator.executeDirectResearch).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. VALIDATION & ERROR GUARDS
  // =========================================================================
  describe("Validation & Missing Resource Guards (When Gating is Enabled)", () => {
    it("returns 404 when research session does not exist", async () => {
      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          researchOrchestrator: mockOrchestrator as any,
          directExecutionGating: { isEnabled: () => true },
        })
      );

      const res = await request(app)
        .post("/api/research-sessions/non-existent-session/execute-live")
        .send({ promptArtifactType: "study_guide" });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain("không tồn tại");
    });

    it("returns 503 when researchOrchestrator is not injected", async () => {
      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          directExecutionGating: { isEnabled: () => true },
        })
      );

      const res = await request(app)
        .post(`/api/research-sessions/${validSessionId}/execute-live`)
        .send({ promptArtifactType: "study_guide" });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("ORCHESTRATOR_UNAVAILABLE");
    });
  });

  // =========================================================================
  // 3. SUCCESSFUL LIVE EXECUTION
  // =========================================================================
  describe("Successful Live Execution Flow (When Gated ON)", () => {
    it("executes live research, persists GroundedArtifact, and returns 200 with result payload", async () => {
      process.env.NOTEBOOKLM_DIRECT_EXECUTION = "true";

      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          researchOrchestrator: mockOrchestrator as any,
        })
      );

      const res = await request(app)
        .post(`/api/research-sessions/${validSessionId}/execute-live`)
        .send({
          promptArtifactType: "study_guide",
          customInstructions: "Phân tích trọng tâm Tam Điệp",
          ephemeralWorkspace: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe(validSessionId);
      expect(res.body.artifactId).toBe("art-saved-123");
      expect(res.body.artifactType).toBe("study_guide");
      expect(res.body.content).toBe(sampleDirectResult.answer);
      expect(res.body.citedSourceIds).toEqual(["src-01"]);
      expect(res.body.citations).toEqual({ "1": "src-01" });
      expect(res.body.references).toHaveLength(1);
      expect(res.body.references[0].sourceId).toBe("src-01");
      expect(res.body.cleanupStatus).toBe("CLEANED");
      expect(typeof res.body.executionDurationMs).toBe("number");

      // Verify orchestrator call parameters
      expect(mockOrchestrator.executeDirectResearch).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceTitle: "[RESEARCH-LIVE] Kỳ Môn Độn Giáp Toàn Thư",
          queryPrompt: "Phân tích trọng tâm Tam Điệp",
          ephemeralWorkspace: true,
        })
      );

      // Verify GroundedArtifact database persistence
      expect(mockPrisma.groundedArtifact.create).toHaveBeenCalledTimes(1);
      const dbCreateCall = mockPrisma.groundedArtifact.create.mock.calls[0][0];
      expect(dbCreateCall.data.sessionId).toBe(validSessionId);
      expect(dbCreateCall.data.topicId).toBe(validTopicId);
      expect(dbCreateCall.data.artifactType).toBe("study_guide");
      expect(dbCreateCall.data.rawContent).toBe(sampleDirectResult.answer);
      expect(dbCreateCall.data.status).toBe("received");
      expect(dbCreateCall.data.metadata.citations).toEqual({ "1": "src-01" });
      expect(dbCreateCall.data.metadata.references).toHaveLength(1);

      // Verify ArtifactCitation records created
      expect(mockPrisma.artifactCitation.create).toHaveBeenCalledTimes(1);
      const citeCreateCall = mockPrisma.artifactCitation.create.mock.calls[0][0];
      expect(citeCreateCall.data.artifactId).toBe("art-saved-123");
      expect(citeCreateCall.data.markerIndex).toBe(1);
      expect(citeCreateCall.data.sourceTitle).toBe("Kỳ Môn Độn Giáp Toàn Thư");
      expect(citeCreateCall.data.quote).toBe("Trích đoạn thực tế");
    });
  });

  // =========================================================================
  // 4. ERROR TRANSLATION (PROVIDER EXCEPTION)
  // =========================================================================
  describe("Provider Error Translation", () => {
    it("maps PROVIDER_TIMEOUT to HTTP 503", async () => {
      mockOrchestrator.executeDirectResearch = vi.fn().mockRejectedValue(
        new ProviderException(
          "PROVIDER_TIMEOUT",
          "NotebookLM inference timed out after 60000ms",
          "corr-test-01",
          "notebooklm-enterprise",
          true
        )
      );

      app = express();
      app.use(express.json());
      app.use(
        "/api",
        createResearchSessionRouter(mockPrisma, {
          sessionService: mockSessionService as any,
          researchOrchestrator: mockOrchestrator as any,
          directExecutionGating: { isEnabled: () => true },
        })
      );

      const res = await request(app)
        .post(`/api/research-sessions/${validSessionId}/execute-live`)
        .send({ promptArtifactType: "study_guide" });

      expect(res.status).toBe(503);
      expect(res.body.error).toContain("timed out");
    });
  });
});
