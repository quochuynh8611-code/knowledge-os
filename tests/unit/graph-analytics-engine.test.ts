import { describe, it, expect } from 'vitest';
import type { Topic, Note, KnowledgeLink } from '../../src/types';
import { buildAdjacencyGraph } from '../../src/lib/knowledgeGraph';
import {
  computeGraphCentrality,
  detectOrphanNodesAndClusters,
  recommendSemanticBridges,
  analyzeKnowledgeGraphIntelligence,
} from '../../src/lib/graphAnalyticsEngine';

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

describe('Phase 10A: Graph Intelligence — Centrality Analytics, Orphan Detector & Semantic Bridge Recommender', () => {
  // ---------------------------------------------------------------------------
  // 1. PageRank & Weighted Degree Centrality Ranking
  // ---------------------------------------------------------------------------
  it('1. computeGraphCentrality xếp hạng Hub chủ đạo lên vị trí số 1 với PageRank và Weighted Degree cao nhất', () => {
    const hubTopic = createMockTopic({
      id: 'topic-hub',
      title: 'Học Máy & Trí Tuệ Nhân Tạo (Hub)',
      type: 'computer_science',
      categoryId: 'cat-cs',
      links: [],
    });

    const spoke1 = createMockTopic({
      id: 'topic-spoke-1',
      title: 'Mạng Nơ-ron Tích Chập',
      type: 'computer_science',
      categoryId: 'cat-cs',
      links: [{ sourceId: 'topic-spoke-1', targetId: 'topic-hub', linkType: 'related', strength: 5 }],
    });

    const spoke2 = createMockTopic({
      id: 'topic-spoke-2',
      title: 'Học Sâu Đa Tầng',
      type: 'computer_science',
      categoryId: 'cat-cs',
      links: [{ sourceId: 'topic-spoke-2', targetId: 'topic-hub', linkType: 'related', strength: 4 }],
    });

    const spoke3 = createMockTopic({
      id: 'topic-spoke-3',
      title: 'Cơ Chế Attention',
      type: 'computer_science',
      categoryId: 'cat-cs',
      links: [{ sourceId: 'topic-spoke-3', targetId: 'topic-hub', linkType: 'related', strength: 5 }],
    });

    const graph = buildAdjacencyGraph({
      topics: [hubTopic, spoke1, spoke2, spoke3],
    });

    const ranking = computeGraphCentrality(graph);

    expect(ranking.length).toBe(4);
    // Hub should rank #1
    expect(ranking[0].nodeId).toBe('topic-hub');
    expect(ranking[0].inDegree).toBe(3);
    expect(ranking[0].weightedDegree).toBe(14); // 5 + 4 + 5
    expect(ranking[0].pageRankScore).toBeGreaterThan(ranking[1].pageRankScore);
  });

  // ---------------------------------------------------------------------------
  // 2. Orphan Topic Detection (completely-isolated vs unlinked-island)
  // ---------------------------------------------------------------------------
  it('2. detectOrphanNodesAndClusters phân loại chính xác completely-isolated (0 link, 0 note, 0 res) và unlinked-island (có note/res nhưng 0 topic link)', () => {
    const linkedA = createMockTopic({
      id: 'topic-a',
      title: 'Chủ Đề A',
      type: 'general',
      categoryId: 'cat-1',
      links: [{ sourceId: 'topic-a', targetId: 'topic-b', linkType: 'related', strength: 3 }],
    });

    const linkedB = createMockTopic({
      id: 'topic-b',
      title: 'Chủ Đề B',
      type: 'general',
      categoryId: 'cat-1',
      links: [],
    });

    const completelyIsolated = createMockTopic({
      id: 'topic-isolated',
      title: 'Chủ Đề Hoàn Toàn Cô Lập',
      type: 'general',
      categoryId: 'cat-1',
      links: [],
    });

    const unlinkedIsland = createMockTopic({
      id: 'topic-island',
      title: 'Đảo Tri Thức Chưa Kết Nối',
      type: 'general',
      categoryId: 'cat-1',
      links: [],
    });

    const noteOnIsland: Note = {
      id: 'note-island-1',
      topicId: 'topic-island',
      title: 'Ghi chú trên đảo',
      content: 'Nội dung quan trọng nhưng chưa liên kết',
      type: 'study',
      isPrivate: false,
      tags: [],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const graph = buildAdjacencyGraph({
      topics: [linkedA, linkedB, completelyIsolated, unlinkedIsland],
      notes: [noteOnIsland],
    });

    const report = detectOrphanNodesAndClusters(graph, {
      topics: [linkedA, linkedB, completelyIsolated, unlinkedIsland],
      notes: [noteOnIsland],
    });

    expect(report.orphanTopics.length).toBe(2);

    const isolatedReport = report.orphanTopics.find((o) => o.topicId === 'topic-isolated');
    expect(isolatedReport).toBeDefined();
    expect(isolatedReport?.status).toBe('completely-isolated');
    expect(isolatedReport?.noteCount).toBe(0);

    const islandReport = report.orphanTopics.find((o) => o.topicId === 'topic-island');
    expect(islandReport).toBeDefined();
    expect(islandReport?.status).toBe('unlinked-island');
    expect(islandReport?.noteCount).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Connected Components & Network Density Calculation
  // ---------------------------------------------------------------------------
  it('3. detectOrphanNodesAndClusters nhận diện 2 phân cụm độc lập và tính mật độ mạng networkDensity', () => {
    // Cluster 1: T1 <-> T2
    const t1 = createMockTopic({
      id: 't-1',
      title: 'T1',
      type: 'domain-a',
      links: [{ sourceId: 't-1', targetId: 't-2', linkType: 'related', strength: 3 }],
    });
    const t2 = createMockTopic({
      id: 't-2',
      title: 'T2',
      type: 'domain-a',
      links: [{ sourceId: 't-2', targetId: 't-1', linkType: 'related', strength: 3 }],
    });

    // Cluster 2: T3 <-> T4
    const t3 = createMockTopic({
      id: 't-3',
      title: 'T3',
      type: 'domain-b',
      links: [{ sourceId: 't-3', targetId: 't-4', linkType: 'related', strength: 4 }],
    });
    const t4 = createMockTopic({
      id: 't-4',
      title: 'T4',
      type: 'domain-b',
      links: [],
    });

    const graph = buildAdjacencyGraph({ topics: [t1, t2, t3, t4] });
    const report = detectOrphanNodesAndClusters(graph, { topics: [t1, t2, t3, t4] });

    expect(report.clusterCount).toBe(2);
    expect(report.clusters.length).toBe(2);
    expect(report.networkDensity).toBeGreaterThan(0);
    expect(report.networkDensity).toBeLessThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Semantic Bridge Recommendation on Unlinked Related Topics
  // ---------------------------------------------------------------------------
  it('4. recommendSemanticBridges phát hiện độ tương đồng cao giữa 2 chủ đề chưa liên kết và trích xuất sharedTerms', () => {
    const topicMemory = createMockTopic({
      id: 'topic-mem',
      title: 'Đường Cong Lãng Quên & Củng Cố Trí Nhớ (Ebbinghaus)',
      description: 'Nghiên cứu về suy giảm trí nhớ và khoảng cách ôn tập lặp lại ngắt quãng.',
      content: 'Trí nhớ suy giảm theo hàm mũ nếu không có sự lặp lại ngắt quãng (spaced repetition).',
      tags: ['memory', 'retention', 'spaced-repetition'],
      type: 'psychology',
      links: [],
    });

    const topicFsrs = createMockTopic({
      id: 'topic-fsrs',
      title: 'Thuật Toán FSRS & Tối Ưu Hóa Trí Nhớ Dài Hạn',
      description: 'Mô hình hóa khả năng truy xuất ký ức (retrievability) và độ bền vững trí nhớ.',
      content: 'Thuật toán FSRS tính toán khoảng cách ôn tập tối ưu để duy trì độ lưu giữ trí nhớ cao.',
      tags: ['spaced-repetition', 'fsrs', 'algorithm'],
      type: 'computer_science',
      links: [],
    });

    const topicCooking = createMockTopic({
      id: 'topic-cook',
      title: 'Nghệ Thuật Làm Bánh Mì Men Tự Nhiên Sourdough',
      description: 'Kỹ thuật lên men bột mì và nuôi cấy men vi sinh.',
      tags: ['culinary', 'baking'],
      type: 'culinary',
      links: [],
    });

    const recommendations = recommendSemanticBridges([topicMemory, topicFsrs, topicCooking]);

    // Should recommend a bridge between topic-mem and topic-fsrs
    expect(recommendations.length).toBeGreaterThanOrEqual(1);
    const bridge = recommendations.find(
      (r) =>
        (r.sourceTopicId === 'topic-mem' && r.targetTopicId === 'topic-fsrs') ||
        (r.sourceTopicId === 'topic-fsrs' && r.targetTopicId === 'topic-mem')
    );
    expect(bridge).toBeDefined();
    expect(bridge?.similarityScore).toBeGreaterThanOrEqual(0.35);
    expect(bridge?.sharedTerms.length).toBeGreaterThan(0);
    // Cooking topic should NOT be recommended with high similarity
    const cookingBridge = recommendations.find(
      (r) => r.sourceTopicId === 'topic-cook' || r.targetTopicId === 'topic-cook'
    );
    expect(cookingBridge).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // 5. Existing Link Exclusion Guard
  // ---------------------------------------------------------------------------
  it('5. recommendSemanticBridges KHÔNG bao giờ gợi ý lại các chủ đề đã có liên kết trực tiếp', () => {
    const topicA = createMockTopic({
      id: 'top-a',
      title: 'Vật Lý Lượng Tử & Rối Lượng Tử',
      description: 'Quantum Entanglement and photon spin correlation.',
      tags: ['quantum', 'physics'],
      type: 'physics',
      links: [{ sourceId: 'top-a', targetId: 'top-b', linkType: 'related', strength: 5 }],
    });

    const topicB = createMockTopic({
      id: 'top-b',
      title: 'Bất Đẳng Thức Bell & Thực Nghiệm Lượng Tử',
      description: 'Bell inequalities testing local realism in quantum mechanics.',
      tags: ['quantum', 'physics'],
      type: 'physics',
      links: [],
    });

    const recommendations = recommendSemanticBridges([topicA, topicB]);
    expect(recommendations.length).toBe(0); // Excluded because already linked
  });

  // ---------------------------------------------------------------------------
  // 6. Cross-Domain (Interdisciplinary) Bridge Flagging
  // ---------------------------------------------------------------------------
  it('6. recommendSemanticBridges đánh dấu isCrossDomain: true khi 2 chủ đề thuộc các lĩnh vực khác nhau', () => {
    const topicAI = createMockTopic({
      id: 'top-ai',
      title: 'Mô Hình Hóa Nhận Thức Trong Trí Tuệ Nhân Tạo',
      description: 'Cognitive modeling using deep learning and neuro-symbolic AI.',
      tags: ['cognition', 'ai'],
      type: 'computer_science',
      categoryId: 'cat-cs',
      links: [],
    });

    const topicNeuro = createMockTopic({
      id: 'top-neuro',
      title: 'Cơ Chế Nhận Thức & Thần Kinh Học Não Bộ',
      description: 'Cognitive neuroscience and neural pathways of human perception.',
      tags: ['cognition', 'neuroscience'],
      type: 'neuroscience',
      categoryId: 'cat-bio',
      links: [],
    });

    const recommendations = recommendSemanticBridges([topicAI, topicNeuro]);
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].isCrossDomain).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 7. Suggested Link Type & Strength Mapping
  // ---------------------------------------------------------------------------
  it('7. recommendSemanticBridges ánh xạ độ mạnh 1..5 và nhận diện loại liên kết phù hợp', () => {
    const topicBase = createMockTopic({
      id: 'top-base',
      title: 'Toán Rời Rạc Cơ Bản',
      description: 'Kiến thức nền tảng và điều kiện tiên quyết cho cấu trúc dữ liệu và giải thuật.',
      tags: ['math', 'foundation'],
      type: 'math',
      links: [],
    });

    const topicAdv = createMockTopic({
      id: 'top-adv',
      title: 'Cấu Trúc Dữ Liệu & Giải Thuật Nâng Cao',
      description: 'Toán rời rạc cơ bản là nền tảng tiên quyết để học đồ thị và cây nhị phân.',
      tags: ['algorithm', 'math'],
      type: 'computer_science',
      links: [],
    });

    const recommendations = recommendSemanticBridges([topicBase, topicAdv]);
    expect(recommendations.length).toBe(1);
    expect(recommendations[0].suggestedLinkType).toBe('prerequisite');
    expect(recommendations[0].suggestedStrength).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // 8. Empty / Single-Node Graph Safety
  // ---------------------------------------------------------------------------
  it('8. analyzeKnowledgeGraphIntelligence xử lý đồ thị 0 hoặc 1 nút an toàn tuyệt đối (không NaN, không lỗi chia 0)', () => {
    const emptyReport = analyzeKnowledgeGraphIntelligence({ topics: [] });
    expect(emptyReport.centralityRanking).toEqual([]);
    expect(emptyReport.topHubs).toEqual([]);
    expect(emptyReport.topology.networkDensity).toBe(0);
    expect(emptyReport.topology.clusterCount).toBe(0);
    expect(emptyReport.bridgeRecommendations).toEqual([]);

    const singleTopic = createMockTopic({
      id: 'single-1',
      title: 'Đơn Độc',
      type: 'general',
      links: [],
    });

    const singleReport = analyzeKnowledgeGraphIntelligence({ topics: [singleTopic] });
    expect(singleReport.centralityRanking.length).toBe(1);
    expect(singleReport.topology.networkDensity).toBe(0);
    expect(singleReport.topology.orphanTopics.length).toBe(1);
    expect(singleReport.bridgeRecommendations.length).toBe(0);
    expect(Number.isNaN(singleReport.topology.networkDensity)).toBe(false);
  });
});
