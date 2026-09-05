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
});
