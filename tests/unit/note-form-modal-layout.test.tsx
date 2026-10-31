import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { DataContext } from '../../src/context/DataContext';
import type { Note, NoteCitationProvenance } from '../../src/types';

describe('NoteFormModal - Layout Expansion & Focus Writing Mode', () => {
  const mockTopics = [
    {
      id: 'topic-1',
      title: 'Triết Học Nhận Thức',
      description: 'Chủ đề triết học',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'topic-2',
      title: 'Khoa Học Máy Tính',
      description: 'Chủ đề máy tính',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Triết Học',
      slug: 'triet-hoc',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderModal = (props: Partial<React.ComponentProps<typeof NoteFormModal>> = {}, addNoteMock = vi.fn(), updateNoteMock = vi.fn()) => {
    return render(
      <DataContext.Provider
        value={
          {
            categories: mockCategories,
            topics: mockTopics,
            addNote: addNoteMock,
            updateNote: updateNoteMock,
          } as any
        }
      >
        <NoteFormModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
          {...props}
        />
      </DataContext.Provider>
    );
  };

  it('1. Render modal với kích thước mở rộng max-w-5xl trên desktop và footer nằm ngoài scroll body', () => {
    renderModal();

    // Dialog form container phải có class max-w-5xl
    const formElement = screen.getByRole('dialog').querySelector('form');
    expect(formElement).not.toBeNull();
    expect(formElement?.className).toContain('max-w-5xl');

    // Nút Lưu và Hủy phải nằm trong footer riêng (shrink-0)
    const submitBtn = screen.getByRole('button', { name: /Tạo Ghi Chú/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn.getAttribute('type')).toBe('submit');

    const cancelBtn = screen.getByRole('button', { name: /Hủy bỏ/i });
    expect(cancelBtn).toBeInTheDocument();
    expect(cancelBtn.getAttribute('type')).toBe('button');
  });

  it('2. Chuyển đổi chế độ "Mở rộng vùng viết" không submit form và không làm mất bất kỳ dữ liệu nào', () => {
    const addNoteMock = vi.fn();
    renderModal({}, addNoteMock);

    // 1. Nhập tiêu đề và nội dung
    const titleInput = screen.getByPlaceholderText(/VD: Nhận định, tóm tắt/i) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: 'Bản thảo nghiên cứu chuyên sâu' } });

    const contentTextarea = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i) as HTMLTextAreaElement;
    fireEvent.change(contentTextarea, { target: { value: 'Nội dung phân tích rất dài...' } });

    // 2. Mở phần thông tin bổ sung và nhập thẻ + sourcePath
    const extraToggleBtn = screen.getByRole('button', { name: /Thông tin bổ sung/i });
    expect(extraToggleBtn.getAttribute('type')).toBe('button');
    fireEvent.click(extraToggleBtn);

    const tagInput = screen.getByPlaceholderText(/Nhập thẻ rồi nhấn Enter/i) as HTMLInputElement;
    fireEvent.change(tagInput, { target: { value: 'nhan-thuc-luan' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp Markdown nguồn/i) as HTMLInputElement;
    fireEvent.change(pathInput, { target: { value: 'notes/epistemology.md' } });

    // 3. Nhấn nút Mở rộng vùng viết
    const expandBtn = screen.getByRole('button', { name: /Mở rộng vùng viết/i });
    expect(expandBtn.getAttribute('type')).toBe('button');
    fireEvent.click(expandBtn);

    // Form tuyệt đối KHÔNG được submit khi click nút mở rộng
    expect(addNoteMock).not.toHaveBeenCalled();

    // Nút chuyển thành "Thu gọn vùng viết"
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn vùng viết/i });
    expect(collapseBtn.getAttribute('type')).toBe('button');

    // Tiêu đề và nội dung vẫn nguyên vẹn trong chế độ Focus
    expect(titleInput.value).toBe('Bản thảo nghiên cứu chuyên sâu');
    expect(contentTextarea.value).toBe('Nội dung phân tích rất dài...');

    // 4. Thu gọn lại về chế độ thường
    fireEvent.click(collapseBtn);
    expect(addNoteMock).not.toHaveBeenCalled();

    // Mọi dữ liệu đã nhập vẫn nguyên vẹn 100%
    expect(titleInput.value).toBe('Bản thảo nghiên cứu chuyên sâu');
    expect(contentTextarea.value).toBe('Nội dung phân tích rất dài...');
    expect(screen.getByText('nhan-thuc-luan')).toBeInTheDocument();
    expect(pathInput.value).toBe('notes/epistemology.md');
  });

  it('3. Textarea không bị remount khi toggle chế độ mở rộng (giữ nguyên DOM instance)', () => {
    renderModal();

    const textareaBefore = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i);
    const expandBtn = screen.getByRole('button', { name: /Mở rộng vùng viết/i });
    fireEvent.click(expandBtn);

    const textareaAfter = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i);
    // Phải là cùng 1 tham chiếu DOM node trong cây fiber, không bị unmount/remount
    expect(textareaBefore).toBe(textareaAfter);
  });

  it('4. Metadata summary hiển thị đúng số thẻ và trạng thái sourcePath khi thu gọn', () => {
    const initialNote: Note = {
      id: 'note-1',
      topicId: 'topic-1',
      title: 'Ghi chú có sẵn metadata',
      content: 'Nội dung ghi chú...',
      type: 'study',
      sourcePath: 'vault/research.md',
      tags: ['triet-hoc', 'nhan-thuc'],
      isPrivate: false,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    renderModal({ initialNote });

    // Khi mục thông tin bổ sung đang thu gọn, chỉ báo summary phản ánh đúng số thẻ và sourcePath
    expect(screen.getByText(/2 thẻ/i)).toBeInTheDocument();
    expect(screen.getByText(/Có tệp nguồn/i)).toBeInTheDocument();
  });

  it('5. Nút submit ở Footer ngoài scroll body kích hoạt submit form hợp lệ', () => {
    const addNoteMock = vi.fn().mockReturnValue('note-123');
    const onCloseMock = vi.fn();
    renderModal({ onClose: onCloseMock }, addNoteMock);

    const titleInput = screen.getByPlaceholderText(/VD: Nhận định, tóm tắt/i);
    fireEvent.change(titleInput, { target: { value: 'Tiêu đề kiểm thử submit' } });

    const contentTextarea = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i);
    fireEvent.change(contentTextarea, { target: { value: 'Nội dung kiểm thử submit...' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo Ghi Chú/i });
    fireEvent.click(submitBtn);

    expect(addNoteMock).toHaveBeenCalledTimes(1);
    expect(addNoteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Tiêu đề kiểm thử submit',
        content: 'Nội dung kiểm thử submit...',
      })
    );
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('6. Khi mở một phiên form mới, mặc định trở về chế độ thường', () => {
    const { rerender } = renderModal({ isOpen: true });

    // Bật focus mode
    const expandBtn = screen.getByRole('button', { name: /Mở rộng vùng viết/i });
    fireEvent.click(expandBtn);
    expect(screen.getByRole('button', { name: /Thu gọn vùng viết/i })).toBeInTheDocument();

    // Đóng form
    rerender(
      <DataContext.Provider value={{ categories: mockCategories, topics: mockTopics, addNote: vi.fn(), updateNote: vi.fn() } as any}>
        <NoteFormModal isOpen={false} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataContext.Provider>
    );

    // Mở lại form phiên mới
    rerender(
      <DataContext.Provider value={{ categories: mockCategories, topics: mockTopics, addNote: vi.fn(), updateNote: vi.fn() } as any}>
        <NoteFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataContext.Provider>
    );

    // Phải trở lại chế độ thường (hiển thị nút Mở rộng vùng viết)
    expect(screen.getByRole('button', { name: /Mở rộng vùng viết/i })).toBeInTheDocument();
  });

  it('8. Accordion "Thông tin bổ sung" có aria-expanded và aria-controls trỏ tới panel hợp lệ', () => {
    renderModal();

    const toggle = screen.getByRole('button', { name: /Thông tin bổ sung/i });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    const panelId = toggle.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    // Khi thu gọn, panel bị ẩn (hidden attribute) để loại khỏi tab order / accessibility tree
    expect(panel?.hasAttribute('hidden')).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hasAttribute('hidden')).toBe(false);
  });

  it('9. ID panel accordion là duy nhất khi có nhiều instance cùng lúc', () => {
    render(
      <DataContext.Provider
        value={{ categories: mockCategories, topics: mockTopics, addNote: vi.fn(), updateNote: vi.fn() } as any}
      >
        <NoteFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
        <NoteFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-2" />
      </DataContext.Provider>
    );

    const toggles = screen.getAllByRole('button', { name: /Thông tin bổ sung/i });
    expect(toggles).toHaveLength(2);
    const ids = toggles.map((t) => t.getAttribute('aria-controls'));
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('10. Nút focus mode có aria-pressed phản ánh trạng thái', () => {
    renderModal();

    const toggle = screen.getByRole('button', { name: /Mở rộng vùng viết/i });
    expect(toggle.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(toggle);
    const pressed = screen.getByRole('button', { name: /Thu gọn vùng viết/i });
    expect(pressed.getAttribute('aria-pressed')).toBe('true');
  });

  it('11. Focus mode dùng flex để textarea chiếm phần chiều cao còn lại (không chỉ đổi min-height)', () => {
    renderModal();

    const textarea = screen.getByPlaceholderText(/Nhập nội dung suy ngẫm/i);
    expect(textarea.className).not.toMatch(/(^|\s)flex-1(\s|$)/);

    fireEvent.click(screen.getByRole('button', { name: /Mở rộng vùng viết/i }));

    // Textarea giãn theo flex
    expect(textarea.className).toMatch(/(^|\s)flex-1(\s|$)/);
    // Container trực tiếp của textarea là flex column và được phép co giãn
    const wrapper = textarea.parentElement as HTMLElement;
    expect(wrapper.className).toMatch(/(^|\s)flex(\s|$)/);
    expect(wrapper.className).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(wrapper.className).toMatch(/(^|\s)flex-1(\s|$)/);
    expect(wrapper.className).toMatch(/(^|\s)min-h-0(\s|$)/);
    // Scroll body cũng là flex column để truyền chiều cao xuống
    const body = screen.getByTestId('note-form-body');
    expect(body.className).toMatch(/(^|\s)flex-col(\s|$)/);
    expect(body.className).toMatch(/(^|\s)min-h-0(\s|$)/);
  });

  it('7. Provenance info badge vẫn hiển thị đúng khi có initialProvenance', () => {
    const mockProvenance: NoteCitationProvenance = {
      documentId: 'doc-1',
      documentTitle: 'Chính Niệm',
      format: 'epub',
      locator: 'Trang 25',
      excerptText: 'Thở vào tâm tĩnh lặng',
    };

    renderModal({ initialProvenance: mockProvenance });
    expect(screen.getByText(/Chính Niệm/i)).toBeInTheDocument();
    expect(screen.getByText(/EPUB/i)).toBeInTheDocument();
    expect(screen.getByText(/Trang 25/i)).toBeInTheDocument();
  });
});
