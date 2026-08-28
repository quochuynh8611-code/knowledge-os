/**
 * Research Repository Adapter v2 — Failing Tests (RED state)
 * Tests: ResearchRepositoryV2 wraps IDataRepository, saveNote backward compat
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResearchRepositoryV2 } from '../../src/services/researchRepositoryV2';
import { IDataRepository, LocalStorageDataRepository } from '../../src/services/dataRepository';
import { Note, Category, Topic, Resource, Tag, StudyProgress } from '../../src/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseNote: Note = {
  id: 'note-adapter-1',
  topicId: 'topic-primary',
  title: 'Adapter Test Note',
  content: 'Content',
  type: 'study',
  isPrivate: false,
  tags: [],
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
};

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('ResearchRepositoryV2 — Adapter backward compat', () => {
  let baseRepo: IDataRepository;
  let saveNoteSpy: ReturnType<typeof vi.spyOn>;
  let adapter: ResearchRepositoryV2;

  beforeEach(() => {
    baseRepo = new LocalStorageDataRepository('__test_research_repo__');
    saveNoteSpy = vi.spyOn(baseRepo, 'saveNote').mockResolvedValue(baseNote);
    adapter = new ResearchRepositoryV2(baseRepo);
  });

  it('22. ResearchRepositoryV2 can be instantiated wrapping a base IDataRepository', () => {
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(ResearchRepositoryV2);
  });

  it('23. adapter.saveNote delegates to base repo with topicId = topicIds[0] when topicIds present', async () => {
    const multiNote = {
      ...baseNote,
      topicId: 'topic-primary',
      topicIds: ['topic-B', 'topic-C'],
    };
    await adapter.saveNote(multiNote);
    expect(saveNoteSpy).toHaveBeenCalledOnce();
    const calledWith = saveNoteSpy.mock.calls[0][0];
    // Must write topicId = topicIds[0] for backward compat
    expect(calledWith.topicId).toBe('topic-B');
  });

  it('24. adapter.saveNote keeps original topicId when topicIds is absent', async () => {
    const singleNote = { ...baseNote };
    await adapter.saveNote(singleNote);
    const calledWith = saveNoteSpy.mock.calls[0][0];
    expect(calledWith.topicId).toBe('topic-primary');
  });

  it('25. adapter.saveNote keeps original topicId when topicIds is empty', async () => {
    const emptyNote = { ...baseNote, topicIds: [] };
    await adapter.saveNote(emptyNote);
    const calledWith = saveNoteSpy.mock.calls[0][0];
    expect(calledWith.topicId).toBe('topic-primary');
  });

  it('26. adapter exposes all IDataRepository methods (interface compliance)', () => {
    const requiredMethods: Array<keyof IDataRepository> = [
      'loadInitialData',
      'syncHydrate',
      'saveCategory',
      'deleteCategory',
      'saveTopic',
      'deleteTopic',
      'saveNote',
      'deleteNote',
      'saveResource',
      'deleteResource',
      'saveStudyProgress',
      'exportBackupSnapshot',
      'restoreBackupSnapshot',
      'getDbHealth',
      'resetAllData',
    ];
    for (const method of requiredMethods) {
      expect(typeof (adapter as unknown as Record<string, unknown>)[method]).toBe('function');
    }
  });

  it('27. adapter.resetAllData delegates to base repo resetAllData', async () => {
    const resetSpy = vi.spyOn(baseRepo, 'resetAllData').mockResolvedValue(true);
    const result = await adapter.resetAllData();
    expect(resetSpy).toHaveBeenCalledOnce();
    expect(result).toBe(true);
  });
});
