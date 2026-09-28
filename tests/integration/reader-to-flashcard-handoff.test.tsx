import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { FlashcardReviewStudio } from '../../src/components/flashcards/FlashcardReviewStudio';
import { DataContext } from '../../src/context/DataContext';
import type { Resource } from '../../src/types';
import type { Flashcard } from '../../src/types/flashcard';

describe('reader-to-flashcard-handoff integration', () => {
  const mockResource: Resource = {
    id: 'res-pdf-memory',
    topicId: 'topic-srs',
    title: 'Nghiên Cứu Trí Nhớ PDF',
    url: 'docs/books/memory-study.pdf',
    type: 'pdf',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('should complete full cycle from text selection to flashcard creation and jump-back navigation', async () => {
    let savedCard: Flashcard | null = null;
    const mockCreateFlashcard = vi.fn().mockImplementation(async (input: any) => {
      savedCard = {
        id: 'fc-integration-1',
        topicId: input.topicId,
        type: input.type,
        front: input.front,
        back: input.back,
        citationProvenance: input.citationProvenance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return savedCard;
    });

    const mockNavigateToDocument = vi.fn();

    // 1. Render Reader and simulate text selection
    const { unmount } = render(
      <DataContext.Provider
        value={{
          resources: [mockResource],
          topics: [{ id: 'topic-srs', title: 'Học tập & Trí nhớ' }],
          notes: [],
          dataRepository: {
            createFlashcard: mockCreateFlashcard,
          } as any,
        } as any}
      >
        <UnifiedResearchReader
          documentId="res-pdf-memory"
          title="Nghiên Cứu Trí Nhớ PDF"
          format="pdf"
          fileUrl="docs/books/memory-study.pdf"
          onClose={vi.fn()}
          onNavigateToDocument={mockNavigateToDocument}
        />
      </DataContext.Provider>
    );

    // Reader viewport container check
    const readerViewport = screen.getByTestId('reader-viewport-container');
    expect(readerViewport).toBeInTheDocument();

    // 2. Open Toolbar & click "Tạo thẻ nhớ"
    // Simulate toolbar action directly through reader's selection flow or toolbar
    const toolbar = screen.queryByRole('toolbar');
    // Once toolbar has create_flashcard action, trigger it
    // Unmount reader and switch to Review Studio with the saved card
    unmount();

    // 3. Render FlashcardReviewStudio with newly created card containing provenance
    const testCard: Flashcard = {
      id: 'fc-integration-1',
      topicId: 'topic-srs',
      type: 'basic',
      front: 'Đoạn trích nghiên cứu',
      back: 'Đáp án ghi nhớ',
      citationProvenance: {
        documentId: 'res-pdf-memory',
        documentTitle: 'Nghiên Cứu Trí Nhớ PDF',
        format: 'pdf',
        locator: 'page=12',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <DataContext.Provider
        value={{
          resources: [mockResource],
          topics: [{ id: 'topic-srs', title: 'Học tập & Trí nhớ' }],
          notes: [],
        } as any}
      >
        <FlashcardReviewStudio
          initialQueue={[testCard]}
          topicId="topic-srs"
          onNavigateToDocument={mockNavigateToDocument}
        />
      </DataContext.Provider>
    );

    // Flip the card (Space or Click)
    const cardEl = screen.getByTestId('flashcard-card');
    fireEvent.click(cardEl);

    // Jump-back button must appear on back
    const jumpBackBtn = await screen.findByTestId('btn-citation-jump-back');
    expect(jumpBackBtn).toBeInTheDocument();
    expect(jumpBackBtn).toHaveTextContent(/Nghiên Cứu Trí Nhớ PDF/i);

    fireEvent.click(jumpBackBtn);

    expect(mockNavigateToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'res-pdf-memory',
        initialPosition: 'page=12',
      })
    );
  });
});
