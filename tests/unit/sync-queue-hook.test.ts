import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { useSyncQueue } from "../../src/hooks/useSyncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.4 — Sync Queue Observability & useSyncQueue Hook Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_hook_test";
  let syncQueueService: SyncQueueService;

  const sampleMutation: SyncMutation = {
    id: "mut-hook-1",
    entityType: "note",
    action: "save",
    entityId: "note-1",
    payload: { id: "note-1", title: "Test Note" },
    clientTimestamp: "2026-08-28T10:00:00.000Z",
    retryCount: 0,
    status: "pending",
  };

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. SyncQueueService Observer Subscription ───────────────────────────

  describe("1. SyncQueueService Observer Subscription", () => {
    it("1.1. calls listener callback when mutation is enqueued, removed, or marked failed", () => {
      const listener = vi.fn();
      const unsubscribe = (syncQueueService as any).subscribe(listener);

      expect(listener).not.toHaveBeenCalled();

      syncQueueService.enqueue(sampleMutation);
      expect(listener).toHaveBeenCalledTimes(1);

      syncQueueService.markFailed("mut-hook-1", "Test failure");
      expect(listener).toHaveBeenCalledTimes(2);

      syncQueueService.remove("mut-hook-1");
      expect(listener).toHaveBeenCalledTimes(3);

      unsubscribe();
    });

    it("1.2. unsubscribe stops listener from receiving further notifications", () => {
      const listener = vi.fn();
      const unsubscribe = (syncQueueService as any).subscribe(listener);

      syncQueueService.enqueue(sampleMutation);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      syncQueueService.remove("mut-hook-1");
      expect(listener).toHaveBeenCalledTimes(1); // No new call after unsubscribe
    });
  });

  // ─── 2. useSyncQueue Hook Initial State & Metric Exposure ─────────────────

  describe("2. useSyncQueue Hook State & Metric Exposure", () => {
    it("2.1. exposes initial queue, pendingCount, failedCount, isFlushing, and isOnline", () => {
      const { result } = renderHook(() => useSyncQueue(syncQueueService));

      expect(result.current.queue).toEqual([]);
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.failedCount).toBe(0);
      expect(result.current.isFlushing).toBe(false);
      expect(typeof result.current.isOnline).toBe("boolean");
      expect(typeof result.current.flush).toBe("function");
    });

    it("2.2. reflects initial pending and failed counts from existing localStorage queue", () => {
      syncQueueService.enqueue(sampleMutation);
      syncQueueService.enqueue({
        ...sampleMutation,
        id: "mut-hook-2",
        entityId: "note-2",
        status: "failed",
        lastError: "Connection timeout",
      });

      const { result } = renderHook(() => useSyncQueue(syncQueueService));

      expect(result.current.queue).toHaveLength(2);
      expect(result.current.pendingCount).toBe(1);
      expect(result.current.failedCount).toBe(1);
    });
  });

  // ─── 3. useSyncQueue Real-Time Reactivity ─────────────────────────────────

  describe("3. useSyncQueue Real-Time Reactivity", () => {
    it("3.1. updates state in real-time when new mutation is enqueued or removed externally", () => {
      const { result } = renderHook(() => useSyncQueue(syncQueueService));
      expect(result.current.pendingCount).toBe(0);

      act(() => {
        syncQueueService.enqueue(sampleMutation);
      });

      expect(result.current.pendingCount).toBe(1);
      expect(result.current.queue[0].id).toBe("mut-hook-1");

      act(() => {
        syncQueueService.remove("mut-hook-1");
      });

      expect(result.current.pendingCount).toBe(0);
      expect(result.current.queue).toHaveLength(0);
    });

    it("3.2. reflects isFlushing during flush lifecycle and clears queue upon successful flush", async () => {
      syncQueueService.enqueue(sampleMutation);

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return { ok: true, json: async () => ({}) };
      });

      const { result } = renderHook(() => useSyncQueue(syncQueueService));
      expect(result.current.pendingCount).toBe(1);

      let flushPromise: any;
      act(() => {
        flushPromise = result.current.flush();
      });

      await act(async () => {
        const flushResult = await flushPromise;
        expect(flushResult.syncedCount).toBe(1);
        expect(flushResult.failedCount).toBe(0);
      });

      expect(result.current.isFlushing).toBe(false);
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.queue).toHaveLength(0);
    });
  });

  // ─── 4. Browser Online/Offline Event Tracking ─────────────────────────────

  describe("4. Browser Online/Offline Event Tracking", () => {
    it("4.1. reacts to window online and offline events", () => {
      const { result } = renderHook(() => useSyncQueue(syncQueueService));

      act(() => {
        window.dispatchEvent(new Event("offline"));
      });
      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event("online"));
      });
      expect(result.current.isOnline).toBe(true);
    });
  });
});
