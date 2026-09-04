import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";
import {
  DEFAULT_MAX_RETRY_COUNT,
  isPermanentHttpStatus,
  isMutationEligibleForReplay,
  normalizeExhaustedMutations,
  markMutationFailed,
  type SyncMutation,
} from "../../src/lib/syncQueue";
import { SyncQueueService } from "../../src/services/syncQueue";

describe("Phase P3.3 — Idempotent Note Synchronization & Bounded Retries Contract", () => {
  // ─── 1. Backend Route: Idempotent POST /notes ─────────────────────────────

  describe("1. Backend POST /notes Idempotent Replay", () => {
    let mockPrisma: any;
    let app: express.Express;

    beforeEach(() => {
      const existingNote = {
        id: "note-123",
        topicId: "top-1",
        title: "Ghi chú đã tồn tại",
        content: "Nội dung cũ",
        sourcePath: "/Vault/old.md",
        type: "insight",
        isPrivate: false,
        tags: ["Triết Học"],
        createdAt: new Date("2026-08-28T10:00:00Z"),
        updatedAt: new Date("2026-08-28T10:00:00Z"),
      };

      mockPrisma = {
        $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
          return cb(mockPrisma);
        }),
        note: {
          findUnique: vi.fn().mockImplementation(async ({ where }) => {
            if (where.id === "note-123") return existingNote;
            return null;
          }),
          create: vi.fn().mockImplementation(async ({ data }) => {
            if (data.id === "note-123") {
              const err: any = new Error("Unique constraint failed on the fields: (`id`)");
              err.code = "P2002";
              throw err;
            }
            return {
              ...data,
              id: data.id || "note-new-generated",
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
          update: vi.fn().mockImplementation(async ({ where, data }) => ({
            ...existingNote,
            ...data,
            id: where.id,
            updatedAt: new Date(),
          })),
        },
        noteTopicLink: {
          findMany: vi.fn().mockResolvedValue([{ topicId: "top-1" }]),
          upsert: vi.fn().mockResolvedValue({ id: "link-1" }),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      app = express();
      app.use(express.json());
      app.use("/api", createNoteRouter(mockPrisma));
    });

    it("1.1. Replay POST /notes với cùng client-provided ID đã tồn tại xử lý thành công (idempotent 200/201) không sập 500 P2002", async () => {
      const response = await request(app)
        .post("/api/notes")
        .send({
          id: "note-123",
          title: "Ghi chú cập nhật nội dung",
          content: "Nội dung mới",
          topicId: "top-1",
          topicIds: ["top-1"],
          type: "insight",
        });

      // Server must handle existing id idempotently and NOT return 500
      expect([200, 201]).toContain(response.status);
      expect(response.body.id).toBe("note-123");
      expect(response.body.title).toBe("Ghi chú cập nhật nội dung");
    });
  });

  // ─── 2. Pure Helper: Permanent Error Classification ───────────────────────

  describe("2. Pure Helper: Error Classification & Retry Eligibility", () => {
    it("2.1. isPermanentHttpStatus classifies 400, 401, 403, 404, 409, 422 as permanent", () => {
      expect(isPermanentHttpStatus(400)).toBe(true);
      expect(isPermanentHttpStatus(401)).toBe(true);
      expect(isPermanentHttpStatus(403)).toBe(true);
      expect(isPermanentHttpStatus(404)).toBe(true);
      expect(isPermanentHttpStatus(409)).toBe(true);
      expect(isPermanentHttpStatus(422)).toBe(true);

      expect(isPermanentHttpStatus(408)).toBe(false); // Request Timeout (transient)
      expect(isPermanentHttpStatus(429)).toBe(false); // Rate Limit (transient)
      expect(isPermanentHttpStatus(500)).toBe(false); // Server Error (transient)
      expect(isPermanentHttpStatus(503)).toBe(false); // Service Unavailable (transient)
    });

    it("2.2. isMutationEligibleForReplay returns false for permanent or exhausted mutations", () => {
      const permanentMutation: SyncMutation = {
        id: "mut-perm",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 1,
        status: "exhausted",
        isPermanent: true,
      };

      expect(isMutationEligibleForReplay(permanentMutation, Date.now(), false)).toBe(false);
    });

    it("2.3. isMutationEligibleForReplay returns false when retryCount >= DEFAULT_MAX_RETRY_COUNT (5)", () => {
      const exhaustedMutation: SyncMutation = {
        id: "mut-exh",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 5,
        status: "failed",
        nextRetryAt: new Date(Date.now() - 1000).toISOString(),
      };

      expect(isMutationEligibleForReplay(exhaustedMutation, Date.now(), false, DEFAULT_MAX_RETRY_COUNT)).toBe(false);
    });
  });

  // ─── 3. Legacy Normalization: Regression for retryCount = 226 ──────────────

  describe("3. Legacy Queue Normalization (Regression for retryCount = 226)", () => {
    it("3.1. normalizeExhaustedMutations flags items with retryCount >= 5 as exhausted without deleting", () => {
      const queue: SyncMutation[] = [
        {
          id: "mut-legacy-226",
          entityType: "note",
          action: "save",
          entityId: "note-stuck",
          payload: { id: "note-stuck", title: "Stuck Note" },
          clientTimestamp: "2026-08-28T10:00:00Z",
          retryCount: 226,
          status: "failed",
          lastError: "Unique constraint failed on the fields: (`id`)",
        },
        {
          id: "mut-normal",
          entityType: "topic",
          action: "save",
          entityId: "top-1",
          clientTimestamp: "2026-08-28T10:00:00Z",
          retryCount: 1,
          status: "pending",
        },
      ];

      const normalized = normalizeExhaustedMutations(queue, 5);
      expect(normalized).toHaveLength(2);
      expect(normalized[0].id).toBe("mut-legacy-226");
      expect(normalized[0].status).toBe("exhausted");
      expect(normalized[0].retryCount).toBe(226);
      expect(normalized[1].status).toBe("pending");
    });
  });

  // ─── 4. Non-blocking FIFO: Permanent failure does not block subsequent jobs ──

  describe("4. SyncQueueService.flushQueue Non-blocking Permanent Failures", () => {
    const STORAGE_KEY = "test_non_blocking_sync_queue";
    let service: SyncQueueService;

    beforeEach(() => {
      localStorage.clear();
      service = new SyncQueueService(STORAGE_KEY);
    });

    afterEach(() => {
      localStorage.clear();
      vi.restoreAllMocks();
    });

    it("4.1. flushQueue continues and replays subsequent valid mutation when head item is permanent failure", async () => {
      service.enqueue({
        id: "mut-permanent-head",
        entityType: "note",
        action: "save",
        entityId: "note-bad",
        payload: { title: "Bad Note" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      service.enqueue({
        id: "mut-valid-next",
        entityType: "topic",
        action: "save",
        entityId: "top-good",
        payload: { title: "Good Topic" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      // Mock fetch: first call (bad note) returns 400 Bad Request (permanent). Second call (good topic) returns 200 OK.
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Validation failed" }), { status: 400 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

      const result = await service.flushQueue("http://localhost:3000");

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      const queue = service.getQueue();
      // First item remains in queue as exhausted/failed with permanent mark, second item was removed on success
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("mut-permanent-head");
      expect(queue[0].isPermanent).toBe(true);
    });
  });
});
