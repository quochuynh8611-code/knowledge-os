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

describe('Contract: DocsExplorerView Authoritative Archive Record & PDF Routing', () => {
  const archiveContentHashB = 'be0350020962dd65e04cf9786917df7f903871bdb65ea3f03dadd58ee89d1747';
  const archiveStorageRelPathB = `pdf/be/${archiveContentHashB}.pdf`;
  const archiveDocIdB = '4ed27405-2c6e-489a-acd0-5972b5566ec4'; // Target document B

  const archiveDocIdA = '11111111-2222-3333-4444-555555555555'; // Document A standing first in archive list
  const archiveHashA = 'aa0350020962dd65e04cf9786917df7f903871bdb65ea3f03dadd58ee89d1747';

  const docsIdenticalShapeHash = 'd0e0f0a0b0c0d0e0f0a0b0c0d0e0f01234567890abcdef1234567890abcdef12';
  const docsIdenticalShapeRelPath = `pdf/d0/${docsIdenticalShapeHash}.pdf`;
  const docsIdenticalShapeId = 'guides/docs_storage_hash_shaped_doc';

  const lookalikeHash = 'c0d0e0f0a0b0c0d0e0f0a0b0c0d0e0f01234567890abcdef1234567890abcdef';

  const mockDocsApiResponse = {
    total: 4,
    categories: { books: 1, guides: 3 },
    documents: [
      {
        id: 'books/sample_book',
        title: 'Sách Phật Học Cổ Truyền',
        category: 'books',
        relativePath: 'books/sample_book.epub',
        sizeBytes: 1048576,
        lastModified: '2026-10-01T00:00:00.000Z',
      },
      {
        id: 'guides/sample_guide',
        title: 'Hướng Dẫn Nghiên Cứu PDF Docs',
        category: 'guides',
        relativePath: 'guides/sample_guide.pdf',
        sizeBytes: 2048576,
        lastModified: '2026-10-02T00:00:00.000Z',
      },
      {
        id: 'guides/pdf/c0/lookalike_hash_guide',
        title: 'Tài Liệu Hướng Dẫn Docs Có Thư Mục Hash Giả',
        category: 'guides',
        relativePath: `guides/pdf/c0/${lookalikeHash}.pdf`,
        sizeBytes: 1024000,
        lastModified: '2026-10-03T00:00:00.000Z',
      },
      {
        id: docsIdenticalShapeId,
        title: 'Tài Liệu Docs Có Hình Dạng Hash Trùng Archive',
        category: 'guides',
        relativePath: docsIdenticalShapeRelPath,
        sizeBytes: 2048000,
        lastModified: '2026-10-04T00:00:00.000Z',
      },
    ],
  };

  const mockArchiveApiResponse = {
    total: 4,
    documents: [
      // Document A stands FIRST in list.
      // Has fileName that ends with or shares the suffix with B's storageRelPath
      {
        id: archiveDocIdA,
        resourceId: null,
        fileName: `${archiveContentHashB}.pdf`, // loose filename suffix match candidate!
        fileSize: 1000000,
        mimeType: 'application/pdf',
        fileFormat: 'pdf',
        contentHash: archiveHashA,
        storageRelPath: `pdf/aa/${archiveHashA}.pdf`,
        lastPosition: { pageNumber: 99, totalReadingSeconds: 999 },
        lastReadAt: '2026-11-02T12:00:00.000Z',
        readCount: 5,
        sourceType: null,
        sourcePath: null,
      },
      // Target Document B: exact ID match
      {
        id: archiveDocIdB,
        resourceId: null,
        fileName: 'SGK Tin học 7 KNTT.pdf',
        fileSize: 15395109,
        mimeType: 'application/pdf',
        fileFormat: 'pdf',
        contentHash: archiveContentHashB,
        storageRelPath: archiveStorageRelPathB,
        lastPosition: { pageNumber: 42, totalReadingSeconds: 120 },
        lastReadAt: '2026-11-02T10:25:39.127Z',
        readCount: 1,
        sourceType: null,
        sourcePath: null,
      },
      // Vault PDF
      {
        id: 'arch-vault-1',
        resourceId: null,
        fileName: 'Ghi Chú Thiền Định Vault.pdf',
        fileSize: 524288,
        mimeType: 'application/pdf',
        fileFormat: 'pdf',
        contentHash: 'vault-hash-12345',
        storageRelPath: 'vault://02_PDF_Source/thien_dinh.pdf',
        sourceType: 'vault',
        sourcePath: '02_PDF_Source/thien_dinh.pdf',
        lastPosition: { pageNumber: 5, totalReadingSeconds: 60 },
        lastReadAt: '2026-11-01T08:00:00.000Z',
        readCount: 2,
      },
      // Docs PDF
      {
        id: 'arch-docs-guide-1',
        resourceId: null,
        fileName: 'sample_guide.pdf',
        fileSize: 2048576,
        mimeType: 'application/pdf',
        fileFormat: 'pdf',
        contentHash: 'docs-hash-98765',
        storageRelPath: 'guides/sample_guide.pdf',
        sourceType: 'docs',
        sourcePath: 'guides/sample_guide.pdf',
        lastPosition: { pageNumber: 15, totalReadingSeconds: 300 },
        lastReadAt: '2026-11-02T12:00:00.000Z',
        readCount: 3,
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
        json: async () => ({}),
        headers: { get: () => 'application/json' },
      });
    });
  });

  it('RED: clicking an Archive PDF in Recent Reads shelf routes to /api/archive/file/ instead of /api/docs/raw and respects exact ID over prior suffix', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentPdfItem = await screen.findByRole('button', {
      name: /Đang đọc SGK Tin học 7 KNTT/i,
    });
    expect(recentPdfItem).toBeInTheDocument();

    fireEvent.click(recentPdfItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    // In baseline code, this receives /api/docs/raw?path=...
    // In authoritative resolution, this MUST be Document B's ID, not Docs and not Document A!
    expect(activeUrl).toBe(`/api/archive/file/${archiveDocIdB}`);
    expect(activeUrl).not.toContain('/api/docs/raw');
    expect(activeUrl).not.toBe(`/api/archive/file/${archiveDocIdA}`);
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: archiveDocIdB,
        format: 'pdf',
        initialPosition: '42',
      })
    );
  });

  it('RED: clicking an Archive PDF in Reading Analytics drilldown panel routes to /api/archive/file/:id', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const inProgressBadge = await screen.findByTestId('summary-in-progress-count');
    fireEvent.click(inProgressBadge);

    const drilldownDialog = await screen.findByTestId('reading-analytics-drilldown');
    expect(drilldownDialog).toBeInTheDocument();

    const drilldownItem = await screen.findByTestId(`drilldown-item-${archiveDocIdB}`);
    fireEvent.click(drilldownItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe(`/api/archive/file/${archiveDocIdB}`);
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: archiveDocIdB,
        format: 'pdf',
        initialPosition: '42',
      })
    );
  });

  it('RED: clicking Archive PDF B without saved pageNumber does NOT leak pageNumber 99 from suffix-matching Record A', async () => {
    // Override fetch to return Archive where Document B has NO saved position
    const archiveDocsWithoutPosB = {
      ...mockArchiveApiResponse,
      documents: mockArchiveApiResponse.documents.map((d: any) => {
        if (d.id === archiveDocIdB) {
          return {
            ...d,
            lastPosition: null, // B has no saved position
          };
        }
        return d;
      }),
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/archive/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => archiveDocsWithoutPosB,
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
        json: async () => ({}),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentPdfItem = await screen.findByRole('button', {
      name: /Đang đọc SGK Tin học 7 KNTT/i,
    });
    expect(recentPdfItem).toBeInTheDocument();

    fireEvent.click(recentPdfItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe(`/api/archive/file/${archiveDocIdB}`);
    expect(activeUrl).not.toContain('/api/docs/raw');
    expect(activeUrl).not.toBe(`/api/archive/file/${archiveDocIdA}`);

    // Assert that initialPosition does NOT receive '99' from matchingArch Record A
    // Under existing reader contract, when no initial position is provided, it should be undefined
    const lastCallProps = mockUnifiedReaderProps.mock.calls[mockUnifiedReaderProps.mock.calls.length - 1][0];
    expect(lastCallProps.documentId).toBe(archiveDocIdB);
    expect(lastCallProps.format).toBe('pdf');
    expect(lastCallProps.initialPosition).toBeUndefined();
    expect(lastCallProps.initialPosition).not.toBe('99');
  });

  it('REGRESSION: Docs PDF with identical storage hash path shape in Docs repo strictly routes to /api/docs/raw', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const docsItem = await screen.findByTestId(`doc-item-${docsIdenticalShapeId}`);
    expect(docsItem).toBeInTheDocument();

    fireEvent.click(docsItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe(`/api/docs/raw?path=${encodeURIComponent(docsIdenticalShapeRelPath)}`);
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'pdf',
        sourceType: 'docs',
        fileUrl: `/api/docs/raw?path=${encodeURIComponent(docsIdenticalShapeRelPath)}`,
      })
    );
  });

  it('REGRESSION: clicking a docs repository PDF routes strictly to /api/docs/raw', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const docsPdfItem = await screen.findByTestId('doc-item-guides/sample_guide');
    expect(docsPdfItem).toBeInTheDocument();

    fireEvent.click(docsPdfItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe('/api/docs/raw?path=guides%2Fsample_guide.pdf');
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'pdf',
        sourceType: 'docs',
        fileUrl: '/api/docs/raw?path=guides%2Fsample_guide.pdf',
      })
    );
  });

  it('REGRESSION: Docs PDF with hash-like folder path in Docs repo still strictly routes to /api/docs/raw', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const docsLookalikeItem = await screen.findByTestId('doc-item-guides/pdf/c0/lookalike_hash_guide');
    expect(docsLookalikeItem).toBeInTheDocument();

    fireEvent.click(docsLookalikeItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe(`/api/docs/raw?path=guides%2Fpdf%2Fc0%2F${lookalikeHash}.pdf`);
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'pdf',
        sourceType: 'docs',
      })
    );
  });

  it('REGRESSION: clicking a Docs PDF from Recent Reads shelf routes strictly to /api/docs/raw and restores initialPosition', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const recentDocsPdfItem = await screen.findByRole('button', {
      name: /Đang đọc Hướng Dẫn Nghiên Cứu PDF Docs/i,
    });
    expect(recentDocsPdfItem).toBeInTheDocument();

    fireEvent.click(recentDocsPdfItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe('/api/docs/raw?path=guides%2Fsample_guide.pdf');
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'pdf',
        sourceType: 'docs',
        fileUrl: '/api/docs/raw?path=guides%2Fsample_guide.pdf',
        initialPosition: '15',
      })
    );
  });

  it('REGRESSION: clicking a Vault PDF in Recent Reads shelf routes to /api/obsidian/vault/attachment and restores initialPosition', async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const vaultPdfItem = await screen.findByRole('button', {
      name: /Đang đọc Ghi Chú Thiền Định Vault/i,
    });
    expect(vaultPdfItem).toBeInTheDocument();

    fireEvent.click(vaultPdfItem);

    await waitFor(() => {
      expect(screen.getByTestId('mock-unified-research-reader')).toBeInTheDocument();
    });

    const activeUrl = screen.getByTestId('active-file-url').textContent;
    expect(activeUrl).toBe('/api/obsidian/vault/attachment?path=02_PDF_Source%2Fthien_dinh.pdf');
    expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'arch-vault-1',
        format: 'pdf',
        sourceType: 'vault',
        initialPosition: '5',
      })
    );
  });
});
