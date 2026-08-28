import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncQueueService } from "../../src/services/syncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P3.1 — Multi-Tab Sync Queue Synchronization", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_multi_tab_test";
  const TELEMETRY_KEY = `${STORAGE_KEY}_telemetry`;

  let tabAService: SyncQueueService;
  let tabBService: SyncQueueService;

  const sampleMutation1: SyncMutation = {
    id: "mut-tab-1",
    entityType: "topic",
    action: "save",
    entityId: "top-1",
    payload: { title: "Topic 1" },
    clientTimestamp: "2026-08-28T12:00:00.000Z",
    retryCount: 0,
    status: "pending",
  };

  const sampleMutation2: SyncMutation = {
    id: "mut-tab-2",
    entityType: "note",
    action: "save",
    entityId: "note-1",
    payload: { title: "Note 1" },
    clientTimestamp: "2026-08-28T12:00:01.000Z",
    retryCount: 0,
    status: "pending",
  };

  beforeEach(() => {
    localStorage.clear();
    tabAService = new SyncQueueService(STORAGE_KEY, TELEMETRY_KEY);
    tabBService = new SyncQueueService(STORAGE_KEY, TELEMETRY_KEY);
  });

  afterEach(() => {
    // If destroy method exists, clean up
    if (typeof (tabAService as any).destroy === "function") {
      (tabAService as any).destroy();
    }
    if (typeof (tabBService as any).destroy === "function") {
      (tabBService as any).destroy();
    }
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Cross-Tab Queue Mutation Event Synchronization ────────────────────

  describe("1. Cross-Tab Queue Mutation Synchronization", () => {
    it("1.1. notifies Tab B subscriber when Tab A modifies the queue storage", () => {
      const tabBListener = vi.fn();
      tabBService.subscribe(tabBListener);

      // Tab A enqueues a mutation
      tabAService.enqueue(sampleMutation1);

      // Simulate browser firing storage event to other windows/tabs
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: localStorage.getItem(STORAGE_KEY),
        })
      );

      expect(tabBListener).toHaveBeenCalledTimes(1);
      expect(tabBService.getQueue()).toHaveLength(1);
      expect(tabBService.getQueue()[0].id).toBe("mut-tab-1");
    });

    it("1.2. ignores storage events for unrelated keys", () => {
      const tabBListener = vi.fn();
      tabBService.subscribe(tabBListener);

      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "some_unrelated_app_key",
          newValue: "random_data",
        })
      );

      expect(tabBListener).not.toHaveBeenCalled();
    });
  });

  // ─── 2. Cross-Tab Telemetry Log Synchronization ───────────────────────────

  describe("2. Cross-Tab Telemetry Log Synchronization", () => {
    it("2.1. notifies Tab B subscriber when Tab A updates telemetry storage", () => {
      const tabBListener = vi.fn();
      tabBService.subscribe(tabBListener);

      // Tab A records an event internally
      tabAService.enqueue(sampleMutation1);

      // Simulate storage event for telemetry key
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: TELEMETRY_KEY,
          newValue: localStorage.getItem(TELEMETRY_KEY),
        })
      );

      expect(tabBListener).toHaveBeenCalled();
      expect(tabBService.getTelemetryEvents().length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── 3. Pre-Replay Existence Guard (Concurrency Safety) ───────────────────

  describe("3. Pre-Replay Existence Guard in flushQueue", () => {
    it("3.1. skips mutation replay if already synced and dequeued by another tab", async () => {
      // Both mutations exist in storage
      tabAService.enqueue(sampleMutation1);
      tabAService.enqueue(sampleMutation2);

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
        async () =>
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
      );

      // Tab A prepares to flush; during Tab A's flush, Tab B simulates having already dequeued mutation 1
      const originalReplay = (tabAService as any).replayMutation.bind(tabAService);
      (tabAService as any).replayMutation = vi.fn().mockImplementation(async (mutation, apiBaseUrl) => {
        if (mutation.id === "mut-tab-1") {
          // Tab B removes mut-tab-2 from localStorage before Tab A gets to it
          tabBService.remove("mut-tab-2");
        }
        return originalReplay(mutation, apiBaseUrl);
      });

      const result = await tabAService.flushQueue("http://localhost:3000");

      // Mutation 1 was synced by Tab A, but Mutation 2 was skipped because Tab B already removed it
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Only 1 HTTP request made instead of 2
    });
  });

  // ─── 4. Service Lifecycle Cleanup ─────────────────────────────────────────

  describe("4. Service Lifecycle Cleanup", () => {
    it("4.1. destroy method removes the storage event listener and stops notifications", () => {
      const tabBListener = vi.fn();
      tabBService.subscribe(tabBListener);

      expect(typeof (tabBService as any).destroy).toBe("function");

      (tabBService as any).destroy();

      // Dispatch storage event
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: "[]",
        })
      );

      expect(tabBListener).not.toHaveBeenCalled();
    });
  });
});
