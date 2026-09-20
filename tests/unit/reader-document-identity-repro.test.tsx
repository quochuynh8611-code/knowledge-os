import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt, ResearchInboxItem, Resource } from '../../src/types';

describe('Reader Document Identity & Canonical Matching Requirements', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ content: '# Content' }),
          text: () => Promise.resolve('# Content'),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Anti-collision: Excerpts from other documents sharing a generic documentId do NOT leak', () => {
    const sampleInboxItems: ResearchInboxItem[] = [
      {
        id: 'inbox-1',
        excerptId: 'excerpt-1',
        excerpt: {
          id: 'excerpt-1',
          archivedDocumentId: 'doc-generic',
          selectedText: 'Bản thể luận là nhánh triết học nghiên cứu sự tồn tại',
          positionSelector: { pageNumber: 1 },
          highlightColor: '#fef08a',
          citationSnapshot: { title: 'Triết Học Căn Bản' },
          status: 'inbox',
          createdAt: '2026-09-19T08:00:00.000Z',
          updatedAt: '2026-09-19T08:00:00.000Z',
        },
        isProcessed: false,
        priority: 0,
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
      {
        id: 'inbox-2',
        excerptId: 'excerpt-2',
        excerpt: {
          id: 'excerpt-2',
          archivedDocumentId: 'doc-generic',
          selectedText: 'Cấu hình cổng PORT=3005 npm run dev trong DataView',
          positionSelector: { pageNumber: 5 },
          highlightColor: '#fef08a',
          citationSnapshot: { title: 'Hướng Dẫn Chi Tiết DataView' },
          status: 'inbox',
          createdAt: '2026-09-19T08:10:00.000Z',
          updatedAt: '2026-09-19T08:10:00.000Z',
        },
        isProcessed: false,
        priority: 0,
        createdAt: '2026-09-19T08:10:00.000Z',
        updatedAt: '2026-09-19T08:10:00.000Z',
      },
    ];

    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: sampleInboxItems,
      addExcerptToInbox: vi.fn(),
      dismissInboxItem: vi.fn(),
      processInboxItem: vi.fn(),
      unprocessedInboxCount: 2,
    };

    // User opens "Hướng Dẫn Chi Tiết DataView"
    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="doc-generic"
          title="Hướng Dẫn Chi Tiết DataView"
          format="pdf"
          fileUrl="/api/docs/raw?path=02_PDF_Source/huong_dan_chi_tiet_dataview.pdf"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');

    // The DataView excerpt MUST appear
    expect(
      within(highlightsPanel).getByText(/Cấu hình cổng PORT=3005/i)
    ).toBeInTheDocument();

    // The unrelated Philosophical excerpt MUST NOT leak
    expect(
      within(highlightsPanel).queryByText(/Bản thể luận là nhánh triết học/i)
    ).not.toBeInTheDocument();
  });

  it('2. Multi-scheme equivalence: Matches excerpts saved with relative path when opened with vault: prefix', () => {
    const sampleInboxItems: ResearchInboxItem[] = [
      {
        id: 'inbox-1',
        excerptId: 'excerpt-1',
        excerpt: {
          id: 'excerpt-1',
          archivedDocumentId: '02_PDF_Source/huong_dan_chi_tiet_dataview.pdf',
          selectedText: 'Dataview JS query syntax explanation',
          positionSelector: { pageNumber: 3 },
          highlightColor: '#fef08a',
          citationSnapshot: { title: 'huong_dan_chi_tiet_dataview' },
          status: 'inbox',
          createdAt: '2026-09-19T08:00:00.000Z',
          updatedAt: '2026-09-19T08:00:00.000Z',
        },
        isProcessed: false,
        priority: 0,
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
    ];

    const mockContext = {
      notes: [],
      resources: [],
      researchInboxItems: sampleInboxItems,
      addExcerptToInbox: vi.fn(),
      dismissInboxItem: vi.fn(),
      processInboxItem: vi.fn(),
      unprocessedInboxCount: 1,
    };

    // User opens file via Vault browser which sends "vault:02_PDF_Source/huong_dan_chi_tiet_dataview.pdf"
    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="vault:02_PDF_Source/huong_dan_chi_tiet_dataview.pdf"
          title="huong_dan_chi_tiet_dataview"
          format="pdf"
          fileUrl="/api/obsidian/vault/attachment?path=02_PDF_Source%2Fhuong_dan_chi_tiet_dataview.pdf"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');

    // The excerpt must be matched despite "vault:" scheme prefix difference
    expect(
      within(highlightsPanel).getByText(/Dataview JS query syntax explanation/i)
    ).toBeInTheDocument();
  });

  it('3. Cross-resource alias: Matches excerpts saved with resource ID when opened with vault path', () => {
    const sampleResources: Resource[] = [
      {
        id: 'res-dataview-101',
        topicId: 'topic-tech',
        title: 'Hướng Dẫn Chi Tiết DataView',
        type: 'pdf',
        filePath: '02_PDF_Source/huong_dan_chi_tiet_dataview.pdf',
        createdAt: '2026-09-19T08:00:00.000Z',
      },
    ];

    const sampleInboxItems: ResearchInboxItem[] = [
      {
        id: 'inbox-1',
        excerptId: 'excerpt-1',
        excerpt: {
          id: 'excerpt-1',
          archivedDocumentId: 'res-dataview-101', // Saved when opened via ResourcesManager
          selectedText: 'Đoạn trích quan trọng về Dataview Table và List queries',
          positionSelector: { pageNumber: 8 },
          highlightColor: '#fef08a',
          citationSnapshot: { title: 'Hướng Dẫn Chi Tiết DataView' },
          status: 'inbox',
          createdAt: '2026-09-19T08:00:00.000Z',
          updatedAt: '2026-09-19T08:00:00.000Z',
        },
        isProcessed: false,
        priority: 0,
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
    ];

    const mockContext = {
      notes: [],
      resources: sampleResources,
      researchInboxItems: sampleInboxItems,
      addExcerptToInbox: vi.fn(),
      dismissInboxItem: vi.fn(),
      processInboxItem: vi.fn(),
      unprocessedInboxCount: 1,
    };

    // User opens file via Docs Explorer (path)
    render(
      <DataContext.Provider value={mockContext as any}>
        <UnifiedResearchReader
          documentId="02_PDF_Source/huong_dan_chi_tiet_dataview.pdf"
          title="Hướng Dẫn Chi Tiết DataView"
          format="pdf"
          fileUrl="/api/docs/raw?path=02_PDF_Source/huong_dan_chi_tiet_dataview.pdf"
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    fireEvent.click(screen.getByTestId('reader-toggle-sidebar-btn'));
    fireEvent.click(screen.getByTestId('sidebar-tab-highlights'));

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');

    // The excerpt must be matched via Resource mapping
    expect(
      within(highlightsPanel).getByText(/Đoạn trích quan trọng về Dataview Table/i)
    ).toBeInTheDocument();
  });
});
