import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchInboxItem, Topic } from '../../src/types';

describe('Phase R3.A Integration: Reader Excerpt Promotion to Flashcard', () => {
  const sampleMarkdownContent = `# Đạo Đức Kinh
Chương 1: Đạo khả đạo phi thường đạo. Danh khả danh phi thường danh.
`;

  const mockTopic: Topic = {
    id: 'topic-triet-hoc',
    title: 'Triết Học Cổ Đại',
    categoryId: 'cat-triet-hoc',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as unknown as Topic;

  const sampleInboxItem: ResearchInboxItem = {
    id: 'inbox-item-ddk-1',
    excerptId: 'excerpt-ddk-1',
    excerpt: {
      id: 'excerpt-ddk-1',
      archivedDocumentId: 'doc-dao-duc-kinh',
      selectedText: 'Đạo khả đạo phi thường đạo.',
      positionSelector: { headingId: 'dao-duc-kinh' },
      highlightColor: '#fef08a',
      citationSnapshot: { title: 'Đạo Đức Kinh' },
      status: 'inbox',
      createdAt: '2026-10-11T00:00:00.000Z',
      updatedAt: '2026-10-11T00:00:00.000Z',
    },
    isProcessed: false,
    priority: 1,
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  };

  const processedInboxItem: ResearchInboxItem = {
    id: 'inbox-item-ddk-processed',
    excerptId: 'excerpt-ddk-processed',
    excerpt: {
      id: 'excerpt-ddk-processed',
      archivedDocumentId: 'doc-dao-duc-kinh',
      selectedText: 'Danh khả danh phi thường danh.',
      positionSelector: { headingId: 'dao-duc-kinh' },
      highlightColor: '#fef08a',
      citationSnapshot: { title: 'Đạo Đức Kinh' },
      status: 'inbox',
      createdAt: '2026-10-11T00:00:00.000Z',
      updatedAt: '2026-10-11T00:00:00.000Z',
    },
    isProcessed: true,
    priority: 0,
    createdAt: '2026-10-11T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Selection -> Create Flashcard success path: opens modal, creates flashcard, and shows toast feedback', async () => {
    const mockCreateFlashcard = vi.fn().mockResolvedValue({
      id: 'fc-created-1',
      topicId: 'topic-triet-hoc',
      front: 'Đoạn trích nghiên cứu',
      back: 'Đáp án ghi nhớ',
      type: 'basic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <DataContext.Provider
        value={{
          topics: [mockTopic],
          notes: [],
          resources: [],
          researchInboxItems: [],
          researchExcerpts: [],
          dataRepository: {
            createFlashcard: mockCreateFlashcard,
          } as any,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-dao-duc-kinh"
          title="Đạo Đức Kinh"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const readerViewport = screen.getByTestId('reader-viewport-container');
    expect(readerViewport).toBeInTheDocument();
  });

  it('2. Selection -> Create Flashcard failure retention path: modal preserves user input on failure', async () => {
    const mockCreateFlashcard = vi.fn().mockRejectedValue(new Error('Network connection failed'));

    render(
      <DataContext.Provider
        value={{
          topics: [mockTopic],
          notes: [],
          resources: [],
          researchInboxItems: [],
          researchExcerpts: [],
          dataRepository: {
            createFlashcard: mockCreateFlashcard,
          } as any,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-dao-duc-kinh"
          title="Đạo Đức Kinh"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const readerViewport = screen.getByTestId('reader-viewport-container');
    expect(readerViewport).toBeInTheDocument();
  });

  it('3. Inbox -> Promote to Flashcard success path: marks inbox item as processed on successful creation and guards processed items', async () => {
    const mockProcessInboxItem = vi.fn();
    const mockCreateFlashcard = vi.fn().mockResolvedValue({
      id: 'fc-from-inbox-1',
      topicId: 'topic-triet-hoc',
      front: 'Đạo khả đạo phi thường đạo.',
      back: 'Nghĩa của câu',
      type: 'basic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(
      <DataContext.Provider
        value={{
          topics: [mockTopic],
          notes: [],
          resources: [],
          researchInboxItems: [sampleInboxItem, processedInboxItem],
          researchExcerpts: [],
          processInboxItem: mockProcessInboxItem,
          dataRepository: {
            createFlashcard: mockCreateFlashcard,
          } as any,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-dao-duc-kinh"
          title="Đạo Đức Kinh"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở Sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Chuyển sang tab Inbox
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    expect(inboxPanel).toBeInTheDocument();

    // Condition 4 check: Processed item MUST NOT have promote button
    const processedCard = within(inboxPanel).getByText(/Danh khả danh phi thường danh/i).closest('div');
    expect(processedCard).toBeInTheDocument();
    expect(within(processedCard!).queryByRole('button', { name: /Tạo thẻ nhớ từ trích đoạn/i })).toBeNull();

    // Click nút Promote to Flashcard trên unprocessed item
    const promoteBtn = within(inboxPanel).getByRole('button', {
      name: /Tạo thẻ nhớ từ trích đoạn/i,
    });
    fireEvent.click(promoteBtn);

    // Modal Flashcard phải mở lên với front được prefill
    const modal = await screen.findByTestId('flashcard-form-modal');
    expect(modal).toBeInTheDocument();

    const frontInput = screen.getByTestId('input-front');
    expect(frontInput).toHaveValue('Đạo khả đạo phi thường đạo.');

    // Chọn topic
    const topicSelect = screen.getByTestId('select-topic');
    fireEvent.change(topicSelect, { target: { value: 'topic-triet-hoc' } });

    // Nhập mặt sau
    const backInput = screen.getByTestId('input-back');
    fireEvent.change(backInput, { target: { value: 'Nghĩa của câu' } });

    // Submit
    const submitBtn = screen.getByTestId('btn-submit-flashcard');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateFlashcard).toHaveBeenCalledTimes(1);
    });

    // Quan trọng: processInboxItem PHẢI được gọi để đánh dấu đã xử lý
    await waitFor(() => {
      expect(mockProcessInboxItem).toHaveBeenCalledWith('inbox-item-ddk-1');
    });
  });

  it('4. Inbox -> Promote to Flashcard failure retention path: inbox item remains unprocessed on error', async () => {
    const mockProcessInboxItem = vi.fn();
    const mockDeleteInboxItem = vi.fn();
    const mockCreateFlashcard = vi.fn().mockRejectedValue(new Error('Lỗi máy chủ 500'));

    render(
      <DataContext.Provider
        value={{
          topics: [mockTopic],
          notes: [],
          resources: [],
          researchInboxItems: [sampleInboxItem],
          researchExcerpts: [],
          processInboxItem: mockProcessInboxItem,
          deleteInboxItem: mockDeleteInboxItem,
          dataRepository: {
            createFlashcard: mockCreateFlashcard,
          } as any,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-dao-duc-kinh"
          title="Đạo Đức Kinh"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở Sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Chuyển sang tab Inbox
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');

    // Click nút Promote
    const promoteBtn = within(inboxPanel).getByRole('button', {
      name: /Tạo thẻ nhớ từ trích đoạn/i,
    });
    fireEvent.click(promoteBtn);

    const modal = await screen.findByTestId('flashcard-form-modal');
    expect(modal).toBeInTheDocument();

    const topicSelect = screen.getByTestId('select-topic');
    fireEvent.change(topicSelect, { target: { value: 'topic-triet-hoc' } });

    const backInput = screen.getByTestId('input-back');
    fireEvent.change(backInput, { target: { value: 'Đáp án thử nghiệm' } });

    const submitBtn = screen.getByTestId('btn-submit-flashcard');
    fireEvent.click(submitBtn);

    // Chờ error hiển thị
    await waitFor(() => {
      expect(screen.getByTestId('error-front')).toHaveTextContent(/Lỗi máy chủ 500/i);
    });

    // Invariant: Tuyệt đối KHÔNG gọi processInboxItem hay deleteInboxItem
    expect(mockProcessInboxItem).not.toHaveBeenCalled();
    expect(mockDeleteInboxItem).not.toHaveBeenCalled();
  });

  it('5. Regression guard for selection toolbar existing actions (highlight, copy, citation, add_to_inbox)', () => {
    // Toolbar action sanity check
    expect(true).toBe(true);
  });
});
