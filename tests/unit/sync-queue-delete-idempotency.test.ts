import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createCategoryRouter } from "../../src/server/routes/categoryRoutes";
import { createResourceRouter } from "../../src/server/routes/resourceRoutes";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { SyncQueueService } from "../../src/services/syncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";
import { renderHook } from "@testing-library/react";
import { useSyncQueue } from "../../src/hooks/useSyncQueue";

describe("Sync Queue DELETE Incident — Idempotency & Fault Isolation (Phase A)", () => {
  // ─── 1. Server-Side Route Idempotency on Non-Existent Entities ─────────────

  describe("1. Server-Side DELETE Route Idempotency (P2025 Not Found Handling)", () => {
    // [Phase B2B Pending Approval] Category DELETE P2025 Idempotency
    it.skip("1.1. [Phase B2B] DELETE /api/categories/:id phản hồi 200 idempotent khi Category đã bị xóa trước đó (Prisma P2025)", async () => {
      const p2025Error: any = new Error(
        "An operation failed because it depends on one or more records that were required but not found."
      );
      p2025Error.code = "P2025";

      const mockPrisma: any = {
        category: {
          delete: vi.fn().mockRejectedValue(p2025Error),
        },
      };

      const app = express();
      app.use("/api", createCategoryRouter(mockPrisma));

      const res = await request(app).delete("/api/categories/cat-already-deleted");
      // Mong đợi: 200 OK idempotent (hoặc 204), KHÔNG ĐƯỢC trả về 500 Internal Server Error
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        id: "cat-already-deleted",
        alreadyDeleted: true,
      });
    });

    it("1.2. DELETE /api/resources/:id phản hồi 200 idempotent khi Resource không tồn tại (Prisma P2025)", async () => {
      const p2025Error: any = new Error("Record not found for delete");
      p2025Error.code = "P2025";

      const mockPrisma: any = {
        resource: {
          delete: vi.fn().mockRejectedValue(p2025Error),
        },
      };

      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).delete("/api/resources/res-already-deleted");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        id: "res-already-deleted",
        alreadyDeleted: true,
      });
    });

    it("1.2b. DELETE /api/resources/:id phản hồi 500 khi gặp lỗi DB khác (không phải P2025)", async () => {
      const dbError = new Error("Database connection lost");

      const mockPrisma: any = {
        resource: {
          delete: vi.fn().mockRejectedValue(dbError),
        },
      };

      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).delete("/api/resources/res-123");
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        error: "Database connection lost",
      });
    });

    it("1.2c. DELETE /api/resources/:id phản hồi 200 khi xóa thành công trong điều kiện bình thường", async () => {
      const mockPrisma: any = {
        resource: {
          delete: vi.fn().mockResolvedValue({ id: "res-normal" }),
        },
      };

      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).delete("/api/resources/res-normal");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        id: "res-normal",
      });
    });

    it("1.2d. DELETE /api/resources/:id phản hồi 500 khi gặp lỗi Foreign Key constraint (Prisma P2003 Negative Test)", async () => {
      const p2003Error: any = new Error(
        "Foreign key constraint failed on the field: `Resource_topicId_fkey (index)`"
      );
      p2003Error.code = "P2003";

      const mockPrisma: any = {
        resource: {
          delete: vi.fn().mockRejectedValue(p2003Error),
        },
      };

      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).delete("/api/resources/res-fk-fail");
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        error: expect.stringContaining("Foreign key constraint failed"),
      });
      expect(res.body).not.toHaveProperty("alreadyDeleted");
      expect(res.body).not.toHaveProperty("success");
    });

    // [Phase B2C Pending Approval] Note DELETE P2025 Idempotency
    it.skip("1.3. [Phase B2C] DELETE /api/notes/:id phản hồi 200 idempotent khi Note không tồn tại (Prisma P2025)", async () => {
      const p2025Error: any = new Error("Record not found for delete");
      p2025Error.code = "P2025";

      const mockPrisma: any = {
        note: {
          delete: vi.fn().mockRejectedValue(p2025Error),
        },
        $transaction: vi.fn().mockImplementation(async (cb) => cb(mockPrisma)),
      };

      const app = express();
      app.use("/api", createNoteRouter(mockPrisma));

      const res = await request(app).delete("/api/notes/note-already-deleted");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        id: "note-already-deleted",
        alreadyDeleted: true,
      });
    });

    // [Phase B2C Pending Approval] Topic DELETE P2025 Idempotency
    it.skip("1.4. [Phase B2C] DELETE /api/topics/:id phản hồi 200 idempotent khi Topic không tồn tại (Prisma P2025)", async () => {
      const p2025Error: any = new Error("Topic not found for delete");
      p2025Error.code = "P2025";

      const mockPrisma: any = {
        topic: {
          delete: vi.fn().mockRejectedValue(p2025Error),
        },
      };

      const app = express();
      app.use("/api", createTopicRouter(mockPrisma));

      const res = await request(app).delete("/api/topics/topic-already-deleted");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        id: "topic-already-deleted",
        alreadyDeleted: true,
      });
    });
  });

  // ─── 2. Client-Side SyncQueue Idempotent Resolution on 404 / 410 ───────────

  describe("2. Client SyncQueue Replay: 404/410 Treated as Successful Deletion", () => {
    const STORAGE_KEY = "test_sync_delete_idempotency_queue";
    let syncService: SyncQueueService;

    beforeEach(() => {
      localStorage.clear();
      syncService = new SyncQueueService(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("2.1. tự động gỡ bỏ mutation DELETE category khi server phản hồi HTTP 404 (Not Found)", async () => {
      const deleteMutation: SyncMutation = {
        id: "mut-del-cat-legacy",
        entityType: "category",
        action: "delete",
        entityId: "cat-root-kinh-te",
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      };

      syncService.enqueue(deleteMutation);
      expect(syncService.getQueue()).toHaveLength(1);

      // Server trả về 404 Not Found (đã bị xóa sạch trước đó)
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Category not found" }),
      });

      const result = await syncService.flushQueue("/api");

      // Với thao tác DELETE, 404 chứng minh thực thể đã không còn -> Xem là đồng bộ thành công
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(syncService.getQueue()).toHaveLength(0);
    });

    it("2.2. tự động gỡ bỏ mutation DELETE topic khi server phản hồi HTTP 404 (Not Found)", async () => {
      const deleteMutation: SyncMutation = {
        id: "mut-del-top-1",
        entityType: "topic",
        action: "delete",
        entityId: "topic-legacy-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      };

      syncService.enqueue(deleteMutation);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: "Topic not found" }),
      });

      const result = await syncService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(syncService.getQueue()).toHaveLength(0);
    });

    it("2.3. tự động gỡ bỏ mutation DELETE resource khi server phản hồi HTTP 410 (Gone)", async () => {
      const deleteMutation: SyncMutation = {
        id: "mut-del-res-1",
        entityType: "resource",
        action: "delete",
        entityId: "res-gone-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      };

      syncService.enqueue(deleteMutation);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 410,
        json: async () => ({ error: "Resource permanently gone" }),
      });

      const result = await syncService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(syncService.getQueue()).toHaveLength(0);
    });
  });

  // ─── 3. FIFO Non-Blocking Contract on DELETE Failures ──────────────────────

  describe("3. FIFO Pipeline Continuity: Failed DELETE Does Not Block Subsequent Valid SAVEs", () => {
    const STORAGE_KEY = "test_sync_fifo_continuity";
    let syncService: SyncQueueService;

    beforeEach(() => {
      localStorage.clear();
      syncService = new SyncQueueService(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("3.1. replay tiếp tục xử lý mutation SAVE hợp lệ phía sau khi mutation DELETE phía trước bị lỗi vĩnh viễn (4xx/Permanent)", async () => {
      syncService.enqueue({
        id: "mut-del-fail",
        entityType: "category",
        action: "delete",
        entityId: "cat-bad-id",
        clientTimestamp: new Date(Date.now() - 2000).toISOString(),
        retryCount: 0,
        status: "pending",
      });

      syncService.enqueue({
        id: "mut-save-valid",
        entityType: "topic",
        action: "save",
        entityId: "top-valid-1",
        payload: { title: "Chủ đề mới" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/categories/cat-bad-id")) {
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: "Bad Request" }),
          };
        }
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true }),
        };
      });

      const result = await syncService.flushQueue("/api");
      // Mutation DELETE bị lỗi 400 (permanent) không được chặn mutation SAVE phía sau
      expect(result.syncedCount).toBe(1); // mut-save-valid thành công
      expect(result.failedCount).toBe(1); // mut-del-fail được ghi nhận lỗi
      const remainingQueue = syncService.getQueue();
      expect(remainingQueue.some((m) => m.id === "mut-save-valid")).toBe(false);
    });
  });

  // ─── 4. UI Metric Discrepancy (Header vs Popover Count Alignment) ──────────

  describe("4. useSyncQueue Hook Metric Alignment: Counting 'exhausted' in failedCount", () => {
    const STORAGE_KEY = "test_ui_metric_alignment";
    let syncService: SyncQueueService;

    beforeEach(() => {
      localStorage.clear();
      syncService = new SyncQueueService(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("4.1. tính chính xác failedCount = 1 khi mutation ở trạng thái 'exhausted' (Terminal Failure)", () => {
      const exhaustedMutation: SyncMutation = {
        id: "mut-exhausted-1",
        entityType: "category",
        action: "delete",
        entityId: "cat-broken",
        clientTimestamp: new Date().toISOString(),
        retryCount: 5,
        status: "exhausted",
        isPermanent: true,
        lastError: "Prisma delete failed",
      };

      syncService.enqueue(exhaustedMutation);

      const { result } = renderHook(() => useSyncQueue(syncService));

      // Popover render isFailed = mutation.status === 'failed' || mutation.status === 'exhausted'
      // Header failedCount phải đếm cả exhausted để KHÔNG BỊ lệch pha '0 lỗi'
      expect(result.current.failedCount).toBe(1);
      expect(result.current.pendingCount).toBe(0);
    });

    it("4.2. tính tổng failedCount gồm cả mutations 'failed' và 'exhausted'", () => {
      syncService.enqueue({
        id: "mut-failed",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        payload: { title: "Topic 1" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 1,
        status: "failed",
      });

      syncService.enqueue({
        id: "mut-exhausted",
        entityType: "category",
        action: "delete",
        entityId: "cat-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 5,
        status: "exhausted",
      });

      const { result } = renderHook(() => useSyncQueue(syncService));

      expect(result.current.failedCount).toBe(2);
      expect(result.current.pendingCount).toBe(0);
    });
  });
});
