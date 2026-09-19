import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataProvider, DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt, ResearchInboxItem } from '../../src/types';

describe('Phase R1: Reader Multi-Tab Sidebar Navigation', () => {
  const sampleMarkdownContent = `# Nghiên Cứu Vi Diệu Pháp

## Chương 1: Tổng Quan Tâm và Tâm Sở
Tâm là sự nhận biết đối tượng. Tâm sở là những trạng thái tâm lý đồng sinh với tâm.

## Chương 2: Sắc Pháp
Sắc pháp gồm tứ đại chủng và sắc y đại sinh.
`;

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-1',
      excerptId: 'excerpt-1',
      excerpt: {
        id: 'excerpt-1',
        archivedDocumentId: 'doc-vi-dieu-phap',
        selectedText: 'Tâm là sự nhận biết đối tượng.',
        positionSelector: { headingId: 'chuong-1-tong-quan-tam-va-tam-so' },
        highlightColor: '#fef08a',
        citationSnapshot: { title: 'Nghiên Cứu Vi Diệu Pháp' },
        status: 'inbox',
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
      isProcessed: false,
      priority: 1,
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
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
          json: () => Promise.resolve({ content: sampleMarkdownContent }),
          text: () => Promise.resolve(sampleMarkdownContent),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('2.1. renders 4 tabs: Outline, Notes, Highlights, and Inbox in reader sidebar', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-vi-dieu-phap"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Open sidebar
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Verify all 4 tab buttons exist in sidebar
    expect(screen.getByTestId('sidebar-tab-outline')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-tab-notes')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-tab-highlights')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-tab-inbox')).toBeInTheDocument();
  });

  it('2.2. switches active tab when clicking tab buttons in sidebar', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-vi-dieu-phap"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    // Click Highlights tab
    const highlightsTabBtn = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTabBtn);
    expect(screen.getByTestId('sidebar-panel-highlights')).toBeInTheDocument();

    // Click Inbox tab
    const inboxTabBtn = screen.getByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTabBtn);
    expect(screen.getByTestId('sidebar-panel-inbox')).toBeInTheDocument();
  });

  it('2.3. clicking TOC item in Outline tab triggers heading navigation', async () => {
    const handlePositionChange = vi.fn();

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="doc-vi-dieu-phap"
          title="Nghiên Cứu Vi Diệu Pháp"
          format="md"
          content={sampleMarkdownContent}
          onPositionChange={handlePositionChange}
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const outlineTabBtn = screen.getByTestId('sidebar-tab-outline');
    fireEvent.click(outlineTabBtn);

    // Outline panel should contain heading items
    const outlinePanel = screen.getByTestId('sidebar-panel-outline');
    const headingItem = await within(outlinePanel).findByText(/Chương 1: Tổng Quan Tâm và Tâm Sở/i);
    expect(headingItem).toBeInTheDocument();

    fireEvent.click(headingItem);
    expect(handlePositionChange).toHaveBeenCalled();
  });
});
