import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Category, Topic, Note, Resource } from '../../src/types';
import {
  mergeCategoryData,
  MergeCategoriesResult,
} from '../../src/lib/taxonomyMigration';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { TopicTree } from '../../src/components/topics/TopicTree';
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
} from '../../src/data/initialData';

describe('Wave 16.1 / 16.2: Taxonomy Cleanup & Safe Merge Helper (Kinh Tế & Tài Chính as Canonical Root)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  // Mock Data Setup
  const sampleCategories: Category[] = [
    // Canonical Target Root: Kinh Tế & Tài Chính
    {
      id: 'cat-root-kinh-te-tai-chinh',
      name: 'Kinh Tế & Tài Chính',
      slug: 'kinh-te-tai-chinh',
      type: 'kinh-te-tai-chinh',
      parentId: null,
    },
    // Duplicate Source Root 1: Kinh Tế
    {
      id: 'cat-root-kinh-te',
      name: 'Kinh Tế',
      slug: 'kinh-te',
      type: 'kinh-te',
      parentId: null,
    },
    // Duplicate Source Root 2: Kinh Tế Học
    {
      id: 'cat-root-kinh-te-hoc',
      name: 'Kinh Tế Học',
      slug: 'kinh-te-hoc',
      type: 'kinh-te-hoc',
      parentId: null,
    },
    // Subcategory under Kinh Tế Học
    {
      id: 'cat-sub-kinh-te-vi-mo',
      name: 'Kinh Tế Vĩ Mô',
      slug: 'kinh-te-vi-mo',
      type: 'kinh-te-hoc',
      parentId: 'cat-root-kinh-te-hoc',
    },
    // Unrelated Root: Phật Học
    {
      id: 'cat-root-phat-hoc',
      name: 'Phật Học',
      slug: 'phat-hoc',
      type: 'phat-hoc',
      parentId: null,
    },
  ];

  const sampleTopics: Topic[] = [
    {
      id: 'top-kt-1',
      title: 'Kinh Tế Học Đại Cương',
      slug: 'kinh-te-hoc-dai-cuong',
      categoryId: 'cat-root-kinh-te',
      type: 'kinh-te',
      createdAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 'top-kth-1',
      title: 'Nguyên Lý Kinh Tế',
      slug: 'nguyen-ly-kinh-te',
      categoryId: 'cat-root-kinh-te-hoc',
      type: 'kinh-te-hoc',
      createdAt: '2026-08-01T08:30:00.000Z',
      updatedAt: '2026-08-01T08:30:00.000Z',
    },
    {
      id: 'top-vi-mo-1',
      title: 'Lạm Phát và Tăng Trưởng GDP',
      slug: 'lam-phat-va-tang-truong-gdp',
      categoryId: 'cat-sub-kinh-te-vi-mo',
      type: 'kinh-te-hoc',
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'top-kttc-1',
      title: 'Quản Trị Tài Chính Doanh Nghiệp',
      slug: 'quan-tri-tai-chinh-doanh-nghiep',
      categoryId: 'cat-root-kinh-te-tai-chinh',
      type: 'kinh-te-tai-chinh',
      createdAt: '2026-08-01T09:30:00.000Z',
      updatedAt: '2026-08-01T09:30:00.000Z',
    },
  ];

  describe('1. Baseline: Demonstrating Orphan Risk of Naive deleteCategory', () => {
    it('1.1. Naive deletion removes category but leaves topics referencing a non-existent categoryId', () => {
      // Simulating naive deletion of 'cat-root-kinh-te'
      const deletedId = 'cat-root-kinh-te';
      const naiveRemainingCategories = sampleCategories.filter((c) => c.id !== deletedId);

      // Topic top-kt-1 still exists in memory but points to deleted category
      const topic = sampleTopics.find((t) => t.id === 'top-kt-1');
      expect(topic?.categoryId).toBe(deletedId);

      // But category does not exist anymore
      const categoryExists = naiveRemainingCategories.some((c) => c.id === topic?.categoryId);
      expect(categoryExists).toBe(false); // ORPHAN TOPIC DETECTED!
    });

    it('1.2. Naive deletion leaves child subcategories referencing a non-existent parentId', () => {
      // Simulating naive deletion of 'cat-root-kinh-te-hoc'
      const deletedId = 'cat-root-kinh-te-hoc';
      const naiveRemainingCategories = sampleCategories.filter((c) => c.id !== deletedId);

      const subCat = naiveRemainingCategories.find((c) => c.id === 'cat-sub-kinh-te-vi-mo');
      expect(subCat?.parentId).toBe(deletedId);

      // Parent category no longer exists in categories array
      const parentExists = naiveRemainingCategories.some((c) => c.id === subCat?.parentId);
      expect(parentExists).toBe(false); // ORPHAN SUBCATEGORY DETECTED!
    });
  });

  describe('2. Pure Helper: mergeCategoryData Contract Verification', () => {
    it('2.1. Merges "Kinh Tế" into canonical "Kinh Tế & Tài Chính", remapping direct topics with 0 data loss', () => {
      const result = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te',
        'cat-root-kinh-te-tai-chinh'
      );

      expect(result.success).toBe(true);
      expect(result.sourceCategoryId).toBe('cat-root-kinh-te');
      expect(result.targetCategoryId).toBe('cat-root-kinh-te-tai-chinh');
      expect(result.remappedTopicCount).toBe(1);

      // Source category is removed from categories
      expect(result.updatedCategories.some((c) => c.id === 'cat-root-kinh-te')).toBe(false);
      // Canonical target category remains
      expect(result.updatedCategories.some((c) => c.id === 'cat-root-kinh-te-tai-chinh')).toBe(true);

      // Topic top-kt-1 is remapped to target categoryId and target type
      const remappedTopic = result.updatedTopics.find((t) => t.id === 'top-kt-1');
      expect(remappedTopic?.categoryId).toBe('cat-root-kinh-te-tai-chinh');
      expect(remappedTopic?.type).toBe('kinh-te-tai-chinh');

      // Total topics count is strictly preserved (4 -> 4)
      expect(result.updatedTopics.length).toBe(sampleTopics.length);
    });

    it('2.2. Merges "Kinh Tế Học" into canonical "Kinh Tế & Tài Chính", remapping child categories and their topics', () => {
      const result = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te-hoc',
        'cat-root-kinh-te-tai-chinh'
      );

      expect(result.success).toBe(true);
      expect(result.remappedChildCategoryCount).toBe(1);

      // Child category parentId is remapped to canonical root
      const subCat = result.updatedCategories.find((c) => c.id === 'cat-sub-kinh-te-vi-mo');
      expect(subCat?.parentId).toBe('cat-root-kinh-te-tai-chinh');
      expect(subCat?.type).toBe('kinh-te-tai-chinh');

      // Direct topic under Kinh Tế Học is remapped
      const topicKth = result.updatedTopics.find((t) => t.id === 'top-kth-1');
      expect(topicKth?.categoryId).toBe('cat-root-kinh-te-tai-chinh');
      expect(topicKth?.type).toBe('kinh-te-tai-chinh');

      // Topic under subcategory retains its categoryId but type is updated
      const topicViMo = result.updatedTopics.find((t) => t.id === 'top-vi-mo-1');
      expect(topicViMo?.categoryId).toBe('cat-sub-kinh-te-vi-mo');
      expect(topicViMo?.type).toBe('kinh-te-tai-chinh');
    });

    it('2.3. Notes and Resources attached to remapped topics remain 100% intact', () => {
      const mockNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Ghi chú vĩ mô',
          content: 'Nội dung',
          topicId: 'top-vi-mo-1',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ];
      const mockResources: Resource[] = [
        {
          id: 'res-1',
          title: 'Sách kinh tế đại cương',
          url: 'https://example.com',
          topicId: 'top-kt-1',
          type: 'book',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ];

      const result = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te',
        'cat-root-kinh-te-tai-chinh'
      );

      // Verify that all topic IDs are invariant, so notes and resources resolve perfectly
      mockNotes.forEach((note) => {
        const matchingTopic = result.updatedTopics.find((t) => t.id === note.topicId);
        expect(matchingTopic).toBeDefined();
      });

      mockResources.forEach((res) => {
        const matchingTopic = result.updatedTopics.find((t) => t.id === res.topicId);
        expect(matchingTopic).toBeDefined();
      });
    });

    it('2.4. Fails safely and rejects invalid merge requests', () => {
      // Case 1: source and target are identical
      const selfResult = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te',
        'cat-root-kinh-te'
      );
      expect(selfResult.success).toBe(false);
      expect(selfResult.error).toContain('IDENTICAL');

      // Case 2: sourceCategory not found
      const invalidSourceResult = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-invalid-source',
        'cat-root-kinh-te-tai-chinh'
      );
      expect(invalidSourceResult.success).toBe(false);
      expect(invalidSourceResult.error).toContain('SOURCE_NOT_FOUND');

      // Case 3: targetCategory not found
      const invalidTargetResult = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te',
        'cat-invalid-target'
      );
      expect(invalidTargetResult.success).toBe(false);
      expect(invalidTargetResult.error).toContain('TARGET_NOT_FOUND');
    });

    it('2.5. Descendant topics policy: only aligns type when topic belonged to source domain, preserving unrelated topics', () => {
      const result = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te-hoc',
        'cat-root-kinh-te-tai-chinh'
      );

      // Topic under descendant subcategory (Kinh Tế Vĩ Mô) has type aligned
      const topicViMo = result.updatedTopics.find((t) => t.id === 'top-vi-mo-1');
      expect(topicViMo?.type).toBe('kinh-te-tai-chinh');

      // Unrelated topic (Kinh Tế & Tài Chính) retains its original type
      const topicKttc = result.updatedTopics.find((t) => t.id === 'top-kttc-1');
      expect(topicKttc?.type).toBe('kinh-te-tai-chinh');

      // Unrelated topic in another domain (Kinh Tế) was not touched by this merge
      const topicKt = result.updatedTopics.find((t) => t.id === 'top-kt-1');
      expect(topicKt?.type).toBe('kinh-te');
    });

    it('2.6. UpdatedAt policy: only topics with mutated categoryId/type receive bumped timestamp; untouched topics retain original updatedAt', () => {
      const originalKtUpdatedAt = sampleTopics.find((t) => t.id === 'top-kt-1')?.updatedAt;
      const originalKttcUpdatedAt = sampleTopics.find((t) => t.id === 'top-kttc-1')?.updatedAt;

      const result = mergeCategoryData(
        sampleCategories,
        sampleTopics,
        'cat-root-kinh-te',
        'cat-root-kinh-te-tai-chinh'
      );

      // Mutated topic (top-kt-1 had categoryId changed) has a fresh updatedAt
      const mutatedTopic = result.updatedTopics.find((t) => t.id === 'top-kt-1');
      expect(mutatedTopic?.updatedAt).not.toBe(originalKtUpdatedAt);

      // Untouched topic (top-kttc-1 was already under target category) retains exact original updatedAt
      const untouchedTopic = result.updatedTopics.find((t) => t.id === 'top-kttc-1');
      expect(untouchedTopic?.updatedAt).toBe(originalKttcUpdatedAt);

      // Untouched topic in unrelated domain (top-vi-mo-1) retains exact original updatedAt
      const unrelatedTopic = result.updatedTopics.find((t) => t.id === 'top-vi-mo-1');
      expect(unrelatedTopic?.updatedAt).toBe('2026-08-01T09:00:00.000Z');
    });
  });

  describe('3. DataContext Integration: mergeCategories Action', () => {
    it('3.1. Calling mergeCategories in DataContext updates in-memory state and redirects focusDomainId if needed', async () => {
      const { renderHook, act } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      const { result, unmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      // Add mock duplicate categories and topics with distinct sequential timestamps
      let mockTime = 1772360000000;
      const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
        mockTime += 100;
        return mockTime;
      });

      let sourceCatId: string = '';
      let targetCatId: string = '';
      let topicId: string = '';

      act(() => {
        targetCatId = result.current.addCategory({
          name: 'Kinh Tế & Tài Chính',
          slug: 'kinh-te-tai-chinh',
          type: 'kinh-te-tai-chinh',
          parentId: null,
        });
        sourceCatId = result.current.addCategory({
          name: 'Kinh Tế',
          slug: 'kinh-te',
          type: 'kinh-te',
          parentId: null,
        });
        topicId = result.current.addTopic({
          title: 'Kinh Tế Vĩ Mô Đại Cương',
          slug: 'kinh-te-vi-mo-dai-cuong',
          categoryId: sourceCatId,
          type: 'kinh-te' as any,
          content: 'Nội dung',
          tags: [],
          visibility: 'active',
        });
        result.current.setFocusDomainId(sourceCatId);
      });

      expect(result.current.focusDomainId).toBe(sourceCatId);
      expect(result.current.categories.some((c) => c.id === sourceCatId)).toBe(true);

      // Perform merge
      let mergeRes: any;
      act(() => {
        mergeRes = result.current.mergeCategories(sourceCatId, targetCatId);
      });

      dateSpy.mockRestore();

      expect(mergeRes.success).toBe(true);
      // Source category is gone
      expect(result.current.categories.some((c) => c.id === sourceCatId)).toBe(false);
      // Target category exists
      expect(result.current.categories.some((c) => c.id === targetCatId)).toBe(true);
      // Topic categoryId is updated to target
      const remappedTopic = result.current.topics.find((t) => t.id === topicId);
      expect(remappedTopic?.categoryId).toBe(targetCatId);
      // Focus domain is redirected to target
      expect(result.current.focusDomainId).toBe(targetCatId);

      unmount();
    });

    it('3.2. When merge fails, state remains completely unmutated and returns error', async () => {
      const { renderHook, act } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      const { result, unmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      const initialCatCount = result.current.categories.length;
      const initialTopicCount = result.current.topics.length;

      let mergeRes: any;
      act(() => {
        mergeRes = result.current.mergeCategories('invalid-source', 'invalid-target');
      });

      expect(mergeRes.success).toBe(false);
      expect(mergeRes.error).toBeDefined();
      expect(result.current.categories.length).toBe(initialCatCount);
      expect(result.current.topics.length).toBe(initialTopicCount);

      unmount();
    });

    it('3.3. Confirms legacy deleteCategory function is still available and unreplaced', async () => {
      const { renderHook } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      const { result, unmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      expect(typeof result.current.deleteCategory).toBe('function');
      expect(typeof result.current.mergeCategories).toBe('function');
      unmount();
    });

    it('3.4. Persistence Rehydration (LocalStorage): After mergeCategories, unmounting and remounting DataProvider retains merged state and does NOT resurrect source category', async () => {
      const { renderHook, act, waitFor } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      // Offline mode: fetch rejects immediately to fallback to LocalStorage
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));

      // First mount
      const { result: firstResult, unmount: firstUnmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      let sourceCatId = 'cat-root-kinh-te';
      let targetCatId = 'cat-root-kinh-te-tai-chinh';
      let topicId: string = '';

      act(() => {
        firstResult.current.importAllDataJSON(
          JSON.stringify({
            categories: [
              ...INITIAL_CATEGORIES,
              {
                id: sourceCatId,
                name: 'Kinh Tế',
                slug: 'kinh-te',
                type: 'kinh-te',
                parentId: null,
              },
              {
                id: targetCatId,
                name: 'Kinh Tế & Tài Chính',
                slug: 'kinh-te-tai-chinh',
                type: 'kinh-te-tai-chinh',
                parentId: null,
              },
            ],
            topics: [
              {
                id: 'topic-kt-123',
                title: 'Kinh Tế Vĩ Mô',
                slug: 'kinh-te-vi-mo',
                categoryId: sourceCatId,
                type: 'kinh-te',
                createdAt: '2026-08-01T00:00:00.000Z',
                updatedAt: '2026-08-01T00:00:00.000Z',
                studyProgress: {
                  topicId: 'topic-kt-123',
                  status: 'in_progress',
                  progress: 50,
                },
              },
            ],
            notes: [],
            resources: [],
            tags: [],
            links: [],
          })
        );
      });

      // Wait for import persistence to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(firstResult.current.categories.some((c) => c.id === sourceCatId)).toBe(true);

      // Perform merge
      act(() => {
        const mergeRes = firstResult.current.mergeCategories(sourceCatId, targetCatId);
        expect(mergeRes.success).toBe(true);
      });

      // Confirm in-memory state after merge
      expect(firstResult.current.categories.some((c) => c.id === sourceCatId)).toBe(false);
      expect(firstResult.current.categories.some((c) => c.id === targetCatId)).toBe(true);

      // Wait for async persistence to write to storage
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Unmount first session
      firstUnmount();

      // Second mount (simulating full page reload / app restart)
      const { result: secondResult, unmount: secondUnmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      // Assert state after rehydration: source category must NOT resurrect!
      await waitFor(() => {
        expect(secondResult.current.categories.some((c) => c.id === targetCatId)).toBe(true);
      });
      expect(secondResult.current.categories.some((c) => c.id === sourceCatId)).toBe(false);
      const rehydratedTopic = secondResult.current.topics.find((t) => t.id === 'topic-kt-123');
      expect(rehydratedTopic?.categoryId).toBe(targetCatId);
      expect(rehydratedTopic?.type).toBe('kinh-te-tai-chinh');

      secondUnmount();
      fetchSpy.mockRestore();
    });

    it('3.5. Persistence Rehydration (API / Server sync): mergeCategories triggers repository deletion and sync so server reloadAllData does not resurrect category', async () => {
      const { renderHook, act, waitFor } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      let serverCategories = [
        ...INITIAL_CATEGORIES,
        {
          id: 'cat-root-kinh-te-hoc',
          name: 'Kinh Tế Học',
          slug: 'kinh-te-hoc',
          type: 'kinh-te-hoc',
          parentId: null,
        },
        {
          id: 'cat-root-kinh-te-tai-chinh',
          name: 'Kinh Tế & Tài Chính',
          slug: 'kinh-te-tai-chinh',
          type: 'kinh-te-tai-chinh',
          parentId: null,
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const url = String(input);
        const method = init?.method || 'GET';

        if (url.includes('/api/categories/cat-root-kinh-te-hoc') && method === 'DELETE') {
          serverCategories = serverCategories.filter((c) => c.id !== 'cat-root-kinh-te-hoc');
          return { ok: true, json: async () => ({ success: true }) } as Response;
        }

        if (url.includes('/api/categories') && method === 'GET') {
          return { ok: true, json: async () => serverCategories } as Response;
        }

        if (url.includes('/api/topics') && method === 'GET') {
          return { ok: true, json: async () => INITIAL_TOPICS } as Response;
        }

        if (url.includes('/api/sync/hydrate') && method === 'POST') {
          const body = JSON.parse(String(init?.body || '{}'));
          if (body.categories) {
            // Server updates
          }
          return { ok: true, json: async () => ({ success: true }) } as Response;
        }

        return { ok: true, json: async () => [] } as Response;
      });

      const { result, unmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      act(() => {
        result.current.importAllDataJSON(
          JSON.stringify({
            categories: serverCategories,
            topics: INITIAL_TOPICS,
            notes: [],
            resources: [],
            tags: [],
            links: [],
          })
        );
      });

      // Merge Kinh Tế Học into Kinh Tế & Tài Chính
      act(() => {
        const res = result.current.mergeCategories('cat-root-kinh-te-hoc', 'cat-root-kinh-te-tai-chinh');
        expect(res.success).toBe(true);
      });

      // Allow async repo delete to dispatch
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      unmount();

      // Remount and call reloadAllData
      const { result: secondResult, unmount: secondUnmount } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      await act(async () => {
        await secondResult.current.reloadAllData();
      });

      // Server data should reflect deletion and not resurrect Kinh Tế Học
      await waitFor(() => {
        expect(secondResult.current.categories.some((c) => c.id === 'cat-root-kinh-te-tai-chinh')).toBe(true);
      });
      expect(secondResult.current.categories.some((c) => c.id === 'cat-root-kinh-te-hoc')).toBe(false);

      secondUnmount();
      fetchSpy.mockRestore();
    });
  });

  describe('4. UI Integration: TopicTree Category Deletion & Fixed Merge Flow', () => {
    it('4.1. Case 1: Clicking delete on cat-root-kinh-te prompts merge confirm and calls mergeCategories("cat-root-kinh-te", "cat-root-kinh-te-tai-chinh")', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const TestHarness = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [
                      ...INITIAL_CATEGORIES,
                      {
                        id: 'cat-root-kinh-te',
                        name: 'Kinh Tế',
                        slug: 'kinh-te',
                        type: 'kinh-te',
                        parentId: null,
                      },
                      {
                        id: 'cat-root-kinh-te-tai-chinh',
                        name: 'Kinh Tế & Tài Chính',
                        slug: 'kinh-te-tai-chinh',
                        type: 'kinh-te-tai-chinh',
                        parentId: null,
                      },
                    ],
                    topics: INITIAL_TOPICS,
                    notes: INITIAL_NOTES,
                    resources: INITIAL_RESOURCES,
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed Data
            </button>
            <TopicTree />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestHarness />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed Data' }));

      const deleteBtn = screen.getByTestId('delete-category-cat-root-kinh-te');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Danh mục "Kinh Tế" sẽ được gộp vào "Kinh Tế & Tài Chính". Các chủ đề hiện có sẽ được giữ lại và chuyển sang danh mục đích. Bạn có muốn tiếp tục không?'
      );
      // Source category is removed from UI after merge
      expect(screen.queryByTestId('delete-category-cat-root-kinh-te')).toBeNull();
      confirmSpy.mockRestore();
    });

    it('4.2. Case 2: Clicking delete on cat-root-kinh-te-hoc prompts exact merge confirm for Kinh Tế Học', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const TestHarness = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [
                      ...INITIAL_CATEGORIES,
                      {
                        id: 'cat-root-kinh-te-hoc',
                        name: 'Kinh Tế Học',
                        slug: 'kinh-te-hoc',
                        type: 'kinh-te-hoc',
                        parentId: null,
                      },
                      {
                        id: 'cat-root-kinh-te-tai-chinh',
                        name: 'Kinh Tế & Tài Chính',
                        slug: 'kinh-te-tai-chinh',
                        type: 'kinh-te-tai-chinh',
                        parentId: null,
                      },
                    ],
                    topics: INITIAL_TOPICS,
                    notes: INITIAL_NOTES,
                    resources: INITIAL_RESOURCES,
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed Data
            </button>
            <TopicTree />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestHarness />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed Data' }));

      const deleteBtn = screen.getByTestId('delete-category-cat-root-kinh-te-hoc');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Danh mục "Kinh Tế Học" sẽ được gộp vào "Kinh Tế & Tài Chính". Các chủ đề hiện có sẽ được giữ lại và chuyển sang danh mục đích. Bạn có muốn tiếp tục không?'
      );
      // Source category is removed from UI after merge
      expect(screen.queryByTestId('delete-category-cat-root-kinh-te-hoc')).toBeNull();
      confirmSpy.mockRestore();
    });

    it('4.3. Case 3: Clicking delete on regular custom category prompts standard deletion confirm and does not merge', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const TestHarness = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [
                      ...INITIAL_CATEGORIES,
                      {
                        id: 'cat-custom-triet-hoc',
                        name: 'Triết Học Tây Phương',
                        slug: 'triet-hoc-tay-phuong',
                        type: 'triet-hoc',
                        parentId: null,
                      },
                    ],
                    topics: INITIAL_TOPICS,
                    notes: INITIAL_NOTES,
                    resources: INITIAL_RESOURCES,
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed Data
            </button>
            <TopicTree />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestHarness />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed Data' }));

      const deleteBtn = screen.getByTestId('delete-category-cat-custom-triet-hoc');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith('Xóa danh mục "Triết Học Tây Phương"?');
      expect(screen.queryByTestId('delete-category-cat-custom-triet-hoc')).toBeNull();
      confirmSpy.mockRestore();
    });

    it('4.4. Case 4: When mergeCategories fails, triggers window.alert with error without crashing UI', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const TestHarness = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [
                      ...INITIAL_CATEGORIES,
                      {
                        id: 'cat-root-kinh-te',
                        name: 'Kinh Tế',
                        slug: 'kinh-te',
                        type: 'kinh-te',
                        parentId: null,
                      },
                    ],
                    topics: INITIAL_TOPICS,
                    notes: INITIAL_NOTES,
                    resources: INITIAL_RESOURCES,
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed Data
            </button>
            <TopicTree />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestHarness />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed Data' }));

      const deleteBtn = screen.getByTestId('delete-category-cat-root-kinh-te');
      fireEvent.click(deleteBtn);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Không thể gộp danh mục')
      );
      // Category still remains because merge failed
      expect(screen.getByTestId('delete-category-cat-root-kinh-te')).toBeInTheDocument();
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('4.5. Case 5: When user cancels merge confirm prompt, mergeCategories is not called and category remains intact', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const TestHarness = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [
                      ...INITIAL_CATEGORIES,
                      {
                        id: 'cat-root-kinh-te',
                        name: 'Kinh Tế',
                        slug: 'kinh-te',
                        type: 'kinh-te',
                        parentId: null,
                      },
                      {
                        id: 'cat-root-kinh-te-tai-chinh',
                        name: 'Kinh Tế & Tài Chính',
                        slug: 'kinh-te-tai-chinh',
                        type: 'kinh-te-tai-chinh',
                        parentId: null,
                      },
                    ],
                    topics: INITIAL_TOPICS,
                    notes: INITIAL_NOTES,
                    resources: INITIAL_RESOURCES,
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed Data
            </button>
            <TopicTree />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestHarness />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed Data' }));

      const deleteBtn = screen.getByTestId('delete-category-cat-root-kinh-te');
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Danh mục "Kinh Tế" sẽ được gộp vào "Kinh Tế & Tài Chính". Các chủ đề hiện có sẽ được giữ lại và chuyển sang danh mục đích. Bạn có muốn tiếp tục không?'
      );
      // Source category remains because user cancelled
      expect(screen.getByTestId('delete-category-cat-root-kinh-te')).toBeInTheDocument();
      confirmSpy.mockRestore();
    });
  });
});

