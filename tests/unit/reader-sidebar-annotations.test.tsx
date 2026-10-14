import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import { UnifiedResearchReader } from '../../src/components/reader/UnifiedResearchReader';
import { DataContext } from '../../src/context/DataContext';
import { ResearchExcerpt } from '../../src/types';

describe('Phase R3b Stage 3: ReaderSidebar Annotations & Inline Note Editor (Test-First)', () => {
  const sampleExcerpts: ResearchExcerpt[] = [
    {
      id: 'exc-color-blue',
      archivedDocumentId: 'doc-nghien-cuu-1',
      selectedText: 'Đoạn văn đánh dấu màu xanh dương.',
      positionSelector: { headingId: 'muc-1' },
      highlightColor: '#bae6fd',
      citationSnapshot: { title: 'Tài Liệu Nghiên Cứu' },
      userNote: 'Ghi chú quan trọng về duyên khởi.',
      status: 'active',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z',
    },
    {
      id: 'exc-color-green',
      archivedDocumentId: 'doc-nghien-cuu-1',
      selectedText: 'Đoạn văn đánh dấu màu xanh lá.',
      positionSelector: { headingId: 'muc-2' },
      highlightColor: '#bbf7d0',
      citationSnapshot: { title: 'Tài Liệu Nghiên Cứu' },
      userNote: undefined,
      status: 'active',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z',
    },
    {
      id: 'exc-color-default',
      archivedDocumentId: 'doc-nghien-cuu-1',
      selectedText: 'Đoạn văn không có màu (fallback vàng).',
      positionSelector: { headingId: 'muc-3' },
      highlightColor: undefined as any,
      citationSnapshot: { title: 'Tài Liệu Nghiên Cứu' },
      status: 'active',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeTab: 'highlights' as const,
    onTabChange: vi.fn(),
    tocItems: [],
    onSelectTocItem: vi.fn(),
    documentId: 'doc-nghien-cuu-1',
    documentTitle: 'Tài Liệu Nghiên Cứu',
    excerpts: sampleExcerpts,
    onUpdateExcerpt: vi.fn(),
    onDeleteExcerpt: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders actual highlightColor on excerpt cards with fallback to default yellow (#fef08a)', () => {
    render(<ReaderSidebar {...defaultProps} />);

    const cardBlue = screen.getByTestId('excerpt-card-exc-color-blue');
    expect(cardBlue).toHaveStyle({ borderLeftColor: '#bae6fd' });

    const cardGreen = screen.getByTestId('excerpt-card-exc-color-green');
    expect(cardGreen).toHaveStyle({ borderLeftColor: '#bbf7d0' });

    const cardDefault = screen.getByTestId('excerpt-card-exc-color-default');
    expect(cardDefault).toHaveStyle({ borderLeftColor: '#fef08a' });
  });

  it('2. Renders userNote when present and omits display block when empty', () => {
    render(<ReaderSidebar {...defaultProps} />);

    expect(screen.getByText('Ghi chú quan trọng về duyên khởi.')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-note-display-exc-color-green')).not.toBeInTheDocument();
  });

  it('3. Opens inline note editor, saves draft, and calls onUpdateExcerpt', () => {
    const onUpdateExcerpt = vi.fn();
    render(<ReaderSidebar {...defaultProps} onUpdateExcerpt={onUpdateExcerpt} />);

    const noteToggle = screen.getByTestId('excerpt-note-toggle-exc-color-green');
    fireEvent.click(noteToggle);

    const textarea = screen.getByTestId('excerpt-note-textarea-exc-color-green');
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Ghi chú mới thêm vào đoạn xanh lá' } });

    const saveBtn = screen.getByTestId('excerpt-note-save-exc-color-green');
    fireEvent.click(saveBtn);

    expect(onUpdateExcerpt).toHaveBeenCalledWith('exc-color-green', {
      userNote: 'Ghi chú mới thêm vào đoạn xanh lá',
    });
    expect(screen.queryByTestId('excerpt-note-textarea-exc-color-green')).not.toBeInTheDocument();
  });

  it('4. Cancels inline note editing when Escape is pressed without calling onUpdateExcerpt', () => {
    const onUpdateExcerpt = vi.fn();
    render(<ReaderSidebar {...defaultProps} onUpdateExcerpt={onUpdateExcerpt} />);

    const noteToggle = screen.getByTestId('excerpt-note-toggle-exc-color-blue');
    fireEvent.click(noteToggle);

    const textarea = screen.getByTestId('excerpt-note-textarea-exc-color-blue');
    fireEvent.change(textarea, { target: { value: 'Nội dung chưa muốn lưu' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(onUpdateExcerpt).not.toHaveBeenCalled();
    expect(screen.queryByTestId('excerpt-note-textarea-exc-color-blue')).not.toBeInTheDocument();
  });

  it('5. Submitting empty string in note editor clears userNote (passes undefined)', () => {
    const onUpdateExcerpt = vi.fn();
    render(<ReaderSidebar {...defaultProps} onUpdateExcerpt={onUpdateExcerpt} />);

    const noteToggle = screen.getByTestId('excerpt-note-toggle-exc-color-blue');
    fireEvent.click(noteToggle);

    const textarea = screen.getByTestId('excerpt-note-textarea-exc-color-blue');
    fireEvent.change(textarea, { target: { value: '   ' } });

    const saveBtn = screen.getByTestId('excerpt-note-save-exc-color-blue');
    fireEvent.click(saveBtn);

    expect(onUpdateExcerpt).toHaveBeenCalledWith('exc-color-blue', {
      userNote: undefined,
    });
  });

  it('6. UnifiedResearchReader passes updateExcerpt callback down to ReaderSidebar', async () => {
    const updateExcerptMock = vi.fn().mockResolvedValue({});
    const mockContextValue = {
      notes: [],
      resources: [],
      researchExcerpts: [sampleExcerpts[0]],
      researchInboxItems: [],
      addExcerpt: vi.fn(),
      deleteExcerpt: vi.fn(),
      updateExcerpt: updateExcerptMock,
      addExcerptToInbox: vi.fn(),
      deleteInboxItem: vi.fn(),
      unprocessedInboxCount: 0,
    };

    render(
      <DataContext.Provider value={mockContextValue as any}>
        <UnifiedResearchReader
          documentId="doc-nghien-cuu-1"
          title="Tài Liệu Nghiên Cứu"
          format="md"
          content="# Mục 1\nNội dung văn bản."
          onClose={vi.fn()}
        />
      </DataContext.Provider>
    );

    // Mở sidebar và chuyển sang tab Highlights
    const sidebarToggle = await screen.findByTestId('reader-toggle-sidebar-btn');
    fireEvent.click(sidebarToggle);

    const highlightsTab = screen.getByTestId('sidebar-tab-highlights');
    fireEvent.click(highlightsTab);

    // Bấm sửa ghi chú
    const noteToggle = await screen.findByTestId('excerpt-note-toggle-exc-color-blue');
    fireEvent.click(noteToggle);

    const textarea = screen.getByTestId('excerpt-note-textarea-exc-color-blue');
    fireEvent.change(textarea, { target: { value: 'Cập nhật ghi chú từ reader integration' } });

    const saveBtn = screen.getByTestId('excerpt-note-save-exc-color-blue');
    fireEvent.click(saveBtn);

    expect(updateExcerptMock).toHaveBeenCalledWith('exc-color-blue', {
      userNote: 'Cập nhật ghi chú từ reader integration',
    });
  });
});
