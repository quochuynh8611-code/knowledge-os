import { describe, it, expect } from 'vitest';
import {
  formatLocatorLabel,
  generateExcerptCitationSnapshot,
  formatExcerptBlockquote,
} from '../../src/lib/excerptCitationService';

describe('Phase R2: Excerpt Citation & Provenance Normalization', () => {
  describe('1. formatLocatorLabel', () => {
    it('1.1. formats page numbers with "tr." prefix', () => {
      expect(formatLocatorLabel({ page: 42 })).toBe('tr. 42');
    });

    it('1.2. formats headings with "§" symbol', () => {
      expect(formatLocatorLabel({ heading: 'chuong-2-sac-phap' })).toBe('§ chuong-2-sac-phap');
    });

    it('1.3. formats EPUB CFI with "cfi:" prefix', () => {
      expect(formatLocatorLabel({ cfi: '/6/4[chap01]!/4/2/10' })).toBe('cfi: /6/4[chap01]!/4/2/10');
    });

    it('1.4. formats composite locators with comma separation', () => {
      expect(formatLocatorLabel({ page: 12, heading: 'muc-1' })).toBe('tr. 12, § muc-1');
    });

    it('1.5. returns empty string for empty or undefined locator', () => {
      expect(formatLocatorLabel()).toBe('');
      expect(formatLocatorLabel({})).toBe('');
    });
  });

  describe('2. formatExcerptBlockquote', () => {
    it('2.1. embeds normalized archive URI when documentId is provided without sourceUrl', () => {
      const output = formatExcerptBlockquote(
        'Tâm sở là những trạng thái đồng sinh với tâm.',
        {
          documentId: 'doc-vi-dieu-phap',
          title: 'Vi Diệu Pháp',
          author: 'Trưởng Lão',
        },
        { page: 24, heading: 'chuong-1' }
      );

      expect(output).toContain('> Tâm sở là những trạng thái đồng sinh với tâm.');
      expect(output).toContain('— *Vi Diệu Pháp*');
      expect(output).toContain('Trưởng Lão');
      expect(output).toContain('tr. 24, § chuong-1');
      expect(output).toContain('[Xem tài liệu](archive://doc-vi-dieu-phap)');
    });

    it('2.2. prioritizes explicit sourceUrl if provided', () => {
      const output = formatExcerptBlockquote(
        'Sắc pháp vô thường.',
        {
          documentId: 'doc-vi-dieu-phap',
          title: 'Vi Diệu Pháp',
          sourceUrl: 'https://archive.org/details/vi-dieu-phap',
        },
        { page: 99 }
      );

      expect(output).toContain('[Xem tài liệu](https://archive.org/details/vi-dieu-phap)');
    });

    it('2.3. formats multiline excerpts with standard markdown blockquote prefix on each line', () => {
      const multiline = 'Dòng 1: Tâm vương.\nDòng 2: Tâm sở.';
      const output = formatExcerptBlockquote(multiline, {
        documentId: 'doc-1',
        title: 'Tài liệu A',
      });

      expect(output).toContain('> Dòng 1: Tâm vương.\n> Dòng 2: Tâm sở.');
    });
  });

  describe('3. generateExcerptCitationSnapshot', () => {
    it('3.1. generates deterministic APA citation with locator and author', () => {
      const snapshot = generateExcerptCitationSnapshot(
        {
          documentId: 'doc-1',
          title: 'Triết Học Cổ Điển',
          author: 'Nguyễn Văn A',
          year: '2024',
        },
        { page: 15 }
      );

      expect(snapshot.title).toBe('Triết Học Cổ Điển');
      expect(snapshot.author).toBe('Nguyễn Văn A');
      expect(snapshot.locator).toBe('tr. 15');
      expect(snapshot.apa).toBe('Nguyễn Văn A (2024). *Triết Học Cổ Điển*, tr. 15.');
    });

    it('3.2. generates MLA and Chicago formats with consistent locator labels', () => {
      const snapshot = generateExcerptCitationSnapshot(
        {
          documentId: 'doc-2',
          title: 'Lịch Sử Triết Học',
          author: 'Trần B',
          year: '2020',
        },
        { heading: 'chuong-3' }
      );

      expect(snapshot.locator).toBe('§ chuong-3');
      expect(snapshot.mla).toContain('Trần B. "Lịch Sử Triết Học." 2020, § chuong-3.');
      expect(snapshot.chicago).toContain('Trần B, *Lịch Sử Triết Học* (2020), § chuong-3.');
    });
  });

  describe('4. Provenance Normalization & Backlink Payload Contract', () => {
    it('4.1. verifies normalized archive URI payload follows expected backlink pattern', () => {
      const blockquote = formatExcerptBlockquote(
        'Nhận thức luận là cơ sở của khoa học.',
        { documentId: 'doc-epistemology', title: 'Epistemology' },
        { heading: 'section-truth', page: 88 }
      );

      // Verify human-readable locator and archive URI marker
      const archiveMatch = blockquote.match(/\[Xem tài liệu\]\((archive:\/\/[^)]+)\)/);
      expect(archiveMatch).toBeTruthy();
      expect(archiveMatch?.[1]).toBe('archive://doc-epistemology');

      expect(blockquote).toContain('tr. 88, § section-truth');
    });
  });
});
