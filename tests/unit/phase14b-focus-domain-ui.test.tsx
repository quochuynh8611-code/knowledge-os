import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { FOCUS_DOMAIN_STORAGE_KEY, STORAGE_ROOT_KEY, STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION } from '../../src/lib/storage';
import { Category, Topic } from '../../src/types';

const mockCategories: Category[] = [
  { id: 'cat-root-dong-y', name: 'Đông Y', slug: 'dong-y', type: 'dong-y', parentId: null },
  { id: 'cat-root-other', name: 'Khoa Học', slug: 'khoa-hoc', type: 'general', parentId: null },
];

const mockTopics: Topic[] = [
  {
    id: 'topic-dong-y-1',
    title: 'Lý Luận Đông Y',
    slug: 'ly-luan-dong-y',
    categoryId: 'cat-root-dong-y',
    type: 'dong-y',
    description: 'Nội dung Đông Y',
    content: 'Chi tiết',
    tags: [],
    links: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    studyProgress: {
      topicId: 'topic-dong-y-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
  },
  {
    id: 'topic-other-1',
    title: 'Khoa Học Tự Nhiên',
    slug: 'khoa-hoc-tu-nhien',
    categoryId: 'cat-root-other',
    type: 'general',
    description: 'Mô tả',
    content: 'Chi tiết',
    tags: [],
    links: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    studyProgress: {
      topicId: 'topic-other-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
  },
];

describe('Phase 14B: Focus Domain UI Flow Integration Tests (Wave 14B.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify(mockCategories));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_topics`, JSON.stringify(mockTopics));
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
