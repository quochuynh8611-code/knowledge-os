import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { SyncQueueService } from "../../src/services/syncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Topic Routes — Idempotent Replay & Error Handling", () => {
  // ─── 1. Idempotent POST /topics ──────────────────────────────────────────

  describe("1. Idempotent Replay & Creation", () => {
    it("1.1. tạo mới topic khi ID và Slug chưa tồn tại (HTTP 201)", async () => {
      const mockPrisma: any = {
        category: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cat-tam-thuc",
            slug: "tam-thuc",
            name: "Tam Thức",
            type: "huyen-hoc",
          }),
        },
        topic: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(async ({ data }) => ({
            id: data.id || "generated-id",
            ...data,
          })),
        },
        tag: {
          upsert: vi.fn().mockImplementation(async ({ create }) => ({
            id: create.id,
            ...create,
          })),
        },
        topicTag: {
          findMany: vi.fn().mockResolvedValue([]),
          upsert: vi.fn().mockResolvedValue({}),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };

      const app = express();
      app.use(express.json());
      app.use("/api", createTopicRouter(mockPrisma));

      const res = await request(app)
        .post("/api/topics")
        .send({
          id: "topic-thai-at-than-kinh",
          title: "Thái Ất Thần Kinh",
          slug: "thai-at-than-kinh",
          categoryId: "cat-tam-thuc",
          type: "huyen-hoc",
          tags: ["Tam Thức"],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("topic-thai-at-than-kinh");
      expect(mockPrisma.topic.create).toHaveBeenCalled();
    });

    it("1.2. cập nhật an toàn (idempotent update) khi topic cùng ID đã tồn tại trong DB (HTTP 200)", async () => {
      const existingTopic = {
        id: "topic-thai-at-than-kinh",
        title: "Thái Ất Thần Kinh (Bản cũ)",
        slug: "thai-at-than-kinh",
        categoryId: "cat-tam-thuc",
        type: "huyen-hoc",
        description: "Mô tả cũ",
        content: "Nội dung cũ",
        tags: ["Tam Thức"],
      };

      const mockPrisma: any = {
        category: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cat-tam-thuc",
            slug: "tam-thuc",
            name: "Tam Thức",
            type: "huyen-hoc",
          }),
        },
        topic: {
          findUnique: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === "topic-thai-at-than-kinh" || where.slug === "thai-at-than-kinh") {
              return existingTopic;
            }
            return null;
          }),
          update: vi.fn().mockImplementation(async ({ where, data }) => ({
            ...existingTopic,
            ...data,
            id: where.id,
          })),
          create: vi.fn(),
        },
        tag: {
          upsert: vi.fn().mockImplementation(async ({ create }) => ({
            id: create.id,
            ...create,
          })),
        },
        topicTag: {
          findMany: vi.fn().mockResolvedValue([]),
          upsert: vi.fn().mockResolvedValue({}),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };

      const app = express();
      app.use(express.json());
      app.use("/api", createTopicRouter(mockPrisma));

      const res = await request(app)
        .post("/api/topics")
        .send({
          id: "topic-thai-at-than-kinh",
          title: "Thái Ất Thần Kinh (Đã cập nhật)",
          slug: "thai-at-than-kinh",
          categoryId: "cat-tam-thuc",
          type: "huyen-hoc",
          description: "Mô tả mới",
          content: "Nội dung mới",
          tags: ["Tam Thức", "Dự Trắc"],
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("topic-thai-at-than-kinh");
      expect(res.body.title).toBe("Thái Ất Thần Kinh (Đã cập nhật)");
      expect(mockPrisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "topic-thai-at-than-kinh" },
          data: expect.objectContaining({
            title: "Thái Ất Thần Kinh (Đã cập nhật)",
            description: "Mô tả mới",
          }),
        })
      );
      expect(mockPrisma.topic.create).not.toHaveBeenCalled();
    });
  });

  // ─── 2. Category Validation Guard ────────────────────────────────────────

  describe("2. Category Foreign Key Validation Guard", () => {
    it("2.1. trả về HTTP 400 có cấu trúc khi categoryId không tồn tại trong DB", async () => {
      const mockPrisma: any = {
        category: {
          findUnique: vi.fn().mockResolvedValue(null), // Không tìm thấy theo id lẫn slug
        },
        topic: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };

      const app = express();
      app.use(express.json());
      app.use("/api", createTopicRouter(mockPrisma));

      const res = await request(app)
        .post("/api/topics")
        .send({
          id: "topic-test-invalid-cat",
          title: "Chủ đề thử nghiệm",
          slug: "chu-de-thu-nghiem",
          categoryId: "cat-khong-ton-tai",
          type: "general",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(mockPrisma.topic.create).not.toHaveBeenCalled();
    });
  });

  // ─── 3. Slug Collision Handling ──────────────────────────────────────────

  describe("3. Slug Collision Guard", () => {
    it("3.1. trả về HTTP 409 Conflict khi slug đã bị chiếm bởi một topic khác (khác ID)", async () => {
      const conflictingTopic = {
        id: "topic-existing-other-id",
        title: "Thái Ất Thần Kinh Khác",
        slug: "thai-at-than-kinh",
        categoryId: "cat-tam-thuc",
      };

      const mockPrisma: any = {
        category: {
          findUnique: vi.fn().mockResolvedValue({
            id: "cat-tam-thuc",
            slug: "tam-thuc",
            name: "Tam Thức",
            type: "huyen-hoc",
          }),
        },
        topic: {
          findUnique: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === "topic-new-incoming-id") return null;
            if (where.slug === "thai-at-than-kinh") return conflictingTopic;
            return null;
          }),
          create: vi.fn(),
          update: vi.fn(),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };

      const app = express();
      app.use(express.json());
      app.use("/api", createTopicRouter(mockPrisma));

      const res = await request(app)
        .post("/api/topics")
        .send({
          id: "topic-new-incoming-id",
          title: "Thái Ất Thần Kinh Trùng Slug",
          slug: "thai-at-than-kinh",
          categoryId: "cat-tam-thuc",
          type: "huyen-hoc",
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SLUG_COLLISION");
      expect(mockPrisma.topic.create).not.toHaveBeenCalled();
      expect(mockPrisma.topic.update).not.toHaveBeenCalled();
    });
  });

  // ─── 4. Client SyncQueue Error Classification ────────────────────────────

  describe("4. SyncQueue Client Error Extraction & Non-Spam Classification", () => {
    const STORAGE_KEY = "test_sync_error_classification";
    let syncService: SyncQueueService;

    beforeEach(() => {
      localStorage.clear();
      syncService = new SyncQueueService(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("4.1. trích xuất thông điệp lỗi cụ thể từ response của server khi gặp HTTP 4xx", async () => {
      const sampleMutation: SyncMutation = {
        id: "mut-err-1",
        entityType: "topic",
        action: "save",
        entityId: "topic-thai-at-than-kinh",
        payload: {
          id: "topic-thai-at-than-kinh",
          title: "Thái Ất",
          categoryId: "cat-invalid",
        },
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      };

      syncService.enqueue(sampleMutation);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Danh mục với ID 'cat-invalid' không tồn tại",
          code: "CATEGORY_NOT_FOUND",
        }),
      });

      const result = await syncService.flushQueue("/api");
      expect(result.failedCount).toBe(1);

      const queue = syncService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe("failed");
      expect(queue[0].lastError).toContain("Danh mục với ID 'cat-invalid' không tồn tại");
    });

    it("4.2. không làm mất mutation trong queue khi replay gặp lỗi", async () => {
      syncService.enqueue({
        id: "mut-fail-preserve",
        entityType: "topic",
        action: "save",
        entityId: "topic-thai-at-than-kinh",
        payload: { id: "topic-thai-at-than-kinh", title: "Thái Ất" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Database connection timed out" }),
      });

      await syncService.flushQueue("/api");

      const queue = syncService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("mut-fail-preserve");
      expect(queue[0].status).toBe("failed");
      expect(queue[0].retryCount).toBe(1);
    });
  });
});
