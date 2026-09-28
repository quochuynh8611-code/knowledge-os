import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DocsExplorerView } from '../../src/components/docs/DocsExplorerView';
import { DataContext } from '../../src/context/DataContext';

// Mock heavy reader adapters to focus tests on workspace layout & contract
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

describe('Phase 2A: Reader-Centered Research Workspace & Embedded Mode', () => {
  const mockOnClose = vi.fn();

  const baseDataContextValue: any = {
    categories: [],
    topics: [],
    notes: [],
    resources: [],
    stats: { totalTopics: 0, totalNotesCount: 0, totalResourcesCount: 0 },
    inboxItems: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. UnifiedResearchReader layoutMode Contract', () => {
    it('1.1. In layoutMode="embedded", renders directly without modal overlay backdrop or role="dialog"', () => {
      render(
        <DataContext.Provider value={baseDataContextValue}>
          <UnifiedResearchReader
            documentId="doc-embed-1"
            title="Đại Thừa Bách Pháp Minh Môn Luận"
            format="md"
            content="# Luận giải Bách Pháp"
            layoutMode="embedded"
            onClose={mockOnClose}
          />
        </DataContext.Provider>
      );

      // Must render document title and content
      expect(screen.getByText('Đại Thừa Bách Pháp Minh Môn Luận')).toBeInTheDocument();
      expect(screen.getByTestId('mock-markdown-adapter')).toBeInTheDocument();

      // Must NOT be a modal dialog
      expect(screen.queryByRole('dialog')).toBeNull();

      // Outer container must NOT have full-screen fixed modal backdrop classes
      const container = screen.getByTestId('mock-markdown-adapter').closest('.fixed.inset-0');
      expect(container).toBeNull();
    });

    it('1.2. In default layoutMode or layoutMode="modal", maintains full modal dialog contract', () => {
      render(
        <DataContext.Provider value={baseDataContextValue}>
          <UnifiedResearchReader
            documentId="doc-modal-1"
            title="Vi Diệu Pháp Thực Hành"
            format="md"
            content="# Vi Diệu Pháp"
            onClose={mockOnClose}
          />
        </DataContext.Provider>
      );

      // Must have role="dialog" and aria-modal="true"
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.className).toContain('fixed inset-0');
    });
  });

  describe('2. DocsExplorerView Embedded Research Flow', () => {
    const mockDocsList = [
      {
        id: 'doc-1',
        title: 'Kinh Trung Bộ',
        relativePath: 'books/kinh-trung-bo.epub',
        category: 'books',
        sizeBytes: 1024,
        updatedAt: '2026-09-20',
      },
      {
        id: 'doc-2',
        title: 'Kinh Tương Ưng',
        relativePath: 'books/kinh-tuong-ung.epub',
        category: 'books',
        sizeBytes: 2048,
        updatedAt: '2026-09-21',
      },
    ];

    beforeEach(() => {
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

    it('2.1. Opening document embeds reader seamlessly inside workspace without full-screen modal', async () => {
      render(
        <DataContext.Provider value={baseDataContextValue}>
          <DocsExplorerView mode="epub-only" />
        </DataContext.Provider>
      );

      // Wait for document item to appear
      const docItem = await screen.findByText('Kinh Trung Bộ');
      expect(docItem).toBeInTheDocument();

      // Click to open document
      fireEvent.click(docItem);

      // Reader must render embedded inside the view
      expect(await screen.findByTestId('mock-epub-adapter')).toBeInTheDocument();
      expect(screen.getByText('EPUB Reader: doc-1')).toBeInTheDocument();

      // Must NOT be a fixed full-screen modal dialog
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('2.2. Switching documents in navigator updates embedded reader without breaking layout', async () => {
      render(
        <DataContext.Provider value={baseDataContextValue}>
          <DocsExplorerView mode="epub-only" />
        </DataContext.Provider>
      );

      // Open Doc 1
      const doc1 = await screen.findByText('Kinh Trung Bộ');
      fireEvent.click(doc1);
      expect(await screen.findByText('EPUB Reader: doc-1')).toBeInTheDocument();

      // Switch to Doc 2
      const doc2 = await screen.findByText('Kinh Tương Ưng');
      fireEvent.click(doc2);
      expect(await screen.findByText('EPUB Reader: doc-2')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('2.3. Closing reader closes only the reader pane', async () => {
      render(
        <DataContext.Provider value={baseDataContextValue}>
          <DocsExplorerView mode="epub-only" />
        </DataContext.Provider>
      );

      // Open Doc 1
      const doc1 = await screen.findByText('Kinh Trung Bộ');
      fireEvent.click(doc1);
      expect(await screen.findByTestId('mock-epub-adapter')).toBeInTheDocument();

      // Close reader button inside reader header
      const closeBtn = screen.getByRole('button', { name: /đóng|close/i });
      fireEvent.click(closeBtn);

      // Reader pane is removed, document list is still interactive
      expect(screen.queryByTestId('mock-epub-adapter')).toBeNull();
      expect(screen.getByText('Kinh Trung Bộ')).toBeInTheDocument();
    });
  });
});
