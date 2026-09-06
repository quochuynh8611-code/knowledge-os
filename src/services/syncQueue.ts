import {
  type SyncMutation,
  DEFAULT_MAX_RETRY_COUNT,
  isPermanentHttpStatus,
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
    if (!target || (target.status !== "failed" && target.status !== "exhausted")) {
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

  markFailed(
    mutationId: string,
    error?: string,
    options?: {
      isPermanent?: boolean;
      httpStatus?: number;
      maxRetries?: number;
    }
  ): void {
    const queue = this.getQueue();
    const updated = markMutationFailed(queue, mutationId, error, options);
    this.saveQueue(updated);
  }

  /**
   * Replays pending mutations in FIFO order against REST API endpoints.
   * Respects exponential backoff delay unless bypassBackoff is set to true.
   * Does not block FIFO on permanent errors or exhausted mutations.
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
          // If mutation is permanently broken or exhausted, skip it so valid mutations behind it can replay
          if (
            mutation.status === "exhausted" ||
            mutation.isPermanent ||
            mutation.retryCount >= DEFAULT_MAX_RETRY_COUNT
          ) {
            continue;
          }
          break; // Stop FIFO replay when head mutation is in transient backoff cooldown
        }

        try {
          const result = await this.replayMutation(mutation, apiBaseUrl);
          if (result.success) {
            this.remove(mutation.id);
            syncedCount++;
            this.recordTelemetryEvent("REPLAY_SUCCESS", {
              mutationId: mutation.id,
              entityType: mutation.entityType,
              entityId: mutation.entityId,
              action: mutation.action,
            });
          } else {
            const errorMsg = result.error || "HTTP error during replay";
            this.markFailed(mutation.id, errorMsg, {
              isPermanent: result.isPermanent,
              httpStatus: result.httpStatus,
            });
            failedCount++;
            this.recordTelemetryEvent("REPLAY_FAILED", {
              mutationId: mutation.id,
              entityType: mutation.entityType,
              entityId: mutation.entityId,
              action: mutation.action,
              retryCount: mutation.retryCount + 1,
              error: errorMsg,
            });

            // If error is permanent (client validation, conflict, 4xx), continue to next mutation without blocking
            if (result.isPermanent) {
              continue;
            }
            break; // Stop FIFO replay on transient failure to preserve order
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

  private async executeReplayRequest(
    url: string,
    options: RequestInit
  ): Promise<{
    success: boolean;
    error?: string;
    isPermanent?: boolean;
    httpStatus?: number;
  }> {
    const res = await fetch(url, options);
    if (res.ok) {
      return { success: true, httpStatus: res.status };
    }

    // Idempotent DELETE completion: if request was DELETE and server responds with 404 (Not Found) or 410 (Gone),
    // the target entity does not exist on the server, which is the exact desired state of deletion.
    if (options.method === "DELETE" && (res.status === 404 || res.status === 410)) {
      return { success: true, httpStatus: res.status };
    }

    let errorDetail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data === "object") {
        if (typeof data.error === "string") {
          errorDetail = data.error;
        } else if (Array.isArray(data.error)) {
          errorDetail = data.error
            .map((i: any) => i.message || (i.path ? i.path.join(".") : ""))
            .filter(Boolean)
            .join("; ");
        }
      }
    } catch {
      // Body not JSON, keep status code
    }

    const isPermanent = isPermanentHttpStatus(res.status);
    return {
      success: false,
      error: errorDetail,
      isPermanent,
      httpStatus: res.status,
    };
  }

  private async replayMutation(
    mutation: SyncMutation,
    apiBaseUrl: string
  ): Promise<{
    success: boolean;
    error?: string;
    isPermanent?: boolean;
    httpStatus?: number;
  }> {
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
        return this.executeReplayRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/categories/${encodeURIComponent(mutation.entityId)}`;
        return this.executeReplayRequest(url, {
          method: "DELETE",
        });
      }
    }

    if (mutation.entityType === "topic") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/topics`;
        return this.executeReplayRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/topics/${encodeURIComponent(mutation.entityId)}`;
        return this.executeReplayRequest(url, {
          method: "DELETE",
        });
      }
    }

    if (mutation.entityType === "note") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/notes`;
        return this.executeReplayRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/notes/${encodeURIComponent(mutation.entityId)}`;
        return this.executeReplayRequest(url, {
          method: "DELETE",
        });
      }
    }

    if (mutation.entityType === "resource") {
      if (mutation.action === "save" && mutation.payload) {
        const url = `${origin}${apiBaseUrl}/resources`;
        return this.executeReplayRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });
      }
      if (mutation.action === "delete") {
        const url = `${origin}${apiBaseUrl}/resources/${encodeURIComponent(mutation.entityId)}`;
        return this.executeReplayRequest(url, {
          method: "DELETE",
        });
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
        return this.executeReplayRequest(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    }

    return { success: false, error: "Unsupported mutation type", isPermanent: true };
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
