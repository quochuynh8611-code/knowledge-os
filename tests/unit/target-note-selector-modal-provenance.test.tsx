import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TargetNoteSelectorModal } from '../../src/components/reader/TargetNoteSelectorModal';
import { Note } from '../../src/types';

describe('target-note-selector-modal-provenance', () => {
  const mockNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-1',
      title: 'Ghi chú về Thiền Định',
      content: 'Nội dung thực hành thiền.',
      type: 'study',
      isPrivate: false,
      tags: ['meditation'],
      createdAt: '2026-09-28T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
    },
  ];

  it('should render "+ Tạo ghi chú mới từ trích đoạn" button when onCreateNewNote is provided', () => {
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={mockNotes}
        selectedExcerptText="Chánh niệm là con đường duy nhất."
        onSelectNote={vi.fn()}
        onCreateNewNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const createNewBtn = screen.getByRole('button', {
      name: /Tạo ghi chú mới từ trích đoạn/i,
    });
    expect(createNewBtn).toBeInTheDocument();
  });

  it('should not render "+ Tạo ghi chú mới từ trích đoạn" button when onCreateNewNote is omitted', () => {
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={mockNotes}
        selectedExcerptText="Chánh niệm là con đường duy nhất."
        onSelectNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('button', {
        name: /Tạo ghi chú mới từ trích đoạn/i,
      })
    ).not.toBeInTheDocument();
  });

  it('should trigger onCreateNewNote callback when clicking "+ Tạo ghi chú mới từ trích đoạn"', () => {
    const handleCreateNew = vi.fn();
    const handleSelectNote = vi.fn();

    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={mockNotes}
        selectedExcerptText="Chánh niệm là con đường duy nhất."
        onSelectNote={handleSelectNote}
        onCreateNewNote={handleCreateNew as any}
        onClose={vi.fn()}
      />
    );

    const createNewBtn = screen.getByRole('button', {
      name: /Tạo ghi chú mới từ trích đoạn/i,
    });
    fireEvent.click(createNewBtn);

    expect(handleCreateNew).toHaveBeenCalledTimes(1);
    expect(handleSelectNote).not.toHaveBeenCalled();
  });
});
