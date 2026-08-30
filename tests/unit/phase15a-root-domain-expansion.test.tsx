import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { getRootCategories } from '../../src/lib/taxonomyMigration';
import { getDomainLearningStates } from '../../src/lib/learningStateSelectors';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';

describe('Phase 15 Wave 15.0A: Minimal Root Domain Expansion (Đông Y & Học Ngôn Ngữ)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. INITIAL_CATEGORIES defines exactly 4 default root categories', () => {
    const rootCategories = getRootCategories(INITIAL_CATEGORIES);
    expect(rootCategories).toHaveLength(4);

    const rootIds = rootCategories.map((r) => r.id);
    expect(rootIds).toContain('cat-root-phat-hoc');
    expect(rootIds).toContain('cat-root-huyen-hoc');
    expect(rootIds).toContain('cat-root-dong-y');
    expect(rootIds).toContain('cat-root-ngon-ngu');

    const dongY = rootCategories.find((r) => r.id === 'cat-root-dong-y');
    expect(dongY?.name).toBe('Đông Y');
    expect(dongY?.slug).toBe('dong-y');
    expect(dongY?.type).toBe('dong-y');
    expect(dongY?.parentId).toBeNull();

    const ngonNgu = rootCategories.find((r) => r.id === 'cat-root-ngon-ngu');
    expect(ngonNgu?.name).toBe('Học Ngôn Ngữ');
    expect(ngonNgu?.slug).toBe('ngon-ngu');
    expect(ngonNgu?.type).toBe('ngon-ngu');
    expect(ngonNgu?.parentId).toBeNull();
  });

  it('2. getDomainLearningStates returns dormant status (0 topics) for Đông Y and Học Ngôn Ngữ when no starter topics exist', () => {
    const topicsWithoutStarters = INITIAL_TOPICS.filter(
      (t) => !['top-dongy-1', 'top-dongy-2', 'top-ngonngu-1', 'top-ngonngu-2'].includes(t.id)
    );
    const states = getDomainLearningStates(topicsWithoutStarters, INITIAL_CATEGORIES);
    expect(states).toHaveLength(4);

    const dongYState = states.find((s) => s.rootCategory.id === 'cat-root-dong-y');
    expect(dongYState).toBeDefined();
    expect(dongYState?.totalTopics).toBe(0);
    expect(dongYState?.completedTopics).toBe(0);
    expect(dongYState?.donePercent).toBe(0);
    expect(dongYState?.totalTimeSpentMinutes).toBe(0);
    expect(dongYState?.status).toBe('dormant');
    expect(dongYState?.statusLabel).toBe('Tạm dừng');
    expect(dongYState?.nextStepTopic).toBeNull();

    const ngonNguState = states.find((s) => s.rootCategory.id === 'cat-root-ngon-ngu');
    expect(ngonNguState).toBeDefined();
    expect(ngonNguState?.totalTopics).toBe(0);
    expect(ngonNguState?.status).toBe('dormant');
    expect(ngonNguState?.nextStepTopic).toBeNull();
  });

  it('3. DashboardHome renders all 4 domain cards gracefully', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    expect(screen.getByTestId('learning-state-card-cat-root-phat-hoc')).toBeInTheDocument();
    expect(screen.getByTestId('learning-state-card-cat-root-huyen-hoc')).toBeInTheDocument();
    expect(screen.getByTestId('learning-state-card-cat-root-dong-y')).toBeInTheDocument();
    expect(screen.getByTestId('learning-state-card-cat-root-ngon-ngu')).toBeInTheDocument();

    // Check card text
    expect(screen.getByText('Đông Y')).toBeInTheDocument();
    expect(screen.getByText('Học Ngôn Ngữ')).toBeInTheDocument();
  });

  it('4. Pinning a 0-topic domain (e.g. Đông Y) moves it to Slot 1 with "Trọng tâm" badge without breaking Hero or Cadence Bar', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    const pinDongYBtn = screen.getByTestId('pin-btn-cat-root-dong-y');
    expect(pinDongYBtn).toBeInTheDocument();

    // Pin Đông Y
    fireEvent.click(pinDongYBtn);

    // Verify Đông Y receives focus badge and is sorted to slot 1
    expect(screen.getByTestId('focus-badge-cat-root-dong-y')).toBeInTheDocument();
    const cards = screen.getAllByTestId(/learning-state-card-/i);
    expect(cards[0]).toHaveAttribute('data-testid', 'learning-state-card-cat-root-dong-y');

    // Verify TodayLearningHero and WeeklyCadenceBar remain intact
    expect(screen.getByTestId('today-learning-hero')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-cadence-bar')).toBeInTheDocument();
  });
});
