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

  it("2. POST /sync/hydrate updates existing categories and topics during routine sync without creating unknown categories", async () => {
    const mockTx: any = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", slug: "phat-hoc", name: "Phật Học" },
        ]),
        update: vi.fn().mockResolvedValue({ id: "cat-1", slug: "phat-hoc" }),
        upsert: vi.fn().mockResolvedValue({ id: "cat-1", slug: "phat-hoc" }),
      },
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: {
        findMany: vi.fn().mockResolvedValue([
          { id: "top-1", slug: "tu-dieu-de", categoryId: "cat-1" },
        ]),
        update: vi.fn().mockResolvedValue({ id: "top-1" }),
        upsert: vi.fn().mockResolvedValue({ id: "top-1" }),
      },
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
        clientSyncId: "session-routine-sync-1",
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [
          {
            id: "cat-1",
            name: "Phật Học Cập Nhật",
            slug: "phat-hoc",
            type: "phat-hoc",
          },
          {
            id: "cat-legacy-stale",
            name: "Kinh Tế Cũ",
            slug: "kinh-te-cu",
            type: "kinh-te",
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
          {
            id: "top-legacy-stale",
            title: "Chủ đề cũ không tồn tại",
            slug: "chu-de-cu",
            categoryId: "cat-1",
            type: "phat-hoc",
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
    // Only existing category cat-1 was updated, cat-legacy-stale was ignored
    expect(response.body.summary.categoriesUpserted).toBe(1);
    // Only existing topic top-1 was updated, top-legacy-stale was ignored
    expect(response.body.summary.topicsUpserted).toBe(1);
  });

  it("3. POST /sync/hydrate allows creating categories and topics when forceOverwrite is true (Restore/Import Flow)", async () => {
    const mockTx: any = {
      category: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: "cat-new", slug: "triet-hoc" }),
      },
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({ id: "top-new", slug: "dao-duc-hoc" }),
      },
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
        clientSyncId: "session-restore-explicit",
        forceOverwrite: true,
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [
          {
            id: "cat-new",
            name: "Triết Học",
            slug: "triet-hoc",
            type: "triet-hoc",
          },
        ],
        tags: [],
        topics: [
          {
            id: "top-new",
            title: "Đạo Đức Học",
            slug: "dao-duc-hoc",
            categoryId: "cat-new",
            type: "triet-hoc",
          },
        ],
        notes: [],
        resources: [],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockTx.category.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.topic.upsert).toHaveBeenCalledTimes(1);
  });

  it("4. POST /sync/hydrate trả về 400 khi thiếu clientSyncId", async () => {
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

  it("5. POST /sync/hydrate tự động map category slug sang DB category id khi topic dùng slug", async () => {
    const mockTx: any = {
      category: {
        findMany: vi.fn().mockResolvedValue([{ id: "db-cat-uuid-1", slug: "phat-hoc" }]),
        update: vi.fn().mockResolvedValue({ id: "db-cat-uuid-1", slug: "phat-hoc" }),
        upsert: vi.fn().mockResolvedValue({ id: "db-cat-uuid-1", slug: "phat-hoc" }),
      },
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: {
        findMany: vi.fn().mockResolvedValue([{ id: "top-1", slug: "chu-de-1" }]),
        update: vi.fn().mockResolvedValue({ id: "top-1" }),
        upsert: vi.fn().mockResolvedValue({ id: "top-1" }),
      },
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
        clientSyncId: "session-slug-resolve",
        clientTimestamp: "2026-08-27T10:00:00Z",
        categories: [
          {
            id: "client-custom-id",
            name: "Phật Học",
            slug: "phat-hoc",
            type: "phat-hoc",
          },
        ],
        tags: [],
        topics: [
          {
            id: "top-1",
            title: "Chủ đề 1",
            slug: "chu-de-1",
            categoryId: "phat-hoc", // Dùng slug thay vì id
            type: "phat-hoc",
          },
        ],
        notes: [],
        resources: [],
      });

    expect(response.status).toBe(200);
    expect(mockTx.topic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "db-cat-uuid-1",
        }),
      })
    );
  });
});
