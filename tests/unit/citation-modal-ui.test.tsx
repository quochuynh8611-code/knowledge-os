import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CitationModal } from '../../src/components/modals/CitationModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { Resource } from '../../src/types';

const sampleResource: Resource = {
  id: 'res-101',
  topicId: 'topic-1',
  topicTitle: 'Vi Diệu Pháp (Abhidharma)',
  title: 'Thắng Pháp Tập Yếu Luận (Abhidhammattha-sangaha)',
  author: 'Trưởng lão Anuruddha',
  type: 'book',
  url: 'https://example.com/sangaha.pdf',
  notes: 'Bản dịch HT. Thích Minh Châu (2022).',
  createdAt: '2022-06-01T00:00:00Z',
};

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: [],
    topics: [{ id: 'topic-1', title: 'Vi Diệu Pháp (Abhidharma)', slug: 'vi-dieu-phap' }],
    notes: [],
    resources: [sampleResource],
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

describe('Scholar Citation Modal UI Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: Modal renders with default APA 7th format
  // ---------------------------------------------------------------------------
  it('1. Render CitationModal với định dạng mặc định APA 7th', () => {
    render(<CitationModal isOpen={true} onClose={vi.fn()} resource={sampleResource} />);

    expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
    expect(screen.getByTestId('tab-citation-apa')).toBeInTheDocument();
    expect(screen.getByTestId('tab-citation-bibtex')).toBeInTheDocument();
    expect(screen.getByTestId('tab-citation-markdown')).toBeInTheDocument();

    const preview = screen.getByTestId('citation-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('Trưởng lão Anuruddha');
    expect(preview.value).toContain('Thắng Pháp Tập Yếu Luận');
  });

  // ---------------------------------------------------------------------------
  // Test 2: Switching tabs updates preview
  // ---------------------------------------------------------------------------
  it('2. Chuyển tab sang BibTeX và Markdown cập nhật nội dung preview tương ứng', () => {
    render(<CitationModal isOpen={true} onClose={vi.fn()} resource={sampleResource} />);

    // Switch to BibTeX
    fireEvent.click(screen.getByTestId('tab-citation-bibtex'));
    const bibtexPreview = screen.getByTestId('citation-preview') as HTMLTextAreaElement;
    expect(bibtexPreview.value).toContain('@book{');

    // Switch to Markdown
    fireEvent.click(screen.getByTestId('tab-citation-markdown'));
    const markdownPreview = screen.getByTestId('citation-preview') as HTMLTextAreaElement;
    expect(markdownPreview.value).toContain('[^1]:');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Copy to clipboard triggers writeText and simple feedback
  // ---------------------------------------------------------------------------
  it('3. Nhấn Sao Chép ghi trích dẫn vào clipboard và hiển thị phản hồi tức thì', async () => {
    render(<CitationModal isOpen={true} onClose={vi.fn()} resource={sampleResource} />);

    const copyBtn = screen.getByRole('button', { name: /Sao chép trích dẫn|Copy/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getAllByText(/Đã sao chép/i).length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: ResourcesManager renders "Trích dẫn" button that opens CitationModal
  // ---------------------------------------------------------------------------
  it('4. ResourcesManager render nút "Trích dẫn" trên thẻ và mở modal khi click', async () => {
    render(<ResourcesManager />);

    const citeBtn = screen.getByRole('button', { name: /Trích dẫn|Cite/i });
    expect(citeBtn).toBeInTheDocument();

    fireEvent.click(citeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Trích Dẫn Học Thuật/i)).toBeInTheDocument();
    });
  });
});
