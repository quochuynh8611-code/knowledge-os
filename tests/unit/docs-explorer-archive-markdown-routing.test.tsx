import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocsExplorerView } from '../../src/components/docs/DocsExplorerView';
import { DataProvider } from '../../src/context/DataContext';

// Mock UnifiedResearchReader to inspect props passed by DocsExplorerView
const mockUnifiedReaderProps = vi.fn();
vi.mock('../../src/components/reader/UnifiedResearchReader', () => ({
  UnifiedResearchReader: (props: any) => {
    mockUnifiedReaderProps(props);
    return (
      <div
        data-testid="mock-unified-research-reader"
        data-document-id={props.documentId}
        data-title={props.title}
        data-format={props.format}
        data-file-url={props.fileUrl}
        data-source-type={props.sourceType}
        data-initial-position={props.initialPosition}
      >
        <span>Mock Unified Reader: {props.title}</span>
        <span data-testid="active-file-url">{props.fileUrl}</span>
        <button type="button" data-testid="reader-close-btn" onClick={props.onClose}>
          Close
        </button>
      </div>
    );
  },
}));

describe('Integration: DocsExplorerView Archive Markdown Routing (NDH1b)', () => {
  const archiveMdId = 'archive-md-001';
  const archiveMdRelPath = 'md/ab/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890.md';

  const mockDocsApiResponse = {
    total: 0,
    categories: {},
    documents: [],
  };

  const mockArchiveApiResponse = {
    total: 1,
    documents: [
      {
        id: archiveMdId,
        resourceId: null,
        fileName: 'Phat Hoc Co Truyen.md',
        fileSize: 2048,
        mimeType: 'text/markdown',
        fileFormat: 'md',
        contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        storageRelPath: archiveMdRelPath,
        lastPosition: { headingId: 'section-2' },
        lastReadAt: '2026-11-02T10:00:00.000Z',
        readCount: 3,
        sourceType: 'archive',
        sourcePath: null,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveApiResponse,
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access Denied: Path outside docs/' }),
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsApiResponse,
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/archive/file/')) {
        return Promise.resolve({
          ok: true,
          text: async () => '# Phật Học Cổ Truyền\n\nNội dung lưu trữ...',
          headers: { get: () => 'text/markdown; charset=utf-8' },
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: false }),
        headers: { get: () => 'application/json' },
      });
    });
  });

  // A. Test 1 — Mở Archive Markdown từ Recent Shelf
  it('1. opens Archive Markdown from Recent Shelf with /api/archive/file/:id and headingId', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentMdItem = await screen.findByRole('button', {
      name: /Đang đọc Phat Hoc Co Truyen/i,
    });
    expect(recentMdItem).toBeInTheDocument();

    fireEvent.click(recentMdItem);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: archiveMdId,
          fileUrl: `/api/archive/file/${archiveMdId}`,
          sourceType: 'archive',
          format: 'md',
          initialPosition: 'section-2',
        })
      );
    });

    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/content'))).toBe(false);
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/raw'))).toBe(false);
  });

  // B. Test 2 — Mở Archive Markdown không có saved headingId
  it('2. opens Archive Markdown without saved headingId with undefined initialPosition', async () => {
    const unreadArchiveResponse = {
      total: 1,
      documents: [
        {
          ...mockArchiveApiResponse.documents[0],
          id: 'archive-md-unread',
          lastPosition: null,
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => unreadArchiveResponse,
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access Denied' }),
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsApiResponse,
          headers: { get: () => 'application/json' },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: false }),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentMdItem = await screen.findByRole('button', {
      name: /Đang đọc Phat Hoc Co Truyen/i,
    });
    expect(recentMdItem).toBeInTheDocument();

    fireEvent.click(recentMdItem);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'archive-md-unread',
          fileUrl: '/api/archive/file/archive-md-unread',
          sourceType: 'archive',
          format: 'md',
          initialPosition: undefined,
        })
      );
    });

    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/content'))).toBe(false);
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/raw'))).toBe(false);
  });

  // C. Test 3 — Ambiguous Archive Markdown
  it('3. displays ambiguity error and does not mount reader when structural path matches multiple archive records', async () => {
    const ambiguousArchiveResponse = {
      total: 2,
      documents: [
        {
          id: 'dup-1',
          fileName: 'Phat Hoc Co Truyen A.md',
          fileSize: 1024,
          mimeType: 'text/markdown',
          fileFormat: 'md',
          contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          storageRelPath: archiveMdRelPath,
          lastPosition: null,
          lastReadAt: '2026-11-02T10:00:00.000Z',
          readCount: 1,
          sourceType: 'archive',
        },
        {
          id: 'dup-2',
          fileName: 'Phat Hoc Co Truyen B.md',
          fileSize: 1024,
          mimeType: 'text/markdown',
          fileFormat: 'md',
          contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          storageRelPath: archiveMdRelPath,
          lastPosition: null,
          lastReadAt: '2026-11-02T11:00:00.000Z',
          readCount: 2,
          sourceType: 'archive',
        },
      ],
    };

    const mockDocsWithAmbiguous = {
      total: 1,
      categories: { guides: 1 },
      documents: [
        {
          id: 'virtual-ambiguous-item',
          title: 'Ambiguous Guide',
          category: 'guides',
          relativePath: archiveMdRelPath,
          sourceType: 'archive',
          sizeBytes: 1024,
          lastModified: '2026-10-01T00:00:00.000Z',
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => ambiguousArchiveResponse,
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access Denied' }),
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsWithAmbiguous,
          headers: { get: () => 'application/json' },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: false }),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const docItem = await screen.findByTestId('doc-item-virtual-ambiguous-item');
    expect(docItem).toBeInTheDocument();

    fireEvent.click(docItem);

    // Kiểm tra không mount reader và không fetch docs hay archive file
    expect(mockUnifiedReaderProps).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('recent-reads-error')).toBeInTheDocument();
      expect(screen.getByText(/trùng lặp định danh lưu trữ/i)).toBeInTheDocument();
    });

    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/content'))).toBe(false);
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/raw'))).toBe(false);
    expect(fetchCalls.some((url: string) => url.includes('/api/archive/file'))).toBe(false);
  });

  // D. Test 4 — Preview Archive Markdown từ Library list
  it('4. previews Archive Markdown via /api/archive/file/:id without calling /api/docs/content', async () => {
    const mockDocsWithArchive = {
      total: 1,
      categories: { guides: 1 },
      documents: [
        {
          id: archiveMdId,
          title: 'Phật Học Cổ Truyền',
          category: 'guides',
          relativePath: archiveMdRelPath,
          sourceType: 'archive',
          sizeBytes: 2048,
          lastModified: '2026-11-02T10:00:00.000Z',
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveApiResponse,
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/archive/file/')) {
        return Promise.resolve({
          ok: true,
          text: async () => '# Phật Học Cổ Truyền\n\nNội dung lưu trữ...',
          headers: { get: () => 'text/markdown; charset=utf-8' },
        });
      }
      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access Denied' }),
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsWithArchive,
          headers: { get: () => 'application/json' },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: false }),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const docItem = await screen.findByTestId(`doc-item-${archiveMdId}`);
    expect(docItem).toBeInTheDocument();

    // Nhấp vào item trong Library list để preview (không mở reader)
    fireEvent.click(docItem);

    await waitFor(() => {
      const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
      expect(fetchCalls.some((url: string) => url.includes(`/api/archive/file/${archiveMdId}`))).toBe(true);
      expect(fetchCalls.some((url: string) => url.includes('/api/docs/content'))).toBe(false);
    });

    // Reader không mở ngay lập tức khi chỉ preview từ library list
    expect(mockUnifiedReaderProps).not.toHaveBeenCalled();
  });

  // E. Test 5 — Corrupt/missing identifier
  it('5. handles preview for Archive Markdown with missing identifier gracefully without calling /api/docs/content', async () => {
    const corruptArchiveId = 'archive-md-corrupt';
    const corruptArchiveResponse = {
      total: 1,
      documents: [
        {
          id: corruptArchiveId,
          fileName: 'Corrupt.md',
          fileSize: 1024,
          mimeType: 'text/markdown',
          fileFormat: 'md',
          contentHash: 'hash-corrupt',
          storageRelPath: 'archive/corrupt/store.md',
          lastPosition: null,
          lastReadAt: '2026-11-02T10:00:00.000Z',
          readCount: 1,
          sourceType: 'archive',
        },
      ],
    };

    const mockDocsWithCorrupt = {
      total: 1,
      categories: { guides: 1 },
      documents: [
        {
          id: 'virtual-corrupt-item',
          title: 'Corrupt Document',
          category: 'guides',
          relativePath: 'invalid/path.md',
          sourceType: 'archive',
          sizeBytes: 1024,
          lastModified: '2026-11-02T10:00:00.000Z',
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => corruptArchiveResponse,
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Access Denied' }),
          headers: { get: () => 'application/json' },
        });
      }
      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsWithCorrupt,
          headers: { get: () => 'application/json' },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: false }),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const corruptDocItem = await screen.findByTestId('doc-item-virtual-corrupt-item');
    expect(corruptDocItem).toBeInTheDocument();

    fireEvent.click(corruptDocItem);

    // Không mở reader và hiển thị thông báo lỗi
    expect(mockUnifiedReaderProps).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('recent-reads-error')).toBeInTheDocument();
    });

    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    expect(fetchCalls.some((url: string) => url.includes('/api/docs/content'))).toBe(false);
    expect(fetchCalls.some((url: string) => url.includes('/api/archive/file'))).toBe(false);
  });
});
