import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AdvancedSearch } from '../../src/components/search/AdvancedSearch';
import * as vectorSearchEngine from '../../src/lib/vectorSearchEngine';

const mockTopics = [
  { id: 'top-1', categoryId: 'cat-1', title: 'Thuật toán đồ thị', tags: ['algo'] },
  { id: 'top-2', categoryId: 'cat-1', title: 'Hệ quản trị cơ sở dữ liệu', tags: ['db'] },
];

const mockNotes = [
  { id: 'note-1', topicId: 'top-1', title: 'Ghi chú Dijkstra', content: 'Tìm đường đi ngắn nhất', tags: ['algo'] },
  { id: 'note-2', topicId: 'top-2', title: 'Ghi chú B-Tree', content: 'Cấu trúc chỉ mục B-Tree', tags: ['db'] },
];

const mockResources = [
  { id: 'res-1', topicId: 'top-1', title: 'Tài liệu Sách Giải Thuật', type: 'book' },
];

let currentQuery = '';
const mockSetSearchQuery = vi.fn((q: string) => {
  currentQuery = q;
});

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    searchQuery: currentQuery,
    setSearchQuery: mockSetSearchQuery,
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    categories: [],
    tags: [],
    openTopicDetail: vi.fn(),
  }),
}));

describe('AdvancedSearch Performance Optimization: Memoized Index & Query Debounce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentQuery = '';
  });

  it('1. Tách biệt Index Construction và Memoize: chỉ gọi buildSearchableKnowledgeDocuments khi entities thay đổi', () => {
    const spyBuildDocs = vi.spyOn(vectorSearchEngine, 'buildSearchableKnowledgeDocuments');

    const { rerender } = render(<AdvancedSearch />);

    expect(spyBuildDocs).toHaveBeenCalledTimes(1);

    // Rerender component without changing entities
    rerender(<AdvancedSearch />);

    // Index construction should NOT be re-executed
    expect(spyBuildDocs).toHaveBeenCalledTimes(1);
  });

  it('2. Debounce truy vấn 250ms: chỉ kích hoạt tìm kiếm hybrid khi ngừng gõ phím', async () => {
    vi.useFakeTimers();

    render(<AdvancedSearch />);

    // Switch to hybrid search
    const btnHybrid = screen.getByTestId('btn-search-mode-hybrid');
    fireEvent.click(btnHybrid);

    const searchInput = screen.getByPlaceholderText(/Nhập thuật ngữ, chủ đề hoặc khái niệm/);
    expect(searchInput).toBeInTheDocument();

    // Type character sequence
    fireEvent.change(searchInput, { target: { value: 'Dijkstra' } });

    // Right after typing (before 250ms timer completes), debounced search has not fired yet
    expect(screen.queryAllByTestId('semantic-similarity-badge').length).toBe(0);

    // Fast-forward debounce timer by 250ms
    act(() => {
      vi.advanceTimersByTime(260);
    });

    // Now hybrid search executes and displays results
    expect(screen.getByText('Thuật toán đồ thị')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
