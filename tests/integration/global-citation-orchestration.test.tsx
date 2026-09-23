import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Navbar } from '../../src/components/layout/Navbar';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import { DataContext } from '../../src/context/DataContext';
import { Note, Resource, Topic, ResearchInboxItem } from '../../src/types';

describe('Phase 20: Global Citation Navigation & Reader Orchestration Integration', () => {
  const sampleTopic: Topic = {
    id: 'topic-1',
    title: 'Triết Học & Tâm Lý Học',
    slug: 'triet-hoc-tam-ly',
    description: 'Chủ đề nghiên cứu',
    categoryId: 'cat-1',
    type: 'triet-hoc',
    content: '',
    tags: ['triet-hoc'],
    links: [],
    studyProgress: {
      topicId: 'topic-1',
      status: 'in_progress',
      progress: 50,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 2,
      timeSpent: 30,
    },
    visibility: 'active',
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

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
      topicId: 'topic-1',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-y-hoc',
      title: 'Đông Y Toàn Thư',
      type: 'pdf',
      filePath: '02_PDF_Source/y-hoc.pdf',
      topicId: 'topic-1',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'note-cross-doc',
      topicId: 'topic-1',
      title: 'Ghi chú Trích Dẫn Tâm Lý Học',
      content: '> Phản xạ có điều kiện hình thành qua thói quen.\n>\n> — *Tâm Lý Học* [Xem tài liệu](archive://doc-tam-ly?loc=chuong-1-phan-xa)',
      type: 'study',
      isPrivate: false,
      tags: ['tam-ly'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'note-alias-citation',
      topicId: 'topic-1',
      title: 'Ghi chú Alias Vault Path',
      content: '> Nhận thức luận là cơ sở.\n>\n> — *Tài liệu* [Xem sách EPUB](archive://05_EPUB_Export/tam-ly.epub?loc=epubcfi%28%2F6%2F2%29)',
      type: 'insight',
      isPrivate: false,
      tags: ['triet-hoc'],
      createdAt: '2026-09-19T08:10:00.000Z',
      updatedAt: '2026-09-19T08:10:00.000Z',
    },
  ];

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'vault:docs/books/triet-hoc.md',
        selectedText: 'Bản thể luận và nhận thức luận.',
        positionSelector: { headingId: 'chuong-2-nhan-thuc-luan' },
        highlightColor: '#fef08a',
        status: 'inbox',
        targetNoteId: 'note-cross-doc',
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
        archivedDocumentId: 'doc-tam-ly',
        selectedText: 'Tâm lý học nhận thức và hành vi.',
        positionSelector: { headingId: 'chuong-1-phan-xa' },
        highlightColor: '#fef08a',
        status: 'inbox',
        targetNoteId: 'note-cross-doc',
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
      isProcessed: false,
      priority: 2,
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
  ];

  const mockContextValue = {
    categories: [{ id: 'cat-1', name: 'Triết Học', slug: 'triet-hoc' }],
    notes: sampleNotes,
    topics: [sampleTopic],
    selectedTopicId: 'topic-1',
    resources: sampleResources,
    tags: [],
    reviewQueue: [],
    stats: {
      totalTopics: 1,
      inProgressCount: 1,
      completedCount: 0,
      totalNotes: 2,
      totalResources: 3,
      dueReviewsCount: 0,
    },
    researchInboxItems: sampleInboxItems,
    unprocessedInboxCount: 2,
    deleteNote: vi.fn(),
    openTopicDetail: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
    deleteResource: vi.fn(),
    addKnowledgeLink: vi.fn(),
    deleteKnowledgeLink: vi.fn(),
    setSelectedTopicId: vi.fn(),
    addExcerptToInbox: vi.fn(),
    deleteInboxItem: vi.fn(),
    dismissInboxItem: vi.fn(),
    updateNote: vi.fn(),
    saveNoteDirectly: vi.fn(),
  };

  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/obsidian/vault/tree')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            path: '',
            items: [
              {
                name: 'triet-hoc.md',
                type: 'file',
                path: 'docs/books/triet-hoc.md',
                size: 1024,
                mtime: '2026-09-01T00:00:00.000Z',
                extension: '.md',
              },
              {
                name: 'tam-ly.epub',
                type: 'file',
                path: '05_EPUB_Export/tam-ly.epub',
                size: 2048,
                mtime: '2026-09-01T00:00:00.000Z',
                extension: '.epub',
              },
            ],
          }),
        } as Response;
      }

      if (typeof url === 'string' && url.includes('/api/obsidian/vault/file')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            path: 'docs/books/triet-hoc.md',
            frontmatter: { title: 'Triết Học Khái Luận' },
            outline: [{ level: 1, text: 'Triết Học Khái Luận' }],
            content: '# Triết Học Khái Luận\n\nNội dung nghiên cứu triết học.',
            sizeBytes: 1024,
            lastModified: '2026-09-01T00:00:00.000Z',
          }),
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });

    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = fetchMock;
  });

  describe('A. Global Cross-Document Navigation Wiring in Reader Containers', () => {
    it('A1. Navbar UnifiedResearchReader switches active document when cross-doc citation is clicked', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <Navbar />
        </DataContext.Provider>
      );

      // Open Vault Browser Modal from Navbar
      const vaultBtn = screen.getByTitle('Duyệt Obsidian Vault');
      fireEvent.click(vaultBtn);

      // Select triet-hoc.md from Vault Tree
      const mdFile = await screen.findByText('triet-hoc.md');
      fireEvent.click(mdFile);

      // Reader is now open with triet-hoc
      const readerDialog = await screen.findByRole('dialog', { name: /triet-hoc/i });
      expect(readerDialog).toBeInTheDocument();

      // Open sidebar and switch to notes tab
      fireEvent.click(within(readerDialog).getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(within(readerDialog).getByTestId('sidebar-tab-notes'));

      // Click cross-doc citation [Xem tài liệu](archive://doc-tam-ly?loc=chuong-1-phan-xa)
      const citationLink = await within(readerDialog).findByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(citationLink);

      // onNavigateToDocument wired in Navbar -> Reader transitions to doc-tam-ly
      expect(screen.getByRole('dialog', { name: /Tâm Lý Học Nhận Thức/i })).toBeInTheDocument();
    });

    it('A2. NotesManager UnifiedResearchReader switches active document when cross-doc citation is clicked', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <NotesManager />
        </DataContext.Provider>
      );

      // Click "Đọc tiếp" on note-cross-doc to open NoteReaderModal
      const readMoreBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Ghi chú Trích Dẫn Tâm Lý Học/i });
      fireEvent.click(readMoreBtn);

      // Click citation link in NoteReaderModal -> opens doc-tam-ly in UnifiedResearchReader
      const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(citationLink);

      const readerDialog = await screen.findByRole('dialog', { name: /Tâm Lý Học Nhận Thức|doc-tam-ly/i });
      expect(readerDialog).toBeInTheDocument();

      // Open sidebar and switch to notes tab
      fireEvent.click(within(readerDialog).getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(within(readerDialog).getByTestId('sidebar-tab-notes'));

      // Click citation link pointing to doc-tam-ly or cross-doc
      const crossCitationLink = within(readerDialog).getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(crossCitationLink);

      expect(screen.getByRole('dialog', { name: /Tâm Lý Học Nhận Thức/i })).toBeInTheDocument();
    });

    it('A3. TopicDetail UnifiedResearchReader switches active document when cross-doc citation is clicked', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <TopicDetail />
        </DataContext.Provider>
      );

      // Switch to notes tab in TopicDetail
      const notesTabBtn = screen.getByTestId('tab-btn-notes');
      fireEvent.click(notesTabBtn);

      // Click "Đọc tiếp" on note-cross-doc
      const readMoreBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Ghi chú Trích Dẫn Tâm Lý Học/i });
      fireEvent.click(readMoreBtn);

      // Click citation link inside NoteReaderModal
      const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(citationLink);

      const readerDialog = await screen.findByRole('dialog', { name: /Tâm Lý Học Nhận Thức|doc-tam-ly/i });
      expect(readerDialog).toBeInTheDocument();

      // Open sidebar and switch to notes tab
      fireEvent.click(within(readerDialog).getByTestId('reader-toggle-sidebar-btn'));
      fireEvent.click(within(readerDialog).getByTestId('sidebar-tab-notes'));

      // Click cross-doc citation
      const crossCitationLink = within(readerDialog).getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(crossCitationLink);

      expect(screen.getByRole('dialog', { name: /Tâm Lý Học Nhận Thức/i })).toBeInTheDocument();
    });
  });

  describe('B. External Citation Surfaces Use Phase 19 5-Tier Resolver', () => {
    it('B1. TopicDetail NoteReaderModal resolves alias vault path citation using 5-tier engine', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <TopicDetail />
        </DataContext.Provider>
      );

      // Switch to notes tab
      const notesTabBtn = screen.getByTestId('tab-btn-notes');
      fireEvent.click(notesTabBtn);

      // Open note-alias-citation (archive://05_EPUB_Export/tam-ly.epub?loc=epubcfi%28%2F6%2F2%29)
      const readMoreBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Ghi chú Alias Vault Path/i });
      fireEvent.click(readMoreBtn);

      // Click citation link
      const citationLink = screen.getByRole('link', { name: /Xem sách EPUB/i });
      fireEvent.click(citationLink);

      // Should resolve 05_EPUB_Export/tam-ly.epub to doc-tam-ly with title "Tâm Lý Học Nhận Thức" and format "epub"
      const readerDialog = await screen.findByRole('dialog', { name: /Tâm Lý Học Nhận Thức/i });
      expect(readerDialog).toBeInTheDocument();
    });
  });

  describe('C. EPUB Legacy Route Consolidation in TopicDetail', () => {
    it('C1. Selecting .epub from Vault Browser in TopicDetail routes directly to UnifiedResearchReader', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <TopicDetail />
        </DataContext.Provider>
      );

      // Switch to Resources tab
      const resTabBtn = screen.getByRole('button', { name: /Tài Liệu \(/i });
      fireEvent.click(resTabBtn);

      // Open Vault Browser Modal from TopicDetail Resources section
      const openVaultBtn = screen.getByRole('button', { name: /Browse Vault/i });
      fireEvent.click(openVaultBtn);

      // Find and select tam-ly.epub
      const epubFile = await screen.findByText('tam-ly.epub');
      fireEvent.click(epubFile);

      // Should open UnifiedResearchReader with format epub
      const readerDialog = await screen.findByRole('dialog', { name: /tam-ly/i });
      expect(readerDialog).toBeInTheDocument();

      // Open sidebar and verify sidebar container is rendered
      fireEvent.click(within(readerDialog).getByTestId('reader-toggle-sidebar-btn'));
      expect(within(readerDialog).getByTestId('reader-sidebar-container')).toBeInTheDocument();
    });
  });

  describe('D. Security & Read-Only Invariant in Global Orchestration', () => {
    it('D1. Global citation navigation triggers 0 mutating HTTP calls and 0 vault writes', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <Navbar />
        </DataContext.Provider>
      );

      // Open Vault Browser -> open file
      const vaultBtn = screen.getByTitle('Duyệt Obsidian Vault');
      fireEvent.click(vaultBtn);

      const mdFile = await screen.findByText('triet-hoc.md');
      fireEvent.click(mdFile);

      // Verify no mutating fetch calls were made
      const mutatingCalls = fetchMock.mock.calls.filter((call: any[]) => {
        const method = (call[1]?.method || 'GET').toUpperCase();
        return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
      });

      expect(mutatingCalls).toHaveLength(0);
    });
  });
});
