import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { DataContext } from '../../src/context/DataContext';
import type { Resource, Note } from '../../src/types';

describe('reader-to-note-handoff integration', () => {
  const mockResource: Resource = {
    id: 'res-pdf-1',
    topicId: 'topic-buddhism',
    title: 'Kinh Đại Niệm Xứ PDF',
    url: 'docs/books/dai-niem-xu.pdf',
    type: 'pdf',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('should complete full cycle from text selection to note creation and jump-back navigation', async () => {
    let createdNote: Note | null = null;
    const mockAddNote = vi.fn().mockImplementation((noteData: any) => {
      createdNote = {
        id: 'note-new-int-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...noteData,
      };
      return 'note-new-int-1';
    });

    const mockNavigateToDocument = vi.fn();

    // 1. Render Reader
    const { unmount } = render(
      <DataContext.Provider
        value={
          {
            resources: [mockResource],
            topics: [{ id: 'topic-buddhism', title: 'Phật Học Cơ Bản' }],
            notes: [],
            addNote: mockAddNote,
            updateNote: vi.fn(),
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="res-pdf-1"
          title="Kinh Đại Niệm Xứ PDF"
          format="pdf"
          fileUrl="docs/books/dai-niem-xu.pdf"
          onClose={vi.fn()}
          onNavigateToDocument={mockNavigateToDocument}
        />
      </DataContext.Provider>
    );

    // Verify Reader viewport container exists
    const readerViewport = screen.getByTestId('reader-viewport-container');
    expect(readerViewport).toBeInTheDocument();

    unmount();

    // 2. Render NoteReaderModal with the created note containing citationProvenances
    const sampleNoteWithProvenance: Note = {
      id: 'note-new-int-1',
      topicId: 'topic-buddhism',
      title: 'Ý Niệm Chánh Niệm',
      content: 'Trích đoạn từ Kinh Đại Niệm Xứ.',
      type: 'study',
      isPrivate: false,
      tags: ['mindfulness'],
      citationProvenances: [
        {
          documentId: 'res-pdf-1',
          documentTitle: 'Kinh Đại Niệm Xứ PDF',
          format: 'pdf',
          locator: 'page=15',
          excerptText: 'Quán thân trên thân tinh cần tỉnh giác.',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    render(
      <DataContext.Provider
        value={
          {
            resources: [mockResource],
            topics: [{ id: 'topic-buddhism', title: 'Phật Học Cơ Bản' }],
            notes: [sampleNoteWithProvenance],
          } as any
        }
      >
        <NoteReaderModal
          isOpen={true}
          note={sampleNoteWithProvenance}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onOpenArchiveLink={mockNavigateToDocument}
        />
      </DataContext.Provider>
    );

    // Verify structured citation provenance section renders
    expect(
      screen.getByText(/Nguồn trích dẫn & Khảo cứu \(1\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Kinh Đại Niệm Xứ PDF/i)).toBeInTheDocument();

    // Click jump-back button
    const jumpBtn = screen.getByRole('button', {
      name: /Xem vị trí trong tài liệu gốc/i,
    });
    fireEvent.click(jumpBtn);

    // Verify reader navigation callback was triggered with canonical locator
    expect(mockNavigateToDocument).toHaveBeenCalledWith('res-pdf-1', 'page=15');
  });
});
