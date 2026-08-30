import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { resolveRootCategory } from '../../src/lib/taxonomyMigration';
import {
  getDomainLearningStates,
  getTodayRecommendation,
  getWeeklyLearningCadence,
} from '../../src/lib/learningStateSelectors';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';

describe('Phase 15 Wave 15.0B: Starter Topics & Subcategories Enrichment', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. New subcategories resolve correctly to their corresponding root categories', () => {
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-ly-luan-dong-y')?.id).toBe('cat-root-dong-y');
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-duoc-hoc-dong-y')?.id).toBe('cat-root-dong-y');
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-tieng-han-co')?.id).toBe('cat-root-ngon-ngu');
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-tieng-pali-sanskrit')?.id).toBe('cat-root-ngon-ngu');
  });

  it('2. getDomainLearningStates returns dormant-by-default status (0%) and deterministic nextStepTopic (createdAt asc)', () => {
    const states = getDomainLearningStates(INITIAL_TOPICS, INITIAL_CATEGORIES);

    // Đông Y domain
    const dongYState = states.find((s) => s.rootCategory.id === 'cat-root-dong-y');
    expect(dongYState).toBeDefined();
    expect(dongYState?.totalTopics).toBe(2);
    expect(dongYState?.completedTopics).toBe(0);
    expect(dongYState?.inProgressTopics).toBe(0);
    expect(dongYState?.donePercent).toBe(0);
    expect(dongYState?.totalTimeSpentMinutes).toBe(0);
    expect(dongYState?.status).toBe('dormant');
    expect(dongYState?.statusLabel).toBe('Tạm dừng');
    expect(dongYState?.lastStudiedAt).toBeNull();
    // top-dongy-1 (08:00) is earlier than top-dongy-2 (08:30)
    expect(dongYState?.nextStepTopic?.id).toBe('top-dongy-1');
    expect(dongYState?.nextStepTopic?.title).toBe('Âm Dương Ngũ Hành & Học Thuyết Tạng Tượng');

    // Học Ngôn Ngữ domain
    const ngonNguState = states.find((s) => s.rootCategory.id === 'cat-root-ngon-ngu');
    expect(ngonNguState).toBeDefined();
    expect(ngonNguState?.totalTopics).toBe(2);
    expect(ngonNguState?.completedTopics).toBe(0);
    expect(ngonNguState?.donePercent).toBe(0);
    expect(ngonNguState?.status).toBe('dormant');
    expect(ngonNguState?.statusLabel).toBe('Tạm dừng');
    // top-ngonngu-1 (09:00) is earlier than top-ngonngu-2 (09:30)
    expect(ngonNguState?.nextStepTopic?.id).toBe('top-ngonngu-1');
    expect(ngonNguState?.nextStepTopic?.title).toBe('214 Bộ Thủ Chữ Hán & Phương Pháp Chiết Tự');
  });

  it('3. TodayLearningHero selects deterministic next_step when focusing on Đông Y or Học Ngôn Ngữ', () => {
    // Focus on Đông Y
    const dongYRec = getTodayRecommendation(
      INITIAL_TOPICS,
      INITIAL_CATEGORIES,
      [],
      new Date('2026-08-30T10:00:00.000Z'),
      'cat-root-dong-y'
    );
    expect(dongYRec.tier).toBe('next_step');
    expect(dongYRec.topic?.id).toBe('top-dongy-1');
    expect(dongYRec.rootCategory?.id).toBe('cat-root-dong-y');

    // Focus on Học Ngôn Ngữ
    const ngonNguRec = getTodayRecommendation(
      INITIAL_TOPICS,
      INITIAL_CATEGORIES,
      [],
      new Date('2026-08-30T10:00:00.000Z'),
      'cat-root-ngon-ngu'
    );
    expect(ngonNguRec.tier).toBe('next_step');
    expect(ngonNguRec.topic?.id).toBe('top-ngonngu-1');
    expect(ngonNguRec.rootCategory?.id).toBe('cat-root-ngon-ngu');
  });

  it('4. WeeklyCadenceBar is not polluted by starter topics (zero active days added)', () => {
    const topicsWithoutStarters = INITIAL_TOPICS.filter(
      (t) => !['top-dongy-1', 'top-dongy-2', 'top-ngonngu-1', 'top-ngonngu-2'].includes(t.id)
    );

    const cadenceFull = getWeeklyLearningCadence(INITIAL_TOPICS, new Date('2026-08-30T10:00:00.000Z'));
    const cadenceWithoutStarters = getWeeklyLearningCadence(
      topicsWithoutStarters,
      new Date('2026-08-30T10:00:00.000Z')
    );

    expect(cadenceFull.activeDaysCount).toBe(cadenceWithoutStarters.activeDaysCount);
    expect(cadenceFull.activeTopicsCount).toBe(cadenceWithoutStarters.activeTopicsCount);
  });

  it('5. DashboardHome displays CTA with the deterministic nextStepTopic on both new domain cards', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    const dongYCard = screen.getByTestId('learning-state-card-cat-root-dong-y');
    expect(dongYCard).toBeInTheDocument();
    expect(dongYCard.textContent).toContain('0/2 bài (0%)');
    expect(dongYCard.textContent).toContain('Âm Dương Ngũ Hành & Học Thuyết Tạng Tượng');

    const ngonNguCard = screen.getByTestId('learning-state-card-cat-root-ngon-ngu');
    expect(ngonNguCard).toBeInTheDocument();
    expect(ngonNguCard.textContent).toContain('0/2 bài (0%)');
    expect(ngonNguCard.textContent).toContain('214 Bộ Thủ Chữ Hán & Phương Pháp Chiết Tự');
  });
});
