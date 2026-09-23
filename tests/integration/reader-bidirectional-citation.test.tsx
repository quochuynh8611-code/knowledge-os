import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note, ResearchInboxItem, Resource } from '../../src/types';

describe('Phase 19 Suite B: ReaderSidebar Notes Tab Bidirectional Citation Navigation Integration', () => {
  const sampleMarkdownContent = `# Triết Học Khái Luận

## Chương 1: Bản Thể Luận
Bản thể luận nghiên cứu về tồn tại.

## Chương 2: Nhận Thức Luận
Nhận thức luận nghiên cứu về tri thức.
`;

  const sampleResources: Resource[] = [
    {
      id: 'doc-triet-hoc',
      title: 'Triết Học Khái Luận',
      type: 'md',
      filePath: 'docs/books/triet-hoc.md',
      topicId: 'topic-1',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-tam-ly',
      title: 'Tâm Lý Học Nhận Thức',
      type: 'book',
      filePath: '05_EPUB_Export/tam-ly.epub',
      topicId: 'topic-2',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-y-hoc',
      title: 'Đông Y Toàn Thư',
      type: 'pdf',
      filePath: '02_PDF_Source/y-hoc.pdf',
      topicId: 'topic-3',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'note-same-doc',
      topicId: 'topic-1',
      title: 'Ghi chú Bản thể luận',
      content: '> Nhận thức luận là cơ sở.\n>\n> — *Triết Học Khái Luận* [Xem tài liệu](archive://doc-triet-hoc?loc=chuong-2-nhan-thuc-luan)',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'note-cross-doc-epub',
      topicId: 'topic-1',
      title: 'Ghi chú Tâm lý học so sánh',
      content: '> Phản xạ có điều kiện hình thành qua tập tính.\n>\n> — *Tâm Lý Học Nhận Thức* [Mở sách Tâm Lý](archive://doc-tam-ly?loc=chuong-1-phan-xa)',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc', 'tam-ly'],
      createdAt: '2026-09-19T08:20:00.000Z',
      updatedAt: '2026-09-19T08:20:00.000Z',
    },
    {
      id: 'note-cross-doc-pdf',
      topicId: 'topic-1',
      title: 'Ghi chú Y học cổ truyền',
      content: '> Khí huyết điều hòa thân thể an khang.\n>\n> — *Đông Y Toàn Thư* [Xem sách Đông Y](archive://02_PDF_Source%2Fy-hoc.pdf?loc=42)',
      type: 'study',
      isPrivate: false,
      tags: ['y-hoc'],
      createdAt: '2026-09-19T08:30:00.000Z',
      updatedAt: '2026-09-19T08:30:00.000Z',
    },
    {
      id: 'note-unresolved',
      topicId: 'topic-1',
      title: 'Ghi chú Trích dẫn không tồn tại',
      content: '> Đoạn trích từ nguồn cũ.\n>\n> — *Tài liệu cổ* [Xem nguồn cũ](archive://doc-khong-ton-tai?loc=99)',
      type: 'study',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:40:00.000Z',
      updatedAt: '2026-09-19T08:40:00.000Z',
    },
  ];

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-same-doc',
        selectedText: 'Nhận thức luận là cơ sở.',
        positionSelector: { headingId: 'chuong-2-nhan-thuc-luan' },
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
    // Cross-doc notes were written while reading doc-triet-hoc (comparison notes)
    // They are scoped via Tier 1 (targetNoteId) so they appear in the sidebar
    {
      id: 'inbox-2',
      excerptId: 'excerpt-2',
      excerpt: {
        id: 'excerpt-2',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-cross-doc-epub',
        selectedText: 'Nhận thức luận so sánh với tâm lý học.',
        positionSelector: { headingId: 'chuong-1-ban-the-luan' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Triết Học Khái Luận' },
        status: 'inbox',
        createdAt: '2026-09-19T08:20:00.000Z',
        updatedAt: '2026-09-19T08:20:00.000Z',
      },
      isProcessed: false,
      priority: 2,
      createdAt: '2026-09-19T08:20:00.000Z',
      updatedAt: '2026-09-19T08:20:00.000Z',
    },
    {
      id: 'inbox-3',
      excerptId: 'excerpt-3',
      excerpt: {
        id: 'excerpt-3',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-cross-doc-pdf',
        selectedText: 'Khí huyết điều hòa và nhận thức.',
        positionSelector: { headingId: 'chuong-2-nhan-thuc-luan' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Triết Học Khái Luận' },
        status: 'inbox',
        createdAt: '2026-09-19T08:30:00.000Z',
        updatedAt: '2026-09-19T08:30:00.000Z',
      },
      isProcessed: false,
      priority: 3,
      createdAt: '2026-09-19T08:30:00.000Z',
      updatedAt: '2026-09-19T08:30:00.000Z',
    },
    {
      id: 'inbox-4',
      excerptId: 'excerpt-4',
      excerpt: {
        id: 'excerpt-4',
        archivedDocumentId: 'doc-triet-hoc',
        targetNoteId: 'note-unresolved',
        selectedText: 'Đoạn trích nguồn cũ cần đối chiếu.',
        positionSelector: { headingId: 'chuong-1-ban-the-luan' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Triết Học Khái Luận' },
        status: 'inbox',
        createdAt: '2026-09-19T08:40:00.000Z',
        updatedAt: '2026-09-19T08:40:00.000Z',
      },
      isProcessed: false,
      priority: 4,
      createdAt: '2026-09-19T08:40:00.000Z',
      updatedAt: '2026-09-19T08:40:00.000Z',
    },
  ];


  const mockContextValue = {
    notes: sampleNotes,
    resources: sampleResources,
    researchInboxItems: sampleInboxItems,
    addExcerptToInbox: vi.fn(),
    deleteInboxItem: vi.fn(),
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
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: new Headers({ 'content-type': 'application/json' }),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('B1.1. same-document markdown heading click scrolls smoothly to target heading', async () => {
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
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const link = within(notesPanel).getByRole('link', { name: /Xem tài liệu/i });
    expect(link).toHaveAttribute('href', 'archive://doc-triet-hoc?loc=chuong-2-nhan-thuc-luan');

    fireEvent.click(link);

    expect(handleClose).not.toHaveBeenCalled();
    expect(handlePositionChange).toHaveBeenCalledWith('chuong-2-nhan-thuc-luan');
    expect(screen.getByText(/Đã chuyển đến/i)).toBeInTheDocument();
  });

  it('B2.1. cross-document citation click resolves target document and triggers navigation without closing reader', async () => {
    const handleNavigateToDocument = vi.fn();
    const handleClose = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          onNavigateToDocument={handleNavigateToDocument}
          onClose={handleClose}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const epubLink = within(notesPanel).getByRole('link', { name: /Mở sách Tâm Lý/i });
    expect(epubLink).toBeInTheDocument();

    fireEvent.click(epubLink);

    expect(handleClose).not.toHaveBeenCalled();
    expect(handleNavigateToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-tam-ly',
        format: 'epub',
        initialPosition: 'chuong-1-phan-xa',
      })
    );
  });

  it('B2.2. canonical path cross-document resolution resolves PDF document from vault path', async () => {
    const handleNavigateToDocument = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          onNavigateToDocument={handleNavigateToDocument}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const pdfLink = within(notesPanel).getByRole('link', { name: /Xem sách Đông Y/i });
    expect(pdfLink).toBeInTheDocument();

    fireEvent.click(pdfLink);

    expect(handleNavigateToDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-y-hoc',
        format: 'pdf',
        initialPosition: '42',
      })
    );
  });

  it('B3.1. unresolved cross-document citation shows gentle toast without changing document or crashing', async () => {
    const handleNavigateToDocument = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-triet-hoc"
          title="Triết Học Khái Luận"
          format="md"
          content={sampleMarkdownContent}
          onNavigateToDocument={handleNavigateToDocument}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const unresolvedLink = within(notesPanel).getByRole('link', { name: /Xem nguồn cũ/i });
    expect(unresolvedLink).toBeInTheDocument();

    fireEvent.click(unresolvedLink);

    expect(handleNavigateToDocument).not.toHaveBeenCalled();
    expect(screen.getByText(/Không tìm thấy tài liệu nguồn tương ứng/i)).toBeInTheDocument();
  });
});
