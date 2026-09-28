import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import { Note, ResearchExcerpt, ResearchInboxItem } from '../../src/types';
import { TocItem } from '../../src/components/reader/ReaderTocDrawer';

describe('Phase R4: ReaderSidebar Dynamic Tab Counter Badges (Unit)', () => {
  const sampleTocItems: TocItem[] = [
    { id: 'toc-1', label: 'Chương 1', level: 1 },
    { id: 'toc-2', label: 'Chương 2', level: 1 },
    { id: 'toc-3', label: 'Chương 3', level: 2 },
  ];

  const sampleNotes: Note[] = [
    {
      id: 'n-1',
      topicId: 't-1',
      title: 'Ghi chú 1',
      content: 'Nội dung 1',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2026-09-28T08:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'n-2',
      topicId: 't-1',
      title: 'Ghi chú 2',
      content: 'Nội dung 2',
      type: 'insight',
      isPrivate: false,
      tags: [],
      createdAt: '2026-09-28T08:10:00.000Z',
      updatedAt: '2026-09-28T08:10:00.000Z',
    },
  ];

  const sampleExcerpts: ResearchExcerpt[] = [
    {
      id: 'e-1',
      archivedDocumentId: 'doc-1',
      selectedText: 'Trích đoạn 1',
      positionSelector: { headingId: 'sec-1' },
      highlightColor: '#fef08a',
      status: 'inbox',
      createdAt: '2026-09-28T08:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'e-2',
      archivedDocumentId: 'doc-1',
      selectedText: 'Trích đoạn 2',
      positionSelector: { headingId: 'sec-2' },
      highlightColor: '#fef08a',
      status: 'inbox',
      createdAt: '2026-09-28T08:05:00.000Z',
      updatedAt: '2026-09-28T08:05:00.000Z',
    },
    {
      id: 'e-3',
      archivedDocumentId: 'doc-1',
      selectedText: 'Trích đoạn 3',
      positionSelector: { headingId: 'sec-3' },
      highlightColor: '#fef08a',
      status: 'inbox',
      createdAt: '2026-09-28T08:10:00.000Z',
      updatedAt: '2026-09-28T08:10:00.000Z',
    },
    {
      id: 'e-4',
      archivedDocumentId: 'doc-1',
      selectedText: 'Trích đoạn 4',
      positionSelector: { headingId: 'sec-4' },
      highlightColor: '#fef08a',
      status: 'inbox',
      createdAt: '2026-09-28T08:15:00.000Z',
      updatedAt: '2026-09-28T08:15:00.000Z',
    },
  ];

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'i-1',
      excerptId: 'e-1',
      excerpt: sampleExcerpts[0],
      isProcessed: false,
      priority: 1,
      createdAt: '2026-09-28T08:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'i-2',
      excerptId: 'e-2',
      excerpt: sampleExcerpts[1],
      isProcessed: false,
      priority: 2,
      createdAt: '2026-09-28T08:05:00.000Z',
      updatedAt: '2026-09-28T08:05:00.000Z',
    },
    {
      id: 'i-3',
      excerptId: 'e-3',
      excerpt: sampleExcerpts[2],
      isProcessed: true, // Already processed
      priority: 3,
      createdAt: '2026-09-28T08:10:00.000Z',
      updatedAt: '2026-09-28T08:10:00.000Z',
    },
  ];

  it('1. displays correct numeric counter badge on all 4 tabs when items exist', () => {
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="outline"
        onTabChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài liệu kiểm thử"
        tocItems={sampleTocItems}
        notes={sampleNotes}
        excerpts={sampleExcerpts}
        inboxItems={sampleInboxItems}
        onSelectTocItem={vi.fn()}
      />
    );

    const outlineTab = screen.getByTestId('sidebar-tab-outline');
    const notesTab = screen.getByTestId('sidebar-tab-notes');
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');

    // Outline tab badge = 3
    expect(within(outlineTab).getByText('3')).toBeInTheDocument();

    // Notes tab badge = 2
    expect(within(notesTab).getByText('2')).toBeInTheDocument();

    // Highlights tab badge = 4
    expect(within(highlightsTab).getByText('4')).toBeInTheDocument();

    // Inbox tab badge = 2 (only unprocessed items)
    expect(within(inboxTab).getByText('2')).toBeInTheDocument();

    // Dot-only indicator must be removed
    const dotIndicator = inboxTab.querySelector('span.rounded-full.bg-amber-500.w-2');
    expect(dotIndicator).toBeNull();
  });

  it('2. completely hides counter badges when collections are empty (count = 0)', () => {
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="outline"
        onTabChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài liệu rỗng"
        tocItems={[]}
        notes={[]}
        excerpts={[]}
        inboxItems={[]}
        onSelectTocItem={vi.fn()}
      />
    );

    const outlineTab = screen.getByTestId('sidebar-tab-outline');
    const notesTab = screen.getByTestId('sidebar-tab-notes');
    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    const inboxTab = screen.getByTestId('sidebar-tab-inbox');

    // No numeric badge should exist inside any tab button
    expect(within(outlineTab).queryByTestId('tab-badge-outline')).toBeNull();
    expect(within(notesTab).queryByTestId('tab-badge-notes')).toBeNull();
    expect(within(highlightsTab).queryByTestId('tab-badge-highlights')).toBeNull();
    expect(within(inboxTab).queryByTestId('tab-badge-inbox')).toBeNull();

    expect(within(outlineTab).queryByText('0')).toBeNull();
    expect(within(notesTab).queryByText('0')).toBeNull();
    expect(within(highlightsTab).queryByText('0')).toBeNull();
    expect(within(inboxTab).queryByText('0')).toBeNull();
  });

  it('3. formats overflow count (>99) as "99+" gracefully', () => {
    const hugeTocItems = Array.from({ length: 120 }, (_, idx) => ({
      id: `toc-${idx}`,
      label: `Mục ${idx}`,
      level: 1,
    }));

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="outline"
        onTabChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài liệu lớn"
        tocItems={hugeTocItems}
        notes={[]}
        excerpts={[]}
        inboxItems={[]}
        onSelectTocItem={vi.fn()}
      />
    );

    const outlineTab = screen.getByTestId('sidebar-tab-outline');
    expect(within(outlineTab).getByText('99+')).toBeInTheDocument();
  });

  it('4. updates badge count reactively when props change', () => {
    const { rerender } = render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài liệu kiểm thử"
        tocItems={[]}
        notes={[sampleNotes[0]]}
        excerpts={[]}
        inboxItems={[]}
        onSelectTocItem={vi.fn()}
      />
    );

    const notesTab = screen.getByTestId('sidebar-tab-notes');
    expect(within(notesTab).getByText('1')).toBeInTheDocument();

    // Rerender with added note
    rerender(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Tài liệu kiểm thử"
        tocItems={[]}
        notes={sampleNotes} // Now 2 notes
        excerpts={[]}
        inboxItems={[]}
        onSelectTocItem={vi.fn()}
      />
    );

    expect(within(notesTab).getByText('2')).toBeInTheDocument();
  });
});
