import { describe, it, expect } from 'vitest';
import {
  generateAPACitation,
  generateBibTeXCitation,
  generateMarkdownFootnote,
  generateAllCitations,
} from '../../src/lib/citationGenerator';
import { Resource } from '../../src/types';

describe('Scholar Citation Generator Pure Library', () => {
  const sampleBookResource: Resource = {
    id: 'res-1',
    topicId: 'topic-1',
    topicTitle: 'Vi Diệu Pháp (Abhidharma)',
    title: 'Câu Xá Luận (Abhidharmakośabhāṣya)',
    author: 'Vasubandhu',
    type: 'book',
    url: 'https://example.com/abhidharma-kosa.pdf',
    notes: 'Bản dịch Thích Nữ Như Điển, xuất bản năm 2024.',
    createdAt: '2024-03-15T08:00:00Z',
  };

  const sampleMissingMetaResource: Resource = {
    id: 'res-2',
    topicId: 'topic-2',
    topicTitle: 'A Hàm & Nikāya',
    title: 'Kinh Trung Bộ (Majjhima Nikāya)',
    type: 'pdf',
    filePath: '02_Resources/kinh-trung-bo.pdf',
    createdAt: '2026-01-01T00:00:00Z',
  };

  const sampleVideoResource: Resource = {
    id: 'res-3',
    topicId: 'topic-3',
    topicTitle: 'Thiền Quán',
    title: 'Bài Giảng Thiền Tứ Niệm Xứ',
    author: 'Thiền sư Sayadaw U Tejaniya',
    type: 'video',
    url: 'https://youtube.com/watch?v=example',
    createdAt: '2023-05-10T00:00:00Z',
  };

  // ---------------------------------------------------------------------------
  // APA 7th Tests
  // ---------------------------------------------------------------------------
  describe('generateAPACitation', () => {
    it('1. Tạo trích dẫn APA 7th đầy đủ với tác giả, năm và URL', () => {
      const citation = generateAPACitation(sampleBookResource);
      expect(citation).toContain('Vasubandhu');
      expect(citation).toContain('(2024)');
      expect(citation).toContain('Câu Xá Luận (Abhidharmakośabhāṣya)');
      expect(citation).toContain('[Sách/Luận tạng]');
      expect(citation).toContain('https://example.com/abhidharma-kosa.pdf');
    });

    it('2. Fallback APA 7th khi khuyết tác giả (tiêu đề đứng đầu) và khuyết năm (n.d.)', () => {
      const citation = generateAPACitation(sampleMissingMetaResource);
      expect(citation.startsWith('Kinh Trung Bộ (Majjhima Nikāya)')).toBe(true);
      expect(citation).toContain('(n.d.)');
      expect(citation).toContain('[Tài liệu PDF]');
      expect(citation).toContain('Tệp cục bộ: 02_Resources/kinh-trung-bo.pdf');
    });

    it('3. Định dạng đúng cho tài liệu dạng Video bài giảng', () => {
      const citation = generateAPACitation(sampleVideoResource);
      expect(citation).toContain('Thiền sư Sayadaw U Tejaniya');
      expect(citation).toContain('(2023)');
      expect(citation).toContain('[Video bài giảng]');
      expect(citation).toContain('https://youtube.com/watch?v=example');
    });
  });

  // ---------------------------------------------------------------------------
  // BibTeX Tests
  // ---------------------------------------------------------------------------
  describe('generateBibTeXCitation', () => {
    it('4. Sinh BibTeX @book với citation key tất định và đầy đủ các trường', () => {
      const bibtex = generateBibTeXCitation(sampleBookResource);
      expect(bibtex.startsWith('@book{')).toBe(true);
      expect(bibtex).toContain('vasubandhu_2024_cauxaluan');
      expect(bibtex).toContain('author = {Vasubandhu}');
      expect(bibtex).toContain('title = {Câu Xá Luận (Abhidharmakośabhāṣya)}');
      expect(bibtex).toContain('year = {2024}');
      expect(bibtex).toContain('howpublished = {https://example.com/abhidharma-kosa.pdf}');
    });

    it('5. Sinh BibTeX @misc cho tài liệu PDF thiếu tác giả và năm', () => {
      const bibtex = generateBibTeXCitation(sampleMissingMetaResource);
      expect(bibtex.startsWith('@misc{')).toBe(true);
      expect(bibtex).toContain('author = {[Khuyết danh]}');
      expect(bibtex).toContain('title = {Kinh Trung Bộ (Majjhima Nikāya)}');
      expect(bibtex).toContain('year = {n.d.}');
      expect(bibtex).toContain('howpublished = {Tệp cục bộ: 02_Resources/kinh-trung-bo.pdf}');
    });
  });

  // ---------------------------------------------------------------------------
  // Markdown Footnote Tests
  // ---------------------------------------------------------------------------
  describe('generateMarkdownFootnote', () => {
    it('6. Sinh Markdown Footnote mặc định [^1]', () => {
      const footnote = generateMarkdownFootnote(sampleBookResource);
      expect(footnote.startsWith('[^1]:')).toBe(true);
      expect(footnote).toContain('Vasubandhu (2024)');
      expect(footnote).toContain('*Câu Xá Luận (Abhidharmakośabhāṣya)*');
      expect(footnote).toContain('[Xem tài liệu](https://example.com/abhidharma-kosa.pdf)');
    });

    it('7. Hỗ trợ tùy biến chỉ số Footnote index [^3]', () => {
      const footnote = generateMarkdownFootnote(sampleMissingMetaResource, 3);
      expect(footnote.startsWith('[^3]:')).toBe(true);
      expect(footnote).toContain('*Kinh Trung Bộ (Majjhima Nikāya)* (n.d.)');
    });
  });

  // ---------------------------------------------------------------------------
  // Bundle Output Tests
  // ---------------------------------------------------------------------------
  describe('generateAllCitations', () => {
    it('8. Trả về đối tượng bundle gồm đầy đủ 3 định dạng APA, BibTeX và Markdown', () => {
      const bundle = generateAllCitations(sampleBookResource);
      expect(bundle).toHaveProperty('apa');
      expect(bundle).toHaveProperty('bibtex');
      expect(bundle).toHaveProperty('markdown');
      expect(bundle.apa.length).toBeGreaterThan(10);
      expect(bundle.bibtex.length).toBeGreaterThan(10);
      expect(bundle.markdown.length).toBeGreaterThan(10);
    });
  });
});
