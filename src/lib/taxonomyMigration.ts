import { Category, Topic } from '../types';

/**
 * Normalizes topics by ensuring `visibility` is populated.
 * Legacy topics without `visibility` default to `'active'`.
 */
export function normalizeTopics(topics: Topic[]): Topic[] {
  if (!Array.isArray(topics)) return [];
  return topics.map((t) => ({
    ...t,
    visibility: t.visibility || 'active',
  }));
}

/**
 * Normalizes categories ensuring valid id, name, slug, and parentId references.
 * Preserves parentId hierarchy without hardcoded domain injections.
 */
export function normalizeCategories(categories: Category[]): Category[] {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  return categories.map((c) => ({
    ...c,
    parentId: c.parentId !== undefined ? c.parentId : null,
    type: c.type || c.slug || 'general',
  }));
}

/**
 * Returns all root categories (categories with parentId null or undefined).
 */
export function getRootCategories(categories: Category[]): Category[] {
  if (!Array.isArray(categories)) return [];
  return categories.filter((c) => !c.parentId);
}

/**
 * Returns all child categories belonging to a specific root or parent category ID.
 */
export function getChildCategories(categories: Category[], parentId: string): Category[] {
  if (!Array.isArray(categories) || !parentId) return [];
  return categories.filter((c) => c.parentId === parentId);
}

/**
 * Recursively retrieves all descendant category IDs for a given root or parent category ID.
 * Returns an array containing the rootId and all its direct and indirect child IDs.
 * Safe against cyclic parentId references.
 */
export function getDescendantCategoryIds(categories: Category[], rootId: string): string[] {
  if (!Array.isArray(categories) || !rootId) return [];

  const result: string[] = [rootId];
  const visited = new Set<string>([rootId]);
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const cat of categories) {
      if (cat.parentId === currentId && !visited.has(cat.id)) {
        visited.add(cat.id);
        result.push(cat.id);
        queue.push(cat.id);
      }
    }
  }

  return result;
}

/**
 * Resolves the root category for any given category ID.
 * Traverses parentId up the tree, guarded against circular references.
 */
export function resolveRootCategory(categories: Category[], categoryId: string): Category | null {
  if (!Array.isArray(categories) || !categoryId) return null;

  const visited = new Set<string>();
  let currentId: string | null | undefined = categoryId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categories.find((c) => c.id === currentId);
    if (!cat) return null;
    if (!cat.parentId) return cat;
    currentId = cat.parentId;
  }

  return null;
}

/**
 * Maps any category filter value (rootId, childId, legacy slug, legacy type)
 * to its canonical root category ID.
 */
export function resolveCategoryFilterToRootId(
  categories: Category[],
  filterValue: string | null | undefined
): string | null {
  if (!filterValue || filterValue === 'all') return null;
  if (!Array.isArray(categories) || categories.length === 0) return filterValue;

  // 1. Direct match with a root category ID
  const directRoot = categories.find((c) => c.id === filterValue && !c.parentId);
  if (directRoot) return directRoot.id;

  // 2. Match with a child category ID -> resolve to its root ID
  const directCat = categories.find((c) => c.id === filterValue);
  if (directCat) {
    const root = resolveRootCategory(categories, directCat.id);
    if (root) return root.id;
  }

  // 3. Compatibility fallback: Match by slug or type on a root category
  const slugMatch = categories.find(
    (c) => !c.parentId && (c.slug === filterValue || c.type === filterValue)
  );
  if (slugMatch) return slugMatch.id;

  // 4. Default fallback
  return filterValue;
}

/**
 * Checks if a topic belongs to a specific root category or any of its descendant categories.
 */
export function topicBelongsToRootCategory(
  topic: Topic,
  categories: Category[],
  rootId: string
): boolean {
  if (!topic || !rootId) return false;
  if (rootId === 'all') return true;

  const descendantIds = getDescendantCategoryIds(categories, rootId);
  if (descendantIds.includes(topic.categoryId)) {
    return true;
  }

  // Fallback compatibility check
  const root = resolveRootCategory(categories, topic.categoryId);
  if (root && root.id === rootId) {
    return true;
  }

  return false;
}

/**
 * Counts the total number of topics belonging to a root category and all its descendant categories.
 */
export function countTopicsForRootCategory(
  topics: Topic[],
  categories: Category[],
  rootId: string
): number {
  if (!Array.isArray(topics) || !rootId) return 0;
  return topics.filter((t) => topicBelongsToRootCategory(t, categories, rootId)).length;
}

export interface RootCategoryStats {
  totalTopics: number;
  completedTopics: number;
  donePercent: number;
}

/**
 * Computes topic count and progress metrics for a root category and all its descendants.
 */
export function calculateRootCategoryStats(
  topics: Topic[],
  categories: Category[],
  rootId: string
): RootCategoryStats {
  if (!Array.isArray(topics) || !rootId) {
    return { totalTopics: 0, completedTopics: 0, donePercent: 0 };
  }

  const activeTopics = topics.filter(
    (t) => t.visibility !== 'hidden' && topicBelongsToRootCategory(t, categories, rootId)
  );

  const completed = activeTopics.filter(
    (t) =>
      (t.studyProgress?.progress || 0) >= 100 ||
      t.studyProgress?.status === 'completed'
  ).length;

  const donePercent =
    activeTopics.length > 0
      ? Math.round((completed / activeTopics.length) * 100)
      : 0;

  return {
    totalTopics: activeTopics.length,
    completedTopics: completed,
    donePercent,
  };
}

/**
 * Generates an ASCII URL-friendly slug from a title or category name.
 */
export function generateCategorySlug(name: string): string {
  if (!name) return `cat-${Date.now()}`;
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `cat-${Date.now()}`;
}

export interface MergeCategoriesResult {
  success: boolean;
  sourceCategoryId: string;
  targetCategoryId: string;
  remappedTopicCount: number;
  remappedChildCategoryCount: number;
  updatedCategories: Category[];
  updatedTopics: Topic[];
  error?: string;
}

/**
 * Safely merges a source category into a target category without data loss.
 * - Remaps all child categories (parentId = targetCategoryId)
 * - Remaps direct topics (categoryId = targetCategoryId)
 * - Updates topic type to match target category type/slug
 * - Removes sourceCategory from categories array
 * - Preserves notes and resources (via invariant topicId)
 */
export function mergeCategoryData(
  categories: Category[],
  topics: Topic[],
  sourceCategoryId: string,
  targetCategoryId: string
): MergeCategoriesResult {
  const defaultFailure = (error: string): MergeCategoriesResult => ({
    success: false,
    sourceCategoryId,
    targetCategoryId,
    remappedTopicCount: 0,
    remappedChildCategoryCount: 0,
    updatedCategories: categories,
    updatedTopics: topics,
    error,
  });

  if (!sourceCategoryId || !targetCategoryId) {
    return defaultFailure('INVALID_CATEGORY_IDS');
  }

  if (sourceCategoryId === targetCategoryId) {
    return defaultFailure('SOURCE_AND_TARGET_IDENTICAL: Cannot merge a category into itself');
  }

  const sourceCat = categories.find((c) => c.id === sourceCategoryId);
  if (!sourceCat) {
    return defaultFailure(`SOURCE_NOT_FOUND: Source category "${sourceCategoryId}" does not exist`);
  }

  const targetCat = categories.find((c) => c.id === targetCategoryId);
  if (!targetCat) {
    return defaultFailure(`TARGET_NOT_FOUND: Target category "${targetCategoryId}" does not exist`);
  }

  // Guard against circular descendant merge
  const sourceDescendants = getDescendantCategoryIds(categories, sourceCategoryId);
  if (sourceDescendants.includes(targetCategoryId)) {
    return defaultFailure('CIRCULAR_MERGE: Cannot merge a parent category into its descendant');
  }

  const targetType = targetCat.type || targetCat.slug || 'general';

  // 1. Remap child categories of sourceCategory
  let remappedChildCategoryCount = 0;
  const updatedCategories: Category[] = categories
    .filter((c) => c.id !== sourceCategoryId)
    .map((c) => {
      if (c.parentId === sourceCategoryId) {
        remappedChildCategoryCount++;
        return {
          ...c,
          parentId: targetCategoryId,
          type: targetType,
        };
      }
      return c;
    });

  // 2. Remap topics belonging to sourceCategory or its branches
  let remappedTopicCount = 0;
  const updatedTopics: Topic[] = topics.map((t) => {
    // If topic is directly under sourceCategory
    if (t.categoryId === sourceCategoryId) {
      remappedTopicCount++;
      return {
        ...t,
        categoryId: targetCategoryId,
        type: targetType as any,
        updatedAt: new Date().toISOString(),
      };
    }

    // If topic is under a descendant of sourceCategory, align domain type if it was using source type
    if (sourceDescendants.includes(t.categoryId)) {
      const isSourceType = t.type === sourceCat.type || t.type === sourceCat.slug;
      if (isSourceType && t.type !== targetType) {
        return {
          ...t,
          type: targetType as any,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return t;
  });

  return {
    success: true,
    sourceCategoryId,
    targetCategoryId,
    remappedTopicCount,
    remappedChildCategoryCount,
    updatedCategories,
    updatedTopics,
  };
}
