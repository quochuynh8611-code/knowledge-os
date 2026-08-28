import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sanitizeMutationError,
  pruneExhaustedFailedMutations,
  type SyncMutation,
} from "../../src/lib/syncQueue";
import { SyncQueueService } from "../../src/services/syncQueue";
import * as storageModule from "../../src/lib/storage";

describe("Phase P3.2 — Storage Quota Guard & Proactive Payload Trimming", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_quota_test";
  const TELEMETRY_KEY = `${STORAGE_KEY}_telemetry`;

  let service: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    service = new SyncQueueService(STORAGE_KEY, TELEMETRY_KEY);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Error Message Sanitization ────────────────────────────────────────

  describe("1. sanitizeMutationError", () => {
    it("1.1. truncates overly long error string to 500 characters", () => {
      const longError = "A".repeat(2000);
      const sanitized = sanitizeMutationError(longError, 500);

      expect(sanitized).toBeDefined();
      expect(sanitized!.length).toBe(500);
      expect(sanitized).toBe("A".repeat(500));
    });

    it("1.2. preserves short error strings without truncation", () => {
      const shortError = "HTTP 500 Internal Server Error";
      expect(sanitizeMutationError(shortError)).toBe(shortError);
    });

    it("1.3. returns undefined for undefined or empty error input", () => {
      expect(sanitizeMutationError(undefined)).toBeUndefined();
      expect(sanitizeMutationError("")).toBeUndefined();
    });
  });

  // ─── 2. Poison-Pill Pruning (Preserving Pending Mutations) ────────────────

  describe("2. pruneExhaustedFailedMutations", () => {
    it("2.1. prunes failed mutations with retryCount >= 10 and strictly preserves pending mutations", () => {
      const queue: SyncMutation[] = [
        {
          id: "mut-pending-1",
          entityType: "note",
          action: "save",
          entityId: "note-1",
          clientTimestamp: "2026-08-28T12:00:00Z",
          retryCount: 0,
          status: "pending",
        },
        {
          id: "mut-failed-recoverable",
          entityType: "topic",
          action: "save",
          entityId: "top-1",
          clientTimestamp: "2026-08-28T12:00:01Z",
          retryCount: 3,
          status: "failed",
        },
        {
          id: "mut-failed-exhausted",
          entityType: "category",
          action: "save",
          entityId: "cat-1",
          clientTimestamp: "2026-08-28T12:00:02Z",
          retryCount: 10,
          status: "failed",
        },
        {
          id: "mut-failed-exhausted-severe",
          entityType: "resource",
          action: "save",
          entityId: "res-1",
          clientTimestamp: "2026-08-28T12:00:03Z",
          retryCount: 15,
          status: "failed",
        },
      ];

      const pruned = pruneExhaustedFailedMutations(queue, 10);

      // Should keep mut-pending-1 and mut-failed-recoverable (2 items)
      expect(pruned).toHaveLength(2);
      expect(pruned.map((m) => m.id)).toEqual([
        "mut-pending-1",
        "mut-failed-recoverable",
      ]);
      expect(pruned.find((m) => m.id === "mut-failed-exhausted")).toBeUndefined();
    });
  });

  // ─── 3. Two-Tier Storage Recovery in Service ──────────────────────────────

  describe("3. Hierarchical Storage Recovery in SyncQueueService", () => {
    it("3.1. Tier 1: trims telemetry log when queue saving hits quota limit and succeeds on retry", () => {
      // Pre-fill telemetry with 20 events
      const mockEvents = Array.from({ length: 20 }, (_, i) => ({
        id: `evt-${i}`,
        timestamp: new Date().toISOString(),
        type: "MUTATION_ENQUEUED" as const,
      }));
      localStorage.setItem(TELEMETRY_KEY, JSON.stringify(mockEvents));

      let callCount = 0;
      const safeSetSpy = vi
        .spyOn(storageModule, "safeSetLocalStorageItem")
        .mockImplementation((key, val) => {
          // First attempt to save the queue fails (quota exceeded)
          if (key === STORAGE_KEY && callCount === 0) {
            callCount++;
            return false; // Quota error
          }
          // Subsequent calls (telemetry trim + queue retry) succeed
          localStorage.setItem(key, val);
          return true;
        });

      const newMutation: SyncMutation = {
        id: "mut-new-1",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: "2026-08-28T12:00:00Z",
        retryCount: 0,
        status: "pending",
      };

      const result = service.enqueue(newMutation);

      expect(result).toBe(true);
      expect(safeSetSpy).toHaveBeenCalled();
      // Telemetry should have been trimmed down
      const telemetryEvents = service.getTelemetryEvents();
      expect(telemetryEvents.length).toBeLessThan(20);
      expect(service.getQueue()).toHaveLength(1);
    });

    it("3.2. Tier 2: prunes exhausted failed mutations when Tier 1 is insufficient and succeeds", () => {
      // Existing queue has an exhausted failed mutation
      const existingQueue: SyncMutation[] = [
        {
          id: "mut-exhausted",
          entityType: "note",
          action: "save",
          entityId: "note-ex",
          clientTimestamp: "2026-08-28T12:00:00Z",
          retryCount: 12,
          status: "failed",
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingQueue));

      let attempts = 0;
      vi.spyOn(storageModule, "safeSetLocalStorageItem").mockImplementation(
        (key, val) => {
          if (key === STORAGE_KEY) {
            attempts++;
            // Fails on initial and Tier 1 attempts, succeeds on Tier 2 after pruning
            if (attempts <= 2) {
              return false;
            }
          }
          localStorage.setItem(key, val);
          return true;
        }
      );

      const newMutation: SyncMutation = {
        id: "mut-new-2",
        entityType: "topic",
        action: "save",
        entityId: "top-2",
        clientTimestamp: "2026-08-28T12:00:01Z",
        retryCount: 0,
        status: "pending",
      };

      const result = service.enqueue(newMutation);

      expect(result).toBe(true);
      // The exhausted mutation was pruned, new pending mutation is saved
      const finalQueue = service.getQueue();
      expect(finalQueue.find((m) => m.id === "mut-new-2")).toBeDefined();
      expect(finalQueue.find((m) => m.id === "mut-exhausted")).toBeUndefined();
    });

    it("3.3. Tier 3: returns false without corrupting durable storage when all recovery tiers fail", () => {
      const existingQueue: SyncMutation[] = [
        {
          id: "mut-preserved",
          entityType: "note",
          action: "save",
          entityId: "note-1",
          clientTimestamp: "2026-08-28T12:00:00Z",
          retryCount: 0,
          status: "pending",
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingQueue));

      // Storage permanently returns false for queue saves
      vi.spyOn(storageModule, "safeSetLocalStorageItem").mockImplementation(
        (key, val) => {
          if (key === STORAGE_KEY) {
            return false;
          }
          localStorage.setItem(key, val);
          return true;
        }
      );

      const newMutation: SyncMutation = {
        id: "mut-oversized",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        clientTimestamp: "2026-08-28T12:00:01Z",
        retryCount: 0,
        status: "pending",
      };

      const result = service.enqueue(newMutation);

      expect(result).toBe(false);
      // Original durable queue is preserved intact
      expect(service.getQueue()).toHaveLength(1);
      expect(service.getQueue()[0].id).toBe("mut-preserved");
    });
  });
});
