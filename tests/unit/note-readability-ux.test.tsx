import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { NotesManager } from '../../src/components/notes/NotesManager';
import { NoteReaderModal } from '../../src/components/modals/NoteReaderModal';
import { Note, Topic } from '../../src/types';
import {
  toReadablePlainTextPreview,
  MarkdownReadabilityRenderer,
} from '../../src/lib/markdownReadability';

describe('Note Readability UX & Focus Reader Enhancements', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. toReadablePlainTextPreview() Cleaner Quality', () => {
    it('loại bỏ triệt để các ký tự markdown: headings, bold/italic, lists, blockquotes, pipes table, markdown links, images, code spans', () => {
      const complexMarkdown = `
# Phân Tích Kinh Tế Vi Mô
> Trích yếu từ tài liệu [Kinh Tế Học Cơ Bản](https://example.com/economics)
| Cung | Cầu | Giá Cả |
|:---|:---|:---|
| Tăng | Giảm | Giảm |
- [x] Đã khảo sát **thị trường cạnh tranh** và *hành vi người tiêu dùng*.
- Mục chi tiết với \`alpha = 0.05\`.
![Biểu đồ minh họa](https://example.com/chart.png)
Tham chiếu đến [[Kỳ Môn Độn Giáp|Kỳ Môn]] trong phương pháp định vị.
`;

      const plainText = toReadablePlainTextPreview(complexMarkdown);

      // Should not contain markdown noise
      expect(plainText).not.toContain('#');
      expect(plainText).not.toContain('**');
      expect(plainText).not.toContain('*hành vi');
      expect(plainText).not.toContain('|');
      expect(plainText).not.toContain('`');
      expect(plainText).not.toContain('[[');
      expect(plainText).not.toContain(']]');
      expect(plainText).not.toContain('https://example.com');
      expect(plainText).not.toContain('![');

      // Should contain clean human-readable prose
      expect(plainText).toContain('Phân Tích Kinh Tế Vi Mô');
      expect(plainText).toContain('Trích yếu từ tài liệu Kinh Tế Học Cơ Bản');
      expect(plainText).toContain('Cung Cầu Giá Cả');
      expect(plainText).toContain('thị trường cạnh tranh và hành vi người tiêu dùng');
      expect(plainText).toContain('alpha = 0.05');
      expect(plainText).toContain('Tham chiếu đến Kỳ Môn trong phương pháp định vị');
    });

    it('chuẩn hóa khoảng trắng gọn gàng, không để dòng trống thừa hay khoảng trắng liên tiếp', () => {
      const messySpacing = '  Đoạn 1   \n\n\n\n   Đoạn 2   với    nhiều   khoảng   trắng   \n\n';
      const cleaned = toReadablePlainTextPreview(messySpacing);
      expect(cleaned).toBe('Đoạn 1 Đoạn 2 với nhiều khoảng trắng');
    });
  });

  describe('2. MarkdownReadabilityRenderer Focus Reader Presentation', () => {
    const mockTopics: Topic[] = [
      {
        id: 'top-kinh-te-1',
        title: 'Kinh Tế & Tài Chính',
        slug: 'kinh-te-tai-chinh',
        categoryId: 'cat-root-kinh-te-tai-chinh',
        type: 'kinh-te-tai-chinh',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        tags: [],
        links: [],
        studyProgress: {
          topicId: 'top-kinh-te-1',
          status: 'in_progress',
          progress: 50,
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
      },
    ];

    it('render bảng Markdown thành table có thead, tbody sạch đẹp', () => {
      const tableContent = `
| Nhân Tố | Xu Hướng |
| --- | --- |
| Lãi suất | Giảm |
| Tín dụng | Mở rộng |
`;
      const { container } = render(
        <MarkdownReadabilityRenderer content={tableContent} topics={mockTopics} />
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      expect(screen.getByText('Nhân Tố')).toBeInTheDocument();
      expect(screen.getByText('Xu Hướng')).toBeInTheDocument();
      expect(screen.getByText('Lãi suất')).toBeInTheDocument();
      expect(screen.getByText('Mở rộng')).toBeInTheDocument();
    });

    it('render Markdown link [text](url) thành thẻ <a> có linkText và href', () => {
      const linkContent = 'Truy cập [Báo Cáo Nghiên Cứu](https://research.org/report) để xem chi tiết.';
      const { container } = render(
        <MarkdownReadabilityRenderer content={linkContent} topics={mockTopics} />
      );

      const linkEl = container.querySelector('a');
      expect(linkEl).toBeInTheDocument();
      expect(linkEl).toHaveAttribute('href', 'https://research.org/report');
      expect(screen.getByText('Báo Cáo Nghiên Cứu')).toBeInTheDocument();
      expect(container.textContent).not.toContain('](');
    });

    it('render Task list với check status trực quan', () => {
      const taskContent = `
- [x] Nhiệm vụ đã hoàn tất
- [ ] Nhiệm vụ đang chờ
`;
      const { container } = render(
        <MarkdownReadabilityRenderer content={taskContent} topics={mockTopics} />
      );

      expect(screen.getByText('Nhiệm vụ đã hoàn tất')).toBeInTheDocument();
      expect(screen.getByText('Nhiệm vụ đang chờ')).toBeInTheDocument();
      // Should not contain raw markdown checkbox symbols
      expect(container.textContent).not.toContain('- [x]');
      expect(container.textContent).not.toContain('- [ ]');
    });
  });

  describe('3. NotesManager Card Interaction & CTA Clarity', () => {
    const mockNote: Note = {
      id: 'note-sample-123',
      topicId: 'top-1',
      topicTitle: 'Kinh Tế Vĩ Mô',
      title: 'Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ',
      content: '# Khảo Sát Tổng Quan\n**Lạm phát** và *lãi suất* có quan hệ mật thiết.\n- [x] Đã phân tích quý 1.\nTham khảo [[Kinh Tế & Tài Chính]].',
      type: 'insight',
      tags: ['vi-mo', 'tien-te'],
      createdAt: '2026-08-15T08:00:00Z',
      updatedAt: '2026-08-15T08:00:00Z',
      isPrivate: false,
    };

    it('hiển thị preview plain-text sạch trên card và có nút CTA "Đọc tiếp" rõ ràng', () => {
      const TestContainer = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [],
                    topics: [{ id: 'top-1', title: 'Kinh Tế Vĩ Mô', slug: 'kinh-te-vi-mo', categoryId: 'cat-1', type: 'kinh-te', createdAt: '2026-08-01', updatedAt: '2026-08-01', studyProgress: { topicId: 'top-1', status: 'not_started', progress: 0 } }],
                    notes: [mockNote],
                    resources: [],
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed
            </button>
            <NotesManager />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestContainer />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed' }));

      // Note Title
      expect(screen.getByText('Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ')).toBeInTheDocument();

      // Clean preview without # or **
      expect(screen.getByText(/Khảo Sát Tổng Quan Lạm phát và lãi suất có quan hệ mật thiết/i)).toBeInTheDocument();

      // CTA Button "Đọc tiếp"
      const readBtn = screen.getByRole('button', { name: /Đọc tiếp ghi chú Khảo sát Chu Kỳ Kinh Tế/i });
      expect(readBtn).toBeInTheDocument();
      expect(readBtn).toHaveTextContent('Đọc tiếp');

      // Click "Đọc tiếp" opens NoteReaderModal
      fireEvent.click(readBtn);

      const modal = screen.getByRole('dialog', { name: 'Chi tiết ghi chú' });
      expect(modal).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Khảo sát Chu Kỳ Kinh Tế & Chính Sách Tiền Tệ' })).toBeInTheDocument();
    });

    it('bảo toàn các nút hành động Sửa và Xóa, không xung đột với nút Đọc tiếp', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const TestContainer = () => {
        const { importAllDataJSON } = useData();
        return (
          <div>
            <button
              onClick={() => {
                importAllDataJSON(
                  JSON.stringify({
                    categories: [],
                    topics: [],
                    notes: [mockNote],
                    resources: [],
                    tags: [],
                    links: [],
                  })
                );
              }}
            >
              Seed
            </button>
            <NotesManager />
          </div>
        );
      };

      render(
        <DataProvider>
          <TestContainer />
        </DataProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Seed' }));

      // Edit button opens edit modal
      const editBtn = screen.getByRole('button', { name: 'Sửa ghi chú' });
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);
      expect(screen.getByText('Chỉnh Sửa Ghi Chú')).toBeInTheDocument();

      // Close edit modal
      fireEvent.click(screen.getByRole('button', { name: /Hủy/i }));

      // Delete button triggers deletion
      const deleteBtn = screen.getByRole('button', { name: 'Xóa ghi chú' });
      expect(deleteBtn).toBeInTheDocument();
      fireEvent.click(deleteBtn);
      expect(confirmSpy).toHaveBeenCalledWith('Xóa ghi chú này?');

      confirmSpy.mockRestore();
    });
  });

  describe('4. NoteReaderModal Focus Reader Experience', () => {
    const mockNoteWithSource: Note = {
      id: 'note-focus-modal-1',
      topicId: 'top-1',
      topicTitle: 'Kinh Tế Vĩ Mô',
      title: 'Phân Tích Báo Cáo Tài Chính',
      content: '# Tổng Hợp\n> Luận điểm đầu tư bền vững.\n- Mục tiêu tăng trưởng 15%.\nTham chiếu [[Kỳ Môn Độn Giáp]].',
      type: 'insight',
      sourcePath: '/Users/research/Documents/finance-report.md',
      tags: ['tai-chinh', 'bao-cao'],
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
      isPrivate: false,
    };

    it('render khung đọc rộng (max-w-4xl), hiển thị sourcePath với nút chép, nút sao chép nội dung và nút đóng', () => {
      const handleClose = vi.fn();
      const handleEdit = vi.fn();

      render(
        <DataProvider>
          <NoteReaderModal
            isOpen={true}
            note={mockNoteWithSource}
            onClose={handleClose}
            onEdit={handleEdit}
          />
        </DataProvider>
      );

      const dialog = screen.getByRole('dialog', { name: 'Chi tiết ghi chú' });
      expect(dialog).toBeInTheDocument();
      expect(dialog.querySelector('.max-w-4xl')).toBeInTheDocument();

      // Title
      expect(screen.getByText('Phân Tích Báo Cáo Tài Chính')).toBeInTheDocument();

      // Source path
      expect(screen.getByText('/Users/research/Documents/finance-report.md')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Chép path/i })).toBeInTheDocument();

      // Copy content button
      expect(screen.getByRole('button', { name: /Sao chép nội dung/i })).toBeInTheDocument();

      // Edit action
      const editButtons = screen.getAllByRole('button', { name: /Chỉnh sửa/i });
      expect(editButtons.length).toBeGreaterThan(0);
      fireEvent.click(editButtons[0]);
      expect(handleEdit).toHaveBeenCalledWith(mockNoteWithSource);

      // Close action
      const closeButtons = screen.getAllByRole('button', { name: /Đóng/i });
      expect(closeButtons.length).toBeGreaterThan(0);
      fireEvent.click(closeButtons[0]);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
