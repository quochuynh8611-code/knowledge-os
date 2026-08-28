import {
  type SyncMutation,
  enqueueMutation,
  dequeueMutation,
  markMutationFailed,
  serializeSyncQueue,
  deserializeSyncQueue,
  isMutationEligibleForReplay,
} from "../lib/syncQueue";
import {
  type SyncTelemetryEvent,
  type SyncTelemetryStats,
  appendTelemetryEvent,
  calculateSyncTelemetryStats,
  serializeTelemetryEvents,
  deserializeTelemetryEvents,
} from "../lib/syncTelemetry";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from "../lib/storage";

export interface FlushResult {
  syncedCount: number;
  failedCount: number;
}

export interface FlushOptions {
  bypassBackoff?: boolean;
}

export class SyncQueueService {
  private storageKey: string;
  private telemetryStorageKey: string;
  private isFlushing = false;
  private listeners: Array<() => void> = [];

  constructor(
    storageKey = "phat_hoc_huyen_hoc_sync_queue",
    telemetryStorageKey?: string
  ) {
    this.storageKey = storageKey;
    this.telemetryStorageKey =
      telemetryStorageKey ??
      (storageKey === "phat_hoc_huyen_hoc_sync_queue"
        ? "phat_hoc_huyen_hoc_sync_telemetry"
        : `${storageKey}_telemetry`);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Safe subscriber execution
      }
    }
  }

  getIsFlushing(): boolean {
    return this.isFlushing;
  }

  getQueue(): SyncMutation[] {
    const raw = safeGetLocalStorageItem(this.storageKey);
    return deserializeSyncQueue(raw);
  }

  private saveQueue(queue: SyncMutation[]): void {
    const serialized = serializeSyncQueue(queue);
    safeSetLocalStorageItem(this.storageKey, serialized);
    this.notifyListeners();
  }

  // ─── Telemetry Storage & Query Helpers ─────────────────────────────────────

  getTelemetryEvents(): SyncTelemetryEvent[] {
    try {
      const raw = safeGetLocalStorageItem(this.telemetryStorageKey);
      return deserializeTelemetryEvents(raw);
    } catch {
      return [];
    }
  }

  getTelemetryStats(): SyncTelemetryStats {
    const events = this.getTelemetryEvents();
    return calculateSyncTelemetryStats(events);
  }

  private recordTelemetryEvent(
    type: SyncTelemetryEvent["type"],
    details?: Partial<Omit<SyncTelemetryEvent, "id" | "timestamp" | "type">>
  ): void {
    try {
      const currentEvents = this.getTelemetryEvents();
      const newEvent: SyncTelemetryEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        type,
        ...details,
      };
      const updated = appendTelemetryEvent(currentEvents, newEvent, 50);
      const serialized = serializeTelemetryEvents(updated);
      safeSetLocalStorageItem(this.telemetryStorageKey, serialized);
    } catch {
      // Fault-tolerant: telemetry write errors are safely swallowed
    }
  }

  enqueue(mutation: SyncMutation): void {
    const queue = this.getQueue();
    const updated = enqueueMutation(queue, mutation);
    this.saveQueue(updated);
    this.recordTelemetryEvent("MUTATION_ENQUEUED", {
      mutationId: mutation.id,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      action: mutation.action,
    });
  }

  remove(mutationId: string): void {
    const queue = this.getQueue();
    const updated = dequeueMutation(queue, mutationId);
    this.saveQueue(updated);
  }

  discard(mutationId: string): boolean {
    const queue = this.getQueue();
    const target = queue.find((m) => m.id === mutationId);
    if (!target) {
      return false;
    }
    this.remove(mutationId);
    this.recordTelemetryEvent("MUTATION_DISCARDED", {
      mutationId: target.id,
      entityType: target.entityType,
      entityId: target.entityId,
      action: target.action,
      retryCount: target.retryCount,
    });
    return true;
  }

  markFailed(mutationId: string, error?: string): void {
    const queue = this.getQueue();
    const updated = markMutationFailed(queue, mutationId, error);
    this.saveQueue(updated);
  }

  /**
   * Replays pending mutations in FIFO order against REST API endpoints.
   * Respects exponential backoff delay unless bypassBackoff is set to true.
   */
  async flushQueue(
    apiBaseUrl = "/api",
    options?: FlushOptions
  ): Promise<FlushResult> {
    if (this.isFlushing) {
      return { syncedCount: 0, failedCount: 0 };
    }
    this.isFlushing = true;
    this.notifyListeners();
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = this.getQueue();
      const now = Date.now();
      for (const mutation of queue) {
        if (
          !isMutationEligibleForReplay(
            mutation,
            now,
            options?.bypassBackoff
          )
        ) {
          break; // Stop FIFO replay when head mutation is in backoff cooldown
        }

        try {
          const success = await this.replayMutation(mutation, apiBaseUrl);
          if (success) {
            this.remove(mutation.id);
            syncedCount++;
            this.recordTelemetryEvent("REPLAY_SUCCESS", {
              mutationId: mutation.id,
              entityType: mutation.entityType,
              entityId: mutation.entityId,
              action: mutation.action,
            });
          } else {
            this.markFailed(mutation.id, "HTTP error during replay");
            failedCount++;
            this.recordTelemetryEvent("REPLAY_FAILED", {
              mutationId: mutation.id,
              entityType: mutation.entityType,
              entityId: mutation.entityId,
              action: mutation.action,
              retryCount: mutation.retryCount + 1,
              error: "HTTP error during replay",
            });
            break; // Stop FIFO replay on first network failure to preserve order
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Replay failure";
          this.markFailed(mutation.id, msg);
          failedCount++;
          this.recordTelemetryEvent("REPLAY_FAILED", {
            mutationId: mutation.id,
            entityType: mutation.entityType,
            entityId: mutation.entityId,
            action: mutation.action,
            retryCount: mutation.retryCount + 1,
            error: msg,
          });
          break;
        }
      }
    } finally {
      this.isFlushing = false;
      this.notifyListeners();
      this.recordTelemetryEvent("QUEUE_FLUSH_COMPLETED", {
        metadata: { syncedCount, failedCount },
      });
    }

    return { syncedCount, failedCount };
  }

  private async replayMutation(
    mutation: SyncMutation,
    apiBaseUrl: string
  ): Promise<boolean> {
    const origin =
      typeof window !== "undefined" &&
      window.location &&
      window.location.origin &&
      window.location.origin.startsWith("http")
        ? window.location.origin
        : "";

    if (mutation.entityType === "category") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/categories`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
        return res.ok;
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/categories/${encodeURIComponent(mutation.entityId)}`;
        const res = await fetch(url, {
          method: "DELETE",
        });
        return res.ok;
      }
    }

    if (mutation.entityType === "topic") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/topics`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
        return res.ok;
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/topics/${encodeURIComponent(mutation.entityId)}`;
        const res = await fetch(url, {
          method: "DELETE",
        });
        return res.ok;
      }
    }

    if (mutation.entityType === "note") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/notes`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
        return res.ok;
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/notes/${encodeURIComponent(mutation.entityId)}`;
        const res = await fetch(url, {
          method: "DELETE",
        });
        return res.ok;
      }
    }

    if (mutation.entityType === "resource") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/resources`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
        return res.ok;
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/resources/${encodeURIComponent(mutation.entityId)}`;
        const res = await fetch(url, {
          method: "DELETE",
        });
        return res.ok;
      }
    }

    if (mutation.entityType === "studyProgress") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/study-progress`;
        const payload = {
          topicId: mutation.payload.topicId || mutation.entityId,
          quality: typeof mutation.payload.quality === "number" ? mutation.payload.quality : 4,
          triggerReason: mutation.payload.triggerReason || "offline_replayed",
        };
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return res.ok;
      }
    }

    return false;
  }

  listenForOnlineEvents(apiBaseUrl = "/api"): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    const handler = () => {
      this.flushQueue(apiBaseUrl).catch(() => {});
    };

    window.addEventListener("online", handler);
    return () => {
      window.removeEventListener("online", handler);
    };
  }
}
