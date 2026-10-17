import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

describe('Phase R3d-A Lớp B: Markdown Reader Persistent Highlights Integration Tests', () => {
  const sampleMarkdown = `# Nghiên Cứu Bản Thể Luận

## 1. Khái Niệm Cơ Bản
Bản thể luận là nhánh triết học nghiên cứu về bản chất của sự tồn tại.
Khái niệm bản thể học khởi nguồn từ triết học Hy Lạp cổ đại.

## 2. Nhận Thức Luận
Nhận thức luận nghiên cứu về nguồn gốc và giới hạn của tri thức nhân loại.
Trong triết học hiện đại, bản thể luận vẫn giữ vai trò nền tảng.
`;

  const validExcerpt1: ResearchExcerpt = {
    id: 'exc-valid-1',
    archivedDocumentId: 'doc-md-1',
    selectedText: 'Bản thể luận là nhánh triết học nghiên cứu về bản chất của sự tồn tại.',
    contextPrefix: '## 1. Khái Niệm Cơ Bản\n',
    contextSuffix: '\nKhái niệm bản thể học',
    positionSelector: { headingId: '1-khai-niem-co-ban' },
    highlightColor: '#fef08a', // Yellow
    status: 'active',
    createdAt: '2026-10-17T08:00:00.000Z',
    updatedAt: '2026-10-17T08:00:00.000Z',
  };

  const validExcerpt2: ResearchExcerpt = {
    id: 'exc-valid-2',
    archivedDocumentId: 'doc-md-1',
    selectedText: 'nguồn gốc và giới hạn của tri thức nhân loại',
    contextPrefix: 'Nhận thức luận nghiên cứu về ',
    contextSuffix: '.\nTrong triết học hiện đại',
    positionSelector: { headingId: '2-nhan-thuc-luan' },
    highlightColor: '#bbf7d0', // Green
    status: 'active',
    createdAt: '2026-10-17T08:05:00.000Z',
    updatedAt: '2026-10-17T08:05:00.000Z',
  };

  const staleExcerpt: ResearchExcerpt = {
    id: 'exc-stale-3',
    archivedDocumentId: 'doc-md-1',
    selectedText: 'Đoạn văn này đã bị sửa đổi và không còn khớp trong văn bản',
    contextPrefix: 'Ngữ cảnh giả lập ',
    contextSuffix: ' kết thúc giả lập',
    positionSelector: { headingId: '1-khai-niem-co-ban' },
    highlightColor: '#bae6fd',
    status: 'active',
    createdAt: '2026-10-17T08:10:00.000Z',
    updatedAt: '2026-10-17T08:10:00.000Z',
  };

  const legacyAmbiguousExcerpt: ResearchExcerpt = {
    id: 'exc-legacy-ambiguous-4',
    archivedDocumentId: 'doc-md-1',
    selectedText: 'bản thể luận', // Appears multiple times in document, no prefix/suffix
    contextPrefix: null,
    contextSuffix: null,
    positionSelector: {},
    highlightColor: '#fbcfe8',
    status: 'active',
    createdAt: '2026-10-17T08:15:00.000Z',
    updatedAt: '2026-10-17T08:15:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: sampleMarkdown }),
          text: () => Promise.resolve(sampleMarkdown),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. renders inline <mark> elements for uniquely verified excerpts and excludes stale/ambiguous ones', async () => {
    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [validExcerpt1, validExcerpt2, staleExcerpt, legacyAmbiguousExcerpt],
    };

    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // 1. Valid excerpt 1 should have inline <mark>
    const mark1 = await screen.findByTestId('markdown-selectable-area');
    const renderedMark1 = mark1.querySelector('mark[data-highlight-id="exc-valid-1"]');
    expect(renderedMark1).not.toBeNull();
    expect(renderedMark1?.textContent).toContain('Bản thể luận là nhánh triết học nghiên cứu');
    expect(renderedMark1).toHaveAttribute('tabindex', '0');
    expect(renderedMark1).toHaveAttribute('role', 'button');
    expect(renderedMark1).toHaveAttribute('aria-label');

    // 2. Valid excerpt 2 should have inline <mark>
    const renderedMark2 = mark1.querySelector('mark[data-highlight-id="exc-valid-2"]');
    expect(renderedMark2).not.toBeNull();
    expect(renderedMark2?.textContent).toContain('nguồn gốc và giới hạn của tri thức');

    // 3. Stale excerpt MUST NOT be rendered as inline <mark> (fail-closed)
    const renderedStale = mark1.querySelector('mark[data-highlight-id="exc-stale-3"]');
    expect(renderedStale).toBeNull();

    // 4. Legacy ambiguous excerpt MUST NOT be rendered as inline <mark> (fail-closed)
    const renderedAmbiguous = mark1.querySelector('mark[data-highlight-id="exc-legacy-ambiguous-4"]');
    expect(renderedAmbiguous).toBeNull();
  });

  it('2. clicking an inline <mark> activates the corresponding excerpt and updates state', async () => {
    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [validExcerpt1],
    };

    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const mark = container.querySelector('mark[data-highlight-id="exc-valid-1"]') as HTMLElement;
    expect(mark).not.toBeNull();

    // Click mark
    fireEvent.click(mark);

    // Should indicate active highlight in DOM
    expect(mark).toHaveAttribute('data-active', 'true');
  });

  it('3. pressing Enter or Space on a focused inline <mark> activates the excerpt', async () => {
    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [validExcerpt1],
    };

    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const mark = container.querySelector('mark[data-highlight-id="exc-valid-1"]') as HTMLElement;
    expect(mark).not.toBeNull();

    // Press Enter
    fireEvent.keyDown(mark, { key: 'Enter' });
    expect(mark).toHaveAttribute('data-active', 'true');

    // Reset and test Space
    fireEvent.keyDown(mark, { key: ' ' });
    expect(mark).toHaveAttribute('data-active', 'true');
  });

  it('4. reflects highlight color changes dynamically when excerpt is updated', async () => {
    const initialExcerpts = [validExcerpt1];

    const { rerender } = render(
      <DataContext.Provider value={{ notes: [], resources: [], researchInboxItems: [], researchExcerpts: initialExcerpts } as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const markBefore = container.querySelector('mark[data-highlight-id="exc-valid-1"]');
    expect(markBefore).toHaveAttribute('data-highlight-color', '#fef08a');

    // Update highlight color to Blue (#bae6fd)
    const updatedExcerpts = [
      {
        ...validExcerpt1,
        highlightColor: '#bae6fd',
        updatedAt: '2026-10-17T08:30:00.000Z',
      },
    ];

    rerender(
      <DataContext.Provider value={{ notes: [], resources: [], researchInboxItems: [], researchExcerpts: updatedExcerpts } as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const markAfter = container.querySelector('mark[data-highlight-id="exc-valid-1"]');
    expect(markAfter).toHaveAttribute('data-highlight-color', '#bae6fd');
  });

  it('5. removes the inline <mark> completely when excerpt is deleted', async () => {
    const mockDeleteExcerpt = vi.fn();
    const initialExcerpts = [validExcerpt1];

    const { rerender } = render(
      <DataContext.Provider
        value={{
          notes: [],
          resources: [],
          researchInboxItems: [],
          researchExcerpts: initialExcerpts,
          deleteExcerpt: mockDeleteExcerpt,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    expect(container.querySelector('mark[data-highlight-id="exc-valid-1"]')).not.toBeNull();

    // Rerender after deletion (empty excerpts array)
    rerender(
      <DataContext.Provider
        value={{
          notes: [],
          resources: [],
          researchInboxItems: [],
          researchExcerpts: [],
          deleteExcerpt: mockDeleteExcerpt,
        } as any}
      >
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    expect(container.querySelector('mark[data-highlight-id="exc-valid-1"]')).toBeNull();
  });

  it('6. preserves ReaderSidebar R3c behavior: legacy and stale excerpts remain visible in sidebar', async () => {
    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: [],
      researchExcerpts: [validExcerpt1, staleExcerpt, legacyAmbiguousExcerpt],
    };

    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Nghiên Cứu Bản Thể Luận"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Open sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Switch to Highlights tab
    const highlightsTabBtn = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTabBtn);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(highlightsPanel).toBeInTheDocument();

    // All excerpts (valid, stale, legacy ambiguous) must still be listed in the sidebar
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-valid-1')).toBeInTheDocument();
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-stale-3')).toBeInTheDocument();
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-legacy-ambiguous-4')).toBeInTheDocument();
  });
});
