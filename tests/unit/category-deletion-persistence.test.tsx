import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { safeSetLocalStorageItem, STORAGE_ROOT_KEY } from '../../src/lib/storage';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';

describe('Category Deletion Persistence & State Integrity Contract', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('Scenario 1: Failed persistence preserves category and cascading topics in state', async () => {
    const targetCatId = 'cat-cong-nghe';
    const relatedTopicId = 'topic-cn-101';

    // Mock initial server load to supply the category and related topic
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/api/topics') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: relatedTopicId,
              title: 'Lập Trình Web',
              slug: 'lap-trinh-web',
              categoryId: targetCatId,
              type: 'cong-nghe',
              parentId: null,
              description: '',
              content: '',
              tags: [],
              links: [],
              studyProgress: {
                topicId: relatedTopicId,
                status: 'not_started',
                progress: 0,
              },
            },
          ],
        } as Response;
      }

      if (url.includes('/api/categories') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => [
            ...INITIAL_CATEGORIES,
            {
              id: targetCatId,
              name: 'Công Nghệ',
              slug: 'cong-nghe',
              type: 'cong-nghe',
              parentId: null,
            },
          ],
        } as Response;
      }

      if (url.includes(`/api/categories/${targetCatId}`) && method === 'DELETE') {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Database delete failed' }),
        } as Response;
      }

      if (url.includes('/api/notes')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/resources')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/sync/hydrate')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }

      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
    });

    // Wait for server hydration to complete
    await waitFor(() => {
      expect(result.current.categories.some((c) => c.id === targetCatId)).toBe(true);
      expect(result.current.topics.some((t) => t.id === relatedTopicId)).toBe(true);
    });

    // Attempt deletion which fails on backend
    await act(async () => {
      result.current.deleteCategory(targetCatId);
    });

    // Assert that on failure, state must roll back to retain category and related topics
    await waitFor(() => {
      expect(result.current.categories.some((c) => c.id === targetCatId)).toBe(true);
      expect(result.current.topics.some((t) => t.id === relatedTopicId)).toBe(true);
    });
  });

  it('Scenario 2: Commit state only after successful persistence - removes category and all related cascading topics', async () => {
    const targetCatId = 'cat-phat-hoc';
    const relatedTopicId = 'topic-ph-202';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/api/topics') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: relatedTopicId,
              title: 'Bát Chánh Đạo',
              slug: 'bat-chanh-dao',
              categoryId: targetCatId,
              type: 'phat-hoc',
              parentId: null,
              description: '',
              content: '',
              tags: [],
              links: [],
              studyProgress: {
                topicId: relatedTopicId,
                status: 'not_started',
                progress: 0,
              },
            },
          ],
        } as Response;
      }

      if (url.includes('/api/categories') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => [
            ...INITIAL_CATEGORIES,
            {
              id: targetCatId,
              name: 'Phật Học',
              slug: 'phat-hoc',
              type: 'phat-hoc',
              parentId: null,
            },
          ],
        } as Response;
      }

      if (url.includes(`/api/categories/${targetCatId}`) && method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, id: targetCatId }),
        } as Response;
      }

      if (url.includes('/api/notes')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/resources')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/sync/hydrate')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }

      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
    });

    await waitFor(() => {
      expect(result.current.categories.some((c) => c.id === targetCatId)).toBe(true);
      expect(result.current.topics.some((t) => t.id === relatedTopicId)).toBe(true);
    });

    // Execute successful deletion
    await act(async () => {
      result.current.deleteCategory(targetCatId);
    });

    // Assert that category AND its related topics are purged from client state
    await waitFor(() => {
      expect(result.current.categories.some((c) => c.id === targetCatId)).toBe(false);
      expect(result.current.topics.some((t) => t.categoryId === targetCatId)).toBe(false);
    });
  });

  it('Scenario 3: Reload reads server-canonical state - stale local cache does not resurrect server-deleted categories', async () => {
    const staleCatId = 'cat-phan-mem';

    // Stale local storage has an obsolete category
    safeSetLocalStorageItem(
      `${STORAGE_ROOT_KEY}_categories`,
      JSON.stringify([
        ...INITIAL_CATEGORIES,
        {
          id: staleCatId,
          name: 'Phần Mềm',
          slug: 'phan-mem',
          type: 'phan-mem',
          parentId: null,
        },
      ])
    );

    // Server only returns clean canonical categories (excluding 'cat-phan-mem')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      if (url.includes('/api/topics') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => INITIAL_TOPICS,
        } as Response;
      }

      if (url.includes('/api/categories') && method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => INITIAL_CATEGORIES,
        } as Response;
      }

      if (url.includes('/api/notes')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/resources')) {
        return { ok: true, status: 200, json: async () => [] } as Response;
      }
      if (url.includes('/api/sync/hydrate')) {
        return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
      }

      return { ok: true, status: 200, json: async () => [] } as Response;
    });

    const { result } = renderHook(() => useData(), {
      wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
    });

    // After server hydration completes, local stale category must be replaced with server SSOT
    await waitFor(() => {
      expect(result.current.categories.some((c) => c.id === staleCatId)).toBe(false);
      expect(result.current.categories.some((c) => c.id === 'cat-root-dong-y')).toBe(true);
    });
  });
});
