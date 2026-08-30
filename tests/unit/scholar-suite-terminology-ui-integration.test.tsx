import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MultilingualLexicon } from '../../src/components/lexicon/MultilingualLexicon';
import {
  mapTerminologyEntryToLexiconItemView,
  getTerminologyLexiconItems,
  getTerminologyEntries,
  getTerminologyEntryById,
} from '../../src/lib/scholarSuite/selectors';
import { generateScholarCitations } from '../../src/lib/scholarCitation/generator';
import type { TerminologyEntry } from '../../src/types/terminology';

// Mock useData context if needed
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    openTopicDetail: vi.fn(),
  }),
}));

describe('Phase P10.0 & P10.1: Terminology Dictionary Integration & Canonical Selectors', () => {
  const sampleTerminologyEntry: TerminologyEntry = {
    id: 'term-anatta-01',
    title: 'Anattā (Vô Ngã)',
    domain: 'phat-hoc',
    code: 'anatta',
    canonicalTerm: 'Anattā',
    aliases: {
      vietnamese: 'Vô Ngã',
      pali: 'Anattā',
      sanskrit: 'Anātman (अनात्मन्)',
      hanTu: '無我',
      pinyin: 'Wú Wǒ',
      english: 'Non-self / Insunstantiality',
    },
    summary: 'Đặc tính không có một tự ngã độc lập, bất biến và thường hằng.',
    sources: [
      {
        sourceTitle: 'Anattalakkhaṇa Sutta',
        sectionRef: 'SN 22.59',
        ptsRef: 'SN iii 66',
      },
    ],
  };

  const sampleCustomDomainEntry: TerminologyEntry = {
    id: 'term-y-hoc-01',
    title: 'Châm Cứu Học',
    domain: 'y-hoc-co-truyen',
    code: 'cham-cuu',
    canonicalTerm: 'Châm Cứu',
    aliases: {
      vietnamese: 'Châm Cứu',
      hanTu: '針灸',
      pinyin: 'Zhēnjiǔ',
      english: 'Acupuncture',
    },
    summary: 'Phương pháp chữa bệnh bằng cách kích thích các huyệt vị trên cơ thể.',
    provenanceNote: 'Hoàng Đế Nội Kinh',
  };

  describe('1. Selector & View-Model Mapping (mapTerminologyEntryToLexiconItemView)', () => {
    it('maps TerminologyEntry to LexiconItemView with full multilingual alias preservation', () => {
      const itemView = mapTerminologyEntryToLexiconItemView(sampleTerminologyEntry);

      expect(itemView.id).toBe('term-anatta-01');
      expect(itemView.vietnamese).toBe('Vô Ngã');
      expect(itemView.pali).toBe('Anattā');
      expect(itemView.sanskrit).toBe('Anātman (अनात्मन्)');
      expect(itemView.hanTu).toBe('無我');
      expect(itemView.pinyin).toBe('Wú Wǒ');
      expect(itemView.category).toBe('phat-hoc');
      expect(itemView.definition).toBe(sampleTerminologyEntry.summary);
      expect(itemView.canonicalRef).toContain('Anattalakkhaṇa Sutta SN 22.59');
    });

    it('gracefully handles custom domain and fallback source without hardcoding binary domains', () => {
      const itemView = mapTerminologyEntryToLexiconItemView(sampleCustomDomainEntry);

      expect(itemView.id).toBe('term-y-hoc-01');
      expect(itemView.category).toBe('y-hoc-co-truyen');
      expect(itemView.pali).toBe('—');
      expect(itemView.sanskrit).toBe('—');
      expect(itemView.hanTu).toBe('針灸');
      expect(itemView.canonicalRef).toBe('Hoàng Đế Nội Kinh');
    });

    it('retrieves and filters items via getTerminologyLexiconItems selector', () => {
      const allItems = getTerminologyLexiconItems();
      expect(allItems.length).toBeGreaterThanOrEqual(4);

      const phatHocItems = getTerminologyLexiconItems({ domain: 'phat-hoc' });
      expect(phatHocItems.length).toBeGreaterThan(0);
      expect(phatHocItems.every((item) => item.category === 'phat-hoc')).toBe(true);
    });
  });

  describe('2. Canonical Selector Parity & O(1) Lookup (Phase P10.1)', () => {
    it('provides exact filter parity between getTerminologyLexiconItems and getTerminologyEntries', () => {
      const filteredViews = getTerminologyLexiconItems({ query: 'citta' });
      const filteredEntries = getTerminologyEntries({ query: 'citta' });

      expect(filteredViews.length).toBe(filteredEntries.length);
      expect(filteredViews.length).toBeGreaterThan(0);
      expect(filteredViews.map((v) => v.id)).toEqual(filteredEntries.map((e) => e.id));
    });

    it('retrieves single entry in O(1) via getTerminologyEntryById without mismatch', () => {
      const allItems = getTerminologyLexiconItems();
      expect(allItems.length).toBeGreaterThan(0);

      // Verify every rendered item view has a valid 1-to-1 matching entry in dictionary
      for (const itemView of allItems) {
        const rawEntry = getTerminologyEntryById(itemView.id);
        expect(rawEntry).toBeDefined();
        expect(rawEntry?.id).toBe(itemView.id);
      }

      // Non-existent ID returns undefined cleanly
      expect(getTerminologyEntryById('non-existent-id-999')).toBeUndefined();
    });
  });

  describe('3. Citation Generator Compatibility for TerminologyEntry', () => {
    it('generates citations cleanly for TerminologyEntry with 6 standard formats', () => {
      const result = generateScholarCitations(sampleTerminologyEntry);

      expect(result.isBlocked).toBe(false);
      expect(result.viewModel.citationKey).toBe('phat_hoc_term_anatta_anattalakkhana_sutta_22');
      expect(result.viewModel.sufficiency).toBe('canonical_complete');
      expect(result.bibtex).toContain('@misc{phat_hoc_term_anatta_anattalakkhana_sutta_22');
      expect(result.apa).toContain('Anattalakkhaṇa Sutta');
      expect(result.chicago).toContain('SN 22.59');
    });
  });

  describe('4. MultilingualLexicon UI Integration via Terminology Selector', () => {
    it('renders terminology items and handles search and citation modal', async () => {
      render(<MultilingualLexicon />);

      // Verify Citta entry is rendered from terminology dictionary
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);

      // Filter by domain button
      const phatHocBtn = screen.getByRole('button', { name: /Phật Học/i });
      fireEvent.click(phatHocBtn);

      // Open citation modal on first entry
      const citationButtons = screen.getAllByRole('button', { name: /trích dẫn/i });
      expect(citationButtons.length).toBeGreaterThan(0);
      fireEvent.click(citationButtons[0]);

      // Verify citation modal is open
      await waitFor(() => {
        expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
      });
    }, 15000);

    it('searches by canonical Vietnamese phrase "nhận biết" and displays matching Citta card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'nhận biết' } });

      // Selector parity check against actual registry data
      const expectedResults = getTerminologyLexiconItems({ query: 'nhận biết' });
      expect(expectedResults.length).toBeGreaterThan(0);

      // UI count indicator and card rendering parity
      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches by canonical definition phrase "tâm lý" and displays matching Cetasika card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'tâm lý' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'tâm lý' });
      expect(expectedResults.length).toBeGreaterThan(0);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Tâm Sở/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches by English alias "Consciousness" and displays matching Citta and Cetasika cards', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'Consciousness' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'Consciousness' });
      expect(expectedResults.length).toBeGreaterThan(0);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches by code/canonicalTerm "citta" with exact selector parity', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'citta' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'citta' });
      expect(expectedResults.length).toBeGreaterThan(0);
      expect(expectedResults.some((e) => e.id === 'lex-pali-citta')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches by etymology root keyword "nhận thức" and displays matching Citta card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'nhận thức' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'nhận thức' });
      expect(expectedResults.some((item) => item.id === 'lex-pali-citta')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches with macOS NFD decomposed input "nhận thức" and displays matching Citta card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      const nfdQuery = 'nhận thức'.normalize('NFD');
      fireEvent.change(searchInput, { target: { value: nfdQuery } });

      const expectedResults = getTerminologyLexiconItems({ query: nfdQuery });
      expect(expectedResults.length).toBeGreaterThan(0);
      expect(expectedResults.some((item) => item.id === 'lex-pali-citta')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches with unaccented Vietnamese query "nhan thuc" and displays matching Citta card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'nhan thuc' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'nhan thuc' });
      expect(expectedResults.length).toBeGreaterThan(0);
      expect(expectedResults.some((item) => item.id === 'lex-pali-citta')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Citta/i).length).toBeGreaterThanOrEqual(1);
    });

    it('searches with IAST diacritics folding "sobhana" and displays matching Sobhana card', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'sobhana' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'sobhana' });
      expect(expectedResults.length).toBeGreaterThan(0);
      expect(expectedResults.some((item) => item.id === 'lex-pali-sobhana')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Sobhana/i).length).toBeGreaterThanOrEqual(1);
    });

    it('Phase P11 RED: searches by system code "Q01" and displays matching adapted I Ching hexagram card in UI', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'Q01' } });

      // In P11, getTerminologyLexiconItems should include sys-iching-01
      const expectedResults = getTerminologyLexiconItems({ query: 'Q01' });
      expect(expectedResults.length).toBeGreaterThan(0);
      expect(expectedResults.some((item) => item.id === 'sys-iching-01')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      expect(screen.getAllByText(/Thuần Càn/i).length).toBeGreaterThanOrEqual(1);
    });

    it('Phase P11 RED: searches by dual-concept term "Thuần Càn" and renders both lexical root and system node cards in UI', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);

      fireEvent.change(searchInput, { target: { value: 'Thuần Càn' } });

      const expectedResults = getTerminologyLexiconItems({ query: 'Thuần Càn' });
      expect(expectedResults.length).toBeGreaterThanOrEqual(2);
      expect(expectedResults.some((item) => item.id === 'lex-iching-qian')).toBe(true);
      expect(expectedResults.some((item) => item.id === 'sys-iching-01')).toBe(true);

      expect(screen.getByText(new RegExp(`Hiển thị ${expectedResults.length} /`, 'i'))).toBeInTheDocument();
      // Verifies distinct cards rendered for both lexical concept and system node
      expect(screen.getByText(/Trời \/ Cương Kiện/i)).toBeInTheDocument();
      expect(screen.getByText(/Bát Thuần Càn/i)).toBeInTheDocument();
    });
  });

  describe('5. Phase P12.2 Wave 1: Multilingual Lexicon UI Deep Facets & Presentation (RED Phase)', () => {
    it('1. maps P12.0 languageProfiles and source metadata to LexiconItemView', () => {
      const p12Entry: TerminologyEntry = {
        id: 'lex-pali-citta',
        title: 'Citta (Tâm)',
        domain: 'phat-hoc',
        code: 'citta',
        conceptId: 'concept:buddhism:citta',
        sourceType: 'lexicon',
        sourceEntryId: 'lex-pali-citta',
        languageProfiles: {
          vi: {
            language: 'vi',
            script: 'Latn',
            surfaceForm: 'Tâm',
            glosses: { preferred: 'Tâm' },
          },
          'zh-Hant': {
            language: 'zh-Hant',
            script: 'Hani',
            surfaceForm: '心',
            transliterations: { pinyin: 'xīn', hanViet: 'Tâm' },
          },
          sa: {
            language: 'sa',
            script: 'Deva',
            surfaceForm: 'citta',
            transliterations: { devanagari: 'चित्त', iast: 'citta' },
          },
          en: {
            language: 'en',
            script: 'Latn',
            surfaceForm: 'Mind / Consciousness',
            glosses: { preferred: 'Mind / Consciousness' },
          },
        },
      };

      const itemView = mapTerminologyEntryToLexiconItemView(p12Entry);

      // Expected to FAIL until P12.2 Wave 1 updates mapTerminologyEntryToLexiconItemView
      const extView = itemView as unknown as {
        sourceType?: string;
        conceptId?: string;
        hanViet?: string;
        devanagari?: string;
        englishGloss?: string;
      };

      expect(extView.sourceType).toBe('lexicon');
      expect(extView.conceptId).toBe('concept:buddhism:citta');
      expect(extView.hanViet).toBe('Tâm');
      expect(extView.devanagari).toBe('चित्त');
      expect(extView.englishGloss).toBe('Mind / Consciousness');
    });

    it('2. renders Source Type badge for Lexicon ("[Từ Điển]") and System Nodes ("[Ma Trận]") in UI', () => {
      render(<MultilingualLexicon />);

      // Search for dual-concept term to get both a lexicon entry and a system node
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);
      fireEvent.change(searchInput, { target: { value: 'Thuần Càn' } });

      // Expected to FAIL until MultilingualLexicon.tsx renders source type badges
      expect(screen.getAllByText(/Từ Điển/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Ma Trận|Nút Ma Trận|Hệ Thống/i).length).toBeGreaterThanOrEqual(1);
    });

    it('3. renders Hanzi paired with its Han-Viet reading on the card header (e.g. "[Tâm]" or "[Càn]")', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);
      fireEvent.change(searchInput, { target: { value: 'citta' } });

      // Expected to FAIL until MultilingualLexicon.tsx renders hanViet alongside hanTu
      expect(screen.getByText(/\[Tâm\]/i)).toBeInTheDocument();
    });

    it('4. renders academic English gloss in the multilingual parallel grid', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);
      fireEvent.change(searchInput, { target: { value: 'citta' } });

      // Expected to FAIL until MultilingualLexicon.tsx includes English gloss column
      expect(screen.getByText(/Mind \/ Consciousness/i)).toBeInTheDocument();
    });

    it('5. renders Devanagari script alongside Sanskrit IAST on detailed cards', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu:/i);
      fireEvent.change(searchInput, { target: { value: 'citta' } });

      // Devanagari script must be visible
      expect(screen.getAllByText(/चित्त/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
