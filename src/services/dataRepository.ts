import {
  Category,
  Topic,
  Note,
  Resource,
  Tag,
  StudyProgress,
  ArchivedDocument,
  ReadingPositionData,
  KnowledgeLink,
  ResearchExcerpt,
  ResearchInboxItem,
} from "../types";
import {
  normalizeCategories,
  normalizeTopics,
  normalizeNotes,
} from "../lib/taxonomyMigration";
import {
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  safeRemoveLocalStorageItem,
  STORAGE_ROOT_KEY,
} from "../lib/storage";
import { SyncQueueService } from "./syncQueue";
import { reconcileSnapshotWithQueue } from "../lib/syncQueue";
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
  FlashcardPriorityFilter,
} from "../types/flashcard";
import { calculateFlashcardNextReview } from "../lib/flashcardScheduler";
import { isLowRetention } from "../lib/flashcardReviewSessionUtils";

export type { FlashcardProgressStats };


export interface RepositorySyncResult {
  isOnline: boolean;
  synced: boolean;
  message?: string;
}

export type DeleteCategoryResult =
  | { status: "deleted"; id: string }
  | { status: "not_found"; id: string }
  | { status: "queued"; id: string; error?: string };

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
  deleteCategory(categoryId: string): Promise<DeleteCategoryResult>;

  // 3. Topics CRUD
  saveTopic(topic: Topic): Promise<Topic>;
  deleteTopic(topicId: string): Promise<boolean>;

  // 4. Notes CRUD
  saveNote(note: Note): Promise<Note>;
  deleteNote(noteId: string): Promise<boolean>;
  appendExcerptToNote?(noteId: string, excerptBlockquote: string): Promise<Note>;

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
  getFlashcards?(filters?: { topicId?: string }): Promise<Flashcard[]>;
  createFlashcard?(input: unknown): Promise<Flashcard>;
  updateFlashcard?(id: string, input: unknown): Promise<Flashcard>;
  deleteFlashcard?(id: string): Promise<boolean>;
  recordFlashcardReview?(input: unknown): Promise<FlashcardReviewResponse>;
  recordReviewAtomic?(input: unknown): Promise<FlashcardReviewResponse>;
  getDueFlashcards?(filters?: {
    topicId?: string;
    now?: Date;
    priority?: FlashcardPriorityFilter;
  }): Promise<Flashcard[]>;
  getFlashcardProgress?(filters?: { topicId?: string }): Promise<FlashcardProgressStats>;

  // 10. Phase 18B: Local Archive & Reading Position Persistence
  getArchivedDocuments?(): Promise<ArchivedDocument[]>;
  updateArchivedDocumentPosition?(
    documentId: string,
    position: ReadingPositionData
  ): Promise<ArchivedDocument>;

  // 11. Knowledge Links CRUD (Phase 3 / ADR-079 / PR-1)
  saveKnowledgeLink?(link: KnowledgeLink): Promise<KnowledgeLink>;
  deleteKnowledgeLink?(linkId: string): Promise<boolean>;

  // 12. Research Excerpts & Inbox Items (Phase 18 / ADR-079)
  getResearchExcerpts?(filters?: {
    topicId?: string;
    sourceNoteId?: string;
    targetNoteId?: string;
    tag?: string;
    status?: string;
  }): Promise<ResearchExcerpt[]>;
  createResearchExcerpt?(input: unknown): Promise<ResearchExcerpt>;
  updateResearchExcerpt?(id: string, input: unknown): Promise<ResearchExcerpt>;
  deleteResearchExcerpt?(id: string): Promise<boolean>;

  getResearchInboxItems?(): Promise<ResearchInboxItem[]>;
  createResearchInboxItem?(input: unknown): Promise<ResearchInboxItem>;
  processResearchInboxItem?(id: string, isProcessed?: boolean): Promise<ResearchInboxItem>;
  deleteResearchInboxItem?(id: string): Promise<boolean>;
}

/**
 * LocalStorage Fallback Repository Implementation
 * Dùng làm lớp dự phòng offline khi chưa kết nối PostgreSQL hoặc máy chủ mất kết nối
 */
export class LocalStorageDataRepository implements IDataRepository {
  private storageKey: string;

  constructor(storageKey = STORAGE_ROOT_KEY) {
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
          categories: normalizeCategories(parsed.categories || []),
          topics: normalizeTopics(parsed.topics || []),
          notes: normalizeNotes(parsed.notes || []),
          resources: Array.isArray(parsed.resources) ? parsed.resources : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
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
          categories: categoriesRaw ? normalizeCategories(JSON.parse(categoriesRaw)) : [],
          topics: topicsRaw ? normalizeTopics(JSON.parse(topicsRaw)) : [],
          notes: notesRaw ? normalizeNotes(JSON.parse(notesRaw)) : [],
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
    const sanitizedPayload: ValidatedHydrateInput = {
      ...payload,
      categories: normalizeCategories((payload.categories || []) as Category[]),
      topics: normalizeTopics((payload.topics || []) as Topic[]),
      notes: normalizeNotes((payload.notes || []) as Note[]),
      resources: Array.isArray(payload.resources) ? payload.resources : [],
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      links: Array.isArray(payload.links) ? payload.links : [],
    };
    const validated = HydratePayloadSchema.parse(sanitizedPayload);
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

  async deleteCategory(categoryId: string): Promise<DeleteCategoryResult> {
    const data = await this.loadInitialData();
    data.categories = data.categories.filter((c) => c.id !== categoryId);
    data.topics = data.topics.filter((t) => t.categoryId !== categoryId);
    this._persist(data);
    return { status: "deleted", id: categoryId };
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

  async saveKnowledgeLink(link: KnowledgeLink): Promise<KnowledgeLink> {
    const data = await this.loadInitialData();
    data.topics = data.topics.map((t) => {
      if (t.id === link.sourceId || t.id === link.targetId) {
        const existing = t.links || [];
        const idx = existing.findIndex((l) => l.id === link.id);
        if (idx >= 0) {
          existing[idx] = link;
        } else {
          existing.push(link);
        }
        return { ...t, links: [...existing] };
      }
      return t;
    });
    this._persist(data);
    return link;
  }

  async deleteKnowledgeLink(linkId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.topics = data.topics.map((t) => {
      if (t.links?.some((l) => l.id === linkId)) {
        return { ...t, links: t.links.filter((l) => l.id !== linkId) };
      }
      return t;
    });
    this._persist(data);
    return true;
  }

  async appendExcerptToNote(noteId: string, excerptBlockquote: string): Promise<Note> {
    const data = await this.loadInitialData();
    const note = data.notes.find((n) => n.id === noteId);
    if (!note) {
      throw new Error(`Note with id "${noteId}" not found`);
    }

    const existingContent = note.content || '';
    const newContent = existingContent.trim()
      ? `${existingContent.trim()}\n\n${excerptBlockquote.trim()}`
      : excerptBlockquote.trim();

    const updatedNote: Note = {
      ...note,
      content: newContent,
      updatedAt: new Date().toISOString(),
    };

    await this.saveNote(updatedNote);
    return updatedNote;
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
      `${this.storageKey}_flashcards`,
      `${this.storageKey}_research_inbox`,
      `${this.storageKey}_research_excerpts`,
      "phat_hoc_huyen_hoc_focus_domain",
      "phat_hoc_huyen_hoc_sync_queue",
      "phat_hoc_huyen_hoc_sync_telemetry",
      "knowledge_os_archived_documents",
      LEGACY_KEY,
      `${LEGACY_KEY}_categories`,
      `${LEGACY_KEY}_topics`,
      `${LEGACY_KEY}_notes`,
      `${LEGACY_KEY}_resources`,
      `${LEGACY_KEY}_tags`,
      `${LEGACY_KEY}_flashcards`,
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
  async getFlashcards(filters?: { topicId?: string }): Promise<Flashcard[]> {
    const cards = this._getFlashcards();
    if (filters?.topicId) {
      return cards.filter((c) => c.topicId === filters.topicId);
    }
    return cards;
  }

  async createFlashcard(input: unknown): Promise<Flashcard> {
    const parsed = FlashcardCreateSchema.parse(input);
    const idempotencyKey = parsed.idempotencyKey || (input as any)?.idempotencyKey;
    const cards = this._getFlashcards();
    if (idempotencyKey) {
      const existingIndex = cards.findIndex(
        (c) => c.idempotencyKey === idempotencyKey
      );
      if (existingIndex !== -1) {
        // If updating an existing card with synced status from backend
        if (parsed.syncStatus === "synced" && cards[existingIndex].syncStatus !== "synced") {
          const updated: Flashcard = {
            ...cards[existingIndex],
            ...((input as any).id ? { id: (input as any).id } : {}),
            syncStatus: "synced",
            updatedAt: new Date().toISOString(),
          };
          cards[existingIndex] = updated;
          this._saveFlashcards(cards);
          return {
            ...updated,
            outcome: "existing",
          };
        }
        return {
          ...cards[existingIndex],
          outcome: "existing",
        };
      }
    }
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
      idempotencyKey: idempotencyKey || null,
      syncStatus: parsed.syncStatus || "synced",
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
    cards.push(newCard);
    this._saveFlashcards(cards);
    return {
      ...newCard,
      outcome: "created",
    };
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
    priority?: FlashcardPriorityFilter;
  }): Promise<Flashcard[]> {
    const cards = this._getFlashcards();
    const nowIso = (filters?.now || new Date()).toISOString();
    const priority = filters?.priority || "due";

    return cards.filter((c) => {
      if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
      if (filters?.topicId && c.topicId !== filters.topicId) return false;

      if (priority === "new") {
        return c.schedule?.state === "new";
      }
      if (priority === "low_retention") {
        return isLowRetention(c);
      }
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

  // 10. Phase 18B: Local Archive & Reading Position Persistence
  private _getArchivedDocs(): ArchivedDocument[] {
    const raw = safeGetLocalStorageItem("knowledge_os_archived_documents");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private _saveArchivedDocs(docs: ArchivedDocument[]): void {
    safeSetLocalStorageItem("knowledge_os_archived_documents", JSON.stringify(docs));
  }

  saveArchivedDocsCache(docs: ArchivedDocument[]): void {
    this._saveArchivedDocs(docs);
  }

  async getArchivedDocuments(): Promise<ArchivedDocument[]> {
    return this._getArchivedDocs();
  }

  async updateArchivedDocumentPosition(
    documentId: string,
    position: ReadingPositionData
  ): Promise<ArchivedDocument> {
    const docs = this._getArchivedDocs();
    const cleanId = (documentId || "").trim();
    let doc = docs.find(
      (d) =>
        d.id === cleanId ||
        d.contentHash === cleanId ||
        d.fileName === cleanId ||
        d.storageRelPath === cleanId
    );
    const now = new Date().toISOString();
    if (!doc) {
      doc = {
        id: cleanId,
        fileName: cleanId.split("/").pop() || cleanId,
        fileSize: 0,
        mimeType: cleanId.endsWith(".epub")
          ? "application/epub+zip"
          : cleanId.endsWith(".md")
          ? "text/markdown"
          : "application/pdf",
        fileFormat: cleanId.endsWith(".epub") ? "epub" : cleanId.endsWith(".md") ? "md" : "pdf",
        contentHash: cleanId,
        storageRelPath: cleanId,
        lastPosition: position,
        lastReadAt: now,
        readCount: 1,
        createdAt: now,
        updatedAt: now,
      };
      docs.unshift(doc);
    } else {
      doc.lastPosition = position;
      doc.lastReadAt = now;
      doc.readCount = (doc.readCount || 0) + 1;
      doc.updatedAt = now;
      const idx = docs.findIndex((d) => d.id === doc!.id);
      if (idx > 0) {
        docs.splice(idx, 1);
        docs.unshift(doc);
      }
    }
    this._saveArchivedDocs(docs);
    return doc;
  }

  // 12. Research Excerpts & Inbox Items LocalStorage Fallback
  private _getExcerpts(): ResearchExcerpt[] {
    const raw = safeGetLocalStorageItem(`${this.storageKey}_research_excerpts`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private _saveExcerpts(excerpts: ResearchExcerpt[]): void {
    safeSetLocalStorageItem(
      `${this.storageKey}_research_excerpts`,
      JSON.stringify(excerpts),
    );
  }

  private _getInboxItems(): ResearchInboxItem[] {
    const raw = safeGetLocalStorageItem(`${this.storageKey}_research_inbox`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private _saveInboxItems(items: ResearchInboxItem[]): void {
    safeSetLocalStorageItem(
      `${this.storageKey}_research_inbox`,
      JSON.stringify(items),
    );
  }

  async getResearchExcerpts(filters?: {
    topicId?: string;
    sourceNoteId?: string;
    targetNoteId?: string;
    tag?: string;
    status?: string;
  }): Promise<ResearchExcerpt[]> {
    let excerpts = this._getExcerpts();
    if (filters?.topicId) {
      excerpts = excerpts.filter((e) => e.topicId === filters.topicId);
    }
    const noteId = filters?.sourceNoteId || filters?.targetNoteId;
    if (noteId) {
      excerpts = excerpts.filter((e) => e.targetNoteId === noteId);
    }
    if (filters?.status) {
      excerpts = excerpts.filter((e) => e.status === filters.status);
    }
    if (filters?.tag) {
      const q = filters.tag.toLowerCase();
      excerpts = excerpts.filter((e) => e.userNote?.toLowerCase().includes(q));
    }
    return excerpts;
  }

  async createResearchExcerpt(input: unknown): Promise<ResearchExcerpt> {
    const data = input as any;
    const now = new Date().toISOString();
    const excerpt: ResearchExcerpt = {
      id:
        data.id ||
        `excerpt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      archivedDocumentId: data.archivedDocumentId,
      topicId: data.topicId ?? null,
      targetNoteId: data.targetNoteId ?? null,
      selectedText: data.selectedText,
      contextPrefix: data.contextPrefix ?? null,
      contextSuffix: data.contextSuffix ?? null,
      positionSelector: data.positionSelector,
      highlightColor: data.highlightColor || "#F59E0B",
      citationSnapshot: data.citationSnapshot ?? null,
      userNote: data.userNote ?? null,
      status: data.status || "active",
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
    const excerpts = this._getExcerpts();
    const updated = [excerpt, ...excerpts.filter((e) => e.id !== excerpt.id)];
    this._saveExcerpts(updated);
    return excerpt;
  }

  async updateResearchExcerpt(
    id: string,
    input: unknown,
  ): Promise<ResearchExcerpt> {
    const updates = input as Partial<ResearchExcerpt>;
    const excerpts = this._getExcerpts();
    const existing = excerpts.find((e) => e.id === id);
    if (!existing) {
      throw new Error(`Research excerpt not found: ${id}`);
    }
    const updated: ResearchExcerpt = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    this._saveExcerpts(excerpts.map((e) => (e.id === id ? updated : e)));
    return updated;
  }

  async deleteResearchExcerpt(id: string): Promise<boolean> {
    const excerpts = this._getExcerpts();
    this._saveExcerpts(excerpts.filter((e) => e.id !== id));
    return true;
  }

  async getResearchInboxItems(): Promise<ResearchInboxItem[]> {
    return this._getInboxItems();
  }

  async createResearchInboxItem(input: unknown): Promise<ResearchInboxItem> {
    const data = input as any;
    const now = new Date().toISOString();
    const item: ResearchInboxItem = {
      id:
        data.id ||
        `inbox-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      excerptId: data.excerptId,
      excerpt: data.excerpt,
      isProcessed: Boolean(data.isProcessed),
      priority: typeof data.priority === "number" ? data.priority : 0,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    };
    const items = this._getInboxItems();
    this._saveInboxItems([item, ...items.filter((i) => i.id !== item.id)]);
    return item;
  }

  async processResearchInboxItem(
    id: string,
    isProcessed = true,
  ): Promise<ResearchInboxItem> {
    const items = this._getInboxItems();
    const item = items.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Inbox item not found: ${id}`);
    }
    const updated = {
      ...item,
      isProcessed,
      updatedAt: new Date().toISOString(),
    };
    this._saveInboxItems(items.map((i) => (i.id === id ? updated : i)));
    return updated;
  }

  async deleteResearchInboxItem(id: string): Promise<boolean> {
    const items = this._getInboxItems();
    this._saveInboxItems(items.filter((i) => i.id !== id));
    return true;
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
    // Chốt chặn Hermetic Test Guard (ADR-077 & Rule 2):
    // Trong môi trường kiểm thử Vitest, CẤM gọi live HTTP network ra server trừ khi test đã chủ động mock fetch
    if (typeof process !== "undefined" && process.env?.VITEST) {
      const activeFetch =
        typeof fetch !== "undefined"
          ? fetch
          : typeof window !== "undefined"
          ? window.fetch
          : null;

      const isFetchMocked = Boolean(
        activeFetch &&
          ((activeFetch as any)._isMockFunction || (activeFetch as any).mock),
      );

      if (!isFetchMocked) {
        return null; // Chặn triệt để live HTTP request ra localhost:3000
      }
    }

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

            const serverSnapshot = {
              categories,
              topics,
              notes,
              resources,
              tags: [],
            };

            const pendingMutations = this.syncQueue ? this.syncQueue.getQueue() : [];
            if (!pendingMutations || pendingMutations.length === 0) {
              return serverSnapshot;
            }

            return reconcileSnapshotWithQueue(serverSnapshot, pendingMutations);
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

  async deleteCategory(categoryId: string): Promise<DeleteCategoryResult> {
    const url = this.getUrl(`/categories/${encodeURIComponent(categoryId)}`);
    if (!url) {
      await this.localFallback.deleteCategory(categoryId);
      return { status: "deleted", id: categoryId };
    }

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        let canonicalId = categoryId;
        try {
          const body = await res.json();
          if (body && typeof body === "object" && typeof body.id === "string" && body.id.trim()) {
            canonicalId = body.id.trim();
          }
        } catch {
          // Body not JSON or empty; fallback to input categoryId
        }
        await this.localFallback.deleteCategory(canonicalId);
        return { status: "deleted", id: canonicalId };
      }

      if (res.status === 404) {
        return { status: "not_found", id: categoryId };
      }

      const errorMsg = `HTTP ${res.status}: Failed to delete category`;
      this.syncQueue.enqueue({
        id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        entityType: "category",
        action: "delete",
        entityId: categoryId,
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });
      return { status: "queued", id: categoryId, error: errorMsg };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Network error";
      this.syncQueue.enqueue({
        id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        entityType: "category",
        action: "delete",
        entityId: categoryId,
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });
      return { status: "queued", id: categoryId, error: errorMsg };
    }
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

  async saveKnowledgeLink(link: KnowledgeLink): Promise<KnowledgeLink> {
    if (this.localFallback.saveKnowledgeLink) {
      await this.localFallback.saveKnowledgeLink(link);
    }
    const url = this.getUrl("/links");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch (err) {
        console.error("Failed to persist knowledge link to server:", err);
      }
    }
    return link;
  }

  async deleteKnowledgeLink(linkId: string): Promise<boolean> {
    if (this.localFallback.deleteKnowledgeLink) {
      await this.localFallback.deleteKnowledgeLink(linkId);
    }
    const url = this.getUrl(`/links/${encodeURIComponent(linkId)}`);
    if (url) {
      try {
        const res = await fetch(url, { method: "DELETE" });
        if (res.ok) {
          return true;
        }
      } catch (err) {
        console.error("Failed to delete knowledge link from server:", err);
      }
    }
    return true;
  }

  async appendExcerptToNote(noteId: string, excerptBlockquote: string): Promise<Note> {
    const updatedNote = await this.localFallback.appendExcerptToNote(noteId, excerptBlockquote);
    await this.saveNote(updatedNote);
    return updatedNote;
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
    const url = this.getUrl("/data/reset");
    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Reset-Confirmation": "knowledge-os-secure-local-reset-secret-2026",
          },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error("Backend resetAllData returned error:", res.status, errBody);
          throw new Error(
            `Backend resetAllData failed (${res.status}): ${errBody.message || errBody.error || "Unknown error"}`
          );
        }
      } catch (err) {
        console.error("Backend resetAllData failed to connect or execute:", err);
        throw err;
      }
    }
    await this.localFallback.resetAllData();
    if (this.syncQueue && typeof this.syncQueue.clearQueue === "function") {
      this.syncQueue.clearQueue();
    }
    return true;
  }

  async exportBackupSnapshot(): Promise<ValidatedBackupSnapshot> {
    const url = this.getUrl("/backup/export");
    if (!url) {
      return this.localFallback.exportBackupSnapshot();
    }
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
    const url = this.getUrl("/backup/restore");
    if (!url) {
      return this.localFallback.restoreBackupSnapshot(validatedReq);
    }
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
    const url = this.getUrl("/health/db");
    if (!url) {
      return this.localFallback.getDbHealth();
    }
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
  async getFlashcards(filters?: { topicId?: string }): Promise<Flashcard[]> {
    const url = this.getUrl(
      filters?.topicId
        ? `/flashcards?topicId=${encodeURIComponent(filters.topicId)}`
        : "/flashcards"
    );
    if (!url) {
      return this.localFallback.getFlashcards(filters);
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return this.localFallback.getFlashcards(filters);
  }

  async createFlashcard(input: unknown): Promise<Flashcard> {
    const parsed = FlashcardCreateSchema.parse(input);
    const idempotencyKey = parsed.idempotencyKey || (input as any)?.idempotencyKey;
    const url = this.getUrl("/flashcards");

    if (url) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          const serverCard = await res.json();
          const isHitHeader =
            typeof (res as any)?.headers?.get === "function" &&
            (res as any).headers.get("X-Idempotency-Status") === "HIT";
          const outcome =
            serverCard.outcome ??
            (isHitHeader
              ? "existing"
              : res.status === 201
              ? "created"
              : "created");
          const syncedCard: Flashcard = {
            ...serverCard,
            idempotencyKey: idempotencyKey || (serverCard as any)?.idempotencyKey || null,
            syncStatus: "synced",
            outcome,
          };
          await this.localFallback.createFlashcard(syncedCard);
          return syncedCard;
        }
      } catch {
        // offline / network error
      }

      const fallbackCard = await this.localFallback.createFlashcard({
        ...(input as any),
        syncStatus: "pending",
      });

      return {
        ...fallbackCard,
        syncStatus: "pending",
        outcome: (fallbackCard as any)?.outcome ?? "created",
      };
    }

    // Hermetic test guard: When getUrl returns null, we run hermetically in local repository
    return this.localFallback.createFlashcard({
      ...(input as any),
      syncStatus: (input as any)?.syncStatus ?? "synced",
    });
  }

  async updateFlashcard(id: string, input: unknown): Promise<Flashcard> {
    const fallbackCard = await this.localFallback.updateFlashcard(id, input);
    const url = this.getUrl(`/flashcards/${id}`);
    if (!url) {
      return fallbackCard;
    }
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
    const url = this.getUrl(`/flashcards/${id}`);
    if (!url) {
      return true;
    }
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
    const url = this.getUrl("/flashcards/review");
    if (!url) {
      return this.localFallback.recordReviewAtomic(input);
    }
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
    priority?: FlashcardPriorityFilter;
  }): Promise<Flashcard[]> {
    const params = new URLSearchParams();
    if (filters?.topicId) params.set("topicId", filters.topicId);
    if (filters?.priority) params.set("priority", filters.priority);
    const query = params.toString() ? `?${params.toString()}` : "";
    const url = this.getUrl(`/flashcards/due${query}`);
    if (!url) {
      return this.localFallback.getDueFlashcards(filters);
    }
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
    const url = this.getUrl(`/flashcards/progress${query}`);
    if (!url) {
      return this.localFallback.getFlashcardProgress(filters);
    }
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

  // 10. Phase 18B: Local Archive & Reading Position Persistence
  async getArchivedDocuments(): Promise<ArchivedDocument[]> {
    const url = this.getUrl("/archive/list");
    if (!url) {
      return this.localFallback.getArchivedDocuments();
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const docs = data.documents || [];
        this.localFallback.saveArchivedDocsCache(docs);
        return docs;
      }
    } catch {
      // offline fallback
    }
    return this.localFallback.getArchivedDocuments();
  }

  async updateArchivedDocumentPosition(
    documentId: string,
    position: ReadingPositionData
  ): Promise<ArchivedDocument> {
    const localUpdated = await this.localFallback.updateArchivedDocumentPosition(documentId, position);
    const url = this.getUrl(`/archive/document/${encodeURIComponent(documentId)}/position`);
    if (!url) {
      return localUpdated;
    }
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastPosition: position, lastReadAt: new Date().toISOString() }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.document || localUpdated;
      }
    } catch {
      // offline fallback handled by localUpdated
    }
    return localUpdated;
  }

  // 12. Research Excerpts & Inbox Items API Methods
  async getResearchExcerpts(filters?: {
    topicId?: string;
    sourceNoteId?: string;
    targetNoteId?: string;
    tag?: string;
    status?: string;
  }): Promise<ResearchExcerpt[]> {
    const params = new URLSearchParams();
    if (filters?.topicId) params.set("topicId", filters.topicId);
    const noteId = filters?.sourceNoteId || filters?.targetNoteId;
    if (noteId) params.set("sourceNoteId", noteId);
    if (filters?.tag) params.set("tag", filters.tag);
    if (filters?.status) params.set("status", filters.status);
    const queryString = params.toString() ? `?${params.toString()}` : "";

    const url =
      this.getUrl(`/excerpts${queryString}`) ||
      `${this.apiBaseUrl}/excerpts${queryString}`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const excerpts = (await res.json()) as ResearchExcerpt[];
          return excerpts;
        }
      } catch {
        // Fallback to local
      }
    }
    return this.localFallback.getResearchExcerpts(filters);
  }

  async createResearchExcerpt(input: unknown): Promise<ResearchExcerpt> {
    const fallbackExcerpt =
      await this.localFallback.createResearchExcerpt(input);
    const url = this.getUrl("/excerpts") || `${this.apiBaseUrl}/excerpts`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          return (await res.json()) as ResearchExcerpt;
        }
      } catch {
        // Fallback already saved
      }
    }
    return fallbackExcerpt;
  }

  async updateResearchExcerpt(
    id: string,
    input: unknown,
  ): Promise<ResearchExcerpt> {
    const fallbackExcerpt = await this.localFallback.updateResearchExcerpt(
      id,
      input,
    );
    const url =
      this.getUrl(`/excerpts/${encodeURIComponent(id)}`) ||
      `${this.apiBaseUrl}/excerpts/${encodeURIComponent(id)}`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          return (await res.json()) as ResearchExcerpt;
        }
      } catch {
        // Fallback already updated
      }
    }
    return fallbackExcerpt;
  }

  async deleteResearchExcerpt(id: string): Promise<boolean> {
    await this.localFallback.deleteResearchExcerpt(id);
    const url =
      this.getUrl(`/excerpts/${encodeURIComponent(id)}`) ||
      `${this.apiBaseUrl}/excerpts/${encodeURIComponent(id)}`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, { method: "DELETE" });
        return res.ok;
      } catch {
        // Fallback deleted
      }
    }
    return true;
  }

  async getResearchInboxItems(): Promise<ResearchInboxItem[]> {
    const url =
      this.getUrl("/excerpts/inbox") || `${this.apiBaseUrl}/excerpts/inbox`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return (await res.json()) as ResearchInboxItem[];
        }
      } catch {
        // Fallback to local
      }
    }
    return this.localFallback.getResearchInboxItems();
  }

  async createResearchInboxItem(input: unknown): Promise<ResearchInboxItem> {
    const fallbackItem =
      await this.localFallback.createResearchInboxItem(input);
    const url =
      this.getUrl("/excerpts/inbox") || `${this.apiBaseUrl}/excerpts/inbox`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (res.ok) {
          return (await res.json()) as ResearchInboxItem;
        }
      } catch {
        // Fallback created
      }
    }
    return fallbackItem;
  }

  async processResearchInboxItem(
    id: string,
    isProcessed = true,
  ): Promise<ResearchInboxItem> {
    const fallbackItem = await this.localFallback.processResearchInboxItem(
      id,
      isProcessed,
    );
    const url =
      this.getUrl(`/excerpts/inbox/${encodeURIComponent(id)}/process`) ||
      `${this.apiBaseUrl}/excerpts/inbox/${encodeURIComponent(id)}/process`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isProcessed }),
        });
        if (res.ok) {
          return (await res.json()) as ResearchInboxItem;
        }
      } catch {
        // Fallback updated
      }
    }
    return fallbackItem;
  }

  async deleteResearchInboxItem(id: string): Promise<boolean> {
    await this.localFallback.deleteResearchInboxItem(id);
    const url =
      this.getUrl(`/excerpts/inbox/${encodeURIComponent(id)}`) ||
      `${this.apiBaseUrl}/excerpts/inbox/${encodeURIComponent(id)}`;
    if (url && typeof fetch === "function") {
      try {
        const res = await fetch(url, { method: "DELETE" });
        return res.ok;
      } catch {
        // Fallback deleted
      }
    }
    return true;
  }
}

export interface ArchiveUploadResult {
  success: boolean;
  document: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileFormat: string;
    contentHash: string;
    storageRelPath: string;
    createdAt?: string;
  };
}

export async function uploadArchiveFile(options: {
  file: File | Blob | ArrayBuffer | Uint8Array;
  originalName: string;
  fileFormat: 'pdf' | 'epub' | 'md' | string;
  resourceId?: string;
  apiBaseUrl?: string;
}): Promise<ArchiveUploadResult> {
  const { file, originalName, fileFormat, resourceId, apiBaseUrl = '/api' } = options;
  const params = new URLSearchParams({
    originalName,
    fileFormat,
  });
  if (resourceId) {
    params.set('resourceId', resourceId);
  }

  const endpoint = `${apiBaseUrl}/archive/upload?${params.toString()}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: file,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}: Tải lên tệp thất bại`;
    try {
      const errBody = await response.json();
      if (errBody && errBody.message) {
        errorMsg = errBody.message;
      }
    } catch {
      // no json body
    }
    throw new Error(errorMsg);
  }

  return await response.json();
}
