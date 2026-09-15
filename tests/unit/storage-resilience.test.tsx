import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { normalizeTopics, normalizeNotes, getSafeStudyProgress } from '../../src/lib/taxonomyMigration';
import { LocalStorageDataRepository } from '../../src/services/dataRepository';
import {
  clearAllAppStorage,
  safeGetLocalStorageItem,
  safeSetLocalStorageItem,
  ensureStorageVersionCompatibility,
  STORAGE_ROOT_KEY,
  STORAGE_VERSION_KEY,
  CURRENT_STORAGE_VERSION,
  FOCUS_DOMAIN_STORAGE_KEY,
} from '../../src/lib/storage';
import { NextActionStrip } from '../../src/components/topics/NextActionStrip';
import { Topic, Note } from '../../src/types';

describe('Storage & Schema Resilience (Post-Reset Runtime Crash Prevention)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('normalizeTopics & getSafeStudyProgress', () => {
    it('normalizes topic with null studyProgress to a complete default studyProgress object', () => {
      const rawTopic = {
        id: 'topic-dong-y-1',
        title: 'Đông Y Căn Bản',
        slug: 'dong-y-can-ban',
        categoryId: 'cat-dong-y',
        type: 'dong-y',
        description: 'Mô tả bài học',
        content: 'Nội dung',
        tags: ['dongy'],
        links: [],
        studyProgress: null as any,
      } as unknown as Topic;

      const [normalized] = normalizeTopics([rawTopic]);

      expect(normalized.studyProgress).toBeDefined();
      expect(normalized.studyProgress.topicId).toBe('topic-dong-y-1');
      expect(normalized.studyProgress.status).toBe('not_started');
      expect(normalized.studyProgress.progress).toBe(0);
      expect(normalized.studyProgress.easeFactor).toBe(2.5);
      expect(normalized.studyProgress.repetitions).toBe(0);
      expect(normalized.studyProgress.interval).toBe(0);
      expect(normalized.studyProgress.totalNotes).toBe(0);
      expect(normalized.studyProgress.timeSpent).toBe(0);
    });

    it('normalizes topic with undefined studyProgress safely', () => {
      const rawTopic = {
        id: 'topic-dong-y-2',
        title: 'Bát Cương Biện Chứng',
        slug: 'bat-cuong',
        categoryId: 'cat-dong-y',
        type: 'dong-y',
      } as unknown as Topic;

      const safeProgress = getSafeStudyProgress(rawTopic);
      expect(safeProgress.topicId).toBe('topic-dong-y-2');
      expect(safeProgress.status).toBe('not_started');
      expect(safeProgress.progress).toBe(0);
    });
  });

  describe('normalizeNotes', () => {
    it('safely normalizes note with null or missing sourcePath and corrupted tags', () => {
      const rawNote = {
        id: 'note-1',
        topicId: 'topic-dong-y-1',
        title: 'Ghi chú Đông Y',
        content: 'Nội dung ghi chú',
        sourcePath: null,
        isPrivate: undefined,
        tags: null,
      } as unknown as Note;

      const [normalized] = normalizeNotes([rawNote]);

      expect(normalized.sourcePath).toBeUndefined();
      expect(normalized.isPrivate).toBe(false);
      expect(normalized.tags).toEqual([]);
      expect(normalized.type).toBe('insight');
    });
  });

  describe('LocalStorageDataRepository.syncHydrate with nullable fields', () => {
    it('persists without throwing ZodError when topics have null studyProgress or notes have null sourcePath', async () => {
      const repo = new LocalStorageDataRepository('test_storage_resilience_key');

      const payload = {
        clientSyncId: 'test-sync-1',
        version: '2.0.0',
        clientTimestamp: new Date().toISOString(),
        categories: [
          {
            id: 'cat-dong-y',
            name: 'Đông Y',
            slug: 'dong-y',
            parentId: null,
            type: 'dong-y',
          },
        ],
        topics: [
          {
            id: 'topic-dong-y-1',
            title: 'Đông Y Căn Bản',
            slug: 'dong-y-can-ban',
            categoryId: 'cat-dong-y',
            type: 'dong-y',
            studyProgress: null as any,
          } as any,
        ],
        notes: [
          {
            id: 'note-dong-y-1',
            topicId: 'topic-dong-y-1',
            title: 'Ghi chú số 1',
            content: 'Nội dung...',
            sourcePath: null as any,
          } as any,
        ],
        resources: [],
        tags: [],
        links: [],
      };

      const result = await repo.syncHydrate(payload);
      expect(result.success).toBe(true);
      expect(result.summary.categoriesUpserted).toBe(1);
      expect(result.summary.topicsUpserted).toBe(1);
      expect(result.summary.notesUpserted).toBe(1);

      // Verify loaded initial data is also normalized
      const loaded = await repo.loadInitialData();
      expect(loaded.topics[0].studyProgress).toBeDefined();
      expect(loaded.topics[0].studyProgress.status).toBe('not_started');
    });
  });

  describe('NextActionStrip Component with Null/Missing studyProgress', () => {
    it('renders without throwing TypeError when topic.studyProgress is null', () => {
      const topicWithNullProgress = {
        id: 'topic-null-progress',
        title: 'Chủ đề Đông Y',
        slug: 'chu-de-dong-y',
        categoryId: 'cat-dong-y',
        type: 'dong-y',
        studyProgress: null as any,
      } as unknown as Topic;

      expect(() => {
        render(<NextActionStrip topic={topicWithNullProgress} />);
      }).not.toThrow();

      expect(screen.getByTestId('next-action-strip')).toHaveTextContent(
        'Bắt đầu phiên học đầu tiên để kích hoạt tiến trình học tập.'
      );
    });
  });

  describe('clearAllAppStorage & ensureStorageVersionCompatibility', () => {
    it('clears all Knowledge OS keys from localStorage without touching unrelated keys', () => {
      safeSetLocalStorageItem('phat_hoc_huyen_hoc_clean_v3', JSON.stringify({ ok: true }));
      safeSetLocalStorageItem('phat_hoc_huyen_hoc_clean_v3_topics', JSON.stringify([]));
      safeSetLocalStorageItem('knowledge_os_focus_domain_id_v1', 'cat-dong-y');
      safeSetLocalStorageItem('unrelated_user_theme', 'dark');

      clearAllAppStorage();

      expect(safeGetLocalStorageItem('phat_hoc_huyen_hoc_clean_v3')).toBeNull();
      expect(safeGetLocalStorageItem('phat_hoc_huyen_hoc_clean_v3_topics')).toBeNull();
      expect(safeGetLocalStorageItem('knowledge_os_focus_domain_id_v1')).toBeNull();
      expect(safeGetLocalStorageItem('unrelated_user_theme')).toBe('dark');
    });

    it('Scenario: Storage-version mismatch invalidates only audited legacy keys and updates storage version', () => {
      // Simulate outdated storage version 2 with legacy categories
      safeSetLocalStorageItem(STORAGE_VERSION_KEY, '2');
      safeSetLocalStorageItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify([{ id: 'cat-old', name: 'Old' }]));
      safeSetLocalStorageItem(`${STORAGE_ROOT_KEY}_topics`, JSON.stringify([{ id: 'top-old', title: 'Old Top' }]));
      safeSetLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY, 'cat-old');
      safeSetLocalStorageItem('other_app_unrelated_key', 'keep_me');

      const migrated = ensureStorageVersionCompatibility();
      expect(migrated).toBe(true);

      // App keys purged
      expect(safeGetLocalStorageItem(`${STORAGE_ROOT_KEY}_categories`)).toBeNull();
      expect(safeGetLocalStorageItem(`${STORAGE_ROOT_KEY}_topics`)).toBeNull();
      expect(safeGetLocalStorageItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();

      // Version bumped to CURRENT_STORAGE_VERSION (3)
      expect(safeGetLocalStorageItem(STORAGE_VERSION_KEY)).toBe(String(CURRENT_STORAGE_VERSION));
      expect(CURRENT_STORAGE_VERSION).toBe(3);

      // Unrelated key untouched
      expect(safeGetLocalStorageItem('other_app_unrelated_key')).toBe('keep_me');
    });

    it('does not purge keys if storage version matches CURRENT_STORAGE_VERSION', () => {
      safeSetLocalStorageItem(STORAGE_VERSION_KEY, '3');
      safeSetLocalStorageItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify([{ id: 'cat-root-dong-y', name: 'Đông Y' }]));

      const migrated = ensureStorageVersionCompatibility();
      expect(migrated).toBe(false);

      expect(safeGetLocalStorageItem(`${STORAGE_ROOT_KEY}_categories`)).not.toBeNull();
      expect(safeGetLocalStorageItem(STORAGE_VERSION_KEY)).toBe('3');
    });
  });
});
