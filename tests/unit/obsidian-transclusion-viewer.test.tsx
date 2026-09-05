import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Resource } from '../../src/types';
import { ObsidianDocumentViewerModal } from '../../src/components/modals/ObsidianDocumentViewerModal';

describe('Phase P4.2F: Obsidian Document Viewer Transclusion Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockResource: Resource = {
    id: 'res-parent',
    topicId: 'topic-phat-hoc',
    title: 'Nghiên Cứu Vi Diệu Pháp',
    type: 'md',
    filePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
    url: 'obsidian://open?vault=AI-Obsidian&file=Phat-Hoc%2FVi-Dieu-Phap.md',
    createdAt: '2026-09-01T10:00:00.000Z',
  };

  const setupMockFetch = (extraDocContent?: string) => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      const urlStr = url.toString();

      // Main parent note fetch
      if (urlStr.includes('/api/obsidian/vault/file?path=Phat-Hoc%2FVi-Dieu-Phap.md')) {
        return new Response(
          JSON.stringify({
            relativePath: 'Phat-Hoc/Vi-Dieu-Phap.md',
            fileName: 'Vi-Dieu-Phap.md',
            frontmatter: { title: 'Nghiên Cứu Vi Diệu Pháp', tags: ['abhidhamma'] },
            outline: [{ level: 1, text: 'Tổng Quan', id: 'tong-quan' }],
            content: extraDocContent || '# Tổng Quan\n\nNội dung chính.\n\n![[Bát Nhã Ba La Mật]]\n\nKết luận.',
            sizeBytes: 1024,
            lastModified: '2026-09-01T10:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Vault index search fetch
      if (urlStr.includes('/api/obsidian/vault/search?q=*')) {
        return new Response(
          JSON.stringify({
            query: '*',
            total: 2,
            results: [
              {
                title: 'Nghiên Cứu Vi Diệu Pháp',
                path: 'Phat-Hoc/Vi-Dieu-Phap.md',
                snippet: '',
                score: 100,
              },
              {
                title: 'Bát Nhã Ba La Mật',
                path: 'Phat-Hoc/Bat-Nha.md',
                snippet: '',
                score: 100,
              },
              {
                title: 'Tánh Không',
                path: 'Phat-Hoc/Tanh-Khong.md',
                snippet: '',
                score: 100,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Transcluded note 1: Bat-Nha.md
      if (urlStr.includes('/api/obsidian/vault/file?path=Phat-Hoc%2FBat-Nha.md')) {
        return new Response(
          JSON.stringify({
            relativePath: 'Phat-Hoc/Bat-Nha.md',
            fileName: 'Bat-Nha.md',
            frontmatter: { title: 'Bát Nhã Ba La Mật' },
            outline: [],
            content: '# Bát Nhã\n\nSắc tức thị không, không tức thị sắc.\n\n## Ứng Dụng\nThực hành quán chiếu mỗi ngày.',
            sizeBytes: 512,
            lastModified: '2026-09-01T10:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Transcluded note 2: Tanh-Khong.md
      if (urlStr.includes('/api/obsidian/vault/file?path=Phat-Hoc%2FTanh-Khong.md')) {
        return new Response(
          JSON.stringify({
            relativePath: 'Phat-Hoc/Tanh-Khong.md',
            fileName: 'Tanh-Khong.md',
            frontmatter: { title: 'Tánh Không' },
            outline: [],
            content: '# Tánh Không Luận\nVạn pháp do duyên sinh.',
            sizeBytes: 512,
            lastModified: '2026-09-01T10:00:00.000Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    });
  };

  it('renders embedded transclusion content when document contains "![[Note]]"', async () => {
    setupMockFetch();

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    // Initial load of parent note
    await waitFor(() => {
      expect(screen.getByText('Nội dung chính.')).toBeInTheDocument();
    });

    // Transclusion should resolve and render embedded content
    await waitFor(() => {
      expect(screen.getByText('Sắc tức thị không, không tức thị sắc.')).toBeInTheDocument();
    });
  });

  it('renders only the requested section when using "![[Note#Heading]]"', async () => {
    setupMockFetch('# Tổng Quan\n\n![[Bát Nhã Ba La Mật#Ứng Dụng]]');

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Thực hành quán chiếu mỗi ngày.')).toBeInTheDocument();
    });

    // Section before ## Ứng Dụng should not be rendered in transclusion
    expect(screen.queryByText('Sắc tức thị không, không tức thị sắc.')).toBeNull();
  });

  it('renders multiple transclusions in the same document', async () => {
    setupMockFetch('# Tổng Quan\n\n![[Bát Nhã Ba La Mật]]\n\n![[Tánh Không]]');

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Sắc tức thị không, không tức thị sắc.')).toBeInTheDocument();
      expect(screen.getByText('Vạn pháp do duyên sinh.')).toBeInTheDocument();
    });
  });

  it('renders warning when transcluded note is not found in vault index', async () => {
    setupMockFetch('# Tổng Quan\n\n![[Ghi Chú Không Tồn Tại]]');

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Không tìm thấy ghi chú "Ghi Chú Không Tồn Tại"/i)).toBeInTheDocument();
    });
  });
});
