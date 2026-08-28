/**
 * Pure URL Routing & Deep-Linking Helper for Knowledge OS
 *
 * All functions are pure, deterministic, and safe for SSR/non-browser contexts.
 */

export type ActiveTab =
  | "dashboard"
  | "topics"
  | "graph"
  | "progress"
  | "notes"
  | "resources"
  | "search"
  | "ai_studio"
  | "abhidharma_matrix"
  | "divination_matrix"
  | "lexicon";

export const VALID_TABS: readonly ActiveTab[] = [
  "dashboard",
  "topics",
  "graph",
  "progress",
  "notes",
  "resources",
  "search",
  "ai_studio",
  "abhidharma_matrix",
  "divination_matrix",
  "lexicon",
] as const;

export interface NavigationRouteState {
  activeTab: ActiveTab;
  selectedTopicId: string | null;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedTagFilter: string | null;
}

/**
 * Parses a window.location.hash string into a structured NavigationRouteState.
 * Falls back safely to dashboard on invalid or empty hash.
 */
export function parseLocationHash(hash: string): NavigationRouteState {
  const fallback: NavigationRouteState = {
    activeTab: "dashboard",
    selectedTopicId: null,
    searchQuery: "",
    selectedCategoryFilter: null,
    selectedTagFilter: null,
  };

  if (!hash || hash === "#" || hash === "#/") {
    return fallback;
  }

  // Strip leading '#'
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;

  // Separate path from query string
  const [rawPath, rawQuery] = cleanHash.split("?");
  const path = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return fallback;
  }

  const primaryTab = segments[0] as ActiveTab;
  if (!VALID_TABS.includes(primaryTab)) {
    return fallback;
  }

  let selectedTopicId: string | null = null;
  if (primaryTab === "topics" && segments.length > 1) {
    try {
      selectedTopicId = decodeURIComponent(segments.slice(1).join("/"));
    } catch {
      selectedTopicId = segments.slice(1).join("/");
    }
  }

  let searchQuery = "";
  let selectedCategoryFilter: string | null = null;
  let selectedTagFilter: string | null = null;

  if (rawQuery) {
    try {
      const params = new URLSearchParams(rawQuery);
      if (params.has("q")) {
        searchQuery = params.get("q") || "";
      }
      if (params.has("cat")) {
        selectedCategoryFilter = params.get("cat");
      }
      if (params.has("tag")) {
        selectedTagFilter = params.get("tag");
      }
    } catch {
      // Ignore query parse errors gracefully
    }
  }

  return {
    activeTab: primaryTab,
    selectedTopicId,
    searchQuery,
    selectedCategoryFilter,
    selectedTagFilter,
  };
}

/**
 * Builds a normalized URL hash string from a NavigationRouteState object.
 */
export function buildLocationHash(state: NavigationRouteState): string {
  const {
    activeTab,
    selectedTopicId,
    searchQuery,
    selectedCategoryFilter,
    selectedTagFilter,
  } = state;

  let path = activeTab === "dashboard" ? "/" : `/${activeTab}`;

  if (activeTab === "topics" && selectedTopicId) {
    path = `/topics/${encodeURIComponent(selectedTopicId)}`;
  }

  const params = new URLSearchParams();
  if (searchQuery) {
    params.set("q", searchQuery);
  }
  if (selectedCategoryFilter) {
    params.set("cat", selectedCategoryFilter);
  }
  if (selectedTagFilter) {
    params.set("tag", selectedTagFilter);
  }

  const queryString = params.toString();
  return `#${path}${queryString ? `?${queryString}` : ""}`;
}
