import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashcardFormModal } from '../../src/components/modals/FlashcardFormModal';
import type { FlashcardCitationProvenance } from '../../src/types/flashcard';

describe('flashcard-form-modal-provenance', () => {
  const mockProvenance: FlashcardCitationProvenance = {
    documentId: 'doc-memory-1',
    documentTitle: 'Khoa Học Trí Nhớ',
    format: 'epub',
    locator: 'epubcfi(/6/4[ch1]!/4/2/8)',
    sourceUrl: 'docs/books/memory.epub',
    excerptText: 'Đường cong quên lãng miêu tả sự suy giảm trí nhớ.',
    citationFormatted: 'Hermann Ebbinghaus (1885). Khoa Học Trí Nhớ.',
  };

  it('should render provenance info badge when initialProvenance is provided', () => {
    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialFront="Đường cong quên lãng"
        initialProvenance={mockProvenance}
        defaultTopicId="topic-1"
      />
    );

    expect(screen.getByTestId('provenance-preview-badge')).toBeInTheDocument();
    expect(screen.getByText(/Khoa Học Trí Nhớ/i)).toBeInTheDocument();
  });

  it('should enforce non-empty back for basic card and attach provenance upon successful creation', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();
    const mockCreate = vi.fn().mockResolvedValue({
      id: 'fc-new-1',
      topicId: 'topic-1',
      type: 'basic',
      front: 'Khái niệm Active Recall',
      back: 'Phương pháp chủ động gợi nhớ thông tin',
      citationProvenance: mockProvenance,
      createdAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
    });

    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        initialFront="Khái niệm Active Recall"
        initialProvenance={mockProvenance}
        defaultTopicId="topic-1"
        dataRepository={{
          createFlashcard: mockCreate,
        }}
      />
    );

    const submitBtn = screen.getByTestId('btn-submit-flashcard');

    // 1. Attempt submit with empty back
    fireEvent.click(submitBtn);
    expect(await screen.findByTestId('error-back')).toHaveTextContent(/Mặt sau không được để trống/i);
    expect(mockCreate).not.toHaveBeenCalled();

    // 2. Fill back and submit successfully
    const backInput = screen.getByTestId('input-back');
    fireEvent.change(backInput, { target: { value: 'Phương pháp chủ động gợi nhớ thông tin' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          front: 'Khái niệm Active Recall',
          back: 'Phương pháp chủ động gợi nhớ thông tin',
          type: 'basic',
          citationProvenance: mockProvenance,
        })
      );
    });

    expect(handleSuccess).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('should auto-detect cloze card and pre-fill answer without auto-guessing for basic', () => {
    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={vi.fn()}
        initialFront="Thủ đô của Việt Nam là {{c1::Hà Nội}}."
        initialProvenance={mockProvenance}
        defaultTopicId="topic-1"
      />
    );

    expect(screen.getByTestId('type-toggle-cloze')).toHaveClass('bg-white');
    expect(screen.getByTestId('input-back')).toHaveValue('Hà Nội');
  });
});
