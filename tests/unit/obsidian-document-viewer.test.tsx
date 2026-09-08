import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Resource } from '../../src/types';

// Planned viewer component for Phase P4.1D
import { ObsidianDocumentViewerModal } from '../../src/components/modals/ObsidianDocumentViewerModal';

describe('Phase P4.1D: Obsidian Document Viewer & Safe Rendering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockResource: Resource = {
    id: 'res-obsidian-1',
    topicId: 'topic-vi-dieu-phap',
    title: 'Khao Cứu Vi Diệu Pháp',
    type: 'md',
    filePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
    url: 'obsidian://open?vault=AI-Obsidian&file=Phat-Hoc%2FVi-Dieu-Phap.md',
    createdAt: '2026-08-25T14:30:00.000Z',
  };

  it('fetches on-demand and renders outline, frontmatter tags, and markdown body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: {
            title: 'Khao Cứu Vi Diệu Pháp',
            tags: ['phat-hoc', 'abhidhamma'],
          },
          outline: [
            { level: 1, text: 'Tổng Quan', id: 'tong-quan' },
            { level: 2, text: 'Tâm và Tâm Sở', id: 'tam-va-tam-so' },
          ],
          content: '# Tổng Quan\n\nPhân tích 89 tâm và 52 tâm sở theo Thượng Tọa Bộ.',
          sizeBytes: 2048,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    // Initial loading indicator
    expect(screen.getByText(/Đang tải tài liệu từ Obsidian Vault|Đang tải/i)).toBeInTheDocument();

    // After fetch completes
    await waitFor(() => {
      expect(screen.getByText('Phân tích 89 tâm và 52 tâm sở theo Thượng Tọa Bộ.')).toBeInTheDocument();
    });

    // Verify frontmatter tag badges
    expect(screen.getByText('#phat-hoc')).toBeInTheDocument();
    expect(screen.getByText('#abhidhamma')).toBeInTheDocument();

    // Verify outline headings are listed
    expect(screen.getAllByText('Tổng Quan').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tâm và Tâm Sở')).toBeInTheDocument();
  });

  it('performs manual refresh when clicking "Làm mới từ Vault" without modifying file metadata', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
            fileName: 'Vi-Dieu-Phap.md',
            frontmatter: { title: 'Vi Diệu Pháp V1' },
            outline: [],
            content: 'Nội dung bản 1',
            sizeBytes: 100,
            lastModified: '2026-08-25T14:30:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
            fileName: 'Vi-Dieu-Phap.md',
            frontmatter: { title: 'Vi Diệu Pháp V2' },
            outline: [],
            content: 'Nội dung bản 2 mới nhất từ đĩa',
            sizeBytes: 150,
            lastModified: '2026-08-25T14:35:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nội dung bản 1')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Làm mới từ Vault|Làm mới/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText('Nội dung bản 2 mới nhất từ đĩa')).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('handles 404 FILE_NOT_FOUND gracefully with warning banner and masks absolute paths', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'FILE_NOT_FOUND',
          message: 'Tệp tin không tồn tại hoặc đã bị di chuyển khỏi Obsidian Vault',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Tệp tin không tồn tại hoặc đã bị di chuyển khỏi Obsidian Vault/i)
      ).toBeInTheDocument();
    });

    // Invariant: No absolute path or leaked filesystem structure
    expect(screen.queryByText(/\/Users\//i)).not.toBeInTheDocument();
  });

  it('renders raw HTML script tags and javascript: links safely without execution or unsafe anchor target', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: {},
          outline: [],
          content: '<script>alert("pwned")</script>\n\n[Nhấp vào đây](javascript:alert(1))\n\n[Liên kết an toàn](https://example.com)',
          sizeBytes: 500,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { container } = render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Liên kết an toàn')).toBeInTheDocument();
    });

    // Invariant: <script> must NOT be mounted as an HTML DOM script tag
    const scripts = container.querySelectorAll('script');
    expect(scripts.length).toBe(0);

    // Invariant: javascript: href must NOT be present as an executable link
    const unsafeLinks = container.querySelectorAll('a[href^="javascript:"]');
    expect(unsafeLinks.length).toBe(0);
  });

  it('generates matching heading DOM IDs and smoothly scrolls to target heading on outline click without modifying hash', async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: {
            title: 'Vi Diệu Pháp',
            tags: ['phat-hoc'],
            status: 'completed',
            type: 'study-note',
          },
          outline: [
            { level: 1, text: 'Tổng Quan', id: 'tong-quan' },
            { level: 2, text: 'Ghi chú', id: 'ghi-chu' },
            { level: 2, text: 'Ghi chú', id: 'ghi-chu-1' },
          ],
          content: '# Tổng Quan\nNội dung 1\n\n## Ghi chú\nGhi chú A\n\n## Ghi chú\nGhi chú B',
          sizeBytes: 800,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const initialHash = window.location.hash;

    const { container } = render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ghi chú A')).toBeInTheDocument();
    });

    // Verify DOM heading elements have IDs matching the outline
    const h1 = container.querySelector('#tong-quan');
    const h2_first = container.querySelector('#ghi-chu');
    const h2_second = container.querySelector('#ghi-chu-1');

    expect(h1).toBeInTheDocument();
    expect(h2_first).toBeInTheDocument();
    expect(h2_second).toBeInTheDocument();

    // Verify raw frontmatter is NOT rendered into body text
    expect(screen.queryByText(/status: completed/i)).toBeNull();
    expect(screen.queryByText(/type: study-note/i)).toBeNull();

    // Click on the 2nd duplicate outline item ("Ghi chú" #2 with id "ghi-chu-1")
    const outlineButtons = screen.getAllByRole('button', { name: /Ghi chú/i });
    expect(outlineButtons.length).toBeGreaterThanOrEqual(2);

    fireEvent.click(outlineButtons[1]);

    // Should call scrollIntoView on the second heading
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    // Invariant: HashRouter URL is preserved
    expect(window.location.hash).toBe(initialHash);
  });

  it('restores reading position from URL query param and saves position to localStorage and URL on outline click', async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    window.history.replaceState({}, '', 'http://localhost:3000/?heading=tam-va-tam-so#/topics');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: { title: 'Vi Diệu Pháp' },
          outline: [
            { level: 1, text: 'Tổng Quan', id: 'tong-quan' },
            { level: 2, text: 'Tâm và Tâm Sở', id: 'tam-va-tam-so' },
          ],
          content: '# Tổng Quan\nNội dung 1\n\n## Tâm và Tâm Sở\nNội dung 2',
          sizeBytes: 500,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Nội dung 2')).toBeInTheDocument();
    });

    // Auto-restored position from query param
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });

    // Click another outline item ("Tổng Quan")
    const tongQuanBtn = screen.getByRole('button', { name: 'Tổng Quan' });
    fireEvent.click(tongQuanBtn);

    // Should save reading position in localStorage
    expect(localStorage.getItem('obsidian-viewer:res-obsidian-1:activeHeading')).toBe('tong-quan');

    // Should update URL query param
    const url = new URL(window.location.href);
    expect(url.searchParams.get('heading')).toBe('tong-quan');
  });

  it('supports keyboard navigation (ArrowDown / ArrowUp) across outline items', async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: { title: 'Vi Diệu Pháp' },
          outline: [
            { level: 1, text: 'Mục 1', id: 'muc-1' },
            { level: 2, text: 'Mục 2', id: 'muc-2' },
            { level: 2, text: 'Mục 3', id: 'muc-3' },
          ],
          content: '# Mục 1\n\n## Mục 2\n\n## Mục 3',
          sizeBytes: 300,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mục 1' })).toBeInTheDocument();
    });

    const btn1 = screen.getByRole('button', { name: 'Mục 1' });
    btn1.focus();

    // Press ArrowDown to navigate to Mục 2
    fireEvent.keyDown(btn1, { key: 'ArrowDown', code: 'ArrowDown' });

    const btn2 = screen.getByRole('button', { name: 'Mục 2' });
    expect(document.activeElement).toBe(btn2);

    // Press ArrowDown to navigate to Mục 3
    fireEvent.keyDown(btn2, { key: 'ArrowDown', code: 'ArrowDown' });
    const btn3 = screen.getByRole('button', { name: 'Mục 3' });
    expect(document.activeElement).toBe(btn3);

    // Press ArrowUp to navigate back to Mục 2
    fireEvent.keyDown(btn3, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(document.activeElement).toBe(btn2);
  });

  it('filters outline items via search input with debounce', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
          fileName: 'Vi-Dieu-Phap.md',
          frontmatter: { title: 'Vi Diệu Pháp' },
          outline: [
            { level: 1, text: 'Khái Niệm Tổng Quan', id: 'khai-niem-tong-quan' },
            { level: 2, text: 'Tâm Sở Tịnh Hảo', id: 'tam-so-tinh-hao' },
            { level: 2, text: 'Tâm Bất Thiện', id: 'tam-bat-thien' },
          ],
          content: '# Khái Niệm Tổng Quan\n\n## Tâm Sở Tịnh Hảo\n\n## Tâm Bất Thiện',
          sizeBytes: 300,
          lastModified: '2026-08-25T14:30:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Khái Niệm Tổng Quan' })).toBeInTheDocument();
    });

    // Find search input in outline
    const searchInput = screen.getByPlaceholderText(/Tìm mục lục|Tìm kiếm mục/i);
    expect(searchInput).toBeInTheDocument();

    // Type query "Tịnh Hảo"
    fireEvent.change(searchInput, { target: { value: 'Tịnh Hảo' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tâm Sở Tịnh Hảo' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Tâm Bất Thiện' })).toBeNull();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tâm Bất Thiện' })).toBeInTheDocument();
    });
  });
});
