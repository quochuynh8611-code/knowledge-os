import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CitationModal } from '../../src/components/modals/CitationModal';
import { BatchCitationModal } from '../../src/components/modals/BatchCitationModal';
import { ResourceFormModal } from '../../src/components/modals/ResourceFormModal';
import { ReferenceImportModal } from '../../src/components/modals/ReferenceImportModal';
import { ResourcesManager } from '../../src/components/resources/ResourcesManager';
import { Resource } from '../../src/types';
import { embedAcademicMetadataInNotes } from '../../src/lib/citationGenerator';

const mockExistingResource: Resource = {
  id: 'res-existing-1',
  topicId: 'topic-1',
  topicTitle: 'Khoa Học Máy Tính',
  title: 'Deep Residual Learning for Image Recognition',
  author: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
  type: 'article',
  url: 'https://doi.org/10.1109/CVPR.2016.90',
  notes: embedAcademicMetadataInNotes('Ghi chú quan trọng về mạng ResNet.', {
    doi: '10.1109/CVPR.2016.90',
    year: '2016',
    journal: 'CVPR',
    publisher: 'IEEE',
  }),
  createdAt: '2024-01-01T00:00:00Z',
};

const mockTopics = [{ id: 'topic-1', title: 'Khoa Học Máy Tính', slug: 'cs' }];
let mockResources: Resource[] = [mockExistingResource];
const mockAddResource = vi.fn();
const mockUpdateResource = vi.fn();
const mockDeleteResource = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: [],
    topics: mockTopics,
    notes: [],
    resources: mockResources,
    studyProgress: {},
    tags: [],
    selectedTopic: null,
    addResource: mockAddResource,
    updateResource: mockUpdateResource,
    deleteResource: mockDeleteResource,
    openTopicDetail: vi.fn(),
    filterOptions: { search: '', category: 'all', status: 'all', tags: [] },
    setFilterOptions: vi.fn(),
  }),
}));

describe('Phase 2B: Reference & Citation Hub UI Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockResources = [mockExistingResource];
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // 1. CitationModal 8-style tabs switching
  // ---------------------------------------------------------------------------
  it('1. CitationModal hỗ trợ đầy đủ 8 tab định dạng và cập nhật preview', () => {
    render(<CitationModal isOpen={true} onClose={vi.fn()} resource={mockExistingResource} />);

    const formats = ['apa', 'mla', 'chicago', 'ieee', 'harvard', 'bibtex', 'ris', 'markdown'] as const;
    formats.forEach((fmt) => {
      const tab = screen.getByTestId(`tab-citation-${fmt}`);
      expect(tab).toBeInTheDocument();
      fireEvent.click(tab);
      const preview = screen.getByTestId('citation-preview') as HTMLTextAreaElement;
      expect(preview.value.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. BatchCitationModal 8-style tabs switching and download filenames
  // ---------------------------------------------------------------------------
  it('2. BatchCitationModal hỗ trợ 8 tab và tải tệp với đuôi định dạng chuẩn', () => {
    const originalCreateElement = document.createElement.bind(document);
    let capturedDownloadFilename = '';

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        Object.defineProperty(el, 'download', {
          set(val: string) {
            capturedDownloadFilename = val;
          },
          get() {
            return capturedDownloadFilename;
          },
        });
        el.click = vi.fn();
      }
      return el;
    });

    render(<BatchCitationModal isOpen={true} onClose={vi.fn()} resources={[mockExistingResource]} />);

    // Test RIS tab and download filename
    fireEvent.click(screen.getByTestId('batch-tab-ris'));
    fireEvent.click(screen.getByTestId('batch-btn-download'));
    expect(capturedDownloadFilename).toBe('references.ris');

    // Test IEEE tab and download filename
    fireEvent.click(screen.getByTestId('batch-tab-ieee'));
    fireEvent.click(screen.getByTestId('batch-btn-download'));
    expect(capturedDownloadFilename).toBe('references-ieee.txt');

    // Test BibTeX tab and download filename
    fireEvent.click(screen.getByTestId('batch-tab-bibtex'));
    fireEvent.click(screen.getByTestId('batch-btn-download'));
    expect(capturedDownloadFilename).toBe('references.bib');

    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 3. ResourceFormModal DOI Quick Lookup via CrossRef mock
  // ---------------------------------------------------------------------------
  it('3. ResourceFormModal tra cứu nhanh bằng DOI, tự động điền form và lưu metadata học thuật', async () => {
    const mockCrossRefResponse = {
      status: 'ok',
      message: {
        title: ['Attention Is All You Need'],
        author: [
          { given: 'Ashish', family: 'Vaswani' },
          { given: 'Noam', family: 'Shazeer' },
        ],
        issued: { 'date-parts': [[2017, 6]] },
        'container-title': ['Advances in Neural Information Processing Systems (NeurIPS)'],
        publisher: 'Curran Associates, Inc.',
        volume: '30',
        page: '5998-6008',
        URL: 'https://doi.org/10.48550/arXiv.1706.03762',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockCrossRefResponse,
    });

    render(<ResourceFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />);

    // Nhập DOI
    const doiInput = screen.getByTestId('input-resource-doi');
    fireEvent.change(doiInput, { target: { value: '10.48550/arXiv.1706.03762' } });

    // Click nút Tra cứu DOI
    const lookupBtn = screen.getByTestId('btn-lookup-doi');
    fireEvent.click(lookupBtn);

    // Chờ thông báo thành công và dữ liệu tự động điền
    await waitFor(() => {
      expect(screen.getByTestId('doi-lookup-status')).toBeInTheDocument();
      expect(screen.getByTestId('doi-lookup-status')).toHaveTextContent(/Tìm thấy/i);
    });

    // Kiểm tra các trường được tự động điền
    expect(screen.getByDisplayValue('Attention Is All You Need')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Vaswani.*Shazeer/i)).toBeInTheDocument();
    expect(screen.getByTestId('input-resource-year')).toHaveValue('2017');
    expect(screen.getByTestId('input-resource-journal')).toHaveValue('Advances in Neural Information Processing Systems (NeurIPS)');
    expect(screen.getByTestId('input-resource-publisher')).toHaveValue('Curran Associates, Inc.');

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Thêm Tài Liệu/i });
    fireEvent.click(submitBtn);

    // Xác nhận addResource được gọi kèm metadata học thuật và packed notes
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    const addedPayload = mockAddResource.mock.calls[0][0];
    expect(addedPayload.title).toBe('Attention Is All You Need');
    expect(addedPayload.doi).toBe('10.48550/arXiv.1706.03762');
    expect(addedPayload.year).toBe('2017');
    expect(addedPayload.notes).toContain('<!-- academic-metadata:');
  });

  // ---------------------------------------------------------------------------
  // 4. ReferenceImportModal: Parse BibTeX, detect duplicates, and bulk import
  // ---------------------------------------------------------------------------
  it('4. ReferenceImportModal phân tích BibTeX, phát hiện trùng DOI với thư viện và nhập tài liệu mới', async () => {
    render(<ReferenceImportModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />);

    const sampleBibContent = `
@article{he2016deep,
  title={Deep Residual Learning for Image Recognition},
  author={He, Kaiming and Zhang, Xiangyu},
  journal={CVPR},
  year={2016},
  doi={10.1109/CVPR.2016.90}
}

@article{vaswani2017attention,
  title={Attention Is All You Need},
  author={Vaswani, Ashish},
  journal={NeurIPS},
  year={2017},
  doi={10.48550/arXiv.1706.03762}
}
    `.trim();

    const textarea = screen.getByTestId('textarea-reference-import');
    fireEvent.change(textarea, { target: { value: sampleBibContent } });

    // Bấm phân tích dữ liệu
    fireEvent.click(screen.getByTestId('btn-parse-references'));

    // Chờ hiển thị kết quả phân tích
    await waitFor(() => {
      expect(screen.getByText(/Sẵn sàng nhập: 1 tài liệu hợp lệ/i)).toBeInTheDocument();
      expect(screen.getByText(/Trùng lặp: 1 mục/i)).toBeInTheDocument();
    });

    // Bấm xác nhận nhập
    const confirmBtn = screen.getByTestId('btn-confirm-reference-import');
    fireEvent.click(confirmBtn);

    // Kiểm tra addResource chỉ được gọi đúng 1 lần cho tài liệu mới duy nhất (Vaswani)
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    const importedItem = mockAddResource.mock.calls[0][0];
    expect(importedItem.title).toBe('Attention Is All You Need');
    expect(importedItem.doi).toBe('10.48550/arXiv.1706.03762');
    expect(importedItem.notes).toContain('<!-- academic-metadata:');
  });

  // ---------------------------------------------------------------------------
  // 5. ResourcesManager: Clean notes rendering and academic badges
  // ---------------------------------------------------------------------------
  it('5. ResourcesManager chỉ hiển thị cleanNotes (không lộ JSON bí mật) và hiển thị badges DOI/Journal', () => {
    render(<ResourcesManager />);

    // Kiểm tra cleanNotes được hiển thị
    expect(screen.getByText('Ghi chú quan trọng về mạng ResNet.')).toBeInTheDocument();

    // Tuyệt đối không để lộ chuỗi academic-metadata ra UI
    expect(screen.queryByText(/academic-metadata/i)).toBeNull();

    // Hiển thị badges học thuật
    expect(screen.getByText('DOI: 10.1109/CVPR.2016.90')).toBeInTheDocument();
    expect(screen.getByText('CVPR')).toBeInTheDocument();
    expect(screen.getByText('2016')).toBeInTheDocument();

    // Nút mở modal nhập reference có mặt trên PageHeader
    expect(screen.getByTestId('btn-open-reference-import')).toBeInTheDocument();
  });
});
