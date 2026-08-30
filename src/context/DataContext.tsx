import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
  FOCUS_DOMAIN_STORAGE_KEY,
} from "../lib/storage";
import {
  Category,
  Topic,
  Note,
  Resource,
  KnowledgeLink,
  Tag,
  TopicStatus,
  NoteType,
  ResourceType,
  StudyProgress,
  TopicVisibility,
} from "../types";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../data/initialData";
import { calculateNextReview, getReviewQueue } from "../lib/spaced-repetition";
import {
  normalizeCategories,
  normalizeTopics,
  generateCategorySlug,
  getRootCategories,
  mergeCategoryData,
  MergeCategoriesResult,
} from "../lib/taxonomyMigration";
import {
  LocalStorageDataRepository,
  ApiDataRepository,
  IDataRepository,
} from "../services/dataRepository";
import {
  StudyTimerProvider,
  useStudyTimer,
  TimerMode,
  StudyTimerContextType,
} from "./StudyTimerContext";
import {
  NavigationProvider,
  useNavigation,
  ActiveTab,
  NavigationContextType,
} from "./NavigationContext";
import { ResearchRepositoryV2 } from "../services/researchRepositoryV2";

export { StudyTimerProvider, useStudyTimer, NavigationProvider, useNavigation };
export type { TimerMode, StudyTimerContextType, ActiveTab, NavigationContextType };

const STORAGE_KEY = "phat_hoc_huyen_hoc_clean_v3";
const baseDataRepository: IDataRepository =
  typeof window !== "undefined"
    ? new ApiDataRepository("/api", new LocalStorageDataRepository(STORAGE_KEY))
    : new LocalStorageDataRepository(STORAGE_KEY);
const dataRepository: IDataRepository = new ResearchRepositoryV2(baseDataRepository);

interface DataContextType {
  // State
  categories: Category[];
  topics: Topic[];
  notes: Note[];
  resources: Resource[];
  tags: Tag[];
  activeTab: ActiveTab;
  selectedTopicId: string | null;
  searchQuery: string;
  selectedCategoryFilter: string | null;
  selectedTagFilter: string | null;

  // Focus Domain State (Phase 14B)
  focusDomainId: string | null;
  setFocusDomainId: (domainId: string | null) => void;

  // Timer State
  activeTimerTopicId: string | null;
  timerSeconds: number;
  isTimerRunning: boolean;
  timerMode: "stopwatch" | "pomodoro";
  pomodoroTimeRemaining: number;

  // Actions - Navigation
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  openTopicDetail: (topicId: string) => void;

  // Actions - Categories
  addCategory: (categoryData: Omit<Category, "id">) => string;
  updateCategory: (id: string, categoryData: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  mergeCategories: (
    sourceCategoryId: string,
    targetCategoryId: string,
  ) => MergeCategoriesResult;

  // Actions - Topics
  addTopic: (
    topicData: Omit<
      Topic,
      "id" | "createdAt" | "updatedAt" | "studyProgress" | "links"
    >,
  ) => string;
  updateTopic: (id: string, topicData: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  hideTopic: (id: string) => void;
  restoreTopic: (id: string) => void;
  updateTopicProgress: (
    topicId: string,
    progress: number,
    status?: TopicStatus,
  ) => void;
  addKnowledgeLink: (linkData: Omit<KnowledgeLink, "id">) => void;
  removeKnowledgeLink: (linkId: string) => void;

  // Actions - Notes
  addNote: (noteData: Omit<Note, "id" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, noteData: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Actions - Resources
  addResource: (resData: Omit<Resource, "id" | "createdAt">) => string;
  updateResource: (id: string, resData: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  // Actions - Spaced Repetition & Study
  reviewTopicSM2: (topicId: string, quality: number) => void;
  logStudyTime: (topicId: string, minutes: number) => void;
  startStudyTimer: (topicId: string, mode?: "stopwatch" | "pomodoro") => void;
  pauseStudyTimer: () => void;
  stopAndSaveStudyTimer: () => void;

  // Analytics & Computed
  stats: {
    totalTopics: number;
    phatHocTopics: number;
    phatHocDonePercent: number;
    huyenHocTopics: number;
    huyenHocDonePercent: number;
    studyingThisWeek: number;
    totalTimeSpentMinutes: number;
    completedTopicsCount: number;
    totalNotesCount: number;
    totalResourcesCount: number;
    dueReviewsCount: number;
  };
  reviewQueue: Topic[];

  // Export, Reset & Rehydration
  exportAllDataJSON: () => string;
  importAllDataJSON: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  reloadAllData: () => Promise<boolean>;
}

export type DomainDataContextType = Omit<
  DataContextType,
  | "activeTab"
  | "selectedTopicId"
  | "searchQuery"
  | "selectedCategoryFilter"
  | "selectedTagFilter"
  | "setActiveTab"
  | "setSelectedTopicId"
  | "setSearchQuery"
  | "setSelectedCategoryFilter"
  | "setSelectedTagFilter"
  | "openTopicDetail"
  | "activeTimerTopicId"
  | "timerSeconds"
  | "isTimerRunning"
  | "timerMode"
  | "pomodoroTimeRemaining"
  | "startStudyTimer"
  | "pauseStudyTimer"
  | "stopAndSaveStudyTimer"
>;

const DomainDataContext = createContext<DomainDataContextType | undefined>(
  undefined,
);

export function useDomainData(): DomainDataContextType {
  const context = useContext(DomainDataContext);
  if (!context) {
    throw new Error("useDomainData must be used within a DataProvider");
  }
  return context;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

function InnerDataProvider({ children }: { children: ReactNode }) {
  // Initialize state from LocalStorage sub-keys (via safe helper) or Seed Data
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = safeGetLocalStorageItem(`${STORAGE_KEY}_categories`);
      return normalizeCategories(saved ? JSON.parse(saved) : INITIAL_CATEGORIES);
    } catch {
      return normalizeCategories(INITIAL_CATEGORIES);
    }
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = safeGetLocalStorageItem(`${STORAGE_KEY}_topics`);
      return normalizeTopics(saved ? JSON.parse(saved) : INITIAL_TOPICS);
    } catch {
      return normalizeTopics(INITIAL_TOPICS);
    }
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = safeGetLocalStorageItem(`${STORAGE_KEY}_notes`);
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    try {
      const saved = safeGetLocalStorageItem(`${STORAGE_KEY}_resources`);
      return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
    } catch {
      return INITIAL_RESOURCES;
    }
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const saved = safeGetLocalStorageItem(`${STORAGE_KEY}_tags`);
      return saved ? JSON.parse(saved) : INITIAL_TAGS;
    } catch {
      return INITIAL_TAGS;
    }
  });

  // Focus Domain State (Phase 14B)
  const [focusDomainId, setFocusDomainIdState] = useState<string | null>(() => {
    const saved = safeGetLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved.trim() : null;
  });

  const setFocusDomainId = useCallback((domainId: string | null) => {
    setFocusDomainIdState((prev) => {
      const normalized = domainId && domainId.trim().length > 0 ? domainId.trim() : null;
      const next = prev === normalized ? null : normalized;
      if (next) {
        safeSetLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY, next);
      } else {
        safeRemoveLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY);
      }
      return next;
    });
  }, []);

  // Validate persisted focusDomainId against valid root categories
  useEffect(() => {
    if (focusDomainId) {
      const rootCategories = getRootCategories(categories);
      const isValid = rootCategories.some((r) => r.id === focusDomainId);
      if (!isValid) {
        setFocusDomainIdState(null);
        safeRemoveLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY);
      }
    }
  }, [categories, focusDomainId]);

  // Bootstrap Load & Hydration via DataRepository
  useEffect(() => {
    dataRepository
      .loadInitialData()
      .then((data) => {
        if (data.topics && data.topics.length > 0) {
          if (data.categories && data.categories.length > 0)
            setCategories(normalizeCategories(data.categories));
          setTopics(normalizeTopics(data.topics));
          if (data.notes && data.notes.length > 0) setNotes(data.notes);
          if (data.resources && data.resources.length > 0)
            setResources(data.resources);
          if (data.tags && data.tags.length > 0) setTags(data.tags);
        }
      })
      .catch((err) => {
        console.warn(
          "Repository initial load error, continuing with local state:",
          err,
        );
      });
  }, []);

  const isInitialMount = useRef(true);

  // Auto-sync to LocalStorage via repository (repository owns all storage I/O)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    dataRepository
      .syncHydrate({
        clientSyncId: `auto-sync-${Date.now()}`,
        version: "2.0.0",
        clientTimestamp: new Date().toISOString(),
        categories,
        topics,
        notes,
        resources,
        tags,
        links: [],
      })
      .catch((e) => {
        console.error("Failed to persist state via repository", e);
      });
  }, [categories, topics, notes, resources, tags]);

  // Category Handlers
  const addCategory = (categoryData: Omit<Category, "id">): string => {
    const newId = `cat-${Date.now()}`;
    const slug = categoryData.slug || generateCategorySlug(categoryData.name);
    const newCategory: Category = {
      ...categoryData,
      id: newId,
      slug,
      parentId: categoryData.parentId || null,
    };
    setCategories((prev) => [...prev, newCategory]);
    dataRepository.saveCategory(newCategory).catch(console.error);
    return newId;
  };

  const updateCategory = (id: string, categoryData: Partial<Category>) => {
    setCategories((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...categoryData } : c));
      const target = updated.find((c) => c.id === id);
      if (target) {
        dataRepository.saveCategory(target).catch(console.error);
      }
      return updated;
    });
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    dataRepository.deleteCategory(id).catch(console.error);
  };

  const mergeCategories = (
    sourceCategoryId: string,
    targetCategoryId: string,
  ): MergeCategoriesResult => {
    const result = mergeCategoryData(
      categories,
      topics,
      sourceCategoryId,
      targetCategoryId,
    );

    if (result.success) {
      setCategories(result.updatedCategories);
      setTopics(result.updatedTopics);

      if (focusDomainId === sourceCategoryId) {
        setFocusDomainId(targetCategoryId);
      }

      // Persist state: syncHydrate first to guarantee topic remapping, then notify repo of category deletion
      (async () => {
        try {
          await dataRepository.syncHydrate({
            clientSyncId: `merge-${Date.now()}`,
            version: "2.0.0",
            clientTimestamp: new Date().toISOString(),
            categories: result.updatedCategories,
            topics: result.updatedTopics,
            notes,
            resources,
            tags,
            links: [],
          });
          await dataRepository.deleteCategory(sourceCategoryId);
        } catch (err) {
          console.error("Failed to sync merge state:", err);
          dataRepository.deleteCategory(sourceCategoryId).catch(console.error);
        }
      })();
    }

    return result;
  };

  // Topics Handlers
  const addTopic = (
    topicData: Omit<
      Topic,
      "id" | "createdAt" | "updatedAt" | "studyProgress" | "links"
    >,
  ): string => {
    const newId = `topic-${Date.now()}`;
    const now = new Date().toISOString();
    const newTopic: Topic = {
      ...topicData,
      id: newId,
      slug:
        topicData.slug ||
        topicData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      visibility: topicData.visibility || "active",
      createdAt: now,
      updatedAt: now,
      links: [],
      studyProgress: {
        topicId: newId,
        status: "not_started",
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
    };
    setTopics((prev) => [...prev, newTopic]);
    dataRepository.saveTopic(newTopic).catch(console.error);
    return newId;
  };

  const updateTopic = (id: string, topicData: Partial<Topic>) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = {
            ...t,
            ...topicData,
            updatedAt: new Date().toISOString(),
          };
          dataRepository.saveTopic(updated).catch(console.error);
          return updated;
        }
        return t;
      }),
    );
  };

  const hideTopic = (id: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated: Topic = {
            ...t,
            visibility: "hidden",
            updatedAt: new Date().toISOString(),
          };
          dataRepository.saveTopic(updated).catch(console.error);
          return updated;
        }
        return t;
      }),
    );
  };

  const restoreTopic = (id: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated: Topic = {
            ...t,
            visibility: "active",
            updatedAt: new Date().toISOString(),
          };
          dataRepository.saveTopic(updated).catch(console.error);
          return updated;
        }
        return t;
      }),
    );
  };

  const deleteTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setNotes((prev) => prev.filter((n) => n.topicId !== id));
    setResources((prev) => prev.filter((r) => r.topicId !== id));
    dataRepository.deleteTopic(id).catch(console.error);
  };

  const updateTopicProgress = (
    topicId: string,
    progress: number,
    status?: TopicStatus,
  ) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const newStatus =
            status ||
            (progress >= 100
              ? "completed"
              : progress > 0
                ? "in_progress"
                : "not_started");
          const updatedProgress: StudyProgress = {
            ...t.studyProgress,
            progress: Math.min(100, Math.max(0, progress)),
            status: newStatus,
            lastStudied: new Date().toISOString(),
          };
          const updatedTopic = {
            ...t,
            studyProgress: updatedProgress,
            updatedAt: new Date().toISOString(),
          };
          dataRepository
            .saveStudyProgress(topicId, updatedProgress)
            .catch(console.error);
          return updatedTopic;
        }
        return t;
      }),
    );
  };

  const addKnowledgeLink = (linkData: Omit<KnowledgeLink, "id">) => {
    const newLink: KnowledgeLink = {
      ...linkData,
      id: `link-${Date.now()}`,
    };
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === linkData.sourceId) {
          const updated = { ...t, links: [...(t.links || []), newLink] };
          dataRepository.saveTopic(updated).catch(console.error);
          return updated;
        }
        return t;
      }),
    );
  };

  const removeKnowledgeLink = (linkId: string) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.links?.some((l) => l.id === linkId)) {
          const updated = {
            ...t,
            links: t.links.filter((l) => l.id !== linkId),
          };
          dataRepository.saveTopic(updated).catch(console.error);
          return updated;
        }
        return t;
      }),
    );
  };

  // Notes Handlers
  const addNote = (
    noteData: Omit<Note, "id" | "createdAt" | "updatedAt">,
  ): string => {
    const newId = `note-${Date.now()}`;
    const now = new Date().toISOString();
    const resolvedTopicIds =
      noteData.topicIds && noteData.topicIds.length > 0
        ? noteData.topicIds
        : undefined;
    const primaryTopicId = resolvedTopicIds
      ? resolvedTopicIds[0]
      : noteData.topicId;
    const newNote: Note = {
      ...noteData,
      id: newId,
      topicId: primaryTopicId,
      topicIds: resolvedTopicIds,
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [...prev, newNote]);
    dataRepository.saveNote(newNote).catch(console.error);
    return newId;
  };

  const updateNote = (id: string, noteData: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const resolvedTopicIds =
            noteData.topicIds !== undefined
              ? noteData.topicIds.length > 0
                ? noteData.topicIds
                : undefined
              : n.topicIds;
          const primaryTopicId =
            resolvedTopicIds && resolvedTopicIds.length > 0
              ? resolvedTopicIds[0]
              : noteData.topicId || n.topicId;
          const updated = {
            ...n,
            ...noteData,
            topicId: primaryTopicId,
            topicIds: resolvedTopicIds,
            updatedAt: new Date().toISOString(),
          };
          dataRepository.saveNote(updated).catch(console.error);
          return updated;
        }
        return n;
      }),
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    dataRepository.deleteNote(id).catch(console.error);
  };

  // Resources Handlers
  const addResource = (
    resData: Omit<Resource, "id" | "createdAt">,
  ): string => {
    const newId = `res-${Date.now()}`;
    const newRes: Resource = {
      ...resData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [...prev, newRes]);
    dataRepository.saveResource(newRes).catch(console.error);
    return newId;
  };

  const updateResource = (id: string, resData: Partial<Resource>) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, ...resData };
          dataRepository.saveResource(updated).catch(console.error);
          return updated;
        }
        return r;
      }),
    );
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    dataRepository.deleteResource(id).catch(console.error);
  };

  // SM-2 Spaced Repetition Handlers
  const reviewTopicSM2 = (topicId: string, quality: number) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const currentProgress = t.studyProgress || {
            topicId,
            status: "not_started",
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 0,
          };
          const sm2Result = calculateNextReview(
            currentProgress.interval,
            currentProgress.easeFactor,
            currentProgress.repetitions,
            quality,
          );
          const updatedProgress: StudyProgress = {
            ...currentProgress,
            ...sm2Result,
            lastStudied: new Date().toISOString(),
            status: quality >= 3 ? "reviewing" : "in_progress",
          };
          const updatedTopic = {
            ...t,
            studyProgress: updatedProgress,
            updatedAt: new Date().toISOString(),
          };
          dataRepository
            .saveStudyProgress(topicId, updatedProgress)
            .catch(console.error);
          return updatedTopic;
        }
        return t;
      }),
    );
  };

  const logStudyTime = (topicId: string, minutes: number) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === topicId) {
          const currentProgress = t.studyProgress || {
            topicId,
            status: "not_started",
            progress: 0,
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            totalNotes: 0,
            timeSpent: 0,
          };
          const updatedProgress = {
            ...currentProgress,
            timeSpent: (currentProgress.timeSpent || 0) + minutes,
            lastStudied: new Date().toISOString(),
          };
          const updatedTopic = {
            ...t,
            studyProgress: updatedProgress,
            updatedAt: new Date().toISOString(),
          };
          dataRepository
            .saveStudyProgress(topicId, updatedProgress)
            .catch(console.error);
          return updatedTopic;
        }
        return t;
      }),
    );
  };

  // Review Queue Computed
  const reviewQueue = useMemo(() => {
    return getReviewQueue(topics);
  }, [topics]);

  // Analytics Computed
  const stats = useMemo(() => {
    const phatHocList = topics.filter((t) => t.type === "phat-hoc");
    const huyenHocList = topics.filter((t) => t.type === "huyen-hoc");

    const phatHocDone = phatHocList.filter(
      (t) =>
        t.studyProgress?.progress >= 100 ||
        t.studyProgress.status === "completed",
    ).length;
    const phatHocDonePercent =
      phatHocList.length > 0
        ? Math.round((phatHocDone / phatHocList.length) * 100)
        : 0;

    const huyenHocDone = huyenHocList.filter(
      (t) =>
        t.studyProgress?.progress >= 100 ||
        t.studyProgress.status === "completed",
    ).length;
    const huyenHocDonePercent =
      huyenHocList.length > 0
        ? Math.round((huyenHocDone / huyenHocList.length) * 100)
        : 0;

    const studyingThisWeek = topics.filter(
      (t) =>
        t.studyProgress.status === "in_progress" ||
        t.studyProgress.status === "reviewing",
    ).length;
    const totalTimeSpentMinutes = topics.reduce(
      (acc, t) => acc + (t.studyProgress?.timeSpent || 0),
      0,
    );
    const completedTopicsCount = topics.filter(
      (t) =>
        t.studyProgress?.progress >= 100 ||
        t.studyProgress.status === "completed",
    ).length;

    return {
      totalTopics: topics.length,
      phatHocTopics: phatHocList.length,
      phatHocDonePercent,
      huyenHocTopics: huyenHocList.length,
      huyenHocDonePercent,
      studyingThisWeek,
      totalTimeSpentMinutes,
      completedTopicsCount,
      totalNotesCount: notes.length,
      totalResourcesCount: resources.length,
      dueReviewsCount: reviewQueue.length,
    };
  }, [topics, notes, resources, reviewQueue]);

  // Export / Import
  const exportAllDataJSON = () => {
    const fullData = {
      categories,
      topics,
      notes,
      resources,
      tags,
      exportDate: new Date().toISOString(),
      version: "1.0",
    };
    return JSON.stringify(fullData, null, 2);
  };

  const importAllDataJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.topics && Array.isArray(parsed.topics)) {
        const normCats = normalizeCategories(parsed.categories || categories);
        const normTopics = normalizeTopics(parsed.topics);

        if (parsed.categories) setCategories(normCats);
        setTopics(normTopics);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.resources) setResources(parsed.resources);
        if (parsed.tags) setTags(parsed.tags);

        dataRepository
          .syncHydrate({
            clientSyncId: `import-${Date.now()}`,
            version: "2.0.0",
            clientTimestamp: new Date().toISOString(),
            categories: normCats,
            topics: normTopics,
            notes: parsed.notes || notes,
            resources: parsed.resources || resources,
            tags: parsed.tags || tags,
          })
          .catch(console.error);

        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resetToDefaultData = () => {
    // Delegate storage cleanup to repository (sole owner of all localStorage keys)
    dataRepository.resetAllData().catch((err) => {
      console.warn("resetAllData storage cleanup failed:", err);
    });
    safeRemoveLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY);
    setFocusDomainIdState(null);
    setCategories(normalizeCategories(INITIAL_CATEGORIES));
    setTopics(normalizeTopics(INITIAL_TOPICS));
    setNotes(INITIAL_NOTES);
    setResources(INITIAL_RESOURCES);
    setTags(INITIAL_TAGS);
  };

  // Rehydration Action (Phase 2C - Post Restore / Manual Sync)
  const reloadAllData = async (): Promise<boolean> => {
    try {
      // Direct HTTP fetch when running in browser with ApiDataRepository
      if (
        typeof window !== "undefined" &&
        window.location &&
        window.location.origin &&
        window.location.origin.startsWith("http")
      ) {
        const topicsRes = await fetch(`${window.location.origin}/api/topics`);
        if (!topicsRes.ok) {
          return false;
        }
        const topicsData = await topicsRes.json();
        if (!Array.isArray(topicsData) || topicsData.length === 0) {
          return false;
        }
        const categoriesRes = await fetch(
          `${window.location.origin}/api/categories`,
        ).catch(() => null);
        const categoriesData =
          categoriesRes && categoriesRes.ok ? await categoriesRes.json() : null;

        const hasValidCategories =
          Array.isArray(categoriesData) &&
          categoriesData.length > 0 &&
          typeof categoriesData[0]?.name === "string" &&
          typeof categoriesData[0]?.slug === "string";

        const normCats = hasValidCategories
          ? normalizeCategories(categoriesData)
          : categories;

        if (hasValidCategories) {
          setCategories(normCats);
        }

        const notesRes = await fetch(
          `${window.location.origin}/api/notes`,
        ).catch(() => null);
        const notesData =
          notesRes && notesRes.ok ? await notesRes.json() : null;

        const hasValidNotes =
          Array.isArray(notesData) &&
          notesData.length > 0 &&
          typeof notesData[0]?.content === "string" &&
          (typeof notesData[0]?.topicId === "string" ||
            Array.isArray(notesData[0]?.topicIds));

        const safeNotes = hasValidNotes ? notesData : notes;
        if (hasValidNotes) setNotes(safeNotes);

        const resourcesRes = await fetch(
          `${window.location.origin}/api/resources`,
        ).catch(() => null);
        const resourcesData =
          resourcesRes && resourcesRes.ok ? await resourcesRes.json() : null;

        const hasValidResources =
          Array.isArray(resourcesData) &&
          resourcesData.length > 0 &&
          ["book", "article", "video", "audio", "pdf"].includes(
            resourcesData[0]?.type,
          );

        const safeResources = hasValidResources ? resourcesData : resources;
        if (hasValidResources) setResources(safeResources);

        const normTopics = normalizeTopics(topicsData);
        setTopics(normTopics);

        // Persist via repository (no raw localStorage calls here)
        dataRepository
          .syncHydrate({
            clientSyncId: `reload-${Date.now()}`,
            version: "2.0.0",
            clientTimestamp: new Date().toISOString(),
            categories: normCats,
            topics: normTopics,
            notes: safeNotes,
            resources: safeResources,
            tags,
            links: [],
          })
          .catch(console.error);

        return true;
      }

      // Local / Offline fallback
      const data = await dataRepository.loadInitialData();
      if (!data || !Array.isArray(data.topics) || data.topics.length === 0) {
        return false;
      }
      if (data.categories && data.categories.length > 0) {
        setCategories(normalizeCategories(data.categories));
      }
      const normTopics = normalizeTopics(data.topics);
      setTopics(normTopics);
      if (data.notes) setNotes(data.notes);
      if (data.resources) setResources(data.resources);
      if (data.tags) setTags(data.tags);

      return true;
    } catch (err) {
      console.warn(
        "reloadAllData failed, preserving previous in-memory state:",
        err,
      );
      return false;
    }
  };

  const knowledgeValue = useMemo<DomainDataContextType>(
    () => ({
      categories,
      topics,
      notes,
      resources,
      tags,
      focusDomainId,
      setFocusDomainId,
      addCategory,
      updateCategory,
      deleteCategory,
      mergeCategories,
      addTopic,
      updateTopic,
      deleteTopic,
      hideTopic,
      restoreTopic,
      updateTopicProgress,
      addKnowledgeLink,
      removeKnowledgeLink,
      addNote,
      updateNote,
      deleteNote,
      addResource,
      updateResource,
      deleteResource,
      reviewTopicSM2,
      logStudyTime,
      stats,
      reviewQueue,
      exportAllDataJSON,
      importAllDataJSON,
      resetToDefaultData,
      reloadAllData,
    }),
    [categories, topics, notes, resources, tags, stats, reviewQueue, focusDomainId, setFocusDomainId],
  );

  return (
    <DomainDataContext.Provider value={knowledgeValue}>
      <StudyTimerProvider onLogStudyTime={logStudyTime}>
        <DataProviderBridge knowledgeValue={knowledgeValue}>
          {children}
        </DataProviderBridge>
      </StudyTimerProvider>
    </DomainDataContext.Provider>
  );
}

function DataProviderBridge({
  children,
  knowledgeValue,
}: {
  children: ReactNode;
  knowledgeValue: DomainDataContextType;
}) {
  const timer = useStudyTimer();
  const nav = useNavigation();

  const combinedValue = useMemo<DataContextType>(
    () => ({
      ...knowledgeValue,
      deleteTopic: (id: string) => {
        knowledgeValue.deleteTopic(id);
        if (nav.selectedTopicId === id) {
          nav.setSelectedTopicId(null);
        }
      },
      activeTab: nav.activeTab,
      selectedTopicId: nav.selectedTopicId,
      searchQuery: nav.searchQuery,
      selectedCategoryFilter: nav.selectedCategoryFilter,
      selectedTagFilter: nav.selectedTagFilter,
      setActiveTab: nav.setActiveTab,
      setSelectedTopicId: nav.setSelectedTopicId,
      setSearchQuery: nav.setSearchQuery,
      setSelectedCategoryFilter: nav.setSelectedCategoryFilter,
      setSelectedTagFilter: nav.setSelectedTagFilter,
      openTopicDetail: nav.openTopicDetail,
      activeTimerTopicId: timer.activeTimerTopicId,
      timerSeconds: timer.timerSeconds,
      isTimerRunning: timer.isTimerRunning,
      timerMode: timer.timerMode,
      pomodoroTimeRemaining: timer.pomodoroTimeRemaining,
      startStudyTimer: timer.startStudyTimer,
      pauseStudyTimer: timer.pauseStudyTimer,
      stopAndSaveStudyTimer: timer.stopAndSaveStudyTimer,
    }),
    [knowledgeValue, nav, timer],
  );

  return (
    <DataContext.Provider value={combinedValue}>
      {children}
    </DataContext.Provider>
  );
}

export function DataProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationProvider>
      <InnerDataProvider>{children}</InnerDataProvider>
    </NavigationProvider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

