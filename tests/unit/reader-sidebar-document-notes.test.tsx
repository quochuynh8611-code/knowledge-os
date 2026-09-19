import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note, ResearchInboxItem } from '../../src/types';

describe('Phase R2: Reader Sidebar Document-Scoped Notes', () => {
  const sampleMarkdownContent = `# Triết Học Khái Luận\n\n## Chương 1\nNội dung bài đọc.`;

  const sampleNotes: Note[] = [
    {
      id: 'note-target-1',
      topicId: 'topic-1',
      title: 'Ghi chú Trực tiếp từ Reader TargetNote',
      content: 'Ghi chú này được lưu trực tiếp từ selection modal.',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'note-uri-marker-2',
      topicId: 'topic-1',
      title: 'Ghi chú Có Chứa Archive URI Marker',
      content: 'Trích đoạn quan trọng: > Tồn tại là nhận thức.\n>\n> — [Xem tài liệu](archive://doc-triet-hoc)',
      type: 'insight',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:10:00.000Z',
      updatedAt: '2026-09-19T08:10:00.000Z',
    },
    {
      id: 'note-source-path-3',
      topicId: 'topic-1',
      title: 'Ghi chú File Markdown Nguồn',
      content: 'Ghi chú gắn với file nguồn tài liệu.',
      sourcePath: 'doc-triet-hoc',
      type: 'summary',
      isPrivate: false,
      tags: ['vault'],
      createdAt: '2026-09-19T08:20:00.000Z',
      updatedAt: '2026-09-19T08:20:00.000Z',
    },
    {
      id: 'note-title-fallback-4',
      topicId: 'topic-2',
      title: 'Ghi chú Khớp Heuristic Fallback Tiêu Đề',
      content: 'Trích đoạn cũ: > Vạn vật biến dịch.\n>\n> — *Triết Học Khái Luận*, tr. 10',
      type: 'study',
      isPrivate: false,
      tags: ['co-dien'],
      createdAt: '2026-09-19T08:30:00.000Z',
      updatedAt: '2026-09-19T08:30:00.000Z',
    },
    {
      id: 'note-unrelated-5',
      topicId: 'topic-99',
      title: 'Ghi chú Không Liên Quan Về Sinh Học',
      content: 'Nghiên cứu về cấu trúc tế bào thực vật và quang hợp.',
      type: 'study',
      isPrivate: false,
      tags: ['sinh-hoc'],
      createdAt: '2026-09-19T09:00:00.000Z',
      updatedAt: '2026-09-19T09:00:00.000Z',
    },
  ];

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-target-1',
        selectedText: 'Tồn tại là nhận thức.',
        positionSelector: { headingId: 'chuong-1' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Triết Học Khái Luận' },
        status: 'inbox',
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
      isProcessed: false,
      priority: 1,
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
  ];

  const mockContextValue = {
    notes: sampleNotes,
    researchInboxItems: sampleInboxItems,
    addExcerptToInbox: vi.fn(),
    dismissInboxItem: vi.fn(),
    processInboxItem: vi.fn(),
    unprocessedInboxCount: 1,
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

  it('2.1. filters notes by matching precedence: targetNoteId, archive URI, and sourcePath', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
    fireEvent.click(notesTabBtn);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    expect(notesPanel).toBeInTheDocument();

    // Verify matching notes are rendered
    expect(
      within(notesPanel).getByText('Ghi chú Trực tiếp từ Reader TargetNote')
    ).toBeInTheDocument();
    expect(
      within(notesPanel).getByText('Ghi chú Có Chứa Archive URI Marker')
    ).toBeInTheDocument();
    expect(
      within(notesPanel).getByText('Ghi chú File Markdown Nguồn')
    ).toBeInTheDocument();

    // Verify completely unrelated note is strictly excluded
    expect(
      within(notesPanel).queryByText('Ghi chú Không Liên Quan Về Sinh Học')
    ).not.toBeInTheDocument();
  });

  it('2.2. matches legacy notes via title-based heuristic fallback', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
    fireEvent.click(notesTabBtn);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');

    // Title fallback note should be included
    expect(
      within(notesPanel).getByText('Ghi chú Khớp Heuristic Fallback Tiêu Đề')
    ).toBeInTheDocument();
  });

  it('2.3. displays clean empty state when no notes in DataContext match the active document', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-thien-van-hoc"
          title="Thiên Văn Học Đại Cương"
          format="md"
          content="# Thiên Văn Học\nNội dung không có ghi chú liên quan."
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
    fireEvent.click(notesTabBtn);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');

    // Should render empty state message and zero note cards
    expect(
      within(notesPanel).getByText(/Chưa có ghi chú nào/i)
    ).toBeInTheDocument();
    expect(
      within(notesPanel).queryByText('Ghi chú Không Liên Quan Về Sinh Học')
    ).not.toBeInTheDocument();
  });
});
