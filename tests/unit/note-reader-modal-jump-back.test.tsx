import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { DataContext } from '../../src/context/DataContext';
import type { Note, NoteCitationProvenance } from '../../src/types';

describe('note-reader-modal-jump-back', () => {
  const prov1: NoteCitationProvenance = {
    documentId: 'res-pdf-1',
    documentTitle: 'Tài Liệu Tâm Lý Học PDF',
    format: 'pdf',
    locator: 'page=15',
    excerptText: 'Đoạn trích trang 15 về nhận thức.',
  };

  const prov2: NoteCitationProvenance = {
    documentId: 'res-epub-2',
    documentTitle: 'Kinh Đại Niệm Xứ',
    format: 'epub',
    locator: 'epubcfi(/6/4[chap01]!/4/2/10)',
    excerptText: 'Đoạn trích về hơi thở vô ngã.',
  };

  const sampleNoteWithProvenances: Note = {
    id: 'note-provenance-1',
    topicId: 'topic-1',
    title: 'Ghi Chú Nghiên Cứu Đa Nguồn',
    content: 'Nội dung ghi chú tổng hợp từ 2 tài liệu.',
    type: 'study',
    isPrivate: false,
    tags: ['research', 'psychology'],
    citationProvenances: [prov1, prov2],
    createdAt: '2026-09-28T00:00:00.000Z',
    updatedAt: '2026-09-28T00:00:00.000Z',
  };

  const sampleLegacyNote: Note = {
    id: 'note-legacy-2',
    topicId: 'topic-1',
    title: 'Ghi Chú Cũ Không Metadata',
    content: 'Nội dung ghi chú cũ không có nguồn trích dẫn.',
    type: 'insight',
    isPrivate: false,
    tags: ['legacy'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockContextValue = {
    topics: [],
    openTopicDetail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render structured citation provenances section with count when note has provenances', () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteWithProvenances}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Section header
    expect(screen.getByText(/Nguồn trích dẫn & Khảo cứu \(2\)/i)).toBeInTheDocument();

    // Document titles and format badges
    expect(screen.getByText(/Tài Liệu Tâm Lý Học PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/Kinh Đại Niệm Xứ/i)).toBeInTheDocument();
  });

  it('should trigger onOpenArchiveLink with documentId and locator when clicking jump-back button', () => {
    const handleOpenArchive = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteWithProvenances}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onOpenArchiveLink={handleOpenArchive}
        />
      </DataContext.Provider>
    );

    // Click jump-back button for first source (PDF page=15)
    const jumpButtons = screen.getAllByRole('button', {
      name: /Xem vị trí trong tài liệu gốc/i,
    });
    expect(jumpButtons.length).toBe(2);

    fireEvent.click(jumpButtons[0]);

    expect(handleOpenArchive).toHaveBeenCalledWith('res-pdf-1', 'page=15');
  });

  it('should NOT render structured citation provenances section for legacy notes without provenances', () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <NoteReaderModal
          isOpen={true}
          note={sampleLegacyNote}
          onClose={vi.fn()}
          onEdit={vi.fn()}
        />
      </DataContext.Provider>
    );

    expect(
      screen.queryByText(/Nguồn trích dẫn & Khảo cứu/i)
    ).not.toBeInTheDocument();
  });
});
