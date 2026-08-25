import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { DataProvider } from '../../src/context/DataContext';

describe('Post-Phase 6c: ResourceFormModal - Path Normalization, Validation & Boundary Warning UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes local filePath on submission', async () => {
    render(
      <DataProvider>
        <ResourceFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataProvider>
    );

    // Switch to local mode
    const localBtn = screen.getByRole('button', { name: /Tệp trên máy/i });
    fireEvent.click(localBtn);

    // Fill title
    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    fireEvent.change(titleInput, { target: { value: 'Luận Câu Xá Bản Mới' } });

    // Fill unnormalized filePath with Windows backslashes and spaces
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i);
    fireEvent.change(pathInput, { target: { value: ' D:\\Library\\PDF\\\\kosa.pdf  ' } });

    const submitBtn = screen.getByRole('button', { name: /Thêm Tài Liệu/i });
    fireEvent.click(submitBtn);

    // Verify submission succeeds
    expect(screen.queryByText(/Đường dẫn tệp không được để trống/i)).toBeNull();
  });

  it('shows validation error when local mode filePath is empty or only whitespace', () => {
    render(
      <DataProvider>
        <ResourceFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataProvider>
    );

    // Switch to local mode
    const localBtn = screen.getByRole('button', { name: /Tệp trên máy/i });
    fireEvent.click(localBtn);

    // Fill title
    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    fireEvent.change(titleInput, { target: { value: 'Sách Không Có Đường Dẫn' } });

    // Clear filePath
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i);
    fireEvent.change(pathInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Thêm Tài Liệu/i });
    fireEvent.click(submitBtn);

    // Expect validation message to appear
    expect(screen.getByText(/Vui lòng nhập đường dẫn tệp cục bộ hợp lệ/i)).toBeInTheDocument();
  });

  it('displays warning callout when filePath is outside configured canonical library root', () => {
    localStorage.setItem('knowledge_os_library_root_path', '/Users/researcher/Knowledge-Library');

    render(
      <DataProvider>
        <ResourceFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
      </DataProvider>
    );

    // Switch to local mode
    const localBtn = screen.getByRole('button', { name: /Tệp trên máy/i });
    fireEvent.click(localBtn);

    // Fill path outside root
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i);
    fireEvent.change(pathInput, { target: { value: '/Users/researcher/Downloads/study.pdf' } });

    // Expect outside warning
    expect(screen.getByText(/nằm ngoài thư mục thư viện gốc/i)).toBeInTheDocument();
  });
});
