import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note, ResearchInboxItem } from '../../src/types';

describe('Phase R3B: Reader Sidebar In-Reader Note Citation Jump', () => {
  const sampleMarkdownContent = `# Triết Học Khái Luận

## Chương 1: Bản Thể Luận
Bản thể luận nghiên cứu về tồn tại.

## Chương 2: Nhận Thức Luận
Nhận thức luận nghiên cứu về tri thức.
`;

  const sampleNotes: Note[] = [
    {
      id: 'note-same-doc-loc',
      topicId: 'topic-1',
      title: 'Ghi chú Trích dẫn Cùng Tài liệu có Locator',
      content: '> Nhận thức luận là cơ sở của tri thức.\n>\n> — *Triết Học Khái Luận* [Xem tài liệu](archive://doc-triet-hoc?loc=chuong-2-nhan-thuc-luan)',
      type: 'insight',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'note-same-doc-no-loc',
      topicId: 'topic-1',
      title: 'Ghi chú Trích dẫn Cùng Tài liệu không Locator',
      content: '> Tồn tại là nhận thức.\n>\n> — *Triết Học Khái Luận* [Xem tài liệu](archive://doc-triet-hoc)',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:10:00.000Z',
      updatedAt: '2026-09-19T08:10:00.000Z',
    },
    {
      id: 'note-cross-doc',
      topicId: 'topic-1',
      title: 'Ghi chú Trích dẫn Khác Tài liệu',
      content: '> Phản xạ có điều kiện hình thành qua tập tính.\n>\n> — *Tâm Lý Học* [Xem tài liệu](archive://doc-tam-ly?loc=chuong-1-phan-xa)',
      type: 'study',
      isPrivate: false,
      tags: ['tam-ly'],
      createdAt: '2026-09-19T08:20:00.000Z',
      updatedAt: '2026-09-19T08:20:00.000Z',
    },
  ];

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-cross-doc', // Binding note-cross-doc to active doc scope for testing
        selectedText: 'Tồn tại là nhận thức.',
        positionSelector: { headingId: 'chuong-1-ban-the-luan' },
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

  describe('1. Same-Document Note Citation Jump', () => {
    it('1.1. clicking a same-document archive citation with locator triggers in-reader jump without closing reader', async () => {
      const handlePositionChange = vi.fn();
      const handleClose = vi.fn();

      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            onPositionChange={handlePositionChange}
            onClose={handleClose}
          />
        </DataContext.Provider>
      );

      // Open sidebar and switch to notes tab
      const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
      fireEvent.click(toggleSidebarBtn);

      const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
      fireEvent.click(notesTabBtn);

      const notesPanel = screen.getByTestId('sidebar-panel-notes');
      expect(notesPanel).toBeInTheDocument();

      // Find interactive citation link inside note
      const citationLinks = within(notesPanel).getAllByRole('link', {
        name: /Xem tài liệu/i,
      });
      const citationLink = citationLinks.find(
        (link) => link.getAttribute('href') === 'archive://doc-triet-hoc?loc=chuong-2-nhan-thuc-luan'
      );
      expect(citationLink).toBeInTheDocument();

      // Click citation
      fireEvent.click(citationLink!);

      // Assertions
      expect(handleClose).not.toHaveBeenCalled();
      expect(handlePositionChange).toHaveBeenCalledWith('chuong-2-nhan-thuc-luan');
      expect(screen.getByText(/Đã chuyển đến/i)).toBeInTheDocument();
    });

    it('1.2. clicking a same-document archive citation without locator is a safe no-op and keeps reader open', async () => {
      const handlePositionChange = vi.fn();
      const handleClose = vi.fn();

      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            onPositionChange={handlePositionChange}
            onClose={handleClose}
          />
        </DataContext.Provider>
      );

      const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
      fireEvent.click(toggleSidebarBtn);

      const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
      fireEvent.click(notesTabBtn);

      const notesPanel = screen.getByTestId('sidebar-panel-notes');
      const citationLinks = within(notesPanel).getAllByRole('link', {
        name: /Xem tài liệu/i,
      });
      // The second note has archive://doc-triet-hoc (no locator)
      const noLocLink = citationLinks.find(
        (link) => link.getAttribute('href') === 'archive://doc-triet-hoc'
      );
      expect(noLocLink).toBeInTheDocument();

      fireEvent.click(noLocLink!);

      expect(handleClose).not.toHaveBeenCalled();
      expect(handlePositionChange).not.toHaveBeenCalled();
      expect(screen.getByText(/Đang ở tài liệu hiện tại/i)).toBeInTheDocument();
    });
  });

  describe('2. Cross-Document Citation Graceful Degradation', () => {
    it('2.1. clicking a cross-document citation displays a helpful toast without breaking or closing the reader', async () => {
      const handlePositionChange = vi.fn();
      const handleClose = vi.fn();

      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            onPositionChange={handlePositionChange}
            onClose={handleClose}
          />
        </DataContext.Provider>
      );

      const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
      fireEvent.click(toggleSidebarBtn);

      const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
      fireEvent.click(notesTabBtn);

      const notesPanel = screen.getByTestId('sidebar-panel-notes');
      const citationLinks = within(notesPanel).getAllByRole('link', {
        name: /Xem tài liệu/i,
      });
      const crossDocLink = citationLinks.find((link) =>
        link.getAttribute('href')?.startsWith('archive://doc-tam-ly')
      );
      expect(crossDocLink).toBeInTheDocument();

      fireEvent.click(crossDocLink!);

      expect(handleClose).not.toHaveBeenCalled();
      expect(handlePositionChange).not.toHaveBeenCalled();
      // Phase 19: no resources in DataContext → resolver returns null → safe fallback toast
      expect(screen.getByText(/Không tìm thấy tài liệu nguồn tương ứng/i)).toBeInTheDocument();
    });
  });

  describe('3. Phase 21A: Citation Backlinks Explorer in ReaderSidebar Notes Tab', () => {
    it('3.1. renders backlinks subsection in Notes tab for notes citing active document', async () => {
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

      // Open Sidebar -> Notes Tab
      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

      // Check for Backlinks subsection
      const backlinksSection = await screen.findByTestId('sidebar-backlinks-section');
      expect(backlinksSection).toBeInTheDocument();

      // Should display matching notes with citation counts
      expect(within(backlinksSection).getByText('Ghi chú Trích dẫn Cùng Tài liệu có Locator')).toBeInTheDocument();
      expect(within(backlinksSection).getByText('Ghi chú Trích dẫn Cùng Tài liệu không Locator')).toBeInTheDocument();
      // Should exclude note-cross-doc which only cites doc-tam-ly
      expect(within(backlinksSection).queryByText('Ghi chú Trích dẫn Khác Tài liệu')).not.toBeInTheDocument();
    });

    it('3.2. displays explanatory empty state when no notes cite the active document', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-unrelated-new"
            title="Tài Liệu Mới Hoàn Toàn"
            format="md"
            content={sampleMarkdownContent}
            onClose={vi.fn()}
          />
        </DataContext.Provider>
      );

      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

      const backlinksSection = await screen.findByTestId('sidebar-backlinks-section');
      expect(backlinksSection).toBeInTheDocument();
      expect(within(backlinksSection).getByText(/Chưa có ghi chú nào trích dẫn tài liệu này/i)).toBeInTheDocument();
    });

    it('3.3. clicking backlink opens note context while preserving active document and position', async () => {
      const handlePositionChange = vi.fn();

      render(
        <DataContext.Provider value={mockContextValue as any}>
          <UnifiedResearchReader
            documentId="doc-triet-hoc"
            title="Triết Học Khái Luận"
            format="md"
            content={sampleMarkdownContent}
            initialPosition="chuong-1"
            onPositionChange={handlePositionChange}
            onClose={vi.fn()}
          />
        </DataContext.Provider>
      );

      fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

      const backlinksSection = await screen.findByTestId('sidebar-backlinks-section');
      const backlinkItem = within(backlinksSection).getByText('Ghi chú Trích dẫn Cùng Tài liệu có Locator');
      fireEvent.click(backlinkItem);

      // Verify NoteReaderModal opened with the note title
      const noteModal = await screen.findByRole('dialog', { name: /Chi tiết ghi chú/i });
      expect(noteModal).toBeInTheDocument();
      expect(within(noteModal).getByText('Ghi chú Trích dẫn Cùng Tài liệu có Locator')).toBeInTheDocument();

      // Verify main reader is still present with active document
      const readerDialog = screen.getByRole('dialog', { name: /Triết Học Khái Luận/i });
      expect(readerDialog).toBeInTheDocument();

      // Position should not be mutated/reset
      expect(handlePositionChange).not.toHaveBeenCalled();
    });
  });
});
