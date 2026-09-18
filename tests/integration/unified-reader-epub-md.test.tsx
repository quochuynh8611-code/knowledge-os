import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';

// Mock react-reader for Epub adapter testing
vi.mock('react-reader', () => {
  return {
    ReactReader: vi.fn((props: any) => {
      if (props.url === 'invalid-epub') {
        throw new Error('Corrupted EPUB file');
      }
      return (
        <div data-testid="react-reader-mock" data-location={props.location}>
          <span>Mock EPUB Content</span>
          <button
            data-testid="mock-epub-next"
            onClick={() => props.locationChanged && props.locationChanged('epubcfi(/6/6[ch2]!/4/2:0)')}
          >
            Go Next
          </button>
        </div>
      );
    }),
  };
});

// Mock sanitizeEpubArchive
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe('Phase 18A Wave 2 Integration: UnifiedResearchReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(50),
      };
    }) as any;
  });

  const sampleMd = `
# Tổng quan Nghiên cứu
Nội dung phân tích tài liệu học thuật.

## 1. Phương pháp luận
Phương pháp nghiên cứu định tính và định lượng.

## 2. Kết luận
Đúc kết kết quả nghiên cứu.
`;

  it('renders Markdown adapter when format is md or markdown with correct header details', () => {
    const onClose = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-md-1"
        title="Tài liệu Nghiên cứu A"
        format="md"
        content={sampleMd}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: /Tài liệu Nghiên cứu A/i })).toBeInTheDocument();
    expect(screen.getByText(/MARKDOWN/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Tổng quan Nghiên cứu/i })).toBeInTheDocument();
    expect(screen.getByText(/Nội dung phân tích tài liệu học thuật/i)).toBeInTheDocument();
  });

  it('renders EPUB adapter when format is epub and loads reader view', async () => {
    const onClose = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-epub-1"
        title="Sách Chuyên Khảo B"
        format="epub"
        fileUrl="/api/archive/file/doc-epub-1"
        onClose={onClose}
      />
    );

    expect(screen.getByRole('heading', { level: 2, name: /Sách Chuyên Khảo B/i })).toBeInTheDocument();
    expect(screen.getByText(/EPUB/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('react-reader-mock')).toBeInTheDocument();
    });
  });

  it('toggles Table of Contents (TOC) drawer open and closed', async () => {
    render(
      <UnifiedResearchReader
        documentId="doc-md-toc"
        title="Tài liệu có mục lục"
        format="md"
        content={sampleMd}
        onClose={vi.fn()}
      />
    );

    const tocButton = screen.getByRole('button', { name: /Mục lục/i });
    expect(tocButton).toBeInTheDocument();

    // Open TOC
    fireEvent.click(tocButton);

    expect(screen.getByRole('dialog', { name: /Mục lục tài liệu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tổng quan Nghiên cứu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1. Phương pháp luận/i })).toBeInTheDocument();

    // Close TOC via close drawer button
    const closeDrawerBtn = screen.getByRole('button', { name: /Đóng mục lục/i });
    fireEvent.click(closeDrawerBtn);

    expect(screen.queryByRole('dialog', { name: /Mục lục tài liệu/i })).not.toBeInTheDocument();
  });

  it('navigates to heading when TOC item is clicked in Markdown mode', async () => {
    const onPositionChange = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-md-nav"
        title="Tài liệu chuyển mục"
        format="md"
        content={sampleMd}
        onPositionChange={onPositionChange}
        onClose={vi.fn()}
      />
    );

    // Open TOC
    fireEvent.click(screen.getByRole('button', { name: /Mục lục/i }));

    const section1Btn = screen.getByRole('button', { name: /1. Phương pháp luận/i });
    fireEvent.click(section1Btn);

    expect(onPositionChange).toHaveBeenCalledWith(expect.stringMatching(/1-phuong-phap-luan/));
  });

  it('handles and displays error state gracefully with retry action', async () => {
    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
      };
    }) as any;

    const onClose = vi.fn();
    render(
      <UnifiedResearchReader
        documentId="doc-fail"
        title="Tài liệu lỗi"
        format="epub"
        fileUrl="/api/archive/file/non-existent"
        onClose={onClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Thử lại/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('does NOT mount Wave 3 PDF viewer or Selection Toolbar in Wave 2 reader shell', () => {
    render(
      <UnifiedResearchReader
        documentId="doc-check-scope"
        title="Kiểm tra phạm vi Wave 2"
        format="md"
        content={sampleMd}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByTestId('pdf-reader-adapter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('selection-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Trích dẫn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Thêm vào Inbox/i)).not.toBeInTheDocument();
  });
});
