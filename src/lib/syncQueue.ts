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

/**
 * Pure helper: Reconciles a single entity collection with active pending mutations.
 * Enforces server canonical base, pending save creation (if absent), and pending deletion.
 */
export function reconcileEntitiesWithQueue<T extends { id: string; slug?: string }>(
  serverEntities: T[],
  pendingMutations: SyncMutation[],
  entityType: SyncMutation["entityType"]
): T[] {
  const activeMutations = (pendingMutations || []).filter(
    (m) => m && m.entityType === entityType && (m.status === "pending" || m.status === "failed")
  );

  let result = [...(serverEntities || [])];

  for (const m of activeMutations) {
    if (m.action === "save" && m.payload) {
      const exists = result.some(
        (e) =>
          e.id === (m.payload.id || m.entityId) ||
          Boolean(m.payload.slug && e.slug && e.slug === m.payload.slug)
      );
      if (!exists) {
        result.push(m.payload);
      }
    }
  }

  const deleteIds = new Set(
    activeMutations
      .filter((m) => m.action === "delete")
      .map((m) => m.entityId)
  );
  if (deleteIds.size > 0) {
    result = result.filter((e) => !deleteIds.has(e.id));
  }

  return result;
}

export interface ReconcilableSnapshot {
  categories: any[];
  topics: any[];
  notes: any[];
  resources: any[];
  tags?: any[];
}

/**
 * Pure helper: Reconciles a complete server snapshot with pending queue mutations.
 * Enforces dependency order:
 * 1. Category save
 * 2. Topic save (Orphan Guard: parent category must exist)
 * 3. Note save (Orphan Guard: parent topic must exist)
 * 4. Resource save (Orphan Guard: parent topic must exist)
 * 5. Deletes per collection
 *
 * Queue is treated as strictly read-only and immutable.
 */
export function reconcileSnapshotWithQueue<T extends ReconcilableSnapshot>(
  serverSnapshot: T,
  pendingMutations: SyncMutation[]
): T {
  if (!pendingMutations || pendingMutations.length === 0) {
    return {
      ...serverSnapshot,
      categories: [...(serverSnapshot.categories || [])],
      topics: [...(serverSnapshot.topics || [])],
      notes: [...(serverSnapshot.notes || [])],
      resources: [...(serverSnapshot.resources || [])],
      tags: [...(serverSnapshot.tags || [])],
    };
  }

  const activeMutations = pendingMutations.filter(
    (m) => m && (m.status === "pending" || m.status === "failed")
  );

  // 1. Category save (Server wins on conflict)
  const categories = [...(serverSnapshot.categories || [])];
  for (const m of activeMutations) {
    if (m.entityType === "category" && m.action === "save" && m.payload) {
      const exists = categories.some(
        (c) =>
          c.id === (m.payload.id || m.entityId) ||
          Boolean(m.payload.slug && c.slug && c.slug === m.payload.slug)
      );
      if (!exists) {
        categories.push(m.payload);
      }
    }
  }

  // 2. Topic save (with Orphan Guard: parent category must exist)
  const topics = [...(serverSnapshot.topics || [])];
  for (const m of activeMutations) {
    if (m.entityType === "topic" && m.action === "save" && m.payload) {
      const exists = topics.some(
        (t) =>
          t.id === (m.payload.id || m.entityId) ||
          Boolean(m.payload.slug && t.slug && t.slug === m.payload.slug)
      );
      if (!exists) {
        const parentCategoryExists = categories.some(
          (c) =>
            c.id === m.payload.categoryId ||
            Boolean(m.payload.categorySlug && c.slug && c.slug === m.payload.categorySlug)
        );
        if (parentCategoryExists) {
          topics.push(m.payload);
        }
      }
    }
  }

  // 3. Note save (with Orphan Guard: parent topic must exist)
  const notes = [...(serverSnapshot.notes || [])];
  for (const m of activeMutations) {
    if (m.entityType === "note" && m.action === "save" && m.payload) {
      const exists = notes.some((n) => n.id === (m.payload.id || m.entityId));
      if (!exists) {
        const parentTopicExists = topics.some(
          (t) =>
            t.id === m.payload.topicId ||
            (Array.isArray(m.payload.topicIds) && m.payload.topicIds.includes(t.id))
        );
        if (parentTopicExists) {
          notes.push(m.payload);
        }
      }
    }
  }

  // 4. Resource save (with Orphan Guard: parent topic must exist)
  const resources = [...(serverSnapshot.resources || [])];
  for (const m of activeMutations) {
    if (m.entityType === "resource" && m.action === "save" && m.payload) {
      const exists = resources.some((r) => r.id === (m.payload.id || m.entityId));
      if (!exists) {
        const parentTopicExists = topics.some((t) => t.id === m.payload.topicId);
        if (parentTopicExists) {
          resources.push(m.payload);
        }
      }
    }
  }

  // 5. Deletes per collection
  const deleteCategoryIds = new Set(
    activeMutations
      .filter((m) => m.entityType === "category" && m.action === "delete")
      .map((m) => m.entityId)
  );
  const deleteTopicIds = new Set(
    activeMutations
      .filter((m) => m.entityType === "topic" && m.action === "delete")
      .map((m) => m.entityId)
  );
  const deleteNoteIds = new Set(
    activeMutations
      .filter((m) => m.entityType === "note" && m.action === "delete")
      .map((m) => m.entityId)
  );
  const deleteResourceIds = new Set(
    activeMutations
      .filter((m) => m.entityType === "resource" && m.action === "delete")
      .map((m) => m.entityId)
  );

  return {
    ...serverSnapshot,
    categories: categories.filter((c) => !deleteCategoryIds.has(c.id)),
    topics: topics.filter((t) => !deleteTopicIds.has(t.id)),
    notes: notes.filter((n) => !deleteNoteIds.has(n.id)),
    resources: resources.filter((r) => !deleteResourceIds.has(r.id)),
    tags: [...(serverSnapshot.tags || [])],
  };
}
