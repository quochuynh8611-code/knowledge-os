import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbhidharmaMatrix } from '../../src/components/matrix/AbhidharmaMatrix';
import { DivinationMatrix } from '../../src/components/matrix/DivinationMatrix';
import { MultilingualLexicon } from '../../src/components/lexicon/MultilingualLexicon';
import {
  getSystemNodes,
  getLexiconEntries,
  getTerminologyLexiconItems,
} from '../../src/lib/scholarSuite/selectors';

// Mock useData context
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    openTopicDetail: vi.fn(),
  }),
}));

describe('ScholarSuite UI Components & Lexicon UX Polish', () => {
  describe('1. AbhidharmaMatrix Component', () => {
    it('renders citta nodes sourced from scholarSuite systemRegistry', () => {
      render(<AbhidharmaMatrix />);

      const registeredCittas = getSystemNodes('citta_89_121');
      expect(registeredCittas.length).toBeGreaterThanOrEqual(2);

      // Verify first registered citta is present
      const firstCitta = registeredCittas[0];
      expect(screen.getAllByText(firstCitta.title).length).toBeGreaterThanOrEqual(1);

      // Verify cetasika count badge is rendered correctly from attributes
      expect(
        screen.getAllByText(`${firstCitta.attributes.associatedCetasikaCount} Tâm sở`).length
      ).toBeGreaterThanOrEqual(1);
    });

    it('filters cittas by search query matching title or roots', () => {
      render(<AbhidharmaMatrix />);

      const searchInput = screen.getByPlaceholderText(/Tìm theo tên Việt, Pali/i);
      fireEvent.change(searchInput, { target: { value: 'Tham' } });

      expect(screen.getAllByText(/Tâm Tham/i).length).toBeGreaterThanOrEqual(1);
    });


  });

  describe('2. DivinationMatrix Component', () => {
    it('renders I Ching hexagrams sourced from scholarSuite systemRegistry', () => {
      render(<DivinationMatrix />);

      const registeredHexagrams = getSystemNodes('iching_64');
      expect(registeredHexagrams.length).toBeGreaterThanOrEqual(2);

      // Verify Quẻ Thuần Càn (#1) is rendered
      expect(screen.getAllByText(/Thuần Càn/i).length).toBeGreaterThanOrEqual(1);
    });

    it('switches to Qi Men tab and renders Qi Men palaces from scholarSuite', () => {
      render(<DivinationMatrix />);

      const qimenTab = screen.getByRole('button', { name: /Kỳ Môn Cửu Cung/i });
      fireEvent.click(qimenTab);

      expect(screen.getAllByText(/Khảm 1 Cung/i).length).toBeGreaterThanOrEqual(1);
    });


  });


  describe('3. MultilingualLexicon Component & UX Polish', () => {
    it('renders lexicon entries sourced from scholarSuite lexiconRegistry', () => {
      render(<MultilingualLexicon />);

      const registeredEntries = getTerminologyLexiconItems();
      expect(registeredEntries.length).toBeGreaterThanOrEqual(4);

      // Verify Citta and Thuần Càn are rendered
      expect(screen.getByText(registeredEntries[0].vietnamese)).toBeInTheDocument();
      expect(screen.getByText(registeredEntries[2].vietnamese)).toBeInTheDocument();
    });

    it('filters lexicon entries by domain button', () => {
      render(<MultilingualLexicon />);

      const phatHocBtn = screen.getByRole('button', { name: /Phật Học/i });
      fireEvent.click(phatHocBtn);

      expect(screen.getByText(/Tâm \/ Thức/i)).toBeInTheDocument();
    });

    it('renders result count summary for total registered entries by default', () => {
      render(<MultilingualLexicon />);
      const registeredEntries = getTerminologyLexiconItems();
      expect(
        screen.getByText(new RegExp(`Hiển thị ${registeredEntries.length} \\/ ${registeredEntries.length} thuật ngữ`, 'i'))
      ).toBeInTheDocument();
    });

    it('updates result summary count dynamically when typing search query', () => {
      render(<MultilingualLexicon />);
      const registeredEntries = getTerminologyLexiconItems();
      const searchInput = screen.getByPlaceholderText(/Tra cứu/i);

      fireEvent.change(searchInput, { target: { value: 'Citta' } });
      expect(
        screen.getByText(new RegExp(`Hiển thị [1-9][0-9]* \\/ ${registeredEntries.length} thuật ngữ`, 'i'))
      ).toBeInTheDocument();
    });

    it('renders "Đặt lại bộ lọc" button when search/filter active, and clicking it resets search and filters', () => {
      render(<MultilingualLexicon />);
      const registeredEntries = getTerminologyLexiconItems();
      const searchInput = screen.getByPlaceholderText(/Tra cứu/i) as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'Duyên' } });
      const resetBtn = screen.getByRole('button', { name: /Đặt lại bộ lọc/i });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);
      expect(searchInput.value).toBe('');
      expect(
        screen.getByText(new RegExp(`Hiển thị ${registeredEntries.length} \\/ ${registeredEntries.length} thuật ngữ`, 'i'))
      ).toBeInTheDocument();
    });

    it('renders polite empty state with reset button when search yields no matches', () => {
      render(<MultilingualLexicon />);
      const searchInput = screen.getByPlaceholderText(/Tra cứu/i);

      fireEvent.change(searchInput, { target: { value: 'ThuatNguKhongTonTai999' } });
      expect(screen.getByText(/Không tìm thấy thuật ngữ phù hợp/i)).toBeInTheDocument();
      
      const resetButtons = screen.getAllByRole('button', { name: /Đặt lại bộ lọc/i });
      expect(resetButtons.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(resetButtons[0]);
      expect(screen.getByText(/Tâm \/ Thức/i)).toBeInTheDocument();
    });

    it('toggles between detailed and compact view modes properly', () => {
      render(<MultilingualLexicon />);
      const compactToggleBtn = screen.getByRole('button', { name: /Thu gọn|Compact/i });
      expect(compactToggleBtn).toBeInTheDocument();

      fireEvent.click(compactToggleBtn);
      expect(screen.getByRole('button', { name: /Chi tiết|Detailed/i })).toBeInTheDocument();
    });
  });
});
