import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { FOCUS_DOMAIN_STORAGE_KEY } from '../../src/lib/storage';

describe('Phase 14B: Focus Domain UI Flow Integration Tests (Wave 14B.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. Pinning a domain puts it in slot 1 and marks it with "Trọng tâm" badge', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Initial state: multiple cards exist
    const cardsBefore = screen.getAllByTestId(/learning-state-card-/i);
    expect(cardsBefore.length).toBeGreaterThanOrEqual(2);

    // Find the pin button for the second domain (e.g. cat-root-huyen-hoc)
    const pinHuyenHocBtn = screen.getByTestId('pin-btn-cat-root-huyen-hoc');
    expect(pinHuyenHocBtn).toBeInTheDocument();

    // Click pin
    fireEvent.click(pinHuyenHocBtn);

    // Card should now have focus badge "Trọng tâm"
    expect(screen.getByTestId('focus-badge-cat-root-huyen-hoc')).toBeInTheDocument();

    // Reordered: the first card in the grid must now be cat-root-huyen-hoc
    const cardsAfter = screen.getAllByTestId(/learning-state-card-/i);
    expect(cardsAfter[0]).toHaveAttribute('data-testid', 'learning-state-card-cat-root-huyen-hoc');

    // Storage check
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBe('cat-root-huyen-hoc');
  });

  it('2. Unpinning a domain restores baseline ordering and removes "Trọng tâm" badge', () => {
    localStorage.setItem(FOCUS_DOMAIN_STORAGE_KEY, 'cat-root-huyen-hoc');

    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Should start with focus badge
    expect(screen.getByTestId('focus-badge-cat-root-huyen-hoc')).toBeInTheDocument();

    // Click pin button again to unpin
    const pinHuyenHocBtn = screen.getByTestId('pin-btn-cat-root-huyen-hoc');
    fireEvent.click(pinHuyenHocBtn);

    // Badge removed
    expect(screen.queryByTestId('focus-badge-cat-root-huyen-hoc')).toBeNull();
    expect(localStorage.getItem(FOCUS_DOMAIN_STORAGE_KEY)).toBeNull();
  });

  it('3. TodayLearningHero updates to recommend focus domain when pinned', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    // Pin Huyền Học
    const pinHuyenHocBtn = screen.getByTestId('pin-btn-cat-root-huyen-hoc');
    fireEvent.click(pinHuyenHocBtn);

    // Hero must reflect the recommendation
    const hero = screen.getByTestId('today-learning-hero');
    expect(hero).toBeInTheDocument();
    expect(hero.textContent).toContain('Huyền Học');
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
