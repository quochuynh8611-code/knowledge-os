import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";

describe("Sync Routes Contract", () => {
  it("1. POST /sync/hydrate trả về summary có sẵn khi session đã completed (Idempotency)", async () => {
    const mockPrisma: any = {
      syncSession: {
        findUnique: vi.fn().mockResolvedValue({
          clientSyncId: "session-123",
          status: "completed",
          processedAt: new Date("2026-08-27T10:00:00Z"),
          summary: {
            categoriesUpserted: 2,
            topicsUpserted: 5,
            notesUpserted: 10,
            resourcesUpserted: 3,
            tagsUpserted: 4,
            linksUpserted: 0,
            progressMerged: 1,
          },
        }),
      },
      $transaction: vi.fn(),
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send({
        clientSyncId: "session-123",
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [],
        tags: [],
        topics: [],
        notes: [],
        resources: [],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.clientSyncId).toBe("session-123");
    expect(response.body.summary.topicsUpserted).toBe(5);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("2. POST /sync/hydrate thực hiện transaction upsert toàn bộ payload khi session mới", async () => {
    const mockTx: any = {
      category: { upsert: vi.fn().mockResolvedValue({}) },
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: { upsert: vi.fn().mockResolvedValue({}) },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
      note: { upsert: vi.fn().mockResolvedValue({}) },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
      syncSession: { create: vi.fn().mockResolvedValue({}) },
    };

    const mockPrisma: any = {
      syncSession: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send({
        clientSyncId: "session-new-456",
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [
          {
            id: "cat-1",
            name: "Phật Học",
            slug: "phat-hoc",
            type: "phat-hoc",
          },
        ],
        tags: [
          {
            id: "tag-1",
            name: "Thực Hành",
            slug: "thuc-hanh",
          },
        ],
        topics: [
          {
            id: "top-1",
            title: "Tứ Diệu Đế",
            slug: "tu-dieu-de",
            categoryId: "cat-1",
            type: "phat-hoc",
            studyProgress: {
              topicId: "top-1",
              status: "in_progress",
              progress: 20,
              interval: 1,
              easeFactor: 2.5,
              repetitions: 1,
              totalNotes: 2,
              timeSpent: 15,
            },
          },
        ],
        notes: [
          {
            id: "note-1",
            topicId: "top-1",
            title: "Ghi chú 1",
            content: "Nội dung 1",
          },
        ],
        resources: [
          {
            id: "res-1",
            topicId: "top-1",
            title: "Tài liệu 1",
            type: "book",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.clientSyncId).toBe("session-new-456");
    expect(response.body.summary).toEqual({
      categoriesUpserted: 1,
      topicsUpserted: 1,
      notesUpserted: 1,
      resourcesUpserted: 1,
      tagsUpserted: 1,
      linksUpserted: 0,
      progressMerged: 1,
    });
    expect(mockTx.category.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.tag.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.topic.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.studyProgress.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.note.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.resource.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.syncSession.create).toHaveBeenCalledTimes(1);
  });

  it("3. POST /sync/hydrate trả về 400 khi thiếu clientSyncId", async () => {
    const mockPrisma: any = {};
    const app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send({
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
