import {
  type SyncMutation,
  enqueueMutation,
  dequeueMutation,
  markMutationFailed,
  serializeSyncQueue,
  deserializeSyncQueue,
} from "../lib/syncQueue";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
} from "../lib/storage";

export interface FlushResult {
  syncedCount: number;
  failedCount: number;
}

export class SyncQueueService {
  private storageKey: string;
  private isFlushing = false;

  constructor(storageKey = "phat_hoc_huyen_hoc_sync_queue") {
    this.storageKey = storageKey;
  }

  getQueue(): SyncMutation[] {
    const raw = safeGetLocalStorageItem(this.storageKey);
    return deserializeSyncQueue(raw);
  }

  private saveQueue(queue: SyncMutation[]): void {
    const serialized = serializeSyncQueue(queue);
    safeSetLocalStorageItem(this.storageKey, serialized);
  }

  enqueue(mutation: SyncMutation): void {
    const queue = this.getQueue();
    const updated = enqueueMutation(queue, mutation);
    this.saveQueue(updated);
  }

  remove(mutationId: string): void {
    const queue = this.getQueue();
    const updated = dequeueMutation(queue, mutationId);
    this.saveQueue(updated);
  }

  markFailed(mutationId: string, error?: string): void {
    const queue = this.getQueue();
    const updated = markMutationFailed(queue, mutationId, error);
    this.saveQueue(updated);
  }

  /**
   * Replays pending mutations in FIFO order against REST API endpoints.
   */
  async flushQueue(apiBaseUrl = "/api"): Promise<FlushResult> {
    if (this.isFlushing) {
      return { syncedCount: 0, failedCount: 0 };
    }
    this.isFlushing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = this.getQueue();
      for (const mutation of queue) {
        try {
          const success = await this.replayMutation(mutation, apiBaseUrl);
          if (success) {
            this.remove(mutation.id);
            syncedCount++;
          } else {
            this.markFailed(mutation.id, "HTTP error during replay");
            failedCount++;
            break; // Stop FIFO replay on first network failure to preserve order
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Replay failure";
          this.markFailed(mutation.id, msg);
          failedCount++;
          break;
        }
      }
    } finally {
      this.isFlushing = false;
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
