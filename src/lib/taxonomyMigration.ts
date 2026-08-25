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
 * Automatically backfills root category nodes if migrating from legacy datasets.
 */
export function normalizeCategories(categories: Category[]): Category[] {
  if (!Array.isArray(categories) || categories.length === 0) return [];

  const list = [...categories];

  // Check if legacy roots need backfilling
  const hasRootPhatHoc = list.some((c) => c.id === 'cat-root-phat-hoc' || (c.slug === 'phat-hoc' && !c.parentId));
  const hasRootHuyenHoc = list.some((c) => c.id === 'cat-root-huyen-hoc' || (c.slug === 'huyen-hoc' && !c.parentId));

  if (!hasRootPhatHoc && list.some((c) => c.type === 'phat-hoc')) {
    list.unshift({
      id: 'cat-root-phat-hoc',
      name: 'Phật Học',
      slug: 'phat-hoc',
      type: 'phat-hoc',
      parentId: null,
      description: 'Tam Tạng Pāli, Vi Diệu Pháp, Thiền Định và Triết học Phật giáo Đại thừa.',
      icon: 'Sparkles',
      color: '#D97706',
    });
  }

  if (!hasRootHuyenHoc && list.some((c) => c.type === 'huyen-hoc')) {
    const insertIdx = list.findIndex((c) => c.id === 'cat-root-phat-hoc') + 1;
    list.splice(insertIdx, 0, {
      id: 'cat-root-huyen-hoc',
      name: 'Huyền Học',
      slug: 'huyen-hoc',
      type: 'huyen-hoc',
      parentId: null,
      description: 'Cổ học phương Đông: Tam Thức (Kỳ Môn - Thái Ất - Lục Nhâm), Kinh Dịch, Phong Thủy và Mệnh Lý.',
      icon: 'Compass',
      color: '#2563EB',
    });
  }

  // Ensure unparented legacy categories link to their respective root category
  return list.map((c) => {
    let parentId = c.parentId !== undefined ? c.parentId : null;
    if (!parentId && c.id !== 'cat-root-phat-hoc' && c.id !== 'cat-root-huyen-hoc') {
      if (c.type === 'phat-hoc' || c.id === 'cat-tam-tang' || c.id === 'cat-thien-dinh' || c.id === 'cat-triet-hoc-phat-giao') {
        parentId = 'cat-root-phat-hoc';
      } else if (c.type === 'huyen-hoc' || c.id === 'cat-tam-thuc' || c.id === 'cat-dich-hoc' || c.id === 'cat-phong-thuy' || c.id === 'cat-tu-vi-tu-tru' || c.id === 'cat-menh-ly') {
        parentId = 'cat-root-huyen-hoc';
      }
    }
    return {
      ...c,
      parentId,
    };
  });
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
