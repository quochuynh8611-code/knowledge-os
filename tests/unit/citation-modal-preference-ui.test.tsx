import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CitationModal } from '../../src/components/modals/CitationModal';
import { BatchCitationModal } from '../../src/components/modals/BatchCitationModal';
import { Resource } from '../../src/types';
import {
  CITATION_FORMAT_STORAGE_KEY,
  setStoredCitationFormat,
} from '../../src/lib/citationPreferences';

const sampleResource: Resource = {
  id: 'res-1',
  topicId: 'topic-1',
  topicTitle: 'Vi Diệu Pháp (Abhidharma)',
  title: 'Câu Xá Luận (Abhidharmakośabhāṣya)',
  author: 'Vasubandhu',
  type: 'book',
  url: 'https://example.com/cauxaluan.pdf',
  notes: 'Năm 2024.',
  createdAt: '2024-03-15T08:00:00Z',
};

const sampleResources: Resource[] = [
  sampleResource,
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

describe('Citation Modals Shared Preference UI Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Test 1: CitationModal initializes tab from stored preference
  // ---------------------------------------------------------------------------
  it('1. CitationModal khởi tạo tab từ shared preference trong LocalStorage', () => {
    setStoredCitationFormat('bibtex');

    render(
      <CitationModal
        isOpen={true}
        onClose={vi.fn()}
        resource={sampleResource}
      />
    );

    const bibtexTab = screen.getByTestId('tab-citation-bibtex');
    expect(bibtexTab.className).toContain('border-amber-700');

    const preview = screen.getByTestId('citation-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('@book{');
    expect(preview.value).toContain('vasubandhu_2024_cauxaluan');
  });

  // ---------------------------------------------------------------------------
  // Test 2: BatchCitationModal initializes tab from stored preference
  // ---------------------------------------------------------------------------
  it('2. BatchCitationModal khởi tạo tab từ shared preference trong LocalStorage', () => {
    setStoredCitationFormat('markdown');

    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    const markdownTab = screen.getByTestId('batch-tab-markdown');
    expect(markdownTab.className).toContain('border-amber-700');

    const preview = screen.getByTestId('batch-citation-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('[^1]:');
    expect(preview.value).toContain('[^2]:');
  });

  // ---------------------------------------------------------------------------
  // Test 3: Tab switch in CitationModal updates localStorage preference
  // ---------------------------------------------------------------------------
  it('3. Đổi tab trong CitationModal cập nhật tùy chọn vào LocalStorage', () => {
    render(
      <CitationModal
        isOpen={true}
        onClose={vi.fn()}
        resource={sampleResource}
      />
    );

    // Click BibTeX tab
    fireEvent.click(screen.getByTestId('tab-citation-bibtex'));
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('bibtex');

    // Click Markdown tab
    fireEvent.click(screen.getByTestId('tab-citation-markdown'));
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('markdown');
  });

  // ---------------------------------------------------------------------------
  // Test 4: Tab switch in BatchCitationModal updates localStorage preference
  // ---------------------------------------------------------------------------
  it('4. Đổi tab trong BatchCitationModal cập nhật tùy chọn vào LocalStorage', () => {
    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    // Click BibTeX tab
    fireEvent.click(screen.getByTestId('batch-tab-bibtex'));
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('bibtex');

    // Click APA tab
    fireEvent.click(screen.getByTestId('batch-tab-apa'));
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('apa');
  });

  // ---------------------------------------------------------------------------
  // Test 5: Cross-modal preference continuity
  // ---------------------------------------------------------------------------
  it('5. Đổi tab trong CitationModal, đóng lại và mở BatchCitationModal -> thấy format được giữ nguyên', () => {
    // 1. Mở CitationModal và chọn BibTeX
    const { unmount } = render(
      <CitationModal
        isOpen={true}
        onClose={vi.fn()}
        resource={sampleResource}
      />
    );

    fireEvent.click(screen.getByTestId('tab-citation-bibtex'));
    expect(localStorage.getItem(CITATION_FORMAT_STORAGE_KEY)).toBe('bibtex');

    // 2. Đóng CitationModal
    unmount();

    // 3. Mở BatchCitationModal
    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    const bibtexTab = screen.getByTestId('batch-tab-bibtex');
    expect(bibtexTab.className).toContain('border-amber-700');

    const preview = screen.getByTestId('batch-citation-preview') as HTMLTextAreaElement;
    expect(preview.value).toContain('@book{');
    expect(preview.value).toContain('vasubandhu_2024_cauxaluan');
  });

  // ---------------------------------------------------------------------------
  // Test 6: Corrupted localStorage fallback to APA without error
  // ---------------------------------------------------------------------------
  it('6. LocalStorage chứa giá trị không hợp lệ -> Cả 2 modal khởi tạo sạch về tab APA', () => {
    localStorage.setItem(CITATION_FORMAT_STORAGE_KEY, 'corrupt_xyz_format');

    const { unmount } = render(
      <CitationModal
        isOpen={true}
        onClose={vi.fn()}
        resource={sampleResource}
      />
    );

    const apaTab = screen.getByTestId('tab-citation-apa');
    expect(apaTab.className).toContain('border-amber-700');
    unmount();

    render(
      <BatchCitationModal
        isOpen={true}
        onClose={vi.fn()}
        resources={sampleResources}
      />
    );

    const batchApaTab = screen.getByTestId('batch-tab-apa');
    expect(batchApaTab.className).toContain('border-amber-700');
  });
});
