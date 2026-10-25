import { describe, it, expect, vi } from 'vitest';
import type { Resource } from '../../src/types';
import {
  generateAPACitation,
  generateMLACitation,
  generateChicagoCitation,
  generateIEEECitation,
  generateHarvardCitation,
  generateBibTeXCitation,
  generateRISCitation,
  generateMarkdownFootnote,
  generateAllCitations,
  generateBatchCitations,
  getBatchCitationDownloadFilename,
  embedAcademicMetadataInNotes,
  extractAcademicMetadataFromResource,
} from '../../src/lib/citationGenerator';
import {
  CitationFormat,
  isValidCitationFormat,
  getStoredCitationFormat,
  setStoredCitationFormat,
  resetStoredCitationFormat,
} from '../../src/lib/citationPreferences';
import {
  parseBibTeXReferences,
  parseRISReferences,
  parseCSLJsonReferences,
  parseUniversalReferences,
  deduplicateImportedResources,
} from '../../src/lib/referenceParser';
import { normalizeDoi, lookupDoiMetadata } from '../../src/lib/doiResolver';

describe('Phase 2A — Reference & Citation Hub Engine', () => {
  const sampleArticleResource: Resource = {
    id: 'res-art-1',
    topicId: 'topic-ai',
    title: 'Deep Learning for Knowledge Graphs: A Survey',
    author: 'Le, Minh and Nguyen, Anh',
    type: 'article',
    url: 'https://doi.org/10.1016/j.jair.2024.01.005',
    createdAt: '2024-03-15T08:00:00.000Z',
    // Academic fields
    year: '2024',
    journal: 'Journal of Artificial Intelligence Research',
    volume: '45',
    issue: '2',
    pages: '101-125',
    doi: '10.1016/j.jair.2024.01.005',
  };

  const sampleBookResource: Resource = {
    id: 'res-book-1',
    topicId: 'topic-cs',
    title: 'Designing Data-Intensive Applications',
    author: 'Kleppmann, Martin',
    type: 'book',
    publisher: "O'Reilly Media",
    createdAt: '2017-01-01T00:00:00.000Z',
    year: '2017',
    isbn: '978-1449373320',
  };

  describe('1. Multi-Style Citation Generator (8 International Formats)', () => {
    it('generates APA 7th edition citation correctly', () => {
      const citation = generateAPACitation(sampleArticleResource);
      expect(citation).toContain('Le, Minh and Nguyen, Anh');
      expect(citation).toContain('(2024)');
      expect(citation).toContain('Deep Learning for Knowledge Graphs: A Survey');
      expect(citation).toContain('Journal of Artificial Intelligence Research');
      expect(citation).toContain('45(2)');
      expect(citation).toContain('101-125');
      expect(citation).toContain('https://doi.org/10.1016/j.jair.2024.01.005');
    });

    it('generates MLA 9th edition citation correctly', () => {
      const citation = generateMLACitation(sampleArticleResource);
      expect(citation).toContain('Le, Minh and Nguyen, Anh');
      expect(citation).toContain('"Deep Learning for Knowledge Graphs: A Survey."');
      expect(citation).toContain('Journal of Artificial Intelligence Research');
      expect(citation).toContain('vol. 45');
      expect(citation).toContain('no. 2');
      expect(citation).toContain('2024');
      expect(citation).toContain('pp. 101-125');
      expect(citation).toContain('https://doi.org/10.1016/j.jair.2024.01.005');
    });

    it('generates Chicago 17th edition (Author-Date) citation correctly', () => {
      const citation = generateChicagoCitation(sampleArticleResource);
      expect(citation).toContain('Le, Minh and Nguyen, Anh. 2024.');
      expect(citation).toContain('"Deep Learning for Knowledge Graphs: A Survey."');
      expect(citation).toContain('Journal of Artificial Intelligence Research 45 (2): 101-125');
      expect(citation).toContain('https://doi.org/10.1016/j.jair.2024.01.005');
    });

    it('generates IEEE numbered citation correctly', () => {
      const citation = generateIEEECitation(sampleArticleResource, 1);
      expect(citation).toMatch(/^\[1\]/);
      expect(citation).toContain('"Deep Learning for Knowledge Graphs: A Survey,"');
      expect(citation).toContain('Journal of Artificial Intelligence Research');
      expect(citation).toContain('vol. 45, no. 2, pp. 101-125, 2024');
      expect(citation).toContain('doi: 10.1016/j.jair.2024.01.005');
    });

    it('generates Harvard citation correctly', () => {
      const citation = generateHarvardCitation(sampleArticleResource);
      expect(citation).toContain('Le, Minh and Nguyen, Anh (2024)');
      expect(citation).toContain("'Deep Learning for Knowledge Graphs: A Survey'");
      expect(citation).toContain('Journal of Artificial Intelligence Research, 45(2), pp. 101-125');
      expect(citation).toContain('Available at: https://doi.org/10.1016/j.jair.2024.01.005');
    });

    it('generates BibTeX citation with rich academic fields', () => {
      const bib = generateBibTeXCitation(sampleArticleResource);
      expect(bib).toMatch(/^@article\{/);
      expect(bib).toContain('title = {Deep Learning for Knowledge Graphs: A Survey}');
      expect(bib).toContain('journal = {Journal of Artificial Intelligence Research}');
      expect(bib).toContain('year = {2024}');
      expect(bib).toContain('volume = {45}');
      expect(bib).toContain('number = {2}');
      expect(bib).toContain('pages = {101-125}');
      expect(bib).toContain('doi = {10.1016/j.jair.2024.01.005}');
    });

    it('generates RIS reference format for export to Zotero/EndNote', () => {
      const ris = generateRISCitation(sampleArticleResource);
      expect(ris).toContain('TY  - JOUR');
      expect(ris).toContain('TI  - Deep Learning for Knowledge Graphs: A Survey');
      expect(ris).toContain('JO  - Journal of Artificial Intelligence Research');
      expect(ris).toContain('PY  - 2024');
      expect(ris).toContain('VL  - 45');
      expect(ris).toContain('IS  - 2');
      expect(ris).toContain('SP  - 101');
      expect(ris).toContain('EP  - 125');
      expect(ris).toContain('DO  - 10.1016/j.jair.2024.01.005');
      expect(ris).toContain('ER  - ');
    });

    it('generates book citation across styles with publisher & isbn', () => {
      const apa = generateAPACitation(sampleBookResource);
      expect(apa).toContain('Kleppmann, Martin');
      expect(apa).toContain("(2017)");
      expect(apa).toContain("O'Reilly Media");

      const bib = generateBibTeXCitation(sampleBookResource);
      expect(bib).toMatch(/^@book\{/);
      expect(bib).toContain("publisher = {O'Reilly Media}");
      expect(bib).toContain('isbn = {978-1449373320}');

      const ris = generateRISCitation(sampleBookResource);
      expect(ris).toContain('TY  - BOOK');
      expect(ris).toContain("PB  - O'Reilly Media");
      expect(ris).toContain('SN  - 978-1449373320');
    });

    it('generates All Citations bundle containing all 8 formats', () => {
      const bundle = generateAllCitations(sampleArticleResource);
      expect(bundle).toHaveProperty('apa');
      expect(bundle).toHaveProperty('mla');
      expect(bundle).toHaveProperty('chicago');
      expect(bundle).toHaveProperty('ieee');
      expect(bundle).toHaveProperty('harvard');
      expect(bundle).toHaveProperty('bibtex');
      expect(bundle).toHaveProperty('ris');
      expect(bundle).toHaveProperty('markdown');
    });

    it('supports batch export for all formats with correct download filenames', () => {
      const resources = [sampleArticleResource, sampleBookResource];
      const batchRis = generateBatchCitations(resources, 'ris');
      expect(batchRis).toContain('TY  - JOUR');
      expect(batchRis).toContain('TY  - BOOK');

      const batchIeee = generateBatchCitations(resources, 'ieee');
      expect(batchIeee).toContain('[1]');
      expect(batchIeee).toContain('[2]');

      expect(getBatchCitationDownloadFilename('bibtex')).toBe('references.bib');
      expect(getBatchCitationDownloadFilename('ris')).toBe('references.ris');
      expect(getBatchCitationDownloadFilename('apa')).toBe('references.txt');
      expect(getBatchCitationDownloadFilename('ieee')).toBe('references-ieee.txt');
    });
  });

  describe('2. Citation Preferences (8 Formats Support)', () => {
    it('validates all 8 formats in isValidCitationFormat', () => {
      const validFormats: CitationFormat[] = [
        'apa',
        'mla',
        'chicago',
        'ieee',
        'harvard',
        'bibtex',
        'ris',
        'markdown',
      ];
      validFormats.forEach((fmt) => {
        expect(isValidCitationFormat(fmt)).toBe(true);
      });
      expect(isValidCitationFormat('unknown-format')).toBe(false);
      expect(isValidCitationFormat(null)).toBe(false);
    });

    it('stores and retrieves format preference from localStorage safely', () => {
      setStoredCitationFormat('ieee');
      expect(getStoredCitationFormat()).toBe('ieee');

      setStoredCitationFormat('chicago');
      expect(getStoredCitationFormat()).toBe('chicago');

      resetStoredCitationFormat();
      expect(getStoredCitationFormat()).toBe('apa');
    });
  });

  describe('3. Universal Reference Parsers (BibTeX, RIS, Zotero CSL-JSON)', () => {
    it('parses BibTeX text with multiple entries, nested braces and clean values', () => {
      const bibtexSample = `
@article{vaswani2017attention,
  author    = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki},
  title     = {Attention is All you Need},
  journal   = {Advances in Neural Information Processing Systems},
  volume    = {30},
  year      = {2017},
  pages     = {5998--6008},
  doi       = {10.5555/3295222.3295349}
}

@book{goodfellow2016deep,
  title     = {Deep Learning},
  author    = {Goodfellow, Ian and Bengio, Yoshua and Courville, Aaron},
  publisher = {MIT Press},
  year      = {2016},
  isbn      = {978-0262035613}
}
      `.trim();

      const parsed = parseBibTeXReferences(bibtexSample);
      expect(parsed).toHaveLength(2);

      const [art, book] = parsed;
      expect(art.type).toBe('article');
      expect(art.title).toBe('Attention is All you Need');
      expect(art.author).toContain('Vaswani, Ashish');
      expect(art.journal).toBe('Advances in Neural Information Processing Systems');
      expect(art.year).toBe('2017');
      expect(art.volume).toBe('30');
      expect(art.pages).toBe('5998-6008');
      expect(art.doi).toBe('10.5555/3295222.3295349');

      expect(book.type).toBe('book');
      expect(book.title).toBe('Deep Learning');
      expect(book.publisher).toBe('MIT Press');
      expect(book.year).toBe('2016');
      expect(book.isbn).toBe('978-0262035613');
    });

    it('parses RIS text with multi-line tags, multiple authors, and pages', () => {
      const risSample = `
TY  - JOUR
TI  - Quantum supremacy using a programmable superconducting processor
AU  - Arute, Frank
AU  - Arya, Kunal
AU  - Babbush, Ryan
JO  - Nature
PY  - 2019
VL  - 574
IS  - 7779
SP  - 505
EP  - 510
DO  - 10.1038/s41586-019-1666-5
UR  - https://www.nature.com/articles/s41586-019-1666-5
ER  - 
      `.trim();

      const parsed = parseRISReferences(risSample);
      expect(parsed).toHaveLength(1);

      const item = parsed[0];
      expect(item.type).toBe('article');
      expect(item.title).toBe('Quantum supremacy using a programmable superconducting processor');
      expect(item.author).toBe('Arute, Frank; Arya, Kunal; Babbush, Ryan');
      expect(item.journal).toBe('Nature');
      expect(item.year).toBe('2019');
      expect(item.volume).toBe('574');
      expect(item.issue).toBe('7779');
      expect(item.pages).toBe('505-510');
      expect(item.doi).toBe('10.1038/s41586-019-1666-5');
      expect(item.url).toBe('https://www.nature.com/articles/s41586-019-1666-5');
    });

    it('parses Zotero CSL-JSON format exported items', () => {
      const cslSample = JSON.stringify([
        {
          id: 'item-1',
          type: 'article-journal',
          title: 'Graph Neural Networks in Recommender Systems: A Survey',
          author: [
            { family: 'Gao', given: 'Chen' },
            { family: 'Wang', given: 'Xiang' },
          ],
          'container-title': 'ACM Computing Surveys',
          issued: {
            'date-parts': [[2023, 5]],
          },
          volume: '55',
          issue: '5',
          page: '1-37',
          DOI: '10.1145/3572202',
          URL: 'https://dl.acm.org/doi/10.1145/3572202',
        },
      ]);

      const parsed = parseCSLJsonReferences(cslSample);
      expect(parsed).toHaveLength(1);

      const item = parsed[0];
      expect(item.type).toBe('article');
      expect(item.title).toBe('Graph Neural Networks in Recommender Systems: A Survey');
      expect(item.author).toBe('Gao, Chen and Wang, Xiang');
      expect(item.journal).toBe('ACM Computing Surveys');
      expect(item.year).toBe('2023');
      expect(item.volume).toBe('55');
      expect(item.issue).toBe('5');
      expect(item.pages).toBe('1-37');
      expect(item.doi).toBe('10.1145/3572202');
      expect(item.url).toBe('https://dl.acm.org/doi/10.1145/3572202');
    });

    it('auto-detects and routes format in parseUniversalReferences', () => {
      // BibTeX string
      const bibResult = parseUniversalReferences('@article{test, title={Universal Test}}');
      expect(bibResult).toHaveLength(1);
      expect(bibResult[0].title).toBe('Universal Test');

      // RIS string
      const risResult = parseUniversalReferences('TY  - BOOK\nTI  - RIS Universal Book\nER  - ');
      expect(risResult).toHaveLength(1);
      expect(risResult[0].title).toBe('RIS Universal Book');

      // CSL-JSON string
      const jsonResult = parseUniversalReferences('[{"title": "JSON Universal"}]', 'export.json');
      expect(jsonResult).toHaveLength(1);
      expect(jsonResult[0].title).toBe('JSON Universal');
    });

    it('deduplicates imported items against existing library by DOI and title+author', () => {
      const existing: Resource[] = [
        sampleArticleResource, // doi: 10.1016/j.jair.2024.01.005
        sampleBookResource,    // title: Designing Data-Intensive Applications
      ];

      const candidates: Partial<Resource>[] = [
        // Duplicate by DOI (case-insensitive)
        {
          title: 'Different Title with Same DOI',
          doi: '10.1016/J.JAIR.2024.01.005',
        },
        // Duplicate by Title + Author match
        {
          title: 'Designing Data-Intensive Applications',
          author: 'Kleppmann, Martin',
        },
        // Unique candidate
        {
          title: 'Reinforcement Learning: An Introduction',
          author: 'Sutton, Richard',
          year: '2018',
        },
      ];

      const { unique, duplicates } = deduplicateImportedResources(candidates, existing);
      expect(unique).toHaveLength(1);
      expect(unique[0].title).toBe('Reinforcement Learning: An Introduction');

      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].reason).toContain('DOI');
      expect(duplicates[1].reason).toContain('tiêu đề và tác giả');
    });
  });

  describe('4. CrossRef DOI Metadata Resolver', () => {
    it('normalizes various DOI inputs into standard format', () => {
      expect(normalizeDoi('10.1016/j.jair.2024.01.005')).toBe('10.1016/j.jair.2024.01.005');
      expect(normalizeDoi('https://doi.org/10.1016/j.jair.2024.01.005')).toBe('10.1016/j.jair.2024.01.005');
      expect(normalizeDoi('http://dx.doi.org/10.1016/j.jair.2024.01.005/')).toBe('10.1016/j.jair.2024.01.005');
      expect(normalizeDoi('doi: 10.1016/j.jair.2024.01.005')).toBe('10.1016/j.jair.2024.01.005');
      expect(normalizeDoi('invalid-doi-format')).toBeNull();
      expect(normalizeDoi('')).toBeNull();
    });

    it('resolves valid DOI metadata via mocked CrossRef fetch (Hermetic Test Guard)', async () => {
      const mockCrossRefResponse = {
        status: 'ok',
        message: {
          title: ['Attention Is All You Need'],
          author: [
            { given: 'Ashish', family: 'Vaswani' },
            { given: 'Noam', family: 'Shazeer' },
          ],
          'container-title': ['Neural Information Processing Systems'],
          published: { 'date-parts': [[2017, 12]] },
          volume: '30',
          page: '5998-6008',
          DOI: '10.5555/3295222.3295349',
          URL: 'https://doi.org/10.5555/3295222.3295349',
          type: 'proceedings-article',
          publisher: 'Curran Associates Inc.',
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCrossRefResponse,
      });

      const result = await lookupDoiMetadata('10.5555/3295222.3295349', mockFetch as unknown as typeof fetch);
      expect(result.status).toBe('success');
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Attention Is All You Need');
      expect(result.data?.author).toBe('Vaswani, Ashish and Shazeer, Noam');
      expect(result.data?.journal).toBe('Neural Information Processing Systems');
      expect(result.data?.year).toBe('2017');
      expect(result.data?.volume).toBe('30');
      expect(result.data?.pages).toBe('5998-6008');
      expect(result.data?.publisher).toBe('Curran Associates Inc.');
      expect(result.data?.doi).toBe('10.5555/3295222.3295349');
    });

    it('handles 404 Not Found error gracefully without throwing', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await lookupDoiMetadata('10.1234/non-existent-doi', mockFetch as unknown as typeof fetch);
      expect(result.status).toBe('not_found');
      expect(result.error).toContain('Không tìm thấy tài liệu với mã DOI');
      expect(result.data).toBeUndefined();
    });

    it('handles network error and invalid input safely', async () => {
      const invalidResult = await lookupDoiMetadata('invalid-doi');
      expect(invalidResult.status).toBe('invalid_doi');

      const mockFetch = vi.fn().mockRejectedValue(new Error('Network offline'));
      const errorResult = await lookupDoiMetadata('10.1016/j.offline', mockFetch as unknown as typeof fetch);
      expect(errorResult.status).toBe('network_error');
      expect(errorResult.error).toContain('Network offline');
    });
  });

  describe('5. Zero DB Migration Academic Metadata Helpers', () => {
    it('embeds academic metadata into resource notes without corrupting user notes', () => {
      const originalNotes = 'Bài báo đọc để làm luận văn thạc sĩ.\nCần kiểm chứng công thức mục 3.';
      const academicMeta = {
        doi: '10.1145/3572202',
        year: '2023',
        journal: 'ACM Computing Surveys',
        volume: '55',
        issue: '5',
        pages: '1-37',
        publisher: 'ACM',
        isbn: '978-1-4503-0000-0',
      };

      const packedNotes = embedAcademicMetadataInNotes(originalNotes, academicMeta);
      expect(packedNotes).toContain(originalNotes);
      expect(packedNotes).toContain('<!-- academic-metadata:');

      const extracted = extractAcademicMetadataFromResource({
        id: 'res-test',
        topicId: 'top-1',
        title: 'Survey Paper',
        type: 'article',
        createdAt: '2023-01-01',
        notes: packedNotes,
      });

      expect(extracted.doi).toBe('10.1145/3572202');
      expect(extracted.year).toBe('2023');
      expect(extracted.journal).toBe('ACM Computing Surveys');
      expect(extracted.volume).toBe('55');
      expect(extracted.issue).toBe('5');
      expect(extracted.pages).toBe('1-37');
      expect(extracted.publisher).toBe('ACM');
      expect(extracted.isbn).toBe('978-1-4503-0000-0');
      expect(extracted.cleanNotes).toBe(originalNotes);
    });

    it('prioritizes direct resource properties when present over embedded notes', () => {
      const packedNotes = embedAcademicMetadataInNotes('', {
        doi: 'old-doi',
        journal: 'Old Journal',
      });

      const extracted = extractAcademicMetadataFromResource({
        id: 'res-test-2',
        topicId: 'top-1',
        title: 'Direct Prop Paper',
        type: 'article',
        createdAt: '2024-01-01',
        notes: packedNotes,
        doi: 'new-direct-doi',
        journal: 'New Direct Journal',
      });

      expect(extracted.doi).toBe('new-direct-doi');
      expect(extracted.journal).toBe('New Direct Journal');
    });
  });
});
