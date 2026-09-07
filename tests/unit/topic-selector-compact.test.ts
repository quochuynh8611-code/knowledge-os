import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PRIORITY_TOPIC_IDS,
  getCompactTopicOptions,
} from '../../src/lib/topicSelector';
import { Topic } from '../../src/types';

function createMockTopic(id: string, title: string, type: 'phat-hoc' | 'huyen-hoc' | 'dong-y' | 'ngon-ngu'): Topic {
  return {
    id,
    title,
    slug: id,
    type,
    categoryId: `cat-${type}`,
    categoryName: type,
    description: 'Description',
    content: 'Content',
    tags: [],
    links: [],
    studyProgress: {
      topicId: id,
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  };
}

describe('ADR-073.1: Compact Topic Selector Unit Tests', () => {
  const mockTopics: Topic[] = [
    createMockTopic('topic-abhidharma-tong-quan', 'Vi Diệu Pháp Toàn Tập', 'phat-hoc'),
    createMockTopic('topic-thien-vipassana', 'Thiền Vipassana', 'phat-hoc'),
    createMockTopic('topic-phap-tu', 'Bộ Pháp Tụ', 'phat-hoc'),
    createMockTopic('topic-ky-mon-don-giap', 'Kỳ Môn Độn Giáp', 'huyen-hoc'),
    createMockTopic('topic-kinh-dich', 'Kinh Dịch', 'huyen-hoc'),
    createMockTopic('topic-tu-vi-dau-so', 'Tử Vi Đẩu Số', 'huyen-hoc'),
    createMockTopic('top-dongy-1', 'Âm Dương Ngũ Hành', 'dong-y'),
    createMockTopic('top-dongy-2', 'Tứ Khí Ngũ Vị', 'dong-y'),
    createMockTopic('top-ngonngu-1', '214 Bộ Thủ Chữ Hán', 'ngon-ngu'),
    createMockTopic('top-ngonngu-2', 'Devanagari & Phạn Pāli', 'ngon-ngu'),
  ];

  it('1. DEFAULT_PRIORITY_TOPIC_IDS contains exactly 8 curated anchor topics', () => {
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toHaveLength(8);
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('topic-abhidharma-tong-quan');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('topic-thien-vipassana');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('topic-ky-mon-don-giap');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('topic-kinh-dich');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('top-dongy-1');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('top-dongy-2');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('top-ngonngu-1');
    expect(DEFAULT_PRIORITY_TOPIC_IDS).toContain('top-ngonngu-2');
  });

  it('2. getCompactTopicOptions returns exactly 8 priority topics by default when showAll is false and selected topic is inside priority list', () => {
    const visible = getCompactTopicOptions(mockTopics, 'topic-abhidharma-tong-quan', false);
    expect(visible).toHaveLength(8);
    const visibleIds = visible.map((t) => t.id);
    expect(visibleIds).not.toContain('topic-phap-tu');
    expect(visibleIds).not.toContain('topic-tu-vi-dau-so');
  });

  it('3. getCompactTopicOptions dynamically prepends selected topic when it is outside priority list to preserve active context', () => {
    // topic-phap-tu is NOT in priority list
    const visible = getCompactTopicOptions(mockTopics, 'topic-phap-tu', false);
    expect(visible).toHaveLength(9);
    expect(visible[0].id).toBe('topic-phap-tu');
    expect(visible.map((t) => t.id)).toContain('topic-phap-tu');
  });

  it('4. getCompactTopicOptions returns all 10 topics when showAll is true', () => {
    const visible = getCompactTopicOptions(mockTopics, 'topic-abhidharma-tong-quan', true);
    expect(visible).toHaveLength(10);
    expect(visible.map((t) => t.id)).toContain('topic-phap-tu');
    expect(visible.map((t) => t.id)).toContain('topic-tu-vi-dau-so');
  });

  it('5. getCompactTopicOptions handles empty or undefined topics gracefully', () => {
    expect(getCompactTopicOptions([], undefined, false)).toEqual([]);
    expect(getCompactTopicOptions(undefined as unknown as Topic[], undefined, false)).toEqual([]);
  });
});
