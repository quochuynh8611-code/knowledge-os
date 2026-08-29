import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScholarCitationModal } from '../../src/components/modals/ScholarCitationModal';
import { MultilingualLexicon } from '../../src/components/lexicon/MultilingualLexicon';
import {
  canonicalLexiconFixture,
  classicalSystemNodeFixture,
  stubProvenanceFixture,
} from '../fixtures/scholar-citation-fixtures';

describe('Phase D: Scholar Citation Modal UI Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders nothing when isOpen is false or item is null', () => {
    const { container } = render(
      <ScholarCitationModal isOpen={false} onClose={mockOnClose} entry={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. Renders modal with 6 format options for canonical LexiconEntry', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Citta \(Tâm \/ Thức \(Khả năng nhận biết cảnh\)\)/i)[0]
    ).toBeInTheDocument();

    // 6 Format tabs / buttons
    expect(screen.getByRole('button', { name: /BibTeX/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CSL JSON/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /APA 7th/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chicago/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MLA 9th/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Harvard/i })).toBeInTheDocument();
  });

  it('3. Switches format and displays accurate APA 7th preview', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /APA 7th/i }));
    });

    const preview = screen.getByTestId('scholar-citation-preview');
    expect(preview).toHaveValue(
      'Dhammasaṅgaṇī. (n.d.). Citta (Tâm / Thức (Khả năng nhận biết cảnh)) (PTS: Dhs 1-9, Mātika & Citta-uppāda-kaṇḍa § 1).'
    );
  });

  it('4. Calls clipboard API when clicking Copy Citation', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Sao chép trích dẫn/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
  });

  it('5. Displays blocked/explanatory banner for internal_note_only stub entry', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={stubProvenanceFixture}
      />
    );

    expect(
      screen.getByText(/Mục từ này ở trạng thái phác thảo/i)
    ).toBeInTheDocument();
    expect(screen.queryByTestId('scholar-citation-preview')).toBeNull();
  });

  it('6. Works with SystemNode entity (I Ching)', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        node={classicalSystemNodeFixture}
      />
    );

    expect(screen.getAllByText(/Thuần Càn \(Bát Thuần Càn\)/i)[0]).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Chicago/i }));
    });

    const preview = screen.getByTestId('scholar-citation-preview');
    expect(preview).toHaveValue(
      '*Chu Dịch (Zhou Yi)*, Thoán Truyện & Tượng Truyện - Quẻ Càn, s.v. "Thuần Càn (Bát Thuần Càn)."'
    );
  });

  it('7. Closes when clicking close button', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    act(() => {
      fireEvent.click(screen.getByTitle(/Đóng/i));
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('8. Opens citation modal from MultilingualLexicon entry card action', () => {
    render(<MultilingualLexicon />);

    // Find the first "Trích dẫn" button in lexicon
    const citeBtns = screen.getAllByRole('button', { name: /Trích dẫn/i });
    expect(citeBtns.length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(citeBtns[0]);
    });

    expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
  });
});
