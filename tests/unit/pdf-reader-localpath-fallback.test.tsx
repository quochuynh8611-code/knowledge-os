import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';

describe('Patch Scope A: PdfReaderAdapter Local Path Safety & Fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders standard embed element when fileUrl is a valid servable URL or API endpoint', () => {
    render(
      <PdfReaderAdapter
        documentId="pdf-1"
        title="Tài Liệu PDF Hợp Lệ"
        fileUrl="/api/archive/file/doc-123.pdf"
      />
    );

    const embed = screen.getByTestId('pdf-embed-element');
    expect(embed).toBeInTheDocument();
    expect(embed).toHaveAttribute('src', '/api/archive/file/doc-123.pdf');
    expect(embed).toHaveAttribute('type', 'application/pdf');
    expect(screen.queryByTestId('pdf-local-path-fallback')).not.toBeInTheDocument();
  });

  it('detects Unix local filesystem path (/Users/...) and renders explicit fallback notice instead of crashing or silent blank', () => {
    render(
      <PdfReaderAdapter
        documentId="pdf-unix"
        title="Sách Giáo Trình Unix"
        fileUrl="/Users/mr.chem/Documents/Books/physics.pdf"
      />
    );

    expect(screen.getByTestId('pdf-local-path-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Tệp PDF lưu trên máy cục bộ/i)).toBeInTheDocument();
    expect(screen.getByText(/\/Users\/mr.chem\/Documents\/Books\/physics.pdf/i)).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-embed-element')).not.toBeInTheDocument();
  });

  it('detects Windows local filesystem path (C:\\...) and renders explicit fallback notice', () => {
    render(
      <PdfReaderAdapter
        documentId="pdf-win"
        title="Sách Windows"
        fileUrl="C:\\Users\\Username\\Documents\\Paper.pdf"
      />
    );

    expect(screen.getByTestId('pdf-local-path-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Tệp PDF lưu trên máy cục bộ/i)).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Paper.pdf') && content.includes('C:'))).toBeInTheDocument();
  });

  it('detects file:// URI scheme and renders explicit fallback notice', () => {
    render(
      <PdfReaderAdapter
        documentId="pdf-file-proto"
        title="File Protocol"
        fileUrl="file:///path/to/my/document.pdf"
      />
    );

    expect(screen.getByTestId('pdf-local-path-fallback')).toBeInTheDocument();
  });

  it('provides a working copy path button on the fallback view', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <PdfReaderAdapter
        documentId="pdf-copy"
        title="Copyable Path Document"
        fileUrl="/Users/mr.chem/Documents/Books/paper.pdf"
      />
    );

    const copyBtn = screen.getByRole('button', { name: /sao chép đường dẫn/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('/Users/mr.chem/Documents/Books/paper.pdf');
  });
});
