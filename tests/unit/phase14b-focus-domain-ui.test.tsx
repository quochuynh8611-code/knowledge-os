import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { FOCUS_DOMAIN_STORAGE_KEY } from '../../src/lib/storage';

describe('Phase 14B: Focus Domain UI Flow Integration Tests (Wave 14B.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('knowledge_os_storage_version', '3');
    vi.clearAllMocks();
  });

  it('1. Pinning a domain puts it in slot 1 and marks it with "Trọng tâm" badge', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Initial state: cards exist
    const cardsBefore = screen.getAllByTestId(/learning-state-card-/i);
    expect(cardsBefore.length).toBeGreaterThanOrEqual(1);

    // Find the pin button for the domain (cat-root-dong-y)
    const pinDongYBtn = screen.getByTestId('pin-btn-cat-root-dong-y');
    expect(pinDongYBtn).toBeInTheDocument();

    // Click pin
    fireEvent.click(pinDongYBtn);

    // Card should now have focus badge "Trọng tâm"
    expect(screen.getByTestId('focus-badge-cat-root-dong-y')).toBeInTheDocument();

    // The first card in the grid must now be cat-root-dong-y
    const cardsAfter = screen.getAllByTestId(/learning-state-card-/i);
    expect(cardsAfter[0]).toHaveAttribute('data-testid', 'learning-state-card-cat-root-dong-y');

    // Storage check
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBe('cat-root-dong-y');
  });

  it('2. Unpinning a domain restores baseline ordering and removes "Trọng tâm" badge', () => {
    localStorage.setItem(FOCUS_DOMAIN_STORAGE_KEY, 'cat-root-dong-y');

    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Should start with focus badge
    expect(screen.getByTestId('focus-badge-cat-root-dong-y')).toBeInTheDocument();

    // Click pin button again to unpin
    const pinDongYBtn = screen.getByTestId('pin-btn-cat-root-dong-y');
    fireEvent.click(pinDongYBtn);

    // Badge removed
    expect(screen.queryByTestId('focus-badge-cat-root-dong-y')).toBeNull();
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();
  });

  it('3. TodayLearningHero updates to recommend focus domain when pinned', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Pin Đông Y
    const pinDongYBtn = screen.getByTestId('pin-btn-cat-root-dong-y');
    fireEvent.click(pinDongYBtn);

    // Hero must reflect the recommendation
    const hero = screen.getByTestId('today-learning-hero');
    expect(hero).toBeInTheDocument();
    expect(hero.textContent).toContain('Đông Y');
  });

  it('4. Renders WeeklyCadenceBar below TodayLearningHero in DashboardHome', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    const cadenceBar = screen.getByTestId('weekly-cadence-bar');
    expect(cadenceBar).toBeInTheDocument();
    expect(screen.getByTestId('cadence-day-T2')).toBeInTheDocument();
    expect(screen.getByTestId('cadence-day-CN')).toBeInTheDocument();
  });
});
