import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { useSyncQueue } from "../../src/hooks/useSyncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.8 — Background Auto-Sync & Network Reconnect Trigger", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_auto_trigger_test";
  let service: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    service = new SyncQueueService(STORAGE_KEY);
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── 1. Network Reconnect Auto-Sync (Debounced 300ms) ──────────────────────

  describe("1. Network Reconnect Auto-Sync Trigger", () => {
    it("1.1. triggers debounced flushQueue after 'online' event fires", async () => {
      const flushSpy = vi.spyOn(service, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      renderHook(() => useSyncQueue(service, "/api"));

      // Fire online event
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      // Before 300ms debounce: not called yet
      expect(flushSpy).not.toHaveBeenCalled();

      // Advance timers by 300ms
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(flushSpy).toHaveBeenCalledTimes(1);
      expect(flushSpy).toHaveBeenCalledWith("/api", { bypassBackoff: false });
    });

    it("1.2. debounces rapid consecutive online events into a single flush", async () => {
      const flushSpy = vi.spyOn(service, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      renderHook(() => useSyncQueue(service, "/api"));

      // Rapid flapping: 3 online events within 200ms
      act(() => {
        window.dispatchEvent(new Event("online"));
      });
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new Event("online"));
      });
      act(() => {
        vi.advanceTimersByTime(100);
        window.dispatchEvent(new Event("online"));
      });

      expect(flushSpy).not.toHaveBeenCalled();

      // Advance by full 300ms after the last event
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(flushSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 2. Scheduled Retry on Cooldown Expiry ────────────────────────────────

  describe("2. Scheduled Retry on Earliest Cooldown Expiry", () => {
    it("2.1. sets timer for earliest nextRetryAt and automatically triggers flush when expired", async () => {
      const now = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.setSystemTime(now);

      const failedMutation: SyncMutation = {
        id: "mut-scheduled-1",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 1,
        status: "failed",
        lastAttemptAt: "2026-08-28T12:00:00.000Z",
        backoffDelayMs: 2000,
        nextRetryAt: "2026-08-28T12:00:02.000Z", // 2s in future
      };
      service.enqueue(failedMutation);

      const flushSpy = vi.spyOn(service, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      renderHook(() => useSyncQueue(service, "/api"));

      // Advance 1s: not expired yet
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(flushSpy).not.toHaveBeenCalled();

      // Advance 1 more second: hits 2000ms cooldown
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(flushSpy).toHaveBeenCalledTimes(1);
      expect(flushSpy).toHaveBeenCalledWith("/api", { bypassBackoff: false });
    });

    it("2.2. reschedules timeout when queue updates with an earlier nextRetryAt", async () => {
      const now = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.setSystemTime(now);

      const flushSpy = vi.spyOn(service, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      const { rerender } = renderHook(() => useSyncQueue(service, "/api"));

      // First failed item with 10s cooldown
      act(() => {
        service.enqueue({
          id: "mut-item-1",
          entityType: "topic",
          action: "save",
          entityId: "top-1",
          clientTimestamp: "2026-08-28T11:59:00.000Z",
          retryCount: 3,
          status: "failed",
          nextRetryAt: "2026-08-28T12:00:10.000Z", // 10s
        });
      });

      // Second failed item added later with earlier 2s cooldown
      act(() => {
        service.enqueue({
          id: "mut-item-2",
          entityType: "note",
          action: "save",
          entityId: "note-1",
          clientTimestamp: "2026-08-28T11:59:30.000Z",
          retryCount: 1,
          status: "failed",
          nextRetryAt: "2026-08-28T12:00:02.000Z", // 2s
        });
      });

      rerender();

      // Advance 2s: should trigger for the earlier item
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(flushSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 3. Cleanup & Lifecycle Safety ────────────────────────────────────────

  describe("3. Cleanup and Lifecycle Safety", () => {
    it("3.1. cancels pending debounced online trigger and cooldown timeout upon unmount", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useSyncQueue(service, "/api"));

      // Start a pending debounced reconnect timeout
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "online",
        expect.any(Function)
      );
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("3.2. does not schedule cooldown timeout when queue has only pending or no failed items", () => {
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      service.enqueue({
        id: "mut-pending",
        entityType: "topic",
        action: "save",
        entityId: "top-p",
        clientTimestamp: "2026-08-28T12:00:00.000Z",
        retryCount: 0,
        status: "pending",
      });

      renderHook(() => useSyncQueue(service, "/api"));

      // Cooldown timer should not be created for pending-only queue
      // (only online debounce timer might exist when event fires)
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });
  });
});
