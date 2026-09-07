/**
 * NotebookLM Studio Modal UI Integration Test Suite (Phase 2b)
 *
 * ADR: ADR-012 (docs/adr/ADR-012-local-file-picker-and-knowledge-bridge.md)
 * Gherkin: docs/gherkin/file-picker-and-knowledge-bridge.feature (Scenario 7)
 * Target: src/components/integrations/NotebookLMStudioModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import * as notebooklmLib from '../../src/lib/notebooklm';

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
      status: 'in_progress',
      progress: 50,
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 1,
      timeSpent: 30,
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
      interval: 1,
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
    content: 'Ứng dụng thực tiễn của Sinh Môn trong trạch cát...',
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

describe('ADR-012 Phase 2b: NotebookLM Studio Modal Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
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
  // 1. Rendering state
  // ---------------------------------------------------------------------------
  it('1. Does not render when isOpen is false', () => {
    const { container } = render(<NotebookLMStudioModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('2. Renders header, topic selector, external link, source preview, and artifacts locker when isOpen is true', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText(/Google NotebookLM Research Hub/i)).toBeInTheDocument();
    expect(screen.getByText(/Chủ đề đang đóng gói nguồn:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở Google NotebookLM/i })).toHaveAttribute(
      'href',
      'https://notebooklm.google.com/'
    );
    expect(screen.getByRole('button', { name: /Sao chép nguồn/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tải File Nguồn/i })).toBeInTheDocument();
    expect(screen.getByText(/Kho Kết Quả Từ NotebookLM/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Copy Source Document action
  // ---------------------------------------------------------------------------
  it('3. Clicking "Sao chép nguồn" copies 5-part source doc to clipboard and shows feedback', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const copyButton = screen.getByRole('button', { name: /Sao chép nguồn/i });
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];

    expect(copiedText).toContain('TÀI LIỆU NGUỒN KHẢO CỨU (NOTEBOOKLM SOURCE DOCUMENT)');
    expect(copiedText).toContain('CHỦ ĐỀ: KỲ MÔN ĐỘN GIÁP TOÀN THƯ');
    expect(copiedText).toContain('[PHẦN 1: TÓM TẮT ĐỊNH VỊ KHÁI NIỆM]');
    expect(copiedText).toContain('[PHẦN 2: NỘI DUNG LUẬN THUYẾT & NGUYÊN BẢN KINH ĐIỂN]');
    expect(copiedText).toContain('Sinh Môn và Khai Môn');

    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Download Source File action
  // ---------------------------------------------------------------------------
  it('4. Clicking "Tải File Nguồn (.md)" generates Markdown blob download', () => {
    const mockObjectUrl = 'blob:http://localhost:3000/mock-md-uuid';
    window.URL.createObjectURL = vi.fn().mockReturnValue(mockObjectUrl);
    window.URL.revokeObjectURL = vi.fn();

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const downloadButton = screen.getByRole('button', { name: /Tải File Nguồn/i });
    fireEvent.click(downloadButton);

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Artifact Locker Form & CRUD
  // ---------------------------------------------------------------------------
  it('5. Submitting new artifact saves it to locker and displays it in list', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Open add artifact form
    const toggleButton = screen.getByRole('button', { name: /Thêm Kết Quả/i });
    fireEvent.click(toggleButton);

    // Fill form
    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Bản Đúc Kết Kỳ Môn Audio Overview' } });

    const contentInput = screen.getByPlaceholderText(/Dán nội dung tóm lược từ NotebookLM/i);
    fireEvent.change(contentInput, { target: { value: 'Hai người dẫn thảo luận sâu về Kỳ Môn Độn Giáp...' } });

    const saveButton = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Bản Đúc Kết Kỳ Môn Audio Overview')).toBeInTheDocument();
      expect(screen.getByText(/Hai người dẫn thảo luận sâu về Kỳ Môn Độn Giáp/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Topic switching updates preview and filters artifacts
  // ---------------------------------------------------------------------------
  it('6. Changing selected topic switches source document and filters artifacts', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const topicSelect = screen.getByRole('combobox');
    fireEvent.change(topicSelect, { target: { value: 'topic-vi-dieu-phap' } });

    expect(screen.getByText(/CHỦ ĐỀ: VI DIỆU PHÁP TOÀN TẬP/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. Antigravity 2.0 Task Prompt Generator & Copy Flow
  // ---------------------------------------------------------------------------
  it('7. Renders Antigravity 2.0 Task Prompt generator and copies prompt to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText(/Task Prompt Cho Antigravity 2.0/i)).toBeInTheDocument();

    const copyPromptBtn = screen.getByRole('button', { name: /Sao chép Task Prompt/i });
    fireEvent.click(copyPromptBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedPrompt = writeTextMock.mock.calls[0][0];
    expect(copiedPrompt).toContain('[Chỉ thị Antigravity 2.0: Sử dụng NotebookLM Skill]');
    expect(copiedPrompt).toContain('Kỳ Môn Độn Giáp Toàn Thư');
  });

  // ---------------------------------------------------------------------------
  // 7. Validation Alerts & Error Feedback on Import
  // ---------------------------------------------------------------------------
  it('8. Displays validation error alerts when submitting empty content or invalid URL', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const toggleButton = screen.getByRole('button', { name: /Thêm Kết Quả/i });
    fireEvent.click(toggleButton);

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Tiêu đề' } });

    const urlInput = screen.getByPlaceholderText(/https:\/\/notebooklm\.google\.com\/notebook/i);
    fireEvent.change(urlInput, { target: { value: 'ftp://invalid-url' } });

    const saveButton = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/URL NotebookLM phải bắt đầu bằng http:\/\/ hoặc https:\/\//i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Metadata Badges & Mediated Workflow Disclaimer
  // ---------------------------------------------------------------------------
  it('9. Renders metadata badges (antigravity-2.0, notebooklm) on stored artifact cards', () => {
    localStorage.setItem(
      notebooklmLib.NOTEBOOKLM_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'art-test-1',
          topicId: 'topic-ky-mon',
          type: 'study_guide',
          title: 'Study Guide Bát Trận',
          content: 'Nội dung chi tiết...',
          source: 'antigravity-2.0',
          target: 'notebooklm',
          status: 'imported',
          createdAt: new Date().toISOString(),
        },
      ])
    );

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText('Study Guide Bát Trận')).toBeInTheDocument();
    expect(screen.getByText('antigravity-2.0')).toBeInTheDocument();
    expect(screen.getByText('notebooklm')).toBeInTheDocument();
  });

  it('10. Displays mediated workflow disclaimer stating no direct API sync is performed', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    expect(screen.getByText(/Mediated Workflow via Antigravity 2.0/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Client-side/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 9. End-to-End User Journey: Studio Modal -> Create Artifact -> Open Drawer -> 3 Tabs -> Close Drawer
  // ---------------------------------------------------------------------------
  it('11. Complete E2E Journey: creates artifact, clicks Thẩm định, navigates 3 tabs in Review Drawer, and closes drawer', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // 1. Create Artifact in Locker
    const toggleButton = screen.getByRole('button', { name: /Thêm Kết Quả/i });
    fireEvent.click(toggleButton);

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Bản Đúc Kết Kỳ Môn v2.1' } });

    const contentInput = screen.getByPlaceholderText(/Dán nội dung tóm lược từ NotebookLM/i);
    fireEvent.change(contentInput, { target: { value: '# Luận Điểm Chính\nPhân tích cấu trúc Tam Kỳ Lục Nghi [1].' } });

    const saveButton = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(saveButton);

    // 2. Verify Artifact appears with Version Badge & Thẩm định button
    await waitFor(() => {
      expect(screen.getByText('Bản Đúc Kết Kỳ Môn v2.1')).toBeInTheDocument();
      expect(screen.getByText('Source package v1')).toBeInTheDocument();
    });

    // 3. Click "Thẩm định" button to open ArtifactReviewDrawer
    const thamDinhBtn = screen.getByRole('button', { name: /Thẩm định/i });
    expect(thamDinhBtn).toBeInTheDocument();
    fireEvent.click(thamDinhBtn);

    // 4. Verify ArtifactReviewDrawer is opened
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Bản Đúc Kết Kỳ Môn v2.1' })).toBeInTheDocument();
      expect(screen.getByTestId('artifact-source-version-badge')).toHaveTextContent('Source package v1');
    });

    // 5. Tab 1: Nội dung Markdown is visible by default (appears in both modal card & drawer)
    const contentElements = screen.getAllByText(/Phân tích cấu trúc Tam Kỳ Lục Nghi/i);
    expect(contentElements.length).toBeGreaterThanOrEqual(2);

    // 6. Tab 2: Switch to Trích dẫn nguồn
    const citationTab = screen.getByRole('button', { name: /Trích dẫn nguồn/i });
    fireEvent.click(citationTab);
    expect(screen.getByText(/Không có trích dẫn nguồn riêng lẻ/i)).toBeInTheDocument();

    // 7. Tab 3: Switch to Lịch sử chuyển nạp
    const importsTab = screen.getByRole('button', { name: /Lịch sử chuyển nạp/i });
    fireEvent.click(importsTab);
    expect(screen.getByText(/Chưa có thao tác chuyển nạp nào/i)).toBeInTheDocument();

    // 8. Close Drawer by clicking the close button
    const closeDrawerBtn = screen.getByRole('button', { name: /Đóng bảng thẩm định/i });
    fireEvent.click(closeDrawerBtn);

    // 9. Verify Drawer is closed (heading is unmounted)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Bản Đúc Kết Kỳ Môn v2.1' })).not.toBeInTheDocument();
    });
  });

  it('12. Real Session Sync: loads backend artifact with imports history and verifies Review Drawer tabs', async () => {
    const mockSessionArtifact = {
      id: '9d50fbdc-e191-4811-ac50-978da242515f',
      sessionId: 'f1624e8a-675a-44c7-9f5b-c2f1fe2dd04a',
      topicId: 'topic-ky-mon',
      artifactType: 'study_guide',
      title: 'Study Guide Devanāgarī Phonetics v2.1',
      rawContent: '# Bảng Chữ Cái Devanāgarī\nTổng quan 14 nguyên âm và 33 phụ âm [1].',
      contentHash: 'fb63c8fd5f5ac276f3d152e6a332683c0e333d7c41864b7f5c31d3de8091a9d4',
      idempotencyKey: '44f617e33945b554280a6633a3462af4a55e5670be956b7b6853fc9b5e104041',
      status: 'validated',
      citationCount: 0,
      sourcePackageVersion: 1,
      citations: [],
      imports: [
        {
          id: 'imp-note-1',
          artifactId: '9d50fbdc-e191-4811-ac50-978da242515f',
          targetType: 'note',
          targetNoteId: 'c7caec82-562a-4e0e-9927-93db3899eee4',
          status: 'success',
          itemCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'imp-flash-2',
          artifactId: '9d50fbdc-e191-4811-ac50-978da242515f',
          targetType: 'flashcards',
          status: 'success',
          itemCount: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/research-sessions') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'f1624e8a-675a-44c7-9f5b-c2f1fe2dd04a',
            topicId: 'topic-ky-mon',
            artifacts: [mockSessionArtifact],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Wait for session sync to load artifact
    await waitFor(() => {
      expect(screen.getByText('Study Guide Devanāgarī Phonetics v2.1')).toBeInTheDocument();
      expect(screen.getByText('Source package v1')).toBeInTheDocument();
      expect(screen.getByText('validated')).toBeInTheDocument();
    });

    // Open review drawer
    const reviewBtn = screen.getByRole('button', { name: /Thẩm định & Nhập/i });
    fireEvent.click(reviewBtn);

    // Verify Drawer content
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Study Guide Devanāgarī Phonetics v2.1' })).toBeInTheDocument();
      expect(screen.getByTestId('artifact-source-version-badge')).toHaveTextContent('Source package v1');
    });

    // Check Tab 3 (Imports history has 2 items)
    const importsTab = screen.getByRole('button', { name: /Lịch sử chuyển nạp/i });
    fireEvent.click(importsTab);
    expect(screen.getByText(/Ghi chú ID: c7caec82/i)).toBeInTheDocument();
    expect(screen.getByText(/Sinh 2 Flashcard\(s\)/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 10. Phase UX: Active Topic Context, Context Bar, Empty State & Quick Switch
  // ---------------------------------------------------------------------------
  it('13. Synchronizes selectedTopicId when props.topic changes while isOpen is true', async () => {
    const { rerender } = render(
      <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
    );

    // Initial topic is mockTopics[0] (Kỳ Môn Độn Giáp Toàn Thư)
    expect(screen.getByTestId('artifact-locker-context-bar')).toHaveTextContent(
      'Kỳ Môn Độn Giáp Toàn Thư'
    );
    expect(screen.getByRole('combobox')).toHaveValue('topic-ky-mon');

    // Rerender with mockTopics[1] (Vi Diệu Pháp Toàn Tập)
    rerender(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[1]} />);

    await waitFor(() => {
      expect(screen.getByTestId('artifact-locker-context-bar')).toHaveTextContent(
        'Vi Diệu Pháp Toàn Tập'
      );
      expect(screen.getByRole('combobox')).toHaveValue('topic-vi-dieu-phap');
    });
  });

  it('14. Renders Artifact Locker Context Bar with topic title, count badge, and session badge', async () => {
    localStorage.setItem(
      notebooklmLib.NOTEBOOKLM_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'art-km-1',
          topicId: 'topic-ky-mon',
          type: 'study_guide',
          title: 'Study Guide Kỳ Môn 1',
          content: 'Nội dung...',
          createdAt: new Date().toISOString(),
        },
      ])
    );

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const contextBar = screen.getByTestId('artifact-locker-context-bar');
    expect(contextBar).toBeInTheDocument();
    expect(contextBar).toHaveTextContent('Kỳ Môn Độn Giáp Toàn Thư');

    const countBadge = screen.getByTestId('artifact-locker-count-badge');
    expect(countBadge).toHaveTextContent('1 kết quả');

    await waitFor(() => {
      const sessionBadge = screen.getByTestId('artifact-locker-session-badge');
      expect(sessionBadge).toBeInTheDocument();
      expect(sessionBadge).toHaveTextContent(/Session: active/i);
    });
  });

  it('15. Renders contextual empty state with topic title and Quick Switch button for other topic with artifacts', async () => {
    // Topic 0 has 1 artifact in localStorage, Topic 1 has none
    localStorage.setItem(
      notebooklmLib.NOTEBOOKLM_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'art-km-1',
          topicId: 'topic-ky-mon',
          type: 'study_guide',
          title: 'Study Guide Kỳ Môn 1',
          content: 'Nội dung...',
          createdAt: new Date().toISOString(),
        },
      ])
    );

    // Render modal with Topic 1 (Vi Diệu Pháp) which has 0 artifacts
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[1]} />);

    // Check Contextual Empty State
    const emptyState = screen.getByTestId('artifact-locker-empty-state');
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('Vi Diệu Pháp Toàn Tập');

    // Check Quick Switch to Topic 0
    const quickSwitchContainer = screen.getByTestId('artifact-locker-quick-switch');
    expect(quickSwitchContainer).toBeInTheDocument();
    expect(quickSwitchContainer).toHaveTextContent('Kỳ Môn Độn Giáp Toàn Thư');

    const switchBtn = screen.getByTestId('quick-switch-topic-topic-ky-mon');
    expect(switchBtn).toBeInTheDocument();
    expect(switchBtn).toHaveTextContent('1');

    // Click Quick Switch to switch to Topic 0
    fireEvent.click(switchBtn);

    // After switch, Context Bar updates to Topic 0 and displays the artifact
    await waitFor(() => {
      expect(screen.getByTestId('artifact-locker-context-bar')).toHaveTextContent(
        'Kỳ Môn Độn Giáp Toàn Thư'
      );
      expect(screen.getByRole('combobox')).toHaveValue('topic-ky-mon');
      expect(screen.getByText('Study Guide Kỳ Môn 1')).toBeInTheDocument();
    });
  });

  it('16. Does NOT render Quick Switch when there are no localArtifacts for other topics', () => {
    // localStorage has 0 artifacts for any topic
    localStorage.removeItem(notebooklmLib.NOTEBOOKLM_STORAGE_KEY);

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[1]} />);

    // Contextual Empty State is rendered
    expect(screen.getByTestId('artifact-locker-empty-state')).toBeInTheDocument();

    // Quick Switch MUST NOT be rendered
    expect(screen.queryByTestId('artifact-locker-quick-switch')).not.toBeInTheDocument();
  });
});
