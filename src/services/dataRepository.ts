import { Category, Topic, Note, Resource, Tag, StudyProgress } from "../types";
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
} from "../lib/validation";

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

  async loadInitialData() {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(this.storageKey)
        : null;
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
    return { categories: [], topics: [], notes: [], resources: [], tags: [] };
  }

  async syncHydrate(
    payload: ValidatedHydrateInput,
  ): Promise<ValidatedHydrateResponse> {
    const validated = HydratePayloadSchema.parse(payload);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          categories: validated.categories,
          topics: validated.topics,
          notes: validated.notes,
          resources: validated.resources,
          tags: validated.tags,
          links: validated.links,
          _lastSyncedAt: new Date().toISOString(),
        }),
      );
    }
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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    return resolvedCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.categories = data.categories.filter((c) => c.id !== categoryId);
    data.topics = data.topics.filter((t) => t.categoryId !== categoryId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    return topic;
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.topics = data.topics.filter((t) => t.id !== topicId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    return note;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.notes = data.notes.filter((n) => n.id !== noteId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
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
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
    return resource;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    const data = await this.loadInitialData();
    data.resources = data.resources.filter((r) => r.id !== resourceId);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
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
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
    }
    return progress;
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
}

/**
 * ApiDataRepository Implementation
 * Kết nối REST API Server PostgreSQL, tự động fallback sang LocalStorage khi offline
 */
export class ApiDataRepository implements IDataRepository {
  private localFallback: LocalStorageDataRepository;
  private apiBaseUrl: string;

  constructor(
    apiBaseUrl = "/api",
    localFallback = new LocalStorageDataRepository(),
  ) {
    this.apiBaseUrl = apiBaseUrl;
    this.localFallback = localFallback;
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
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolvedCategory),
        });
      } catch {
        // Handled via local fallback
      }
    }
    return resolvedCategory;
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    await this.localFallback.deleteCategory(categoryId);
    const url = this.getUrl(`/categories/${categoryId}`);
    if (url) {
      try {
        await fetch(url, { method: "DELETE" });
      } catch {
        // Handled via local fallback
      }
    }
    return true;
  }

  async saveTopic(topic: Topic): Promise<Topic> {
    await this.localFallback.saveTopic(topic);
    const url = this.getUrl("/topics");
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(topic),
        });
      } catch {
        // Handled via local fallback
      }
    }
    return topic;
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    await this.localFallback.deleteTopic(topicId);
    const url = this.getUrl(`/topics/${topicId}`);
    if (url) {
      try {
        await fetch(url, { method: "DELETE" });
      } catch {
        // Handled via local fallback
      }
    }
    return true;
  }

  async saveNote(note: Note): Promise<Note> {
    await this.localFallback.saveNote(note);
    const url = this.getUrl("/notes");
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(note),
        });
      } catch {
        // Handled via local fallback
      }
    }
    return note;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    await this.localFallback.deleteNote(noteId);
    const url = this.getUrl(`/notes/${noteId}`);
    if (url) {
      try {
        await fetch(url, { method: "DELETE" });
      } catch {
        // Handled via local fallback
      }
    }
    return true;
  }

  async saveResource(resource: Resource): Promise<Resource> {
    await this.localFallback.saveResource(resource);
    const url = this.getUrl("/resources");
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resource),
        });
      } catch {
        // Handled via local fallback
      }
    }
    return resource;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    await this.localFallback.deleteResource(resourceId);
    const url = this.getUrl(`/resources/${resourceId}`);
    if (url) {
      try {
        await fetch(url, { method: "DELETE" });
      } catch {
        // Handled via local fallback
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
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, progress }),
        });
      } catch {
        // Handled via local fallback
      }
    }
    return progress;
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
}
