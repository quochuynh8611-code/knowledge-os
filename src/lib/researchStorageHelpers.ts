/**
 * Research Storage Architecture v1 — Pure Helper Functions
 *
 * All functions are pure (no side effects, no I/O, deterministic).
 * Safe to call from any context: tests, DataContext, ResearchRepositoryV2.
 *
 * Contracts:
 * - resolveTopicIds: backward compat multi-topic resolution
 * - buildSourceRegistry: in-memory source deduplication
 * - normalizeTopicTags: sanitize + deduplicate tag arrays
 * - captureProgressSnapshot: append-only progress history entry
 */

import { Note, Resource, StudyProgress, KnowledgeProgressSnapshot, SnapshotTriggerReason } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SourceRegistryEntry {
  id: string;
  canonicalKey: string;
  title: string;
  url?: string;
  filePath?: string;
  resourceIds: string[];
}

// ─── resolveTopicIds ──────────────────────────────────────────────────────────

/**
 * Resolves the set of topic IDs for a note.
 * Backward compat rule:
 *   - If note.topicIds is non-empty → return deduplicated topicIds
 *   - Otherwise → return [note.topicId]
 *
 * Does NOT mutate the input note.
 */
export function resolveTopicIds(note: Note & { topicIds?: string[] }): string[] {
  const ids = note.topicIds && note.topicIds.length > 0 ? note.topicIds : [note.topicId];
  // Deduplicate preserving insertion order
  return [...new Set(ids)];
}

// ─── buildSourceRegistry ──────────────────────────────────────────────────────

/**
 * Builds an in-memory source registry from a list of Resources.
 * Deduplication key: `title + "||" + (url | filePath | "")`.
 * Resources with the same canonical key share a single SourceRegistryEntry.
 *
 * Returns a Map keyed by canonicalKey.
 * Does NOT persist to storage.
 */
export function buildSourceRegistry(resources: Resource[]): Map<string, SourceRegistryEntry> {
  const registry = new Map<string, SourceRegistryEntry>();

  for (const resource of resources) {
    const rawKey = `${resource.title}||${resource.url ?? resource.filePath ?? ''}`;
    const canonicalKey = rawKey;

    const existing = registry.get(canonicalKey);
    if (existing) {
      existing.resourceIds.push(resource.id);
    } else {
      const entryId = `sreg-${resource.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      registry.set(canonicalKey, {
        id: entryId,
        canonicalKey,
        title: resource.title,
        url: resource.url,
        filePath: resource.filePath,
        resourceIds: [resource.id],
      });
    }
  }

  return registry;
}

// ─── generateTagSlug & normalizeTopicTags ─────────────────────────────────────

/**
 * Generates a clean, deterministic URL/database-safe slug from a tag name.
 * Supports Vietnamese unicode characters and standard ASCII.
 */
export function generateTagSlug(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return "tag";
  return (
    trimmed
      .replace(
        /[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/gu,
        "-",
      )
      .replace(/^-+|-+$/g, "") || "tag"
  );
}

/**
 * Sanitizes a tag array:
 * 1. Trims whitespace from each tag
 * 2. Removes empty strings (after trim)
 * 3. Deduplicates case-sensitively, preserving insertion order of first occurrences
 *
 * Does NOT mutate the input array.
 */
export function normalizeTopicTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const trimmed = raw.trim();
    if (trimmed !== '' && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

// ─── captureProgressSnapshot ──────────────────────────────────────────────────

/**
 * Creates an immutable KnowledgeProgressSnapshot from the current StudyProgress.
 * This is a pure factory function — it does NOT write to any storage.
 * Callers are responsible for persisting the snapshot if needed.
 *
 * Guarantees:
 * - Original studyProgress is never mutated.
 * - Each call produces a new snapshot with a unique id.
 * - capturedAt is set to the current UTC ISO timestamp.
 */
export function captureProgressSnapshot(
  topicId: string,
  studyProgress: StudyProgress,
  triggerReason?: SnapshotTriggerReason,
): KnowledgeProgressSnapshot {
  const id = `snap-${topicId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    topicId,
    capturedAt: new Date().toISOString(),
    progressData: { ...studyProgress }, // shallow copy — StudyProgress has no nested objects
    triggerReason,
  };
}
