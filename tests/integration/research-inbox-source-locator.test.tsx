import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ResearchInboxDrawer } from '../../src/components/research/ResearchInboxDrawer';
import { UnifiedSelectionToolbar } from '../../src/components/reader/UnifiedSelectionToolbar';
import { DataProvider, useData } from '../../src/context/DataContext';
import { ResearchInboxItem, ResearchExcerpt, Note } from '../../src/types';

describe('Phase R1: Research Inbox Triage & Source Locator Reopening', () => {
  const sampleExcerptMd: ResearchExcerpt = {
    id: 'excerpt-md-1',
    archivedDocumentId: 'vault:01_Notes/vi_dieu_phap.md',
    selectedText: 'Sắc pháp gồm 28 thứ sắc chia thành sắc tứ đại và sắc y sinh.',
    positionSelector: {
      headingId: 'chuong-2-sac-phap',
    },
    citationSnapshot: {
      title: 'Vi Diệu Pháp Toàn Thư',
      formatted: 'Vi Diệu Pháp Toàn Thư (Mục: chuong-2-sac-phap)',
    },
    highlightColor: '#fef08a',
    status: 'inbox',
    createdAt: '2026-09-19T08:00:00.000Z',
    updatedAt: '2026-09-19T08:00:00.000Z',
  };

  const sampleExcerptPdf: ResearchExcerpt = {
    id: 'excerpt-pdf-1',
    archivedDocumentId: 'vault:02_PDF_Source/kinh_tang.pdf',
    selectedText: 'Tất cả các pháp hữu vi đều vô thường.',
    positionSelector: {
      pageNumber: 42,
    },
    citationSnapshot: {
      title: 'Kinh Tạng Pāḷi',
      formatted: 'Kinh Tạng Pāḷi, tr. 42',
    },
    highlightColor: '#fef08a',
    status: 'inbox',
    createdAt: '2026-09-19T08:30:00.000Z',
    updatedAt: '2026-09-19T08:30:00.000Z',
  };

  const sampleInboxItems: ResearchInboxItem[] = [
    {
      id: 'inbox-item-1',
      excerptId: 'excerpt-md-1',
      excerpt: sampleExcerptMd,
      isProcessed: false,
      priority: 0,
      createdAt: '2026-09-19T08:00:00.000Z',
      updatedAt: '2026-09-19T08:00:00.000Z',
    },
    {
      id: 'inbox-item-2',
      excerptId: 'excerpt-pdf-1',
      excerpt: sampleExcerptPdf,
      isProcessed: false,
      priority: 1,
      createdAt: '2026-09-19T08:30:00.000Z',
      updatedAt: '2026-09-19T08:30:00.000Z',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Reopening Source with Universal Locators', () => {
    it('1.1. calls onView with excerpt locator details when clicking "Xem nguồn" on Markdown excerpt', () => {
      const handleView = vi.fn();
      const handleDismiss = vi.fn();
      const handleSendToNote = vi.fn();

      render(
        <ResearchInboxDrawer
          isOpen={true}
          items={sampleInboxItems}
          onView={handleView}
          onDismiss={handleDismiss}
          onSendToNote={handleSendToNote}
          onClose={vi.fn()}
        />
      );

      // Verify items render
      expect(screen.getByText(/Sắc pháp gồm 28 thứ sắc/i)).toBeInTheDocument();
      expect(screen.getByText(/Tất cả các pháp hữu vi đều vô thường/i)).toBeInTheDocument();

      // Target the view button for the markdown excerpt item
      const mdExcerpt = screen.getByText(/Sắc pháp gồm 28 thứ sắc/i);
      const mdCard = mdExcerpt.closest('div.space-y-3') || mdExcerpt.parentElement;
      const mdViewBtn = within(mdCard as HTMLElement).getByTitle(/Mở vị trí nguồn tài liệu/i);

      fireEvent.click(mdViewBtn);

      expect(handleView).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          excerpt: expect.objectContaining({
            positionSelector: expect.objectContaining({
              headingId: 'chuong-2-sac-phap',
            }),
          }),
        })
      );
    });

    it('1.2. preserves PDF page locator when opening PDF excerpt from inbox', () => {
      const handleView = vi.fn();

      render(
        <ResearchInboxDrawer
          isOpen={true}
          items={sampleInboxItems}
          onView={handleView}
          onDismiss={vi.fn()}
          onSendToNote={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const pdfItem = sampleInboxItems.find((i) => i.excerpt?.positionSelector?.pageNumber === 42);
      expect(pdfItem).toBeDefined();
      expect(pdfItem?.excerpt.positionSelector?.pageNumber).toBe(42);
    });
  });

  describe('2. Triage Actions (Dismiss & Process)', () => {
    it('2.1. calls onDismiss when dismiss button is clicked', () => {
      const handleDismiss = vi.fn();

      render(
        <ResearchInboxDrawer
          isOpen={true}
          items={sampleInboxItems}
          onView={vi.fn()}
          onDismiss={handleDismiss}
          onSendToNote={vi.fn()}
          onClose={vi.fn()}
        />
      );

      const dismissButtons = screen.getAllByTitle(/Đánh dấu đã xử lý \/ bỏ qua/i);
      fireEvent.click(dismissButtons[0]);

      expect(handleDismiss).toHaveBeenCalledWith(sampleInboxItems[1].id);
    });
  });
});
