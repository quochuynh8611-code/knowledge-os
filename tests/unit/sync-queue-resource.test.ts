import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncQueueService } from "../../src/services/syncQueue";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import type { Resource } from "../../src/types";

describe("Phase P2.3b — Resource Offline Sync Queue Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_resource";
  let syncQueueService: SyncQueueService;
  let localFallback: LocalStorageDataRepository;
  let repository: ApiDataRepository;

  const sampleResource: Resource = {
    id: "res-visuddhimagga-101",
    topicId: "topic-citta-1",
    title: "Thanh Tịnh Đạo Luận (Visuddhimagga)",
    url: "https://example.com/visuddhimagga.pdf",
    filePath: "E:/Obsidian/Phat-Hoc/visuddhimagga.pdf",
    type: "book",
    author: "Bhadantācariya Buddhaghosa",
    notes: "Tài liệu chú giải căn bản của Phật giáo Nguyên thủy",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    localFallback = new LocalStorageDataRepository("test_storage_resource");
    repository = new ApiDataRepository("/api", localFallback, syncQueueService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Resource Offline Enqueue ──────────────────────────────────────────

  describe("1. Resource Offline Enqueueing", () => {
    it("1.1. enqueues resource save mutation when fetch throws a network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const saved = await repository.saveResource(sampleResource);
      expect(saved.id).toBe("res-visuddhimagga-101");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("resource");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("res-visuddhimagga-101");
      expect(queue[0].payload.title).toBe("Thanh Tịnh Đạo Luận (Visuddhimagga)");
    });

    it("1.2. enqueues resource save mutation when server returns non-ok response (!res.ok)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      await repository.saveResource(sampleResource);

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("resource");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("res-visuddhimagga-101");
    });

    it("1.3. enqueues resource delete mutation when fetch throws a network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      await repository.deleteResource("res-to-delete-1");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("resource");
      expect(queue[0].action).toBe("delete");
      expect(queue[0].entityId).toBe("res-to-delete-1");
    });

    it("1.4. enqueues resource delete mutation when server returns non-ok response (!res.ok)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await repository.deleteResource("res-to-delete-2");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("resource");
      expect(queue[0].action).toBe("delete");
      expect(queue[0].entityId).toBe("res-to-delete-2");
    });
  });

  // ─── 2. FlushQueue Replay for Resource ────────────────────────────────────

  describe("2. FlushQueue Replay for Resource", () => {
    it("2.1. replays resource save mutation to POST /api/resources and clears queue on success", async () => {
      syncQueueService.enqueue({
        id: "mut-res-1",
        entityType: "resource",
        action: "save",
        entityId: sampleResource.id,
        payload: sampleResource,
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      let requestedUrl = "";
      let requestedMethod = "";
      let requestedBody = "";

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        requestedUrl = url;
        requestedMethod = opts?.method;
        requestedBody = opts?.body;
        return { ok: true, json: async () => ({ success: true }) };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      expect(requestedUrl).toContain("/api/resources");
      expect(requestedMethod).toBe("POST");
      expect(JSON.parse(requestedBody).title).toBe("Thanh Tịnh Đạo Luận (Visuddhimagga)");

      expect(syncQueueService.getQueue()).toHaveLength(0);
    });

    it("2.2. replays resource delete mutation to DELETE /api/resources/:id and clears queue on success", async () => {
      syncQueueService.enqueue({
        id: "mut-res-del",
        entityType: "resource",
        action: "delete",
        entityId: "res-visuddhimagga-101",
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      let requestedUrl = "";
      let requestedMethod = "";

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        requestedUrl = url;
        requestedMethod = opts?.method;
        return { ok: true, json: async () => ({ success: true }) };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      expect(requestedUrl).toContain("/api/resources/res-visuddhimagga-101");
      expect(requestedMethod).toBe("DELETE");
      expect(syncQueueService.getQueue()).toHaveLength(0);
    });

    it("2.3. preserves failed tail when intermediate resource replay fails", async () => {
      syncQueueService.enqueue({
        id: "mut-res-ok",
        entityType: "resource",
        action: "save",
        entityId: "res-1",
        payload: { ...sampleResource, id: "res-1" },
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-res-fail",
        entityType: "resource",
        action: "save",
        entityId: "res-2",
        payload: { ...sampleResource, id: "res-2" },
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-res-tail",
        entityType: "resource",
        action: "delete",
        entityId: "res-3",
        clientTimestamp: "2026-08-28T10:02:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { ok: true, json: async () => ({}) };
        return { ok: false, status: 503 };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe("mut-res-fail");
      expect(queue[0].status).toBe("failed");
      expect(queue[1].id).toBe("mut-res-tail");
    });
  });
});
