/**
 * Pure Sync Queue Helper Functions for Offline Mutation Management
 *
 * All functions are pure, deterministic, and free of side-effects.
 */

export const DEFAULT_MAX_RETRY_COUNT = 5;

export interface SyncMutation {
  id: string;
  entityType: "category" | "topic" | "note" | "resource" | "studyProgress";
  action: "save" | "delete";
  entityId: string;
  payload?: any;
  clientTimestamp: string;
  retryCount: number;
  status: "pending" | "processing" | "failed" | "exhausted";
  lastError?: string;
  // ─── P2.7b Scheduling & Backoff Metadata ───
  lastAttemptAt?: string;
  nextRetryAt?: string;
  backoffDelayMs?: number;
  // ─── P3.3 Error Classification Metadata ───
  isPermanent?: boolean;
  httpStatus?: number;
}

/**
 * Classifies HTTP status code as permanent or retryable transient error.
 * - 408 (Timeout) & 429 (Rate Limit) are transient.
 * - Other 4xx (400, 401, 403, 404, 409, 422) are permanent client/validation errors.
 * - 5xx and network failures are transient.
 */
export function isPermanentHttpStatus(status: number): boolean {
  if (status === 408 || status === 429) {
    return false;
  }
  if (status >= 400 && status < 500) {
    return true;
  }
  return false;
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
 * - Returns false for exhausted mutations or permanent failures.
 * - Returns false if retryCount >= maxRetries threshold.
 * - Always returns true for pending mutations.
 * - For failed mutations with nextRetryAt, returns true only if currentTimeMs >= nextRetryAt.
 */
export function isMutationEligibleForReplay(
  mutation: SyncMutation,
  currentTimeMs = Date.now(),
  bypassBackoff = false,
  maxRetries = DEFAULT_MAX_RETRY_COUNT
): boolean {
  if (bypassBackoff) {
    return true;
  }
  if (mutation.status === "exhausted" || mutation.isPermanent) {
    return false;
  }
  if (mutation.retryCount >= maxRetries) {
    return false;
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
 * Normalizes legacy or stuck mutations with retryCount >= maxRetries or isPermanent = true to 'exhausted' status.
 * Strictly preserves all mutation payload, history, and timestamps.
 */
export function normalizeExhaustedMutations(
  queue: SyncMutation[],
  maxRetries = DEFAULT_MAX_RETRY_COUNT
): SyncMutation[] {
  return queue.map((m) => {
    if (m.retryCount >= maxRetries) {
      if (m.status !== "exhausted") {
        return {
          ...m,
          status: "exhausted",
          isPermanent: m.isPermanent ?? (m.retryCount >= maxRetries ? true : undefined),
        };
      }
    }
    return m;
  });
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
      isPermanent: undefined,
      httpStatus: undefined,
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
    (m) => !(m.status === "failed" && m.retryCount >= maxRetryThreshold) && !(m.status === "exhausted" && m.retryCount >= maxRetryThreshold)
  );
}

/**
 * Marks a mutation as failed/exhausted, increments retry count, records error details & status code,
 * and computes exponential backoff scheduling metadata if retryable.
 */
export function markMutationFailed(
  queue: SyncMutation[],
  mutationId: string,
  error?: string,
  options?: {
    isPermanent?: boolean;
    httpStatus?: number;
    maxRetries?: number;
  }
): SyncMutation[] {
  const now = Date.now();
  const lastAttemptAt = new Date(now).toISOString();
  const sanitizedError = sanitizeMutationError(error);
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRY_COUNT;

  return queue.map((m) => {
    if (m.id === mutationId) {
      const newRetryCount = m.retryCount + 1;
      const isPermanent = Boolean(options?.isPermanent || m.isPermanent);
      const isExhausted = newRetryCount >= maxRetries;
      const backoffDelayMs = isExhausted || isPermanent
        ? undefined
        : calculateBackoffDelay(newRetryCount);
      const nextRetryAt = isExhausted || isPermanent || !backoffDelayMs
        ? undefined
        : new Date(now + backoffDelayMs).toISOString();

      return {
        ...m,
        retryCount: newRetryCount,
        status: isExhausted ? ("exhausted" as const) : ("failed" as const),
        lastError: sanitizedError,
        lastAttemptAt,
        backoffDelayMs,
        nextRetryAt,
        isPermanent: isPermanent || undefined,
        httpStatus: options?.httpStatus ?? m.httpStatus,
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
 * Normalizes any legacy stuck mutations on read.
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
      return normalizeExhaustedMutations(parsed);
    }
    return [];
  } catch {
    return [];
  }
}
