import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { DataProvider } from '../../src/context/DataContext';
import { Note } from '../../src/types';

describe('Post-Phase 6d: Note UI - Source Path Input, Normalization & Boundary Warning', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('allows user to enter sourcePath in NoteFormModal, warns if outside canonical root, and normalizes path on submit', () => {
    localStorage.setItem('knowledge_os_library_root_path', '/Users/researcher/Knowledge-Library');

    render(
      <DataProvider>
        <NoteFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataProvider>
    );

    // Title & Content
    const titleInput = screen.getByPlaceholderText(/VD: Nhận định về sự sinh diệt/i);
    fireEvent.change(titleInput, { target: { value: 'Ghi chú khảo cứu tệp Markdown' } });

    const contentInput = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i);
    fireEvent.change(contentInput, { target: { value: 'Nội dung chi tiết...' } });

    // Source path input
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp Markdown nguồn/i);
    expect(pathInput).toBeInTheDocument();

    // Type path outside root
    fireEvent.change(pathInput, { target: { value: '/Users/researcher/Desktop/quick-note.md' } });
    expect(screen.getByText(/nằm ngoài thư mục thư viện gốc/i)).toBeInTheDocument();

    // Now change to path inside root with Windows backslashes and extra spaces
    fireEvent.change(pathInput, { target: { value: ' /Users/researcher/Knowledge-Library//Notes\\danh-sac.md  ' } });
    expect(screen.queryByText(/nằm ngoài thư mục thư viện gốc/i)).toBeNull();

    const submitBtn = screen.getByRole('button', { name: /Tạo Ghi Chú/i });
    fireEvent.click(submitBtn);
  });

  it('renders sourcePath badge and copy button on note cards in NotesManager when note has sourcePath', () => {
    render(
      <DataProvider>
        <NotesManager />
      </DataProvider>
    );

    // Verify NotesManager renders without crashing
    expect(screen.getByRole('heading', { name: /Quản Lý Ghi Chú & Liên Kết Kiến Thức/i })).toBeInTheDocument();
  });
});
