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

  // Ensure child categories with legacy types link to their respective root
  return list.map((c) => {
    let parentId = c.parentId !== undefined ? c.parentId : null;
    if (c.id === 'cat-tam-tang' || c.id === 'cat-thien-dinh' || c.id === 'cat-triet-hoc-phat-giao') {
      if (!parentId) parentId = 'cat-root-phat-hoc';
    } else if (c.id === 'cat-tam-thuc' || c.id === 'cat-dich-hoc' || c.id === 'cat-phong-thuy' || c.id === 'cat-menh-ly') {
      if (!parentId) parentId = 'cat-root-huyen-hoc';
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
 * Resolves the root category for any given category ID.
 */
export function resolveRootCategory(categories: Category[], categoryId: string): Category | null {
  if (!Array.isArray(categories) || !categoryId) return null;
  const current = categories.find((c) => c.id === categoryId);
  if (!current) return null;
  if (!current.parentId) return current;
  return resolveRootCategory(categories, current.parentId);
}

/**
 * Generates an ASCII URL-friendly slug from a title or category name.
 */
export function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
