/**
 * Pure Telemetry & Observability Helper Functions for Offline Sync Queue
 *
 * All functions are pure, deterministic, and free of side-effects.
 */

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
  entityType?: "category" | "topic" | "note" | "resource" | "studyProgress";
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
  byEntityType: Record<string, EntityTypeTelemetryStats>;
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
  const byEntityType: Record<string, EntityTypeTelemetryStats> = {};

  const ensureEntity = (type?: string) => {
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
