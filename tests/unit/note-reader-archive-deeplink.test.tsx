import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { DataContext } from '../../src/context/DataContext';
import { Note } from '../../src/types';

describe('Phase R3A.1: NoteReaderModal Archive Deeplink Navigation', () => {
  const sampleNoteWithCitation: Note = {
    id: 'note-1',
    topicId: 'topic-1',
    title: 'Ghi Chú Bản Thể Luận',
    content: `
# Nghiên cứu Bản thể luận

Trích đoạn quan trọng từ sách:
> Tồn tại là nhận thức.
>
> — *Triết Học Khái Luận*, tr. 42 [Xem tài liệu](archive://doc-triet-hoc?loc=42)
    `.trim(),
    type: 'study',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const sampleNoteNoLocator: Note = {
    id: 'note-2',
    topicId: 'topic-1',
    title: 'Ghi Chú Không Vị Trí Cụ Thể',
    content: `
> Trích đoạn chung.
>
> — *Nhận Thức Luận* [Mở sách](archive://doc-nhan-thuc)
    `.trim(),
    type: 'insight',
    isPrivate: false,
    tags: ['triet-hoc'],
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const mockContextValue = {
    topics: [],
    openTopicDetail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. renders archive citation as interactive link inside NoteReaderModal', () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteWithCitation}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      </DataContext.Provider>
    );

    const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
    expect(citationLink).toBeInTheDocument();
    expect(citationLink).toHaveAttribute('href', 'archive://doc-triet-hoc?loc=42');
  });

  it('2. clicking archive citation closes modal and triggers onOpenArchiveLink with documentId and locator', () => {
    const handleClose = vi.fn();
    const handleOpenArchive = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteWithCitation}
          onClose={handleClose}
          onEdit={vi.fn()}
          onOpenArchiveLink={handleOpenArchive}
        />
      </DataContext.Provider>
    );

    const citationLink = screen.getByRole('link', { name: /Xem tài liệu/i });
    fireEvent.click(citationLink);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenArchive).toHaveBeenCalledWith('doc-triet-hoc', '42');
  });

  it('3. clicking archive citation without locator passes undefined locator', () => {
    const handleClose = vi.fn();
    const handleOpenArchive = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteNoLocator}
          onClose={handleClose}
          onEdit={vi.fn()}
          onOpenArchiveLink={handleOpenArchive}
        />
      </DataContext.Provider>
    );

    const citationLink = screen.getByRole('link', { name: /Mở sách/i });
    fireEvent.click(citationLink);

    expect(handleClose).toHaveBeenCalled();
    expect(handleOpenArchive).toHaveBeenCalledWith('doc-nhan-thuc', undefined);
  });
});
