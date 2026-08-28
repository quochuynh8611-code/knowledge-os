import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncQueueService } from "../../src/services/syncQueue";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import type { Category, Topic } from "../../src/types";

describe("Phase P2.3a — Category & Topic Offline Sync Queue Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_cat_topic";
  let syncQueueService: SyncQueueService;
  let localFallback: LocalStorageDataRepository;
  let repository: ApiDataRepository;

  const sampleCategory: Category = {
    id: "cat-abhidharma",
    name: "A Tỳ Đàm (Thắng Pháp)",
    slug: "a-ty-dam",
    type: "general",
    description: "Nghiên cứu triết học Vi Diệu Pháp",
  };

  const sampleTopic: Topic = {
    id: "topic-citta-1",
    title: "Tâm & Tâm Sở",
    slug: "tam-va-tam-so",
    categoryId: "cat-abhidharma",
    type: "core",
    description: "Phân tích 89 tâm và 52 tâm sở",
    content: "Nội dung nghiên cứu chi tiết",
    tags: ["vi-dieu-phap", "tam-so"],
    links: [],
    studyProgress: {
      topicId: "topic-citta-1",
      status: "in_progress",
      progress: 50,
      repetitions: 2,
      interval: 1,
      easeFactor: 2.5,
      totalNotes: 5,
      timeSpent: 30,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    localFallback = new LocalStorageDataRepository("test_storage_cat_topic");
    repository = new ApiDataRepository("/api", localFallback, syncQueueService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Category Offline Enqueue ──────────────────────────────────────────

  describe("1. Category Offline Enqueueing", () => {
    it("1.1. enqueues category save mutation when network fetch fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const saved = await repository.saveCategory(sampleCategory);
      expect(saved.id).toBe("cat-abhidharma");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("category");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("cat-abhidharma");
      expect(queue[0].payload.name).toBe("A Tỳ Đàm (Thắng Pháp)");
    });

    it("1.2. enqueues category delete mutation when fetch fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      await repository.deleteCategory("cat-to-delete-1");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("category");
      expect(queue[0].action).toBe("delete");
      expect(queue[0].entityId).toBe("cat-to-delete-1");
    });
  });

  // ─── 2. Topic Offline Enqueue ─────────────────────────────────────────────

  describe("2. Topic Offline Enqueueing", () => {
    it("2.1. enqueues topic save mutation when network fetch fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const saved = await repository.saveTopic(sampleTopic);
      expect(saved.id).toBe("topic-citta-1");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("topic");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("topic-citta-1");
      expect(queue[0].payload.title).toBe("Tâm & Tâm Sở");
    });

    it("2.2. enqueues topic delete mutation when fetch fails", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      await repository.deleteTopic("topic-to-delete-1");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("topic");
      expect(queue[0].action).toBe("delete");
      expect(queue[0].entityId).toBe("topic-to-delete-1");
    });
  });

  // ─── 3. Replay Endpoints & FIFO Order ─────────────────────────────────────

  describe("3. FlushQueue Replay for Category and Topic", () => {
    it("3.1. replays category and topic save mutations via REST endpoints in FIFO order", async () => {
      syncQueueService.enqueue({
        id: "mut-cat-1",
        entityType: "category",
        action: "save",
        entityId: sampleCategory.id,
        payload: sampleCategory,
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-top-1",
        entityType: "topic",
        action: "save",
        entityId: sampleTopic.id,
        payload: sampleTopic,
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      const calledUrls: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        calledUrls.push(url);
        return { ok: true, json: async () => ({ success: true }) };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(0);

      // Verify category replayed before topic
      expect(calledUrls).toHaveLength(2);
      expect(calledUrls[0]).toContain("/api/categories");
      expect(calledUrls[1]).toContain("/api/topics");

      // Verify queue cleared
      expect(syncQueueService.getQueue()).toHaveLength(0);
    });

    it("3.2. replays category and topic delete mutations via REST endpoints", async () => {
      syncQueueService.enqueue({
        id: "mut-del-top",
        entityType: "topic",
        action: "delete",
        entityId: "topic-del-1",
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-del-cat",
        entityType: "category",
        action: "delete",
        entityId: "cat-del-1",
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      const calledUrls: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        calledUrls.push(url);
        return { ok: true, json: async () => ({ success: true }) };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(2);
      expect(calledUrls[0]).toContain("/api/topics/topic-del-1");
      expect(calledUrls[1]).toContain("/api/categories/cat-del-1");
      expect(syncQueueService.getQueue()).toHaveLength(0);
    });

    it("3.3. stops replay and preserves failed tail when intermediate mutation fails", async () => {
      syncQueueService.enqueue({
        id: "mut-ok",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        payload: sampleCategory,
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-fail",
        entityType: "topic",
        action: "save",
        entityId: "topic-1",
        payload: sampleTopic,
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-tail",
        entityType: "topic",
        action: "delete",
        entityId: "topic-2",
        clientTimestamp: "2026-08-28T10:02:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, json: async () => ({}) };
        return { ok: false, status: 500 };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe("mut-fail");
      expect(queue[0].status).toBe("failed");
      expect(queue[1].id).toBe("mut-tail");
    });
  });
});
