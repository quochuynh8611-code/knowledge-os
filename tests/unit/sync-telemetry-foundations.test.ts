import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  appendTelemetryEvent,
  calculateSyncTelemetryStats,
  serializeTelemetryEvents,
  deserializeTelemetryEvents,
  type SyncTelemetryEvent,
} from "../../src/lib/syncTelemetry";
import { SyncQueueService } from "../../src/services/syncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.9a — Sync Queue Telemetry & Observability Foundations", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue_telemetry_test";
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

  // ─── 1. Pure Telemetry Helper Functions ───────────────────────────────────

  describe("1. Pure Telemetry Helpers (src/lib/syncTelemetry.ts)", () => {
    it("1.1. appendTelemetryEvent appends a new event and preserves FIFO order", () => {
      const initial: SyncTelemetryEvent[] = [
        {
          id: "evt-1",
          timestamp: "2026-08-28T12:00:00.000Z",
          type: "MUTATION_ENQUEUED",
          entityType: "topic",
          mutationId: "mut-1",
          entityId: "top-1",
        },
      ];

      const newEvent: SyncTelemetryEvent = {
        id: "evt-2",
        timestamp: "2026-08-28T12:00:01.000Z",
        type: "REPLAY_SUCCESS",
        entityType: "topic",
        mutationId: "mut-1",
        entityId: "top-1",
      };

      const result = appendTelemetryEvent(initial, newEvent, 50);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("evt-1");
      expect(result[1].id).toBe("evt-2");
    });

    it("1.2. rolling buffer evicts the oldest event when buffer exceeds 50 items", () => {
      let events: SyncTelemetryEvent[] = [];
      for (let i = 1; i <= 50; i++) {
        events = appendTelemetryEvent(
          events,
          {
            id: `evt-${i}`,
            timestamp: new Date(1700000000000 + i * 1000).toISOString(),
            type: "MUTATION_ENQUEUED",
            entityType: "note",
            mutationId: `mut-${i}`,
          },
          50
        );
      }
      expect(events).toHaveLength(50);
      expect(events[0].id).toBe("evt-1");
      expect(events[49].id).toBe("evt-50");

      // Append 51st event
      const overflowEvent: SyncTelemetryEvent = {
        id: "evt-51",
        timestamp: new Date(1700000000000 + 51 * 1000).toISOString(),
        type: "REPLAY_SUCCESS",
        entityType: "note",
        mutationId: "mut-51",
      };

      const result = appendTelemetryEvent(events, overflowEvent, 50);
      expect(result).toHaveLength(50);
      expect(result[0].id).toBe("evt-2"); // evt-1 evicted
      expect(result[49].id).toBe("evt-51");
    });

    it("1.3. calculateSyncTelemetryStats calculates aggregate counts and success rate correctly", () => {
      const events: SyncTelemetryEvent[] = [
        {
          id: "1",
          timestamp: "2026-08-28T12:00:00Z",
          type: "MUTATION_ENQUEUED",
          entityType: "topic",
        },
        {
          id: "2",
          timestamp: "2026-08-28T12:00:01Z",
          type: "REPLAY_SUCCESS",
          entityType: "topic",
        },
        {
          id: "3",
          timestamp: "2026-08-28T12:00:02Z",
          type: "REPLAY_SUCCESS",
          entityType: "topic",
        },
        {
          id: "4",
          timestamp: "2026-08-28T12:00:03Z",
          type: "REPLAY_FAILED",
          entityType: "topic",
          error: "HTTP 500",
        },
        {
          id: "5",
          timestamp: "2026-08-28T12:00:04Z",
          type: "MUTATION_ENQUEUED",
          entityType: "note",
        },
        {
          id: "6",
          timestamp: "2026-08-28T12:00:05Z",
          type: "REPLAY_SUCCESS",
          entityType: "note",
        },
        {
          id: "7",
          timestamp: "2026-08-28T12:00:06Z",
          type: "MUTATION_DISCARDED",
          entityType: "resource",
        },
        {
          id: "8",
          timestamp: "2026-08-28T12:00:07Z",
          type: "QUEUE_FLUSH_COMPLETED",
          metadata: { syncedCount: 3, failedCount: 1 },
        },
      ];

      const stats = calculateSyncTelemetryStats(events);
      expect(stats.totalEvents).toBe(8);
      expect(stats.enqueuedCount).toBe(2);
      expect(stats.successCount).toBe(3);
      expect(stats.failureCount).toBe(1);
      expect(stats.discardedCount).toBe(1);

      // Success rate: 3 successes out of (3 + 1) attempts = 75%
      expect(stats.successRate).toBe(75);

      // By Entity Type
      expect(stats.byEntityType.topic.success).toBe(2);
      expect(stats.byEntityType.topic.failure).toBe(1);
      expect(stats.byEntityType.note.success).toBe(1);
      expect(stats.byEntityType.note.failure).toBe(0);
      expect(stats.byEntityType.resource.discarded).toBe(1);
    });

    it("1.4. handles empty events array and missing optional fields safely", () => {
      const emptyStats = calculateSyncTelemetryStats([]);
      expect(emptyStats.totalEvents).toBe(0);
      expect(emptyStats.successRate).toBe(0);
      expect(emptyStats.byEntityType).toEqual({});

      const partialEvents: SyncTelemetryEvent[] = [
        {
          id: "p1",
          timestamp: "2026-08-28T12:00:00Z",
          type: "MUTATION_ENQUEUED",
        },
      ];
      const partialStats = calculateSyncTelemetryStats(partialEvents);
      expect(partialStats.totalEvents).toBe(1);
      expect(partialStats.enqueuedCount).toBe(1);
    });

    it("1.5. serializes and deserializes telemetry events safely", () => {
      const events: SyncTelemetryEvent[] = [
        {
          id: "evt-10",
          timestamp: "2026-08-28T12:00:00Z",
          type: "REPLAY_SUCCESS",
          entityType: "studyProgress",
        },
      ];

      const raw = serializeTelemetryEvents(events);
      expect(typeof raw).toBe("string");

      const parsed = deserializeTelemetryEvents(raw);
      expect(parsed).toEqual(events);

      expect(deserializeTelemetryEvents(null)).toEqual([]);
      expect(deserializeTelemetryEvents("invalid-json{")).toEqual([]);
    });
  });

  // ─── 2. Service Telemetry Integration ─────────────────────────────────────

  describe("2. SyncQueueService Telemetry Integration", () => {
    const sampleMutation: SyncMutation = {
      id: "mut-telemetry-1",
      entityType: "topic",
      action: "save",
      entityId: "top-123",
      payload: { title: "Topic 123" },
      clientTimestamp: "2026-08-28T12:00:00.000Z",
      retryCount: 0,
      status: "pending",
    };

    it("2.1. records MUTATION_ENQUEUED event upon enqueue", () => {
      service.enqueue(sampleMutation);

      const events = service.getTelemetryEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("MUTATION_ENQUEUED");
      expect(events[0].entityType).toBe("topic");
      expect(events[0].entityId).toBe("top-123");
      expect(events[0].mutationId).toBe("mut-telemetry-1");
    });

    it("2.2. records REPLAY_SUCCESS and QUEUE_FLUSH_COMPLETED when replay succeeds", async () => {
      service.enqueue(sampleMutation);

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }))
      );

      await service.flushQueue("http://localhost:3000");

      const events = service.getTelemetryEvents();
      const types = events.map((e) => e.type);

      expect(types).toContain("MUTATION_ENQUEUED");
      expect(types).toContain("REPLAY_SUCCESS");
      expect(types).toContain("QUEUE_FLUSH_COMPLETED");

      const stats = service.getTelemetryStats();
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it("2.3. records REPLAY_FAILED when replay encounters an error", async () => {
      service.enqueue(sampleMutation);

      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("Network connection reset")
      );

      await service.flushQueue("http://localhost:3000");

      const events = service.getTelemetryEvents();
      const failedEvt = events.find((e) => e.type === "REPLAY_FAILED");

      expect(failedEvt).toBeDefined();
      expect(failedEvt?.error).toContain("Network connection reset");
      expect(failedEvt?.entityType).toBe("topic");

      const stats = service.getTelemetryStats();
      expect(stats.failureCount).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it("2.4. records MUTATION_DISCARDED when discardFailedMutation is executed", () => {
      service.enqueue({
        ...sampleMutation,
        id: "mut-to-discard",
        status: "failed",
        retryCount: 3,
      });

      service.discard("mut-to-discard");

      const events = service.getTelemetryEvents();
      const discardEvt = events.find((e) => e.type === "MUTATION_DISCARDED");

      expect(discardEvt).toBeDefined();
      expect(discardEvt?.mutationId).toBe("mut-to-discard");
      expect(discardEvt?.entityType).toBe("topic");
    });

    it("2.5. ensures telemetry write errors do not break core sync queue operations", () => {
      // Simulate storage setItem throwing an error specifically for telemetry
      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, val) => {
        if (key.includes("telemetry")) {
          throw new Error("QuotaExceededError: storage full");
        }
        return originalSetItem(key, val);
      });

      // Core operations must not throw
      expect(() => {
        service.enqueue(sampleMutation);
      }).not.toThrow();

      expect(service.getQueue()).toHaveLength(1);
    });
  });
});
