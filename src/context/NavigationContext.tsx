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
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedTagFilter: string | null;

  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  openTopicDetail: (topicId: string) => void;
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
    if (tab !== "topics") {
      setSelectedTopicIdState(null);
    }
  }, []);

  const setSelectedTopicId = useCallback((id: string | null) => {
    setSelectedTopicIdState(id);
  }, []);

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
  }, []);

  const value = useMemo<NavigationContextType>(
    () => ({
      activeTab,
      selectedTopicId,
      searchQuery,
      selectedCategoryFilter,
      selectedTagFilter,
      setActiveTab,
      setSelectedTopicId,
      setSearchQuery,
      setSelectedCategoryFilter,
      setSelectedTagFilter,
      openTopicDetail,
    }),
    [
      activeTab,
      selectedTopicId,
      searchQuery,
      selectedCategoryFilter,
      selectedTagFilter,
      openTopicDetail,
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
