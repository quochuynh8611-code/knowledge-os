import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
} from "./storage";

export const RECENT_SEARCH_QUERIES_STORAGE_KEY = "phat_hoc_recent_queries_v2";
export const MAX_RECENT_SEARCH_QUERIES = 8;
export const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Retrieves the stored list of recent search queries from localStorage.
 * Returns an empty array if not present or corrupt.
 */
export function getRecentSearchQueries(): string[] {
  const raw = safeGetLocalStorageItem(RECENT_SEARCH_QUERIES_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((q): q is string => q.length >= MIN_SEARCH_QUERY_LENGTH)
      .slice(0, MAX_RECENT_SEARCH_QUERIES);
  } catch {
    return [];
  }
}

/**
 * Saves a new search query to recent queries in LRU order.
 * - Trims whitespace
 * - Discards queries shorter than MIN_SEARCH_QUERY_LENGTH
 * - Deduplicates case-insensitively (putting the newest casing at the front)
 * - Limits to MAX_RECENT_SEARCH_QUERIES
 */
export function saveRecentSearchQuery(rawQuery: string): string[] {
  if (!rawQuery) return getRecentSearchQueries();

  const trimmed = rawQuery.trim();
  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) {
    return getRecentSearchQueries();
  }

  const current = getRecentSearchQueries();
  const lowerTrimmed = trimmed.toLowerCase();

  // Filter out any existing case-insensitive duplicate
  const next = [
    trimmed,
    ...current.filter((item) => item.toLowerCase() !== lowerTrimmed),
  ].slice(0, MAX_RECENT_SEARCH_QUERIES);

  safeSetLocalStorageItem(
    RECENT_SEARCH_QUERIES_STORAGE_KEY,
    JSON.stringify(next),
  );

  return next;
}

/**
 * Removes a specific query from recent queries (case-insensitive).
 */
export function removeRecentSearchQuery(rawQuery: string): string[] {
  if (!rawQuery) return getRecentSearchQueries();

  const target = rawQuery.trim().toLowerCase();
  const current = getRecentSearchQueries();
  const next = current.filter((item) => item.toLowerCase() !== target);

  safeSetLocalStorageItem(
    RECENT_SEARCH_QUERIES_STORAGE_KEY,
    JSON.stringify(next),
  );

  return next;
}

/**
 * Clears all recent search queries from storage.
 */
export function clearRecentSearchQueries(): void {
  safeRemoveLocalStorageItem(RECENT_SEARCH_QUERIES_STORAGE_KEY);
}
