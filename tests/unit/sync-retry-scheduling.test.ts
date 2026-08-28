import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calculateBackoffDelay,
  isMutationEligibleForReplay,
  markMutationFailed,
  type SyncMutation,
} from "../../src/lib/syncQueue";
import { SyncQueueService } from "../../src/services/syncQueue";

describe("Phase P2.7b — Sync Retry Scheduling & Backoff Engine", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_scheduling_test";
  let service: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    service = new SyncQueueService(STORAGE_KEY);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Pure Helper: calculateBackoffDelay ─────────────────────────────────

  describe("1. calculateBackoffDelay", () => {
    it("1.1. computes exponential backoff for retries 1 through 6", () => {
      expect(calculateBackoffDelay(0)).toBe(1000);
      expect(calculateBackoffDelay(1)).toBe(1000);
      expect(calculateBackoffDelay(2)).toBe(2000);
      expect(calculateBackoffDelay(3)).toBe(4000);
      expect(calculateBackoffDelay(4)).toBe(8000);
      expect(calculateBackoffDelay(5)).toBe(16000);
      expect(calculateBackoffDelay(6)).toBe(32000);
    });

    it("1.2. caps backoff delay at MAX_DELAY_MS (60000ms / 1 minute)", () => {
      expect(calculateBackoffDelay(7)).toBe(60000);
      expect(calculateBackoffDelay(10)).toBe(60000);
      expect(calculateBackoffDelay(100)).toBe(60000);
    });

    it("1.3. supports custom base and max delay parameters", () => {
      expect(calculateBackoffDelay(2, 500, 5000)).toBe(1000);
      expect(calculateBackoffDelay(5, 500, 2000)).toBe(2000);
    });
  });

  // ─── 2. Pure Helper: markMutationFailed Metadata ──────────────────────────

  describe("2. markMutationFailed Scheduling Metadata", () => {
    it("2.1. sets lastAttemptAt, backoffDelayMs, and nextRetryAt upon failure", () => {
      const now = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const queue: SyncMutation[] = [
        {
          id: "mut-1",
          entityType: "topic",
          action: "save",
          entityId: "top-1",
          clientTimestamp: "2026-08-28T11:59:00.000Z",
          retryCount: 0,
          status: "pending",
        },
      ];

      const updated = markMutationFailed(queue, "mut-1", "HTTP 503");
      expect(updated[0].retryCount).toBe(1);
      expect(updated[0].status).toBe("failed");
      expect(updated[0].lastError).toBe("HTTP 503");
      expect(updated[0].lastAttemptAt).toBe("2026-08-28T12:00:00.000Z");
      expect(updated[0].backoffDelayMs).toBe(1000);
      expect(updated[0].nextRetryAt).toBe("2026-08-28T12:00:01.000Z");
    });

    it("2.2. doubles delay on second consecutive failure", () => {
      const now = new Date("2026-08-28T12:01:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const queue: SyncMutation[] = [
        {
          id: "mut-2",
          entityType: "note",
          action: "save",
          entityId: "note-2",
          clientTimestamp: "2026-08-28T12:00:00.000Z",
          retryCount: 1,
          status: "failed",
          lastAttemptAt: "2026-08-28T12:00:01.000Z",
          backoffDelayMs: 1000,
          nextRetryAt: "2026-08-28T12:00:02.000Z",
        },
      ];

      const updated = markMutationFailed(queue, "mut-2", "HTTP 500");
      expect(updated[0].retryCount).toBe(2);
      expect(updated[0].backoffDelayMs).toBe(2000);
      expect(updated[0].nextRetryAt).toBe("2026-08-28T12:01:02.000Z");
    });
  });

  // ─── 3. Pure Helper: isMutationEligibleForReplay ───────────────────────────

  describe("3. isMutationEligibleForReplay", () => {
    const fixedNow = new Date("2026-08-28T12:00:00.000Z").getTime();

    it("3.1. returns true for any pending mutation regardless of timestamps", () => {
      const pending: SyncMutation = {
        id: "mut-p",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        clientTimestamp: "2026-08-28T11:00:00.000Z",
        retryCount: 0,
        status: "pending",
      };
      expect(isMutationEligibleForReplay(pending, fixedNow)).toBe(true);
    });

    it("3.2. returns false for failed mutation if nextRetryAt is in the future", () => {
      const futureFailed: SyncMutation = {
        id: "mut-f",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        clientTimestamp: "2026-08-28T11:00:00.000Z",
        retryCount: 1,
        status: "failed",
        nextRetryAt: "2026-08-28T12:00:05.000Z", // 5s in future
      };
      expect(isMutationEligibleForReplay(futureFailed, fixedNow, false)).toBe(
        false
      );
    });

    it("3.3. returns true for failed mutation if nextRetryAt is in the past", () => {
      const pastFailed: SyncMutation = {
        id: "mut-f2",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        clientTimestamp: "2026-08-28T11:00:00.000Z",
        retryCount: 1,
        status: "failed",
        nextRetryAt: "2026-08-28T11:59:55.000Z", // 5s in past
      };
      expect(isMutationEligibleForReplay(pastFailed, fixedNow, false)).toBe(
        true
      );
    });

    it("3.4. returns true when bypassBackoff is true even if nextRetryAt is in the future", () => {
      const futureFailed: SyncMutation = {
        id: "mut-f3",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        clientTimestamp: "2026-08-28T11:00:00.000Z",
        retryCount: 3,
        status: "failed",
        nextRetryAt: "2026-08-28T12:01:00.000Z", // 1 min in future
      };
      expect(isMutationEligibleForReplay(futureFailed, fixedNow, true)).toBe(
        true
      );
    });
  });

  // ─── 4. Service Integration: flushQueue with Backoff & Bypass ──────────────

  describe("4. SyncQueueService.flushQueue with Backoff Gating", () => {
    it("4.1. automatic flush skips replay when head mutation is in backoff cooldown", async () => {
      const futureTime = new Date(Date.now() + 30000).toISOString();
      service.enqueue({
        id: "mut-cooldown",
        entityType: "topic",
        action: "save",
        entityId: "top-cd",
        clientTimestamp: new Date().toISOString(),
        retryCount: 2,
        status: "failed",
        nextRetryAt: futureTime,
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Automatic flush (bypassBackoff: false or omitted)
      await service.flushQueue("http://localhost:3000");

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(service.getQueue()[0].id).toBe("mut-cooldown");
    });

    it("4.2. manual flush with bypassBackoff = true executes replay immediately", async () => {
      const futureTime = new Date(Date.now() + 30000).toISOString();
      service.enqueue({
        id: "mut-bypass",
        entityType: "topic",
        action: "save",
        entityId: "top-by",
        payload: { title: "Topic Bypassed" },
        clientTimestamp: new Date().toISOString(),
        retryCount: 2,
        status: "failed",
        nextRetryAt: futureTime,
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));

      // Manual flush with bypass
      await service.flushQueue("http://localhost:3000", {
        bypassBackoff: true,
      });

      expect(fetchSpy).toHaveBeenCalled();
      expect(service.getQueue()).toHaveLength(0);
    });
  });
});
