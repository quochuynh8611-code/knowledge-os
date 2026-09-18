import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TargetNoteSelectorModal } from '../../src/components/reader/TargetNoteSelectorModal';
import { Note } from '../../src/types';

describe('Phase 18A Wave 3: Send Excerpt to Note Flow', () => {
  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-1',
      title: 'Ghi chú Lâm sàng',
      content: 'Nội dung cũ của ghi chú 1.',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'note-2',
      topicId: 'topic-2',
      title: 'Phác đồ Điều trị',
      content: 'Nội dung cũ của ghi chú 2.',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with list of available notes for selection', () => {
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={sampleNotes}
        selectedExcerptText="Trích đoạn nghiên cứu cần gửi."
        onSelectNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: /Chọn ghi chú đích/i })).toBeInTheDocument();
    expect(screen.getByText('Ghi chú Lâm sàng')).toBeInTheDocument();
    expect(screen.getByText('Phác đồ Điều trị')).toBeInTheDocument();
    expect(screen.getByText(/"Trích đoạn nghiên cứu cần gửi."/i)).toBeInTheDocument();
  });

  it('filters notes list based on search query', () => {
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={sampleNotes}
        selectedExcerptText="Trích đoạn nghiên cứu cần gửi."
        onSelectNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm ghi chú/i);
    fireEvent.change(searchInput, { target: { value: 'Phác đồ' } });

    expect(screen.getByText('Phác đồ Điều trị')).toBeInTheDocument();
    expect(screen.queryByText('Ghi chú Lâm sàng')).not.toBeInTheDocument();
  });

  it('calls onSelectNote callback when a note is chosen', () => {
    const onSelectNote = vi.fn();
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={sampleNotes}
        selectedExcerptText="Trích đoạn nghiên cứu cần gửi."
        onSelectNote={onSelectNote}
        onClose={vi.fn()}
      />
    );

    const noteItem = screen.getByText('Ghi chú Lâm sàng');
    fireEvent.click(noteItem);

    expect(onSelectNote).toHaveBeenCalledWith('note-1');
  });

  it('renders empty state when no notes match search query', () => {
    render(
      <TargetNoteSelectorModal
        isOpen={true}
        notes={sampleNotes}
        selectedExcerptText="Trích đoạn"
        onSelectNote={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm ghi chú/i);
    fireEvent.change(searchInput, { target: { value: 'Từ khóa không tồn tại' } });

    expect(screen.getByText(/Không tìm thấy ghi chú phù hợp/i)).toBeInTheDocument();
  });
});
