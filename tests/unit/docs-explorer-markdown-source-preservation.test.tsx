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
        <button type="button" data-testid="reader-close-btn" onClick={props.onClose}>
          Close
        </button>
      </div>
    );
  },
}));

describe('Regression Guard: Markdown Source Preservation (NDH1b Invariant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Vault Markdown bảo toàn
  it('1. preserves Vault Markdown routing to /api/obsidian/vault/file and position headingId', async () => {
    const mockArchiveApiResponse = {
      total: 1,
      documents: [
        {
          id: 'vault:Research/notes.md',
          resourceId: null,
          fileName: 'Ghi Chu Nghien Cuu.md',
          fileSize: 1024,
          mimeType: 'text/markdown',
          fileFormat: 'md',
          contentHash: 'vault-md-hash-1',
          storageRelPath: 'vault://Research/notes.md',
          sourceType: 'vault',
          sourcePath: 'Research/notes.md',
          lastPosition: { headingId: 'vault-heading-1' },
          lastReadAt: '2026-11-02T10:00:00.000Z',
          readCount: 2,
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

      if (urlStr.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, categories: {}, documents: [] }),
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/obsidian/vault/file')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: '# Vault Notes\n## Note 1\nNội dung Vault',
          }),
          headers: { get: () => 'application/json' },
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ connected: true }),
        headers: { get: () => 'application/json' },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const vaultRecentItem = await screen.findByRole('button', {
      name: /Đang đọc Ghi Chu Nghien Cuu/i,
    });
    fireEvent.click(vaultRecentItem);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'vault:Research/notes.md',
          format: 'md',
          sourceType: 'vault',
          initialPosition: 'vault-heading-1',
        })
      );
    });
  });

  // 2. Docs Markdown bảo toàn
  it('2. preserves Docs Markdown routing to /api/docs/content and /api/docs/raw with undefined position when no archive history', async () => {
    const mockArchiveApiResponse = {
      total: 0,
      documents: [],
    };

    const mockDocsApiResponse = {
      total: 1,
      categories: { guides: 1 },
      documents: [
        {
          id: 'guides/docs-guide',
          title: 'Docs Guide Note',
          category: 'guides',
          relativePath: 'guides/docs-guide.md',
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
          json: async () => mockArchiveApiResponse,
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'guides/docs-guide',
            title: 'Docs Guide Note',
            relativePath: 'guides/docs-guide.md',
            content: '# Guide Note\nNội dung docs',
          }),
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

    const docRow = await screen.findByText(/Docs Guide Note/i);
    // Nhấp vào tài liệu trong danh sách tài liệu
    fireEvent.click(docRow);

    // Khi chọn tài liệu, DocsExplorerView tải content vào selectedDoc và hiển thị nút "Mở trong khung đọc"
    const openReaderBtn = await screen.findByRole('button', { name: /Mở trong khung đọc/i });
    fireEvent.click(openReaderBtn);

    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'md',
          sourceType: 'docs',
          fileUrl: expect.stringContaining('/api/docs/raw'),
          initialPosition: undefined,
        })
      );
    });
  });
});
