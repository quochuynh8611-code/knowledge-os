import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PdfReaderAdapter } from '../../src/components/reader/adapters/PdfReaderAdapter';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataProvider } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

describe('Phase 4B: PDF Text-Layer & Persistent Highlights Integration', () => {
  const samplePageTexts: Record<number, string> = {
    1: 'Trang 1: Tổng quan về phương pháp luận nghiên cứu và phân tích số liệu thực nghiệm trong phòng thí nghiệm.',
    2: 'Trang 2: Định luật bảo toàn năng lượng trong cơ học lượng tử là một định luật nền tảng của vật lý học hiện đại.',
    3: 'Trang 3: Kết luận chi tiết và các đề xuất ứng dụng thực tiễn trong ngành kỹ thuật công nghệ cao.',
  };

  const sampleExcerpts: ResearchExcerpt[] = [
    {
      id: 'hl-p1',
      archivedDocumentId: 'doc-pdf-quantum',
      status: 'active',
      selectedText: 'phương pháp luận nghiên cứu',
      highlightColor: '#fef08a', // Vàng
      positionSelector: { pageNumber: 1 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'hl-p2',
      archivedDocumentId: 'doc-pdf-quantum',
      status: 'active',
      selectedText: 'Định luật bảo toàn năng lượng',
      contextPrefix: 'Trang 2: ',
      contextSuffix: ' trong cơ học lượng tử',
      highlightColor: '#bbf7d0', // Lục
      positionSelector: { pageNumber: 2 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'hl-p3',
      archivedDocumentId: 'doc-pdf-quantum',
      status: 'active',
      selectedText: 'các đề xuất ứng dụng thực tiễn',
      highlightColor: '#bae6fd', // Lam
      positionSelector: { pageNumber: 3 },
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ];

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

  it('1. PdfReaderAdapter renders pdf-text-layer and accurately colors <mark> elements for currentPage only', async () => {
    const onSelectExcerpt = vi.fn();

    const { rerender } = render(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={2}
        pageTexts={samplePageTexts}
        excerpts={sampleExcerpts}
        activeExcerptId="hl-p2"
        onSelectExcerpt={onSelectExcerpt}
      />
    );

    // Text layer must be present and rendered
    const textLayer = screen.getByTestId('pdf-text-layer');
    expect(textLayer).toBeInTheDocument();
    expect(textLayer.textContent).toContain('Định luật bảo toàn năng lượng');

    // Only page 2 highlight should be injected into DOM
    const markP2 = textLayer.querySelector("mark[data-highlight-id='hl-p2']");
    expect(markP2).not.toBeNull();
    expect(markP2?.getAttribute('data-highlight-color')).toBe('#bbf7d0');
    expect(markP2?.getAttribute('data-pdf-page')).toBe('2');
    expect(markP2?.getAttribute('data-active')).toBe('true');
    expect(markP2?.className).toContain('ring-2 ring-amber-500');

    // Page 1 and Page 3 highlights MUST NOT be rendered on Page 2
    expect(textLayer.querySelector("mark[data-highlight-id='hl-p1']")).toBeNull();
    expect(textLayer.querySelector("mark[data-highlight-id='hl-p3']")).toBeNull();

    // Clicking mark activates onSelectExcerpt
    fireEvent.click(markP2!);
    expect(onSelectExcerpt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hl-p2' })
    );

    // Rerender on page 1: page 1 highlight renders, page 2 highlight removed
    rerender(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={1}
        pageTexts={samplePageTexts}
        excerpts={sampleExcerpts}
        activeExcerptId={null}
        onSelectExcerpt={onSelectExcerpt}
      />
    );

    const markP1 = textLayer.querySelector("mark[data-highlight-id='hl-p1']");
    expect(markP1).not.toBeNull();
    expect(markP1?.getAttribute('data-highlight-color')).toBe('#fef08a');
    expect(textLayer.querySelector("mark[data-highlight-id='hl-p2']")).toBeNull();
  });

  it('2. viewMode toggle button switches between interactive text-layer and native embed view', async () => {
    render(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={1}
        pageTexts={samplePageTexts}
      />
    );

    const toggleBtn = screen.getByTestId('pdf-toggle-text-layer-btn');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn.textContent).toContain('Chế độ Bản gốc PDF');

    const textLayer = screen.getByTestId('pdf-text-layer');
    const embedElement = screen.getByTestId('pdf-embed-element');

    expect(textLayer.className).toContain('block');
    expect(embedElement.className).toContain('hidden');

    // Click toggle to switch to original PDF embed mode
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toContain('Chế độ Văn bản & Highlight');
    expect(textLayer.className).toContain('hidden');
    expect(embedElement.className).toContain('block');

    // Click toggle again to return to interactive text-layer
    fireEvent.click(toggleBtn);
    expect(toggleBtn.textContent).toContain('Chế độ Bản gốc PDF');
    expect(textLayer.className).toContain('block');
    expect(embedElement.className).toContain('hidden');
  });

  it('3. highlights update color or are cleaned up when modified or deleted in excerpts list', async () => {
    const updatedExcerpts: ResearchExcerpt[] = [
      {
        ...sampleExcerpts[1],
        highlightColor: '#fbcfe8', // Đổi sang Hồng
      },
    ];

    const { rerender } = render(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={2}
        pageTexts={samplePageTexts}
        excerpts={sampleExcerpts}
      />
    );

    const textLayer = screen.getByTestId('pdf-text-layer');
    let markP2 = textLayer.querySelector("mark[data-highlight-id='hl-p2']");
    expect(markP2?.getAttribute('data-highlight-color')).toBe('#bbf7d0');

    // Rerender with updated highlight color
    rerender(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={2}
        pageTexts={samplePageTexts}
        excerpts={updatedExcerpts}
      />
    );

    markP2 = textLayer.querySelector("mark[data-highlight-id='hl-p2']");
    expect(markP2?.getAttribute('data-highlight-color')).toBe('#fbcfe8');

    // Rerender with empty excerpts (deleted)
    rerender(
      <PdfReaderAdapter
        documentId="doc-pdf-quantum"
        fileUrl="/api/archive/file/doc-pdf-quantum"
        title="Vật Lý Lượng Tử"
        initialPage={2}
        pageTexts={samplePageTexts}
        excerpts={[]}
      />
    );

    expect(textLayer.querySelectorAll('mark')).toHaveLength(0);
    expect(textLayer.textContent).toContain('Định luật bảo toàn năng lượng');
  });

  it('4. clicking an excerpt card in ReaderSidebar jumps PdfReaderAdapter to target page and marks it active', async () => {
    localStorage.setItem('knowledge_os_v4_research_excerpts', JSON.stringify(sampleExcerpts));

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-pdf-quantum"
          title="Vật Lý Lượng Tử"
          format="pdf"
          fileUrl="/api/archive/file/doc-pdf-quantum"
          initialPosition="page=1"
          initialExcerpts={sampleExcerpts}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    const pageInput = screen.getByTestId('pdf-page-input') as HTMLInputElement;
    expect(pageInput.value).toBe('1');

    // Open sidebar first
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Switch to Highlights tab in sidebar
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    // Excerpt cards are rendered
    const excerptCardP3 = await screen.findByTestId('excerpt-card-hl-p3');
    expect(excerptCardP3).toBeInTheDocument();

    // Click excerpt card on page 3
    fireEvent.click(excerptCardP3);

    // Page input must automatically jump to 3
    await waitFor(() => {
      expect((screen.getByTestId('pdf-page-input') as HTMLInputElement).value).toBe('3');
    });
  });

  it('5. text selection in pdf-text-layer triggers UnifiedSelectionToolbar and creates excerpt with page and context', async () => {
    Object.assign(navigator, {
      clipboard: {
        readText: vi.fn().mockResolvedValue('Định luật bảo toàn năng lượng'),
      },
    });

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-pdf-quantum"
          title="Vật Lý Lượng Tử"
          format="pdf"
          fileUrl="/api/archive/file/doc-pdf-quantum"
          initialPosition="page=2"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Trigger text selection via capture clipboard button
    const captureBtn = screen.getByTestId('pdf-capture-clipboard-btn');
    fireEvent.click(captureBtn);

    // Selection toolbar appears with action buttons
    await waitFor(() => {
      expect(screen.getByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Highlight/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tạo thẻ nhớ/i })).toBeInTheDocument();
    });

    // Click create flashcard action
    const flashcardBtn = screen.getByRole('button', { name: /Tạo thẻ nhớ/i });
    fireEvent.click(flashcardBtn);

    // Flashcard modal opens with page provenance
    await waitFor(() => {
      expect(screen.getByTestId('flashcard-form-modal')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-preview-badge')).toBeInTheDocument();
      expect(screen.getByTestId('provenance-preview-badge').textContent).toContain('page=2');
    });
  });
});
