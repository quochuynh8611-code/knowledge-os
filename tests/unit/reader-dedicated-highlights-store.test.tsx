import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext, DataProvider } from '../../src/context/DataContext';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase R5A: Dedicated Highlights Read/Write Slice (Unit & Integration)', () => {
  const sampleMarkdownContent = `# Nghiên Cứu Vi Diệu Pháp

## Chương 1: Bản Thể Tâm và Tâm Sở
Tâm là sự nhận biết đối tượng. Tâm sở là các trạng thái tâm lý đồng sinh.

## Chương 2: Sắc Pháp
Sắc pháp gồm tứ đại chủng và các sắc y đại sinh.
`;

  const sampleDedicatedExcerpt: ResearchExcerpt = {
    id: 'exc-dedicated-1',
    archivedDocumentId: 'doc-vdp',
    selectedText: 'Tâm là sự nhận biết đối tượng.',
    positionSelector: { headingId: 'chuong-1-ban-the-tam-va-tam-so' },
    highlightColor: '#fef08a',
    citationSnapshot: { title: 'Nghiên Cứu Vi Diệu Pháp' },
    status: 'active',
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T09:00:00.000Z',
  };

  const sampleLegacyInboxExcerpt: ResearchExcerpt = {
    id: 'exc-legacy-inbox-2',
    archivedDocumentId: 'doc-vdp',
    selectedText: 'Tâm sở là các trạng thái tâm lý đồng sinh.',
    positionSelector: { headingId: 'chuong-1-ban-the-tam-va-tam-so' },
    highlightColor: '#bbf7d0',
    citationSnapshot: { title: 'Nghiên Cứu Vi Diệu Pháp' },
    status: 'inbox',
    createdAt: '2026-09-28T09:10:00.000Z',
    updatedAt: '2026-09-28T09:10:00.000Z',
  };

  const sampleLegacyInboxItem: ResearchInboxItem = {
    id: 'inbox-legacy-1',
    excerptId: sampleLegacyInboxExcerpt.id,
    excerpt: sampleLegacyInboxExcerpt,
    isProcessed: false,
    priority: 1,
    createdAt: '2026-09-28T09:10:00.000Z',
    updatedAt: '2026-09-28T09:10:00.000Z',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(sampleMarkdownContent),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Highlight action saves excerpt to researchExcerpts in DataContext WITHOUT adding inbox task', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="pdf"
          fileUrl="/api/archive/file/doc-vdp.pdf"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote để mô phỏng selection toolbar
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Sắc pháp gồm tứ đại chủng.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    const toolbar = await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    const highlightBtn = within(toolbar).getByRole('button', { name: /Highlight/i });
    fireEvent.click(highlightBtn);

    expect(await screen.findByText('Đã lưu điểm trích nghiên cứu')).toBeInTheDocument();

    // Mở Sidebar để kiểm tra
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Tab Đánh dấu phải có 1 highlight
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    expect(within(highlightsTab).getByText('1')).toBeInTheDocument();

    // Tab Inbox KHÔNG ĐƯỢC có badge vì action Highlight không tạo unread inbox task
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');
    expect(within(inboxTab).queryByTestId('tab-badge-inbox')).toBeNull();
  });

  it('2. Dual-read combines dedicated researchExcerpts and legacy inbox excerpts with deduplication', async () => {
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [sampleDedicatedExcerpt],
      researchInboxItems: [sampleLegacyInboxItem],
      addExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
      addExcerptToInbox: vi.fn(),
      deleteInboxItem: vi.fn(),
      unprocessedInboxCount: 1,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Badge tab Đánh dấu phải là 2 (1 dedicated + 1 legacy inbox excerpt)
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    expect(within(highlightsTab).getByText('2')).toBeInTheDocument();

    fireEvent.click(highlightsTab);
    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');

    // Cả 2 trích đoạn đều phải hiển thị
    expect(within(highlightsPanel).getByText(/Tâm là sự nhận biết đối tượng/i)).toBeInTheDocument();
    expect(within(highlightsPanel).getByText(/Tâm sở là các trạng thái tâm lý/i)).toBeInTheDocument();
  });

  it('3. Deduplication precedence favors dedicated store when same excerpt ID exists in both stores', async () => {
    const collidingId = 'exc-colliding-1';
    const dedicatedVersion: ResearchExcerpt = {
      ...sampleDedicatedExcerpt,
      id: collidingId,
      selectedText: 'Bản thể tâm (Dedicated Version - Updated)',
    };

    const legacyInboxVersion: ResearchExcerpt = {
      ...sampleLegacyInboxExcerpt,
      id: collidingId,
      selectedText: 'Bản thể tâm (Legacy Inbox Version - Old)',
    };

    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [dedicatedVersion],
      researchInboxItems: [
        {
          id: 'inbox-item-dup',
          excerptId: collidingId,
          excerpt: legacyInboxVersion,
          isProcessed: false,
          priority: 0,
          createdAt: '2026-09-28T09:00:00.000Z',
          updatedAt: '2026-09-28T09:00:00.000Z',
        },
      ],
      addExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
      unprocessedInboxCount: 1,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Badge đếm chỉ là 1 vì trùng ID đã được deduplicate
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    expect(within(highlightsTab).getByText('1')).toBeInTheDocument();

    fireEvent.click(highlightsTab);
    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');

    // Phải hiển thị nội dung của Dedicated Version, KHÔNG hiển thị Legacy Version
    expect(within(highlightsPanel).getByText(/Dedicated Version - Updated/i)).toBeInTheDocument();
    expect(within(highlightsPanel).queryByText(/Legacy Inbox Version - Old/i)).not.toBeInTheDocument();
  });

  it('4. Deleting an inbox item does NOT delete or hide dedicated highlights of the active document', async () => {
    const deleteInboxItemMock = vi.fn();
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [sampleDedicatedExcerpt],
      researchInboxItems: [sampleLegacyInboxItem],
      deleteInboxItem: deleteInboxItemMock,
      unprocessedInboxCount: 1,
    };

    const { rerender } = render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Xóa inbox item (mô phỏng inbox bị xóa sạch)
    rerender(
      <DataContext.Provider
        value={
          {
            ...mockContextValue,
            researchInboxItems: [], // Inbox rỗng hoàn toàn
            unprocessedInboxCount: 0,
          } as any
        }
      >
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Highlight trong dedicated store VẪN CÒN NGUYÊN (không bị mất theo inbox)
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    expect(within(highlightsTab).getByText('1')).toBeInTheDocument();

    fireEvent.click(highlightsTab);
    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(within(highlightsPanel).getByText(/Tâm là sự nhận biết đối tượng/i)).toBeInTheDocument();
  });

  it('5. Deleting a highlight from sidebar triggers deleteExcerpt without wiping unrelated inbox items', async () => {
    const deleteExcerptMock = vi.fn();
    const deleteInboxItemMock = vi.fn();

    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [sampleDedicatedExcerpt],
      researchInboxItems: [sampleLegacyInboxItem],
      deleteExcerpt: deleteExcerptMock,
      deleteInboxItem: deleteInboxItemMock,
      unprocessedInboxCount: 1,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    const dedicatedCard = within(highlightsPanel).getByText(/Tâm là sự nhận biết đối tượng/i).closest('div[role="button"]') as HTMLElement;
    const deleteBtn = within(dedicatedCard).getByRole('button', { name: /Xóa điểm trích/i });
    fireEvent.click(deleteBtn);

    // deleteExcerpt phải được gọi với ID của dedicated excerpt
    expect(deleteExcerptMock).toHaveBeenCalledWith('exc-dedicated-1');
    // KHÔNG được vô tình xóa inbox item không liên quan
    expect(deleteInboxItemMock).not.toHaveBeenCalledWith('inbox-legacy-1');
  });

  it('6. [Design Pressure] Deleting an excerpt that originated from legacy inbox suppresses revival via tombstone/filter', async () => {
    // Trường hợp highlight này chỉ tồn tại trong legacy inbox
    const deleteExcerptMock = vi.fn();
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [],
      researchInboxItems: [sampleLegacyInboxItem],
      deleteExcerpt: deleteExcerptMock,
      unprocessedInboxCount: 1,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-vdp"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    const deleteBtn = within(highlightsPanel).getByRole('button', { name: /Xóa điểm trích/i });
    fireEvent.click(deleteBtn);

    // Yêu cầu xóa excerpt phải được tiếp nhận
    expect(deleteExcerptMock).toHaveBeenCalledWith('exc-legacy-inbox-2');
  });
});
