import { describe, it, expect } from "vitest";
import {
  evaluateSyncHealth,
  type SyncHealthReport,
  type SyncHealthLevel,
  type SyncTelemetryStats,
} from "../../src/lib/syncTelemetry";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P3.0 — Sync Health Rules & Alerting Read Model", () => {
  const emptyStats: SyncTelemetryStats = {
    totalEvents: 0,
    enqueuedCount: 0,
    successCount: 0,
    failureCount: 0,
    discardedCount: 0,
    byEntityType: {},
    successRate: 0,
  };

  // ─── 1. Unknown Status ───────────────────────────────────────────────────

  it("1.1. returns 'unknown' when queue is empty and no sync telemetry exists", () => {
    const report = evaluateSyncHealth([], emptyStats);
    expect(report.level).toBe("unknown");
    expect(report.label).toBe("Chưa có dữ liệu");
    expect(report.activeFailures).toBe(0);
  });

  // ─── 2. Healthy Status ───────────────────────────────────────────────────

  it("2.1. returns 'healthy' when queue is clean even after historical replay failures", () => {
    const historicalStats: SyncTelemetryStats = {
      totalEvents: 20,
      enqueuedCount: 10,
      successCount: 9,
      failureCount: 1,
      discardedCount: 0,
      byEntityType: {},
      successRate: 90,
    };

    // Queue has 0 failed mutations (everything was synced or resolved)
    const report = evaluateSyncHealth([], historicalStats);
    expect(report.level).toBe("healthy");
    expect(report.label).toBe("Hoạt động tốt");
    expect(report.summary).toContain("bình thường");
    expect(report.activeFailures).toBe(0);
  });

  // ─── 3. Degraded Status ──────────────────────────────────────────────────

  it("3.1. returns 'degraded' when queue contains 2 active failed mutations waiting for retry", () => {
    const queue: SyncMutation[] = [
      {
        id: "mut-f-1",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        clientTimestamp: "2026-08-28T12:00:00Z",
        retryCount: 1,
        status: "failed",
      },
      {
        id: "mut-f-2",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: "2026-08-28T12:00:00Z",
        retryCount: 2,
        status: "failed",
      },
    ];

    const stats: SyncTelemetryStats = {
      totalEvents: 10,
      enqueuedCount: 5,
      successCount: 3,
      failureCount: 2,
      discardedCount: 0,
      byEntityType: {},
      successRate: 60,
    };

    const report = evaluateSyncHealth(queue, stats);
    expect(report.level).toBe("degraded");
    expect(report.label).toBe("Gián đoạn nhẹ");
    expect(report.activeFailures).toBe(2);
    expect(report.reasons.some((r) => r.includes("2 lỗi"))).toBe(true);
  });

  // ─── 4. Critical Status (Poison-Pill / Retry Exhaustion) ──────────────────

  it("4.1. returns 'critical' when any mutation reaches retryCount >= 5", () => {
    const queue: SyncMutation[] = [
      {
        id: "mut-poison",
        entityType: "topic",
        action: "save",
        entityId: "top-poison-1",
        clientTimestamp: "2026-08-28T12:00:00Z",
        retryCount: 5, // Threshold for poison-pill
        status: "failed",
        lastError: "Invalid JSON schema response from backend",
      },
    ];

    const stats: SyncTelemetryStats = {
      totalEvents: 10,
      enqueuedCount: 5,
      successCount: 4,
      failureCount: 1,
      discardedCount: 0,
      byEntityType: {},
      successRate: 80,
    };

    const report = evaluateSyncHealth(queue, stats);
    expect(report.level).toBe("critical");
    expect(report.label).toBe("Lỗi nghiêm trọng");
    expect(
      report.reasons.some(
        (r) => r.includes("thử lại") || r.includes("vượt ngưỡng")
      )
    ).toBe(true);
  });

  // ─── 5. Small Sample Guard (< 3 attempts) ─────────────────────────────────

  it("5.1. does not trigger percentage-based critical rule when total attempts < 3", () => {
    // 1 attempt total (1 failure, 0 success -> successRate = 0%)
    const smallSampleStats: SyncTelemetryStats = {
      totalEvents: 2,
      enqueuedCount: 1,
      successCount: 0,
      failureCount: 1,
      discardedCount: 0,
      byEntityType: {},
      successRate: 0,
    };

    const queue: SyncMutation[] = [
      {
        id: "mut-1",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        clientTimestamp: "2026-08-28T12:00:00Z",
        retryCount: 1,
        status: "failed",
      },
    ];

    const report = evaluateSyncHealth(queue, smallSampleStats);
    // Because retryCount < 5 and failedCount < 5, it should be "degraded" rather than "critical"
    expect(report.level).toBe("degraded");
  });
});
