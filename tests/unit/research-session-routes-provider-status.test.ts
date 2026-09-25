/**
 * Research Session Routes - Provider Status Endpoint Unit Tests
 * (Phase 5.3 Test-First Validation Suite)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createResearchSessionRouter } from "../../src/server/routes/researchSessionRoutes";
import { ResearchSessionService } from "../../src/server/services/researchSessionService";
import { ProviderException } from "../../src/server/services/providers/errors";
import { ResearchExecutionSnapshot } from "../../src/server/services/providers/researchPersistencePort";

describe("RESEARCH SESSION ROUTES - PROVIDER STATUS ENDPOINT (PHASE 5.3)", () => {
  let mockPrisma: any;
  let mockSessionService: Partial<ResearchSessionService>;
  let app: express.Express;

  const validSessionId = "session-bat-nha-01";
  const validCorrelationId = "corr-bat-nha-xyz";

  const sampleSession = {
    id: validSessionId,
    topicId: "topic-bat-nha",
    status: "idle",
    notebookUrl: null,
    notebookId: null,
    sourcePackages: [],
    taskPrompts: [],
    artifacts: [],
    timelineEvents: [],
  };

  const sampleSnapshot: ResearchExecutionSnapshot = {
    correlationId: validCorrelationId,
    providerId: "notebooklm-enterprise",
    workspaceId: "workspace-bat-nha",
    sourceCount: 2,
    audioJobId: null,
    attemptRecords: [
      {
        attemptId: "att-1",
        providerId: "notebooklm-enterprise",
        status: "COMPLETED",
        startedAt: "2026-09-24T10:00:00.000Z",
      },
    ],
    terminalStatus: "COMPLETED",
    createdAt: "2026-09-24T10:00:00.000Z",
    updatedAt: "2026-09-24T10:00:05.000Z",
  };

  beforeEach(() => {
    mockPrisma = {
      researchSession: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id === validSessionId) {
            return sampleSession;
          }
          return null;
        }),
      },
    };

    mockSessionService = {
      getSessionById: vi.fn().mockImplementation(async (id: string) => {
        if (id === validSessionId) {
          return sampleSession as any;
        }
        return null;
      }),
      getProviderExecutionSnapshot: vi.fn().mockImplementation(async ({ correlationId }) => {
        if (correlationId === validCorrelationId) {
          return sampleSnapshot;
        }
        return null;
      }),
    };

    app = express();
    app.use(express.json());
    app.use(
      "/api",
      createResearchSessionRouter(mockPrisma, {
        sessionService: mockSessionService as ResearchSessionService,
      })
    );
  });

  it("1. returns 400 when correlationId query param is missing or empty", async () => {
    const resNoParam = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution`
    );
    expect(resNoParam.status).toBe(400);
    expect(resNoParam.body.error).toBeDefined();

    const resEmptyParam = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=   `
    );
    expect(resEmptyParam.status).toBe(400);
    expect(resEmptyParam.body.error).toBeDefined();
  });

  it("2. returns 404 when session does not exist", async () => {
    const res = await request(app).get(
      `/api/research-sessions/non-existent-session/provider-execution?correlationId=${validCorrelationId}`
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Phiên nghiên cứu không tồn tại");
  });

  it("3. returns 200 with snapshot null when correlationId has no snapshot", async () => {
    const res = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=unknown-correlation-id`
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sessionId: validSessionId,
      correlationId: "unknown-correlation-id",
      snapshot: null,
    });
  });

  it("4. returns 200 with snapshot payload when snapshot exists", async () => {
    const res = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );
    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(validSessionId);
    expect(res.body.correlationId).toBe(validCorrelationId);
    expect(res.body.snapshot).toBeDefined();
    expect(res.body.snapshot.workspaceId).toBe("workspace-bat-nha");
    expect(res.body.snapshot.terminalStatus).toBe("COMPLETED");
  });

  it("5. invokes ResearchSessionService.getProviderExecutionSnapshot with exact correlationId", async () => {
    await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );

    expect(mockSessionService.getProviderExecutionSnapshot).toHaveBeenCalledTimes(1);
    expect(mockSessionService.getProviderExecutionSnapshot).toHaveBeenCalledWith({
      correlationId: validCorrelationId,
    });
  });

  it("6. does not trigger orchestration or mutation methods", async () => {
    const mockStartResearch = vi.fn();
    (mockSessionService as any).startProviderResearchForSession = mockStartResearch;

    await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );

    expect(mockStartResearch).not.toHaveBeenCalled();
  });

  it("7. returns sanitized 503 when provider routing/dependency is unavailable", async () => {
    mockSessionService.getProviderExecutionSnapshot = vi
      .fn()
      .mockRejectedValue(
        new ProviderException(
          "PROVIDER_UNAVAILABLE",
          "Persistence layer unavailable with key AIzaSyFakeSecret12345678901234567890123",
          validCorrelationId,
          "notebooklm-enterprise",
          true
        )
      );

    const res = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );

    expect(res.status).toBe(503);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).not.toContain("AIzaSy");
    expect(res.body.error).toContain("[REDACTED_API_KEY]");
  });

  it("8. returns sanitized 500 on unexpected internal error", async () => {
    mockSessionService.getProviderExecutionSnapshot = vi
      .fn()
      .mockRejectedValue(
        new Error("Unexpected DB crash at /var/secrets/key.json with AIzaSyFakeSecret12345678901234567890123")
      );

    const res = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).not.toContain("AIzaSy");
  });

  it("9. preserves existing route behavior (smoke test for GET /research-sessions/:id)", async () => {
    const res = await request(app).get(`/api/research-sessions/${validSessionId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(validSessionId);
    expect(mockSessionService.getSessionById).toHaveBeenCalledWith(validSessionId);
  });

  it("10. does not expose tokens/secrets in error body", async () => {
    mockSessionService.getSessionById = vi
      .fn()
      .mockRejectedValue(new Error("Bearer secret_jwt_token_example_123456789"));

    const res = await request(app).get(
      `/api/research-sessions/${validSessionId}/provider-execution?correlationId=${validCorrelationId}`
    );

    expect(res.status).toBe(500);
    expect(res.body.error).not.toContain("secret_jwt_token");
  });
});
