import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProvider } from '../../src/context/DataContext';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import { Topic } from '../../src/types';
import { NOTEBOOKLM_STORAGE_KEY } from '../../src/lib/notebooklm';

describe('Slice 3: AI Research Copilot UI & Interaction Integration', () => {
  const mockTopic: Topic = {
    id: 'topic-tu-dieu-de',
    title: 'Tứ Diệu Đế & Duyên Khởi',
    slug: 'tu-dieu-de',
    categoryId: 'cat-phat-hoc',
    categoryName: 'Phật Học',
    type: 'phat-hoc',
    description: 'Bốn chân lý tối thượng và quy luật Duyên khởi 12 nhân duyên.',
    content: 'Chánh biến tri tuyên thuyết về Khổ, Tập, Diệt, Đạo...',
    tags: ['TuDieuDe', 'DuyenKhoi'],
    studyProgress: {
      topicId: 'topic-tu-dieu-de',
      status: 'in_progress',
      progress: 50,
      interval: 2,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    links: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('3.1. Renders Title, Subtitle, Source Scope checkboxes, Depth pills, Output formats', () => {
    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    // Title & Subtitle
    expect(screen.getByText('Antigravity AI Scholar & Research Engine')).toBeInTheDocument();
    expect(screen.getByText(/AI Research Copilot/i)).toBeInTheDocument();

    // Source scope controls
    expect(screen.getByLabelText(/Tài liệu Chuyên đề/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ghi chú học tập/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tài liệu tham khảo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Thẻ ghi nhớ có sẵn/i)).toBeInTheDocument();

    // External research is disabled
    const externalCheckbox = screen.getByLabelText(/Nghiên cứu Internet bên ngoài/i);
    expect(externalCheckbox).toBeDisabled();

    // Depth pills
    expect(screen.getByRole('button', { name: /Nhanh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chuẩn mực/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chuyên sâu/i })).toBeInTheDocument();

    // Output format selector
    expect(screen.getByLabelText(/Định dạng đầu ra/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Tạo Q&A Draft/i })).toBeInTheDocument();
  });

  it('3.2. Submits request with structured sources and displays Citations and Uncertainties panels', async () => {
    const mockApiResponse = {
      result: '## Phân tích Tứ Diệu Đế\nKhổ đế là chân lý đầu tiên [^SRC-CANONICAL-1].',
      proposedOutline: [
        { step: 1, title: 'Định vị khái niệm Khổ', description: 'Tam khổ và Bát khổ' },
      ],
      citations: [
        {
          id: 'cit-1',
          sourceRegistryId: 'SRC-CANONICAL-1',
          sourceId: 'topic-tu-dieu-de',
          sourceType: 'canonical_text',
          sourceTitle: 'Tứ Diệu Đế & Duyên Khởi',
          evidenceStatus: 'grounded',
        },
      ],
      uncertainties: [
        {
          point: 'Dị bản luận giải',
          reason: 'Khác biệt về định nghĩa giữa Thuyết Nhất Thiết Hữu Bộ và Thượng Tọa Bộ',
        },
      ],
      isStructured: true,
      model: 'gemini-3.6-flash',
      timestamp: new Date().toISOString(),
      sourceStats: {
        selectedCount: 1,
        usedCount: 1,
        truncatedCount: 0,
        excludedCount: 0,
        totalCharsUsed: 500,
      },
    };

    let sentRequestBody: any = null;

    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('/api/gemini/research')) {
        if (opts?.body) {
          sentRequestBody = JSON.parse(opts.body);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockApiResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    // Bật độc lập Source Scope Flashcard (Thẻ ghi nhớ có sẵn)
    const flashcardScopeCheckbox = screen.getByLabelText(/Thẻ ghi nhớ có sẵn/i);
    fireEvent.click(flashcardScopeCheckbox);

    const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    fireEvent.change(input, { target: { value: 'Khảo sát bản chất Khổ Đế' } });

    const submitBtn = screen.getByRole('button', { name: /Khảo Cứu/i });
    fireEvent.click(submitBtn);

    // Verify request payload assert độc lập sourceScope.flashcards
    await waitFor(() => {
      expect(sentRequestBody).not.toBeNull();
      expect(sentRequestBody.sourceScope.flashcards).toBe(true);
      expect(sentRequestBody.outputFormat).toBe('answer');
    });

    // Verify Citations & Uncertainties rendered
    await waitFor(() => {
      expect(screen.getByText(/Tứ Diệu Đế & Duyên Khởi/i)).toBeInTheDocument();
      expect(screen.getByText(/Đã kiểm chứng/i)).toBeInTheDocument();
      expect(screen.getByText(/Dị bản luận giải/i)).toBeInTheDocument();
    });
  });

  it('3.3. Flashcards output saves as Note/Q&A Draft and does NOT write to NotebookLM storage', async () => {
    const mockApiResponse = {
      result: '### Q: Khổ đế là gì?\nA: Khổ đế là thực tại bất toàn.',
      proposedOutline: [],
      citations: [],
      uncertainties: [],
      isStructured: true,
      model: 'gemini-3.6-flash',
      timestamp: new Date().toISOString(),
      sourceStats: {
        selectedCount: 0,
        usedCount: 0,
        truncatedCount: 0,
        excludedCount: 0,
        totalCharsUsed: 0,
      },
    };

    let sentRequestBody: any = null;

    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('/api/gemini/research')) {
        if (opts?.body) {
          sentRequestBody = JSON.parse(opts.body);
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockApiResponse,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    // Chọn output format: flashcards (Tạo Q&A Draft)
    const formatSelect = screen.getByLabelText(/Định dạng đầu ra/i);
    fireEvent.change(formatSelect, { target: { value: 'flashcards' } });

    const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    fireEvent.change(input, { target: { value: 'Tạo thẻ câu hỏi Khổ Đế' } });

    const submitBtn = screen.getByRole('button', { name: /Khảo Cứu/i });
    fireEvent.click(submitBtn);

    // Verify request payload assert độc lập outputFormat: 'flashcards'
    await waitFor(() => {
      expect(sentRequestBody).not.toBeNull();
      expect(sentRequestBody.outputFormat).toBe('flashcards');
      expect(sentRequestBody.sourceScope.flashcards).toBe(false); // scope flashcards không bị gộp chung
    });

    // Đợi kết quả
    await waitFor(() => {
      expect(screen.getByText(/Lưu Q&A Draft/i)).toBeInTheDocument();
    });

    // Click Lưu Q&A Draft
    const saveDraftBtn = screen.getByRole('button', { name: /Lưu Q&A Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã lưu Q&A Draft/i)).toBeInTheDocument();
    });

    // Kiểm tra NotebookLM storage hoàn toàn không bị ghi
    const notebooklmStored = localStorage.getItem(NOTEBOOKLM_STORAGE_KEY);
    expect(notebooklmStored).toBeNull();
  });
});
