/**
 * Mind Map Storage Module (Track A - Persisted View State)
 * Pure helper utilities for loading, saving, and sanitizing per-topic Mind Map view state.
 *
 * Constraints:
 * - Isolated localStorage keys: "knowledge_os_mindmap_view_state_v1:<topicId>"
 * - Zero schema change / Zero backend mutation / Zero uncaught exceptions.
 */

export const MINDMAP_STORAGE_PREFIX = "knowledge_os_mindmap_view_state_v1:";

export interface MindMapLocalViewState {
  version: 1;
  topicId: string;
  layoutMode: "tree_horizontal" | "tree_vertical";
  collapsedNodeIds: string[];
  showCrossLinks?: boolean;
  updatedAt: string;
}

/**
 * Returns the canonical localStorage key for a specific topic ID.
 */
export function getMindMapStorageKey(topicId: string): string {
  return `${MINDMAP_STORAGE_PREFIX}${topicId}`;
}

/**
 * Creates a default MindMapLocalViewState object for a given topic ID.
 */
export function getDefaultMindMapViewState(
  topicId: string
): MindMapLocalViewState {
  return {
    version: 1,
    topicId,
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    showCrossLinks: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sanitizes an array of collapsed node IDs, ensuring string types, removing duplicates,
 * and optionally filtering out stale IDs that no longer exist in the active tree.
 */
export function sanitizeCollapsedIds(
  ids: unknown,
  validNodeIds?: Set<string>
): string[] {
  if (!Array.isArray(ids)) return [];
  const stringIds = ids.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0
  );
  const uniqueIds = Array.from(new Set(stringIds));
  if (!validNodeIds) {
    return uniqueIds;
  }
  return uniqueIds.filter((id) => validNodeIds.has(id));
}

/**
 * Safely loads persisted view state for a topic from localStorage.
 * Gracefully falls back to default state upon missing keys, storage unavailability, or corrupted JSON.
 */
export function loadMindMapViewState(topicId: string): MindMapLocalViewState {
  const defaultState = getDefaultMindMapViewState(topicId);
  if (!topicId || typeof window === "undefined" || !window.localStorage) {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(getMindMapStorageKey(topicId));
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 1 &&
      Array.isArray(parsed.collapsedNodeIds)
    ) {
      return {
        version: 1,
        topicId,
        layoutMode:
          parsed.layoutMode === "tree_vertical"
            ? "tree_vertical"
            : "tree_horizontal",
        collapsedNodeIds: sanitizeCollapsedIds(parsed.collapsedNodeIds),
        showCrossLinks:
          typeof parsed.showCrossLinks === "boolean"
            ? parsed.showCrossLinks
            : false,
        updatedAt:
          typeof parsed.updatedAt === "string"
            ? parsed.updatedAt
            : new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn(
      `[MindMapStorage] Failed to read view state for topic "${topicId}":`,
      err
    );
  }

  return defaultState;
}

/**
 * Safely persists view state for a topic to localStorage.
 * Silently handles QuotaExceededError or security exceptions without crashing the UI.
 */
export function saveMindMapViewState(
  state: MindMapLocalViewState,
  validNodeIds?: Set<string>
): boolean {
  if (!state.topicId || typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const sanitizedIds = sanitizeCollapsedIds(
      state.collapsedNodeIds,
      validNodeIds
    );
    const payload: MindMapLocalViewState = {
      version: 1,
      topicId: state.topicId,
      layoutMode:
        state.layoutMode === "tree_vertical"
          ? "tree_vertical"
          : "tree_horizontal",
      collapsedNodeIds: sanitizedIds,
      showCrossLinks: Boolean(state.showCrossLinks),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(
      getMindMapStorageKey(state.topicId),
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    console.warn(
      `[MindMapStorage] Failed to save view state for topic "${state.topicId}":`,
      err
    );
    return false;
  }
}
