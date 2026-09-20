import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { resolveReaderFileUrl } from '../../src/lib/readerDocumentResolver';
import { EpubReaderAdapter } from '../../src/components/reader/adapters/EpubReaderAdapter';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { DataContext } from '../../src/context/DataContext';

// Mock react-reader
vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => (
    <div data-testid="react-reader-mock" data-url={typeof props.url === 'string' ? props.url : 'buffer'}>
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe('EPUB URL Resolution & Path Taxonomy (Red Stage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveReaderFileUrl Taxonomy Unit Tests', () => {
    it('1. Maps docs repo path to /api/docs/raw?path=...', () => {
      expect(resolveReaderFileUrl('docs/books/sample.epub')).toBe(
        '/api/docs/raw?path=books%2Fsample.epub'
      );
      expect(resolveReaderFileUrl('/docs/books/sub/sample.epub')).toBe(
        '/api/docs/raw?path=books%2Fsub%2Fsample.epub'
      );
    });

    it('2. Maps obsidian vault relative path to /api/obsidian/vault/attachment?path=...', () => {
      expect(resolveReaderFileUrl('05_EPUB_Export/sample.epub')).toBe(
        '/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fsample.epub'
      );
      expect(resolveReaderFileUrl('attachments/books/sample.epub')).toBe(
        '/api/obsidian/vault/attachment?path=attachments%2Fbooks%2Fsample.epub'
      );
    });

    it('3. Extracts relative path from absolute Obsidian Vault path on Mac/Linux/Windows', () => {
      expect(
        resolveReaderFileUrl(
          '/Users/mr.chem/Documents/Obsidian/Phat-Hoc-Obsidian/05_EPUB_Export/sample.epub'
        )
      ).toBe('/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fsample.epub');

      expect(
        resolveReaderFileUrl(
          'C:\\Users\\User\\Documents\\Obsidian\\AI-Vault\\05_EPUB_Export\\sample.epub'
        )
      ).toBe('/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fsample.epub');
    });

    it('4. Maps bare filename sample.epub to 05_EPUB_Export convention in vault', () => {
      // Assumption: Unqualified bare EPUB filenames in Knowledge OS default to the 05_EPUB_Export vault folder
      expect(resolveReaderFileUrl('So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.epub')).toBe(
        '/api/obsidian/vault/attachment?path=05_EPUB_Export%2FSo_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.epub'
      );
    });

    it('5. Preserves http://, https://, blob:, and /api/ URLs unchanged', () => {
      expect(resolveReaderFileUrl('https://example.com/books/sample.epub')).toBe(
        'https://example.com/books/sample.epub'
      );
      expect(resolveReaderFileUrl('http://localhost:3000/custom.epub')).toBe(
        'http://localhost:3000/custom.epub'
      );
      expect(resolveReaderFileUrl('blob:http://localhost:3000/123-456')).toBe(
        'blob:http://localhost:3000/123-456'
      );
      expect(resolveReaderFileUrl('/api/docs/raw?path=books%2Fsample.epub')).toBe(
        '/api/docs/raw?path=books%2Fsample.epub'
      );
      expect(
        resolveReaderFileUrl('/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fsample.epub')
      ).toBe('/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fsample.epub');
    });
  });

  describe('EpubReaderAdapter Component Tests', () => {
    it('6. EpubReaderAdapter fetches resolved vault attachment URL when given bare filename', async () => {
      const fetchMock = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (header: string) => (header.toLowerCase() === 'content-type' ? 'application/epub+zip' : null),
          },
          arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
        };
      });
      global.fetch = fetchMock as any;

      render(
        <EpubReaderAdapter
          fileUrl="Giao_Trinh_Thien_Tinh_Song_Tu_Chuyen_Hoa_Tam_San_Tai_Gia.epub"
          documentId="doc-test-bare"
        />
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/obsidian/vault/attachment?path=05_EPUB_Export%2FGiao_Trinh_Thien_Tinh_Song_Tu_Chuyen_Hoa_Tam_San_Tai_Gia.epub'
        );
      });
    });

    it('7. EpubReaderAdapter rejects response with Content-Type: text/html (SPA Fallback)', async () => {
      const fetchMock = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (header: string) => (header.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null),
          },
          arrayBuffer: async () => new TextEncoder().encode('<!DOCTYPE html><html><body>SPA</body></html>').buffer,
        };
      });
      global.fetch = fetchMock as any;

      render(
        <EpubReaderAdapter
          fileUrl="/api/docs/raw?path=books/missing.epub"
          documentId="doc-test-html"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
        expect(screen.getByText(/nhận phản hồi HTML thay vì tệp sách EPUB/i)).toBeInTheDocument();
      });
    });

    it('8. EpubReaderAdapter renders clear descriptive error message on HTTP 404', async () => {
      const fetchMock = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: {
            get: () => 'application/json',
          },
          json: async () => ({ error: 'Document not found' }),
        };
      });
      global.fetch = fetchMock as any;

      render(
        <EpubReaderAdapter
          fileUrl="/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fnotfound.epub"
          documentId="doc-test-404"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Không tìm thấy tệp sách/i)).toBeInTheDocument();
        expect(screen.getByText(/404/i)).toBeInTheDocument();
      });
    });
  });

  describe('ResourcesManager Preview Integration', () => {
    it('9. ResourcesManager rewrites vault filePath to /api/obsidian/vault/attachment when opening preview', async () => {
      const mockResource = {
        id: 'res-epub-vault-1',
        topicId: 'topic-1',
        title: 'Giáo Trình Thiền Tịnh Song Tu',
        type: 'book' as const,
        filePath: '05_EPUB_Export/Giao_Trinh_Thien_Tinh_Song_Tu_Chuyen_Hoa_Tam_San_Tai_Gia.epub',
        createdAt: new Date().toISOString(),
      };

      const mockDataContext = {
        resources: [mockResource],
        topics: [],
        notes: [],
        categories: [],
        addResource: vi.fn(),
        updateResource: vi.fn(),
        deleteResource: vi.fn(),
      };

      render(
        <DataContext.Provider value={mockDataContext as any}>
          <ResourcesManager />
        </DataContext.Provider>
      );

      // Click "Xem trước" button on the book card
      const previewBtn = screen.getByRole('button', { name: /Xem trước/i });
      fireEvent.click(previewBtn);

      // UnifiedResearchReader should open
      await waitFor(() => {
        expect(screen.getByText(/Unified Research Reader/i)).toBeInTheDocument();
      });
    });
  });
});
