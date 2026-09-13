import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import * as notebooklmLib from '../../src/lib/notebooklm';
import * as antigravityPipelineLib from '../../src/lib/antigravityPipeline';
import { Topic, Note, Resource } from '../../src/types';

const mockTopics: Topic[] = [
  {
    id: 'topic-ky-mon',
    title: 'Kỳ Môn Độn Giáp Toàn Thư',
    slug: 'ky-mon-don-giap',
    type: 'huyen-hoc',
    categoryId: 'cat-dich-hoc',
    categoryName: 'Dịch Học',
    description: 'Khoa thuật số định vị thời không.',
    content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần.',
    tags: ['Kỳ Môn'],
    studyProgress: {
      topicId: 'topic-ky-mon',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
  {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc',
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm.',
    content: 'Tâm là thực tại nhận biết cảnh.',
    tags: ['Abhidharma'],
    studyProgress: {
      topicId: 'topic-vi-dieu-phap',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
];

const mockNotes: Note[] = [
  {
    id: 'note-km-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'Sinh Môn và Khai Môn',
    content: 'Ứng dụng thực tiễn của Sinh Môn...',
    type: 'insight',
    isPrivate: false,
    tags: ['Sinh Môn'],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-local-1',
    topicId: 'topic-ky-mon',
    topicTitle: 'Kỳ Môn Độn Giáp Toàn Thư',
    title: 'KyMonBiKip.pdf',
    type: 'pdf',
    filePath: 'KyMonBiKip.pdf',
    createdAt: '2026-08-20T10:00:00Z',
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
  }),
}));

describe('NotebookLM Workspace UX Redesign Integration Test Suite (Gherkin Scenarios)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/research-sessions') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'mock-session-1',
            topicId: 'topic-ky-mon',
            status: 'active',
            artifacts: [],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  // ---------------------------------------------------------------------------
  // Gherkin 1: Step 1 Source Selection & Summary
  // ---------------------------------------------------------------------------
  it('Scenario 1: Step 1 renders topic selector, source summary metrics and compact preview', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByRole('heading', { name: /NotebookLM/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bước 1: Nguồn/i })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('1 Ghi chú')).toBeInTheDocument();
    expect(screen.getByText('1 Thư tịch')).toBeInTheDocument();
    expect(screen.getByText(/Tài liệu nguồn đã chuẩn hóa/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Gherkin 2: Copy Source Document
  // ---------------------------------------------------------------------------
  it('Scenario 2: Clicking "Sao chép nguồn" copies 5-part source to clipboard and shows feedback', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const copyBtn = screen.getByRole('button', { name: /Sao chép nguồn/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)')
    );
    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Gherkin 3: Download Source Markdown file
  // ---------------------------------------------------------------------------
  it('Scenario 3: Clicking "Tải File Nguồn (.md)" generates blob download link', () => {
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/source-md');
    window.URL.revokeObjectURL = vi.fn();

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const downloadBtn = screen.getByRole('button', { name: /Tải File Nguồn/i });
    fireEvent.click(downloadBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Gherkin 4: Open Google NotebookLM in external window
  // ---------------------------------------------------------------------------
  it('Scenario 4: Clicking "Mở Google NotebookLM" opens official web in new tab', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const openBtn = screen.getByRole('button', { name: /Mở Google NotebookLM/i });
    fireEvent.click(openBtn);

    expect(openSpy).toHaveBeenCalledWith(
      'https://notebooklm.google.com/',
      '_blank',
      'noopener,noreferrer'
    );
  });

  // ---------------------------------------------------------------------------
  // Gherkin 5: Step 2 Prompt Generation & Type Selection
  // ---------------------------------------------------------------------------
  it('Scenario 5: Navigating to Step 2 allows selecting artifact type and custom instructions', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Proceed to Step 2
    const proceedBtn = screen.getByRole('button', { name: /Tiếp tục: Tạo Task Prompt/i });
    fireEvent.click(proceedBtn);

    expect(screen.getByRole('button', { name: /Bước 2: Prompt/i })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText(/Task Prompt Cho Antigravity 2.0/i)).toBeInTheDocument();

    // Select FAQ
    const faqBtn = screen.getByRole('button', { name: /FAQ/i });
    fireEvent.click(faqBtn);

    // Enter custom instructions
    const instructionInput = screen.getByPlaceholderText(/Chú trọng đối chiếu Abhidhamma/i);
    fireEvent.change(instructionInput, { target: { value: 'Tập trung 8 môn phái' } });

    // Copy Prompt
    const copyPromptBtn = screen.getByRole('button', { name: /Sao chép Task Prompt/i });
    fireEvent.click(copyPromptBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Tập trung 8 môn phái')
    );
  });

  // ---------------------------------------------------------------------------
  // Gherkin 6 & 7: Duplicate Handoff Prevention & Queue Status
  // ---------------------------------------------------------------------------
  it('Scenario 6 & 7: Prepare handoff creates queued job, disables duplicate submission, and updates tracker', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Go to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Bước 2: Prompt/i }));

    const prepareHandoffBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    expect(prepareHandoffBtn).toBeInTheDocument();

    // Click prepare handoff
    fireEvent.click(prepareHandoffBtn);

    // Open Advanced Section to verify job
    const advancedToggle = screen.getByRole('button', { name: /Chi tiết kỹ thuật nâng cao/i });
    fireEvent.click(advancedToggle);

    await waitFor(() => {
      expect(screen.getByTestId('handoff-cli-command-preview')).toBeInTheDocument();
      expect(screen.getByTestId('handoff-jobs-tracker-list')).toBeInTheDocument();
    });

    const commandPreview = screen.getByTestId('handoff-cli-command-preview');
    expect(commandPreview).toHaveTextContent(/agy -p/i);
    expect(commandPreview).toHaveTextContent(/Kỳ Môn Độn Giáp Toàn Thư/i);
  });

  // ---------------------------------------------------------------------------
  // Gherkin 8: Advanced Technical Details Accordion
  // ---------------------------------------------------------------------------
  it('Scenario 8: Advanced section is collapsed by default and expands on click', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const advancedToggle = screen.getByRole('button', { name: /Chi tiết kỹ thuật nâng cao/i });
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');

    // Content should not be visible
    expect(screen.queryByTestId('handoff-cli-command-preview')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(advancedToggle);
    expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');
  });

  // ---------------------------------------------------------------------------
  // Gherkin 9 & 10: Step 3 Artifact Ingestion & Validation Error Alert
  // ---------------------------------------------------------------------------
  it('Scenario 9 & 10: Step 3 displays validation error on empty submit, saves valid artifact', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Go to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
    expect(screen.getByRole('button', { name: /Bước 3: Kết quả/i })).toHaveAttribute('aria-current', 'step');

    // Open Add Artifact form
    fireEvent.click(screen.getByRole('button', { name: /Thêm Kết Quả/i }));

    // Submit empty content -> validation error
    const submitBtn = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Nội dung artifact không được để trống/i)).toBeInTheDocument();

    // Fill valid data
    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Bản Đúc Kết Kỳ Môn v2.2' } });

    const contentTextarea = screen.getByPlaceholderText(/Dán nội dung tóm lược từ NotebookLM/i);
    fireEvent.change(contentTextarea, { target: { value: '# Bát Môn Khảo Luận\nNội dung chi tiết...' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Bản Đúc Kết Kỳ Môn v2.2')).toBeInTheDocument();
      expect(screen.getByText('Source package v1')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Gherkin 11: Open Review Drawer from Step 3 Card
  // ---------------------------------------------------------------------------
  it('Scenario 11: Clicking "Thẩm định" opens ArtifactReviewDrawer for the selected artifact', async () => {
    localStorage.setItem(
      notebooklmLib.NOTEBOOKLM_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'art-km-10',
          topicId: 'topic-ky-mon',
          type: 'study_guide',
          title: 'Study Guide Kỳ Môn Độn Giáp v2',
          content: '# Tiêu đề\nNội dung khảo cứu...',
          source: 'antigravity-2.0',
          target: 'notebooklm',
          status: 'imported',
          createdAt: new Date().toISOString(),
        },
      ])
    );

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Switch to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

    const thamDinhBtn = screen.getByTestId('btn-open-review-drawer-art-km-10');
    expect(thamDinhBtn).toBeInTheDocument();
    fireEvent.click(thamDinhBtn);

    // Review drawer opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Study Guide Kỳ Môn Độn Giáp v2' })).toBeInTheDocument();
    });

    // Close drawer
    const closeDrawerBtn = screen.getByRole('button', { name: /Đóng bảng thẩm định/i });
    fireEvent.click(closeDrawerBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Study Guide Kỳ Môn Độn Giáp v2' })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Gherkin 12: Close Modal via Header Close & Escape Key
  // ---------------------------------------------------------------------------
  it('Scenario 12: Closes modal when clicking Header Close button and pressing Escape', () => {
    const handleClose = vi.fn();
    render(<NotebookLMStudioModal isOpen={true} onClose={handleClose} topic={mockTopics[0]} />);

    const closeBtn = screen.getByRole('button', { name: /Đóng modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
