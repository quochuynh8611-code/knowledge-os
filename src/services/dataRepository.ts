import {
  Category,
  Topic,
  Note,
  Resource,
  Tag,
  KnowledgeLink,
  StudyProgress,
} from "../types";
import {
  ValidatedHydrateInput,
  ValidatedHydrateResponse,
  HydratePayloadSchema,
  TopicCreateSchema,
  NoteCreateSchema,
  ResourceCreateSchema,
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
 * Dùng làm lớp dự phòng offline khi chưa kết nối PostgreSQL
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
    return topic;
  }

  async deleteTopic(_topicId: string): Promise<boolean> {
    return true;
  }

  async saveNote(note: Note): Promise<Note> {
    return note;
  }

  async deleteNote(_noteId: string): Promise<boolean> {
    return true;
  }

  async saveResource(resource: Resource): Promise<Resource> {
    return resource;
  }

  async deleteResource(_resourceId: string): Promise<boolean> {
    return true;
  }

  async saveStudyProgress(
    _topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress> {
    return progress;
  }
}
