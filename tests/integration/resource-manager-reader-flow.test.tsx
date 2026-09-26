import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { DataContext } from '../../src/context/DataContext';
import { Resource, Topic } from '../../src/types';

describe('Integration: ResourcesManager Preview to Reader Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const mockTopics: Topic[] = [
    {
      id: 'topic-1',
      title: 'Phật Học Cơ Bản',
      color: '#4f46e5',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
    },
  ];

  it('Scenario A: Resource has type "book" but filePath is ".md" -> must open MarkdownReaderAdapter with format "md", not EpubReaderAdapter', async () => {
    const mockBookMdResource: Resource = {
      id: 'res-book-md-1',
      topicId: 'topic-1',
      topicTitle: 'Phật Học Cơ Bản',
      title: 'So Sánh Vi Diệu Pháp Duy Thức A Tỳ Đàm',
      type: 'book', // High-level category is "book"
      filePath: '000-Dashboard/So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md', // Real file is markdown
      createdAt: '2026-08-01T00:00:00Z',
    };

    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/obsidian/vault/file')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            relativePath: '000-Dashboard/So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md',
            fileName: 'So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md',
            content: '# So Sánh Vi Diệu Pháp\n\nNội dung sách dạng Markdown trong Vault.',
          }),
          text: async () =>
            JSON.stringify({
              relativePath: '000-Dashboard/So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md',
              fileName: 'So_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md',
              content: '# So Sánh Vi Diệu Pháp\n\nNội dung sách dạng Markdown trong Vault.',
            }),
        } as any);
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${urlStr}`));
    });

    render(
      <DataContext.Provider
        value={{
          resources: [mockBookMdResource],
          topics: mockTopics,
          notes: [],
          flashcards: [],
          studySessions: [],
          researchInboxItems: [],
          deleteResource: vi.fn(),
          openTopicDetail: vi.fn(),
        } as any}
      >
        <ResourcesManager />
      </DataContext.Provider>
    );

    // Click "Xem trước" button on the resource card
    const previewBtn = screen.getByRole('button', { name: /Xem trước/i });
    fireEvent.click(previewBtn);

    // Must NOT crash into EPUB decoder error or render epub viewer
    // Must render Markdown selectable area and fetch markdown content
    await waitFor(() => {
      expect(screen.getByTestId('markdown-selectable-area')).toBeInTheDocument();
    });

    expect(screen.getByText('So Sánh Vi Diệu Pháp')).toBeInTheDocument();
    expect(screen.getByText(/Nội dung sách dạng Markdown trong Vault/i)).toBeInTheDocument();

    // Verify endpoint called was vault file API, not vault attachment API
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/obsidian/vault/file?path=000-Dashboard%2FSo_Sanh_Vi_Dieu_Phap_Duy_Thuc_A_Ty_Dam.md')
    );
  });

  it('Scenario D: Resource with unsupported binary extension (e.g. .zip) falls back to ResourceViewerModal instead of reader crash', async () => {
    const mockZipResource: Resource = {
      id: 'res-zip-1',
      topicId: 'topic-1',
      topicTitle: 'Phật Học Cơ Bản',
      title: 'Tài liệu nén nghiên cứu',
      type: 'book',
      filePath: 'archives/research_bundle.zip',
      createdAt: '2026-08-01T00:00:00Z',
    };

    render(
      <DataContext.Provider
        value={{
          resources: [mockZipResource],
          topics: mockTopics,
          notes: [],
          flashcards: [],
          studySessions: [],
          researchInboxItems: [],
          deleteResource: vi.fn(),
          openTopicDetail: vi.fn(),
        } as any}
      >
        <ResourcesManager />
      </DataContext.Provider>
    );

    const previewBtn = screen.getByRole('button', { name: /Xem trước/i });
    fireEvent.click(previewBtn);

    // Should open ResourceViewerModal dialog with copy path affordance, NOT reader adapter
    expect(screen.getByRole('dialog', { name: /Chi tiết tài liệu: Tài liệu nén nghiên cứu/i })).toBeInTheDocument();
    expect(screen.queryByTestId('markdown-selectable-area')).toBeNull();
    expect(screen.queryByTestId('pdf-selectable-area')).toBeNull();
  });
});
