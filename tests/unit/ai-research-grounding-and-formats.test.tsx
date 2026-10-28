import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataProvider, dataRepository } from '../../src/context/DataContext';
import { AIResearchStudio } from '../../src/components/ai/AIResearchStudio';
import { Topic } from '../../src/types';

describe('AI Research Studio: External Grounding, Formats & SRS Flashcards Import', () => {
  const mockTopic: Topic = {
    id: 'topic-grounding-test',
    title: 'Khảo Cứu Grounding & Formats',
    slug: 'grounding-formats',
    categoryId: 'cat-test',
    categoryName: 'Khoa Học',
    type: 'khoa-hoc',
    description: 'Kiểm thử nghiên cứu Internet và các định dạng đầu ra mới.',
    content: 'Nội dung chủ đề kiểm thử...',
    tags: ['Grounding', 'SRS'],
    studyProgress: {
      topicId: 'topic-grounding-test',
      status: 'in_progress',
      progress: 50,
      interval: 2,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    links: [],
    createdAt: '2026-10-27T00:00:00Z',
    updatedAt: '2026-10-27T00:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Checkbox Nghiên cứu Internet bên ngoài có thể tick và gửi externalResearch = true lên API', async () => {
    const user = userEvent.setup();
    let sentRequestBody: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
      if (url.includes('/api/obsidian/vaults')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ vaults: [] }) });
      }
      if (url.includes('/api/gemini/research')) {
        sentRequestBody = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'Kết quả khảo cứu có Google Grounding.',
              isStructured: true,
              citations: [],
              uncertainties: [],
              groundingMetadata: {
                webSearchQueries: ['Nghiên cứu khoa học mới nhất'],
                groundingChunks: [
                  { web: { uri: 'https://scholar.google.com', title: 'Google Scholar' } },
                ],
              },
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    const externalCheckbox = screen.getByTestId('checkbox-external-research');
    expect(externalCheckbox).not.toBeChecked();

    // Tick the checkbox
    await user.click(externalCheckbox);
    expect(externalCheckbox).toBeChecked();

    // Type a prompt and submit
    const textarea = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    await user.type(textarea, 'Khảo cứu tác động của AI');

    const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(sentRequestBody).not.toBeNull();
    });

    expect(sentRequestBody.sourceScope.externalResearch).toBe(true);

    // Verify grounding panel renders with search query and link
    await waitFor(() => {
      expect(screen.getByTestId('panel-grounding-metadata')).toBeInTheDocument();
      expect(screen.getByText(/"Nghiên cứu khoa học mới nhất"/)).toBeInTheDocument();
      expect(screen.getByText('Google Scholar')).toBeInTheDocument();
    });
  });

  it('2. Chọn định dạng Flashcards, bóc tách Q&A và click "Nạp vào Thẻ Nhớ SRS" tạo thẻ thành công', async () => {
    const user = userEvent.setup();
    const createFlashcardSpy = vi.fn().mockResolvedValue({
      id: 'fc-mock-1',
      topicId: mockTopic.id,
      front: 'Q1',
      back: 'A1',
      type: 'basic',
    });
    (dataRepository as any).createFlashcard = createFlashcardSpy;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/obsidian/vaults')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ vaults: [] }) });
      }
      if (url.includes('/api/gemini/research')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: `
Dưới đây là các câu hỏi ôn tập:

**Q1: Định luật I Newton là gì?**
**A1: Một vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực tác dụng.**

**Q2: Gia tốc trọng trường trên Trái Đất là bao nhiêu?**
**A2: Xấp xỉ 9.8 m/s^2 tại mặt đất.**
              `,
              isStructured: true,
              citations: [],
              uncertainties: [],
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    // Select format flashcards
    const formatSelect = screen.getByLabelText(/Định dạng đầu ra/i);
    fireEvent.change(formatSelect, { target: { value: 'flashcards' } });

    // Submit prompt
    const textarea = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    await user.type(textarea, 'Tạo câu hỏi Vật lý');

    const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
    await user.click(submitBtn);

    // Expect the Import SRS button to appear
    await waitFor(() => {
      expect(screen.getByTestId('btn-import-srs')).toBeInTheDocument();
    });

    const importBtn = screen.getByTestId('btn-import-srs');
    expect(importBtn).toHaveTextContent('Nạp vào Thẻ Nhớ SRS');

    // Click Import button
    await user.click(importBtn);

    await waitFor(() => {
      expect(createFlashcardSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('import-card-message')).toHaveTextContent(
        'Đã nạp 2 thẻ nhớ SRS thành công!'
      );
      expect(screen.getByTestId('btn-import-srs')).toHaveTextContent('Đã nạp 2 thẻ SRS');
    });
  });

  it('2b. Chọn định dạng Flashcards khi AI trả về chuẩn CSV RFC 4180 và nạp vào SRS thành công', async () => {
    const user = userEvent.setup();
    const createFlashcardSpy = vi.fn().mockResolvedValue({
      id: 'fc-csv-1',
      topicId: mockTopic.id,
      front: 'Q1',
      back: 'A1',
      type: 'basic',
    });
    (dataRepository as any).createFlashcard = createFlashcardSpy;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/obsidian/vaults')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ vaults: [] }) });
      }
      if (url.includes('/api/gemini/research')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: '```csv\nfront,back,type\n"Khái niệm ""Spaced Repetition"" là gì?","Kỹ thuật ôn tập ngắt quãng","basic"\n"{{c1::Solanum procumbens}} là tên cà gai leo","Cà gai leo","cloze"\n```',
              isStructured: true,
              citations: [],
              uncertainties: [],
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    const formatSelect = screen.getByLabelText(/Định dạng đầu ra/i);
    fireEvent.change(formatSelect, { target: { value: 'flashcards' } });

    const textarea = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    await user.type(textarea, 'Tạo thẻ CSV');

    const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-import-srs')).toBeInTheDocument();
    });

    const importBtn = screen.getByTestId('btn-import-srs');
    await user.click(importBtn);

    await waitFor(() => {
      expect(createFlashcardSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('import-card-message')).toHaveTextContent(
        'Đã nạp 2 thẻ nhớ SRS thành công!'
      );
    });

    // Check payload passed to repository
    expect(createFlashcardSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        front: 'Khái niệm "Spaced Repetition" là gì?',
        back: 'Kỹ thuật ôn tập ngắt quãng',
        type: 'basic',
      })
    );
    expect(createFlashcardSpy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        front: '{{c1::Solanum procumbens}} là tên cà gai leo',
        back: 'Cà gai leo',
        type: 'cloze',
      })
    );
  });

  it('3. Lưu thành note từ Study Guide gắn đúng tag #Study-Guide và tiêu đề phù hợp', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/obsidian/vaults')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ vaults: [] }) });
      }
      if (url.includes('/api/gemini/research')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              result: 'Cẩm nang học tập toàn diện gồm 5 phần...',
              isStructured: true,
              citations: [],
              uncertainties: [],
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    render(
      <DataProvider>
        <AIResearchStudio currentTopic={mockTopic} />
      </DataProvider>
    );

    // Select study_guide
    const formatSelect = screen.getByLabelText(/Định dạng đầu ra/i);
    fireEvent.change(formatSelect, { target: { value: 'study_guide' } });

    const textarea = screen.getByPlaceholderText(/Đặt câu hỏi khảo cứu/i);
    await user.type(textarea, 'Khảo cứu Cẩm Nang');

    const submitBtn = screen.getByRole('button', { name: /^Khảo Cứu$/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Lưu Study Guide')).toBeInTheDocument();
    });

    const saveNoteBtn = screen.getByText('Lưu Study Guide');
    await user.click(saveNoteBtn);

    await waitFor(() => {
      expect(screen.getByText('Đã lưu Study Guide')).toBeInTheDocument();
    });
  });
});
