import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase R2: Reader Sidebar Document-Scoped Highlights', () => {
  const sampleMarkdownContent = `# Nghiên Cứu Bản Thể Luận

## Chương 1: Tồn Tại và Hư Vô
Bản thể luận là nhánh triết học nghiên cứu về bản chất của sự tồn tại.

## Chương 2: Nhận Thức Luận
Nhận thức luận nghiên cứu về nguồn gốc và giới hạn của tri thức.
`;

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-triet-hoc',
        selectedText: 'Bản thể luận là nhánh triết học nghiên cứu về bản chất của sự tồn tại.',
        positionSelector: { headingId: 'chuong-1-ton-tai-va-hu-vo' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Nghiên Cứu Bản Thể Luận' },
        status: 'inbox',
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
      isProcessed: false,
      priority: 1,
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'inbox-2',
      excerptId: 'excerpt-2',
      excerpt: {
        id: 'excerpt-2',
        archivedDocumentId: 'doc-triet-hoc',
        selectedText: 'Nhận thức luận nghiên cứu về nguồn gốc và giới hạn của tri thức.',
        positionSelector: { headingId: 'chuong-2-nhan-thuc-luan' },
        highlightColor: '#bbf7d0',
        citationSnapshot: { title: 'Nghiên Cứu Bản Thể Luận' },
        status: 'active',
        createdAt: '2026-09-19T08:15:00.000Z',
        updatedAt: '2026-09-19T08:15:00.000Z',
      },
      isProcessed: false,
      priority: 0,
      createdAt: '2026-09-19T08:15:00.000Z',
      updatedAt: '2026-09-19T08:15:00.000Z',
    },
    {
      id: 'inbox-3',
      excerptId: 'excerpt-3',
      excerpt: {
        id: 'excerpt-3',
        archivedDocumentId: 'doc-tam-ly-hoc',
        selectedText: 'Phản xạ có điều kiện là phản xạ được hình thành trong đời sống.',
        positionSelector: { pageNumber: 55 },
        highlightColor: '#fed7aa',
        citationSnapshot: { title: 'Tâm Lý Học Đại Cương' },
        status: 'inbox',
        createdAt: '2026-09-19T08:30:00.000Z',
        updatedAt: '2026-09-19T08:30:00.000Z',
      },
      isProcessed: false,
      priority: 0,
      createdAt: '2026-09-19T08:30:00.000Z',
      updatedAt: '2026-09-19T08:30:00.000Z',
    },
  ];

  const mockContextValue = {
    notes: [],
    researchInboxItems: sampleInboxItems,
    addExcerptToInbox: vi.fn(),
    dismissInboxItem: vi.fn(),
    processInboxItem: vi.fn(),
    unprocessedInboxCount: 2,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: sampleMarkdownContent }),
          text: () => Promise.resolve(sampleMarkdownContent),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1.1. extracts and displays ONLY highlights belonging to active documentId from researchInboxItems', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Open sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Switch to Highlights tab
    const highlightsTabBtn = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTabBtn);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(highlightsPanel).toBeInTheDocument();

    // Verify highlights of doc-triet-hoc are displayed
    expect(
      within(highlightsPanel).getByText(/Bản thể luận là nhánh triết học nghiên cứu/i)
    ).toBeInTheDocument();
    expect(
      within(highlightsPanel).getByText(/Nhận thức luận nghiên cứu về nguồn gốc/i)
    ).toBeInTheDocument();

    // Verify excerpt of doc-tam-ly-hoc is strictly EXCLUDED
    expect(
      within(highlightsPanel).queryByText(/Phản xạ có điều kiện/i)
    ).not.toBeInTheDocument();
  });

  it('1.2. clicking a highlight card triggers reader navigation with its position locator', async () => {
    const handlePositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdownContent}
          onPositionChange={handlePositionChange}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const highlightsTabBtn = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTabBtn);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    const highlightCard = within(highlightsPanel).getByText(/Nhận thức luận nghiên cứu về nguồn gốc/i);

    fireEvent.click(highlightCard);

    expect(handlePositionChange).toHaveBeenCalledWith('chuong-2-nhan-thuc-luan');
  });

  it('1.3. displays clean empty state when active document has zero highlights in DataContext', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-kinh-te-hoc"
          title="Kinh Tế Học Đại Cương"
          format="md"
          content="# Kinh Tế Học\nNội dung chưa có highlight."
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const highlightsTabBtn = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTabBtn);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(
      within(highlightsPanel).getByText(/Chưa có trích đoạn nào|Bôi đen bất kỳ đoạn văn nào để highlight/i)
    ).toBeInTheDocument();
  });
});
