/**
 * Phase P0.2: Storage Repository SSOT & Resilience Tests
 * Test-first verification for LocalStorageDataRepository safe storage operations,
 * dual-key parity (root + sub-keys), and resetAllData contract.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LocalStorageDataRepository,
  ApiDataRepository,
  IDataRepository,
} from '../../src/services/dataRepository';
import { Category, Topic, Note, Resource, Tag, StudyProgress } from '../../src/types';

describe('Phase P0.2: Storage Repository SSOT & Resilience Tests', () => {
  const TEST_STORAGE_KEY = 'test_knowledge_ssot_v1';
  let repo: LocalStorageDataRepository;

  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {}
    vi.restoreAllMocks();
    repo = new LocalStorageDataRepository(TEST_STORAGE_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Safe read and bootstrapping fallback', () => {
    it('returns empty structures without throwing when localStorage is empty', async () => {
      const data = await repo.loadInitialData();
      expect(data).toEqual({
        categories: [],
        topics: [],
        notes: [],
        resources: [],
        tags: [],
      });
    });

    it('handles malformed JSON in localStorage gracefully without throwing', async () => {
      localStorage.setItem(TEST_STORAGE_KEY, 'MALFORMED_JSON{{{');
      const data = await repo.loadInitialData();
      expect(data).toEqual({
        categories: [],
        topics: [],
        notes: [],
        resources: [],
        tags: [],
      });
    });

    it('falls back to sub-keys when root key is missing', async () => {
      const sampleTopic: Topic = {
        id: 'topic-sub-1',
        title: 'Sub-key Topic',
        slug: 'sub-key-topic',
        categoryId: 'cat-1',
        type: 'phat-hoc',
        description: 'Desc',
        content: 'Content',
        tags: ['tag1'],
        links: [],
        studyProgress: {
          topicId: 'topic-sub-1',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-08-27T00:00:00Z',
        updatedAt: '2026-08-27T00:00:00Z',
      };
      localStorage.setItem(`${TEST_STORAGE_KEY}_topics`, JSON.stringify([sampleTopic]));

      const data = await repo.loadInitialData();
      expect(data.topics.length).toBe(1);
      expect(data.topics[0].id).toBe('topic-sub-1');
    });
  });

  describe('2. Dual-Key Parity (Root key + Sub-keys synchronization)', () => {
    it('saveTopic updates both root key and topics sub-key', async () => {
      const topic: Topic = {
        id: 'topic-dual-1',
        title: 'Dual Key Topic',
        slug: 'dual-key-topic',
        categoryId: 'cat-1',
        type: 'phat-hoc',
        description: 'Desc',
        content: 'Content',
        tags: ['test'],
        links: [],
        studyProgress: {
          topicId: 'topic-dual-1',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-08-27T00:00:00Z',
        updatedAt: '2026-08-27T00:00:00Z',
      };

      await repo.saveTopic(topic);

      // Verify sub-key
      const subKeyRaw = localStorage.getItem(`${TEST_STORAGE_KEY}_topics`);
      expect(subKeyRaw).not.toBeNull();
      const subKeyParsed = JSON.parse(subKeyRaw!);
      expect(subKeyParsed.length).toBe(1);
      expect(subKeyParsed[0].id).toBe('topic-dual-1');

      // Verify root key
      const rootKeyRaw = localStorage.getItem(TEST_STORAGE_KEY);
      expect(rootKeyRaw).not.toBeNull();
      const rootKeyParsed = JSON.parse(rootKeyRaw!);
      expect(rootKeyParsed.topics.length).toBe(1);
      expect(rootKeyParsed.topics[0].id).toBe('topic-dual-1');
    });

    it('saveNote updates both root key and notes sub-key', async () => {
      const note: Note = {
        id: 'note-dual-1',
        topicId: 'topic-1',
        title: 'Dual Note',
        content: 'Content',
        type: 'study',
        isPrivate: false,
        tags: [],
        createdAt: '2026-08-27T00:00:00Z',
        updatedAt: '2026-08-27T00:00:00Z',
      };

      await repo.saveNote(note);

      const subKeyRaw = localStorage.getItem(`${TEST_STORAGE_KEY}_notes`);
      expect(subKeyRaw).not.toBeNull();
      const subParsed = JSON.parse(subKeyRaw!);
      expect(subParsed.find((n: Note) => n.id === 'note-dual-1')).toBeDefined();

      const rootKeyRaw = localStorage.getItem(TEST_STORAGE_KEY);
      const rootParsed = JSON.parse(rootKeyRaw!);
      expect(rootParsed.notes.find((n: Note) => n.id === 'note-dual-1')).toBeDefined();
    });

    it('syncHydrate writes all entity sub-keys along with the root key', async () => {
      const payload = {
        clientSyncId: 'sync-1',
        clientTimestamp: '2026-08-27T00:00:00Z',
        categories: [{ id: 'cat-1', name: 'Cat 1', slug: 'cat-1', type: 'phat-hoc', order: 1 }],
        topics: [
          {
            id: 'top-1',
            title: 'Top 1',
            slug: 'top-1',
            categoryId: 'cat-1',
            type: 'phat-hoc',
            description: '',
            content: '',
            tags: [],
            createdAt: '2026-08-27T00:00:00Z',
            updatedAt: '2026-08-27T00:00:00Z',
          },
        ],
        notes: [],
        resources: [],
        tags: [],
        links: [],
      };

      await repo.syncHydrate(payload);

      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_categories`)).not.toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_topics`)).not.toBeNull();
      expect(localStorage.getItem(TEST_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe('3. resetAllData contract', () => {
    it('resetAllData clears root key and all sub-keys safely', async () => {
      // Populate keys first
      localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify({ topics: [{ id: '1' }] }));
      localStorage.setItem(`${TEST_STORAGE_KEY}_categories`, '[]');
      localStorage.setItem(`${TEST_STORAGE_KEY}_topics`, '[]');
      localStorage.setItem(`${TEST_STORAGE_KEY}_notes`, '[]');
      localStorage.setItem(`${TEST_STORAGE_KEY}_resources`, '[]');
      localStorage.setItem(`${TEST_STORAGE_KEY}_tags`, '[]');

      expect(typeof repo.resetAllData).toBe('function');
      const result = await repo.resetAllData();
      expect(result).toBe(true);

      expect(localStorage.getItem(TEST_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_categories`)).toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_topics`)).toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_notes`)).toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_resources`)).toBeNull();
      expect(localStorage.getItem(`${TEST_STORAGE_KEY}_tags`)).toBeNull();
    });
  });
});
