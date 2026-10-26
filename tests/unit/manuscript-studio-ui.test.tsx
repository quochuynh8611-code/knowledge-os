import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManuscriptStudioModal } from '../../src/components/modals/ManuscriptStudioModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { Resource, Note } from '../../src/types';

const mockResourceVaswani: Resource = {
  id: 'res-vaswani',
  topicId: 'topic-nlp',
  topicTitle: 'NLP',
  title: 'Attention Is All You Need',
  author: 'Vaswani, Ashish',
  year: '2017',
  type: 'article',
  url: 'https://arxiv.org/abs/1706.03762',
  journal: 'NeurIPS',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockResourceYe: Resource = {
  id: 'res-ye',
  topicId: 'topic-nlp',
  topicTitle: 'NLP',
  title: 'Transformers are Not Inherently Superior for Short Sequences',
  author: 'Ye, Zixuan',
  year: '2024',
  type: 'article',
  journal: 'ACL',
  createdAt: '2024-02-01T00:00:00Z',
};

const mockNote1: Note = {
  id: 'note-1',
  topicId: 'topic-nlp',
  title: 'Cơ Sở Lý Thuyết Về Attention',
  content: 'Cơ chế Self-Attention tính toán ma trận trọng số theo tích vô hướng thu phóng.',
  type: 'study',
  isPrivate: false,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockNote2: Note = {
  id: 'note-2',
  topicId: 'topic-nlp',
  title: 'Độ Phức Tạp Thuật Toán',
  content: 'Độ phức tạp tính toán là $O(N^2)$ theo chiều dài chuỗi đầu vào.',
  type: 'study',
  isPrivate: false,
  tags: [],
  createdAt: '2024-01-02T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
};

const mockTopics = [{ id: 'topic-nlp', title: 'Xử Lý Ngôn Ngữ Tự Nhiên' }];
const mockResources = [mockResourceVaswani, mockResourceYe];
const mockNotes = [mockNote1, mockNote2];

// Mock DataContext for ResourcesManager integration
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    resources: mockResources,
    topics: mockTopics,
    notes: mockNotes,
    researchExcerpts: [],
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
  }),
}));

describe('Phase 9B: Academic Manuscript Studio UI Integration', () => {
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
  // 1. Live Manuscript Compilation & Style Switching
  // ---------------------------------------------------------------------------
  it('1. Biên dịch trực tiếp bản thảo, hiển thị số liệu thống kê và chuyển đổi định dạng APA sang IEEE', async () => {
    render(
      <ManuscriptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        notes={mockNotes}
        topics={mockTopics}
      />
    );

    expect(screen.getByTestId('manuscript-studio-modal')).toBeInTheDocument();

    // Type body with APA citation
    const bodyTextarea = screen.getByTestId('manuscript-body-textarea');
    fireEvent.change(bodyTextarea, {
      target: { value: 'Theo nghiên cứu kinh điển [@vaswani2017, p. 4], mô hình Transformer rất vượt trội.' },
    });

    // Verify preview in APA (default style)
    const previewContainer = screen.getByTestId('manuscript-compiled-preview');
    expect(previewContainer).toHaveTextContent('(Vaswani, 2017, p. 4)');
    expect(previewContainer).toHaveTextContent('Tài Liệu Tham Khảo (References)');
    expect(previewContainer).toHaveTextContent('Vaswani, Ashish');

    // Switch style to IEEE
    const styleSelect = screen.getByTestId('manuscript-style-select');
    fireEvent.change(styleSelect, { target: { value: 'ieee' } });

    // Verify preview updated to IEEE numeric style
    expect(previewContainer).toHaveTextContent('[1, p. 4]');
    expect(previewContainer).toHaveTextContent('[1]');
    expect(previewContainer).not.toHaveTextContent('(Vaswani, 2017');
  });

  // ---------------------------------------------------------------------------
  // 2. Citekey Autocomplete / Quick-Insert Picker
  // ---------------------------------------------------------------------------
  it('2. Lọc danh sách citekey và chèn nhanh [@key] vào vị trí soạn thảo', async () => {
    render(
      <ManuscriptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        notes={mockNotes}
        topics={mockTopics}
      />
    );

    const bodyTextarea = screen.getByTestId('manuscript-body-textarea') as HTMLTextAreaElement;
    fireEvent.change(bodyTextarea, { target: { value: 'Nghiên cứu của ' } });

    // Filter citekeys
    const searchInput = screen.getByTestId('citekey-search-input');
    fireEvent.change(searchInput, { target: { value: 'ye' } });

    // Chip for ye2024 should be visible
    const insertBtn = screen.getByTestId('insert-citekey-btn-ye2024');
    expect(insertBtn).toBeInTheDocument();

    // Click to insert citekey
    fireEvent.click(insertBtn);

    // Textarea and preview should contain inserted citekey
    expect(bodyTextarea.value).toContain('[@ye2024]');
    const previewContainer = screen.getByTestId('manuscript-compiled-preview');
    expect(previewContainer).toHaveTextContent('Ye, 2024');
  });

  // ---------------------------------------------------------------------------
  // 3. Unresolved Citekey Lint Warning Banner
  // ---------------------------------------------------------------------------
  it('3. Hiển thị banner cảnh báo citekey lỗi khi gõ mã trích dẫn không tồn tại', async () => {
    render(
      <ManuscriptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        notes={mockNotes}
        topics={mockTopics}
      />
    );

    const bodyTextarea = screen.getByTestId('manuscript-body-textarea');
    fireEvent.change(bodyTextarea, {
      target: { value: 'Tham khảo nghiên cứu [@unknown2099] chưa được nạp vào thư viện.' },
    });

    // Unresolved warning banner should appear
    const warningBanner = screen.getByTestId('manuscript-unresolved-warning');
    expect(warningBanner).toBeInTheDocument();
    expect(warningBanner).toHaveTextContent('unknown2099');

    // Preview shows safe placeholder
    const previewContainer = screen.getByTestId('manuscript-compiled-preview');
    expect(previewContainer).toHaveTextContent('[@unknown2099?]');
  });

  // ---------------------------------------------------------------------------
  // 4. Multi-Note Section Inclusion & Literature Matrix Appendix Toggle
  // ---------------------------------------------------------------------------
  it('4. Bật/tắt các section ghi chú và tùy chọn đính kèm ma trận tổng quan y văn ở phụ lục', async () => {
    render(
      <ManuscriptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        notes={mockNotes}
        topics={mockTopics}
      />
    );

    const previewContainer = screen.getByTestId('manuscript-compiled-preview');

    // Check note-1 checkbox
    const note1Checkbox = screen.getByTestId('manuscript-section-checkbox-note-1');
    fireEvent.click(note1Checkbox);

    // Note 1 title and content should now be in compiled preview
    expect(previewContainer).toHaveTextContent('Cơ Sở Lý Thuyết Về Attention');
    expect(previewContainer).toHaveTextContent('Cơ chế Self-Attention tính toán ma trận trọng số');

    // Toggle Matrix Appendix checkbox
    const matrixCheckbox = screen.getByTestId('manuscript-include-matrix-checkbox');
    fireEvent.click(matrixCheckbox);

    // Appendix with Literature Matrix should now appear
    expect(previewContainer).toHaveTextContent('Phụ Lục (Appendix)');
    expect(previewContainer).toHaveTextContent('Ma Trận Tổng Quan Tài Liệu');
  });

  // ---------------------------------------------------------------------------
  // 5. Multi-Format Export Tabs & ResourcesManager Trigger
  // ---------------------------------------------------------------------------
  it('5. Chuyển đổi tab định dạng Markdown/LaTeX/BibTeX và mở modal từ thanh công cụ ResourcesManager', async () => {
    render(
      <ManuscriptStudioModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        notes={mockNotes}
        topics={mockTopics}
      />
    );

    const bodyTextarea = screen.getByTestId('manuscript-body-textarea');
    fireEvent.change(bodyTextarea, {
      target: { value: 'Kiến trúc **Self-Attention** [@vaswani2017, p. 4] rất hiệu quả trong *NLP*.' },
    });

    // Click Markdown tab
    const tabMd = screen.getByTestId('manuscript-tab-markdown');
    fireEvent.click(tabMd);
    expect(screen.getByText(/## Tài Liệu Tham Khảo/)).toBeInTheDocument();

    // Click LaTeX tab
    const tabLatex = screen.getByTestId('manuscript-tab-latex');
    fireEvent.click(tabLatex);
    expect(screen.getAllByText(/\\documentclass/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\\cite\[p\. 4\]\{vaswani2017\}/)).toBeInTheDocument();

    // Click BibTeX tab
    const tabBib = screen.getByTestId('manuscript-tab-bibtex');
    fireEvent.click(tabBib);
    expect(screen.getByText(/@article\{vaswani2017,/)).toBeInTheDocument();

    // Test ResourcesManager trigger button
    render(<ResourcesManager />);
    const openStudioBtn = screen.getByTestId('btn-open-manuscript-studio');
    expect(openStudioBtn).toBeInTheDocument();
    fireEvent.click(openStudioBtn);

    await waitFor(() => {
      expect(screen.getAllByTestId('manuscript-studio-modal').length).toBeGreaterThan(0);
    });
  });
});
