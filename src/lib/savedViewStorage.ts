import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
} from "./storage";
import { ScholarSearchFilters } from "./scholarSearch";

export const SAVED_SEARCH_VIEWS_STORAGE_KEY = "phat_hoc_saved_views_v1";
export const MAX_SAVED_SEARCH_VIEWS = 20;

export interface SavedSearchView {
  id: string;
  name: string;
  query: string;
  filters?: ScholarSearchFilters;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchViewInput {
  name: string;
  query?: string;
  filters?: ScholarSearchFilters;
  pinned?: boolean;
}

export interface UpdateSavedSearchViewInput {
  name?: string;
  query?: string;
  filters?: ScholarSearchFilters;
}

export interface SaveSavedSearchViewInput {
  id?: string;
  name: string;
  query?: string;
  filters?: ScholarSearchFilters;
  pinned?: boolean;
}

export function hasNonDefaultFilters(filters?: ScholarSearchFilters | null): boolean {
  if (!filters) return false;
  return (
    (Boolean(filters.domain) && filters.domain !== "all") ||
    (Boolean(filters.categoryId) && filters.categoryId !== null) ||
    (Boolean(filters.tag) && filters.tag !== null) ||
    (Boolean(filters.status) && filters.status !== "all")
  );
}

export function isSavedViewInputValid(
  name?: string,
  query?: string,
  filters?: ScholarSearchFilters,
): boolean {
  const trimmedName = (name || "").trim();
  if (!trimmedName) return false;

  const trimmedQuery = (query || "").trim();
  const hasFilters = hasNonDefaultFilters(filters);

  // Must have non-empty query OR at least one non-default filter
  return trimmedQuery.length > 0 || hasFilters;
}

function sortSavedViews(views: SavedSearchView[]): SavedSearchView[] {
  return [...views].sort((a, b) => {
    // 1. Pinned items first (strict boolean comparison)
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    // 2. updatedAt descending (newest first)
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });
}

/**
 * Retrieves the stored list of saved search views from localStorage.
 * Returns an empty array if not present or corrupt.
 * Sorted deterministically: pinned views first, then updatedAt descending.
 */
export function getSavedSearchViews(): SavedSearchView[] {
  const raw = safeGetLocalStorageItem(SAVED_SEARCH_VIEWS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const validViews: SavedSearchView[] = [];
    for (const v of parsed) {
      if (
        Boolean(v) &&
        typeof v.id === "string" &&
        typeof v.name === "string" &&
        v.name.trim().length > 0 &&
        typeof v.query === "string"
      ) {
        validViews.push({
          id: v.id,
          name: v.name.trim(),
          query: v.query,
          filters: v.filters,
          pinned: typeof v.pinned === "boolean" ? v.pinned : false,
          createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
          updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
        });
      }
    }

    return sortSavedViews(validViews).slice(0, MAX_SAVED_SEARCH_VIEWS);
  } catch {
    return [];
  }
}

/**
 * Explicitly creates a new saved search view.
 */
export function createSavedSearchView(
  input: CreateSavedSearchViewInput,
): SavedSearchView[] {
  const trimmedName = (input.name || "").trim();
  const trimmedQuery = (input.query || "").trim();

  if (!isSavedViewInputValid(trimmedName, trimmedQuery, input.filters)) {
    return getSavedSearchViews();
  }

  const current = getSavedSearchViews();
  const nowIso = new Date().toISOString();

  const newId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const newView: SavedSearchView = {
    id: newId,
    name: trimmedName,
    query: trimmedQuery,
    filters: input.filters,
    pinned: typeof input.pinned === "boolean" ? input.pinned : false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const next = [newView, ...current];
  const sortedAndCapped = sortSavedViews(next).slice(0, MAX_SAVED_SEARCH_VIEWS);

  safeSetLocalStorageItem(
    SAVED_SEARCH_VIEWS_STORAGE_KEY,
    JSON.stringify(sortedAndCapped),
  );

  return sortedAndCapped;
}

/**
 * Explicitly updates an existing saved search view by id (excluding pinned mutation).
 */
export function updateSavedSearchView(
  id: string,
  input: UpdateSavedSearchViewInput,
): SavedSearchView[] {
  const current = getSavedSearchViews();
  const existingIndex = current.findIndex((v) => v.id === id);
  if (existingIndex === -1) {
    return current;
  }

  const existing = current[existingIndex];
  const nextName = input.name !== undefined ? input.name.trim() : existing.name;
  const nextQuery = input.query !== undefined ? input.query.trim() : existing.query;
  const nextFilters = input.filters !== undefined ? input.filters : existing.filters;

  if (!isSavedViewInputValid(nextName, nextQuery, nextFilters)) {
    return current;
  }

  const updated: SavedSearchView = {
    ...existing,
    name: nextName,
    query: nextQuery,
    filters: nextFilters,
    pinned: existing.pinned,
    updatedAt: new Date().toISOString(),
  };

  const next = [
    ...current.slice(0, existingIndex),
    updated,
    ...current.slice(existingIndex + 1),
  ];

  const sortedAndCapped = sortSavedViews(next).slice(0, MAX_SAVED_SEARCH_VIEWS);

  safeSetLocalStorageItem(
    SAVED_SEARCH_VIEWS_STORAGE_KEY,
    JSON.stringify(sortedAndCapped),
  );

  return sortedAndCapped;
}

/**
 * Unified save helper (creates if no id provided, updates if id provided).
 */
export function saveSavedSearchView(
  input: SaveSavedSearchViewInput,
): SavedSearchView[] {
  if (input.id) {
    return updateSavedSearchView(input.id, {
      name: input.name,
      query: input.query,
      filters: input.filters,
    });
  }
  return createSavedSearchView(input);
}

/**
 * Toggles the pinned state of a saved search view exclusively.
 */
export function togglePinSavedSearchView(id: string): SavedSearchView[] {
  const current = getSavedSearchViews();
  const existingIndex = current.findIndex((v) => v.id === id);
  if (existingIndex === -1) return current;

  const target = current[existingIndex];
  const updated: SavedSearchView = {
    ...target,
    pinned: !target.pinned,
    updatedAt: new Date().toISOString(),
  };

  const next = [
    ...current.slice(0, existingIndex),
    updated,
    ...current.slice(existingIndex + 1),
  ];

  const sortedAndCapped = sortSavedViews(next).slice(0, MAX_SAVED_SEARCH_VIEWS);

  safeSetLocalStorageItem(
    SAVED_SEARCH_VIEWS_STORAGE_KEY,
    JSON.stringify(sortedAndCapped),
  );

  return sortedAndCapped;
}

/**
 * Deletes a saved search view by id.
 */
export function deleteSavedSearchView(id: string): SavedSearchView[] {
  const current = getSavedSearchViews();
  const next = current.filter((v) => v.id !== id);

  safeSetLocalStorageItem(
    SAVED_SEARCH_VIEWS_STORAGE_KEY,
    JSON.stringify(next),
  );

  return next;
}

/**
 * Clears all saved search views from localStorage.
 */
export function clearSavedSearchViews(): void {
  safeRemoveLocalStorageItem(SAVED_SEARCH_VIEWS_STORAGE_KEY);
}
