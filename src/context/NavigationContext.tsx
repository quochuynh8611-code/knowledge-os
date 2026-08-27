import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );

  const openTopicDetail = useCallback((topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveTab("topics");
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
