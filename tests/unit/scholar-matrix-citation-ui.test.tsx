import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbhidharmaMatrix } from '../../src/components/matrix/AbhidharmaMatrix';
import { DivinationMatrix } from '../../src/components/matrix/DivinationMatrix';

// Mock useData context
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    openTopicDetail: vi.fn(),
  }),
}));

describe('Phase P8.2: Matrix Citation UI Entry Points & Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. AbhidharmaMatrix Citation UI', () => {
    it('renders "Trích Dẫn Tâm" button and opens ScholarCitationModal with Citta SystemNode', () => {
      render(<AbhidharmaMatrix />);

      const nodeCitationBtn = screen.getByRole('button', { name: /Trích Dẫn Tâm/i });
      expect(nodeCitationBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeCitationBtn);
      });

      // Verify modal is open with the active Citta title
      expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Tâm Tham/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders associated Matrix Relations and opens citation modal on per-relation click', () => {
      render(<AbhidharmaMatrix />);

      // Should render relation section for active citta
      expect(screen.getByText(/Quan Hệ Phối Hợp & Duyên Hệ/i)).toBeInTheDocument();

      // Find per-relation citation trigger
      const relationCitationBtns = screen.getAllByRole('button', { name: /Trích dẫn quan hệ/i });
      expect(relationCitationBtns.length).toBeGreaterThanOrEqual(1);

      act(() => {
        fireEvent.click(relationCitationBtns[0]);
      });

      // Modal should display relational title (with arrow or associates)
      expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
      expect(screen.getAllByText(/associates/i).length).toBeGreaterThanOrEqual(1);
    });

    it('provides batch export buttons for active relations', () => {
      render(<AbhidharmaMatrix />);

      const bibBatchBtn = screen.getByRole('button', { name: /Xuất .bib/i });
      const jsonBatchBtn = screen.getByRole('button', { name: /Xuất .json/i });

      expect(bibBatchBtn).toBeInTheDocument();
      expect(jsonBatchBtn).toBeInTheDocument();
    });
  });

  describe('2. DivinationMatrix Citation UI', () => {
    it('renders "Trích Dẫn Quẻ" button and opens ScholarCitationModal with Hexagram SystemNode', () => {
      render(<DivinationMatrix />);

      const hexCitationBtn = screen.getByRole('button', { name: /Trích Dẫn Quẻ/i });
      expect(hexCitationBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(hexCitationBtn);
      });

      expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Thuần Càn/i).length).toBeGreaterThanOrEqual(1);
    });

    it('renders cross-domain synthesis relation citation button for Quẻ Thuần Càn', () => {
      render(<DivinationMatrix />);

      const synthesisCitationBtn = screen.getByRole('button', { name: /Trích dẫn đối chiếu/i });
      expect(synthesisCitationBtn).toBeInTheDocument();

      act(() => {
        fireEvent.click(synthesisCitationBtn);
      });

      expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Đối Chiếu Đông Phương Học/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
