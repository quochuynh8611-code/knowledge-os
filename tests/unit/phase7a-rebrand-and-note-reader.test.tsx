import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navbar } from '../../src/components/layout/Navbar';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { ShortcutsModal } from '../../src/components/modals/ShortcutsModal';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { DataProvider } from '../../src/context/DataContext';
import { Note } from '../../src/types';

describe('Phase 7A: Nghiên Cứu Rebrand, Neutralized Copywriting & Focus Note Reader UX', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Navbar Branding & Surface Rebrand', () => {
    it('hiển thị nhận diện thương hiệu "Nghiên Cứu" và không còn hiển thị nhãn độc quyền "Knowledge OS"', () => {
      render(
        <DataProvider>
          <Navbar />
        </DataProvider>
      );

      // Title should be "Nghiên Cứu"
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Nghiên Cứu/i);
      expect(screen.queryByText('Knowledge OS')).toBeNull();

      // Subtitle should be neutralized
      expect(screen.getByText(/hệ thống hóa (kiến thức|tri thức) đa (lĩnh vực|môn)/i)).toBeInTheDocument();

      // Search placeholder should be neutralized
      expect(screen.getByPlaceholderText(/Tìm kiếm chủ đề, ghi chú, tài liệu, liên kết/i)).toBeInTheDocument();
    });
  });

  describe('2. Sidebar Navigation Neutralization', () => {
    it('hiển thị các nhãn điều hướng trung tính và phân nhóm rõ ràng', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Main Navigation items
      expect(screen.getByText('Tổng quan')).toBeInTheDocument();
      expect(screen.getByText(/AI Hỗ trợ/i)).toBeInTheDocument();
      expect(screen.getByText('Chủ đề học')).toBeInTheDocument();
      expect(screen.getByText('Bản đồ tri thức')).toBeInTheDocument();
      expect(screen.getByText(/Tiến độ/i)).toBeInTheDocument();
      expect(screen.getByText('Ghi chú')).toBeInTheDocument();
      expect(screen.getByText('Tài liệu')).toBeInTheDocument();
      expect(screen.getByText('Tìm kiếm')).toBeInTheDocument();

      // Specialized tools neutralized labels
      expect(screen.getByText('Ma trận phân tích')).toBeInTheDocument();
      expect(screen.getByText('Mô hình hệ thống')).toBeInTheDocument();
      expect(screen.getByText('Từ điển thuật ngữ')).toBeInTheDocument();

      // Section title
      expect(screen.getAllByText(/Học tập|Tri thức|Công cụ/i).length).toBeGreaterThan(0);
    });
  });

  describe('3. Shortcuts Modal Rebrand & Neutralization', () => {
    it('hiển thị thương hiệu "Nghiên Cứu" và copywriting trung tính', () => {
      render(<ShortcutsModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByText(/Nghiên Cứu • Hỗ trợ ghi nhớ khoa học \(SM-2\)/i)).toBeInTheDocument();
    });
  });

  describe('4. Focus Note Reader Modal Component & Interaction Safety', () => {
    const mockNote: Note = {
      id: 'test-note-1',
      topicId: 'topic-1',
      topicTitle: 'Phương Pháp Nghiên Cứu Khoa Học',
      title: 'Khảo cứu phương pháp học sâu và ghi chép Zettelkasten',
      content: 'Nội dung ghi chú chi tiết kết nối với [[Tâm Vương]] và lý thuyết tổng quát.',
      sourcePath: '/Users/researcher/Knowledge-Library/Notes/deep-learning.md',
      type: 'insight',
      isPrivate: false,
      tags: ['phuong-phap', 'zettelkasten'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('render đầy đủ tiêu đề lớn, phân loại, nội dung thoáng, wiki link và sourcePath', () => {
      const handleClose = vi.fn();
      const handleEdit = vi.fn();

      render(
        <DataProvider>
          <NoteReaderModal
            isOpen={true}
            note={mockNote}
            onClose={handleClose}
            onEdit={handleEdit}
          />
        </DataProvider>
      );

      // Title & Topic
      expect(screen.getByText('Khảo cứu phương pháp học sâu và ghi chép Zettelkasten')).toBeInTheDocument();
      expect(screen.getByText('Phương Pháp Nghiên Cứu Khoa Học')).toBeInTheDocument();

      // Content & Wiki link
      expect(screen.getByText(/Nội dung ghi chú chi tiết kết nối với/i)).toBeInTheDocument();

      // Source path
      expect(screen.getByText(/deep-learning\.md/i)).toBeInTheDocument();

      // Action buttons
      const editBtn = screen.getByRole('button', { name: /Chỉnh sửa/i });
      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledWith(mockNote);

      const closeButtons = screen.getAllByRole('button', { name: /Đóng/i });
      expect(closeButtons.length).toBeGreaterThan(0);
      fireEvent.click(closeButtons[0]);
      expect(handleClose).toHaveBeenCalled();
    });

    it('đóng modal khi nhấn phím Escape', () => {
      const handleClose = vi.fn();
      render(
        <DataProvider>
          <NoteReaderModal
            isOpen={true}
            note={mockNote}
            onClose={handleClose}
            onEdit={vi.fn()}
          />
        </DataProvider>
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('đóng modal khi click vào overlay nền nhưng KHÔNG đóng khi click bên trong panel', () => {
      const handleClose = vi.fn();
      render(
        <DataProvider>
          <NoteReaderModal
            isOpen={true}
            note={mockNote}
            onClose={handleClose}
            onEdit={vi.fn()}
          />
        </DataProvider>
      );

      const dialog = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
      
      // Click inside panel -> should not close
      const title = screen.getByText('Khảo cứu phương pháp học sâu và ghi chép Zettelkasten');
      fireEvent.click(title);
      expect(handleClose).not.toHaveBeenCalled();

      // Click on background overlay -> should close
      fireEvent.click(dialog);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. NotesManager Focus Reading & Bubble Prevention', () => {
    it('mở NoteReaderModal khi người dùng nhấp vào thẻ ghi chú', () => {
      render(
        <DataProvider>
          <NotesManager />
        </DataProvider>
      );

      // Header is neutralized
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Quản Lý Ghi Chú & Liên Kết Kiến Thức/i);

      // Find first note card and click it
      const noteTitles = screen.getAllByRole('heading', { level: 3 });
      expect(noteTitles.length).toBeGreaterThan(0);

      // Click on note card title
      fireEvent.click(noteTitles[0]);

      // Reader modal should now be open
      expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();
    });

    it('hành động Chỉnh sửa từ NoteReaderModal mở tiếp NoteFormModal', () => {
      render(
        <DataProvider>
          <NotesManager />
        </DataProvider>
      );

      const noteTitles = screen.getAllByRole('heading', { level: 3 });
      fireEvent.click(noteTitles[0]);

      // Reader is open
      expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();

      // Click "Chỉnh sửa" inside Reader
      const editInReaderBtn = screen.getByRole('button', { name: /Chỉnh sửa/i });
      fireEvent.click(editInReaderBtn);

      // Reader closes and NoteFormModal opens
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeNull();
      expect(screen.getByText(/Chỉnh Sửa Ghi Chú/i)).toBeInTheDocument();
    });
  });
});
