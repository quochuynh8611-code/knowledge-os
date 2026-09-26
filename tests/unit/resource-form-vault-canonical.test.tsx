import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { DataContext } from '../../src/context/DataContext';

describe('Resource Form Modal - Canonical Vault Contract Specification', () => {
  let mockAddResource: any;
  let mockUpdateResource: any;

  const mockContextValue = {
    topics: [{ id: 'top-1', title: 'Phật Học Cơ Bản', type: 'phat-hoc' }],
    categories: [{ id: 'cat-1', name: 'Phật Học', slug: 'phat-hoc', type: 'phat-hoc' }],
    notes: [],
    resources: [],
    tags: [],
    links: [],
    addResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
  };

  beforeEach(() => {
    mockAddResource = vi.fn();
    mockUpdateResource = vi.fn();
    mockContextValue.addResource = mockAddResource;
    mockContextValue.updateResource = mockUpdateResource;
  });

  it('1. Saves canonical openTarget and clean relative filePath when user inputs canonical vault path', async () => {
    render(
      <DataContext.Provider value={mockContextValue as any}>
        <ResourceFormModal isOpen={true} onClose={vi.fn()} />
      </DataContext.Provider>
    );

    // Switch to local mode
    const localBtn = screen.getByRole('button', { name: /Tệp trên máy/i });
    await userEvent.click(localBtn);

    // Input Title
    const titleInput = screen.getByPlaceholderText(/VD: Thắng Pháp Tập Yếu Luận/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Chánh Niệm Thực Tập PDF');

    // Input canonical Vault filePath
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i);
    await userEvent.clear(pathInput);
    await userEvent.type(pathInput, '02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');

    // Input canonical openTarget with explicit vaultId
    const openTargetInput = screen.getByPlaceholderText(/VD: drive\.google\.com/i);
    await userEvent.clear(openTargetInput);
    await userEvent.type(openTargetInput, 'vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Thêm Tài Liệu/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddResource).toHaveBeenCalledTimes(1);
    });

    const payload = mockAddResource.mock.calls[0][0];
    expect(payload.title).toBe('Chánh Niệm Thực Tập PDF');
    expect(payload.filePath).toBe('02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');
    expect(payload.openTarget).toBe('vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');
  });

  it('2. Normalizes vault: prefix in filePath into openTarget when editing a legacy resource', async () => {
    const existingResource = {
      id: 'res-legacy-1',
      topicId: 'top-1',
      topicTitle: 'Phật Học Cơ Bản',
      title: 'Chánh Niệm Cũ',
      type: 'pdf' as const,
      filePath: 'chanh_niem.pdf',
      openTarget: undefined,
      createdAt: '2026-09-01T00:00:00.000Z',
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <ResourceFormModal isOpen={true} onClose={vi.fn()} initialResource={existingResource} />
      </DataContext.Provider>
    );

    // Update path to canonical with vault prefix
    const pathInput = screen.getByPlaceholderText(/Đường dẫn tệp/i);
    await userEvent.clear(pathInput);
    await userEvent.type(pathInput, '02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');

    const openTargetInput = screen.getByPlaceholderText(/VD: drive\.google\.com/i);
    await userEvent.clear(openTargetInput);
    await userEvent.type(openTargetInput, 'vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');

    const submitBtn = screen.getByRole('button', { name: /Lưu Tài Liệu/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateResource).toHaveBeenCalledTimes(1);
    });

    const updatePayload = mockUpdateResource.mock.calls[0][1];
    expect(updatePayload.filePath).toBe('02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');
    expect(updatePayload.openTarget).toBe('vault:phat-hoc:02_PDF_Source/04_Thien_Hoc/chanh_niem.pdf');
  });
});
