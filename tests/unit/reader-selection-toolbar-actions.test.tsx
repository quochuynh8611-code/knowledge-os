import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { UnifiedSelectionToolbar } from '../../src/components/reader/UnifiedSelectionToolbar';
import { DataProvider } from '../../src/context/DataContext';
import * as clipboardModule from '../../src/lib/clipboard';

const INBOX_STORAGE_KEY = 'phat_hoc_huyen_hoc_clean_v3_research_inbox';

describe('Phase R3: Reader Selection Toolbar Actions Persistence & Feedback (Red Stage)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve('# Tiêu đề tài liệu\n\nNội dung nghiên cứu.'),
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Highlight action MUST persist excerpt to DataContext and show in sidebar highlights', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="pdf-doc-123"
          fileUrl="/api/archive/file/pdf-doc-123"
          format="pdf"
          title="Tài liệu Triết học PDF"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote trên PDF Action Strip để mở selection toolbar
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);

    const textarea = screen.getByTestId('pdf-manual-quote-textarea');
    fireEvent.change(textarea, { target: { value: 'Bản thể luận là nhánh nghiên cứu về tồn tại.' } });

    const submitBtn = screen.getByTestId('pdf-manual-quote-submit-btn');
    fireEvent.click(submitBtn);

    // Selection toolbar xuất hiện
    const toolbar = await screen.findByRole('toolbar', { name: /Công cụ trích xuất nghiên cứu/i });
    expect(toolbar).toBeInTheDocument();

    // Click nút Highlight
    const highlightBtn = within(toolbar).getByRole('button', { name: /Highlight/i });
    fireEvent.click(highlightBtn);

    // Toolbar phải đóng lại
    await waitFor(() => {
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    // Toast phải thông báo đã lưu điểm trích
    expect(await screen.findByText('Đã lưu điểm trích nghiên cứu')).toBeInTheDocument();

    // Dữ liệu phải được persist vào localStorage research inbox
    const stored = localStorage.getItem(INBOX_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const inboxItems = JSON.parse(stored || '[]');
    expect(inboxItems.length).toBeGreaterThan(0);
    expect(inboxItems[0].excerpt.selectedText).toBe('Bản thể luận là nhánh nghiên cứu về tồn tại.');
    expect(inboxItems[0].excerpt.archivedDocumentId).toBe('pdf-doc-123');

    // Mở Sidebar tab Đánh dấu để xác nhận excerpt hiển thị
    const sidebarToggle = screen.getByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(sidebarToggle);

    const highlightsTab = await screen.findByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    expect(await screen.findByText(/Bản thể luận là nhánh nghiên cứu về tồn tại/i)).toBeInTheDocument();
  });

  it('2. Copy action failure in UnifiedSelectionToolbar reports error feedback instead of silent failure', async () => {
    const onAction = vi.fn();
    vi.spyOn(clipboardModule, 'copyTextToClipboard').mockResolvedValue(false);

    render(
      <UnifiedSelectionToolbar
        isOpen={true}
        position={{ top: 100, left: 100 }}
        selectedText="Đoạn trích kiểm tra copy thất bại"
        onAction={onAction}
        onClose={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Sao chép/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      // onAction phải được gọi với success: false để Reader hiển thị toast lỗi
      expect(onAction).toHaveBeenCalledWith('copy', {
        text: 'Đoạn trích kiểm tra copy thất bại',
        success: false,
      });
    });
  });

  it('3. Copy action failure in UnifiedResearchReader shows error toast and keeps toolbar open (intentional UX)', async () => {
    vi.spyOn(clipboardModule, 'copyTextToClipboard').mockResolvedValue(false);

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="pdf-doc-123"
          fileUrl="/api/archive/file/pdf-doc-123"
          format="pdf"
          title="Tài liệu Triết học PDF"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);
    fireEvent.change(screen.getByTestId('pdf-manual-quote-textarea'), {
      target: { value: 'Nội dung kiểm tra copy lỗi' },
    });
    fireEvent.click(screen.getByTestId('pdf-manual-quote-submit-btn'));

    const toolbar = await screen.findByRole('toolbar');
    const copyBtn = within(toolbar).getByRole('button', { name: /Sao chép/i });
    fireEvent.click(copyBtn);

    // Phải hiển thị toast lỗi
    expect(await screen.findByText('Không thể sao chép vào clipboard')).toBeInTheDocument();

    // Toolbar VẪN MỞ để user có thể retry hoặc chọn action khác (intentional UX)
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('4. Citation action failure shows explicit error toast instead of misleading "Trích dẫn đã được tạo"', async () => {
    vi.spyOn(clipboardModule, 'copyTextToClipboard').mockResolvedValue(false);

    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="pdf-doc-123"
          fileUrl="/api/archive/file/pdf-doc-123"
          format="pdf"
          title="Tài liệu Triết học PDF"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);
    fireEvent.change(screen.getByTestId('pdf-manual-quote-textarea'), {
      target: { value: 'Nội dung kiểm tra citation lỗi' },
    });
    fireEvent.click(screen.getByTestId('pdf-manual-quote-submit-btn'));

    const toolbar = await screen.findByRole('toolbar');
    const citationBtn = within(toolbar).getByRole('button', { name: /Trích dẫn/i });
    fireEvent.click(citationBtn);

    // Phải hiển thị toast lỗi rõ ràng
    expect(await screen.findByText('Không thể sao chép trích dẫn vào clipboard')).toBeInTheDocument();
    expect(screen.queryByText('Trích dẫn đã được tạo')).not.toBeInTheDocument();
  });

  it('5. Add to inbox action successfully persists excerpt and shows confirmation toast', async () => {
    render(
      <DataProvider>
        <UnifiedResearchReader
          documentId="pdf-doc-123"
          fileUrl="/api/archive/file/pdf-doc-123"
          format="pdf"
          title="Tài liệu Triết học PDF"
          onClose={vi.fn()}
        />
      </DataProvider>
    );

    // Kích hoạt manual quote
    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);
    fireEvent.change(screen.getByTestId('pdf-manual-quote-textarea'), {
      target: { value: 'Nội dung gửi vào inbox' },
    });
    fireEvent.click(screen.getByTestId('pdf-manual-quote-submit-btn'));

    const toolbar = await screen.findByRole('toolbar');
    const inboxBtn = within(toolbar).getByRole('button', { name: /Thêm vào Inbox/i });
    fireEvent.click(inboxBtn);

    expect(await screen.findByText('Đã thêm trích đoạn vào Research Inbox')).toBeInTheDocument();

    const stored = localStorage.getItem(INBOX_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const items = JSON.parse(stored || '[]');
    expect(items.some((i: any) => i.excerpt?.selectedText === 'Nội dung gửi vào inbox')).toBe(true);
  });

  it('6. Highlight action fallback when addExcerptToInbox is unavailable displays error toast', async () => {
    // Render without DataProvider (so addExcerptToInbox is undefined)
    render(
      <UnifiedResearchReader
        documentId="pdf-doc-no-context"
        fileUrl="/api/archive/file/pdf-doc-no-context"
        format="pdf"
        title="Tài liệu PDF No Context"
        onClose={vi.fn()}
      />
    );

    const manualBtn = await screen.findByTestId('pdf-manual-quote-btn');
    fireEvent.click(manualBtn);
    fireEvent.change(screen.getByTestId('pdf-manual-quote-textarea'), {
      target: { value: 'Đoạn trích khi không có context' },
    });
    fireEvent.click(screen.getByTestId('pdf-manual-quote-submit-btn'));

    const toolbar = await screen.findByRole('toolbar');
    const highlightBtn = within(toolbar).getByRole('button', { name: /Highlight/i });
    fireEvent.click(highlightBtn);

    // Phải hiển thị toast lỗi rõ ràng
    expect(await screen.findByText('Không thể lưu điểm trích')).toBeInTheDocument();

    // Toolbar đóng lại
    await waitFor(() => {
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });
});
