import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GraphInsightsPanel } from '../../src/components/graph/GraphInsightsPanel';
import { KnowledgeGraph } from '../../src/components/graph/KnowledgeGraph';
import type { Topic, Note, Resource, KnowledgeLink } from '../../src/types';

// Mock helper
function createMockTopic(overrides: Partial<Topic> & { id: string; title: string }): Topic {
  const links: KnowledgeLink[] = (overrides.links || []).map((lnk) => ({
    sourceId: lnk.sourceId || overrides.id,
    targetId: lnk.targetId,
    linkType: lnk.linkType || 'related',
    strength: lnk.strength ?? 3,
    notes: lnk.notes,
    explanation: lnk.explanation,
  }));

  return {
    id: overrides.id,
    title: overrides.title,
    slug: overrides.slug || overrides.id,
    categoryId: overrides.categoryId || 'cat-general',
    type: overrides.type || 'general',
    description: overrides.description || '',
    content: overrides.content || '',
    tags: overrides.tags || [],
    links,
    studyProgress: overrides.studyProgress || {
      topicId: overrides.id,
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: overrides.createdAt || '2024-01-01T00:00:00Z',
    updatedAt: overrides.updatedAt || '2024-01-01T00:00:00Z',
  };
}

// Global fixtures for GraphInsightsPanel
const topicHub = createMockTopic({
  id: 'topic-hub',
  title: 'Học Máy & Trí Tuệ Nhân Tạo (Hub)',
  type: 'computer_science',
  categoryId: 'cat-cs',
  links: [],
});

const topicSpoke1 = createMockTopic({
  id: 'topic-spoke-1',
  title: 'Mạng Nơ-ron Tích Chập',
  type: 'computer_science',
  categoryId: 'cat-cs',
  links: [{ sourceId: 'topic-spoke-1', targetId: 'topic-hub', linkType: 'related', strength: 5 }],
});

const topicSpoke2 = createMockTopic({
  id: 'topic-spoke-2',
  title: 'Học Sâu Đa Tầng',
  type: 'computer_science',
  categoryId: 'cat-cs',
  links: [{ sourceId: 'topic-spoke-2', targetId: 'topic-hub', linkType: 'related', strength: 4 }],
});

const topicIsolated = createMockTopic({
  id: 'topic-isolated',
  title: 'Chủ Đề Hoàn Toàn Cô Lập',
  type: 'philosophy',
  categoryId: 'cat-phil',
  links: [],
});

const topicIsland = createMockTopic({
  id: 'topic-island',
  title: 'Kỷ Băng Hà & Tiến Hóa Cổ Đại',
  type: 'history',
  categoryId: 'cat-hist',
  links: [],
});

const noteIsland: Note = {
  id: 'note-island-1',
  topicId: 'topic-island',
  title: 'Ghi chú trên đảo tri thức',
  content: 'Tài liệu độc lập',
  type: 'study',
  isPrivate: false,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Unlinked semantically related pair (for bridges)
const topicMemory = createMockTopic({
  id: 'topic-mem',
  title: 'Đường Cong Lãng Quên & Củng Cố Trí Nhớ',
  description: 'Nghiên cứu về suy giảm trí nhớ và khoảng cách ôn tập lặp lại ngắt quãng.',
  content: 'Trí nhớ suy giảm theo hàm mũ nếu không có spaced repetition.',
  tags: ['memory', 'retention', 'spaced-repetition'],
  type: 'psychology',
  categoryId: 'cat-psych',
  links: [],
});

const topicFsrs = createMockTopic({
  id: 'topic-fsrs',
  title: 'Thuật Toán FSRS & Tối Ưu Hóa Trí Nhớ Dài Hạn',
  description: 'Mô hình hóa khả năng truy xuất ký ức (retrievability) và độ bền vững trí nhớ.',
  content: 'Thuật toán FSRS tính toán khoảng cách ôn tập tối ưu để duy trì độ lưu giữ trí nhớ cao.',
  tags: ['spaced-repetition', 'fsrs', 'algorithm'],
  type: 'computer_science',
  categoryId: 'cat-cs', // Different category -> cross domain!
  links: [],
});

const mockAddKnowledgeLink = vi.fn();
const mockOpenTopicDetail = vi.fn();

const mockContextTopics = [topicHub, topicSpoke1, topicSpoke2, topicIsolated, topicIsland, topicMemory, topicFsrs];
const mockContextNotes = [noteIsland];
const mockContextResources: Resource[] = [];
const mockContextCategories: any[] = [];
const mockContextTags: any[] = [];

// Mock DataContext for KnowledgeGraph test
vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockContextTopics,
    notes: mockContextNotes,
    resources: mockContextResources,
    categories: mockContextCategories,
    tags: mockContextTags,
    openTopicDetail: mockOpenTopicDetail,
    addKnowledgeLink: mockAddKnowledgeLink,
  }),
}));

describe('Phase 10B: GraphInsightsPanel UI & KnowledgeGraph Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Topology Telemetry & Top Hubs Ranking
  // ---------------------------------------------------------------------------
  it('1. hiển thị bảng điều khiển GraphInsightsPanel với các chỉ số topology và danh sách Hubs theo PageRank', () => {
    render(
      <GraphInsightsPanel
        topics={[topicHub, topicSpoke1, topicSpoke2, topicIsolated, topicIsland]}
        notes={[noteIsland]}
        resources={[]}
      />
    );

    expect(screen.getByTestId('graph-insights-panel')).toBeInTheDocument();

    // Check Hub ranking section
    expect(screen.getByTestId('graph-hubs-section')).toBeInTheDocument();
    const hubItem = screen.getByTestId('hub-rank-item-topic-hub');
    expect(hubItem).toBeInTheDocument();
    expect(within(hubItem).getByText(/Học Máy & Trí Tuệ Nhân Tạo \(Hub\)/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. Orphan Topics Inspection & Quick Navigation
  // ---------------------------------------------------------------------------
  it('2. hiển thị danh sách Orphan Topics với nhãn trạng thái và gọi onSelectTopic khi click', () => {
    const onSelectTopic = vi.fn();

    render(
      <GraphInsightsPanel
        topics={[topicHub, topicSpoke1, topicSpoke2, topicIsolated, topicIsland]}
        notes={[noteIsland]}
        resources={[]}
        onSelectTopic={onSelectTopic}
      />
    );

    const orphansSection = screen.getByTestId('graph-orphans-section');
    expect(orphansSection).toBeInTheDocument();

    // Completely isolated topic
    const isolatedItem = screen.getByTestId('orphan-topic-item-topic-isolated');
    expect(isolatedItem).toBeInTheDocument();
    expect(within(isolatedItem).getByText(/Cô lập hoàn toàn/i)).toBeInTheDocument();

    // Unlinked island topic (has note)
    const islandItem = screen.getByTestId('orphan-topic-item-topic-island');
    expect(islandItem).toBeInTheDocument();
    expect(within(islandItem).getByText(/Ốc đảo chưa liên kết/i)).toBeInTheDocument();

    // Clicking orphan topic invokes onSelectTopic
    fireEvent.click(isolatedItem);
    expect(onSelectTopic).toHaveBeenCalledWith('topic-isolated');
  });

  // ---------------------------------------------------------------------------
  // 3. Semantic Bridge Recommendations & Cross-Domain Badge
  // ---------------------------------------------------------------------------
  it('3. hiển thị gợi ý cầu nối ngữ nghĩa với similarity score, sharedTerms và huy hiệu Liên ngành', () => {
    render(
      <GraphInsightsPanel
        topics={[topicMemory, topicFsrs]}
        notes={[]}
        resources={[]}
      />
    );

    const bridgesSection = screen.getByTestId('graph-bridges-section');
    expect(bridgesSection).toBeInTheDocument();

    // Bridge should be recommended between topic-mem and topic-fsrs
    const bridgeItem = screen.getByTestId(/bridge-recommendation-/);
    expect(bridgeItem).toBeInTheDocument();
    expect(within(bridgeItem).getByText(/Đường Cong Lãng Quên & Củng Cố Trí Nhớ/i)).toBeInTheDocument();
    expect(within(bridgeItem).getByText(/Thuật Toán FSRS & Tối Ưu Hóa Trí Nhớ Dài Hạn/i)).toBeInTheDocument();

    // Cross-Domain badge
    expect(within(bridgeItem).getByText(/Liên ngành/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. 1-Click Semantic Bridge Connection
  // ---------------------------------------------------------------------------
  it('4. cho phép kết nối cầu nối ngữ nghĩa với 1 click và tự động xóa khỏi danh sách gợi ý đang hiển thị', () => {
    const onConnectBridge = vi.fn();

    render(
      <GraphInsightsPanel
        topics={[topicMemory, topicFsrs]}
        notes={[]}
        resources={[]}
        onConnectBridge={onConnectBridge}
      />
    );

    const connectBtn = screen.getByTestId(/connect-bridge-btn-/);
    expect(connectBtn).toBeInTheDocument();

    fireEvent.click(connectBtn);

    expect(onConnectBridge).toHaveBeenCalledTimes(1);
    const linkArg = onConnectBridge.mock.calls[0][0];
    expect(linkArg.sourceId).toBeDefined();
    expect(linkArg.targetId).toBeDefined();
    expect(linkArg.strength).toBeGreaterThanOrEqual(1);
    expect(['related', 'prerequisite', 'advanced', 'contradicts']).toContain(linkArg.linkType);

    // After clicking connect, recommendation item should disappear from the UI list
    expect(screen.queryByTestId(/bridge-recommendation-/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 5. Integration inside KnowledgeGraph.tsx
  // ---------------------------------------------------------------------------
  it('5. KnowledgeGraph render GraphInsightsPanel và nút toggle để mở/đóng bảng phân tích đồ thị', () => {
    render(<KnowledgeGraph />);

    // Toggle button should exist
    const toggleBtn = screen.getByTestId('toggle-graph-insights-btn');
    expect(toggleBtn).toBeInTheDocument();

    // Default closed
    expect(screen.queryByTestId('graph-insights-panel')).not.toBeInTheDocument();

    // Toggle open
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('graph-insights-panel')).toBeInTheDocument();

    // Toggle close
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('graph-insights-panel')).not.toBeInTheDocument();
  });
});
