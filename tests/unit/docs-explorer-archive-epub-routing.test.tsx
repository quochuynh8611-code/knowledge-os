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

describe('Integration: DocsExplorerView Archive & Docs EPUB Routing (NDH1a)', () => {
  const archiveEpubId = 'epub-arch-uuid-1234';
  const archiveEpubRelPath = 'epub/12/1234567890abcdef1234567890abcdef12345678.epub';

  const mockDocsApiResponse = {
    total: 1,
    categories: { books: 1 },
    documents: [
      {
        id: 'books/sample_book',
        title: 'Sách Phật Học Cổ Truyền',
        category: 'books',
        relativePath: 'books/sample_book.epub',
        sizeBytes: 1048576,
        lastModified: '2026-10-01T00:00:00.000Z',
      },
    ],
  };

  const mockArchiveApiResponse = {
    total: 1,
    documents: [
      {
        id: archiveEpubId,
        resourceId: null,
        fileName: 'Tu Dien Phat Hoc.epub',
        fileSize: 5242880,
        mimeType: 'application/epub+zip',
        fileFormat: 'epub',
        contentHash: '1234567890abcdef1234567890abcdef12345678',
        storageRelPath: archiveEpubRelPath,
        lastPosition: { cfi: 'epubcfi(/6/14[intro]!/4/2)' },
        lastReadAt: '2026-11-02T10:00:00.000Z',
        readCount: 5,
        sourceType: null,
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
  });

  // 1. Mở Archive EPUB từ shelf: FAIL vì hiện tại DocsExplorerView gán sourceType: 'docs' và fileUrl: /api/docs/raw
  it('1. opens Archive EPUB from shelf using /api/archive/file/:id and sourceType archive, without calling fetchDocContent or /api/docs/raw', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentEpubItem = await screen.findByRole('button', {
      name: /Đang đọc Tu Dien Phat Hoc/i,
    });
    expect(recentEpubItem).toBeInTheDocument();

    fireEvent.click(recentEpubItem);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: archiveEpubId,
          format: 'epub',
          sourceType: 'archive',
          fileUrl: `/api/archive/file/${archiveEpubId}`,
        })
      );
    });

    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    const rawCalls = fetchCalls.filter((url: string) => url.includes('/api/docs/raw') && url.includes('Tu Dien Phat Hoc'));
    expect(rawCalls).toHaveLength(0);
  });

  // 2. Phục hồi vị trí EPUB: FAIL vì hiện tại DocsExplorerView chưa cô lập position qua resolver
  it('2. restores EPUB reading position using authoritative CFI', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentEpubItem = await screen.findByRole('button', {
      name: /Đang đọc Tu Dien Phat Hoc/i,
    });
    fireEvent.click(recentEpubItem);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: archiveEpubId,
          initialPosition: 'epubcfi(/6/14[intro]!/4/2)',
        })
      );
    });
  });

  // 3. Ambiguity: Khi có 2 record trùng storageRelPath: FAIL vì hiện tại DocsExplorerView chưa có fail-closed cho EPUB
  it('3. fails closed and displays recentReadsError when ambiguous structural archive candidates exist', async () => {
    const ambiguousDocs = {
      total: 2,
      documents: [
        {
          id: 'arch-candidate-1',
          resourceId: null,
          fileName: 'Ambiguous Guide A.epub',
          fileSize: 1024,
          mimeType: 'application/epub+zip',
          fileFormat: 'epub',
          contentHash: 'hash-dup-1',
          storageRelPath: 'epub/dup/ambiguous.epub',
          sourceType: 'archive',
          sourcePath: 'shared/ambiguous.epub',
          lastPosition: { cfi: 'cfi-1' },
          lastReadAt: '2026-11-02T10:00:00.000Z',
          readCount: 1,
        },
        {
          id: 'arch-candidate-2',
          resourceId: null,
          fileName: 'Ambiguous Guide B.epub',
          fileSize: 1024,
          mimeType: 'application/epub+zip',
          fileFormat: 'epub',
          contentHash: 'hash-dup-2',
          storageRelPath: 'epub/dup/ambiguous.epub',
          sourceType: 'archive',
          sourcePath: 'shared/ambiguous.epub',
          lastPosition: { cfi: 'cfi-2' },
          lastReadAt: '2026-11-02T10:00:00.000Z',
          readCount: 1,
        },
      ],
    };

    const mockDocsWithAmbiguous = {
      total: 1,
      categories: { books: 1 },
      documents: [
        {
          id: 'virtual-ambiguous-item',
          title: 'Ambiguous Guide',
          category: 'books',
          relativePath: 'epub/dup/ambiguous.epub',
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
          json: async () => ambiguousDocs,
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

    // Không được mở Reader
    await waitFor(() => {
      expect(mockUnifiedReaderProps).not.toHaveBeenCalled();
    });

    // Phải hiển thị thông báo lỗi mơ hồ
    expect(screen.getByText(/trùng lặp định danh lưu trữ/i)).toBeInTheDocument();

    // Tuyệt đối không mở endpoint file
    const fetchCalls = (global.fetch as any).mock.calls.map((c: any) => String(c[0]));
    const rawCalls = fetchCalls.filter((url: string) => url.includes('/api/docs/raw'));
    const archFileCalls = fetchCalls.filter((url: string) => url.includes('/api/archive/file'));
    expect(rawCalls).toHaveLength(0);
    expect(archFileCalls).toHaveLength(0);
  });

  // 4. Bảo vệ Docs EPUB: PASS (bảo vệ regression hiện hữu của Docs EPUB)
  it('4. routes system Docs EPUB to /api/docs/raw and never mistakenly routes to Archive', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    // Chờ tài liệu render
    const docsBook = await screen.findByText('Sách Phật Học Cổ Truyền');
    expect(docsBook).toBeInTheDocument();

    fireEvent.click(docsBook);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'books/sample_book',
          format: 'epub',
          sourceType: 'docs',
          fileUrl: `/api/docs/raw?path=${encodeURIComponent('books/sample_book.epub')}`,
          initialPosition: undefined,
        })
      );
    });
  });
});
