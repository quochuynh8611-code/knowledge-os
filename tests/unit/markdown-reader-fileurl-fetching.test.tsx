import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MarkdownReaderAdapter } from '../../src/components/reader/adapters/MarkdownReaderAdapter';

describe('Patch Scope A: MarkdownReaderAdapter Async fileUrl Fetching', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders provided content immediately without triggering fetch (content precedence)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <MarkdownReaderAdapter
        documentId="doc-1"
        content={'# Tiêu Đề Trực Tiếp\n\nNội dung có sẵn.'}
        fileUrl="/api/docs/content?path=direct.md"
      />
    );

    expect(screen.getByText('Tiêu Đề Trực Tiếp')).toBeInTheDocument();
    expect(screen.getByText('Nội dung có sẵn.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('displays loading spinner and fetches content from JSON endpoint when only fileUrl is provided', async () => {
    const fakeJson = {
      content: '# Tài Liệu Từ JSON API\nNội dung được nạp từ máy chủ.',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => fakeJson,
      text: async () => JSON.stringify(fakeJson),
    } as any);

    const onTocGenerated = vi.fn();

    render(
      <MarkdownReaderAdapter
        documentId="doc-json"
        fileUrl="/api/docs/content?path=spec.md"
        onTocGenerated={onTocGenerated}
      />
    );

    // Shows loading indicator initially
    expect(screen.getByTestId('markdown-reader-loading')).toBeInTheDocument();

    // Resolves and renders content
    await waitFor(() => {
      expect(screen.getByText('Tài Liệu Từ JSON API')).toBeInTheDocument();
    });
    expect(screen.getByText('Nội dung được nạp từ máy chủ.')).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-reader-loading')).not.toBeInTheDocument();

    // Verify TOC generated from fetched markdown
    expect(onTocGenerated).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Tài Liệu Từ JSON API',
          level: 1,
        }),
      ])
    );
  });

  it('displays loading spinner and fetches content from plain text/raw markdown endpoint', async () => {
    const rawMarkdown = '## Đề Mục Raw\nNội dung dạng plain text stream.';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/markdown; charset=utf-8' }),
      json: async () => { throw new Error('Not JSON'); },
      text: async () => rawMarkdown,
    } as any);

    render(
      <MarkdownReaderAdapter
        documentId="doc-raw"
        fileUrl="/api/docs/raw?path=guide.md"
      />
    );

    expect(screen.getByTestId('markdown-reader-loading')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Đề Mục Raw')).toBeInTheDocument();
    });
    expect(screen.getByText('Nội dung dạng plain text stream.')).toBeInTheDocument();
  });

  it('renders explicit error banner and allows retry when fetch fails (e.g. 404)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'File not found' }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'text/markdown' }),
        text: async () => '# Đã Nạp Sau Khi Thử Lại',
      } as any);

    render(
      <MarkdownReaderAdapter
        documentId="doc-err"
        fileUrl="/api/docs/content?path=missing.md"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('markdown-reader-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/Không thể tải nội dung tài liệu/i)).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByRole('button', { name: /thử lại/i });
    fireEvent.click(retryBtn);

    // Second fetch succeeds
    await waitFor(() => {
      expect(screen.getByText('Đã Nạp Sau Khi Thử Lại')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('markdown-reader-error')).not.toBeInTheDocument();
  });
});
