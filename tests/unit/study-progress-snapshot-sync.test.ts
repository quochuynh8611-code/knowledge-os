import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createStudyProgressRouter } from "../../src/server/routes/studyProgressRoutes";

describe("Phase P1.5 — Study Progress Snapshot Persistence Contract", () => {
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      studyProgress: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sp-top-1",
          topicId: "top-1",
          status: "in_progress",
          progress: 25,
          repetitions: 2,
          timeSpent: 30,
          easeFactor: 2.5,
          interval: 1,
        }),
        upsert: vi.fn().mockImplementation(async ({ update }) => ({
          id: "sp-top-1",
          topicId: "top-1",
          status: "in_progress",
          progress: 50,
          repetitions: update.repetitions,
          timeSpent: update.timeSpent,
          easeFactor: 2.5,
          interval: 6,
        })),
      },
      knowledgeProgressSnapshot: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: data.id || "snap-new-1",
          topicId: data.topicId,
          capturedAt: data.capturedAt || new Date().toISOString(),
          progressData: data.progressData,
          triggerReason: data.triggerReason,
        })),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "snap-2",
            topicId: "top-1",
            capturedAt: "2026-08-28T10:00:00.000Z",
            progressData: { progress: 50, repetitions: 3 },
            triggerReason: "review_completed",
          },
          {
            id: "snap-1",
            topicId: "top-1",
            capturedAt: "2026-08-27T10:00:00.000Z",
            progressData: { progress: 25, repetitions: 2 },
            triggerReason: "session_complete",
          },
        ]),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createStudyProgressRouter(mockPrisma));
  });

  // ─── 1. POST /api/study-progress creates snapshot in transaction ───────────

  describe("1. Transactional Progress Snapshot Appending", () => {
    it("1.1. POST /study-progress wraps upsert and snapshot creation in a $transaction", async () => {
      const response = await request(app)
        .post("/api/study-progress")
        .send({
          topicId: "top-1",
          quality: 4,
          triggerReason: "review_completed",
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(mockPrisma.studyProgress.upsert).toHaveBeenCalledOnce();
      expect(mockPrisma.knowledgeProgressSnapshot.create).toHaveBeenCalledOnce();

      const createCall = mockPrisma.knowledgeProgressSnapshot.create.mock.calls[0][0];
      expect(createCall.data.topicId).toBe("top-1");
      expect(createCall.data.triggerReason).toBe("review_completed");
      expect(createCall.data.progressData).toBeDefined();
      expect(createCall.data.progressData.topicId).toBe("top-1");
    });

    it("1.2. POST /study-progress persists custom triggerReason", async () => {
      await request(app)
        .post("/api/study-progress")
        .send({
          topicId: "top-1",
          quality: 5,
          triggerReason: "milestone_achieved",
        });

      expect(mockPrisma.knowledgeProgressSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            topicId: "top-1",
            triggerReason: "milestone_achieved",
          }),
        })
      );
    });

    it("1.3. Multiple POST requests append distinct snapshots (append-only verification)", async () => {
      await request(app)
        .post("/api/study-progress")
        .send({ topicId: "top-1", quality: 4 });

      await request(app)
        .post("/api/study-progress")
        .send({ topicId: "top-1", quality: 5 });

      expect(mockPrisma.knowledgeProgressSnapshot.create).toHaveBeenCalledTimes(2);
    });
  });

  // ─── 2. GET /api/study-progress/:topicId/snapshots ─────────────────────────

  describe("2. GET /study-progress/:topicId/snapshots History Query", () => {
    it("2.1. GET /study-progress/:topicId/snapshots returns snapshot history in descending order", async () => {
      const response = await request(app).get("/api/study-progress/top-1/snapshots");

      expect(response.status).toBe(200);
      expect(mockPrisma.knowledgeProgressSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { topicId: "top-1" },
          orderBy: { capturedAt: "desc" },
        })
      );
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe("snap-2");
      expect(response.body[0].triggerReason).toBe("review_completed");
      expect(response.body[0].progressData).toEqual({ progress: 50, repetitions: 3 });
    });
  });

  // ─── 3. Rollback on Snapshot Failure ──────────────────────────────────────

  describe("3. Transaction Rollback on Snapshot Failure", () => {
    it("3.1. Rolls back transaction and returns 500 when snapshot write fails", async () => {
      mockPrisma.knowledgeProgressSnapshot.create.mockRejectedValue(
        new Error("Database snapshot disk full")
      );

      const response = await request(app)
        .post("/api/study-progress")
        .send({
          topicId: "top-1",
          quality: 4,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Database snapshot disk full");
    });
  });
});
