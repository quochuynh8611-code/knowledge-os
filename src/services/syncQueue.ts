import {
  type SyncMutation,
  enqueueMutation,
  dequeueMutation,
  markMutationFailed,
  serializeSyncQueue,
  deserializeSyncQueue,
  isMutationEligibleForReplay,
  pruneExhaustedFailedMutations,
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
  private handleStorageEvent?: (event: StorageEvent) => void;

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

    if (typeof window !== "undefined") {
      this.handleStorageEvent = (event: StorageEvent) => {
        if (
          event.key === this.storageKey ||
          event.key === this.telemetryStorageKey
        ) {
          this.notifyListeners();
        }
      };
      window.addEventListener("storage", this.handleStorageEvent);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  destroy(): void {
    if (typeof window !== "undefined" && this.handleStorageEvent) {
      window.removeEventListener("storage", this.handleStorageEvent);
      this.handleStorageEvent = undefined;
    }
    this.listeners = [];
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

  private saveQueue(queue: SyncMutation[]): boolean {
    const serialized = serializeSyncQueue(queue);
    const success = safeSetLocalStorageItem(this.storageKey, serialized);
    if (success) {
      this.notifyListeners();
      return true;
    }

    // Tier 1: Trim telemetry log down to 5 events to reclaim space, then retry
    try {
      const telemetryEvents = this.getTelemetryEvents();
      if (telemetryEvents.length > 5) {
        const trimmed = telemetryEvents.slice(telemetryEvents.length - 5);
        safeSetLocalStorageItem(
          this.telemetryStorageKey,
          serializeTelemetryEvents(trimmed)
        );
      }
    } catch {
      // Ignore telemetry trim errors
    }

    const tier1RetrySuccess = safeSetLocalStorageItem(
      this.storageKey,
      serialized
    );
    if (tier1RetrySuccess) {
      this.notifyListeners();
      return true;
    }

    // Tier 2: Prune exhausted failed mutations (retryCount >= 10) and retry
    const prunedQueue = pruneExhaustedFailedMutations(queue, 10);
    if (prunedQueue.length < queue.length) {
      const prunedSerialized = serializeSyncQueue(prunedQueue);
      const tier2RetrySuccess = safeSetLocalStorageItem(
        this.storageKey,
        prunedSerialized
      );
      if (tier2RetrySuccess) {
        this.notifyListeners();
        return true;
      }
    }

    // Tier 3: All recovery tiers failed, return false without corrupting previous storage
    return false;
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

  enqueue(mutation: SyncMutation): boolean {
    const queue = this.getQueue();
    const updated = enqueueMutation(queue, mutation);
    const saved = this.saveQueue(updated);
    if (saved) {
      this.recordTelemetryEvent("MUTATION_ENQUEUED", {
        mutationId: mutation.id,
        entityType: mutation.entityType,
        entityId: mutation.entityId,
        action: mutation.action,
        retryCount: mutation.retryCount,
      });
    }
    return saved;
  }

  remove(mutationId: string): void {
    const queue = this.getQueue();
    const updated = dequeueMutation(queue, mutationId);
    this.saveQueue(updated);
  }

  discard(mutationId: string): boolean {
    const queue = this.getQueue();
    const target = queue.find((m) => m.id === mutationId);
    if (!target || target.status !== "failed") {
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
        // Pre-replay existence guard: skip if mutation was already dequeued by another tab
        const currentQueue = this.getQueue();
        if (!currentQueue.some((m) => m.id === mutation.id)) {
          continue;
        }

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
