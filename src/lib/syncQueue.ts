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
  // ─── P2.7b Scheduling & Backoff Metadata ───
  lastAttemptAt?: string;
  nextRetryAt?: string;
  backoffDelayMs?: number;
}

/**
 * Calculates the exponential backoff delay in milliseconds based on retry count.
 * Formula: delay = min(baseDelayMs * 2^(retryCount - 1), maxDelayMs) for retryCount >= 1.
 */
export function calculateBackoffDelay(
  retryCount: number,
  baseDelayMs = 1000,
  maxDelayMs = 60000
): number {
  if (retryCount <= 1) {
    return baseDelayMs;
  }
  const exponent = retryCount - 1;
  const delay = baseDelayMs * Math.pow(2, exponent);
  return Math.min(delay, maxDelayMs);
}

/**
 * Checks if a mutation is eligible for replay based on its status and backoff scheduling.
 * - Always returns true if bypassBackoff is true (e.g. manual user override).
 * - Always returns true for pending mutations.
 * - For failed mutations with nextRetryAt, returns true only if currentTimeMs >= nextRetryAt.
 */
export function isMutationEligibleForReplay(
  mutation: SyncMutation,
  currentTimeMs = Date.now(),
  bypassBackoff = false
): boolean {
  if (bypassBackoff) {
    return true;
  }
  if (mutation.status === "pending") {
    return true;
  }
  if (!mutation.nextRetryAt) {
    return true;
  }
  const nextRetryTimeMs = new Date(mutation.nextRetryAt).getTime();
  return currentTimeMs >= nextRetryTimeMs;
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
 * Sanitizes and truncates overly long error strings to prevent storage bloat.
 */
export function sanitizeMutationError(
  error?: string,
  maxLength = 500
): string | undefined {
  if (!error || typeof error !== "string") {
    return undefined;
  }
  const trimmed = error.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    return trimmed.slice(0, maxLength);
  }
  return trimmed;
}

/**
 * Prunes exhausted failed mutations with retryCount >= maxRetryThreshold to reclaim storage.
 * Strictly preserves all 'pending' mutations.
 */
export function pruneExhaustedFailedMutations(
  queue: SyncMutation[],
  maxRetryThreshold = 10
): SyncMutation[] {
  return queue.filter(
    (m) => !(m.status === "failed" && m.retryCount >= maxRetryThreshold)
  );
}

/**
 * Marks a mutation as failed, increments its retry count, records the error,
 * and computes exponential backoff scheduling metadata.
 */
export function markMutationFailed(
  queue: SyncMutation[],
  mutationId: string,
  error?: string
): SyncMutation[] {
  const now = Date.now();
  const lastAttemptAt = new Date(now).toISOString();
  const sanitizedError = sanitizeMutationError(error);

  return queue.map((m) => {
    if (m.id === mutationId) {
      const newRetryCount = m.retryCount + 1;
      const backoffDelayMs = calculateBackoffDelay(newRetryCount);
      const nextRetryAt = new Date(now + backoffDelayMs).toISOString();

      return {
        ...m,
        retryCount: newRetryCount,
        status: "failed",
        lastError: sanitizedError,
        lastAttemptAt,
        backoffDelayMs,
        nextRetryAt,
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
