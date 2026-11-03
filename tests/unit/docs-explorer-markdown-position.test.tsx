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

describe('Regression Guard: Markdown Reading Position Recovery (NDH1a Invariant)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Docs Markdown có history phục hồi headingId qua fetchDocContent
  it('1. restores headingId position for Docs Markdown from archive reading history', async () => {
    const mockArchiveApiResponse = {
      total: 1,
      documents: [
        {
          id: 'guides/docs-guide',
          resourceId: null,
          fileName: 'Huong Dan He Thong.md',
          fileSize: 2048,
          mimeType: 'text/markdown',
          fileFormat: 'md',
          contentHash: 'hash-md-1',
          storageRelPath: 'guides/docs-guide.md',
          sourceType: 'docs',
          sourcePath: 'guides/docs-guide.md',
          lastPosition: { headingId: 'heading-section-2' },
          lastReadAt: '2026-11-01T10:00:00.000Z',
          readCount: 3,
        },
      ],
    };

    const mockDocsApiResponse = {
      total: 1,
      categories: { guides: 1 },
      documents: [
        {
          id: 'guides/docs-guide',
          title: 'Hướng Dẫn Hệ Thống',
          category: 'guides',
          relativePath: 'guides/docs-guide.md',
          sizeBytes: 2048,
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

      if (urlStr.includes('/api/docs/list')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsApiResponse,
          headers: { get: () => 'application/json' },
        });
      }

      if (urlStr.includes('/api/docs/content')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'guides/docs-guide',
            title: 'Hướng Dẫn Hệ Thống',
            relativePath: 'guides/docs-guide.md',
            content: '# Hướng Dẫn\n## Section 2\nNội dung Markdown',
          }),
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

    // Click vào item Markdown trong recent shelf
    const recentMdItem = await screen.findByRole('button', {
      name: /Đang đọc Huong Dan He Thong/i,
    });
    fireEvent.click(recentMdItem);

    // Kiểm tra reader được mở với đúng initialPosition = headingId
    await waitFor(() => {
      expect(mockUnifiedReaderProps).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'guides/docs-guide',
          format: 'md',
          sourceType: 'docs',
          initialPosition: 'heading-section-2',
        })
      );
    });
  });

  // 2. Vault Markdown có history phục hồi headingId qua fetchDocContent
  it('2. restores headingId position for Vault Markdown from archive reading history', async () => {
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
          contentHash: 'hash-vault-md',
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
});
