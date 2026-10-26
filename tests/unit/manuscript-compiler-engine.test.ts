import { describe, it, expect } from 'vitest';
import type { Resource } from '../../src/types';
import {
  buildCitekeyRegistry,
  extractCitationClusters,
  searchCitekeySuggestions,
  compileAcademicManuscript,
} from '../../src/lib/manuscriptCompiler';

const mockResourceVaswani: Resource = {
  id: 'res-vaswani',
  topicId: 'topic-nlp',
  topicTitle: 'NLP',
  title: 'Attention Is All You Need',
  author: 'Vaswani, Ashish',
  year: '2017',
  type: 'article',
  url: 'https://arxiv.org/abs/1706.03762',
  journal: 'NeurIPS',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockResourceYe: Resource = {
  id: 'res-ye',
  topicId: 'topic-nlp',
  topicTitle: 'NLP',
  title: 'Transformers are Not Inherently Superior for Short Sequences',
  author: 'Ye, Zixuan',
  year: '2024',
  type: 'article',
  journal: 'ACL',
  createdAt: '2024-02-01T00:00:00Z',
};

const mockResourceNguyen: Resource = {
  id: 'res-nguyen',
  topicId: 'topic-nlp',
  topicTitle: 'NLP',
  title: 'Phân tích cảm xúc tiếng Việt với mô hình ngôn ngữ lớn',
  author: 'Nguyễn Văn A',
  year: '2023',
  type: 'article',
  journal: 'Tạp chí Khoa học & Công nghệ',
  createdAt: '2024-03-01T00:00:00Z',
};

const mockResourceSmith1: Resource = {
  id: 'res-smith-1',
  topicId: 'topic-cs',
  topicTitle: 'CS',
  title: 'Memory Consolidation Models in Cognitive Architectures',
  author: 'Smith, John',
  year: '2023',
  type: 'article',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockResourceSmith2: Resource = {
  id: 'res-smith-2',
  topicId: 'topic-cs',
  topicTitle: 'CS',
  title: 'Optimal Review Intervals for Spaced Repetition',
  author: 'Smith, John',
  year: '2023',
  type: 'article',
  createdAt: '2024-01-02T00:00:00Z',
};

describe('Phase 9A: Academic Manuscript Compiler & Live Citekey ([@key]) Engine', () => {
  // ---------------------------------------------------------------------------
  // 1. Citekey Registry & Collision Disambiguation
  // ---------------------------------------------------------------------------
  it('1. buildCitekeyRegistry ánh xạ tài nguyên sang citekey tất định và giải quyết xung đột cùng tác giả cùng năm', () => {
    const registry = buildCitekeyRegistry([
      mockResourceVaswani,
      mockResourceYe,
      mockResourceNguyen,
      mockResourceSmith1,
      mockResourceSmith2,
    ]);

    expect(registry.has('vaswani2017')).toBe(true);
    expect(registry.get('vaswani2017')?.authorLastName).toBe('Vaswani');
    expect(registry.get('vaswani2017')?.year).toBe('2017');

    expect(registry.has('ye2024')).toBe(true);
    expect(registry.get('ye2024')?.authorLastName).toBe('Ye');

    expect(registry.has('nguyen2023')).toBe(true);
    expect(registry.get('nguyen2023')?.authorLastName).toBe('Nguyễn');

    // Smith collision disambiguation: first gets smith2023, second gets smith2023b
    expect(registry.has('smith2023')).toBe(true);
    expect(registry.get('smith2023')?.resource.id).toBe('res-smith-1');

    expect(registry.has('smith2023b')).toBe(true);
    expect(registry.get('smith2023b')?.resource.id).toBe('res-smith-2');
  });

  // ---------------------------------------------------------------------------
  // 2. Inline Citation Cluster Parsing
  // ---------------------------------------------------------------------------
  it('2. extractCitationClusters phân tích chính xác trích dẫn đơn, định vị trang, đa trích dẫn và loại trừ Markdown links/footnotes', () => {
    const text = `
Theo nghiên cứu tiên phong [@vaswani2017], kiến trúc Attention đã thay đổi NLP.
Chi tiết xem tại [@vaswani2017, p. 42] và bản dịch tiếng Việt [@nguyen2023, tr. 18].
Các nghiên cứu đối chiếu [@vaswani2017, p. 4; @ye2024] khẳng định điều này.

Liên kết thông thường [Google Scholar](https://scholar.google.com) không phải trích dẫn.
Cước chú học thuật [^1] và thẻ RAG [^SRC-1] cũng không bị nhầm lẫn.
    `.trim();

    const clusters = extractCitationClusters(text);

    expect(clusters.length).toBe(4);

    // Cluster 1: [@vaswani2017]
    expect(clusters[0].items.length).toBe(1);
    expect(clusters[0].items[0].citekey).toBe('vaswani2017');
    expect(clusters[0].items[0].locator).toBeUndefined();

    // Cluster 2: [@vaswani2017, p. 42]
    expect(clusters[1].items.length).toBe(1);
    expect(clusters[1].items[0].citekey).toBe('vaswani2017');
    expect(clusters[1].items[0].locator).toBe('p. 42');

    // Cluster 3: [@nguyen2023, tr. 18]
    expect(clusters[2].items.length).toBe(1);
    expect(clusters[2].items[0].citekey).toBe('nguyen2023');
    expect(clusters[2].items[0].locator).toBe('tr. 18');

    // Cluster 4: [@vaswani2017, p. 4; @ye2024]
    expect(clusters[3].items.length).toBe(2);
    expect(clusters[3].items[0].citekey).toBe('vaswani2017');
    expect(clusters[3].items[0].locator).toBe('p. 4');
    expect(clusters[3].items[1].citekey).toBe('ye2024');
    expect(clusters[3].items[1].locator).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 3. APA 7 Author-Year Compilation
  // ---------------------------------------------------------------------------
  it('3. compileAcademicManuscript với chuẩn APA 7 thay thế [@key, p. 4] thành (Author, Year, p. 4) và sinh Bibliography sắp xếp ABC', () => {
    const input = {
      title: 'Khảo Sát Kiến Trúc Transformer',
      author: 'Nguyễn Văn Nghiên Cứu',
      abstract: 'Bài báo khảo sát các mô hình tự chú ý.',
      bodyMarkdown: 'Mô hình Transformer được giới thiệu lần đầu [@vaswani2017, p. 4]. Sau đó, các phân tích ngắn hạn [@ye2024] đã mở rộng phạm vi.',
      resources: [mockResourceVaswani, mockResourceYe, mockResourceNguyen],
      style: 'apa' as const,
    };

    const result = compileAcademicManuscript(input);

    // In-text citation replaced
    expect(result.compiledMarkdown).toContain('(Vaswani, 2017, p. 4)');
    expect(result.compiledMarkdown).toContain('(Ye, 2024)');
    expect(result.compiledMarkdown).not.toContain('[@vaswani2017');

    // Bibliography section appended
    expect(result.compiledMarkdown).toContain('## Tài Liệu Tham Khảo (References)');
    expect(result.bibliographyMarkdown).toContain('Vaswani, Ashish');
    expect(result.bibliographyMarkdown).toContain('Ye, Zixuan');

    // Nguyễn was not cited, so must not appear in bibliography by default
    expect(result.bibliographyMarkdown).not.toContain('Nguyễn Văn A');
    expect(result.citedResources.length).toBe(2);
    expect(result.citationCount).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 4. IEEE Sequential Numeric Compilation
  // ---------------------------------------------------------------------------
  it('4. compileAcademicManuscript với chuẩn IEEE đánh số tuần tự [1, p. 4], tái sử dụng [1] và sinh danh mục theo chỉ số', () => {
    const input = {
      title: 'Kiến Trúc Mạng Nơ-ron Hiện Đại',
      bodyMarkdown: 'Khởi đầu với [@vaswani2017, p. 4], tiếp theo là [@ye2024]. Nhắc lại lần nữa kiến trúc của [@vaswani2017].',
      resources: [mockResourceVaswani, mockResourceYe],
      style: 'ieee' as const,
    };

    const result = compileAcademicManuscript(input);

    // In-text numeric citations
    expect(result.compiledMarkdown).toContain('[1, p. 4]');
    expect(result.compiledMarkdown).toContain('[2]');
    // Re-citing Vaswani uses [1] again
    expect(result.compiledMarkdown).toMatch(/Nhắc lại lần nữa kiến trúc của \[1\]/);

    // IEEE Bibliography
    expect(result.bibliographyMarkdown).toContain('[1]');
    expect(result.bibliographyMarkdown).toContain('[2]');
    expect(result.citedResources[0].id).toBe('res-vaswani');
    expect(result.citedResources[1].id).toBe('res-ye');
  });

  // ---------------------------------------------------------------------------
  // 5. Unresolved Citekey Detection & Safe Placeholder
  // ---------------------------------------------------------------------------
  it('5. Phát hiện citekey không tồn tại và thay bằng placeholder an toàn kèm báo cáo unresolvedCitekeys', () => {
    const input = {
      title: 'Bài Viết Thử Nghiệm',
      bodyMarkdown: 'Tham khảo bài báo [@nonexistent2099] và [@vaswani2017].',
      resources: [mockResourceVaswani],
      style: 'apa' as const,
    };

    const result = compileAcademicManuscript(input);

    expect(result.unresolvedCitekeys).toContain('nonexistent2099');
    expect(result.compiledMarkdown).toContain('[@nonexistent2099?]');
    expect(result.compiledMarkdown).toContain('(Vaswani, 2017)');
  });

  // ---------------------------------------------------------------------------
  // 6. Multi-Note Section Assembly & Math/Chem Preservation
  // ---------------------------------------------------------------------------
  it('6. Ghép nhiều section ghi chú thành bản thảo có cấu trúc và bảo toàn công thức toán KaTeX & hóa học mhchem', () => {
    const sections = [
      {
        id: 'sec-1',
        title: 'Giới Thiệu & Cơ Sở Toán Học',
        content: 'Năng lượng chuẩn tính theo công thức $E = mc^2$. Cơ chế Self-Attention [@vaswani2017].',
      },
      {
        id: 'sec-2',
        title: 'Ứng Dụng Hóa Học Tính Toán',
        content: 'Phản ứng tạo nước $\\ce{2H2 + O2 -> 2H2O}$. Đối chiếu kết quả với [@ye2024].',
      },
    ];

    const input = {
      title: 'Mô Hình Hóa Toán Học & Hóa Học',
      author: 'TS. Nguyễn Văn B',
      sections,
      resources: [mockResourceVaswani, mockResourceYe],
      style: 'apa' as const,
    };

    const result = compileAcademicManuscript(input);

    expect(result.compiledMarkdown).toContain('## 1. Giới Thiệu & Cơ Sở Toán Học');
    expect(result.compiledMarkdown).toContain('## 2. Ứng Dụng Hóa Học Tính Toán');
    expect(result.compiledMarkdown).toContain('$E = mc^2$');
    expect(result.compiledMarkdown).toContain('$\\ce{2H2 + O2 -> 2H2O}$');
    expect(result.wordCount).toBeGreaterThan(10);
  });

  // ---------------------------------------------------------------------------
  // 7. LaTeX (.tex) & BibTeX (.bib) Export Generation
  // ---------------------------------------------------------------------------
  it('7. Sinh mã nguồn LaTeX (.tex) và BibTeX (.bib) với citekey đồng bộ tuyệt đối', () => {
    const input = {
      title: 'Nghiên Cứu Deep Learning',
      author: 'Lê Văn C',
      bodyMarkdown: 'Kiến trúc **Self-Attention** [@vaswani2017, p. 4] rất hiệu quả trong *NLP*.',
      resources: [mockResourceVaswani],
      style: 'apa' as const,
    };

    const result = compileAcademicManuscript(input);

    // LaTeX document checks
    expect(result.latexSource).toContain('\\documentclass');
    expect(result.latexSource).toContain('\\usepackage{amsmath}');
    expect(result.latexSource).toContain('\\cite[p. 4]{vaswani2017}');
    expect(result.latexSource).toContain('\\textbf{Self-Attention}');
    expect(result.latexSource).toContain('\\textit{NLP}');
    expect(result.latexSource).toContain('\\bibliography{references}');

    // BibTeX source checks
    expect(result.bibtexSource).toContain('@article{vaswani2017,');
    expect(result.bibtexSource).toContain('title = {Attention Is All You Need}');
    expect(result.bibtexSource).toContain('author = {Vaswani, Ashish}');
    expect(result.bibtexSource).toContain('year = {2017}');
  });

  // ---------------------------------------------------------------------------
  // 8. Autocomplete Citekey Suggestions Helper
  // ---------------------------------------------------------------------------
  it('8. searchCitekeySuggestions lọc gợi ý theo citekey, tiêu đề bài báo hoặc tác giả', () => {
    const registry = buildCitekeyRegistry([
      mockResourceVaswani,
      mockResourceYe,
      mockResourceNguyen,
    ]);

    // Query by citekey
    const res1 = searchCitekeySuggestions(registry, 'vas');
    expect(res1.length).toBe(1);
    expect(res1[0].citekey).toBe('vaswani2017');

    // Query by title word
    const res2 = searchCitekeySuggestions(registry, 'Short Sequences');
    expect(res2.length).toBe(1);
    expect(res2[0].citekey).toBe('ye2024');

    // Query by author name
    const res3 = searchCitekeySuggestions(registry, 'Nguyễn');
    expect(res3.length).toBe(1);
    expect(res3[0].citekey).toBe('nguyen2023');
  });
});
