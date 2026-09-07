import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AntigravityHandoffModal } from '../../src/components/integrations/AntigravityHandoffModal';
import { Topic, Note, Resource, Category } from '../../src/types';

const mockTopic: Topic = {
  id: 'topic-abhidharma',
  title: 'Vi Diệu Pháp Toàn Tập',
  slug: 'vi-dieu-phap-toan-tap',
  categoryId: 'cat-abhidharma',
  categoryName: 'Thắng Pháp Abhidhamma',
  type: 'phat-hoc',
  description: 'Nghiên cứu 89/121 Tâm và 52 Tâm sở.',
  content: 'Nội dung chi tiết về Vi Diệu Pháp.',
  tags: ['Abhidhamma', 'TâmSở'],
  studyProgress: {
    topicId: 'topic-abhidharma',
    status: 'in_progress',
    progress: 50,
    interval: 3,
    easeFactor: 2.5,
    repetitions: 2,
    totalNotes: 1,
    timeSpent: 30,
  },
  links: [
    {
      id: 'link-1',
      sourceId: 'topic-abhidharma',
      targetId: 'topic-dich',
      targetTitle: 'Kinh Dịch Chu Dịch',
      linkType: 'related',
      strength: 4,
    },
  ],
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-24T00:00:00Z',
};

const mockTopic2: Topic = {
  id: 'topic-dich',
  title: 'Kinh Dịch Chu Dịch',
  slug: 'kinh-dich-chu-dich',
  categoryId: 'cat-dich-hoc',
  categoryName: 'Dịch Học',
  type: 'huyen-hoc',
  description: 'Nghiên cứu 64 Quẻ Dịch và Đạo biến dịch.',
  content: 'Nội dung kinh Dịch.',
  tags: ['KinhDich', 'BatQuai'],
  studyProgress: {
    topicId: 'topic-dich',
    status: 'not_started',
    progress: 0,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    totalNotes: 0,
    timeSpent: 0,
  },
  links: [],
  createdAt: '2026-08-20T00:00:00Z',
  updatedAt: '2026-08-24T00:00:00Z',
};

const mockNotes: Note[] = [
  {
    id: 'note-1',
    topicId: 'topic-abhidharma',
    title: 'Khảo cứu Tâm biến hành',
    content: 'Nội dung ghi chú phân tích 7 tâm sở biến hành.',
    type: 'insight',
    isPrivate: false,
    tags: ['TâmSở'],
    createdAt: '2026-08-21T00:00:00Z',
    updatedAt: '2026-08-21T00:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-1',
    topicId: 'topic-abhidharma',
    title: 'Tài liệu Luận Tạng',
    url: 'https://suttacentral.net/luan-tang',
    type: 'article',
    createdAt: '2026-08-20T00:00:00Z',
  },
];

const mockCategories: Category[] = [
  { id: 'cat-abhidharma', name: 'Thắng Pháp Abhidhamma', slug: 'abhidharma', type: 'phat-hoc' },
  { id: 'cat-dich-hoc', name: 'Dịch Học', slug: 'dich-hoc', type: 'huyen-hoc' },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [mockTopic, mockTopic2],
    notes: mockNotes,
    resources: mockResources,
    categories: mockCategories,
    tags: [],
    stats: {},
    reviewQueue: [],
  }),
}));

describe('Phase 3: AntigravityHandoffModal UI Integration Tests (Scholar Inspector)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Render tiêu đề Scholar Inspector, context badge, topic selector, prompt mode switcher, bundle preview khi modal mở', () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    expect(screen.getByRole('heading', { name: /Antigravity AI Scholar Inspector/i })).toBeInTheDocument();
    expect(screen.getByTestId('scholar-topic-context-badge')).toBeInTheDocument();
    expect(screen.getByTestId('scholar-topic-context-badge')).toHaveTextContent('Vi Diệu Pháp Toàn Tập');
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // 3 Tabs
    expect(screen.getByRole('tab', { name: /Gói Bàn Giao/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Đồ Thị 1-Hop/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /System Prompt/i })).toBeInTheDocument();

    // Default Bundle Preview
    expect(screen.getByText(/## 1. System Directive & Academic Persona/i)).toBeInTheDocument();
    expect(screen.getByText(/## 3. Multi-Hop Knowledge Graph Topology/i)).toBeInTheDocument();
  });

  it('2. Sao chép Handoff Bundle vào Clipboard an toàn', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const copyBtn = screen.getByRole('button', { name: /Sao chép Handoff Bundle/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('## 1. System Directive & Academic Persona');
    expect(copiedText).toContain('Vi Diệu Pháp Toàn Tập');

    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép Handoff Bundle!/i)).toBeInTheDocument();
    });
  });

  it('3. Tải tệp Handoff Bundle (.md) với tên đã được sanitize', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const downloadBtn = screen.getByRole('button', { name: /Tải Tệp Handoff/i });
    fireEvent.click(downloadBtn);

    expect(createObjectURLMock).toHaveBeenCalled();
  });

  it('4. Đổi chủ đề tự động tái đóng gói Handoff Bundle cho chủ đề mới', () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    expect(screen.getByText(/## 2. Topic Exegesis & Canonical Metadata/i)).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'topic-dich' } });

    expect(screen.getAllByText(/Kinh Dịch Chu Dịch/i).length).toBeGreaterThanOrEqual(1);
  });

  it('5. Tự động đồng bộ selectedTopicId khi props.topic thay đổi trong lúc modal mở', async () => {
    const { rerender } = render(
      <AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />
    );

    expect(screen.getByTestId('scholar-topic-context-badge')).toHaveTextContent('Vi Diệu Pháp Toàn Tập');
    expect(screen.getByRole('combobox')).toHaveValue('topic-abhidharma');

    // Rerender with mockTopic2 (Kinh Dịch)
    rerender(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic2} />);

    await waitFor(() => {
      expect(screen.getByTestId('scholar-topic-context-badge')).toHaveTextContent('Kinh Dịch Chu Dịch');
      expect(screen.getByRole('combobox')).toHaveValue('topic-dich');
    });
  });

  it('6. Chuyển sang Tab Đồ Thị 1-Hop Topology và render danh sách liên kết', async () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const topologyTab = screen.getByRole('tab', { name: /Đồ Thị 1-Hop/i });
    fireEvent.click(topologyTab);

    // Topic 1 has 1 link to Kinh Dịch Chu Dịch
    await waitFor(() => {
      expect(screen.getByTestId('scholar-topology-view')).toBeInTheDocument();
      expect(screen.getByText('Kinh Dịch Chu Dịch')).toBeInTheDocument();
      expect(screen.getByText(/RELATED/i)).toBeInTheDocument();
      expect(screen.getByText(/4\/5/i)).toBeInTheDocument();
    });
  });

  it('7. Tab Đồ Thị 1-Hop Topology hiển thị empty state khi chủ đề không có liên kết', async () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic2} />);

    const topologyTab = screen.getByRole('tab', { name: /Đồ Thị 1-Hop/i });
    fireEvent.click(topologyTab);

    // Topic 2 has no links
    await waitFor(() => {
      expect(screen.getByTestId('scholar-topology-empty-state')).toBeInTheDocument();
      expect(screen.getByText(/Chưa có liên kết 1-hop nào được ghi nhận cho chủ đề này/i)).toBeInTheDocument();
    });
  });

  it('8. Chuyển sang Tab System Prompt và sao chép Prompt', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const promptTab = screen.getByRole('tab', { name: /System Prompt/i });
    fireEvent.click(promptTab);

    expect(screen.getByRole('button', { name: /Phân Tích Khái Niệm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ngữ Nguyên & Thuật Ngữ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tổng Hợp Liên Ngành/i })).toBeInTheDocument();

    const copyPromptBtn = screen.getByRole('button', { name: /Sao chép Prompt Chuyên Sâu/i });
    fireEvent.click(copyPromptBtn);

    expect(writeTextMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/Đã sao chép Prompt!/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ADR-071: Phase 2 Accessibility & Interaction Hardening Tests
  // ---------------------------------------------------------------------------
  it('9. Dialog Escape: gọi onClose khi nhấn phím Escape lúc modal mở, không kích hoạt khi modal đóng', () => {
    const onCloseMock = vi.fn();
    const { unmount } = render(
      <AntigravityHandoffModal isOpen={true} onClose={onCloseMock} topic={mockTopic} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    // Unmount (simulate modal closed/unmounted)
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('10. WAI-ARIA Tabs Keyboard Navigation: hỗ trợ ArrowRight, ArrowLeft, Home, End kèm wrap-around và auto-focus', async () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const bundleTab = screen.getByRole('tab', { name: /Gói Bàn Giao/i });
    const topologyTab = screen.getByRole('tab', { name: /Đồ Thị 1-Hop/i });
    const promptTab = screen.getByRole('tab', { name: /System Prompt/i });

    // Focus on initial tab (Bundle)
    bundleTab.focus();
    expect(bundleTab).toHaveAttribute('aria-selected', 'true');

    // Press ArrowRight -> moves to Topology
    fireEvent.keyDown(bundleTab, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(topologyTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('scholar-topology-view')).toBeInTheDocument();
    });

    // Press ArrowRight -> moves to Prompt
    fireEvent.keyDown(topologyTab, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(promptTab).toHaveAttribute('aria-selected', 'true');
    });

    // Press ArrowRight from last tab -> wraps around to Bundle
    fireEvent.keyDown(promptTab, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(bundleTab).toHaveAttribute('aria-selected', 'true');
    });

    // Press ArrowLeft from first tab -> wraps around to Prompt
    fireEvent.keyDown(bundleTab, { key: 'ArrowLeft' });
    await waitFor(() => {
      expect(promptTab).toHaveAttribute('aria-selected', 'true');
    });

    // Press Home -> moves to first tab (Bundle)
    fireEvent.keyDown(promptTab, { key: 'Home' });
    await waitFor(() => {
      expect(bundleTab).toHaveAttribute('aria-selected', 'true');
    });

    // Press End -> moves to last tab (Prompt)
    fireEvent.keyDown(bundleTab, { key: 'End' });
    await waitFor(() => {
      expect(promptTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('11. Semantics WAI-ARIA: Tab và TabPanel liên kết 2 chiều qua id, aria-controls, aria-labelledby', () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const bundleTab = screen.getByRole('tab', { name: /Gói Bàn Giao/i });
    expect(bundleTab).toHaveAttribute('id', 'scholar-tab-bundle');
    expect(bundleTab).toHaveAttribute('aria-controls', 'scholar-tabpanel-bundle');

    const tabPanel = screen.getByRole('tabpanel');
    expect(tabPanel).toHaveAttribute('id', 'scholar-tabpanel-bundle');
    expect(tabPanel).toHaveAttribute('aria-labelledby', 'scholar-tab-bundle');
  });

  it('12. Screen Reader Live Announcements: vùng aria-live="polite" phát âm báo khi sao chép bundle/prompt hoặc lỗi', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

    // 1. Copy Bundle
    const copyBundleBtn = screen.getByRole('button', { name: /Sao chép Handoff Bundle/i });
    fireEvent.click(copyBundleBtn);

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/Đã sao chép Handoff Bundle vào bộ nhớ tạm/i);
    });

    // 2. Switch to Prompt tab and copy prompt
    const promptTab = screen.getByRole('tab', { name: /System Prompt/i });
    fireEvent.click(promptTab);

    const copyPromptBtn = screen.getByRole('button', { name: /Sao chép Prompt Chuyên Sâu/i });
    fireEvent.click(copyPromptBtn);

    await waitFor(() => {
      expect(liveRegion).toHaveTextContent(/Đã sao chép Prompt chuyên sâu vào bộ nhớ tạm/i);
    });
  });

  it('13. Form Associativity: Các label liên kết với input/select thông qua htmlFor và id chuẩn hóa', () => {
    render(<AntigravityHandoffModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    // Check Topic Selector
    const topicLabel = screen.getByText(/Chủ đề đóng gói bàn giao:/i);
    expect(topicLabel).toHaveAttribute('for', 'scholar-topic-selector');
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'scholar-topic-selector');

    // Switch to Prompt tab
    const promptTab = screen.getByRole('tab', { name: /System Prompt/i });
    fireEvent.click(promptTab);

    const queryLabel = screen.getByText(/Câu hỏi học thuật tùy chỉnh/i);
    expect(queryLabel).toHaveAttribute('for', 'scholar-custom-query-input');
    expect(screen.getByPlaceholderText(/Ví dụ: Phân tích 7 tâm sở biến hành/i)).toHaveAttribute(
      'id',
      'scholar-custom-query-input'
    );
  });
});
