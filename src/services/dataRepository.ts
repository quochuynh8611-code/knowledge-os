import { Category, Topic, Note, Resource, Tag, StudyProgress } from "../types";
import {
  ValidatedHydrateInput,
  ValidatedHydrateResponse,
  HydratePayloadSchema,
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

  // 2. Topics CRUD
  saveTopic(topic: Topic): Promise<Topic>;
  deleteTopic(topicId: string): Promise<boolean>;

  // 3. Notes CRUD
  saveNote(note: Note): Promise<Note>;
  deleteNote(noteId: string): Promise<boolean>;

  // 4. Resources CRUD
  saveResource(resource: Resource): Promise<Resource>;
  deleteResource(resourceId: string): Promise<boolean>;

  // 5. Spaced Repetition (SM-2) & Study Progress
  saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress>;
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

  async loadInitialData() {
    try {
      const res = await fetch(`${this.apiBaseUrl}/topics`);
      if (res.ok) {
        const topics = await res.json();
        if (Array.isArray(topics) && topics.length > 0) {
          const notesRes = await fetch(`${this.apiBaseUrl}/notes`);
          const notes = notesRes.ok ? await notesRes.json() : [];
          const resourcesRes = await fetch(`${this.apiBaseUrl}/resources`);
          const resources = resourcesRes.ok ? await resourcesRes.json() : [];

          return {
            categories: [],
            topics,
            notes,
            resources,
            tags: [],
          };
        }
      }
    } catch (e) {
      console.warn("REST API unavailable, using LocalStorage fallback", e);
    }
    return this.localFallback.loadInitialData();
  }

  async syncHydrate(
    payload: ValidatedHydrateInput,
  ): Promise<ValidatedHydrateResponse> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/sync/hydrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        // Cập nhật cả local fallback
        await this.localFallback.syncHydrate(payload);
        return result;
      }
    } catch (e) {
      console.warn("Hydrate via API failed, storing to LocalStorage", e);
    }
    return this.localFallback.syncHydrate(payload);
  }

  async saveTopic(topic: Topic): Promise<Topic> {
    await this.localFallback.saveTopic(topic);
    try {
      await fetch(`${this.apiBaseUrl}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topic),
      });
    } catch (e) {
      console.warn("Failed to save topic to server", e);
    }
    return topic;
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    await this.localFallback.deleteTopic(topicId);
    try {
      await fetch(`${this.apiBaseUrl}/topics/${topicId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete topic on server", e);
    }
    return true;
  }

  async saveNote(note: Note): Promise<Note> {
    await this.localFallback.saveNote(note);
    try {
      await fetch(`${this.apiBaseUrl}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
    } catch (e) {
      console.warn("Failed to save note to server", e);
    }
    return note;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    await this.localFallback.deleteNote(noteId);
    try {
      await fetch(`${this.apiBaseUrl}/notes/${noteId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete note on server", e);
    }
    return true;
  }

  async saveResource(resource: Resource): Promise<Resource> {
    await this.localFallback.saveResource(resource);
    try {
      await fetch(`${this.apiBaseUrl}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource),
      });
    } catch (e) {
      console.warn("Failed to save resource to server", e);
    }
    return resource;
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    await this.localFallback.deleteResource(resourceId);
    try {
      await fetch(`${this.apiBaseUrl}/resources/${resourceId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.warn("Failed to delete resource on server", e);
    }
    return true;
  }

  async saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress> {
    await this.localFallback.saveStudyProgress(topicId, progress);
    try {
      await fetch(`${this.apiBaseUrl}/study-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, progress }),
      });
    } catch (e) {
      console.warn("Failed to save study progress to server", e);
    }
    return progress;
  }
}
