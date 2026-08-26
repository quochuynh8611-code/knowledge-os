import { describe, it, expect } from 'vitest';
import {
  normalizeCategories,
  getRootCategories,
  getChildCategories,
  resolveRootCategory,
} from '../../src/lib/taxonomyMigration';
import { Category, CategoryType } from '../../src/types';

describe('Increment A: Dynamic Domain Generalization — Type Contract & Taxonomy Migration', () => {
  it('1. normalizeCategories() does NOT inject "cat-root-phat-hoc" when input has other categories with type="phat-hoc"', () => {
    const inputCategories: Category[] = [
      { id: 'cat-custom-1', name: 'Chuyên Đề 1', slug: 'chuyen-de-1', type: 'phat-hoc', parentId: null },
    ];

    const normalized = normalizeCategories(inputCategories);
    expect(normalized.some((c) => c.id === 'cat-root-phat-hoc')).toBe(false);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe('cat-custom-1');
  });

  it('2. normalizeCategories() does NOT inject "cat-root-huyen-hoc" when input has other categories with type="huyen-hoc"', () => {
    const inputCategories: Category[] = [
      { id: 'cat-custom-2', name: 'Chuyên Đề 2', slug: 'chuyen-de-2', type: 'huyen-hoc', parentId: null },
    ];

    const normalized = normalizeCategories(inputCategories);
    expect(normalized.some((c) => c.id === 'cat-root-huyen-hoc')).toBe(false);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].id).toBe('cat-custom-2');
  });

  it('3. normalizeCategories() with input containing dynamic root domain "kinh-te" preserves it without modification', () => {
    const inputCategories: Category[] = [
      { id: 'cat-root-kinh-te', name: 'Kinh Tế Học', slug: 'kinh-te', type: 'kinh-te', parentId: null },
      { id: 'cat-vi-mo', name: 'Kinh Tế Vĩ Mô', slug: 'kinh-te-vi-mo', type: 'kinh-te', parentId: 'cat-root-kinh-te' },
    ];

    const normalized = normalizeCategories(inputCategories);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].id).toBe('cat-root-kinh-te');
    expect(normalized[0].slug).toBe('kinh-te');
    expect(normalized[1].parentId).toBe('cat-root-kinh-te');
  });

  it('4. normalizeCategories() does NOT hardcode parentId backfilling to cat-root-phat-hoc or cat-root-huyen-hoc', () => {
    const inputCategories: Category[] = [
      { id: 'cat-triet-hoc-tay-phuong', name: 'Triết Học Tây Phương', slug: 'triet-hoc-tay-phuong', type: 'triet-hoc', parentId: null },
      { id: 'cat-tam-tang', name: 'Tam Tạng Pāli', slug: 'tam-tang', type: 'phat-hoc', parentId: null },
    ];

    const normalized = normalizeCategories(inputCategories);
    // cat-tam-tang should NOT be forced to parentId='cat-root-phat-hoc' if cat-root-phat-hoc does not exist
    expect(normalized.find((c) => c.id === 'cat-tam-tang')?.parentId).toBeNull();
    expect(normalized.find((c) => c.id === 'cat-triet-hoc-tay-phuong')?.parentId).toBeNull();
  });

  it('5. CategoryType accepts any dynamic string (e.g. "triet-hoc", "kinh-te", "khoa-hoc")', () => {
    const sampleType1: CategoryType = 'triet-hoc';
    const sampleType2: CategoryType = 'kinh-te';
    const sampleType3: CategoryType = 'khoa-hoc-tu-nhien';

    expect(sampleType1).toBe('triet-hoc');
    expect(sampleType2).toBe('kinh-te');
    expect(sampleType3).toBe('khoa-hoc-tu-nhien');
  });

  it('6. getRootCategories() correctly derives root categories from dynamic inputs', () => {
    const inputCategories: Category[] = [
      { id: 'cat-root-1', name: 'Phật Học', slug: 'phat-hoc', parentId: null },
      { id: 'cat-root-2', name: 'Kinh Tế', slug: 'kinh-te', parentId: null },
      { id: 'cat-root-3', name: 'Triết Học', slug: 'triet-hoc' }, // undefined parentId
      { id: 'cat-child-1', name: 'Vi Diệu Pháp', slug: 'vi-dieu-phap', parentId: 'cat-root-1' },
      { id: 'cat-child-2', name: 'Kinh Tế Vi Mô', slug: 'kinh-te-vi-mo', parentId: 'cat-root-2' },
    ];

    const roots = getRootCategories(inputCategories);
    expect(roots).toHaveLength(3);
    expect(roots.map((r) => r.slug)).toEqual(['phat-hoc', 'kinh-te', 'triet-hoc']);
  });
});
