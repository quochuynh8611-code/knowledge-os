import { describe, it, expect } from 'vitest';
import {
  generateExcerptCitationSnapshot,
  formatExcerptBlockquote,
} from '../../src/lib/excerptCitationService';

describe('Phase 18A Wave 3: Excerpt Citation Snapshot Service', () => {
  const fullMetadata = {
    documentId: 'doc-full-1',
    title: 'Khai phá Dữ liệu Lớn trong Nghiên cứu Y học',
    author: 'Nguyễn Văn A',
    year: '2024',
    sourceUrl: 'https://example.com/research/bigdata-medical',
    format: 'pdf',
  };

  it('generates full APA, MLA, Chicago, and Markdown citation formats from complete metadata', () => {
    const locator = { page: 45, paragraph: 2 };
    const snapshot = generateExcerptCitationSnapshot(fullMetadata, locator);

    expect(snapshot.apa).toContain('Nguyễn Văn A');
    expect(snapshot.apa).toContain('(2024)');
    expect(snapshot.apa).toContain('Khai phá Dữ liệu Lớn trong Nghiên cứu Y học');
    expect(snapshot.apa).toContain('tr. 45');

    expect(snapshot.mla).toContain('Nguyễn Văn A');
    expect(snapshot.mla).toContain('p. 45');

    expect(snapshot.chicago).toContain('Nguyễn Văn A');
    expect(snapshot.chicago).toContain('45');

    expect(snapshot.formatted).toContain('Nguyễn Văn A');
    expect(snapshot.formatted).toContain('https://example.com/research/bigdata-medical');
  });

  it('handles partial metadata with missing author and year gracefully', () => {
    const partialMetadata = {
      documentId: 'doc-partial-1',
      title: 'Báo cáo Tổng kết Thống kê',
      format: 'epub',
    };
    const locator = { heading: '1-1-phuong-phap' };
    const snapshot = generateExcerptCitationSnapshot(partialMetadata, locator);

    expect(snapshot.apa).toContain('Báo cáo Tổng kết Thống kê');
    expect(snapshot.apa).toContain('(n.d.)');
    expect(snapshot.apa).toContain('§ 1-1-phuong-phap');
    expect(snapshot.mla).toContain('Báo cáo Tổng kết Thống kê');
  });

  it('does not throw when metadata or locator is empty or null', () => {
    expect(() => generateExcerptCitationSnapshot(null as any, null as any)).not.toThrow();
    const fallback = generateExcerptCitationSnapshot({}, {});

    expect(fallback.apa).toBeDefined();
    expect(fallback.formatted).toBeDefined();
  });

  it('formats markdown blockquote with citation reference correctly', () => {
    const selectedText = 'Trí tuệ nhân tạo đang thay đổi cách chúng ta tiếp cận dữ liệu.';
    const locator = { page: 12 };
    const formatted = formatExcerptBlockquote(selectedText, fullMetadata, locator);

    expect(formatted).toContain('> Trí tuệ nhân tạo đang thay đổi cách chúng ta tiếp cận dữ liệu.');
    expect(formatted).toContain('— *Khai phá Dữ liệu Lớn trong Nghiên cứu Y học*');
    expect(formatted).toContain('Nguyễn Văn A');
    expect(formatted).toContain('tr. 12');
  });
});
