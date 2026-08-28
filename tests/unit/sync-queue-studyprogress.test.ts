import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncQueueService } from "../../src/services/syncQueue";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import type { StudyProgress } from "../../src/types";

describe("Phase P2.3c — StudyProgress Review-Event Bridge Offline Sync Queue Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_studyprogress";
  let syncQueueService: SyncQueueService;
  let localFallback: LocalStorageDataRepository;
  let repository: ApiDataRepository;

  const sampleProgress: StudyProgress = {
    topicId: "topic-citta-1",
    status: "in_progress",
    progress: 40,
    repetitions: 3,
    interval: 6,
    easeFactor: 2.5,
    totalNotes: 5,
    timeSpent: 45,
    lastStudied: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    localFallback = new LocalStorageDataRepository("test_storage_studyprogress");
    repository = new ApiDataRepository("/api", localFallback, syncQueueService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. StudyProgress Offline Enqueueing ──────────────────────────────────

  describe("1. StudyProgress Review-Event Offline Enqueueing", () => {
    it("1.1. enqueues studyProgress review event when fetch throws a network error", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const saved = await repository.saveStudyProgress("topic-citta-1", sampleProgress);
      expect(saved.topicId).toBe("topic-citta-1");

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("studyProgress");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("topic-citta-1");
    });

    it("1.2. enqueues studyProgress review event when server returns non-ok response (!res.ok)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      await repository.saveStudyProgress("topic-citta-1", sampleProgress);

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityType).toBe("studyProgress");
      expect(queue[0].action).toBe("save");
      expect(queue[0].entityId).toBe("topic-citta-1");
    });

    it("1.3. normalizes enqueued payload to { topicId, quality, triggerReason: 'offline_replayed' }", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      await repository.saveStudyProgress("topic-citta-1", sampleProgress);

      const queue = syncQueueService.getQueue();
      expect(queue).toHaveLength(1);
      const payload = queue[0].payload;
      expect(payload.topicId).toBe("topic-citta-1");
      expect(typeof payload.quality).toBe("number");
      expect(payload.quality).toBeGreaterThanOrEqual(0);
      expect(payload.quality).toBeLessThanOrEqual(5);
      expect(payload.triggerReason).toBe("offline_replayed");
    });
  });

  // ─── 2. FlushQueue Replay for StudyProgress Review Events ─────────────────

  describe("2. FlushQueue Replay for StudyProgress Review Events", () => {
    it("2.1. replays studyProgress review event to POST /api/study-progress with SM2ReviewInputSchema format and clears queue on success", async () => {
      syncQueueService.enqueue({
        id: "mut-sp-1",
        entityType: "studyProgress",
        action: "save",
        entityId: "topic-citta-1",
        payload: {
          topicId: "topic-citta-1",
          quality: 4,
          triggerReason: "offline_replayed",
        },
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      let requestedUrl = "";
      let requestedMethod = "";
      let requestedBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        requestedUrl = url;
        requestedMethod = opts?.method;
        requestedBody = JSON.parse(opts?.body || "{}");
        return { ok: true, json: async () => ({ success: true }) };
      });

      const result = await syncQueueService.flushQueue("/api");
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      expect(requestedUrl).toContain("/api/study-progress");
      expect(requestedMethod).toBe("POST");
      expect(requestedBody.topicId).toBe("topic-citta-1");
      expect(requestedBody.quality).toBe(4);
      expect(requestedBody.triggerReason).toBe("offline_replayed");

      expect(syncQueueService.getQueue()).toHaveLength(0);
    });

    it("2.2. preserves failed tail when intermediate studyProgress replay fails", async () => {
      syncQueueService.enqueue({
        id: "mut-sp-ok",
        entityType: "studyProgress",
        action: "save",
        entityId: "topic-1",
        payload: { topicId: "topic-1", quality: 4, triggerReason: "offline_replayed" },
        clientTimestamp: "2026-08-28T10:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-sp-fail",
        entityType: "studyProgress",
        action: "save",
        entityId: "topic-2",
        payload: { topicId: "topic-2", quality: 5, triggerReason: "offline_replayed" },
        clientTimestamp: "2026-08-28T10:01:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-sp-tail",
        entityType: "studyProgress",
        action: "save",
        entityId: "topic-3",
        payload: { topicId: "topic-3", quality: 3, triggerReason: "offline_replayed" },
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
      expect(queue[0].id).toBe("mut-sp-fail");
      expect(queue[0].status).toBe("failed");
      expect(queue[1].id).toBe("mut-sp-tail");
    });
  });
});
