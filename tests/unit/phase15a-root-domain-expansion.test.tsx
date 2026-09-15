import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { getRootCategories } from '../../src/lib/taxonomyMigration';
import { getDomainLearningStates } from '../../src/lib/learningStateSelectors';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';

describe('Commercial Reset: Root Domain Baseline (Đông Y)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. INITIAL_CATEGORIES defines default root category (Đông Y)', () => {
    const rootCategories = getRootCategories(INITIAL_CATEGORIES);
    expect(rootCategories.length).toBeGreaterThanOrEqual(1);

    const dongY = rootCategories.find((r) => r.id === 'cat-root-dong-y');
    expect(dongY?.name).toBe('Đông Y');
    expect(dongY?.slug).toBe('dong-y');
    expect(dongY?.type).toBe('dong-y');
    expect(dongY?.parentId).toBeNull();
  });

  it('2. getDomainLearningStates returns learning state for Đông Y', () => {
    const states = getDomainLearningStates(INITIAL_TOPICS, INITIAL_CATEGORIES);
    expect(states.length).toBeGreaterThanOrEqual(1);

    const dongYState = states.find((s) => s.rootCategory.id === 'cat-root-dong-y');
    expect(dongYState).toBeDefined();
    expect(dongYState?.totalTopics).toBe(1);
    expect(dongYState?.completedTopics).toBe(0);
  });

  it('3. DashboardHome renders domain card gracefully', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    expect(screen.getByTestId('learning-state-card-cat-root-dong-y')).toBeInTheDocument();
    expect(screen.getAllByText('Đông Y').length).toBeGreaterThan(0);
  });

  it('4. Pinning Đông Y marks it with "Trọng tâm" badge without breaking Hero or Cadence Bar', () => {
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
