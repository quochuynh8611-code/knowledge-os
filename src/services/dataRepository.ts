import { Category, Topic, Note, Resource, Tag, StudyProgress } from "../types";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
} from "../lib/storage";
import { SyncQueueService } from "./syncQueue";
import {
  ValidatedHydrateInput,
  ValidatedHydrateResponse,
  HydratePayloadSchema,
  ValidatedBackupSnapshot,
  ValidatedRestoreRequest,
  ValidatedRestoreResponse,
  ValidatedDbHealthResponse,
  BackupSnapshotSchema,
  RestoreRequestSchema,
  RestoreResponseSchema,
  DbHealthResponseSchema,
  FlashcardCreateSchema,
  FlashcardUpdateSchema,
  FlashcardReviewInputSchema,
} from "../lib/validation";
import type {
  Flashcard,
  FlashcardSchedule,
  FlashcardReviewResponse,
  FlashcardProgressStats,
} from "../types/flashcard";
import { calculateFlashcardNextReview } from "../lib/flashcardScheduler";

export type { FlashcardProgressStats };


export interface RepositorySyncResult {
  isOnline: boolean;
  synced: boolean;
  message?: string;
}

export interface IDataRepository {
  // 1. Initial Load & Synchronization
  loadInitialData(): Promise<{
    categories: Category[];
    topics: Topic[];
    notes: Note[];
    resources: Resource[];
    tags: Tag[];
  }>;
  syncHydrate(
    payload: ValidatedHydrateInput,
  ): Promise<ValidatedHydrateResponse>;

  // 2. Categories CRUD
  saveCategory(category: Category): Promise<Category>;
  deleteCategory(categoryId: string): Promise<boolean>;

  // 3. Topics CRUD
  saveTopic(topic: Topic): Promise<Topic>;
  deleteTopic(topicId: string): Promise<boolean>;

  // 4. Notes CRUD
  saveNote(note: Note): Promise<Note>;
  deleteNote(noteId: string): Promise<boolean>;

  // 5. Resources CRUD
  saveResource(resource: Resource): Promise<Resource>;
  deleteResource(resourceId: string): Promise<boolean>;

  // 6. Spaced Repetition (SM-2) & Study Progress
  saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress>;

  // 7. Disaster Recovery & Health Checks (Phase 2C - Option A)
  exportBackupSnapshot(): Promise<ValidatedBackupSnapshot>;
  restoreBackupSnapshot(
    req: ValidatedRestoreRequest,
  ): Promise<ValidatedRestoreResponse>;
  getDbHealth(): Promise<ValidatedDbHealthResponse>;

  // 8. Full Storage Reset (P0.2 - SSOT)
  resetAllData(): Promise<boolean>;

  // 9. Flashcards & Spaced Repetition (Phase F4)
  createFlashcard?(input: unknown): Promise<Flashcard>;
  updateFlashcard?(id: string, input: unknown): Promise<Flashcard>;
  deleteFlashcard?(id: string): Promise<boolean>;
  recordFlashcardReview?(input: unknown): Promise<FlashcardReviewResponse>;
  recordReviewAtomic?(input: unknown): Promise<FlashcardReviewResponse>;
  getDueFlashcards?(filters?: { topicId?: string; now?: Date }): Promise<Flashcard[]>;
  getFlashcardProgress?(filters?: { topicId?: string }): Promise<FlashcardProgressStats>;
}

/**
 * LocalStorage Fallback Repository Implementation
 * Dùng làm lớp dự phòng offline khi chưa kết nối PostgreSQL hoặc máy chủ mất kết nối
 */
export class LocalStorageDataRepository implements IDataRepository {
  private storageKey: string;

  constructor(storageKey = "phat_hoc_huyen_hoc_clean_v3") {
    this.storageKey = storageKey;
  }

  /**
   * Writes state to both the root key and all 5 entity sub-keys.
   * This is the single internal persistence method for all mutations.
   * Using safe helpers prevents SecurityError / QuotaExceededError crashes.
   */
  private _persist(data: {
    categories: Category[];
    topics: Topic[];
    notes: Note[];
    resources: Resource[];
    tags: Tag[];
    links?: unknown[];
    _lastSyncedAt?: string;
  }): void {
    safeSetLocalStorageItem(this.storageKey, JSON.stringify(data));
    safeSetLocalStorageItem(`${this.storageKey}_categories`, JSON.stringify(data.categories));
    safeSetLocalStorageItem(`${this.storageKey}_topics`, JSON.stringify(data.topics));
    safeSetLocalStorageItem(`${this.storageKey}_notes`, JSON.stringify(data.notes));
    safeSetLocalStorageItem(`${this.storageKey}_resources`, JSON.stringify(data.resources));
    safeSetLocalStorageItem(`${this.storageKey}_tags`, JSON.stringify(data.tags));
  }

  async loadInitialData() {
    // Primary: try root key
    const raw = safeGetLocalStorageItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          categories: parsed.categories || [],
          topics: parsed.topics || [],
          notes: parsed.notes || [],
          resources: parsed.resources || [],
          tags: parsed.tags || [],
        };
      } catch (e) {
        console.warn(
          "Failed to parse local storage, returning empty structures",
          e,
        );
      }
    }

    // Fallback: try individual sub-keys (root key missing or corrupt)
    const categoriesRaw = safeGetLocalStorageItem(`${this.storageKey}_categories`);
    const topicsRaw = safeGetLocalStorageItem(`${this.storageKey}_topics`);
    const notesRaw = safeGetLocalStorageItem(`${this.storageKey}_notes`);
    const resourcesRaw = safeGetLocalStorageItem(`${this.storageKey}_resources`);
    const tagsRaw = safeGetLocalStorageItem(`${this.storageKey}_tags`);

    const hasAnySubKey = categoriesRaw || topicsRaw || notesRaw || resourcesRaw || tagsRaw;
    if (hasAnySubKey) {
      try {
        return {
          categories: categoriesRaw ? JSON.parse(categoriesRaw) : [],
          topics: topicsRaw ? JSON.parse(topicsRaw) : [],
          notes: notesRaw ? JSON.parse(notesRaw) : [],
          resources: resourcesRaw ? JSON.parse(resourcesRaw) : [],
          tags: tagsRaw ? JSON.parse(tagsRaw) : [],
        };
      } catch (e) {
        console.warn("Failed to parse sub-key storage, returning empty structures", e);
      }
    }

    return { categories: [], topics: [], notes: [], resources: [], tags: [] };
  }

  async syncHydrate(
    payload: ValidatedHydrateInput,
  ): Promise<ValidatedHydrateResponse> {
    const validated = HydratePayloadSchema.parse(payload);
    const normalizedTopics: Topic[] = validated.topics.map((t) => ({
      ...t,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
      studyProgress: t.studyProgress || {
        topicId: t.id,
        status: "not_started",
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
    }));

    this._persist({
      categories: validated.categories,
      topics: normalizedTopics,
      notes: validated.notes,
      resources: validated.resources,
      tags: validated.tags,
      links: validated.links,
      _lastSyncedAt: new Date().toISOString(),
    });
    return {
      success: true,
      clientSyncId: validated.clientSyncId,
      serverTimestamp: new Date().toISOString(),
      summary: {
        categoriesUpserted: validated.categories.length,
        topicsUpserted: validated.topics.length,
        notesUpserted: validated.notes.length,
        resourcesUpserted: validated.resources.length,
        tagsUpserted: validated.tags.length,
        linksUpserted: validated.links.length,
        progressMerged: validated.topics.filter((t) => t.studyProgress).length,
      },
    };
  }

  async saveCategory(category: Category): Promise<Category> {
    const data = await this.loadInitialData();
    const resolvedCategory: Category = {
      ...category,
      type: category.type || category.slug || "general",
    };
    const idx = data.categories.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      data.categories[idx] = resolvedCategory;
    } else {
      data.categories.push(resolvedCategory);
    }
    this._persist(data);
    return resolvedCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.categories = data.categories.filter((c) => c.id !== categoryId);
    data.topics = data.topics.filter((t) => t.categoryId !== categoryId);
    this._persist(data);
    return true;
  }

  async saveTopic(topic: Topic): Promise<Topic> {
    const data = await this.loadInitialData();
    const idx = data.topics.findIndex((t) => t.id === topic.id);
    if (idx >= 0) {
      data.topics[idx] = topic;
    } else {
      data.topics.push(topic);
    }
    this._persist(data);
    return topic;
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.topics = data.topics.filter((t) => t.id !== topicId);
    this._persist(data);
    return true;
  }

  async saveNote(note: Note): Promise<Note> {
    const data = await this.loadInitialData();
    const idx = data.notes.findIndex((n) => n.id === note.id);
    if (idx >= 0) {
      data.notes[idx] = note;
    } else {
      data.notes.push(note);
    }
    this._persist(data);
    return note;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.notes = data.notes.filter((n) => n.id !== noteId);
    this._persist(data);
    return true;
  }

  async saveResource(resource: Resource): Promise<Resource> {
    const data = await this.loadInitialData();
    const idx = data.resources.findIndex((r) => r.id === resource.id);
    if (idx >= 0) {
      data.resources[idx] = resource;
    } else {
      data.resources.push(resource);
    }
    this._persist(data);
    return resource;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.resources = data.resources.filter((r) => r.id !== resourceId);
    this._persist(data);
    return true;
  }

  async saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress> {
    const data = await this.loadInitialData();
    const target = data.topics.find((t) => t.id === topicId);
    if (target) {
      target.studyProgress = progress;
      this._persist(data);
    }
    return progress;
  }

  /**
   * Clears root key and all entity sub-keys from localStorage.
   * Also removes legacy v1 keys for migration compatibility.
   */
  async resetAllData(): Promise<boolean> {
    const LEGACY_KEY = "phat_hoc_huyen_hoc_dashboard_v1";
    const keysToRemove = [
      this.storageKey,
      `${this.storageKey}_categories`,
      `${this.storageKey}_topics`,
      `${this.storageKey}_notes`,
      `${this.storageKey}_resources`,
      `${this.storageKey}_tags`,
      LEGACY_KEY,
      `${LEGACY_KEY}_categories`,
      `${LEGACY_KEY}_topics`,
      `${LEGACY_KEY}_notes`,
      `${LEGACY_KEY}_resources`,
      `${LEGACY_KEY}_tags`,
    ];
    keysToRemove.forEach((k) => safeRemoveLocalStorageItem(k));
    return true;
  }

  async exportBackupSnapshot(): Promise<ValidatedBackupSnapshot> {
    throw new Error(
      "UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.",
    );
  }

  async restoreBackupSnapshot(
    _req: ValidatedRestoreRequest,
  ): Promise<ValidatedRestoreResponse> {
    throw new Error(
      "UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.",
    );
  }

  async getDbHealth(): Promise<ValidatedDbHealthResponse> {
    throw new Error(
      "UNSUPPORTED_OFFLINE_OPERATION: Disaster recovery and database health checks require an active server connection.",
    );
  }

  private _getFlashcards(): Flashcard[] {
    const raw = safeGetLocalStorageItem(`${this.storageKey}_flashcards`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private _saveFlashcards(cards: Flashcard[]): void {
    safeSetLocalStorageItem(`${this.storageKey}_flashcards`, JSON.stringify(cards));
  }

  // 9. Flashcards & Spaced Repetition (Offline LocalStorage implementation)
  async createFlashcard(input: unknown): Promise<Flashcard> {
    const parsed = FlashcardCreateSchema.parse(input);
    const now = new Date().toISOString();
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newCard: Flashcard = {
      id,
      topicId: parsed.topicId,
      noteId: parsed.noteId || null,
      resourceId: parsed.resourceId || null,
      type: parsed.type,
      front: parsed.front,
      back: parsed.back,
      lifecycleStatus: parsed.lifecycleStatus || "active",
      createdAt: now,
      updatedAt: now,
      schedule: {
        id: `fcs-${id}`,
        flashcardId: id,
        state: "new",
        dueAt: now,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        lastReviewedAt: null,
        updatedAt: now,
      },
    };
    const cards = this._getFlashcards();
    cards.push(newCard);
    this._saveFlashcards(cards);
    return newCard;
  }

  async updateFlashcard(id: string, input: unknown): Promise<Flashcard> {
    const parsed = FlashcardUpdateSchema.parse(input);
    const cards = this._getFlashcards();
    const idx = cards.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Flashcard not found with ID: ${id}`);
    }
    const existing = cards[idx];
    const updated: Flashcard = {
      ...existing,
      ...(parsed.topicId !== undefined && { topicId: parsed.topicId }),
      ...(parsed.noteId !== undefined && { noteId: parsed.noteId }),
      ...(parsed.resourceId !== undefined && { resourceId: parsed.resourceId }),
      ...(parsed.type !== undefined && { type: parsed.type }),
      ...(parsed.front !== undefined && { front: parsed.front }),
      ...(parsed.back !== undefined && { back: parsed.back }),
      ...(parsed.lifecycleStatus !== undefined && { lifecycleStatus: parsed.lifecycleStatus }),
      updatedAt: new Date().toISOString(),
    };
    cards[idx] = updated;
    this._saveFlashcards(cards);
    return updated;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    const cards = this._getFlashcards();
    const filtered = cards.filter((c) => c.id !== id);
    this._saveFlashcards(filtered);
    return true;
  }

  async recordFlashcardReview(input: unknown): Promise<FlashcardReviewResponse> {
    return this.recordReviewAtomic(input);
  }

  async recordReviewAtomic(input: unknown): Promise<FlashcardReviewResponse> {
    const validated = FlashcardReviewInputSchema.parse(input);
    const cards = this._getFlashcards();
    const card = cards.find((c) => c.id === validated.flashcardId);
    if (!card) {
      throw new Error(`Flashcard with ID ${validated.flashcardId} not found`);
    }
    const currentSchedule = card.schedule || {
      id: `fcs-${card.id}`,
      flashcardId: card.id,
      state: "new" as const,
      dueAt: card.createdAt,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      updatedAt: card.createdAt,
    };

    const calculation = calculateFlashcardNextReview({
      currentSchedule,
      rating: validated.rating,
      referenceDate: new Date(),
    });

    const nowIso = new Date().toISOString();
    const updatedSchedule: FlashcardSchedule = {
      ...currentSchedule,
      ...calculation.nextSchedule,
      updatedAt: nowIso,
    };

    card.schedule = updatedSchedule;
    card.updatedAt = nowIso;
    this._saveFlashcards(cards);

    const reviewLog = {
      id: `rev-${Date.now()}`,
      clientEventId: validated.clientEventId,
      flashcardId: card.id,
      topicId: card.topicId,
      rating: validated.rating,
      reviewDurationMs: validated.reviewDurationMs,
      ...calculation.reviewPayload,
    };

    return {
      success: true,
      duplicate: false,
      clientEventId: validated.clientEventId,
      review: reviewLog,
      schedule: updatedSchedule,
    };
  }


  async getDueFlashcards(filters?: {
    topicId?: string;
    now?: Date;
  }): Promise<Flashcard[]> {
    const cards = this._getFlashcards();
    const nowIso = (filters?.now || new Date()).toISOString();
    return cards.filter((c) => {
      if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
      if (filters?.topicId && c.topicId !== filters.topicId) return false;
      if (!c.schedule) return true;
      return c.schedule.dueAt <= nowIso;
    });
  }

  async getFlashcardProgress(filters?: {
    topicId?: string;
  }): Promise<FlashcardProgressStats> {
    const cards = this._getFlashcards().filter((c) => {
      if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
      if (filters?.topicId && c.topicId !== filters.topicId) return false;
      return true;
    });

    const nowIso = new Date().toISOString();
    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let dueToday = 0;

    for (const card of cards) {
      const state = card.schedule?.state || "new";
      if (state === "new") newCards++;
      else if (state === "learning" || state === "relearning") learningCards++;
      else if (state === "review") reviewCards++;

      if (!card.schedule || card.schedule.dueAt <= nowIso) {
        dueToday++;
      }
    }

    return {
      totalCards: cards.length,
      newCards,
      learningCards,
      reviewCards,
      dueToday,
      retentionRate: cards.length === 0 ? 100 : Math.round(((cards.length - dueToday) / cards.length) * 100),
    };
  }

}

/**
 * ApiDataRepository Implementation
 * Kết nối REST API Server PostgreSQL, tự động fallback sang LocalStorage khi offline
 */
export class ApiDataRepository implements IDataRepository {
  private localFallback: LocalStorageDataRepository;
  private syncQueue: SyncQueueService;
  private apiBaseUrl: string;

  constructor(
    apiBaseUrl = "/api",
    localFallback = new LocalStorageDataRepository(),
    syncQueue = new SyncQueueService(),
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.localFallback = localFallback;
    this.syncQueue = syncQueue;
    this.syncQueue.listenForOnlineEvents(apiBaseUrl);
  }

  private getUrl(path: string): string | null {
    if (
      typeof window !== "undefined" &&
      window.location &&
      window.location.origin &&
      window.location.origin.startsWith("http")
    ) {
      return `${window.location.origin}${this.apiBaseUrl}${path}`;
    }
    return null;
  }

  async loadInitialData() {
    const url = this.getUrl("/topics");
    if (url) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const topics = await res.json();
          if (Array.isArray(topics) && topics.length > 0) {
            const categoriesUrl = this.getUrl("/categories");
            const catRes = categoriesUrl ? await fetch(categoriesUrl) : null;
            const categories =
              catRes && catRes.ok ? await catRes.json() : [];

            const notesUrl = this.getUrl("/notes");
            const notesRes = notesUrl ? await fetch(notesUrl) : null;
            const notes = notesRes && notesRes.ok ? await notesRes.json() : [];

            const resourcesUrl = this.getUrl("/resources");
            const resourcesRes = resourcesUrl
              ? await fetch(resourcesUrl)
              : null;
            const resources =
              resourcesRes && resourcesRes.ok ? await resourcesRes.json() : [];

            return {
              categories,
              topics,
              notes,
              resources,
              tags: [],
            };
          }
        }
      } catch {
        // Fallback silently to LocalStorage
      }
    }
    return this.localFallback.loadInitialData();
  }

  async syncHydrate(
    payload: ValidatedHydrateInput,
  ): Promise<ValidatedHydrateResponse> {
    const url = this.getUrl("/sync/hydrate");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const result = await res.json();
          await this.localFallback.syncHydrate(payload);
          return result;
        }
      } catch {
        // Fallback silently to LocalStorage
      }
    }
    return this.localFallback.syncHydrate(payload);
  }

  async saveCategory(category: Category): Promise<Category> {
    const resolvedCategory: Category = {
      ...category,
      type: category.type || category.slug || "general",
    };
    await this.localFallback.saveCategory(resolvedCategory);
    const url = this.getUrl("/categories");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolvedCategory),
        });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "category",
            action: "save",
            entityId: resolvedCategory.id,
            payload: resolvedCategory,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "category",
          action: "save",
          entityId: resolvedCategory.id,
          payload: resolvedCategory,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return resolvedCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    await this.localFallback.deleteCategory(categoryId);
    const url = this.getUrl(`/categories/${categoryId}`);
    if (url) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "category",
            action: "delete",
            entityId: categoryId,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "category",
          action: "delete",
          entityId: categoryId,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return true;
  }

  async saveTopic(topic: Topic): Promise<Topic> {
    await this.localFallback.saveTopic(topic);
    const url = this.getUrl("/topics");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(topic),
        });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "topic",
            action: "save",
            entityId: topic.id,
            payload: topic,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "topic",
          action: "save",
          entityId: topic.id,
          payload: topic,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return topic;
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    await this.localFallback.deleteTopic(topicId);
    const url = this.getUrl(`/topics/${topicId}`);
    if (url) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "topic",
            action: "delete",
            entityId: topicId,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "topic",
          action: "delete",
          entityId: topicId,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return true;
  }

  async saveNote(note: Note): Promise<Note> {
    await this.localFallback.saveNote(note);
    const url = this.getUrl("/notes");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(note),
        });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "note",
            action: "save",
            entityId: note.id,
            payload: note,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "note",
          action: "save",
          entityId: note.id,
          payload: note,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return note;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    await this.localFallback.deleteNote(noteId);
    const url = this.getUrl(`/notes/${noteId}`);
    if (url) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "note",
            action: "delete",
            entityId: noteId,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "note",
          action: "delete",
          entityId: noteId,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return true;
  }

  async saveResource(resource: Resource): Promise<Resource> {
    await this.localFallback.saveResource(resource);
    const url = this.getUrl("/resources");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resource),
        });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "resource",
            action: "save",
            entityId: resource.id,
            payload: resource,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "resource",
          action: "save",
          entityId: resource.id,
          payload: resource,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return resource;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    await this.localFallback.deleteResource(resourceId);
    const url = this.getUrl(`/resources/${resourceId}`);
    if (url) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "resource",
            action: "delete",
            entityId: resourceId,
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "resource",
          action: "delete",
          entityId: resourceId,
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return true;
  }

  async saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress> {
    await this.localFallback.saveStudyProgress(topicId, progress);
    const url = this.getUrl("/study-progress");
    if (url) {
      const reviewPayload = {
        topicId,
        quality:
          typeof (progress as any).quality === "number"
            ? (progress as any).quality
            : 4,
        triggerReason: (progress as any).triggerReason || "review_completed",
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewPayload),
        });
        if (!res.ok) {
          this.syncQueue.enqueue({
            id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            entityType: "studyProgress",
            action: "save",
            entityId: topicId,
            payload: {
              topicId,
              quality: reviewPayload.quality,
              triggerReason: "offline_replayed",
            },
            clientTimestamp: new Date().toISOString(),
            retryCount: 0,
            status: "pending",
          });
        }
      } catch {
        this.syncQueue.enqueue({
          id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          entityType: "studyProgress",
          action: "save",
          entityId: topicId,
          payload: {
            topicId,
            quality: reviewPayload.quality,
            triggerReason: "offline_replayed",
          },
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }
    }
    return progress;
  }

  async resetAllData(): Promise<boolean> {
    await this.localFallback.resetAllData();
    return true;
  }

  async exportBackupSnapshot(): Promise<ValidatedBackupSnapshot> {
    const url =
      this.getUrl("/backup/export") || `${this.apiBaseUrl}/backup/export`;
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.message ||
          errBody.error ||
          `Export backup failed with status ${res.status}`,
      );
    }
    const data = await res.json();
    return BackupSnapshotSchema.parse(data);
  }

  async restoreBackupSnapshot(
    req: ValidatedRestoreRequest,
  ): Promise<ValidatedRestoreResponse> {
    const validatedReq = RestoreRequestSchema.parse(req);
    const url =
      this.getUrl("/backup/restore") || `${this.apiBaseUrl}/backup/restore`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validatedReq),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.message ||
          errBody.error ||
          `Restore backup failed with status ${res.status}`,
      );
    }
    const data = await res.json();
    return RestoreResponseSchema.parse(data);
  }

  async getDbHealth(): Promise<ValidatedDbHealthResponse> {
    const url = this.getUrl("/health/db") || `${this.apiBaseUrl}/health/db`;
    const res = await fetch(url);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.message ||
          errBody.error ||
          `Health check failed with status ${res.status}`,
      );
    }
    const data = await res.json();
    return DbHealthResponseSchema.parse(data);
  }

  // 9. Flashcards & Spaced Repetition (REST API integration)
  async createFlashcard(input: unknown): Promise<Flashcard> {
    const fallbackCard = await this.localFallback.createFlashcard(input);
    const url = this.getUrl("/flashcards") || `${this.apiBaseUrl}/flashcards`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // offline fallback
    }
    return fallbackCard;
  }

  async updateFlashcard(id: string, input: unknown): Promise<Flashcard> {
    const fallbackCard = await this.localFallback.updateFlashcard(id, input);
    const url = this.getUrl(`/flashcards/${id}`) || `${this.apiBaseUrl}/flashcards/${id}`;
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // offline fallback
    }
    return fallbackCard;
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    await this.localFallback.deleteFlashcard(id);
    const url = this.getUrl(`/flashcards/${id}`) || `${this.apiBaseUrl}/flashcards/${id}`;
    try {
      const res = await fetch(url, { method: "DELETE" });
      return res.ok;
    } catch {
      return true;
    }
  }

  async recordFlashcardReview(input: unknown): Promise<FlashcardReviewResponse> {
    return this.recordReviewAtomic(input);
  }

  async recordReviewAtomic(input: unknown): Promise<FlashcardReviewResponse> {
    const url = this.getUrl("/flashcards/review") || `${this.apiBaseUrl}/flashcards/review`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        await this.localFallback.recordReviewAtomic(input).catch(() => {});
        return data;
      }
    } catch {
      // offline fallback
    }
    return this.localFallback.recordReviewAtomic(input);
  }

  async getDueFlashcards(filters?: {
    topicId?: string;
    now?: Date;
  }): Promise<Flashcard[]> {
    const query = filters?.topicId ? `?topicId=${encodeURIComponent(filters.topicId)}` : "";
    const url = this.getUrl(`/flashcards/due${query}`) || `${this.apiBaseUrl}/flashcards/due${query}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // offline fallback
    }
    return this.localFallback.getDueFlashcards(filters);
  }

  async getFlashcardProgress(filters?: {
    topicId?: string;
  }): Promise<FlashcardProgressStats> {
    const query = filters?.topicId ? `?topicId=${encodeURIComponent(filters.topicId)}` : "";
    const url = this.getUrl(`/flashcards/progress${query}`) || `${this.apiBaseUrl}/flashcards/progress${query}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // offline fallback
    }
    return this.localFallback.getFlashcardProgress(filters);
  }
}
