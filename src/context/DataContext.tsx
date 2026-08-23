import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from '../data/initialData';
import { calculateNextReview, getReviewQueue } from '../lib/spaced-repetition';

const STORAGE_KEY = 'phat_hoc_huyen_hoc_clean_v3';

export type ActiveTab =
  | 'dashboard'
  | 'topics'
  | 'graph'
  | 'progress'
  | 'notes'
  | 'resources'
  | 'search'
  | 'ai_studio'
  | 'abhidharma_matrix'
  | 'divination_matrix'
  | 'lexicon';

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
  timerMode: 'stopwatch' | 'pomodoro';
  pomodoroTimeRemaining: number;

  // Actions - Navigation
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedTopicId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategoryFilter: (catId: string | null) => void;
  setSelectedTagFilter: (tag: string | null) => void;
  openTopicDetail: (topicId: string) => void;

  // Actions - Topics
  addTopic: (topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'studyProgress' | 'links'>) => string;
  updateTopic: (id: string, topicData: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  updateTopicProgress: (topicId: string, progress: number, status?: TopicStatus) => void;
  addKnowledgeLink: (linkData: Omit<KnowledgeLink, 'id'>) => void;
  removeKnowledgeLink: (linkId: string) => void;

  // Actions - Notes
  addNote: (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, noteData: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Actions - Resources
  addResource: (resData: Omit<Resource, 'id' | 'createdAt'>) => string;
  updateResource: (id: string, resData: Partial<Resource>) => void;
  deleteResource: (id: string) => void;

  // Actions - Spaced Repetition & Study
  reviewTopicSM2: (topicId: string, quality: number) => void;
  logStudyTime: (topicId: string, minutes: number) => void;
  startStudyTimer: (topicId: string, mode?: 'stopwatch' | 'pomodoro') => void;
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

  // Export & Reset
  exportAllDataJSON: () => string;
  importAllDataJSON: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Timer State
  const [activeTimerTopicId, setActiveTimerTopicId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [pomodoroTimeRemaining, setPomodoroTimeRemaining] = useState(25 * 60);

  // Auto-sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify(categories));
      localStorage.setItem(`${STORAGE_KEY}_topics`, JSON.stringify(topics));
      localStorage.setItem(`${STORAGE_KEY}_notes`, JSON.stringify(notes));
      localStorage.setItem(`${STORAGE_KEY}_resources`, JSON.stringify(resources));
      localStorage.setItem(`${STORAGE_KEY}_tags`, JSON.stringify(tags));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [categories, topics, notes, resources, tags]);

  // Timer Interval Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        if (timerMode === 'stopwatch') {
          setTimerSeconds((prev) => prev + 1);
        } else {
          setPomodoroTimeRemaining((prev) => {
            if (prev <= 1) {
              setIsTimerRunning(false);
              return 0;
            }
            return prev - 1;
          });
          setTimerSeconds((prev) => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerMode]);

  // Navigation Helpers
  const openTopicDetail = (topicId: string) => {
    setSelectedTopicId(topicId);
    setActiveTab('topics');
  };

  // Topics CRUD
  const addTopic = (topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'studyProgress' | 'links'>): string => {
    const id = `topic-${Date.now()}`;
    const newTopic: Topic = {
      ...topicData,
      id,
      links: [],
      studyProgress: {
        topicId: id,
        status: 'not_started',
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTopics((prev) => [newTopic, ...prev]);
    return id;
  };

  const updateTopic = (id: string, topicData: Partial<Topic>) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...topicData, updatedAt: new Date().toISOString() } : t))
    );
  };

  const deleteTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    setNotes((prev) => prev.filter((n) => n.topicId !== id));
    setResources((prev) => prev.filter((r) => r.topicId !== id));
    if (selectedTopicId === id) setSelectedTopicId(null);
  };

  const updateTopicProgress = (topicId: string, progress: number, status?: TopicStatus) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        let newStatus = status || t.studyProgress.status;
        if (!status) {
          if (progress >= 100) newStatus = 'completed';
          else if (progress > 0 && newStatus === 'not_started') newStatus = 'in_progress';
        }
        return {
          ...t,
          studyProgress: {
            ...t.studyProgress,
            progress: Math.min(100, Math.max(0, progress)),
            status: newStatus,
            endDate: progress >= 100 ? new Date().toISOString() : t.studyProgress.endDate,
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addKnowledgeLink = (linkData: Omit<KnowledgeLink, 'id'>) => {
    const id = `link-${Date.now()}`;
    const newLink: KnowledgeLink = { ...linkData, id };
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === linkData.sourceId) {
          return { ...t, links: [...t.links, newLink] };
        }
        return t;
      })
    );
  };

  const removeKnowledgeLink = (linkId: string) => {
    setTopics((prev) =>
      prev.map((t) => ({
        ...t,
        links: t.links.filter((l) => l.id !== linkId),
      }))
    );
  };

  // Notes CRUD
  const addNote = (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = `note-${Date.now()}`;
    const newNote: Note = {
      ...noteData,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);

    // Update topic note count
    if (noteData.topicId) {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id === noteData.topicId) {
            return {
              ...t,
              studyProgress: {
                ...t.studyProgress,
                totalNotes: (t.studyProgress.totalNotes || 0) + 1,
              },
            };
          }
          return t;
        })
      );
    }
    return id;
  };

  const updateNote = (id: string, noteData: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...noteData, updatedAt: new Date().toISOString() } : n))
    );
  };

  const deleteNote = (id: string) => {
    const noteToDelete = notes.find((n) => n.id === id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (noteToDelete?.topicId) {
      setTopics((prev) =>
        prev.map((t) => {
          if (t.id === noteToDelete.topicId) {
            return {
              ...t,
              studyProgress: {
                ...t.studyProgress,
                totalNotes: Math.max(0, (t.studyProgress.totalNotes || 1) - 1),
              },
            };
          }
          return t;
        })
      );
    }
  };

  // Resources CRUD
  const addResource = (resData: Omit<Resource, 'id' | 'createdAt'>): string => {
    const id = `res-${Date.now()}`;
    const newResource: Resource = {
      ...resData,
      id,
      createdAt: new Date().toISOString(),
    };
    setResources((prev) => [newResource, ...prev]);
    return id;
  };

  const updateResource = (id: string, resData: Partial<Resource>) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...resData } : r)));
  };

  const deleteResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  // Spaced Repetition SM-2
  const reviewTopicSM2 = (topicId: string, quality: number) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        const currentProg = t.studyProgress;
        const schedule = calculateNextReview(
          currentProg.interval,
          currentProg.easeFactor,
          currentProg.repetitions,
          quality
        );
        return {
          ...t,
          studyProgress: {
            ...t.studyProgress,
            ...schedule,
            lastStudied: new Date().toISOString(),
            status: t.studyProgress.progress >= 100 ? 'completed' : 'in_progress',
          },
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Time tracking
  const logStudyTime = (topicId: string, minutes: number) => {
    if (minutes <= 0) return;
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          studyProgress: {
            ...t.studyProgress,
            timeSpent: (t.studyProgress.timeSpent || 0) + minutes,
            lastStudied: new Date().toISOString(),
          },
        };
      })
    );
  };

  const startStudyTimer = (topicId: string, mode: 'stopwatch' | 'pomodoro' = 'stopwatch') => {
    setActiveTimerTopicId(topicId);
    setTimerMode(mode);
    setTimerSeconds(0);
    setPomodoroTimeRemaining(25 * 60);
    setIsTimerRunning(true);
  };

  const pauseStudyTimer = () => {
    setIsTimerRunning(false);
  };

  const stopAndSaveStudyTimer = () => {
    if (activeTimerTopicId && timerSeconds > 0) {
      const minutesSpent = Math.max(1, Math.round(timerSeconds / 60));
      logStudyTime(activeTimerTopicId, minutesSpent);
    }
    setIsTimerRunning(false);
    setActiveTimerTopicId(null);
    setTimerSeconds(0);
  };

  // Computed Review Queue
  const reviewQueue = useMemo(() => getReviewQueue(topics), [topics]);

  // Comprehensive Analytics
  const stats = useMemo(() => {
    const phatHocList = topics.filter((t) => t.type === 'phat-hoc');
    const huyenHocList = topics.filter((t) => t.type === 'huyen-hoc');

    const phatHocDoneSum = phatHocList.reduce((acc, t) => acc + (t.studyProgress?.progress || 0), 0);
    const phatHocDonePercent = phatHocList.length > 0 ? Math.round(phatHocDoneSum / phatHocList.length) : 0;

    const huyenHocDoneSum = huyenHocList.reduce((acc, t) => acc + (t.studyProgress?.progress || 0), 0);
    const huyenHocDonePercent = huyenHocList.length > 0 ? Math.round(huyenHocDoneSum / huyenHocList.length) : 0;

    const studyingThisWeek = topics.filter((t) => t.studyProgress.status === 'in_progress' || t.studyProgress.status === 'reviewing').length;
    const totalTimeSpentMinutes = topics.reduce((acc, t) => acc + (t.studyProgress?.timeSpent || 0), 0);
    const completedTopicsCount = topics.filter((t) => t.studyProgress?.progress >= 100 || t.studyProgress.status === 'completed').length;

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
      version: '1.0',
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
      localStorage.removeItem('phat_hoc_huyen_hoc_dashboard_v1_categories');
      localStorage.removeItem('phat_hoc_huyen_hoc_dashboard_v1_topics');
      localStorage.removeItem('phat_hoc_huyen_hoc_dashboard_v1_notes');
      localStorage.removeItem('phat_hoc_huyen_hoc_dashboard_v1_resources');
      localStorage.removeItem('phat_hoc_huyen_hoc_dashboard_v1_tags');
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
