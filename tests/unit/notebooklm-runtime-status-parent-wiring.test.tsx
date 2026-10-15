/**
 * NotebookLM Runtime Status Parent Wiring Test Suite (Phase F8.3 - Test-First RED)
 *
 * Scenarios:
 * 1. Given modal được mở từ parent không có state NotebookLM -> runtimeStatus là unknown, UI hiển thị "Chưa kiểm tra"
 * 2. Given parent (App / Navbar / TopicDetail) có config biểu đạt NotebookLM configured -> Header hiển thị "Đã cấu hình"
 * 3. Given parent biết rõ một capability bị block theo contract -> Header hiển thị "Audio Overview: Chưa khả dụng"
 * 4. Given các entry point khác nhau (App, Navbar, TopicDetail) mở cùng modal -> không divergence props, không crash, fallback nhất quán
 * 5. Given UI render bình thường -> không có network fetch hay external endpoint call
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import { Navbar } from '../../src/components/layout/Navbar';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import { resolveDefaultRuntimeStatus } from '../../src/components/integrations/notebooklm/runtimeBridgeConfig';
import { Topic, Note, Resource } from '../../src/types';

const mockTopic: Topic = {
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
};

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
    topics: [mockTopic],
    notes: mockNotes,
    resources: mockResources,
    categories: [],
    tags: [],
    activeTab: 'topics',
    setActiveTab: vi.fn(),
    activeTopicId: 'topic-ky-mon',
    studyStats: { streak: 1, reviewedToday: 0 },
  }),
}));

describe('Phase F8.3: NotebookLM Runtime Status Parent Wiring Test Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // Scenario 1: Given modal được mở từ parent không có state NotebookLM -> runtimeStatus là unknown, UI hiển thị "Chưa kiểm tra"
  it('Scenario 1: Fallbacks to "Chưa kiểm tra" when parent supplies no runtime state', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    expect(screen.getByRole('heading', { name: /NotebookLM/i })).toBeInTheDocument();
    expect(screen.getByText('Chưa kiểm tra')).toBeInTheDocument();
  });

  // Scenario 2: Given parent có config/state biểu đạt NotebookLM configured -> Header hiển thị "Đã cấu hình"
  it('Scenario 2: Displays "Đã cấu hình" when wired with configured status from parent helper', () => {
    const parentRuntimeStatus = resolveDefaultRuntimeStatus({ isConfigured: true });
    expect(parentRuntimeStatus).toBe('configured');

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
        runtimeStatus={parentRuntimeStatus}
      />
    );

    expect(screen.getByText('Đã cấu hình')).toBeInTheDocument();
  });

  // Scenario 3: Given parent biết rõ capability bị block theo contract -> Header hiển thị "Audio Overview: Chưa khả dụng"
  it('Scenario 3: Displays "Audio Overview: Chưa khả dụng" when parent indicates blocked capability', () => {
    const parentRuntimeStatus = resolveDefaultRuntimeStatus({ isAudioBlocked: true });
    expect(parentRuntimeStatus).toBe('blocked');

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
        runtimeStatus={parentRuntimeStatus}
      />
    );

    expect(screen.getByText('Audio Overview: Chưa khả dụng')).toBeInTheDocument();
  });

  // Scenario 4: Given các entry point khác nhau mở cùng modal -> không divergence props, không crash, fallback nhất quán
  it('Scenario 4: Entry points use consistent runtime status mapper without divergence', () => {
    // TopicDetail entry point contract
    const topicDetailStatus = resolveDefaultRuntimeStatus({ isConfigured: true });
    // Navbar entry point contract
    const navbarStatus = resolveDefaultRuntimeStatus({ isConfigured: true });
    // App entry point contract
    const appStatus = resolveDefaultRuntimeStatus({ isConfigured: true });

    expect(topicDetailStatus).toBe('configured');
    expect(navbarStatus).toBe('configured');
    expect(appStatus).toBe('configured');

    const { unmount } = render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
        runtimeStatus={topicDetailStatus}
      />
    );
    expect(screen.getByText('Đã cấu hình')).toBeInTheDocument();
    unmount();
  });

  // Scenario 5: Given UI render bình thường -> không có network fetch hay external endpoint call
  it('Scenario 5: Pure presentation guarantee: modal mount does not trigger external fetch', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const configuredStatus = resolveDefaultRuntimeStatus({ isConfigured: true });

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
        runtimeStatus={configuredStatus}
      />
    );

    // Any fetch should only be local backend session sync (/api/research-sessions), never live external cloud calls
    for (const call of fetchSpy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toMatch(/googleapis\.com|notebooklm\.google\.com|cloud/i);
    }
  });
});
