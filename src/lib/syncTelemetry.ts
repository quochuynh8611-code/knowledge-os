/**
 * Pure Telemetry & Observability Helper Functions for Offline Sync Queue
 *
 * All functions are pure, deterministic, and free of side-effects.
 */

import type { SyncMutation } from "./syncQueue";

export type SyncTelemetryEventType =
  | "MUTATION_ENQUEUED"
  | "REPLAY_SUCCESS"
  | "REPLAY_FAILED"
  | "MUTATION_DISCARDED"
  | "QUEUE_FLUSH_COMPLETED";

export interface SyncTelemetryEvent {
  id: string;
  timestamp: string; // ISO string
  type: SyncTelemetryEventType;
  entityType?: SyncMutation["entityType"];
  mutationId?: string;
  entityId?: string;
  action?: "save" | "delete";
  retryCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface EntityTypeTelemetryStats {
  success: number;
  failure: number;
  discarded: number;
}

export interface SyncTelemetryStats {
  totalEvents: number;
  enqueuedCount: number;
  successCount: number;
  failureCount: number;
  discardedCount: number;
  byEntityType: Partial<Record<SyncMutation["entityType"], EntityTypeTelemetryStats>>;
  successRate: number; // 0 - 100 (%)
}

/**
 * Appends a new telemetry event to the log array, enforcing a rolling buffer of maxEvents (FIFO eviction).
 */
export function appendTelemetryEvent(
  events: SyncTelemetryEvent[],
  newEvent: SyncTelemetryEvent,
  maxEvents = 50
): SyncTelemetryEvent[] {
  const updated = [...events, newEvent];
  if (updated.length > maxEvents) {
    return updated.slice(updated.length - maxEvents);
  }
  return updated;
}

/**
 * Calculates aggregate sync metrics from an array of telemetry events.
 * Success rate is computed based strictly on replay outcomes: success / (success + failure).
 */
export function calculateSyncTelemetryStats(
  events: SyncTelemetryEvent[]
): SyncTelemetryStats {
  let enqueuedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  let discardedCount = 0;
  const byEntityType: Partial<
    Record<SyncMutation["entityType"], EntityTypeTelemetryStats>
  > = {};

  const ensureEntity = (type?: SyncMutation["entityType"]) => {
    if (!type) return null;
    if (!byEntityType[type]) {
      byEntityType[type] = { success: 0, failure: 0, discarded: 0 };
    }
    return byEntityType[type];
  };

  for (const evt of events) {
    const entityStats = ensureEntity(evt.entityType);

    switch (evt.type) {
      case "MUTATION_ENQUEUED":
        enqueuedCount++;
        break;
      case "REPLAY_SUCCESS":
        successCount++;
        if (entityStats) entityStats.success++;
        break;
      case "REPLAY_FAILED":
        failureCount++;
        if (entityStats) entityStats.failure++;
        break;
      case "MUTATION_DISCARDED":
        discardedCount++;
        if (entityStats) entityStats.discarded++;
        break;
      case "QUEUE_FLUSH_COMPLETED":
        // Batch flush marker
        break;
    }
  }

  const totalReplayAttempts = successCount + failureCount;
  const successRate =
    totalReplayAttempts > 0
      ? Math.round((successCount / totalReplayAttempts) * 10000) / 100
      : 0;

  return {
    totalEvents: events.length,
    enqueuedCount,
    successCount,
    failureCount,
    discardedCount,
    byEntityType,
    successRate,
  };
}

/**
 * Serializes an array of telemetry events into a JSON string.
 */
export function serializeTelemetryEvents(events: SyncTelemetryEvent[]): string {
  return JSON.stringify(events);
}

/**
 * Safely deserializes a JSON string into a typed SyncTelemetryEvent array.
 * Returns an empty array if raw string is null, empty, or invalid.
 */
export function deserializeTelemetryEvents(
  raw: string | null | undefined
): SyncTelemetryEvent[] {
  if (!raw || typeof raw !== "string") {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

// ─── Health Rules & Alerting Read Model ────────────────────────────────────

export type SyncHealthLevel = "healthy" | "degraded" | "critical" | "unknown";

export interface SyncHealthReport {
  level: SyncHealthLevel;
  label: string;
  score: number; // 0 - 100
  reasons: string[];
  summary: string;
  activeFailures: number;
  successRate: number;
}

/**
 * Pure deterministic sync health evaluator.
 * Evaluates queue state and telemetry statistics to produce a structured health report.
 */
export function evaluateSyncHealth(
  queue: Array<Pick<SyncMutation, "status" | "retryCount">>,
  telemetryStats: SyncTelemetryStats,
  _telemetryEvents?: SyncTelemetryEvent[]
): SyncHealthReport {
  const activeFailures = queue.filter((m) => m.status === "failed").length;
  const hasExhaustedRetry = queue.some(
    (m) =>
      m.status === "failed" &&
      typeof m.retryCount === "number" &&
      m.retryCount >= 5
  );
  const totalReplayAttempts =
    telemetryStats.successCount + telemetryStats.failureCount;
  const hasSufficientSamples = totalReplayAttempts >= 3;
  const successRate = telemetryStats.successRate;

  // 1. Unknown
  if (queue.length === 0 && telemetryStats.totalEvents === 0) {
    return {
      level: "unknown",
      label: "Chưa có dữ liệu",
      score: 100,
      reasons: ["Chưa phát sinh hoạt động đồng bộ nào"],
      summary: "Chưa có dữ liệu đồng bộ",
      activeFailures: 0,
      successRate: 0,
    };
  }

  // 2. Critical
  if (
    hasExhaustedRetry ||
    activeFailures >= 5 ||
    (hasSufficientSamples && successRate < 50)
  ) {
    const reasons: string[] = [];
    if (hasExhaustedRetry) {
      reasons.push(
        "Có đột biến bị lỗi lặp lại nhiều lần (vượt ngưỡng thử lại 5 lần)"
      );
    }
    if (activeFailures >= 5) {
      reasons.push(`Có ${activeFailures} lỗi đồng bộ đang bị tắc nghẽn`);
    }
    if (hasSufficientSamples && successRate < 50) {
      reasons.push(`Tỉ lệ đồng bộ thành công thấp (${successRate}%)`);
    }

    return {
      level: "critical",
      label: "Lỗi nghiêm trọng",
      score: Math.max(0, Math.min(40, successRate)),
      reasons,
      summary: "Hàng đợi đồng bộ gặp sự cố nghiêm trọng",
      activeFailures,
      successRate,
    };
  }

  // 3. Degraded
  if (activeFailures > 0 || (hasSufficientSamples && successRate < 90)) {
    const reasons: string[] = [];
    if (activeFailures > 0) {
      reasons.push(`Đang có ${activeFailures} lỗi chờ thử lại theo backoff`);
    }
    if (hasSufficientSamples && successRate < 90) {
      reasons.push(`Tỉ lệ đồng bộ thành công đạt ${successRate}%`);
    }

    return {
      level: "degraded",
      label: "Gián đoạn nhẹ",
      score: Math.max(50, Math.min(85, successRate || 70)),
      reasons,
      summary: "Đang có đột biến gián đoạn chờ thử lại",
      activeFailures,
      successRate,
    };
  }

  // 4. Healthy
  return {
    level: "healthy",
    label: "Hoạt động tốt",
    score: 100,
    reasons: ["Toàn bộ dữ liệu đồng bộ an toàn"],
    summary: "Hoạt động đồng bộ diễn ra bình thường",
    activeFailures: 0,
    successRate,
  };
}
