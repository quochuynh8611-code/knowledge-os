import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { TocItem } from '../../src/components/reader/ReaderTocDrawer';
import { DataProvider } from '../../src/context/DataContext';

describe('PDF Reader TOC Hydration & Navigation (Red Stage)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. PdfReaderAdapter emits initialToc via onTocGenerated', () => {
    const onTocGenerated = vi.fn();
    const sampleToc: TocItem[] = [
      { id: 'page-1', label: 'Lời mở đầu', level: 1 },
      { id: 'page-12', label: 'Chương 1: Tổng quan', level: 2 },
    ];

    render(
      <PdfReaderAdapter
        documentId="pdf-doc-1"
        fileUrl="/api/archive/file/pdf-doc-1"
        title="Tài liệu PDF khảo cứu"
        initialToc={sampleToc}
        onTocGenerated={onTocGenerated}
      />
    );

    expect(onTocGenerated).toHaveBeenCalledWith(sampleToc);
  });

  it('2. UnifiedResearchReader with format="pdf" and initialToc renders outline items in ReaderSidebar', async () => {
    const sampleToc: TocItem[] = [
      { id: 'toc-sec-1', label: 'Phần I: Đại cương Phật học', level: 1 },
      { id: 'toc-sec-2', label: 'Phần II: Vi Diệu Pháp Toát Yếu', level: 1 },
    ];

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-pdf-toc-test"
          title="Tài Liệu Khảo Cứu PDF"
          format="pdf"
          fileUrl="/api/archive/file/doc-pdf-toc-test"
          initialToc={sampleToc}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Open sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Outline panel should render items from initialToc
    const outlinePanel = screen.getByTestId('sidebar-panel-outline');
    expect(within(outlinePanel).getByText('Phần I: Đại cương Phật học')).toBeInTheDocument();
    expect(within(outlinePanel).getByText('Phần II: Vi Diệu Pháp Toát Yếu')).toBeInTheDocument();
  });

  it('3. clicking a PDF TOC item triggers locator navigation / onPositionChange', async () => {
    const handlePositionChange = vi.fn();
    const sampleToc: TocItem[] = [
      { id: 'toc-p15', label: 'Chương 3: Phân loại Tâm pháp', level: 1 },
    ];

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-pdf-toc-test"
          title="Tài Liệu Khảo Cứu PDF"
          format="pdf"
          fileUrl="/api/archive/file/doc-pdf-toc-test"
          initialToc={sampleToc}
          onPositionChange={handlePositionChange}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Open sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Click TOC item
    const outlinePanel = screen.getByTestId('sidebar-panel-outline');
    const tocItem = within(outlinePanel).getByText('Chương 3: Phân loại Tâm pháp');
    fireEvent.click(tocItem);

    expect(handlePositionChange).toHaveBeenCalledWith('toc-p15');
  });
});
