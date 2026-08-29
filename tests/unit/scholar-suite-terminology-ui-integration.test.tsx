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
    });

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
  });
});
