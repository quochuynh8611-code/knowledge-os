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
  | "lexicon"
  | "docs"
  | "flashcards";

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
  "docs",
  "flashcards",
] as const;

export interface NavigationRouteState {
  activeTab: ActiveTab;
  selectedTopicId?: string | null;
  subView?: "browse" | "review" | "launch" | "analytics" | "duplicates";
  sessionType?: "review" | "new" | "weak" | "cram";
  searchQuery?: string;
  selectedCategoryFilter?: string | null;
  selectedTagFilter?: string | null;
}

/**
 * Parses a window.location.hash string into a structured NavigationRouteState.
 * Falls back safely to dashboard on invalid or empty hash.
 */
export function parseLocationHash(hash: string): NavigationRouteState {
  const fallback: NavigationRouteState = {
    activeTab: "dashboard",
    selectedTopicId: null,
    subView: undefined,
    sessionType: undefined,
    searchQuery: "",
    selectedCategoryFilter: null,
    selectedTagFilter: null,
  };

  if (!hash || hash === "#" || hash === "#/") {
    return fallback;
  }

  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart, rawQuery] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);

  if (segments.length === 0) {
    return fallback;
  }

  const primaryTab = segments[0] as ActiveTab;
  if (!VALID_TABS.includes(primaryTab)) {
    return fallback;
  }

  let selectedTopicId: string | null = null;
  let subView: "browse" | "review" | "launch" | "analytics" | "duplicates" | undefined = undefined;
  let sessionType: "review" | "new" | "weak" | "cram" | undefined = undefined;

  if (primaryTab === "flashcards") {
    if (segments.length > 1) {
      if (segments[1] === "launch") {
        subView = "launch";
        selectedTopicId = null;
      } else if (segments[1] === "browse") {
        subView = "browse";
        selectedTopicId = null;
      } else if (segments[1] === "analytics") {
        subView = "analytics";
        selectedTopicId = null;
      } else if (segments[1] === "duplicates") {
        subView = "duplicates";
        selectedTopicId = null;
      } else if (segments[1] === "review") {
        subView = "review";
        if (segments.length > 2) {
          try {
            selectedTopicId = decodeURIComponent(segments.slice(2).join("/"));
          } catch {
            selectedTopicId = segments.slice(2).join("/");
          }
        }
      } else {
        try {
          selectedTopicId = decodeURIComponent(segments.slice(1).join("/"));
        } catch {
          selectedTopicId = segments.slice(1).join("/");
        }
      }
    }
  } else if (primaryTab === "topics" && segments.length > 1) {
    if (segments.length > 2 && segments[segments.length - 1] === "launch") {
      subView = "launch";
      const topicPart = segments.slice(1, -1).join("/");
      try {
        selectedTopicId = decodeURIComponent(topicPart);
      } catch {
        selectedTopicId = topicPart;
      }
    } else if (segments.length > 2 && segments[segments.length - 1] === "browse") {
      subView = "browse";
      const topicPart = segments.slice(1, -1).join("/");
      try {
        selectedTopicId = decodeURIComponent(topicPart);
      } catch {
        selectedTopicId = topicPart;
      }
    } else if (segments.length > 2 && segments[segments.length - 1] === "analytics") {
      subView = "analytics";
      const topicPart = segments.slice(1, -1).join("/");
      try {
        selectedTopicId = decodeURIComponent(topicPart);
      } catch {
        selectedTopicId = topicPart;
      }
    } else if (segments.length > 2 && segments[segments.length - 1] === "duplicates") {
      subView = "duplicates";
      const topicPart = segments.slice(1, -1).join("/");
      try {
        selectedTopicId = decodeURIComponent(topicPart);
      } catch {
        selectedTopicId = topicPart;
      }
    } else {
      try {
        selectedTopicId = decodeURIComponent(segments.slice(1).join("/"));
      } catch {
        selectedTopicId = segments.slice(1).join("/");
      }
    }
  }

  let searchQuery = "";
  let selectedCategoryFilter: string | null = null;
  let selectedTagFilter: string | null = null;

  if (rawQuery) {
    try {
      const params = new URLSearchParams(rawQuery);
      if (params.has("topicId")) {
        selectedTopicId = params.get("topicId");
      }
      if (params.has("q")) {
        searchQuery = params.get("q") || "";
      }
      if (params.has("cat")) {
        selectedCategoryFilter = params.get("cat");
      }
      if (params.has("tag")) {
        selectedTagFilter = params.get("tag");
      }
      if (params.get("view") === "browse") {
        subView = "browse";
      } else if (params.get("view") === "launch") {
        subView = "launch";
      } else if (params.get("view") === "analytics") {
        subView = "analytics";
      } else if (params.get("view") === "duplicates") {
        subView = "duplicates";
      }
      const st = params.get("sessionType");
      if (st === "review" || st === "new" || st === "weak" || st === "cram") {
        sessionType = st;
      }
    } catch {
      // Ignore query parse errors gracefully
    }
  }

  return {
    activeTab: primaryTab,
    selectedTopicId,
    subView,
    sessionType,
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
    subView,
    sessionType,
    searchQuery,
    selectedCategoryFilter,
    selectedTagFilter,
  } = state;

  let path = activeTab === "dashboard" ? "/" : `/${activeTab}`;

  if (subView === "duplicates") {
    if (activeTab === "flashcards") {
      path = "/flashcards/duplicates";
    } else if (activeTab === "topics" && selectedTopicId) {
      path = `/topics/${encodeURIComponent(selectedTopicId)}/duplicates`;
    }
  } else if (subView === "analytics") {
    if (activeTab === "flashcards") {
      path = "/flashcards/analytics";
    } else if (activeTab === "topics" && selectedTopicId) {
      path = `/topics/${encodeURIComponent(selectedTopicId)}/analytics`;
    }
  } else if (subView === "launch") {
    if (activeTab === "flashcards") {
      path = "/flashcards/launch";
    } else if (activeTab === "topics" && selectedTopicId) {
      path = `/topics/${encodeURIComponent(selectedTopicId)}/launch`;
    }
  } else if (subView === "browse") {
    if (activeTab === "flashcards") {
      path = "/flashcards/browse";
    } else if (activeTab === "topics" && selectedTopicId) {
      path = `/topics/${encodeURIComponent(selectedTopicId)}/browse`;
    }
  } else if (activeTab === "topics" && selectedTopicId) {
    path = `/topics/${encodeURIComponent(selectedTopicId)}`;
  } else if (activeTab === "flashcards" && selectedTopicId) {
    path = `/flashcards/${encodeURIComponent(selectedTopicId)}`;
  }

  const params = new URLSearchParams();
  if (sessionType) {
    params.set("sessionType", sessionType);
  }
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
