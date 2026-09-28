import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import { Note } from '../../src/types';

describe('Phase R3: ReaderSidebar Note Jump-Back Affordance (Unit)', () => {
  const sampleNotes: Note[] = [
    {
      id: 'note-single-prov',
      topicId: 'topic-1',
      title: 'Ghi chú 1 nguồn trích dẫn',
      content: 'Nội dung ghi chú trích từ tài liệu hiện tại.',
      type: 'study',
      isPrivate: false,
      tags: ['test'],
      citationProvenances: [
        {
          documentId: 'doc-active-1',
          documentTitle: 'Sách Đang Đọc',
          format: 'epub',
          locator: 'epubcfi(/6/4[chap1]!/4/2/10)',
          excerptText: 'Đoạn trích quan trọng trong chương 1',
        },
      ],
      createdAt: '2026-09-28T08:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'note-multi-prov',
      topicId: 'topic-1',
      title: 'Ghi chú Đa Nguồn Khảo Cứu',
      content: 'Ghi chú tổng hợp nhiều đoạn trích khác nhau.',
      type: 'insight',
      isPrivate: false,
      tags: ['test'],
      citationProvenances: [
        {
          documentId: 'doc-active-1',
          documentTitle: 'Sách Đang Đọc',
          format: 'epub',
          locator: 'epubcfi(/6/4[chap1]!/4/2/10)',
          excerptText: 'Đoạn trích 1',
        },
        {
          documentId: 'doc-active-1',
          documentTitle: 'Sách Đang Đọc',
          format: 'epub',
          locator: 'epubcfi(/6/8[chap2]!/4/2/40)',
          excerptText: 'Đoạn trích 2',
        },
      ],
      createdAt: '2026-09-28T08:10:00.000Z',
      updatedAt: '2026-09-28T08:10:00.000Z',
    },
    {
      id: 'note-legacy-no-prov',
      topicId: 'topic-1',
      title: 'Ghi chú Cũ Không Có Provenance',
      content: 'Ghi chú không có trường citationProvenances.',
      type: 'summary',
      isPrivate: false,
      tags: ['legacy'],
      createdAt: '2026-09-28T08:20:00.000Z',
      updatedAt: '2026-09-28T08:20:00.000Z',
    },
  ];

  it('1. renders 1-click "Tới đoạn trích" button on note card when note has exactly 1 provenance for active document and calls onOpenArchiveLink on click', () => {
    const handleOpenArchiveLink = vi.fn();

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-active-1"
        documentTitle="Sách Đang Đọc"
        notes={sampleNotes}
        onOpenArchiveLink={handleOpenArchiveLink}
      />
    );

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    expect(notesPanel).toBeInTheDocument();

    // The single provenance note card must have "Tới đoạn trích" button
    const singleProvCard = within(notesPanel).getByText('Ghi chú 1 nguồn trích dẫn').closest('div');
    expect(singleProvCard).toBeInTheDocument();

    const jumpButton = within(notesPanel).getByRole('button', { name: /Tới đoạn trích/i });
    expect(jumpButton).toBeInTheDocument();

    fireEvent.click(jumpButton);
    expect(handleOpenArchiveLink).toHaveBeenCalledWith('doc-active-1', 'epubcfi(/6/4[chap1]!/4/2/10)');
  });

  it('2. renders "Xem chi tiết" or multi-provenance badge for note with multiple provenances and triggers detail inspection', () => {
    const handleOpenNoteDetail = vi.fn();

    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-active-1"
        documentTitle="Sách Đang Đọc"
        notes={sampleNotes}
        onOpenNoteDetail={handleOpenNoteDetail}
      />
    );

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const multiProvCard = within(notesPanel).getByText('Ghi chú Đa Nguồn Khảo Cứu').closest('div');
    expect(multiProvCard).toBeInTheDocument();

    // Should display multi-provenance indicator / "2 nguồn" badge
    expect(within(notesPanel).getByText(/2 nguồn/i)).toBeInTheDocument();

    // Clicking "Xem chi tiết" or the card should trigger onOpenNoteDetail
    const detailButton = within(notesPanel).getByRole('button', { name: /Xem chi tiết/i });
    expect(detailButton).toBeInTheDocument();

    fireEvent.click(detailButton);
    expect(handleOpenNoteDetail).toHaveBeenCalledWith('note-multi-prov');
  });

  it('3. does NOT render jump-back affordance for legacy note without citationProvenances', () => {
    render(
      <ReaderSidebar
        isOpen={true}
        onClose={vi.fn()}
        activeTab="notes"
        onTabChange={vi.fn()}
        tocItems={[]}
        onSelectTocItem={vi.fn()}
        documentId="doc-active-1"
        documentTitle="Sách Đang Đọc"
        notes={[sampleNotes[2]]}
      />
    );

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    expect(within(notesPanel).getByText('Ghi chú Cũ Không Có Provenance')).toBeInTheDocument();
    expect(within(notesPanel).queryByRole('button', { name: /Tới đoạn trích/i })).not.toBeInTheDocument();
    expect(within(notesPanel).queryByText(/nguồn/i)).not.toBeInTheDocument();
  });
});
