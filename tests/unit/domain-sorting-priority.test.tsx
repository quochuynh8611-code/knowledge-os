import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  sortDomainLearningStates,
  DomainLearningState,
} from '../../src/lib/learningStateSelectors';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { Sidebar } from '../../src/components/layout/Sidebar';

describe('Wave 16.0: Root Domain Sorting Priority (isFocus -> totalTopics desc -> name A-Z)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Pure Helper / Selector: sortDomainLearningStates', () => {
    const createMockDomainState = (
      id: string,
      name: string,
      totalTopics: number,
      isFocus: boolean = false
    ): DomainLearningState => ({
      rootCategory: {
        id,
        name,
        slug: id,
        parentId: null,
      },
      totalTopics,
      completedTopics: 0,
      inProgressTopics: 0,
      donePercent: 0,
      totalTimeSpentMinutes: 0,
      status: 'dormant',
      statusLabel: 'Tạm dừng',
      lastStudiedAt: null,
      nextStepTopic: null,
      isFocus,
    });

    it('1.1. Sorts domains by totalTopics descending when no domain is focused', () => {
      const mockStates: DomainLearningState[] = [
        createMockDomainState('cat-root-dy', 'Đông Y', 2),
        createMockDomainState('cat-root-kh', 'Khoa Học', 20),
        createMockDomainState('cat-root-nn', 'Học Ngôn Ngữ', 2),
        createMockDomainState('cat-root-ls', 'Lịch Sử', 15),
      ];

      const sorted = sortDomainLearningStates(mockStates);
      const names = sorted.map((s) => s.rootCategory.name);

      expect(names).toEqual(['Khoa Học', 'Lịch Sử', 'Đông Y', 'Học Ngôn Ngữ']);
    });

    it('1.2. Puts isFocus domain at Slot 1 even if it has fewer topics', () => {
      const mockStates: DomainLearningState[] = [
        createMockDomainState('cat-root-dy', 'Đông Y', 2, true), // Focus pinned
        createMockDomainState('cat-root-kh', 'Khoa Học', 20, false),
        createMockDomainState('cat-root-nn', 'Học Ngôn Ngữ', 2, false),
        createMockDomainState('cat-root-ls', 'Lịch Sử', 15, false),
      ];

      const sorted = sortDomainLearningStates(mockStates);
      const names = sorted.map((s) => s.rootCategory.name);

      expect(names).toEqual(['Đông Y', 'Khoa Học', 'Lịch Sử', 'Học Ngôn Ngữ']);
      expect(sorted[0].isFocus).toBe(true);
    });

    it('1.3. Tie-breaks by Vietnamese alphabetical order (A-Z) when totalTopics are equal', () => {
      const mockStates: DomainLearningState[] = [
        createMockDomainState('cat-root-b', 'Bát Tự', 5),
        createMockDomainState('cat-root-a', 'Âm Dương', 5),
        createMockDomainState('cat-root-c', 'Cơ Bản', 5),
      ];

      const sorted = sortDomainLearningStates(mockStates);
      const names = sorted.map((s) => s.rootCategory.name);

      expect(names).toEqual(['Âm Dương', 'Bát Tự', 'Cơ Bản']);
    });
  });

  describe('2. UI Integration: DashboardHome & Sidebar Root Domain Ordering', () => {
    it('2.1. DashboardHome renders domain cards', () => {
      render(
        <DataProvider>
          <DashboardHome />
        </DataProvider>
      );

      const cards = screen.getAllByTestId(/learning-state-card-/i);
      expect(cards.length).toBeGreaterThanOrEqual(1);
      expect(cards[0]).toHaveAttribute('data-testid', 'learning-state-card-cat-root-dong-y');
    });

    it('2.2. Pinning Đông Y marks it with focus badge', () => {
      render(
        <DataProvider>
          <DashboardHome />
        </DataProvider>
      );

      // Pin Đông Y
      const pinBtn = screen.getByTestId('pin-btn-cat-root-dong-y');
      fireEvent.click(pinBtn);

      const cardsAfter = screen.getAllByTestId(/learning-state-card-/i);
      expect(cardsAfter[0]).toHaveAttribute('data-testid', 'learning-state-card-cat-root-dong-y');
      expect(screen.getByTestId('focus-badge-cat-root-dong-y')).toBeInTheDocument();
    });

    it('2.3. Sidebar renders domain navigation', () => {
      render(
        <DataProvider>
          <Sidebar />
        </DataProvider>
      );

      // Check sidebar domain items
      const dongYBtn = screen.getByRole('button', { name: /Đông Y/i });
      expect(dongYBtn).toBeInTheDocument();
    });
  });
});
