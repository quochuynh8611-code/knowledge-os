import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProvider } from '../../src/context/DataContext';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import {
  AI_RESEARCH_SESSIONS_STORAGE_KEY,
  AIResearchSession,
  saveResearchSession,
  getStoredResearchSessions,
} from '../../src/lib/aiResearchStorage';
import { Topic, Category } from '../../src/types';
import { INITIAL_CATEGORIES } from '../../src/data/initialData';

describe('Phase P6.0: AI Research Studio UI Persistence & Export Integration', () => {
  const topicA: Topic = {
    id: 'topic-bat-nha',
    title: 'Bát Nhã Tâm Kinh',
    slug: 'bat-nha-tam-kinh',
    categoryId: 'cat-phat-hoc',
    categoryName: 'Phật Học',
    type: 'phat-hoc',
    description: 'Nghiên cứu về tánh Không và Bát Nhã.',
    content: 'Quán Tự Tại Bồ Tát...',
    tags: ['BatNha', 'TanhKhong'],
    studyProgress: {
      topicId: 'topic-bat-nha',
      status: 'in_progress',
      progress: 60,
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 2,
      timeSpent: 45,
    },
    links: [],
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-20T00:00:00Z',
  };

  const topicB: Topic = {
    id: 'topic-kinh-te',
    title: 'Kinh Tế Học Vĩ Mô',
    slug: 'kinh-te-hoc-vi-mo',
    categoryId: 'cat-kinh-te',
    categoryName: 'Kinh Tế Học',
    type: 'kinh-te',
    description: 'Nghiên cứu thị trường và chính sách.',
    content: 'Mô hình IS-LM...',
    tags: ['KinhTe', 'ChinhSach'],
    studyProgress: {
      topicId: 'topic-kinh-te',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    links: [],
    createdAt: '2026-08-21T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z',
  };

  const topicC: Topic = {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp Khảo Luận',
    slug: 'ky-mon-don-giap',
    categoryId: 'cat-huyen-hoc',
    categoryName: 'Huyền Học',
    type: 'huyen-hoc',
    description: 'Nghiên cứu Kỳ Môn.',
    content: 'Bát Môn, Cửu Tinh...',
    tags: ['KyMon', 'BatMon'],
    studyProgress: {
      topicId: 'topic-ky-mon',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    links: [],
    createdAt: '2026-08-22T00:00:00Z',
    updatedAt: '2026-08-22T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
    const customCategories: Category[] = [
      ...INITIAL_CATEGORIES,
      {
        id: 'cat-kinh-te',
        name: 'Kinh Tế Học',
        slug: 'kinh-te-hoc',
        parentId: null,
      },
    ];
    localStorage.setItem('phat_hoc_huyen_hoc_clean_v3_categories', JSON.stringify(customCategories));
    localStorage.setItem('phat_hoc_huyen_hoc_clean_v3_topics', JSON.stringify([topicA, topicB, topicC]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Auto-Restore and Topic Isolation', () => {
    it('1.1. Khôi phục session thành công gần nhất của topic đang chọn khi mount', () => {
      const sessionA: AIResearchSession = {
        id: 'airs-a1',
        topicId: topicA.id,
        topicTitle: topicA.title,
        mode: 'terminology_exegesis',
        prompt: 'Phân tích từ Śūnyatā trong tiếng Sanskrit',
        result: 'Śūnyatā bắt nguồn từ căn từ śūnya nghĩa là rỗng không...',
        timestamp: 1724857000000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([sessionA]));

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      // Should display the restored result
      expect(screen.getByText(/Śūnyatā bắt nguồn từ căn từ śūnya nghĩa là rỗng không/i)).toBeDefined();
      // Prompt input should show the restored prompt
      const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu cho chủ đề/i) as HTMLInputElement;
      expect(input.value).toBe('Phân tích từ Śūnyatā trong tiếng Sanskrit');
    });

    it('1.2. Chuyển đổi topic khôi phục đúng session của topic đích và không rò rỉ session', async () => {
      const sessionA: AIResearchSession = {
        id: 'airs-a1',
        topicId: topicA.id,
        topicTitle: topicA.title,
        mode: 'concept_analysis',
        prompt: 'Khảo cứu tánh Không',
        result: 'Nội dung khảo cứu Topic A...',
        timestamp: 1000,
      };
      const sessionB: AIResearchSession = {
        id: 'airs-b1',
        topicId: topicB.id,
        topicTitle: topicB.title,
        mode: 'cross_domain_synthesis',
        prompt: 'Phân tích chính sách tiền tệ',
        result: 'Nội dung khảo cứu Topic B...',
        timestamp: 2000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([sessionA, sessionB]));

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      // Verify Topic A content loaded
      expect(screen.getByText(/Nội dung khảo cứu Topic A/i)).toBeDefined();

      // Switch to Topic B
      const topicSelect = screen.getByRole('combobox');
      fireEvent.change(topicSelect, { target: { value: topicB.id } });

      // Verify Topic B content loaded and Topic A content gone
      expect(screen.getByText(/Nội dung khảo cứu Topic B/i)).toBeDefined();
      expect(screen.queryByText(/Nội dung khảo cứu Topic A/i)).toBeNull();

      // Switch to Topic C (which has no stored sessions)
      fireEvent.change(topicSelect, { target: { value: topicC.id } });

      // Should show empty state
      expect(screen.queryByText(/Nội dung khảo cứu Topic B/i)).toBeNull();
      expect(screen.getByText(/Chọn một câu hỏi gợi ý phía trên hoặc nhập thắc mắc/i)).toBeDefined();
    });
  });

  describe('2. Dirty Draft Guard & Execution Guard', () => {
    it('2.1. Chuyển topic xóa dirty draft chưa gửi của topic trước và reset trạng thái an toàn', () => {
      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu cho chủ đề/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Dirty draft for Topic A that was never executed' } });
      expect(input.value).toBe('Dirty draft for Topic A that was never executed');

      // Switch topic to Topic C
      const topicSelect = screen.getByRole('combobox');
      fireEvent.change(topicSelect, { target: { value: topicC.id } });

      // Input should be reset
      expect(input.value).toBe('');
      expect(screen.queryByText(/Dirty draft for Topic A/i)).toBeNull();
    });

    it('2.2. Khóa chuyển đổi topic khi AI đang thực thi query (isLoading = true)', async () => {
      // Mock delayed fetch for research endpoint
      vi.spyOn(global, 'fetch').mockImplementation(
        (url: any) =>
          new Promise((resolve) => {
            if (typeof url === 'string' && url.includes('/api/gemini/research')) {
              setTimeout(
                () =>
                  resolve({
                    ok: true,
                    json: async () => ({ result: 'Mocked API result' }),
                  } as any),
                100
              );
            } else {
              resolve({
                ok: true,
                json: async () => ({ status: 'ok' }),
              } as any);
            }
          })
      );

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu cho chủ đề/i);
      fireEvent.change(input, { target: { value: 'Query đang chạy' } });

      const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
      fireEvent.click(submitBtn);

      // While loading, topic select should be disabled
      const topicSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(topicSelect.disabled).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/Mocked API result/i)).toBeDefined();
      });

      // After completion, topic select should be re-enabled
      expect(topicSelect.disabled).toBe(false);
    });
  });

  describe('3. Lightweight History View Navigation', () => {
    it('3.1. Hiển thị danh sách lịch sử của topic đang chọn và khôi phục khi click', async () => {
      const sessionOld: AIResearchSession = {
        id: 'airs-hist-1',
        topicId: topicA.id,
        topicTitle: topicA.title,
        mode: 'concept_analysis',
        prompt: 'Khảo cứu cổ điển 1',
        result: 'Nội dung session cũ...',
        timestamp: 1000,
      };
      const sessionNew: AIResearchSession = {
        id: 'airs-hist-2',
        topicId: topicA.id,
        topicTitle: topicA.title,
        mode: 'terminology_exegesis',
        prompt: 'Khảo cứu mới nhất 2',
        result: 'Nội dung session mới nhất...',
        timestamp: 2000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([sessionNew, sessionOld]));

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      // Currently showing newest session
      expect(screen.getByText(/Nội dung session mới nhất/i)).toBeDefined();

      // History section should list older session prompt
      const oldSessionBtn = screen.getByText(/Khảo cứu cổ điển 1/i);
      expect(oldSessionBtn).toBeDefined();

      // Click old session
      fireEvent.click(oldSessionBtn);

      // Should now display the older session
      expect(screen.getByText(/Nội dung session cũ/i)).toBeDefined();
      expect(screen.queryByText(/Nội dung session mới nhất/i)).toBeNull();
    });
  });

  describe('4. Markdown Export Action', () => {
    it('4.1. Nút "Xuất Markdown" tạo blob và kích hoạt download với filename đã sanitize', async () => {
      const session: AIResearchSession = {
        id: 'airs-export-test',
        topicId: topicA.id,
        topicTitle: 'Bát Nhã Tâm Kinh & Tính Không',
        mode: 'concept_analysis',
        prompt: 'Tổng luận Bát Nhã',
        result: 'Sắc bất dị Không, Không bất dị Sắc.',
        timestamp: 1724857200000,
      };
      localStorage.setItem(AI_RESEARCH_SESSIONS_STORAGE_KEY, JSON.stringify([session]));

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url-123');
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      // Mock anchor element click
      let clickedHref = '';
      let clickedDownload = '';
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName === 'a') {
          el.click = () => {
            clickedHref = el.getAttribute('href') || (el as HTMLAnchorElement).href;
            clickedDownload = el.getAttribute('download') || (el as HTMLAnchorElement).download;
          };
        }
        return el;
      });

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicA} />
        </DataProvider>
      );

      const exportBtn = screen.getByRole('button', { name: /Xuất Markdown/i });
      expect(exportBtn).toBeDefined();

      fireEvent.click(exportBtn);

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickedDownload).toMatch(/^AI-Research-bat-nha-tam-kinh/i);
      expect(clickedDownload.endsWith('.md')).toBe(true);
    });
  });

  describe('5. Successful Query Auto-Persistence', () => {
    it('5.1. Khi query AI thành công, session mới được lưu tự động vào localStorage', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
        if (typeof url === 'string' && url.includes('/api/gemini/research')) {
          return {
            ok: true,
            json: async () => ({
              result: 'Kết quả AI phân tích mới về Kỳ Môn Độn Giáp.',
            }),
          } as any;
        }
        return {
          ok: true,
          json: async () => ({ status: 'ok' }),
        } as any;
      });

      render(
        <DataProvider>
          <AIResearchStudio currentTopic={topicC} />
        </DataProvider>
      );

      const input = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu cho chủ đề/i);
      fireEvent.change(input, { target: { value: 'Phân tích Cửu Cung Bát Quái' } });

      const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Kết quả AI phân tích mới về Kỳ Môn Độn Giáp/i)).toBeDefined();
      });

      const storedSessions = getStoredResearchSessions();
      expect(storedSessions).toHaveLength(1);
      expect(storedSessions[0].topicId).toBe(topicC.id);
      expect(storedSessions[0].prompt).toBe('Phân tích Cửu Cung Bát Quái');
      expect(storedSessions[0].result).toBe('Kết quả AI phân tích mới về Kỳ Môn Độn Giáp.');
    });
  });
});
