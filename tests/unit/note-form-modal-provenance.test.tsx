import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { DataContext } from '../../src/context/DataContext';
import type { NoteCitationProvenance } from '../../src/types';

describe('note-form-modal-provenance', () => {
  const mockTopics = [
    {
      id: 'topic-1',
      title: 'Phật Học Cơ Bản',
      description: 'Chủ đề nền tảng',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockInitialProvenance: NoteCitationProvenance = {
    documentId: 'doc-epub-1',
    documentTitle: 'Kinh Đại Niệm Xứ',
    format: 'epub',
    locator: 'epubcfi(/6/4[chap01]!/4/2/10)',
    excerptText: 'Chánh niệm trên thân trong thân.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render provenance info badge when initialProvenance is provided', () => {
    render(
      <DataContext.Provider
        value={
          {
            categories: [],
            topics: mockTopics,
            addNote: vi.fn(),
            updateNote: vi.fn(),
          } as any
        }
      >
        <NoteFormModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
          initialProvenance={mockInitialProvenance as any}
          initialContent="Chánh niệm trên thân trong thân."
        />
      </DataContext.Provider>
    );

    // Provenance badge preview should display document title and format
    expect(screen.getByText(/Kinh Đại Niệm Xứ/i)).toBeInTheDocument();
    expect(screen.getAllByText(/EPUB/i).length).toBeGreaterThanOrEqual(1);
  });

  it('should attach citationProvenances array when creating a new note with initialProvenance', () => {
    const addNoteMock = vi.fn().mockReturnValue('note-new-id-123');
    const handleClose = vi.fn();

    render(
      <DataContext.Provider
        value={
          {
            categories: [],
            topics: mockTopics,
            addNote: addNoteMock,
            updateNote: vi.fn(),
          } as any
        }
      >
        <NoteFormModal
          isOpen={true}
          onClose={handleClose}
          defaultTopicId="topic-1"
          initialProvenance={mockInitialProvenance as any}
          initialContent="Chánh niệm trên thân trong thân."
        />
      </DataContext.Provider>
    );

    // Enter note title
    const titleInput = screen.getByPlaceholderText(/VD: Nhận định về sự sinh diệt/i);
    fireEvent.change(titleInput, { target: { value: 'Ghi chú Tứ Niệm Xứ' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Tạo Ghi Chú/i });
    fireEvent.click(submitBtn);

    expect(addNoteMock).toHaveBeenCalledTimes(1);
    expect(addNoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ghi chú Tứ Niệm Xứ',
        topicId: 'topic-1',
        citationProvenances: [mockInitialProvenance],
      })
    );
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
