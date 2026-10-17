import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

describe('Integration: Phase R3d-A Markdown Persistent Highlights to ReaderSidebar Flow', () => {
  const sampleMarkdown = `# Kiến Trúc Phần Mềm Hiện Đại

## 1. Nguyên Lý Clean Architecture
Kiến trúc phần mềm sạch hướng tới sự độc lập với các framework bên ngoài.
Quy tắc phụ thuộc là trái tim của kiến trúc sạch.

## 2. Dependency Inversion
Các module cấp cao không nên phụ thuộc vào các module cấp thấp.
Cả hai cần phụ thuộc vào sự trừu tượng hóa để duy trì tính độc lập.
`;

  const mdExcerpt1: ResearchExcerpt = {
    id: 'exc-flow-md-1',
    archivedDocumentId: 'doc-md-flow-001',
    selectedText: 'Kiến trúc phần mềm sạch hướng tới sự độc lập với các framework bên ngoài.',
    contextPrefix: '## 1. Nguyên Lý Clean Architecture\n',
    contextSuffix: '\nQuy tắc phụ thuộc',
    positionSelector: {
      headingId: '1-nguyen-ly-clean-architecture',
    },
    highlightColor: '#fef08a', // Yellow
    status: 'active',
    createdAt: '2026-10-17T09:00:00.000Z',
    updatedAt: '2026-10-17T09:00:00.000Z',
  };

  const mdExcerpt2: ResearchExcerpt = {
    id: 'exc-flow-md-2',
    archivedDocumentId: 'doc-md-flow-001',
    selectedText: 'Các module cấp cao không nên phụ thuộc vào các module cấp thấp.',
    contextPrefix: '## 2. Dependency Inversion\n',
    contextSuffix: '\nCả hai cần phụ thuộc',
    positionSelector: {
      headingId: '2-dependency-inversion',
    },
    highlightColor: '#bbf7d0', // Green
    status: 'active',
    createdAt: '2026-10-17T09:05:00.000Z',
    updatedAt: '2026-10-17T09:05:00.000Z',
  };

  const staleExcerpt: ResearchExcerpt = {
    id: 'exc-flow-md-stale-3',
    archivedDocumentId: 'doc-md-flow-001',
    selectedText: 'Nội dung này không tồn tại trong văn bản markdown hiện tại',
    contextPrefix: 'Tiền tố giả lập ',
    contextSuffix: ' Hậu tố giả lập',
    positionSelector: {
      headingId: '1-nguyen-ly-clean-architecture',
    },
    highlightColor: '#bae6fd',
    status: 'active',
    createdAt: '2026-10-17T09:10:00.000Z',
    updatedAt: '2026-10-17T09:10:00.000Z',
  };

  const otherDocExcerpt: ResearchExcerpt = {
    id: 'exc-flow-md-other-4',
    archivedDocumentId: 'doc-md-other-999',
    selectedText: 'Nội dung thuộc về một tài liệu markdown khác',
    contextPrefix: null,
    contextSuffix: null,
    positionSelector: {
      headingId: 'other-heading',
    },
    highlightColor: '#fbcfe8',
    status: 'active',
    createdAt: '2026-10-17T09:15:00.000Z',
    updatedAt: '2026-10-17T09:15:00.000Z',
  };

  const mockDataContextValue = {
    notes: [],
    resources: [],
    researchInboxItems: [],
    researchExcerpts: [mdExcerpt1, mdExcerpt2, staleExcerpt, otherDocExcerpt],
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

  it('1. wires document highlights into MarkdownReaderAdapter, renders valid marks, and isolates cross-doc excerpts', async () => {
    render(
      <DataContext.Provider value={mockDataContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');

    // 1. Valid excerpt 1 is rendered inline with appropriate attributes
    const mark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]');
    expect(mark1).not.toBeNull();
    expect(mark1?.textContent).toContain('Kiến trúc phần mềm sạch hướng tới sự độc lập');
    expect(mark1).toHaveAttribute('data-highlight-color', '#fef08a');
    expect(mark1).toHaveAttribute('role', 'button');
    expect(mark1).toHaveAttribute('tabindex', '0');

    // 2. Valid excerpt 2 is rendered inline
    const mark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]');
    expect(mark2).not.toBeNull();
    expect(mark2?.textContent).toContain('Các module cấp cao không nên phụ thuộc');
    expect(mark2).toHaveAttribute('data-highlight-color', '#bbf7d0');

    // 3. Stale excerpt is NOT rendered inline on DOM (fail-closed)
    const staleMark = container.querySelector('mark[data-highlight-id="exc-flow-md-stale-3"]');
    expect(staleMark).toBeNull();

    // 4. Other document excerpt is NOT rendered inline
    const otherMark = container.querySelector('mark[data-highlight-id="exc-flow-md-other-4"]');
    expect(otherMark).toBeNull();

    // 5. Open ReaderSidebar Highlights tab
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(highlightsPanel).toBeInTheDocument();

    // Excerpts belonging to this document appear in the sidebar (including stale)
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-1')).toBeInTheDocument();
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-2')).toBeInTheDocument();
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-stale-3')).toBeInTheDocument();

    // Other document excerpt must be strictly isolated and absent from this sidebar
    expect(within(highlightsPanel).queryByTestId('excerpt-card-exc-flow-md-other-4')).toBeNull();
  });

  it('2. clicking an excerpt card in ReaderSidebar activates the inline <mark> and triggers onPositionChange with heading locator', async () => {
    const onPositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockDataContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
          onPositionChange={onPositionChange}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const mark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]') as HTMLElement;
    const mark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]') as HTMLElement;
    expect(mark1).not.toBeNull();
    expect(mark2).not.toBeNull();

    // Initially neither mark is active
    expect(mark1).toHaveAttribute('data-active', 'false');
    expect(mark2).toHaveAttribute('data-active', 'false');

    // Open sidebar and switch to Highlights tab
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    const excerptCard2 = within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-2');

    // User clicks excerpt 2 in the sidebar
    fireEvent.click(excerptCard2);

    // Verify mark2 receives data-active="true", while mark1 remains false
    await waitFor(() => {
      const currentMark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]');
      const currentMark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]');
      expect(currentMark2).toHaveAttribute('data-active', 'true');
      expect(currentMark1).toHaveAttribute('data-active', 'false');
    });

    // onPositionChange must be called with excerpt 2's headingId locator
    expect(onPositionChange).toHaveBeenCalledWith('2-dependency-inversion');
  });

  it('3. clicking an inline <mark> in rendered Markdown updates active state and triggers onPositionChange with heading locator', async () => {
    const onPositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockDataContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
          onPositionChange={onPositionChange}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const mark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]') as HTMLElement;
    expect(mark1).not.toBeNull();

    // User clicks the inline highlight mark directly
    fireEvent.click(mark1);

    // Verify mark1 becomes active
    await waitFor(() => {
      const activeMark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]');
      expect(activeMark1).toHaveAttribute('data-active', 'true');
    });

    // onPositionChange is invoked with excerpt 1's heading locator
    expect(onPositionChange).toHaveBeenCalledWith('1-nguyen-ly-clean-architecture');
  });

  it('4. dynamically adapts inline highlights and sidebar when researchExcerpts updates in DataContext', async () => {
    const initialExcerpts = [mdExcerpt1];

    const { rerender } = render(
      <DataContext.Provider value={{ ...mockDataContextValue, researchExcerpts: initialExcerpts } as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');

    // Initially: mark1 is rendered, mark2 is NOT
    await waitFor(() => {
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-1"]')).not.toBeNull();
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-2"]')).toBeNull();
    });

    // Open sidebar highlights tab
    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));
    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-1')).toBeInTheDocument();
    expect(within(highlightsPanel).queryByTestId('excerpt-card-exc-flow-md-2')).toBeNull();

    // Now dynamically add mdExcerpt2 (e.g. user created a highlight or synced)
    rerender(
      <DataContext.Provider value={{ ...mockDataContextValue, researchExcerpts: [mdExcerpt1, mdExcerpt2] } as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Both mark1 and mark2 are now present in DOM and in sidebar
    await waitFor(() => {
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-1"]')).not.toBeNull();
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-2"]')).not.toBeNull();
      expect(within(highlightsPanel).getByTestId('excerpt-card-exc-flow-md-2')).toBeInTheDocument();
    });

    // Now dynamically remove mdExcerpt1 (e.g. user deleted excerpt 1)
    rerender(
      <DataContext.Provider value={{ ...mockDataContextValue, researchExcerpts: [mdExcerpt2] } as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // mark1 is cleaned up from DOM and sidebar; mark2 remains
    await waitFor(() => {
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-1"]')).toBeNull();
      expect(container.querySelector('mark[data-highlight-id="exc-flow-md-2"]')).not.toBeNull();
      expect(within(highlightsPanel).queryByTestId('excerpt-card-exc-flow-md-1')).toBeNull();
    });
  });

  it('5. supports keyboard activation (Enter / Space) on inline <mark> elements to trigger navigation and active state', async () => {
    const onPositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockDataContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-flow-001"
          title="Kiến Trúc Phần Mềm Hiện Đại"
          format="md"
          content={sampleMarkdown}
          onClose={vi.fn()}
          onPositionChange={onPositionChange}
        />
      </DataContext.Provider>
    );

    const container = await screen.findByTestId('markdown-selectable-area');
    const mark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]') as HTMLElement;
    const mark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]') as HTMLElement;
    expect(mark1).not.toBeNull();
    expect(mark2).not.toBeNull();

    // 1. Keyboard 'Enter' on mark2
    mark2.focus();
    fireEvent.keyDown(mark2, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const currentMark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]');
      expect(currentMark2).toHaveAttribute('data-active', 'true');
    });
    expect(onPositionChange).toHaveBeenCalledWith('2-dependency-inversion');

    // 2. Keyboard ' ' (Space) on mark1
    const targetMark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]') as HTMLElement;
    expect(targetMark1).not.toBeNull();
    targetMark1.focus();
    fireEvent.keyDown(targetMark1, { key: ' ', code: 'Space' });

    await waitFor(() => {
      const currentMark1 = container.querySelector('mark[data-highlight-id="exc-flow-md-1"]');
      const currentMark2 = container.querySelector('mark[data-highlight-id="exc-flow-md-2"]');
      expect(currentMark1).toHaveAttribute('data-active', 'true');
      expect(currentMark2).toHaveAttribute('data-active', 'false');
    });
    expect(onPositionChange).toHaveBeenCalledWith('1-nguyen-ly-clean-architecture');
  });
});
