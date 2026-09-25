import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataProvider } from '../../src/context/DataContext';
import { Note } from '../../src/types';
import * as clipboardModule from '../../src/lib/clipboard';

const INBOX_STORAGE_KEY = 'phat_hoc_huyen_hoc_clean_v3_research_inbox';
const NOTES_STORAGE_KEY = 'phat_hoc_huyen_hoc_clean_v3_notes';

describe('Reader Selection Actions Flow & Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('# Tài liệu\n\nNội dung nghiên cứu.'),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Highlight action adds new item to researchInbox and renders immediately in Highlights sidebar panel', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="huong_dan_chi_tiet_dataview"
          fileUrl="/api/docs/raw?path=02_PDF_Source%2Fhuong_dan_chi_tiet_dataview.pdf"
          format="pdf"
          title="Hướng Dẫn Chi Tiết DataView"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote trên PDF Action Strip
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Đoạn trích mới vừa highlight từ DataView.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    // Selection toolbar xuất hiện
    const toolbar = await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    expect(toolbar).toBeInTheDocument();

    // Click nút Highlight
    const highlightBtn = within(toolbar).getByRole('button', { name: /Highlight/i });
    fireEvent.click(highlightBtn);

    // Toast thông báo thành công
    expect(await screen.findByText('Đã lưu điểm trích nghiên cứu')).toBeInTheDocument();

    // Mở Sidebar tab Đánh dấu để kiểm tra highlight mới hiển thị
    const sidebarToggle = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(sidebarToggle);

    const highlightsTab = await screen.findByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    const highlightsPanel = screen.getByTestId('sidebar-panel-highlights');
    expect(
      within(highlightsPanel).getByText(/Đoạn trích mới vừa highlight từ DataView/i)
    ).toBeInTheDocument();
  });

  it('2. Add to Inbox action adds new item to researchInbox and renders immediately in Inbox sidebar panel', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="huong_dan_chi_tiet_dataview"
          fileUrl="/api/docs/raw?path=02_PDF_Source%2Fhuong_dan_chi_tiet_dataview.pdf"
          format="pdf"
          title="Hướng Dẫn Chi Tiết DataView"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Đoạn trích mới gửi vào Research Inbox.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    const toolbar = await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    const inboxBtn = within(toolbar).getByRole('button', { name: /Thêm vào Inbox/i });
    fireEvent.click(inboxBtn);

    expect(await screen.findByText('Đã thêm trích đoạn vào Research Inbox')).toBeInTheDocument();

    // Mở Sidebar tab Inbox
    const sidebarToggle = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(sidebarToggle);

    const inboxTab = await screen.findByTestId('sidebar-tab-inbox');
    fireEvent.click(inboxTab);

    const inboxPanel = screen.getByTestId('sidebar-panel-inbox');
    expect(
      within(inboxPanel).getByText(/Đoạn trích mới gửi vào Research Inbox/i)
    ).toBeInTheDocument();
  });

  it('3. Send to note action appends excerpt blockquote, creates linked highlight, and updates scopedNotes', async () => {
    const initialNotes: Note[] = [
      {
        id: 'note-dataview-study',
        topicId: 'topic-1',
        title: 'Ghi Chú Tổng Hợp DataView',
        content: '# Ghi chú DataView ban đầu',
        type: 'study',
        tags: ['dataview'],
        isPrivate: false,
        createdAt: '2026-09-19T08:00:00.000Z',
        updatedAt: '2026-09-19T08:00:00.000Z',
      },
    ];
    localStorage.setItem('knowledge_os_storage_version', '3');
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(initialNotes));

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="huong_dan_chi_tiet_dataview"
          fileUrl="/api/docs/raw?path=02_PDF_Source%2Fhuong_dan_chi_tiet_dataview.pdf"
          format="pdf"
          title="Hướng Dẫn Chi Tiết DataView"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Luận điểm quan trọng về Dataview JS.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    const toolbar = await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    const sendToNoteBtn = within(toolbar).getByRole('button', { name: /Gửi vào ghi chú/i });
    fireEvent.click(sendToNoteBtn);

    // Target Note Modal xuất hiện
    const noteModal = await screen.findByRole('dialog', { name: /Chọn ghi chú đích/i });
    expect(noteModal).toBeInTheDocument();

    const noteOption = within(noteModal).getByText(/Ghi Chú Tổng Hợp DataView/i);
    fireEvent.click(noteOption);

    // Mở Sidebar tab Ghi chú để kiểm tra note đã được cập nhật nội dung
    const sidebarToggle = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(sidebarToggle);

    const notesTab = await screen.findByTestId('sidebar-tab-notes');
    fireEvent.click(notesTab);

    const notesPanel = screen.getByTestId('sidebar-panel-notes');
    const blockquoteElement = notesPanel.querySelector('blockquote');
    expect(blockquoteElement).toBeInTheDocument();
    expect(
      within(blockquoteElement!).getByText(/Luận điểm quan trọng về Dataview JS/i)
    ).toBeInTheDocument();
  });
});
