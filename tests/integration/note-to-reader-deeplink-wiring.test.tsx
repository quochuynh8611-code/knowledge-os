import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import { DataContext } from '../../src/context/DataContext';
import { Note, Topic, Resource } from '../../src/types';

describe('Phase R3A.2: Note to Reader Deep-Link Wiring in Owners', () => {
  const sampleNoteWithLocator: Note = {
    id: 'note-1',
    topicId: 'topic-1',
    title: 'Ghi chú Bản Thể Luận',
    content: 'Nội dung: > Tồn tại là nhận thức.\n>\n> — *Triết Học Khái Luận*, tr. 42 [Xem tài liệu](archive://doc-triet-hoc?loc=42)',
    type: 'study',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const sampleNoteWithHeading: Note = {
    id: 'note-2',
    topicId: 'topic-1',
    title: 'Ghi chú Tâm Lý Học',
    content: 'Nội dung: > Phản xạ có điều kiện.\n>\n> — *Tâm Lý Học* [Xem tài liệu](archive://doc-tam-ly?loc=chuong-2-phan-xa)',
    type: 'insight',
    isPrivate: false,
    tags: ['tam-ly'],
    createdAt: '2026-09-19T08:10:00.000Z',
    updatedAt: '2026-09-19T08:10:00.000Z',
  };

  const sampleTopic: Topic = {
    id: 'topic-1',
    title: 'Triết Học & Tâm Lý Học',
    slug: 'triet-hoc-tam-ly',
    description: 'Chủ đề tổng hợp',
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
      topicId: 'topic-1',
      title: 'doc-triet-hoc',
      type: 'book',
      filePath: '05_EPUB_Export/doc-triet-hoc.epub',
      url: '',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'doc-tam-ly',
      topicId: 'topic-1',
      title: 'doc-tam-ly',
      type: 'book',
      filePath: '05_EPUB_Export/doc-tam-ly.epub',
      url: '',
      createdAt: '2026-09-19T08:00:00.000Z',
    },
  ];

  const mockContextValue = {
    categories: [{ id: 'cat-1', name: 'Triết Học', slug: 'triet-hoc' }],
    notes: [sampleNoteWithLocator, sampleNoteWithHeading],
    topics: [sampleTopic],
    selectedTopicId: 'topic-1',
    resources: sampleResources,
    tags: [],
    deleteNote: vi.fn(),
    openTopicDetail: vi.fn(),
    updateTopic: vi.fn(),
    deleteTopic: vi.fn(),
    deleteResource: vi.fn(),
    addKnowledgeLink: vi.fn(),
    deleteKnowledgeLink: vi.fn(),
    setSelectedTopicId: vi.fn(),
    researchInboxItems: [],
    addExcerptToInbox: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. NotesManager wiring', () => {
    it('1.1. clicking archive citation inside NoteReaderModal in NotesManager opens UnifiedResearchReader with locator', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <NotesManager />
        </DataContext.Provider>
      );

      // Open NoteReaderModal by clicking "Đọc tiếp" on note 1
      const readMoreBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Ghi chú Bản Thể Luận/i });
      fireEvent.click(readMoreBtn);

      // NoteReaderModal is open
      expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();

      // Click the archive citation link
      const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(citationLink);

      // NoteReaderModal should be closed
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();

      // UnifiedResearchReader should be rendered with the active document
      const readerDialog = screen.getByRole('dialog', { name: /doc-triet-hoc/i });
      expect(readerDialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /doc-triet-hoc/i })).toBeInTheDocument();

      // Test closing reader
      const closeReaderBtn = within(readerDialog).getByRole('button', { name: /^Đóng$/i });
      fireEvent.click(closeReaderBtn);
      expect(screen.queryByRole('dialog', { name: /doc-triet-hoc/i })).not.toBeInTheDocument();
    });
  });

  describe('2. TopicDetail wiring', () => {
    it('2.1. clicking archive citation inside NoteReaderModal in TopicDetail opens UnifiedResearchReader with locator', async () => {
      render(
        <DataContext.Provider value={mockContextValue as any}>
          <TopicDetail />
        </DataContext.Provider>
      );

      // Switch to notes tab in TopicDetail
      const notesTabBtn = screen.getByTestId('tab-btn-notes');
      fireEvent.click(notesTabBtn);

      // Click "Đọc tiếp" on note 2
      const readMoreBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Ghi chú Tâm Lý Học/i });
      fireEvent.click(readMoreBtn);

      expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();

      // Click the archive citation link
      const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
      fireEvent.click(citationLink);

      // NoteReaderModal closed, UnifiedResearchReader opened
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();

      const readerDialog = screen.getByRole('dialog', { name: /doc-tam-ly/i });
      expect(readerDialog).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /doc-tam-ly/i })).toBeInTheDocument();

      // Test closing reader
      const closeReaderBtn = within(readerDialog).getByRole('button', { name: /^Đóng$/i });
      fireEvent.click(closeReaderBtn);
      expect(screen.queryByRole('dialog', { name: /doc-tam-ly/i })).not.toBeInTheDocument();
    });
  });
});
