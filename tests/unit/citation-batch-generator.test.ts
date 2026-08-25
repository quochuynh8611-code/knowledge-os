import { describe, it, expect } from 'vitest';
import {
  generateBatchCitations,
  getBatchCitationDownloadFilename,
} from '../../src/lib/citationGenerator';
import { Resource } from '../../src/types';

describe('Scholar Batch Citation Generator Pure Library', () => {
  const sampleResources: Resource[] = [
    {
      id: 'res-1',
      topicId: 'topic-1',
      topicTitle: 'Vi Diệu Pháp (Abhidharma)',
      title: 'Câu Xá Luận (Abhidharmakośabhāṣya)',
      author: 'Vasubandhu',
      type: 'book',
      url: 'https://example.com/cauxaluan.pdf',
      notes: 'Xuất bản năm 2024.',
      createdAt: '2024-03-15T08:00:00Z',
    },
    {
      id: 'res-2',
      topicId: 'topic-1',
      topicTitle: 'Vi Diệu Pháp (Abhidharma)',
      title: 'A Tì Đạt Ma Tập Luận',
      type: 'pdf',
      filePath: '02_Resources/tap-luan.pdf',
      createdAt: '2025-01-01T00:00:00Z',
    },
    {
      id: 'res-3',
      topicId: 'topic-1',
      topicTitle: 'Vi Diệu Pháp (Abhidharma)',
      title: 'Thắng Pháp Tập Yếu Luận',
      author: 'Anuruddha',
      type: 'book',
      url: 'https://example.com/sangaha.pdf',
      notes: 'Năm 2022.',
      createdAt: '2022-06-01T00:00:00Z',
    },
  ];

  // ---------------------------------------------------------------------------
  // Test 1: BibTeX Batch Concatenation
  // ---------------------------------------------------------------------------
  it('1. Sinh BibTeX batch nối đúng nhiều entries với định dạng hợp lệ', () => {
    const bibtexBatch = generateBatchCitations(sampleResources, 'bibtex');

    expect(bibtexBatch).toContain('@book{');
    expect(bibtexBatch).toContain('@misc{');
    expect(bibtexBatch).toContain('vasubandhu_2024_cauxaluan');
    expect(bibtexBatch).toContain('anuruddha_2022_thangphaptapyeuluan');
    expect(bibtexBatch).toContain('khuyetdanh_nd_atidatmatapluan');

    // Các entry được phân cách bằng \n\n
    const entries = bibtexBatch.split('\n\n');
    expect(entries.length).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // Test 2: APA Batch Alphabetical Sorting
  // ---------------------------------------------------------------------------
  it('2. Sinh APA batch tự động sắp xếp theo thứ tự bảng chữ cái ABC (Author fallback Title)', () => {
    const apaBatch = generateBatchCitations(sampleResources, 'apa');

    // Thứ tự mong đợi theo ABC:
    // 1. "A Tì Đạt Ma Tập Luận" (khuyết author -> dùng title bắt đầu bằng chữ A)
    // 2. "Anuruddha" (bắt đầu bằng chữ A)
    // 3. "Vasubandhu" (bắt đầu bằng chữ V)
    const items = apaBatch.split('\n\n');
    expect(items.length).toBe(3);

    expect(items[0]).toContain('A Tì Đạt Ma Tập Luận');
    expect(items[1]).toContain('Anuruddha');
    expect(items[2]).toContain('Vasubandhu');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Markdown Batch Sequential Footnotes
  // ---------------------------------------------------------------------------
  it('3. Sinh Markdown batch đánh số thứ tự liên tục từ [^1] đến [^N]', () => {
    const markdownBatch = generateBatchCitations(sampleResources, 'markdown');

    const lines = markdownBatch.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBe(3);
    expect(lines[0].startsWith('[^1]:')).toBe(true);
    expect(lines[1].startsWith('[^2]:')).toBe(true);
    expect(lines[2].startsWith('[^3]:')).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Empty Array Guardrail
  // ---------------------------------------------------------------------------
  it('4. Trả về chuỗi rỗng an toàn khi danh sách tài liệu đầu vào rỗng []', () => {
    expect(generateBatchCitations([], 'apa')).toBe('');
    expect(generateBatchCitations([], 'bibtex')).toBe('');
    expect(generateBatchCitations([], 'markdown')).toBe('');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Filename Mapping
  // ---------------------------------------------------------------------------
  it('5. Trả về đúng tên tệp tải về tương ứng với từng định dạng', () => {
    expect(getBatchCitationDownloadFilename('bibtex')).toBe('references.bib');
    expect(getBatchCitationDownloadFilename('apa')).toBe('references.txt');
    expect(getBatchCitationDownloadFilename('markdown')).toBe('references.md');
  });
});
