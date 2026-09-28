import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocsExplorerView } from '../../src/components/docs/DocsExplorerView';
import { DataContext } from '../../src/context/DataContext';

// Mock heavy reader adapters to isolate workspace layout verification
vi.mock('../../src/components/reader/adapters/MarkdownReaderAdapter', () => ({
  MarkdownReaderAdapter: ({ content }: { content?: string }) => (
    <div data-testid="mock-markdown-adapter">{content || 'Markdown Content'}</div>
  ),
}));

vi.mock('../../src/components/reader/adapters/EpubReaderAdapter', () => ({
  EpubReaderAdapter: ({ documentId }: { documentId: string }) => (
    <div data-testid="mock-epub-adapter">EPUB Reader: {documentId}</div>
  ),
}));

vi.mock('../../src/components/reader/adapters/PdfReaderAdapter', () => ({
  PdfReaderAdapter: ({ title }: { title: string }) => (
    <div data-testid="mock-pdf-adapter">PDF Reader: {title}</div>
  ),
}));

describe('Reader-First Layout Specification for DocsExplorerView', () => {
  const baseDataContextValue: any = {
    categories: [],
    topics: [],
    notes: [],
    resources: [],
    stats: { totalTopics: 0, totalNotesCount: 0, totalResourcesCount: 0 },
    inboxItems: [],
  };

  const mockDocsList = [
    {
      id: 'doc-1',
      title: 'Kinh Kim Cương Bát Nhã',
      relativePath: 'books/kinh-kim-cuong.epub',
      category: 'books',
      sizeBytes: 1048576,
      status: 'EPUB',
      lastModified: '2026-09-20T00:00:00.000Z',
    },
    {
      id: 'doc-2',
      title: 'Trung Luận Long Thọ',
      relativePath: 'books/trung-luan.pdf',
      category: 'books',
      sizeBytes: 2097152,
      status: 'PDF',
      lastModified: '2026-09-21T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (typeof url === 'string' && url.includes('/api/docs')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: mockDocsList }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });
  });

  it('1. Left directory pane has a slim, fixed-width class (e.g. lg:w-72 or lg:w-80) and right pane is flex-1', async () => {
    render(
      <DataContext.Provider value={baseDataContextValue}>
        <DocsExplorerView mode="full" />
      </DataContext.Provider>
    );

    const docItem = await screen.findByText('Kinh Kim Cương Bát Nhã');
    expect(docItem).toBeInTheDocument();

    const leftPane = screen.getByTestId('library-left-sidebar');
    expect(leftPane).toBeInTheDocument();
    // Verify left pane uses a slim width container class (e.g. lg:w-72 or lg:w-[270px])
    expect(leftPane.className).toMatch(/lg:w-(72|80)|w-\[(260|270|280|290|300|320)px\]/);

    const rightPane = screen.getByTestId('library-right-content-pane');
    expect(rightPane).toBeInTheDocument();
    expect(rightPane.className).toContain('flex-1');
  });

  it('2. When activeReaderDoc is open, embedded reader is dominant in right pane and all existing test IDs exist', async () => {
    render(
      <DataContext.Provider value={baseDataContextValue}>
        <DocsExplorerView mode="full" />
      </DataContext.Provider>
    );

    const docItem = await screen.findByText('Kinh Kim Cương Bát Nhã');
    fireEvent.click(docItem);

    // Embedded reader must render in right pane
    const readerAdapter = await screen.findByTestId('mock-epub-adapter');
    expect(readerAdapter).toBeInTheDocument();

    // Verify existing test IDs remain intact
    expect(screen.getByTestId('library-sort-select')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-grid')).toBeInTheDocument();
    expect(screen.getByTestId('view-mode-list')).toBeInTheDocument();
    expect(screen.getByTestId('filter-format-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-format-epub')).toBeInTheDocument();
  });

  it('3. Can collapse left directory pane to expand reader to 100% width', async () => {
    render(
      <DataContext.Provider value={baseDataContextValue}>
        <DocsExplorerView mode="full" />
      </DataContext.Provider>
    );

    await screen.findByText('Kinh Kim Cương Bát Nhã');

    const collapseBtn = screen.getByTestId('toggle-left-sidebar-btn');
    expect(collapseBtn).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(collapseBtn);

    // Left pane should be hidden or collapsed
    const leftPane = screen.getByTestId('library-left-sidebar');
    expect(leftPane.className).toMatch(/hidden|w-0|collapsed/);

    // Expand button should now be accessible to restore directory
    const expandBtn = screen.getByTestId('expand-left-sidebar-btn');
    expect(expandBtn).toBeInTheDocument();

    // Click expand to restore
    fireEvent.click(expandBtn);
    expect(leftPane.className).not.toMatch(/hidden|w-0/);
  });

  it('4. Container expands beyond max-w-7xl when activeReaderDoc is open', async () => {
    const { container } = render(
      <DataContext.Provider value={baseDataContextValue}>
        <DocsExplorerView mode="full" />
      </DataContext.Provider>
    );

    const docItem = await screen.findByText('Kinh Kim Cương Bát Nhã');
    fireEvent.click(docItem);

    // The outer container must support wide viewport expansion
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer.className).toMatch(/max-w-\[1700px\]|max-w-none|max-w-full/);
  });
});
