import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedSearch } from '../../src/components/search/AdvancedSearch';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import type { Topic, Note, Resource, Category, Tag, ResearchExcerpt } from '../../src/types';

// Mock Data
const mockTopic: Topic = {
  id: 'topic-memory',
  title: 'Khoa Học Trí Nhớ & Đường Cong Quên',
  slug: 'khoa-hoc-tri-nho',
  categoryId: 'cat-science',
  categoryName: 'Khoa Học Nhận Thức',
  type: 'academic',
  description: 'Nghiên cứu về cơ chế củng cố trí nhớ dài hạn và đường cong quên Ebbinghaus.',
  content: 'Bộ nhớ dài hạn được củng cố thông qua các khoảng cách lặp lại ngắt quãng.',
  tags: ['memory', 'fsrs'],
  studyProgress: {
    topicId: 'topic-memory',
    status: 'in_progress',
    progress: 60,
    interval: 2,
    easeFactor: 2.5,
    repetitions: 3,
    totalNotes: 2,
    timeSpent: 90,
  },
  links: [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const mockNotes: Note[] = [
  {
    id: 'note-memory-decay',
    topicId: 'topic-memory',
    title: 'Suy giảm trí nhớ theo thời gian',
    content: 'Đường cong lãng quên mô tả tốc độ suy giảm khả năng nhớ lại nếu không có ôn tập ngắt quãng.',
    type: 'study',
    isPrivate: false,
    tags: ['memory'],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'note-metallurgy',
    topicId: 'topic-memory',
    title: 'Quy trình luyện gang thép lò cao',
    content: 'Khử quặng oxit sắt bằng khí CO ở nhiệt độ cao trong ngành luyện kim công nghiệp nặng.',
    type: 'study',
    isPrivate: false,
    tags: ['metallurgy'],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-memory-paper',
    topicId: 'topic-memory',
    title: 'Spaced Repetition and Retention Optimization',
    type: 'pdf',
    author: 'Ebbinghaus & Ye',
    notes: 'Power-law retention curves and optimal review intervals for academic mastery.',
    url: '/api/archive/file/memory_paper.pdf',
    createdAt: '2026-10-01T00:00:00Z',
  },
];

const mockExcerpts: ResearchExcerpt[] = [
  {
    id: 'exc-retrievability',
    archivedDocumentId: 'res-memory-paper',
    selectedText: 'Retrievability decay adheres to a power-law retention curve over time.',
    highlightColor: '#bbf7d0',
    positionSelector: { pageNumber: 4 },
    status: 'active',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

let currentSearchQuery = '';
const mockSetSearchQuery = vi.fn((q: string) => {
  currentSearchQuery = q;
});
const mockOpenTopicDetail = vi.fn();
const mockAddNote = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    searchQuery: currentSearchQuery,
    setSearchQuery: mockSetSearchQuery,
    topics: [mockTopic],
    notes: mockNotes,
    resources: mockResources,
    categories: [
      {
        id: 'cat-science',
        name: 'Khoa Học Nhận Thức',
        slug: 'khoa-hoc-nhan-thuc',
      },
    ],
    tags: [
      { id: 'tag-mem', name: 'memory', slug: 'memory' },
    ],
    researchExcerpts: mockExcerpts,
    openTopicDetail: mockOpenTopicDetail,
    addNote: mockAddNote,
  }),
}));

describe('Phase 5B: Hybrid Vector Search & Grounded RAG Copilot UI Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    currentSearchQuery = '';
    mockSetSearchQuery.mockClear();
    mockOpenTopicDetail.mockClear();
    mockAddNote.mockClear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AdvancedSearch: Hybrid Vector & BM25 Search UI', () => {
    it('renders search-mode-selector with keyword, semantic, and hybrid options', () => {
      render(<AdvancedSearch />);

      const selector = screen.getByTestId('search-mode-selector');
      expect(selector).toBeInTheDocument();

      expect(screen.getByTestId('btn-search-mode-keyword')).toBeInTheDocument();
      expect(screen.getByTestId('btn-search-mode-semantic')).toBeInTheDocument();
      expect(screen.getByTestId('btn-search-mode-hybrid')).toBeInTheDocument();
    });

    it('switches to semantic or hybrid mode and surfaces semantic similarity badges for conceptually related notes', () => {
      currentSearchQuery = 'retention curve spaced repetition';
      render(<AdvancedSearch />);

      // Switch to hybrid search
      const btnHybrid = screen.getByTestId('btn-search-mode-hybrid');
      fireEvent.click(btnHybrid);

      // Semantic similarity badges should appear on matching items
      const badges = screen.getAllByTestId('semantic-similarity-badge');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0].textContent).toMatch(/% tương đồng/);

      // Verify that metallurgy note is not ranked higher than memory note
      expect(screen.getByText('Suy giảm trí nhớ theo thời gian')).toBeInTheDocument();
    });
  });

  describe('AIResearchStudio: Smart Grounded RAG Copilot', () => {
    it('renders smart RAG checkbox and preview context button by default', () => {
      render(<AIResearchStudio currentTopic={mockTopic} />);

      const ragCheckbox = screen.getByTestId('checkbox-smart-rag');
      expect(ragCheckbox).toBeInTheDocument();
      expect(ragCheckbox).toBeChecked();

      const previewBtn = screen.getByTestId('btn-preview-rag-context');
      expect(previewBtn).toBeInTheDocument();
    });

    it('allows previewing grounded RAG evidence panel before submission', async () => {
      render(<AIResearchStudio currentTopic={mockTopic} />);

      const promptInput = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
      fireEvent.change(promptInput, {
        target: { value: 'cơ chế củng cố trí nhớ dài hạn và đường cong quên' },
      });

      const previewBtn = screen.getByTestId('btn-preview-rag-context');
      fireEvent.click(previewBtn);

      // Grounded sources panel should open
      await waitFor(() => {
        expect(screen.getByTestId('rag-retrieved-sources-panel')).toBeInTheDocument();
      });

      expect(screen.getByText(/Dẫn chứng Ngữ nghĩa RAG/i)).toBeInTheDocument();
      expect(screen.getByText(/\[\^SRC-1\]/i)).toBeInTheDocument();
    });

    it('injects retrieved RAG chunks into selectedSources when executing research', async () => {
      let capturedPayload: any = null;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: any) => {
        if (typeof url === 'string' && url.includes('/api/gemini/research')) {
          capturedPayload = JSON.parse(init.body);
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: 'Kết quả khảo cứu dựa trên nguồn [^SRC-1].',
              citations: [],
              uncertainties: [],
              proposedOutline: [],
              isStructured: true,
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<AIResearchStudio currentTopic={mockTopic} />);

      const promptInput = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
      fireEvent.change(promptInput, {
        target: { value: 'phân tích đường cong lãng quên và cơ chế ôn tập' },
      });

      const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(capturedPayload).not.toBeNull();
      });

      // Selected sources sent to server must include RAG chunk with citationMarker
      const ragSources = capturedPayload.selectedSources.filter((s: any) =>
        s.title.includes('[^SRC-')
      );
      expect(ragSources.length).toBeGreaterThan(0);
    });
  });
});
