import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LiteratureMatrixModal } from '../../src/components/modals/LiteratureMatrixModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { Resource } from '../../src/types';
import { getMatrixRowOverrides } from '../../src/lib/literatureMatrixEngine';

const mockResourceA: Resource = {
  id: 'res-a',
  topicId: 'topic-nlp',
  topicTitle: 'Xử Lý Ngôn Ngữ Tự Nhiên',
  title: 'Attention Is All You Need',
  author: 'Vaswani, Ashish',
  type: 'article',
  url: 'https://arxiv.org/abs/1706.03762',
  notes: 'Nghiên cứu về cơ chế Self-Attention. Phương pháp: Transformer architecture không dùng RNN. Kết quả: Đạt SOTA trên WMT 2014 En-De với BLEU 28.4. Hạn chế: Chi phí tính toán O(N^2) theo độ dài chuỗi.',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockResourceB: Resource = {
  id: 'res-b',
  topicId: 'topic-nlp',
  topicTitle: 'Xử Lý Ngôn Ngữ Tự Nhiên',
  title: 'Transformers are Not Inherently Superior for Short Sequences',
  author: 'Ye, Zixuan',
  type: 'article',
  url: 'https://arxiv.org/abs/2401.00000',
  notes: 'Đánh giá lại hiệu quả Transformer. Phản biện và đối lập với nhận định Transformer luôn tối ưu hơn RNN. Hạn chế: Thử nghiệm trên tập dữ liệu nhỏ.',
  createdAt: '2024-02-01T00:00:00Z',
};

const mockResourceC: Resource = {
  id: 'res-c',
  topicId: 'topic-vision',
  topicTitle: 'Thị Giác Máy Tính',
  title: 'Deep Residual Learning for Image Recognition',
  author: 'He, Kaiming',
  type: 'article',
  url: 'https://doi.org/10.1109/CVPR.2016.90',
  notes: 'Mở rộng kiến trúc mạng nơ-ron sâu với residual connection. Mở rộng ứng dụng trên ImageNet.',
  createdAt: '2024-03-01T00:00:00Z',
};

const mockTopics = [
  { id: 'topic-nlp', title: 'Xử Lý Ngôn Ngữ Tự Nhiên' },
  { id: 'topic-vision', title: 'Thị Giác Máy Tính' },
];

const mockResources: Resource[] = [mockResourceA, mockResourceB, mockResourceC];

// Mock DataContext for ResourcesManager integration
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    resources: mockResources,
    topics: mockTopics,
    notes: [],
    researchExcerpts: [],
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
  }),
}));

describe('Phase 8B: Literature Review Matrix & Claim Synthesis UI Integration', () => {
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
  // 1. Matrix Table & Synthesis Summary Rendering
  // ---------------------------------------------------------------------------
  it('1. Hiển thị bảng ma trận 5 trục và thanh thống kê tổng quan (metrics & coverage)', () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        topics={mockTopics}
      />
    );

    // Modal container
    expect(screen.getByTestId('literature-matrix-modal')).toBeInTheDocument();

    // Summary metrics
    expect(screen.getByText(/3 tài liệu/i)).toBeInTheDocument();

    // Rows rendered with testid
    expect(screen.getByTestId('matrix-row-res-a')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-row-res-b')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-row-res-c')).toBeInTheDocument();

    // Verification of fields for res-a
    const rowA = screen.getByTestId('matrix-row-res-a');
    expect(rowA).toHaveTextContent('@vaswani2024'); // or citekey
    expect(rowA).toHaveTextContent('Attention Is All You Need');
  });

  // ---------------------------------------------------------------------------
  // 2. Contradiction Alert Banner
  // ---------------------------------------------------------------------------
  it('2. Hiển thị banner cảnh báo mâu thuẫn học thuật khi có tài liệu đối lập trong cùng chủ đề', () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        topics={mockTopics}
      />
    );

    // Topic NLP has res-b which contradicts res-a
    const alertBanner = screen.getByTestId('matrix-contradiction-alert');
    expect(alertBanner).toBeInTheDocument();
    expect(alertBanner).toHaveTextContent(/Xử Lý Ngôn Ngữ Tự Nhiên/i);
    expect(alertBanner).toHaveTextContent(/phát hiện 1 tài liệu có quan điểm đối lập/i);
  });

  // ---------------------------------------------------------------------------
  // 3. Stance & Topic Filtering
  // ---------------------------------------------------------------------------
  it('3. Lọc ma trận theo lập trường (stance) và chủ đề (topic)', async () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        topics={mockTopics}
      />
    );

    // Ban đầu thấy 3 dòng
    expect(screen.getByTestId('matrix-row-res-a')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-row-res-b')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-row-res-c')).toBeInTheDocument();

    // Lọc theo chủ đề Thị Giác Máy Tính
    const topicFilter = screen.getByTestId('matrix-topic-filter');
    fireEvent.change(topicFilter, { target: { value: 'topic-vision' } });

    expect(screen.queryByTestId('matrix-row-res-a')).toBeNull();
    expect(screen.queryByTestId('matrix-row-res-b')).toBeNull();
    expect(screen.getByTestId('matrix-row-res-c')).toBeInTheDocument();

    // Reset topic filter về "all"
    fireEvent.change(topicFilter, { target: { value: 'all' } });
    expect(screen.getByTestId('matrix-row-res-a')).toBeInTheDocument();

    // Lọc theo lập trường contradicts
    const stanceFilter = screen.getByTestId('matrix-stance-filter');
    fireEvent.change(stanceFilter, { target: { value: 'contradicts' } });

    expect(screen.queryByTestId('matrix-row-res-a')).toBeNull();
    expect(screen.getByTestId('matrix-row-res-b')).toBeInTheDocument();
    expect(screen.queryByTestId('matrix-row-res-c')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // 4. Inline Cell Editing & Override Persistence
  // ---------------------------------------------------------------------------
  it('4. Chỉnh sửa trực tiếp 5 ô nội dung ma trận và lưu ghi đè vào localStorage', async () => {
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        topics={mockTopics}
      />
    );

    // Click edit on res-a
    const editBtn = screen.getByTestId('edit-matrix-row-btn-res-a');
    fireEvent.click(editBtn);

    // Edit inputs are now visible
    const inputQuestion = screen.getByTestId('matrix-input-question-res-a');
    const inputMethodology = screen.getByTestId('matrix-input-methodology-res-a');
    const inputFindings = screen.getByTestId('matrix-input-findings-res-a');
    const inputLimitations = screen.getByTestId('matrix-input-limitations-res-a');
    const selectStance = screen.getByTestId('matrix-select-stance-res-a');

    fireEvent.change(inputQuestion, { target: { value: 'Liệu Transformer có thể thay thế RNN trong dịch máy?' } });
    fireEvent.change(inputMethodology, { target: { value: 'Kiến trúc Self-Attention thuần túy trên 8 GPU P100' } });
    fireEvent.change(inputFindings, { target: { value: 'Đạt BLEU kỷ lục 28.4 trên EN-DE' } });
    fireEvent.change(inputLimitations, { target: { value: 'Độ phức tạp O(N^2) bộ nhớ' } });
    fireEvent.change(selectStance, { target: { value: 'supports' } });

    // Click Save
    const saveBtn = screen.getByTestId('save-matrix-row-btn-res-a');
    fireEvent.click(saveBtn);

    // Check row is updated
    const rowA = screen.getByTestId('matrix-row-res-a');
    expect(rowA).toHaveTextContent('Liệu Transformer có thể thay thế RNN trong dịch máy?');
    expect(rowA).toHaveTextContent('Kiến trúc Self-Attention thuần túy trên 8 GPU P100');
    expect(rowA).toHaveTextContent('Đạt BLEU kỷ lục 28.4 trên EN-DE');
    expect(rowA).toHaveTextContent('Độ phức tạp O(N^2) bộ nhớ');

    // Check localStorage persistence
    const stored = getMatrixRowOverrides();
    expect(stored['res-a']).toBeDefined();
    expect(stored['res-a']?.researchQuestion).toBe('Liệu Transformer có thể thay thế RNN trong dịch máy?');
    expect(stored['res-a']?.methodology).toBe('Kiến trúc Self-Attention thuần túy trên 8 GPU P100');
    expect(stored['res-a']?.stance).toBe('supports');
  });

  // ---------------------------------------------------------------------------
  // 5. Markdown & CSV Copy/Export Actions + ResourcesManager Trigger
  // ---------------------------------------------------------------------------
  it('5. Xuất Markdown / CSV và kích hoạt mở modal từ nút toolbar của ResourcesManager', async () => {
    // Test export actions inside modal
    render(
      <LiteratureMatrixModal
        isOpen={true}
        onClose={vi.fn()}
        resources={mockResources}
        topics={mockTopics}
      />
    );

    // Copy Markdown
    const copyMdBtn = screen.getByTestId('btn-copy-matrix-markdown');
    fireEvent.click(copyMdBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const clipboardText = (navigator.clipboard.writeText as any).mock.calls[0][0];
    expect(clipboardText).toContain('| Tài liệu (Citekey) | Tác giả & Năm |');
    expect(clipboardText).toContain('Attention Is All You Need');

    // CSV Download
    const originalCreateElement = document.createElement.bind(document);
    let capturedDownloadFilename = '';
    let capturedHref = '';

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(el, 'download', {
          set(val: string) {
            capturedDownloadFilename = val;
          },
        });
        Object.defineProperty(el, 'href', {
          set(val: string) {
            capturedHref = val;
          },
        });
        el.click = vi.fn();
      }
      return el;
    });

    const exportCsvBtn = screen.getByTestId('btn-export-matrix-csv');
    fireEvent.click(exportCsvBtn);
    expect(capturedDownloadFilename).toMatch(/literature-matrix-.*\.csv/);
    expect(capturedHref).toContain('blob:');

    // Test ResourcesManager trigger
    render(<ResourcesManager />);
    const openMatrixBtn = screen.getByTestId('btn-open-literature-matrix');
    expect(openMatrixBtn).toBeInTheDocument();
    fireEvent.click(openMatrixBtn);

    // Modal should now be open
    await waitFor(() => {
      expect(screen.getAllByTestId('literature-matrix-modal').length).toBeGreaterThan(0);
    });
  });
});
