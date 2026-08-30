import { describe, it, expect } from 'vitest';
import {
  normalizeCategories,
  normalizeTopics,
  getRootCategories,
  getChildCategories,
  getDescendantCategoryIds,
  resolveRootCategory,
  resolveCategoryFilterToRootId,
  topicBelongsToRootCategory,
  countTopicsForRootCategory,
} from '../../src/lib/taxonomyMigration';
import { Category, Topic } from '../../src/types';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';

describe('Post-Phase 5: Dynamic Taxonomy & Topic Visibility Helper Library', () => {
  it('1. normalizeTopics automatically backfills missing visibility to "active"', () => {
    const legacyTopics = [
      {
        id: 'topic-1',
        title: 'Legacy Topic without visibility',
        slug: 'legacy-topic',
        categoryId: 'cat-1',
        type: 'phat-hoc',
        description: 'Test',
        content: 'Content',
        tags: [],
        links: [],
        studyProgress: {
          topicId: 'topic-1',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      } as unknown as Topic,
      {
        id: 'topic-2',
        title: 'Hidden Topic',
        slug: 'hidden-topic',
        categoryId: 'cat-1',
        type: 'phat-hoc',
        description: 'Test',
        content: 'Content',
        tags: [],
        links: [],
        visibility: 'hidden',
        studyProgress: {
          topicId: 'topic-2',
          status: 'not_started',
          progress: 0,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      } as Topic,
    ];

    const normalized = normalizeTopics(legacyTopics);
    expect(normalized[0].visibility).toBe('active');
    expect(normalized[1].visibility).toBe('hidden');
  });

  it('2. getRootCategories returns all categories where parentId is null or undefined', () => {
    const categories: Category[] = [
      { id: 'cat-root-1', name: 'Root 1', slug: 'root-1', parentId: null },
      { id: 'cat-root-2', name: 'Root 2', slug: 'root-2' }, // undefined parentId
      { id: 'cat-child-1', name: 'Child 1', slug: 'child-1', parentId: 'cat-root-1' },
      { id: 'cat-child-2', name: 'Child 2', slug: 'child-2', parentId: 'cat-root-2' },
    ];

    const roots = getRootCategories(categories);
    expect(roots).toHaveLength(2);
    expect(roots.map((r) => r.id)).toEqual(['cat-root-1', 'cat-root-2']);
  });

  it('3. getChildCategories returns all sub-categories belonging to a root category', () => {
    const categories: Category[] = [
      { id: 'cat-root-1', name: 'Root 1', slug: 'root-1', parentId: null },
      { id: 'cat-child-1', name: 'Child 1', slug: 'child-1', parentId: 'cat-root-1' },
      { id: 'cat-child-2', name: 'Child 2', slug: 'child-2', parentId: 'cat-root-1' },
      { id: 'cat-other-child', name: 'Other Child', slug: 'other-child', parentId: 'cat-root-2' },
    ];

    const children = getChildCategories(categories, 'cat-root-1');
    expect(children).toHaveLength(2);
    expect(children.map((c) => c.id)).toEqual(['cat-child-1', 'cat-child-2']);
  });

  it('4. normalizeCategories preserves custom root and child categories without alteration', () => {
    const customCategories: Category[] = [
      { id: 'cat-custom-root', name: 'Khoa Học Dữ Liệu', slug: 'khoa-hoc-du-lieu', parentId: null },
      { id: 'cat-custom-child', name: 'Machine Learning', slug: 'machine-learning', parentId: 'cat-custom-root' },
    ];

    const normalized = normalizeCategories(customCategories);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].name).toBe('Khoa Học Dữ Liệu');
    expect(normalized[1].parentId).toBe('cat-custom-root');
  });

  it('5. getDescendantCategoryIds recursively returns rootId and all child + grandchild categories safely', () => {
    const categories: Category[] = [
      { id: 'root-a', name: 'Root A', slug: 'root-a', parentId: null },
      { id: 'child-1', name: 'Child 1', slug: 'child-1', parentId: 'root-a' },
      { id: 'grandchild-1', name: 'Grandchild 1', slug: 'gc-1', parentId: 'child-1' },
      { id: 'child-2', name: 'Child 2', slug: 'child-2', parentId: 'root-a' },
      { id: 'root-b', name: 'Root B', slug: 'root-b', parentId: null },
      { id: 'child-b', name: 'Child B', slug: 'child-b', parentId: 'root-b' },
    ];

    const descendantsA = getDescendantCategoryIds(categories, 'root-a');
    expect(new Set(descendantsA)).toEqual(new Set(['root-a', 'child-1', 'grandchild-1', 'child-2']));

    const descendantsB = getDescendantCategoryIds(categories, 'root-b');
    expect(new Set(descendantsB)).toEqual(new Set(['root-b', 'child-b']));
  });

  it('6. resolveCategoryFilterToRootId maps ID, legacy slug, or legacy type to canonical rootId', () => {
    const normalizedCats = normalizeCategories(INITIAL_CATEGORIES);

    // Direct ID
    expect(resolveCategoryFilterToRootId(normalizedCats, 'cat-root-phat-hoc')).toBe('cat-root-phat-hoc');
    // Legacy slug/type
    expect(resolveCategoryFilterToRootId(normalizedCats, 'phat-hoc')).toBe('cat-root-phat-hoc');
    expect(resolveCategoryFilterToRootId(normalizedCats, 'huyen-hoc')).toBe('cat-root-huyen-hoc');
    // Null or all
    expect(resolveCategoryFilterToRootId(normalizedCats, null)).toBeNull();
    expect(resolveCategoryFilterToRootId(normalizedCats, 'all')).toBeNull();
  });

  it('7. topicBelongsToRootCategory and countTopicsForRootCategory correctly identify and count descendant topics', () => {
    const normalizedCats = normalizeCategories(INITIAL_CATEGORIES);
    const normalizedTopics = normalizeTopics(INITIAL_TOPICS);

    // Topic in grandchild category 'cat-abhidharma' must belong to 'cat-root-phat-hoc'
    const abhiTopic = normalizedTopics.find((t) => t.categoryId === 'cat-abhidharma')!;
    expect(topicBelongsToRootCategory(abhiTopic, normalizedCats, 'cat-root-phat-hoc')).toBe(true);
    expect(topicBelongsToRootCategory(abhiTopic, normalizedCats, 'cat-root-huyen-hoc')).toBe(false);

    // Topic in 'cat-tam-thuc' must belong to 'cat-root-huyen-hoc'
    const ttTopic = normalizedTopics.find((t) => t.categoryId === 'cat-tam-thuc')!;
    expect(topicBelongsToRootCategory(ttTopic, normalizedCats, 'cat-root-huyen-hoc')).toBe(true);
    expect(topicBelongsToRootCategory(ttTopic, normalizedCats, 'cat-root-phat-hoc')).toBe(false);

    // Counts for standard root categories must not be 0
    const phCount = countTopicsForRootCategory(normalizedTopics, normalizedCats, 'cat-root-phat-hoc');
    const hhCount = countTopicsForRootCategory(normalizedTopics, normalizedCats, 'cat-root-huyen-hoc');
    const dyCount = countTopicsForRootCategory(normalizedTopics, normalizedCats, 'cat-root-dong-y');
    const nnCount = countTopicsForRootCategory(normalizedTopics, normalizedCats, 'cat-root-ngon-ngu');
    expect(phCount).toBeGreaterThan(0);
    expect(hhCount).toBeGreaterThan(0);
    expect(dyCount).toBeGreaterThan(0);
    expect(nnCount).toBeGreaterThan(0);
    expect(phCount + hhCount + dyCount + nnCount).toBe(normalizedTopics.length);

    // Newly added root category has 0 topics
    const customCats = [
      ...normalizedCats,
      { id: 'cat-root-new', name: 'Lĩnh Vực Mới', slug: 'linh-vuc-moi', parentId: null },
    ];
    expect(countTopicsForRootCategory(normalizedTopics, customCats, 'cat-root-new')).toBe(0);
  });
});
