import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReaderSidebar } from '../../src/components/reader/ReaderSidebar';
import { ResearchExcerpt } from '../../src/types';

describe('Phase R3c: Reader Highlights Filtering & Quick Search (Test-First)', () => {
  const sampleExcerpts: ResearchExcerpt[] = [
    {
      id: 'e-1',
      archivedDocumentId: 'doc-1',
      selectedText: 'Khổ đế là thực tại đầu tiên trong Tứ Diệu Đế.',
      positionSelector: { headingId: 'sec-1' },
      highlightColor: '#fef08a', // Vàng
      userNote: 'Định nghĩa cốt lõi cần ghi nhớ.',
      status: 'active',
      createdAt: '2026-10-14T08:00:00.000Z',
      updatedAt: '2026-10-14T08:00:00.000Z',
    },
    {
      id: 'e-2',
      archivedDocumentId: 'doc-1',
      selectedText: 'Tập đế chỉ ra nguồn gốc của khổ đau là tham ái.',
      positionSelector: { headingId: 'sec-2' },
      highlightColor: '#bbf7d0', // Xanh lá
      userNote: 'Nguyên nhân tâm lý sâu xa.',
      status: 'active',
      createdAt: '2026-10-14T08:05:00.000Z',
      updatedAt: '2026-10-14T08:05:00.000Z',
    },
    {
      id: 'e-3',
      archivedDocumentId: 'doc-1',
      selectedText: 'Diệt đế là sự chấm dứt hoàn toàn khổ ách.',
      positionSelector: { headingId: 'sec-3' },
      highlightColor: '#bae6fd', // Xanh dương
      userNote: 'Trạng thái giải thoát Niết Bàn tịch tịnh.',
      status: 'active',
      createdAt: '2026-10-14T08:10:00.000Z',
      updatedAt: '2026-10-14T08:10:00.000Z',
    },
    {
      id: 'e-4',
      archivedDocumentId: 'doc-1',
      selectedText: 'Đạo đế gồm tám chi phần Bát Chánh Đạo tu tập.',
      positionSelector: { headingId: 'sec-4' },
      highlightColor: '#fbcfe8', // Hồng
      userNote: 'Con đường thực hành giới định tuệ.',
      status: 'active',
      createdAt: '2026-10-14T08:15:00.000Z',
      updatedAt: '2026-10-14T08:15:00.000Z',
    },
    {
      id: 'e-5',
      archivedDocumentId: 'doc-1',
      selectedText: 'Khổ đau bắt nguồn từ vô minh và chấp thủ ngũ uẩn.',
      positionSelector: { headingId: 'sec-5' },
      highlightColor: undefined as any, // Mặc định fallback Vàng (#fef08a)
      userNote: 'Cần đối chiếu sớ giải Thanh Tịnh Đạo.',
      status: 'active',
      createdAt: '2026-10-14T08:20:00.000Z',
      updatedAt: '2026-10-14T08:20:00.000Z',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeTab: 'highlights' as const,
    onTabChange: vi.fn(),
    tocItems: [],
    onSelectTocItem: vi.fn(),
    documentId: 'doc-1',
    documentTitle: 'Kinh Chuyển Pháp Luân',
    excerpts: sampleExcerpts,
    onSelectExcerpt: vi.fn(),
    onUpdateExcerpt: vi.fn(),
    onDeleteExcerpt: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Filters excerpts by color chip and shows accurate subset', async () => {
    const user = userEvent.setup();
    render(<ReaderSidebar {...defaultProps} />);

    // Initially all 5 excerpts are visible
    expect(screen.getByTestId('excerpt-card-e-1')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-2')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-3')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-4')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-5')).toBeInTheDocument();

    // Click on "Vàng" color filter chip (id: yellow)
    const yellowChip = screen.getByTestId('filter-color-yellow');
    await user.click(yellowChip);

    // Only e-1 (#fef08a) and e-5 (undefined -> fallback #fef08a) should be visible
    expect(screen.getByTestId('excerpt-card-e-1')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-5')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-4')).not.toBeInTheDocument();

    // Click on "Xanh dương" (id: blue)
    const blueChip = screen.getByTestId('filter-color-blue');
    await user.click(blueChip);

    expect(screen.getByTestId('excerpt-card-e-3')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-2')).not.toBeInTheDocument();

    // Click on "Tất cả" (id: all) restores all
    const allChip = screen.getByTestId('filter-color-all');
    await user.click(allChip);
    expect(screen.getByTestId('excerpt-card-e-1')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-2')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-3')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-4')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-5')).toBeInTheDocument();
  });

  it('2. Searches excerpts by keyword in selectedText (supports unaccented Vietnamese)', async () => {
    const user = userEvent.setup();
    render(<ReaderSidebar {...defaultProps} />);

    const searchInput = screen.getByTestId('highlights-search-input');
    expect(searchInput).toBeInTheDocument();

    // Type with accents
    await user.type(searchInput, 'Bát Chánh Đạo');

    expect(screen.getByTestId('excerpt-card-e-4')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-2')).not.toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByTestId('highlights-search-clear');
    await user.click(clearBtn);

    // Search without accents: "ngu uan" matches "ngũ uẩn" in e-5
    await user.type(searchInput, 'ngu uan');
    expect(screen.getByTestId('excerpt-card-e-5')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-1')).not.toBeInTheDocument();
  });

  it('3. Searches excerpts by keyword in userNote', async () => {
    const user = userEvent.setup();
    render(<ReaderSidebar {...defaultProps} />);

    const searchInput = screen.getByTestId('highlights-search-input');
    await user.type(searchInput, 'tâm lý');

    // Matches userNote of e-2 ("Nguyên nhân tâm lý sâu xa.")
    expect(screen.getByTestId('excerpt-card-e-2')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-3')).not.toBeInTheDocument();
  });

  it('4. Filters excerpts by combination of color chip AND search keyword (AND logic)', async () => {
    const user = userEvent.setup();
    render(<ReaderSidebar {...defaultProps} />);

    // Select color "Vàng" -> e-1 and e-5
    const yellowChip = screen.getByTestId('filter-color-yellow');
    await user.click(yellowChip);

    // Type keyword "đầu tiên" which only exists in e-1
    const searchInput = screen.getByTestId('highlights-search-input');
    await user.type(searchInput, 'đầu tiên');

    expect(screen.getByTestId('excerpt-card-e-1')).toBeInTheDocument();
    expect(screen.queryByTestId('excerpt-card-e-5')).not.toBeInTheDocument();
  });

  it('5. Renders empty filtered state when no excerpts match active filters and resets filters upon clicking reset button', async () => {
    const user = userEvent.setup();
    render(<ReaderSidebar {...defaultProps} />);

    const searchInput = screen.getByTestId('highlights-search-input');
    await user.type(searchInput, 'Từ khóa tuyệt đối không có');

    // Empty state should be visible
    const emptyState = screen.getByTestId('highlights-empty-filter-state');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy đoạn trích phù hợp/i)).toBeInTheDocument();

    // Click "Đặt lại bộ lọc"
    const resetBtn = screen.getByTestId('btn-reset-highlights-filter');
    await user.click(resetBtn);

    // All excerpts should be restored and input cleared
    expect(searchInput).toHaveValue('');
    expect(screen.getByTestId('excerpt-card-e-1')).toBeInTheDocument();
    expect(screen.getByTestId('excerpt-card-e-2')).toBeInTheDocument();
  });

  it('6. Clears search input on Escape without triggering sidebar onClose', async () => {
    const onClose = vi.fn();
    render(<ReaderSidebar {...defaultProps} onClose={onClose} />);

    const searchInput = screen.getByTestId('highlights-search-input');
    fireEvent.change(searchInput, { target: { value: 'đang tìm kiếm' } });
    expect(searchInput).toHaveValue('đang tìm kiếm');

    // Press Escape inside search input
    fireEvent.keyDown(searchInput, { key: 'Escape' });

    // Search input should be cleared
    expect(searchInput).toHaveValue('');

    // Sidebar onClose must NOT have been called
    expect(onClose).not.toHaveBeenCalled();
  });

  it('7. Displays accurate count badges on color filter chips', () => {
    render(<ReaderSidebar {...defaultProps} />);

    // All: 5
    expect(screen.getByTestId('filter-color-all')).toHaveTextContent('5');
    // Yellow (e-1 + e-5 fallback): 2
    expect(screen.getByTestId('filter-color-yellow')).toHaveTextContent('2');
    // Green (e-2): 1
    expect(screen.getByTestId('filter-color-green')).toHaveTextContent('1');
    // Blue (e-3): 1
    expect(screen.getByTestId('filter-color-blue')).toHaveTextContent('1');
    // Pink (e-4): 1
    expect(screen.getByTestId('filter-color-pink')).toHaveTextContent('1');
  });
});
