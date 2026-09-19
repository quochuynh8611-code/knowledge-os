import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataProvider } from '../../src/context/DataContext';

describe('PDF Selection Affordance & Research Action Strip (Red Stage)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. PdfReaderAdapter renders PDF research action strip with clipboard button, manual quote button, and page input', () => {
    render(
      <PdfReaderAdapter
        documentId="pdf-doc-1"
        fileUrl="/api/archive/file/pdf-doc-1"
        title="Báo cáo Y khoa PDF"
        initialPage={5}
      />
    );

    expect(screen.getByTestId('pdf-research-action-strip')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-capture-clipboard-btn')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-manual-quote-btn')).toBeInTheDocument();
    
    const pageInput = screen.getByTestId('pdf-page-input') as HTMLInputElement;
    expect(pageInput).toBeInTheDocument();
    expect(Number(pageInput.value)).toBe(5);
  });

  it('2. clicking clipboard capture reads navigator.clipboard.readText() and calls onTextSelection with copied text and page', async () => {
    const onTextSelection = vi.fn();
    const mockClipboardText = 'Đoạn văn bản trích dẫn quan trọng từ tài liệu PDF.';
    
    Object.assign(navigator, {
      clipboard: {
        readText: vi.fn().mockResolvedValue(mockClipboardText),
      },
    });

    render(
      <PdfReaderAdapter
        documentId="pdf-doc-1"
        fileUrl="/api/archive/file/pdf-doc-1"
        title="Báo cáo Y khoa PDF"
        initialPage={3}
        onTextSelection={onTextSelection}
      />
    );

    const captureBtn = screen.getByTestId('pdf-capture-clipboard-btn');
    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(onTextSelection).toHaveBeenCalledWith(
        expect.objectContaining({
          text: mockClipboardText,
          page: 3,
          position: expect.objectContaining({
            top: expect.any(Number),
            left: expect.any(Number),
          }),
        })
      );
    });
  });

  it('3. if navigator.clipboard.readText() rejects or returns empty, manual quote fallback UI opens safely', async () => {
    const onTextSelection = vi.fn();
    
    Object.assign(navigator, {
      clipboard: {
        readText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    });

    render(
      <PdfReaderAdapter
        documentId="pdf-doc-1"
        fileUrl="/api/archive/file/pdf-doc-1"
        title="Báo cáo Y khoa PDF"
        initialPage={2}
        onTextSelection={onTextSelection}
      />
    );

    const captureBtn = screen.getByTestId('pdf-capture-clipboard-btn');
    fireEvent.click(captureBtn);

    // Fallback modal opens
    await waitFor(() => {
      expect(screen.getByTestId('pdf-manual-quote-modal')).toBeInTheDocument();
    });

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, {
      target: { value: 'Đoạn trích nhập thủ công từ PDF.' },
    });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    expect(onTextSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Đoạn trích nhập thủ công từ PDF.',
        page: 2,
      })
    );
  });

  it('4. UnifiedResearchReader with format="pdf" mounts UnifiedSelectionToolbar after PDF capture flow provides valid selection', async () => {
    const sampleCapturedText = 'Đoạn trích nghiên cứu từ tài liệu PDF qua clipboard.';
    Object.assign(navigator, {
      clipboard: {
        readText: vi.fn().mockResolvedValue(sampleCapturedText),
      },
    });

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-pdf-selection-test"
          title="Tài Liệu Nghiên Cứu PDF"
          format="pdf"
          fileUrl="/api/archive/file/doc-pdf-selection-test"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Initially toolbar should not be mounted
    expect(screen.queryByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).not.toBeInTheDocument();

    // Click clipboard capture
    const captureBtn = screen.getByTestId('pdf-capture-clipboard-btn');
    fireEvent.click(captureBtn);

    // UnifiedSelectionToolbar must mount with all research action buttons
    await waitFor(() => {
      const toolbar = screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
      expect(toolbar).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Highlight/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sao chép/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Trích dẫn/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Gửi vào ghi chú/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Thêm vào Inbox/i })).toBeInTheDocument();
    });
  });
});
