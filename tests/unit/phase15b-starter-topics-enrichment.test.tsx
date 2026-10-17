import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { resolveRootCategory } from '../../src/lib/taxonomyMigration';
import {
  getDomainLearningStates,
  getTodayRecommendation,
  getWeeklyLearningCadence,
} from '../../src/lib/learningStateSelectors';
import { Category, Topic } from '../../src/types';

describe('Commercial Neutralization: Recommendation & Cadence for Dynamic User Domains', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Root category resolution returns null gracefully when categories list is empty', () => {
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-any')).toBeNull();
  });

  it('2. WeeklyCadenceBar computes 0 cadence gracefully for empty initial topics', () => {
    const cadence = getWeeklyLearningCadence(INITIAL_TOPICS, new Date('2026-08-30T10:00:00.000Z'));
    expect(cadence.activeDaysCount).toBe(0);
    expect(cadence.activeTopicsCount).toBe(0);
  });

  it('3. getDomainLearningStates returns valid metrics for user-created domain', () => {
    const customCategory: Category = {
      id: 'cat-root-ai',
      name: 'Trí Tuệ Nhân Tạo',
      slug: 'tri-tue-nhan-tao',
      type: 'ai-ml',
      description: 'Nghiên cứu mô hình học máy',
    };

    const customTopic: Topic = {
      id: 'topic-transformer-arch',
      title: 'Kiến Trúc Transformer & Attention Mechanism',
      slug: 'kien-truc-transformer',
      categoryId: customCategory.id,
      type: 'ai-ml',
      description: 'Khảo cứu cơ chế tự chú ý',
      content: 'Nội dung kỹ thuật',
      tags: ['ai', 'deep-learning'],
      links: [],
      studyProgress: {
        topicId: 'topic-transformer-arch',
        status: 'not_started',
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: '2026-10-16T00:00:00.000Z',
      updatedAt: '2026-10-16T00:00:00.000Z',
    };

    const states = getDomainLearningStates([customTopic], [customCategory]);
    const aiState = states.find((s) => s.rootCategory.id === 'cat-root-ai');
    expect(aiState).toBeDefined();
    expect(aiState?.totalTopics).toBe(1);
    expect(aiState?.completedTopics).toBe(0);
    expect(aiState?.inProgressTopics).toBe(0);
    expect(aiState?.donePercent).toBe(0);
    expect(aiState?.nextStepTopic?.id).toBe('topic-transformer-arch');

    const recommendation = getTodayRecommendation(
      [customTopic],
      [customCategory],
      [],
      new Date('2026-08-30T10:00:00.000Z'),
      'cat-root-ai'
    );
    expect(recommendation?.tier).toBe('next_step');
    expect(recommendation?.topic?.id).toBe('topic-transformer-arch');
    expect(recommendation?.rootCategory?.id).toBe('cat-root-ai');
  });
});
