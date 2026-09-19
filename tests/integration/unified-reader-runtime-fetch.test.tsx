import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';

describe('Patch Scope A: UnifiedResearchReader Runtime Fetch Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Markdown document end-to-end via fileUrl asynchronous fetching', async () => {
    const fakeMarkdown = '# Tiêu Đề Bài Báo Nghiên Cứu\n\nĐây là nội dung nghiên cứu thực nghiệm được tải tự động.';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ content: fakeMarkdown }),
      text: async () => JSON.stringify({ content: fakeMarkdown }),
    } as any);

    render(
      <UnifiedResearchReader
        documentId="doc-integration-1"
        title="Tài Liệu Nghiên Cứu Mới"
        format="md"
        fileUrl="/api/docs/content?path=research.md"
        onClose={vi.fn()}
      />
    );

    // Initial loading indicator
    expect(screen.getByTestId('markdown-reader-loading')).toBeInTheDocument();

    // After fetch resolves, content renders
    await waitFor(() => {
      expect(screen.getByText('Tiêu Đề Bài Báo Nghiên Cứu')).toBeInTheDocument();
    });
    expect(screen.getByText(/Đây là nội dung nghiên cứu thực nghiệm/i)).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-reader-loading')).not.toBeInTheDocument();
  });

  it('handles local PDF gracefully in UnifiedResearchReader without blank screen crash', () => {
    render(
      <UnifiedResearchReader
        documentId="pdf-integration-1"
        title="Tài Liệu PDF Cục Bộ"
        format="pdf"
        fileUrl="/Users/mr.chem/Documents/thesis.pdf"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('pdf-local-path-fallback')).toBeInTheDocument();
    expect(screen.getByText(/Tệp PDF lưu trên máy cục bộ/i)).toBeInTheDocument();
    expect(screen.getByText('Tài Liệu PDF Cục Bộ')).toBeInTheDocument();
  });
});
