import { describe, it, expect } from 'vitest';
import { HeadingSlugger } from '../../src/lib/headingSlugger';

describe('HeadingSlugger: Deterministic Heading Disambiguation', () => {
  it('slugify static helper cleans markdown links, wiki links, diacritics, and symbols', () => {
    expect(HeadingSlugger.slugify('Tổng Quan')).toBe('tong-quan');
    expect(HeadingSlugger.slugify('Mục 1.1 Khái Niệm')).toBe('muc-1-1-khai-niem');
    expect(HeadingSlugger.slugify('[[Bat-Chanh-Dao|Bát Chánh Đạo]]')).toBe('bat-chanh-dao');
    expect(HeadingSlugger.slugify('[Tài Liệu](https://example.com)')).toBe('tai-lieu');
    expect(HeadingSlugger.slugify('**Tâm Sở** và *Tâm Vương*')).toBe('tam-so-va-tam-vuong');
    expect(HeadingSlugger.slugify('`CodeBlock` & Specifics')).toBe('codeblock-specifics');
    expect(HeadingSlugger.slugify('')).toBe('heading');
    expect(HeadingSlugger.slugify('   ')).toBe('heading');
    expect(HeadingSlugger.slugify('!!!???')).toBe('heading');
  });

  it('slug method generates sequential disambiguated IDs for duplicate headings', () => {
    const slugger = new HeadingSlugger();

    // First instance: base slug
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu');
    // Second instance: base-1
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu-1');
    // Third instance: base-2
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu-2');

    // Different heading gets its own base
    expect(slugger.slug('Phương pháp')).toBe('phuong-phap');
    // Duplicate of different heading
    expect(slugger.slug('Phương pháp')).toBe('phuong-phap-1');

    // Case insensitivity & formatting equivalence check
    expect(slugger.slug('GHI CHÚ')).toBe('ghi-chu-3');
    expect(slugger.slug('**Ghi chú**')).toBe('ghi-chu-4');
  });

  it('reset method clears occurrences map', () => {
    const slugger = new HeadingSlugger();
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu');
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu-1');

    slugger.reset();

    expect(slugger.slug('Ghi chú')).toBe('ghi-chu');
    expect(slugger.slug('Ghi chú')).toBe('ghi-chu-1');
  });
});
