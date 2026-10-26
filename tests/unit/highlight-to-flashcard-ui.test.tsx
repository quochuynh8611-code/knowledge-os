import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExcerptFlashcardSynthesisModal } from '../../src/components/reader/ExcerptFlashcardSynthesisModal';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import type { ExcerptInput } from '../../src/lib/highlightToFlashcardEngine';
import type { ResearchExcerpt } from '../../src/types';

describe('Highlight-to-Flashcard UI Integration (Phase 7B - ADR-111)', () => {
  const sampleExcerpts: ExcerptInput[] = [
    {
      id: 'exc-1',
      selectedText: '**Định lý Bayes** tính xác suất hậu nghiệm $P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$.',
      highlightColor: '#fbcfe8',
      sourceTitle: 'Xác Suất Thống Kê',
      pageNumber: 54,
    },
    {
      id: 'exc-2',
      selectedText: 'Entropy Von Neumann: Độ đo lượng tử về tính hỗn loạn của ma trận mật độ $\\rho$.',
      highlightColor: '#fef08a',
      sourceTitle: 'Cơ Học Lượng Tử',
      pageNumber: 120,
    },
    {
      id: 'exc-3',
      selectedText: 'Phản ứng quang hợp $\\ce{6CO2 + 6H2O -> C6H12O6 + 6O2}$ chuyển đổi năng lượng ánh sáng thành hóa năng.',
      highlightColor: '#bbf7d0',
      sourceTitle: 'Sinh Học Đại Cương',
      pageNumber: 33,
      userNote: 'Ý nghĩa năng lượng sinh học là gì?',
    },
  ];

  const sampleTopics = [
    { id: 'topic-1', title: 'Toán Học & Xác Suất' },
    { id: 'topic-2', title: 'Vật Lý & Hóa Học' },
  ];

  // Scenario 1: Batch Synthesis Preview & Strategy Switching
  it('Scenario 1: renders synthesis modal preview and allows switching synthesis strategy', async () => {
    const user = userEvent.setup();
    render(
      <ExcerptFlashcardSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        excerpts={sampleExcerpts}
        topics={sampleTopics}
        defaultTopicId="topic-1"
      />
    );

    expect(screen.getByTestId('excerpt-synthesis-modal')).toBeInTheDocument();
    
    // Check strategy select dropdown
    const strategySelect = screen.getByTestId('synthesis-strategy-select') as HTMLSelectElement;
    expect(strategySelect).toBeInTheDocument();

    // Candidates should be listed
    expect(screen.getByTestId('candidate-front-input-exc-1')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-2')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-3')).toBeInTheDocument();

    // Default strategy auto / cloze shows cloze or strategy badge
    expect(screen.getAllByText(/cloze-auto/i).length).toBeGreaterThan(0);

    // Switch strategy to definition-split
    fireEvent.change(strategySelect, { target: { value: 'definition-split' } });
    expect(strategySelect.value).toBe('definition-split');
  });

  // Scenario 2: Color Palette Filtering in Synthesis Modal
  it('Scenario 2: filters candidates by highlight color chips', async () => {
    render(
      <ExcerptFlashcardSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        excerpts={sampleExcerpts}
        topics={sampleTopics}
      />
    );

    // Initial state shows all 3 candidates
    expect(screen.getByTestId('candidate-front-input-exc-1')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-2')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-3')).toBeInTheDocument();

    // Click Pink filter (#fbcfe8)
    const pinkFilterBtn = screen.getByTestId('synthesis-color-filter-pink');
    fireEvent.click(pinkFilterBtn);

    // Only exc-1 (pink) should remain visible
    expect(screen.getByTestId('candidate-front-input-exc-1')).toBeInTheDocument();
    expect(screen.queryByTestId('candidate-front-input-exc-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('candidate-front-input-exc-3')).not.toBeInTheDocument();

    // Click All filter to reset
    const allFilterBtn = screen.getByTestId('synthesis-color-filter-all');
    fireEvent.click(allFilterBtn);

    expect(screen.getByTestId('candidate-front-input-exc-1')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-2')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-3')).toBeInTheDocument();
  });

  // Scenario 3: Inline Candidate Editing & Selection Checkboxes
  it('Scenario 3: supports inline candidate front/back editing and checkbox toggling', async () => {
    render(
      <ExcerptFlashcardSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        excerpts={sampleExcerpts}
        topics={sampleTopics}
      />
    );

    const frontInput = screen.getByTestId('candidate-front-input-exc-1') as HTMLTextAreaElement;
    fireEvent.change(frontInput, { target: { value: 'Nội dung mặt trước đã chỉnh sửa' } });
    expect(frontInput.value).toBe('Nội dung mặt trước đã chỉnh sửa');

    const backInput = screen.getByTestId('candidate-back-input-exc-1') as HTMLTextAreaElement;
    fireEvent.change(backInput, { target: { value: 'Nội dung mặt sau đã chỉnh sửa' } });
    expect(backInput.value).toBe('Nội dung mặt sau đã chỉnh sửa');

    const checkbox = screen.getByTestId('candidate-select-checkbox-exc-1') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  // Scenario 4: Batch Save to FSRS Deck & Deduplication Feedback
  it('Scenario 4: saves selected candidates to topic and displays skipped duplicate count badge', async () => {
    const handleSaveCards = vi.fn();
    const existingCards = [
      {
        front: 'Định lý Bayes',
        back: 'Xác suất hậu nghiệm',
        sourceExcerptId: 'exc-1',
      },
    ];

    render(
      <ExcerptFlashcardSynthesisModal
        isOpen={true}
        onClose={vi.fn()}
        excerpts={sampleExcerpts}
        existingCards={existingCards}
        topics={sampleTopics}
        defaultTopicId="topic-1"
        onSaveCards={handleSaveCards}
      />
    );

    // exc-1 is skipped because it is in existingCards
    expect(screen.getByText(/1 thẻ trùng lặp/i)).toBeInTheDocument();
    expect(screen.queryByTestId('candidate-front-input-exc-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-2')).toBeInTheDocument();
    expect(screen.getByTestId('candidate-front-input-exc-3')).toBeInTheDocument();

    // Select topic
    const topicSelect = screen.getByTestId('synthesis-topic-select') as HTMLSelectElement;
    fireEvent.change(topicSelect, { target: { value: 'topic-2' } });
    expect(topicSelect.value).toBe('topic-2');

    // Click confirm batch synthesis button
    const confirmBtn = screen.getByTestId('confirm-batch-synthesis-btn');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(handleSaveCards).toHaveBeenCalledTimes(1);
    const [savedCards, targetTopicId] = handleSaveCards.mock.calls[0];
    expect(savedCards).toHaveLength(2);
    expect(targetTopicId).toBe('topic-2');
  });

  // Scenario 5: ReaderSidebar 1-Click Trigger
  it('Scenario 5: renders "Tổng hợp Flashcard" button in ReaderSidebar highlights panel and fires callback', async () => {
    const handleSynthesize = vi.fn();
    const readerExcerpts: ResearchExcerpt[] = [
      {
        id: 'exc-10',
        archivedDocumentId: 'doc-1',
        selectedText: 'Nội dung trích đoạn quan trọng',
        positionSelector: { pageNumber: 5 },
        highlightColor: '#fef08a',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="highlights"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài Liệu Nghiên Cứu Mẫu"
        excerpts={readerExcerpts}
        onSynthesizeFlashcards={handleSynthesize}
      />
    );

    const btnSynthesis = screen.getByTestId('btn-open-highlight-synthesis');
    expect(btnSynthesis).toBeInTheDocument();
    expect(btnSynthesis).toHaveTextContent(/Tổng hợp Flashcard/i);

    fireEvent.click(btnSynthesis);
    expect(handleSynthesize).toHaveBeenCalledTimes(1);
    expect(handleSynthesize).toHaveBeenCalledWith(readerExcerpts);
  });
});
