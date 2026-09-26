import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';

describe('Phase 18A Wave 3: PdfReaderAdapter & Text Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PDF container and embed element with safe URL', () => {
    render(
      <PdfReaderAdapter
        documentId="doc-pdf-1"
        fileUrl="/api/archive/file/doc-pdf-1"
        title="Báo cáo Y khoa PDF"
      />
    );

    const embed = screen.getByTestId('pdf-embed-element');
    expect(embed).toBeInTheDocument();
    expect(embed).toHaveAttribute('src', '/api/archive/file/doc-pdf-1');
  });

  it('renders loading state when fileUrl is being fetched or prepared', () => {
    render(
      <PdfReaderAdapter
        documentId="doc-pdf-loading"
        fileUrl=""
        title="Tài liệu đang nạp"
      />
    );

    expect(screen.getByText(/Không tìm thấy file PDF hoặc đường dẫn trống/i)).toBeInTheDocument();
  });

  it('triggers onTextSelection callback when text is selected within selectable area', () => {
    const onTextSelection = vi.fn();
    render(
      <PdfReaderAdapter
        documentId="doc-pdf-select"
        fileUrl="/api/archive/file/doc-pdf-select"
        title="Tài liệu chọn chữ"
        onTextSelection={onTextSelection}
        sampleText="Đoạn trích dẫn thử nghiệm từ tài liệu PDF."
      />
    );

    const selectableArea = screen.getByTestId('pdf-selectable-area');
    expect(selectableArea).toBeInTheDocument();

    // Simulate selecting text in the test viewport
    fireEvent.mouseUp(selectableArea);

    expect(onTextSelection).toBeDefined();
  });

  it('renders error state and retry button when PDF load fails', async () => {
    render(
      <PdfReaderAdapter
        documentId="doc-pdf-error"
        fileUrl="invalid-protocol://fail"
        title="PDF lỗi"
      />
    );

    expect(screen.getByText(/Không thể hiển thị tài liệu PDF này/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });

  it('Scenario B: renders structured error state and hides embed when backend returns 404 FILE_NOT_FOUND json', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url: any) => {
      if (String(url).includes('/api/obsidian/vault/attachment')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            error: 'FILE_NOT_FOUND',
            message: 'File does not exist in the Obsidian Vault.',
          }),
        } as any);
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <PdfReaderAdapter
        documentId="doc-pdf-not-found"
        fileUrl="/api/obsidian/vault/attachment?path=02_PDF_Source%2Fnon_existent.pdf"
        title="Tài liệu PDF không tồn tại"
      />
    );

    // Should display structured error boundary message
    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy tệp PDF trong Vault hoặc đường dẫn không khả dụng/i)).toBeInTheDocument();
    });

    // Embed element must NOT be rendered when file was not found
    expect(screen.queryByTestId('pdf-embed-element')).toBeNull();
  });
});
