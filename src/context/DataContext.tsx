import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
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
  LocalStorageDataRepository,
  ApiDataRepository,
  IDataRepository,
} from "../services/dataRepository";

const STORAGE_KEY = "phat_hoc_huyen_hoc_clean_v3";
const dataRepository: IDataRepository =
  typeof window !== "undefined"
    ? new ApiDataRepository("/api", new LocalStorageDataRepository(STORAGE_KEY))
    : new LocalStorageDataRepository(STORAGE_KEY);

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

  // Actions - Topics
  addTopic: (
    topicData: Omit<
      Topic,
      "id" | "createdAt" | "updatedAt" | "studyProgress" | "links"
    >,
  ) => string;
  updateTopic: (id: string, topicData: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
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

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  // Initialize state from LocalStorage or Seed Data
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_categories`);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_topics`);
      return saved ? JSON.parse(saved) : INITIAL_TOPICS;
    } catch {
      return INITIAL_TOPICS;
    }
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_notes`);
      return saved ? JSON.parse(saved) : INITIAL_NOTES;
    } catch {
      return INITIAL_NOTES;
    }
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_resources`);
      return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
    } catch {
      return INITIAL_RESOURCES;
    }
  });

  const [tags, setTags] = useState<Tag[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_tags`);
      return saved ? JSON.parse(saved) : INITIAL_TAGS;
    } catch {
      return INITIAL_TAGS;
    }
  });

  // UI Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null,
  );

  // Timer State
  const [activeTimerTopicId, setActiveTimerTopicId] = useState<string | null>(
    null,
  );
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"stopwatch" | "pomodoro">(
    "stopwatch",
  );
  const [pomodoroTimeRemaining, setPomodoroTimeRemaining] = useState(25 * 60);

  // Bootstrap Load & Hydration via DataRepository
  useEffect(() => {
    dataRepository
      .loadInitialData()
      .then((data) => {
        if (data.topics && data.topics.length > 0) {
          if (data.categories && data.categories.length > 0)
            setCategories(data.categories);
          setTopics(data.topics);
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

  // Auto-sync to LocalStorage
  useEffect(() => {
    try {
      const fullPayload = { categories, topics, notes, resources, tags };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPayload));
      localStorage.setItem(
        `${STORAGE_KEY}_categories`,
        JSON.stringify(categories),
      );
      localStorage.setItem(`${STORAGE_KEY}_topics`, JSON.stringify(topics));
      localStorage.setItem(`${STORAGE_KEY}_notes`, JSON.stringify(notes));
      localStorage.setItem(
        `${STORAGE_KEY}_resources`,
        JSON.stringify(resources),
      );
      localStorage.setItem(`${STORAGE_KEY}_tags`, JSON.stringify(tags));
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [categories, topics, notes, resources, tags]);

  // Timer Interval Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerMode === "stopwatch") {
          setTimerSeconds((prev) => prev + 1);
        } else {
          setPomodoroTimeRemaining((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMode]);

  // Navigation Handlers
  const openTopicDetail = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveTab("topics");
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

  const deleteTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setNotes((prev) => prev.filter((n) => n.topicId !== id));
    setResources((prev) => prev.filter((r) => r.topicId !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
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
    const newNote: Note = {
      ...noteData,
      id: newId,
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
          const updated = {
            ...n,
            ...noteData,
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

  const startStudyTimer = (
    topicId: string,
    mode: "stopwatch" | "pomodoro" = "stopwatch",
  ) => {
    setActiveTimerTopicId(topicId);
    setTimerMode(mode);
    if (mode === "pomodoro") {
      setPomodoroTimeRemaining(25 * 60);
    } else {
      setTimerSeconds(0);
    }
    setIsTimerRunning(true);
  };

  const pauseStudyTimer = () => {
    setIsTimerRunning(false);
  };

  const stopAndSaveStudyTimer = () => {
    setIsTimerRunning(false);
    if (activeTimerTopicId) {
      const minutesSpent =
        timerMode === "stopwatch"
          ? Math.round(timerSeconds / 60)
          : Math.round((25 * 60 - pomodoroTimeRemaining) / 60);
      if (minutesSpent > 0) {
        logStudyTime(activeTimerTopicId, minutesSpent);
      }
    }
    setActiveTimerTopicId(null);
    setTimerSeconds(0);
    setPomodoroTimeRemaining(25 * 60);
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
        if (parsed.categories) setCategories(parsed.categories);
        setTopics(parsed.topics);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.resources) setResources(parsed.resources);
        if (parsed.tags) setTags(parsed.tags);

        dataRepository
          .syncHydrate({
            clientSyncId: `import-${Date.now()}`,
            version: "2.0.0",
            clientTimestamp: new Date().toISOString(),
            categories: parsed.categories || categories,
            topics: parsed.topics,
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
    try {
      localStorage.removeItem(`${STORAGE_KEY}_categories`);
      localStorage.removeItem(`${STORAGE_KEY}_topics`);
      localStorage.removeItem(`${STORAGE_KEY}_notes`);
      localStorage.removeItem(`${STORAGE_KEY}_resources`);
      localStorage.removeItem(`${STORAGE_KEY}_tags`);
      localStorage.removeItem("phat_hoc_huyen_hoc_dashboard_v1_categories");
      localStorage.removeItem("phat_hoc_huyen_hoc_dashboard_v1_topics");
      localStorage.removeItem("phat_hoc_huyen_hoc_dashboard_v1_notes");
      localStorage.removeItem("phat_hoc_huyen_hoc_dashboard_v1_resources");
      localStorage.removeItem("phat_hoc_huyen_hoc_dashboard_v1_tags");
    } catch {
      // Ignore storage clear errors
    }
    setCategories(INITIAL_CATEGORIES);
    setTopics(INITIAL_TOPICS);
    setNotes(INITIAL_NOTES);
    setResources(INITIAL_RESOURCES);
    setTags(INITIAL_TAGS);
    setActiveTimerTopicId(null);
    setIsTimerRunning(false);
    setTimerSeconds(0);
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
        const notesRes = await fetch(
          `${window.location.origin}/api/notes`,
        ).catch(() => null);
        const notesData =
          notesRes && notesRes.ok ? await notesRes.json() : [];

        const resourcesRes = await fetch(
          `${window.location.origin}/api/resources`,
        ).catch(() => null);
        const resourcesData =
          resourcesRes && resourcesRes.ok ? await resourcesRes.json() : [];

        setTopics(topicsData);
        if (notesData) setNotes(notesData);
        if (resourcesData) setResources(resourcesData);

        try {
          const fullPayload = {
            categories,
            topics: topicsData,
            notes: notesData,
            resources: resourcesData,
            tags,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPayload));
          localStorage.setItem(
            `${STORAGE_KEY}_topics`,
            JSON.stringify(topicsData),
          );
          localStorage.setItem(
            `${STORAGE_KEY}_notes`,
            JSON.stringify(notesData),
          );
          localStorage.setItem(
            `${STORAGE_KEY}_resources`,
            JSON.stringify(resourcesData),
          );
        } catch {
          // Ignore storage write errors
        }

        return true;
      }

      // Local / Offline fallback
      const data = await dataRepository.loadInitialData();
      if (!data || !Array.isArray(data.topics) || data.topics.length === 0) {
        return false;
      }
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
      setTopics(data.topics);
      if (data.notes) setNotes(data.notes);
      if (data.resources) setResources(data.resources);
      if (data.tags) setTags(data.tags);

      try {
        const fullPayload = {
          categories: data.categories || [],
          topics: data.topics,
          notes: data.notes || [],
          resources: data.resources || [],
          tags: data.tags || [],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPayload));
        localStorage.setItem(
          `${STORAGE_KEY}_categories`,
          JSON.stringify(data.categories || []),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_topics`,
          JSON.stringify(data.topics),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_notes`,
          JSON.stringify(data.notes || []),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_resources`,
          JSON.stringify(data.resources || []),
        );
        localStorage.setItem(
          `${STORAGE_KEY}_tags`,
          JSON.stringify(data.tags || []),
        );
      } catch {
        // Ignore storage write errors
      }

      return true;
    } catch (err) {
      console.warn(
        "reloadAllData failed, preserving previous in-memory state:",
        err,
      );
      return false;
    }
  };

  return (
    <DataContext.Provider
      value={{
        categories,
        topics,
        notes,
        resources,
        tags,
        activeTab,
        selectedTopicId,
        searchQuery,
        selectedCategoryFilter,
        selectedTagFilter,
        activeTimerTopicId,
        timerSeconds,
        isTimerRunning,
        timerMode,
        pomodoroTimeRemaining,
        setActiveTab,
        setSelectedTopicId,
        setSearchQuery,
        setSelectedCategoryFilter,
        setSelectedTagFilter,
        openTopicDetail,
        addTopic,
        updateTopic,
        deleteTopic,
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
        startStudyTimer,
        pauseStudyTimer,
        stopAndSaveStudyTimer,
        stats,
        reviewQueue,
        exportAllDataJSON,
        importAllDataJSON,
        resetToDefaultData,
        reloadAllData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
