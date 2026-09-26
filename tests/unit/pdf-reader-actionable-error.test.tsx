import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';

describe('PDF Reader Adapter - Actionable Error Handling Specification', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Displays actionable error message and "Chỉnh sửa tài liệu" button when backend returns 404 FILE_NOT_FOUND', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: (h: string) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        error: 'FILE_NOT_FOUND',
        message: 'File does not exist in the Obsidian Vault.',
      }),
    });

    const onEditResourceMock = vi.fn();

    render(
      <PdfReaderAdapter
        documentId="vault:chanh_niem.pdf"
        fileUrl="/api/obsidian/vault/attachment?path=chanh_niem.pdf"
        title="Chánh Niệm Giảng Bằng Ngôn Ngữ Thông Thường"
        onEditResource={onEditResourceMock}
      />
    );

    // Verify error header
    await waitFor(() => {
      expect(screen.getByText(/Không thể hiển thị tài liệu PDF này/i)).toBeInTheDocument();
    });

    // Verify actionable advice or message
    expect(
      screen.getByText(/File does not exist in the Obsidian Vault|đường dẫn không khả dụng/i)
    ).toBeInTheDocument();

    // Verify actionable "Chỉnh sửa tài liệu" button exists and triggers callback
    const editBtn = screen.getByRole('button', { name: /Chỉnh sửa tài liệu/i });
    expect(editBtn).toBeInTheDocument();

    await userEvent.click(editBtn);
    expect(onEditResourceMock).toHaveBeenCalledTimes(1);
  });

  it('2. Shows actionable guidance text if no onEditResource callback is provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: (h: string) => (h === 'content-type' ? 'application/json' : null),
      },
      json: async () => ({
        error: 'FILE_NOT_FOUND',
        message: 'File does not exist in the Obsidian Vault.',
      }),
    });

    render(
      <PdfReaderAdapter
        documentId="vault:chanh_niem.pdf"
        fileUrl="/api/obsidian/vault/attachment?path=chanh_niem.pdf"
        title="Chánh Niệm"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Không thể hiển thị tài liệu PDF này/i)).toBeInTheDocument();
    });

    // Check actionable guidance is shown
    expect(
      screen.getByText(/vui lòng chỉnh sửa đường dẫn|cập nhật lại đường dẫn chuẩn/i)
    ).toBeInTheDocument();
  });
});
