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

describe('Commercial Reset: Starter Topics & Next Step Recommendations', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Starter topic resolves correctly to root category', () => {
    expect(resolveRootCategory(INITIAL_CATEGORIES, 'cat-root-dong-y')?.id).toBe('cat-root-dong-y');
  });

  it('2. getDomainLearningStates returns valid status for Đông Y', () => {
    const states = getDomainLearningStates(INITIAL_TOPICS, INITIAL_CATEGORIES);

    // Đông Y domain
    const dongYState = states.find((s) => s.rootCategory.id === 'cat-root-dong-y');
    expect(dongYState).toBeDefined();
    expect(dongYState?.totalTopics).toBe(1);
    expect(dongYState?.completedTopics).toBe(0);
    expect(dongYState?.inProgressTopics).toBe(0);
    expect(dongYState?.donePercent).toBe(0);
    expect(dongYState?.nextStepTopic?.id).toBe('topic-dong-y-co-ban');
  });

  it('3. TodayLearningHero selects deterministic next_step when focusing on Đông Y', () => {
    const dongYRec = getTodayRecommendation(
      INITIAL_TOPICS,
      INITIAL_CATEGORIES,
      [],
      new Date('2026-08-30T10:00:00.000Z'),
      'cat-root-dong-y'
    );
    expect(dongYRec?.tier).toBe('next_step');
    expect(dongYRec?.topic?.id).toBe('topic-dong-y-co-ban');
    expect(dongYRec?.rootCategory?.id).toBe('cat-root-dong-y');
  });

  it('4. WeeklyCadenceBar computes valid cadence for initial topics', () => {
    const cadence = getWeeklyLearningCadence(INITIAL_TOPICS, new Date('2026-08-30T10:00:00.000Z'));
    expect(typeof cadence.activeDaysCount).toBe('number');
    expect(typeof cadence.activeTopicsCount).toBe('number');
  });

  it('5. DashboardHome displays CTA with the nextStepTopic on domain card', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    const dongYCard = screen.getByTestId('learning-state-card-cat-root-dong-y');
    expect(dongYCard).toBeInTheDocument();
    expect(dongYCard.textContent).toContain('Lý Luận Cơ Bản Đông Y');
  });
});
