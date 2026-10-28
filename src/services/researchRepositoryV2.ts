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
  DeleteCategoryResult,
} from './dataRepository';
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
  private base: IDataRepository;

  constructor(baseRepository: IDataRepository) {
    this.base = baseRepository;
  }

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

  async deleteCategory(categoryId: string): Promise<DeleteCategoryResult> {
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

  async appendExcerptToNote(noteId: string, excerptBlockquote: string): Promise<Note> {
    if (this.base.appendExcerptToNote) {
      return this.base.appendExcerptToNote(noteId, excerptBlockquote);
    }
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
    return this.saveNote(updatedNote);
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

  async resetAllData(): Promise<boolean> {
    return this.base.resetAllData();
  }

  async getArchivedDocuments(): Promise<ArchivedDocument[]> {
    if (this.base.getArchivedDocuments) {
      return this.base.getArchivedDocuments();
    }
    return [];
  }

  async updateArchivedDocumentPosition(
    documentId: string,
    position: ReadingPositionData
  ): Promise<ArchivedDocument> {
    if (this.base.updateArchivedDocumentPosition) {
      return this.base.updateArchivedDocumentPosition(documentId, position);
    }
    throw new Error('updateArchivedDocumentPosition is not supported by base repository');
  }

  async saveKnowledgeLink(link: KnowledgeLink): Promise<KnowledgeLink> {
    if (this.base.saveKnowledgeLink) {
      return this.base.saveKnowledgeLink(link);
    }
    return link;
  }

  async deleteKnowledgeLink(linkId: string): Promise<boolean> {
    if (this.base.deleteKnowledgeLink) {
      return this.base.deleteKnowledgeLink(linkId);
    }
    return true;
  }

  async getResearchExcerpts(filters?: {
    topicId?: string;
    sourceNoteId?: string;
    targetNoteId?: string;
    tag?: string;
    status?: string;
  }): Promise<ResearchExcerpt[]> {
    if (this.base.getResearchExcerpts) {
      return this.base.getResearchExcerpts(filters);
    }
    return [];
  }

  async createResearchExcerpt(input: unknown): Promise<ResearchExcerpt> {
    if (this.base.createResearchExcerpt) {
      return this.base.createResearchExcerpt(input);
    }
    return input as ResearchExcerpt;
  }

  async updateResearchExcerpt(
    id: string,
    input: unknown,
  ): Promise<ResearchExcerpt> {
    if (this.base.updateResearchExcerpt) {
      return this.base.updateResearchExcerpt(id, input);
    }
    return input as ResearchExcerpt;
  }

  async deleteResearchExcerpt(id: string): Promise<boolean> {
    if (this.base.deleteResearchExcerpt) {
      return this.base.deleteResearchExcerpt(id);
    }
    return true;
  }

  async getResearchInboxItems(): Promise<ResearchInboxItem[]> {
    if (this.base.getResearchInboxItems) {
      return this.base.getResearchInboxItems();
    }
    return [];
  }

  async createResearchInboxItem(input: unknown): Promise<ResearchInboxItem> {
    if (this.base.createResearchInboxItem) {
      return this.base.createResearchInboxItem(input);
    }
    return input as ResearchInboxItem;
  }

  async processResearchInboxItem(
    id: string,
    isProcessed?: boolean,
  ): Promise<ResearchInboxItem> {
    if (this.base.processResearchInboxItem) {
      return this.base.processResearchInboxItem(id, isProcessed);
    }
    return { id, isProcessed: Boolean(isProcessed) } as ResearchInboxItem;
  }

  async deleteResearchInboxItem(id: string): Promise<boolean> {
    if (this.base.deleteResearchInboxItem) {
      return this.base.deleteResearchInboxItem(id);
    }
    return true;
  }

  // ── Flashcard Delegation ──────────────────────────────────────────────

  async getFlashcards(filters?: { topicId?: string }): Promise<any[]> {
    if (this.base.getFlashcards) {
      return this.base.getFlashcards(filters);
    }
    return [];
  }

  async createFlashcard(input: unknown): Promise<any> {
    if (this.base.createFlashcard) {
      return this.base.createFlashcard(input);
    }
    throw new Error('createFlashcard is not supported by base repository');
  }

  async updateFlashcard(id: string, input: unknown): Promise<any> {
    if (this.base.updateFlashcard) {
      return this.base.updateFlashcard(id, input);
    }
    throw new Error('updateFlashcard is not supported by base repository');
  }

  async deleteFlashcard(id: string): Promise<boolean> {
    if (this.base.deleteFlashcard) {
      return this.base.deleteFlashcard(id);
    }
    return true;
  }
}
