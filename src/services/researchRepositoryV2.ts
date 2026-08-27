/**
 * ResearchRepositoryV2 — Adapter wrapping IDataRepository
 *
 * Architecture: Decorator / Wrapper pattern.
 * - Does NOT replace LocalStorageDataRepository or ApiDataRepository.
 * - Does NOT modify DataContext.
 * - All IDataRepository methods delegate to the wrapped base repo.
 * - saveNote override: enforces topicId = topicIds[0] backward compat rule.
 *
 * Usage (standalone, not injected into DataContext yet):
 *   const adapter = new ResearchRepositoryV2(new LocalStorageDataRepository());
 *   await adapter.saveNote(multiTopicNote);
 */

import {
  IDataRepository,
  RepositorySyncResult,
} from './dataRepository';
import {
  Category,
  Topic,
  Note,
  Resource,
  Tag,
  StudyProgress,
} from '../types';
import {
  ValidatedHydrateInput,
  ValidatedHydrateResponse,
  ValidatedBackupSnapshot,
  ValidatedRestoreRequest,
  ValidatedRestoreResponse,
  ValidatedDbHealthResponse,
} from '../lib/validation';
import { resolveTopicIds } from '../lib/researchStorageHelpers';

export class ResearchRepositoryV2 implements IDataRepository {
  constructor(private readonly base: IDataRepository) {}

  // ── IDataRepository delegation ────────────────────────────────────────────

  async loadInitialData(): Promise<{
    categories: Category[];
    topics: Topic[];
    notes: Note[];
    resources: Resource[];
    tags: Tag[];
  }> {
    return this.base.loadInitialData();
  }

  async syncHydrate(payload: ValidatedHydrateInput): Promise<ValidatedHydrateResponse> {
    return this.base.syncHydrate(payload);
  }

  async saveCategory(category: Category): Promise<Category> {
    return this.base.saveCategory(category);
  }

  async deleteCategory(categoryId: string): Promise<boolean> {
    return this.base.deleteCategory(categoryId);
  }

  async saveTopic(topic: Topic): Promise<Topic> {
    return this.base.saveTopic(topic);
  }

  async deleteTopic(topicId: string): Promise<boolean> {
    return this.base.deleteTopic(topicId);
  }

  /**
   * saveNote — Multi-topic backward compat override.
   *
   * Rule: If note.topicIds is non-empty, set topicId = topicIds[0]
   * before passing to base repo. This ensures the legacy FK stays valid.
   * The full topicIds array is passed through for any future DB-side handling.
   */
  async saveNote(note: Note & { topicIds?: string[] }): Promise<Note> {
    const resolvedIds = resolveTopicIds(note);
    const normalizedNote: Note & { topicIds?: string[] } = {
      ...note,
      topicId: resolvedIds[0], // backward compat: primary FK = first resolved ID
    };
    return this.base.saveNote(normalizedNote);
  }

  async deleteNote(noteId: string): Promise<boolean> {
    return this.base.deleteNote(noteId);
  }

  async saveResource(resource: Resource): Promise<Resource> {
    return this.base.saveResource(resource);
  }

  async deleteResource(resourceId: string): Promise<boolean> {
    return this.base.deleteResource(resourceId);
  }

  async saveStudyProgress(
    topicId: string,
    progress: StudyProgress,
  ): Promise<StudyProgress> {
    return this.base.saveStudyProgress(topicId, progress);
  }

  async exportBackupSnapshot(): Promise<ValidatedBackupSnapshot> {
    return this.base.exportBackupSnapshot();
  }

  async restoreBackupSnapshot(
    req: ValidatedRestoreRequest,
  ): Promise<ValidatedRestoreResponse> {
    return this.base.restoreBackupSnapshot(req);
  }

  async getDbHealth(): Promise<ValidatedDbHealthResponse> {
    return this.base.getDbHealth();
  }
}
