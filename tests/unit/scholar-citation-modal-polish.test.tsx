import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScholarCitationModal } from '../../src/components/modals/ScholarCitationModal';
import {
  canonicalMatrixRelationFixture,
  conjectureMatrixRelationFixture,
} from '../fixtures/scholar-citation-matrix-fixtures';
import { canonicalLexiconFixture } from '../fixtures/scholar-citation-fixtures';

describe('Phase P8.3: ScholarCitationModal Workflow Polish & a11y', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Closes modal on Escape key press', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        entry={canonicalLexiconFixture}
      />
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('2. Announces copy feedback in accessible live region (aria-live="polite")', async () => {
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

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion.textContent).toContain('Đã sao chép');
  });

  it('3. Displays distinct cards for canonicalEvidence, interpretiveNote, and evidenceLevel in MatrixRelation citation', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        relation={canonicalMatrixRelationFixture}
      />
    );

    // Verify canonical evidence section
    expect(screen.getByText(/Bằng chứng văn bản nguyên bản/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Tâm sở Xúc là 1 trong 7 biến hành/i)
    ).toBeInTheDocument();

    // Verify interpretive note section
    expect(
      screen.getByText(/Chú giải phân tích học thuật/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Không thể có tâm tham ái khởi lên/i)
    ).toBeInTheDocument();

    // Verify evidence level tag
    expect(screen.getByText('canonical')).toBeInTheDocument();
  });

  it('4. Highlights scholarly_conjecture with caution tag in MatrixRelation citation', () => {
    render(
      <ScholarCitationModal
        isOpen={true}
        onClose={mockOnClose}
        relation={conjectureMatrixRelationFixture}
      />
    );

    expect(screen.getByText('scholarly_conjecture')).toBeInTheDocument();
  });
});
