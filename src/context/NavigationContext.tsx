import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import {
  parseLocationHash,
  buildLocationHash,
  type ActiveTab,
  type NavigationRouteState,
} from "../lib/urlRouting";

export type { ActiveTab, NavigationRouteState };

export interface NavigationContextType {
  activeTab: ActiveTab;
  selectedTopicId: string | null;
  subView: "browse" | "review" | "launch" | "analytics" | "duplicates" | null;
  sessionType: "review" | "new" | "weak" | "cram" | null;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedTagFilter: string | null;

  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSubView: (view: "browse" | "review" | "launch" | "analytics" | "duplicates" | null) => void;
  setSessionType: (type: "review" | "new" | "weak" | "cram" | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  openTopicDetail: (topicId: string) => void;
  openFlashcardReview: (
    topicId?: string | null,
    sessionType?: "review" | "new" | "weak" | "cram"
  ) => void;
  openCardBrowser: (topicId?: string | null) => void;
  openStudyLauncher: (topicId?: string | null) => void;
  openFlashcardAnalytics: (topicId?: string | null) => void;
  openDuplicateDetection: (topicId?: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export function NavigationProvider({ children }: { children: ReactNode }) {
  // Hydrate initial state from window.location.hash (SSR-safe)
  const initialState = useMemo(() => {
    if (
      typeof window !== "undefined" &&
      window.location &&
      window.location.hash
    ) {
      return parseLocationHash(window.location.hash);
    }
    return {
      activeTab: "dashboard" as ActiveTab,
      selectedTopicId: null,
      subView: undefined,
      searchQuery: "",
      selectedCategoryFilter: null,
      selectedTagFilter: null,
    };
  }, []);

  const [activeTab, setActiveTabState] = useState<ActiveTab>(
    initialState.activeTab,
  );
  const [selectedTopicId, setSelectedTopicIdState] = useState<string | null>(
    initialState.selectedTopicId,
  );
  const [subView, setSubViewState] = useState<
    "browse" | "review" | "launch" | "analytics" | "duplicates" | null
  >(initialState.subView || null);
  const [sessionType, setSessionTypeState] = useState<
    "review" | "new" | "weak" | "cram" | null
  >(initialState.sessionType || null);
  const [searchQuery, setSearchQueryState] = useState(initialState.searchQuery);
  const [selectedCategoryFilter, setSelectedCategoryFilterState] = useState<
    string | null
  >(initialState.selectedCategoryFilter);
  const [selectedTagFilter, setSelectedTagFilterState] = useState<
    string | null
  >(initialState.selectedTagFilter);

  const isSyncingFromHash = useRef(false);

  // Sync state changes to window.location.hash
  useEffect(() => {
    if (typeof window === "undefined" || isSyncingFromHash.current) {
      return;
    }
    const targetHash = buildLocationHash({
      activeTab,
      selectedTopicId,
      subView: subView || undefined,
      sessionType: sessionType || undefined,
      searchQuery,
      selectedCategoryFilter,
      selectedTagFilter,
    });
    if (window.location.hash !== targetHash) {
      if (
        (window.location.hash === "" ||
          window.location.hash === "#" ||
          window.location.hash === "#/") &&
        targetHash === "#/"
      ) {
        return;
      }
      window.location.hash = targetHash;
    }
  }, [
    activeTab,
    selectedTopicId,
    subView,
    sessionType,
    searchQuery,
    selectedCategoryFilter,
    selectedTagFilter,
  ]);

  // Listen to hashchange events (Browser Back/Forward or manual URL hash updates)
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      const parsed = parseLocationHash(window.location.hash);
      isSyncingFromHash.current = true;
      setActiveTabState(parsed.activeTab);
      setSelectedTopicIdState(parsed.selectedTopicId);
      setSubViewState(parsed.subView || null);
      setSessionTypeState(parsed.sessionType || null);
      setSearchQueryState(parsed.searchQuery);
      setSelectedCategoryFilterState(parsed.selectedCategoryFilter);
      setSelectedTagFilterState(parsed.selectedTagFilter);
      setTimeout(() => {
        isSyncingFromHash.current = false;
      }, 0);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    setSubViewState(null);
    if (tab !== "topics" && tab !== "flashcards") {
      setSelectedTopicIdState(null);
    }
  }, []);

  const setSelectedTopicId = useCallback((id: string | null) => {
    setSelectedTopicIdState(id);
  }, []);

  const setSubView = useCallback(
    (view: "browse" | "review" | "launch" | "analytics" | "duplicates" | null) => {
      setSubViewState(view);
    },
    []
  );

  const setSessionType = useCallback(
    (type: "review" | "new" | "weak" | "cram" | null) => {
      setSessionTypeState(type);
    },
    []
  );

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const setSelectedCategoryFilter = useCallback((catId: string | null) => {
    setSelectedCategoryFilterState(catId);
  }, []);

  const setSelectedTagFilter = useCallback((tag: string | null) => {
    setSelectedTagFilterState(tag);
  }, []);

  const openTopicDetail = useCallback((topicId: string) => {
    setSelectedTopicIdState(topicId);
    setActiveTabState("topics");
    setSubViewState(null);
  }, []);

  const openFlashcardReview = useCallback(
    (
      topicId?: string | null,
      type?: "review" | "new" | "weak" | "cram"
    ) => {
      setSelectedTopicIdState(topicId || null);
      setActiveTabState("flashcards");
      setSubViewState(null);
      setSessionTypeState(type || null);
    },
    []
  );

  const openCardBrowser = useCallback((topicId?: string | null) => {
    if (topicId) {
      setSelectedTopicIdState(topicId);
      setActiveTabState("topics");
      setSubViewState("browse");
    } else {
      setSelectedTopicIdState(null);
      setActiveTabState("flashcards");
      setSubViewState("browse");
    }
  }, []);

  const openStudyLauncher = useCallback((topicId?: string | null) => {
    if (topicId) {
      setSelectedTopicIdState(topicId);
      setActiveTabState("topics");
      setSubViewState("launch");
    } else {
      setSelectedTopicIdState(null);
      setActiveTabState("flashcards");
      setSubViewState("launch");
    }
  }, []);

  const openFlashcardAnalytics = useCallback((topicId?: string | null) => {
    if (topicId) {
      setSelectedTopicIdState(topicId);
      setActiveTabState("topics");
      setSubViewState("analytics");
    } else {
      setSelectedTopicIdState(null);
      setActiveTabState("flashcards");
      setSubViewState("analytics");
    }
  }, []);

  const openDuplicateDetection = useCallback((topicId?: string | null) => {
    if (topicId) {
      setSelectedTopicIdState(topicId);
      setActiveTabState("topics");
      setSubViewState("duplicates");
    } else {
      setSelectedTopicIdState(null);
      setActiveTabState("flashcards");
      setSubViewState("duplicates");
    }
  }, []);

  const value = useMemo<NavigationContextType>(
    () => ({
      activeTab,
      selectedTopicId,
      subView,
      sessionType,
      searchQuery,
      selectedCategoryFilter,
      selectedTagFilter,
      setActiveTab,
      setSelectedTopicId,
      setSubView,
      setSessionType,
      setSearchQuery,
      setSelectedCategoryFilter,
      setSelectedTagFilter,
      openTopicDetail,
      openFlashcardReview,
      openCardBrowser,
      openStudyLauncher,
      openFlashcardAnalytics,
      openDuplicateDetection,
    }),
    [
      activeTab,
      selectedTopicId,
      subView,
      sessionType,
      searchQuery,
      selectedCategoryFilter,
      selectedTagFilter,
      setActiveTab,
      setSelectedTopicId,
      setSubView,
      setSessionType,
      setSearchQuery,
      setSelectedCategoryFilter,
      setSelectedTagFilter,
      openTopicDetail,
      openFlashcardReview,
      openCardBrowser,
      openStudyLauncher,
      openFlashcardAnalytics,
      openDuplicateDetection,
    ],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
