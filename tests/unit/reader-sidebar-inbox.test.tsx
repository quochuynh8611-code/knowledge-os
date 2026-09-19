import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase R4: Reader Sidebar Document-Scoped Inbox (Red Stage)', () => {
  const sampleMarkdownContent = `# Hướng Dẫn Dataview

Nội dung hướng dẫn chi tiết về Dataview trong Obsidian.
`;

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-item-dataview-1',
      excerptId: 'excerpt-dataview-1',
      excerpt: {
        id: 'excerpt-dataview-1',
        archivedDocumentId: 'doc-dataview',
        selectedText: 'Dataview query ngôn ngữ nâng cao cho Obsidian.',
        positionSelector: { headingId: 'huong-dan-dataview' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Hướng Dẫn Dataview' },
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
      id: 'inbox-item-other-doc-2',
      excerptId: 'excerpt-other-doc-2',
      excerpt: {
        id: 'excerpt-other-doc-2',
        archivedDocumentId: 'doc-terminal-tips',
        selectedText: 'PORT=3005 npm run dev',
        positionSelector: { pageNumber: 1 },
        highlightColor: '#bbf7d0',
        citationSnapshot: { title: 'Terminal Tips' },
        status: 'inbox',
        createdAt: '2026-09-19T07:30:00.000Z',
        updatedAt: '2026-09-19T07:30:00.000Z',
      },
      isProcessed: false,
      priority: 0,
      createdAt: '2026-09-19T07:30:00.000Z',
      updatedAt: '2026-09-19T07:30:00.000Z',
    },
    {
      id: 'inbox-item-other-doc-3',
      excerptId: 'excerpt-other-doc-3',
      excerpt: {
        id: 'excerpt-other-doc-3',
        archivedDocumentId: 'doc-terminal-tips',
        selectedText: 'git checkout -b feature/xyz',
        positionSelector: { pageNumber: 2 },
        highlightColor: '#fed7aa',
        citationSnapshot: { title: 'Terminal Tips' },
        status: 'inbox',
        createdAt: '2026-09-19T07:45:00.000Z',
        updatedAt: '2026-09-19T07:45:00.000Z',
      },
      isProcessed: true,
      priority: 0,
      createdAt: '2026-09-19T07:45:00.000Z',
      updatedAt: '2026-09-19T07:45:00.000Z',
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

  it('1. Tab Inbox in ReaderSidebar displays ONLY items belonging to current active documentId', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-dataview"
          title="Hướng Dẫn Dataview"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Chuyển sang tab Inbox
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    // Panel Inbox hiển thị
    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    expect(inboxPanel).toBeInTheDocument();

    // Item của tài liệu hiện tại PHẢI có mặt
    expect(within(inboxPanel).getByText(/Dataview query ngôn ngữ nâng cao cho Obsidian/i)).toBeInTheDocument();

    // Các item của tài liệu khác KHÔNG ĐƯỢC xuất hiện
    expect(within(inboxPanel).queryByText(/PORT=3005 npm run dev/i)).not.toBeInTheDocument();
    expect(within(inboxPanel).queryByText(/git checkout -b feature\/xyz/i)).not.toBeInTheDocument();
  });

  it('2. Tab Inbox counter and badge reflect ONLY current document unprocessed items', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-dataview"
          title="Hướng Dẫn Dataview"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Chuyển sang tab Inbox
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');

    // Counter của doc-dataview chỉ là 1 chưa xử lý (thay vì global 2)
    expect(within(inboxPanel).getByText('1 chưa xử lý')).toBeInTheDocument();
    expect(within(inboxPanel).queryByText('2 chưa xử lý')).not.toBeInTheDocument();
  });

  it('3. Tab Inbox displays empty state when active document has no inbox items, even if global inbox has items', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-without-inbox-items"
          title="Tài liệu không có Inbox"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Chuyển sang tab Inbox
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');

    // Phải hiển thị empty state
    expect(within(inboxPanel).getByText(/Inbox trống/i)).toBeInTheDocument();
    expect(within(inboxPanel).getByText('0 chưa xử lý')).toBeInTheDocument();
    expect(within(inboxPanel).queryByText(/Dataview query/i)).not.toBeInTheDocument();
    expect(within(inboxPanel).queryByText(/PORT=3005/i)).not.toBeInTheDocument();
  });
});
