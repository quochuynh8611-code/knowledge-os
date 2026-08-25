import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchCitationModal } from '../../src/components/modals/BatchCitationModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { Resource } from '../../src/types';

const sampleResources: Resource[] = [
  {
    id: 'res-1',
    topicId: 'topic-1',
    topicTitle: 'Vi Diệu Pháp (Abhidharma)',
    title: 'Câu Xá Luận (Abhidharmakośabhāṣya)',
    author: 'Vasubandhu',
    type: 'book',
    url: 'https://example.com/cauxaluan.pdf',
    notes: 'Năm 2024.',
    createdAt: '2024-03-15T08:00:00Z',
  },
  {
    id: 'res-2',
    topicId: 'topic-1',
    topicTitle: 'Vi Diệu Pháp (Abhidharma)',
    title: 'Thắng Pháp Tập Yếu Luận',
    author: 'Anuruddha',
    type: 'book',
    url: 'https://example.com/sangaha.pdf',
    notes: 'Năm 2022.',
    createdAt: '2022-06-01T00:00:00Z',
  },
];

let mockCurrentResources: Resource[] = sampleResources;

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: [],
    topics: [{ id: 'topic-1', title: 'Vi Diệu Pháp (Abhidharma)', slug: 'vi-dieu-phap' }],
    notes: [],
    resources: mockCurrentResources,
    studyProgress: {},
    tags: [],
    selectedTopic: null,
    addResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
    filterOptions: { search: '', category: 'all', status: 'all', tags: [] },
    setFilterOptions: vi.fn(),
  }),
}));

describe('Scholar Batch Citation Modal UI Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockCurrentResources = sampleResources;
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: Toolbar displays batch export button with item count
  // ---------------------------------------------------------------------------
  it('1. Toolbar trong ResourcesManager hiển thị nút xuất danh mục trích dẫn với đúng số lượng', () => {
    render(<ResourcesManager />);

    const exportBtn = screen.getByRole('button', {
      name: /Xuất danh mục.*\(2\)|Xuất trích dẫn.*\(2\)/i,
    });
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).not.toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Button is disabled when filtered list is empty
  // ---------------------------------------------------------------------------
  it('2. Nút xuất danh mục trên Toolbar bị vô hiệu hóa khi không có tài liệu', () => {
    mockCurrentResources = [];
    render(<ResourcesManager />);

    const exportBtn = screen.getByRole('button', {
      name: /Xuất danh mục.*\(0\)|Xuất trích dẫn.*\(0\)/i,
    });
    expect(exportBtn).toBeInTheDocument();
    expect(exportBtn).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Test 3: Clicking button opens BatchCitationModal
  // ---------------------------------------------------------------------------
  it('3. Nhấn nút xuất danh mục trên Toolbar mở BatchCitationModal', async () => {
    mockCurrentResources = sampleResources;
    render(<ResourcesManager />);

    const exportBtn = screen.getByRole('button', {
      name: /Xuất danh mục.*\(2\)|Xuất trích dẫn.*\(2\)/i,
    });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Xuất Danh Mục Trích Dẫn/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Batch preview displays content and tab switching works
  // ---------------------------------------------------------------------------
  it('4. BatchCitationModal hiển thị preview gộp và chuyển tab định dạng', () => {
    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    expect(screen.getByTestId('batch-tab-apa')).toBeInTheDocument();
    expect(screen.getByTestId('batch-tab-bibtex')).toBeInTheDocument();
    expect(screen.getByTestId('batch-tab-markdown')).toBeInTheDocument();

    const preview = screen.getByTestId('batch-citation-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('Vasubandhu');
    expect(preview.value).toContain('Anuruddha');

    // Switch to BibTeX
    fireEvent.click(screen.getByTestId('batch-tab-bibtex'));
    expect(preview.value).toContain('@book{');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Copy all triggers clipboard writeText with inline feedback
  // ---------------------------------------------------------------------------
  it('5. Nhấn Sao Chép Toàn Bộ ghi vào clipboard và hiện phản hồi inline', async () => {
    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Sao chép toàn bộ|Copy all/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getAllByText(/Đã sao chép/i).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Download action reflects proper filename for current format
  // ---------------------------------------------------------------------------
  it('6. Nút Tải Tệp thể hiện đúng tên tệp references.bib / references.txt / references.md', () => {
    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    // Mặc định APA -> references.txt
    expect(screen.getByRole('button', { name: /Tải tệp.*references\.txt/i })).toBeInTheDocument();

    // Chuyển sang BibTeX -> references.bib
    fireEvent.click(screen.getByTestId('batch-tab-bibtex'));
    expect(screen.getByRole('button', { name: /Tải tệp.*references\.bib/i })).toBeInTheDocument();

    // Chuyển sang Markdown -> references.md
    fireEvent.click(screen.getByTestId('batch-tab-markdown'));
    expect(screen.getByRole('button', { name: /Tải tệp.*references\.md/i })).toBeInTheDocument();
  });
});
