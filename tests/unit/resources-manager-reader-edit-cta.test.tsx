import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { DataContext } from '../../src/context/DataContext';
import { Resource } from '../../src/types';

describe('ResourcesManager - Reader Edit CTA Integration Specification', () => {
  const originalFetch = global.fetch;

  const mockResource: Resource = {
    id: 'res-legacy-pdf-1',
    topicId: 'top-1',
    topicTitle: 'Phật Học Cơ Bản',
    title: 'Kinh Pháp Cú - Lời Phật Dạy',
    type: 'pdf',
    author: 'Narada Thera',
    filePath: 'kinh_phap_cu_-_loi_phat_day_dhammapada.pdf',
    openTarget: undefined,
    url: undefined,
    notes: 'Bản dịch Dhammapada tuyển tập',
    createdAt: '2026-09-20T10:00:00.000Z',
  };

  const mockContextValue = {
    topics: [{ id: 'top-1', title: 'Phật Học Cơ Bản', type: 'phat-hoc' }],
    categories: [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc', type: 'phat-hoc' }],
    notes: [],
    resources: [mockResource],
    tags: [],
    links: [],
    addResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('1. Clicking "Xem trước" opens reader, and clicking "Chỉnh sửa tài liệu" in reader closes reader and opens ResourceFormModal in edit mode', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <ResourcesManager />
      </DataContext.Provider>
    );

    // Verify resource card exists
    expect(screen.getByText('Kinh Pháp Cú - Lời Phật Dạy')).toBeInTheDocument();

    // Click "Xem trước" button
    const previewBtn = screen.getByRole('button', { name: /Xem trước/i });
    await userEvent.click(previewBtn);

    // Verify UnifiedResearchReader / PdfReaderAdapter is open with error state
    await waitFor(() => {
      expect(screen.getByText(/Không thể hiển thị tài liệu PDF này/i)).toBeInTheDocument();
    });

    const editCtaBtn = screen.getByRole('button', { name: /Chỉnh sửa tài liệu/i });
    expect(editCtaBtn).toBeInTheDocument();

    // Click "Chỉnh sửa tài liệu" CTA button
    await userEvent.click(editCtaBtn);

    // Expect reader to be closed (error header gone)
    await waitFor(() => {
      expect(screen.queryByText(/Không thể hiển thị tài liệu PDF này/i)).not.toBeInTheDocument();
    });

    // Expect ResourceFormModal to be open in Edit mode with resource details
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Lưu Tài Liệu/i })).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i) as HTMLInputElement;
    expect(titleInput.value).toBe('Kinh Pháp Cú - Lời Phật Dạy');

    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i) as HTMLInputElement;
    expect(pathInput.value).toBe('kinh_phap_cu_-_loi_phat_day_dhammapada.pdf');
  });
});
