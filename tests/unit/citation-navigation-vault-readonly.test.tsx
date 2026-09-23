import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note, Resource } from '../../src/types';

describe('Phase 19 Suite C: Citation Navigation Security & Obsidian Vault Read-Only Invariant', () => {
  const sampleResources: Resource[] = [
    {
      id: 'doc-1',
      title: 'Tài liệu Nghiên Cứu 1',
      type: 'md',
      filePath: '01_Books/doc1.md',
      topicId: 'topic-1',
      tags: ['test'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      id: 'doc-2',
      title: 'Tài liệu Nghiên Cứu 2',
      type: 'epub',
      filePath: '05_EPUB_Export/doc2.epub',
      topicId: 'topic-2',
      tags: ['test'],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      topicId: 'topic-1',
      title: 'Ghi chú Chứa Nhiều Citation',
      content: `
> Trích đoạn 1
> — *Tài liệu 1* [Link 1](archive://doc-1?loc=sec-1)

> Trích đoạn 2
> — *Tài liệu 2* [Link 2](archive://doc-2?loc=epubcfi(%2F6%2F2))
      `.trim(),
      type: 'study',
      isPrivate: false,
      tags: ['test'],
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
  ];

  let fetchMock: any;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ content: '# Nội dung' }),
        text: () => Promise.resolve('# Nội dung'),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: new Headers({ 'content-type': 'application/json' }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('C1.1. clicking citations across documents triggers 0 mutating HTTP calls or vault writes', async () => {
    const handleNavigate = vi.fn();

    render(
      <DataContext.Provider
        value={
          {
            notes: sampleNotes,
            resources: sampleResources,
            researchInboxItems: [],
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="doc-1"
          title="Tài liệu Nghiên Cứu 1"
          format="md"
          content="# Nội dung"
          onNavigateToDocument={handleNavigate}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-notes'));

    const link1 = screen.getByRole('link', { name: /Link 1/i });
    const link2 = screen.getByRole('link', { name: /Link 2/i });

    // Perform multiple citation navigations
    fireEvent.click(link1);
    fireEvent.click(link2);

    // Verify all HTTP calls are GET requests or read-only attachments
    const calls = fetchMock.mock.calls;
    for (const call of calls) {
      const options = call[1];
      if (options && options.method) {
        expect(['GET', 'HEAD']).toContain(options.method.toUpperCase());
        expect(['POST', 'PUT', 'DELETE', 'PATCH']).not.toContain(options.method.toUpperCase());
      }
    }
  });
});
