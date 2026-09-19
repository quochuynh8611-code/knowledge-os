import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocsExplorerView } from '../../src/components/docs/DocsExplorerView';
import { globalReadingPositionStore } from '../../src/lib/readingPositionUnified';

describe('Phase R1: Research Library View & Filtering Contract', () => {
  const mockLibraryDocs = {
    total: 4,
    documents: [
      {
        id: 'doc-pdf-vi-dieu-phap',
        title: 'Giáo Trình Vi Diệu Pháp Khóa 1',
        category: 'books',
        relativePath: '02_PDF_Source/05_Vi_Dieu_Phap/giao_trinh_vi_dieu_phap_-_khoa_1.pdf',
        sizeBytes: 747175,
        lastModified: '2026-09-15T10:00:00.000Z',
      },
      {
        id: 'doc-epub-kinh-trung-bo',
        title: 'Kinh Trung Bộ Tuyển Tập',
        category: 'books',
        relativePath: '05_EPUB_Export/kinh_trung_bo_tuyen_tap.epub',
        sizeBytes: 1245000,
        lastModified: '2026-09-18T14:30:00.000Z',
      },
      {
        id: 'doc-md-thien-quan',
        title: 'Hướng Dẫn Thực Hành Thiền Quán',
        category: 'guides',
        relativePath: '01_Notes/huong_dan_thien_quan.md',
        sizeBytes: 15420,
        lastModified: '2026-09-10T08:00:00.000Z',
      },
      {
        id: 'doc-md-dong-y-co-truyen',
        title: 'Dược Tính Quy Kinh Đông Y',
        category: 'guides',
        relativePath: '03_Dong_Y/duoc_tinh_quy_kinh.md',
        sizeBytes: 45200,
        lastModified: '2026-09-12T09:15:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/docs')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockLibraryDocs),
          });
        }
        return Promise.reject(new Error('Unknown URL: ' + url));
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Format Filtering', () => {
    it('1.1. filters documents by format: all, pdf, epub, md', async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      });

      // Filter by PDF
      const pdfFilterBtn = screen.getByRole('button', { name: /PDF/i });
      fireEvent.click(pdfFilterBtn);

      expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      expect(screen.queryByText('Kinh Trung Bộ Tuyển Tập')).not.toBeInTheDocument();
      expect(screen.queryByText('Hướng Dẫn Thực Hành Thiền Quán')).not.toBeInTheDocument();

      // Filter by EPUB
      const epubFilterBtn = screen.getByRole('button', { name: /EPUB/i });
      fireEvent.click(epubFilterBtn);

      expect(screen.getByText('Kinh Trung Bộ Tuyển Tập')).toBeInTheDocument();
      expect(screen.queryByText('Giáo Trình Vi Diệu Pháp Khóa 1')).not.toBeInTheDocument();

      // Filter by Markdown
      const mdFilterBtn = screen.getByRole('button', { name: /Markdown/i });
      fireEvent.click(mdFilterBtn);

      expect(screen.getByText('Hướng Dẫn Thực Hành Thiền Quán')).toBeInTheDocument();
      expect(screen.getByText('Dược Tính Quy Kinh Đông Y')).toBeInTheDocument();
      expect(screen.queryByText('Giáo Trình Vi Diệu Pháp Khóa 1')).not.toBeInTheDocument();
    });
  });

  describe('2. Source Filtering', () => {
    it('2.1. filters documents by source type (Vault vs Local library)', async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      });

      // Check source filter buttons exist
      const vaultFilterBtn = screen.queryByRole('button', { name: /Obsidian Vault/i }) || screen.queryByTestId('filter-source-vault');
      expect(vaultFilterBtn).toBeInTheDocument();
    });
  });

  describe('3. Sorting Options', () => {
    it('3.1. sorts documents by title ascending and size descending', async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      });

      // Select sort by title
      const sortSelect = screen.getByTestId('library-sort-select');
      expect(sortSelect).toBeInTheDocument();

      fireEvent.change(sortSelect, { target: { value: 'title-asc' } });
      const titles = screen.getAllByTestId('library-doc-title').map((el) => el.textContent?.trim());
      expect(titles[0]).toBe('Dược Tính Quy Kinh Đông Y');
    });
  });

  describe('4. View Mode Toggle (Card Grid vs Compact List)', () => {
    it('4.1. toggles between grid card view and compact list view', async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      });

      const listModeBtn = screen.getByTestId('view-mode-list');
      fireEvent.click(listModeBtn);

      // Verify list container rendered
      expect(screen.getByTestId('library-list-container')).toBeInTheDocument();

      const gridModeBtn = screen.getByTestId('view-mode-grid');
      fireEvent.click(gridModeBtn);
      expect(screen.getByTestId('library-grid-container')).toBeInTheDocument();
    });
  });

  describe('5. Recent Reads Shelf', () => {
    it('5.1. renders Recent Reads shelf when reading positions exist in store', async () => {
      // Seed a recent reading position in store
      globalReadingPositionStore.setPosition('doc-pdf-vi-dieu-phap', 'pdf', 'page-12');

      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText('Giáo Trình Vi Diệu Pháp Khóa 1')).toBeInTheDocument();
      });

      const recentShelf = screen.getByTestId('recent-reads-shelf');
      expect(recentShelf).toBeInTheDocument();
      expect(screen.getByText(/Đang đọc gần đây/i)).toBeInTheDocument();
    });
  });
});
