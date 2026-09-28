import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlashcardCardView } from '../../src/components/flashcards/FlashcardCardView';
import type { FlashcardCitationProvenance } from '../../src/types/flashcard';

describe('flashcard-card-view-provenance', () => {
  const mockProvenance: FlashcardCitationProvenance = {
    documentId: 'doc-1',
    documentTitle: 'Khoa Học Trí Nhớ',
    format: 'epub',
    locator: 'epubcfi(/6/4[ch1]!/4/2/8)',
    sourceUrl: 'docs/books/memory.epub',
  };

  const cardWithProvenance = {
    id: 'fc-1',
    type: 'basic' as const,
    front: 'Active Recall là gì?',
    back: 'Chủ động nhớ lại thông tin.',
    citationProvenance: mockProvenance,
  };

  const legacyCardWithoutProvenance = {
    id: 'fc-2',
    type: 'basic' as const,
    front: 'Câu hỏi thẻ cũ?',
    back: 'Đáp án thẻ cũ.',
  };

  it('should NOT render citation jump-back button when card is front-facing (unflipped)', () => {
    const handleJumpBack = vi.fn();

    render(
      <FlashcardCardView
        card={cardWithProvenance}
        isFlipped={false}
        onOpenCitationProvenance={handleJumpBack}
      />
    );

    expect(screen.queryByTestId('btn-citation-jump-back')).not.toBeInTheDocument();
  });

  it('should render citation jump-back button when card is flipped and provenance exists', () => {
    const handleJumpBack = vi.fn();

    render(
      <FlashcardCardView
        card={cardWithProvenance}
        isFlipped={true}
        onOpenCitationProvenance={handleJumpBack}
      />
    );

    const jumpBackBtn = screen.getByTestId('btn-citation-jump-back');
    expect(jumpBackBtn).toBeInTheDocument();
    expect(jumpBackBtn).toHaveTextContent(/Khoa Học Trí Nhớ/i);

    fireEvent.click(jumpBackBtn);
    expect(handleJumpBack).toHaveBeenCalledTimes(1);
    expect(handleJumpBack).toHaveBeenCalledWith(mockProvenance);
  });

  it('should NOT render citation jump-back button for legacy cards without provenance even when flipped', () => {
    render(
      <FlashcardCardView
        card={legacyCardWithoutProvenance}
        isFlipped={true}
      />
    );

    expect(screen.queryByTestId('btn-citation-jump-back')).not.toBeInTheDocument();
  });
});
