import { describe, it, expect } from 'vitest';
import { Category, Topic, Note, Resource } from '../../src/types';
import {
  mergeCategoryData,
  MergeCategoriesResult,
} from '../../src/lib/taxonomyMigration';

describe('Wave 16.1: Taxonomy Cleanup & Safe Merge Helper (Kinh Tế & Tài Chính as Canonical Root)', () => {
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

      const { result } = renderHook(() => useData(), {
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
    });

    it('3.2. When merge fails, state remains completely unmutated and returns error', async () => {
      const { renderHook, act } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      const { result } = renderHook(() => useData(), {
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
    });

    it('3.3. Confirms legacy deleteCategory function is still available and unreplaced', async () => {
      const { renderHook } = await import('@testing-library/react');
      const { DataProvider, useData } = await import('../../src/context/DataContext');

      const { result } = renderHook(() => useData(), {
        wrapper: ({ children }) => <DataProvider>{children}</DataProvider>,
      });

      expect(typeof result.current.deleteCategory).toBe('function');
      expect(typeof result.current.mergeCategories).toBe('function');
    });
  });
});

