import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { Note } from '../../src/types';

// Mock adapters and ReactReader
vi.mock('../../src/lib/epubXhtmlSanitizer', () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

let capturedEpubProps: any = null;
vi.mock('react-reader', () => ({
  ReactReader: vi.fn((props: any) => {
    capturedEpubProps = props;
    return <div data-testid="react-reader-mock">ReactReader Mock</div>;
  }),
}));

describe('Phase R3: Same-Document Note to Reader Deep Navigation (Integration)', () => {
  const sampleMarkdownContent = `# Chương 1: Dẫn Nhập\n\nNội dung dẫn nhập.\n\n## Chương 2: Phương Pháp Luận\n\nNội dung phương pháp.`;

  const sampleNotes: Note[] = [
    {
      id: 'note-md-1',
      topicId: 'topic-1',
      title: 'Ghi chú Phương Pháp Luận',
      content: 'Trích đoạn về phương pháp luận nghiên cứu.',
      type: 'insight',
      isPrivate: false,
      tags: ['methodology'],
      citationProvenances: [
        {
          documentId: 'doc-md-1',
          documentTitle: 'Giáo Trình Phương Pháp',
          format: 'md',
          locator: 'chuong-2-phuong-phap-luan',
          excerptText: 'Nội dung phương pháp.',
        },
      ],
      createdAt: '2026-09-28T08:00:00.000Z',
      updatedAt: '2026-09-28T08:00:00.000Z',
    },
    {
      id: 'note-multi-prov',
      topicId: 'topic-1',
      title: 'Ghi chú Đa Điểm Trích Dẫn',
      content: 'Nhiều trích dẫn trong cùng tài liệu.',
      type: 'study',
      isPrivate: false,
      tags: ['study'],
      citationProvenances: [
        {
          documentId: 'doc-md-1',
          documentTitle: 'Giáo Trình Phương Pháp',
          format: 'md',
          locator: 'chuong-1-dan-nhap',
          excerptText: 'Dẫn nhập',
        },
        {
          documentId: 'doc-md-1',
          documentTitle: 'Giáo Trình Phương Pháp',
          format: 'md',
          locator: 'chuong-2-phuong-phap-luan',
          excerptText: 'Phương pháp luận',
        },
      ],
      createdAt: '2026-09-28T08:10:00.000Z',
      updatedAt: '2026-09-28T08:10:00.000Z',
    },
  ];

  const mockContextValue = {
    notes: sampleNotes,
    researchInboxItems: [],
    addExcerptToInbox: vi.fn(),
    unprocessedInboxCount: 0,
  };

  beforeEach(() => {
    localStorage.clear();
    capturedEpubProps = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: {
            get: () => 'application/json',
          },
          json: () => Promise.resolve({ content: sampleMarkdownContent }),
          text: () => Promise.resolve(sampleMarkdownContent),
          arrayBuffer: () => Promise.resolve(new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. performs 1-click jump-back from ReaderSidebar note card to Markdown heading with toast feedback', async () => {
    const handlePositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Giáo Trình Phương Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
          onPositionChange={handlePositionChange}
        />
      </DataContext.Provider>
    );

    // Open sidebar & switch to Notes tab
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
    fireEvent.click(notesTabBtn);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    expect(notesPanel).toBeInTheDocument();

    // Find the single provenance note's "Tới đoạn trích" button
    const jumpBtn = within(notesPanel).getByRole('button', { name: /Tới đoạn trích/i });
    expect(jumpBtn).toBeInTheDocument();

    fireEvent.click(jumpBtn);

    // Should update position and display canonical success toast
    expect(handlePositionChange).toHaveBeenCalledWith('chuong-2-phuong-phap-luan');
    await waitFor(() => {
      expect(screen.getByText(/Đã chuyển đến vị trí trích dẫn/i)).toBeInTheDocument();
    });
  });

  it('2. opens NoteReaderModal from ReaderSidebar for multi-provenance note and allows jumping from modal', async () => {
    const handlePositionChange = vi.fn();

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-md-1"
          title="Giáo Trình Phương Pháp"
          format="md"
          content={sampleMarkdownContent}
          onClose={vi.fn()}
          onPositionChange={handlePositionChange}
        />
      </DataContext.Provider>
    );

    // Open sidebar & switch to Notes tab
    const toggleSidebarBtn = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(toggleSidebarBtn);

    const notesTabBtn = screen.getByTestId('sidebar-tab-notes');
    fireEvent.click(notesTabBtn);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');

    // Multi-provenance note card should have "Xem chi tiết"
    const viewDetailBtn = within(notesPanel).getByRole('button', { name: /Xem chi tiết/i });
    expect(viewDetailBtn).toBeInTheDocument();

    fireEvent.click(viewDetailBtn);

    // NoteReaderModal should be open
    const modalDialog = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
    expect(modalDialog).toBeInTheDocument();
    expect(within(modalDialog).getByText('Ghi chú Đa Điểm Trích Dẫn')).toBeInTheDocument();

    // Click jump-back button for second provenance in modal
    const jumpBackButtons = within(modalDialog).getAllByRole('button', { name: /Xem vị trí trong tài liệu gốc/i });
    expect(jumpBackButtons.length).toBe(2);

    fireEvent.click(jumpBackButtons[1]);

    // Modal should close and trigger position change
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();
    });
    expect(handlePositionChange).toHaveBeenCalledWith('chuong-2-phuong-phap-luan');
  });
});
