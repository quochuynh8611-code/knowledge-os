/**
 * Pure Sync Queue Helper Functions for Offline Mutation Management
 *
 * All functions are pure, deterministic, and free of side-effects.
 */

export interface SyncMutation {
  id: string;
  entityType: "category" | "topic" | "note" | "resource" | "studyProgress";
  action: "save" | "delete";
  entityId: string;
  payload?: any;
  clientTimestamp: string;
  retryCount: number;
  status: "pending" | "processing" | "failed";
  lastError?: string;
}

/**
 * Enqueues a new mutation into the queue with coalescing & compaction rules:
 * - If a prior mutation exists for the same (entityType, entityId):
 *   - save -> save: coalesces and keeps the latest payload and timestamp.
 *   - save -> delete: compacts into a single delete mutation.
 */
export function enqueueMutation(
  queue: SyncMutation[],
  newMutation: SyncMutation
): SyncMutation[] {
  const existingIdx = queue.findIndex(
    (m) =>
      m.entityType === newMutation.entityType &&
      m.entityId === newMutation.entityId
  );

  if (existingIdx === -1) {
    return [...queue, newMutation];
  }

  const updatedQueue = [...queue];
  const existing = updatedQueue[existingIdx];

  // If new action is delete, it supersedes any prior save
  if (newMutation.action === "delete") {
    updatedQueue[existingIdx] = newMutation;
    return updatedQueue;
  }

  // If both are save, coalesce and keep latest payload & timestamp
  if (existing.action === "save" && newMutation.action === "save") {
    updatedQueue[existingIdx] = {
      ...existing,
      ...newMutation,
      retryCount: 0,
      status: "pending",
    };
    return updatedQueue;
  }

  // Fallback: replace with new mutation
  updatedQueue[existingIdx] = newMutation;
  return updatedQueue;
}

/**
 * Dequeues a completed mutation from the queue by ID.
 */
export function dequeueMutation(
  queue: SyncMutation[],
  mutationId: string
): SyncMutation[] {
  return queue.filter((m) => m.id !== mutationId);
}

/**
 * Marks a mutation as failed, increments its retry count, and records the error message.
 */
export function markMutationFailed(
  queue: SyncMutation[],
  mutationId: string,
  error?: string
): SyncMutation[] {
  return queue.map((m) => {
    if (m.id === mutationId) {
      return {
        ...m,
        retryCount: m.retryCount + 1,
        status: "failed",
        lastError: error,
      };
    }
    return m;
  });
}

/**
 * Serializes the sync queue into a JSON string.
 */
export function serializeSyncQueue(queue: SyncMutation[]): string {
  return JSON.stringify(queue);
}

/**
 * Safely deserializes a JSON string into a typed SyncMutation array.
 * Returns an empty array if the string is corrupt or invalid.
 */
export function deserializeSyncQueue(
  raw: string | null | undefined
): SyncMutation[] {
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
