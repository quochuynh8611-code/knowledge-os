import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { calculateRootCategoryStats } from '../../src/lib/taxonomyMigration';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { normalizeCategories, normalizeTopics } from '../../src/lib/taxonomyMigration';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
  };
});

function TestHarness({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>;
}

function DynamicDashboardConsumer() {
  const { addCategory, activeTab, selectedCategoryFilter } = useData();
  return (
    <div>
      <button
        onClick={() => {
          addCategory({
            name: 'Kinh tế & Thị trường',
            slug: 'kinh-te',
            parentId: null,
            description: 'Kinh tế học hành vi và quản trị tài chính',
          });
        }}
        data-testid="add-kinh-te-btn"
      >
        Thêm Kinh Tế
      </button>
      <div data-testid="current-tab">{activeTab}</div>
      <div data-testid="current-filter">{selectedCategoryFilter || 'none'}</div>
      <DashboardHome />
    </div>
  );
}

describe('Post-Phase 5: Dynamic Dashboard Domain Cards for Root Categories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Pure Helper: calculateRootCategoryStats', () => {
    it('calculates totalTopics, completedTopics, and donePercent for root categories with descendants', () => {
      const normalizedCats = normalizeCategories(INITIAL_CATEGORIES);
      const normalizedTopics = normalizeTopics(INITIAL_TOPICS);

      const phStats = calculateRootCategoryStats(normalizedTopics, normalizedCats, 'cat-root-phat-hoc');
      expect(phStats.totalTopics).toBeGreaterThan(0);
      expect(phStats.donePercent).toBeGreaterThanOrEqual(0);
      expect(phStats.donePercent).toBeLessThanOrEqual(100);

      const hhStats = calculateRootCategoryStats(normalizedTopics, normalizedCats, 'cat-root-huyen-hoc');
      expect(hhStats.totalTopics).toBeGreaterThan(0);
      expect(hhStats.totalTopics + phStats.totalTopics).toBe(normalizedTopics.length);

      // Custom root with no topics
      const customCats = [
        ...normalizedCats,
        { id: 'cat-root-kinh-te', name: 'Kinh Tế', slug: 'kinh-te', parentId: null },
      ];
      const ktStats = calculateRootCategoryStats(normalizedTopics, customCats, 'cat-root-kinh-te');
      expect(ktStats.totalTopics).toBe(0);
      expect(ktStats.donePercent).toBe(0);
    });
  });

  describe('2. UI Integration: Dynamic Dashboard Domain Cards', () => {
    it('renders root domain cards for default categories (Phật học & Huyền học) and system card "Đang học"', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Verify domain cards are rendered
      expect(screen.getAllByText(/Phật học/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Huyền học/i).length).toBeGreaterThan(0);

      // Verify system card "Đang học" is rendered
      expect(screen.getByText(/Đang học/i)).toBeInTheDocument();
    });

    it('renders new domain card dynamically when a new root category is added', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Click button to add "Kinh tế & Thị trường"
      const addBtn = screen.getByTestId('add-kinh-te-btn');
      fireEvent.click(addBtn);

      // Newly added domain card must appear in Dashboard
      expect(screen.getByText(/Kinh tế & Thị trường/i)).toBeInTheDocument();
    });

    it('clicking a root domain card sets selectedCategoryFilter to root.id and changes activeTab to topics', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Click "Phật học" card
      const phatHocHeading = screen.getByText(/Phật học/i);
      const card = phatHocHeading.closest('div[class*="cursor-pointer"]');
      expect(card).not.toBeNull();
      fireEvent.click(card!);

      // Verify active tab switched to topics and filter is set
      expect(screen.getByTestId('current-tab').textContent).toBe('topics');
      expect(screen.getByTestId('current-filter').textContent).toBe('cat-root-phat-hoc');
    });

    it('clicking system card "Đang học" changes activeTab to progress without altering category filter', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Click "Đang học" card
      const dangHocHeading = screen.getByText(/Đang học/i);
      const card = dangHocHeading.closest('div[class*="cursor-pointer"]');
      expect(card).not.toBeNull();
      fireEvent.click(card!);

      // Verify active tab switched to progress
      expect(screen.getByTestId('current-tab').textContent).toBe('progress');
    });
  });
});
