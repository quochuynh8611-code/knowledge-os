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

describe('Dynamic Dashboard Domain Cards for Root Categories (Phase 13 Integration)', () => {
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
    it('renders root domain cards for default categories (Phật học & Huyền học)', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Verify domain cards are rendered
      expect(screen.getAllByText(/Phật học/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Huyền học/i).length).toBeGreaterThan(0);
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

    it('clicking a root domain card title sets selectedCategoryFilter to root.id and changes activeTab to topics', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Click "Phật học" card
      const phatHocCard = screen.getByTestId('learning-state-card-cat-root-phat-hoc');
      fireEvent.click(phatHocCard);

      // Verify active tab switched to topics and filter is set
      expect(screen.getByTestId('current-tab').textContent).toBe('topics');
      expect(screen.getByTestId('current-filter').textContent).toBe('cat-root-phat-hoc');
    });

    it('clicking "Tất cả tiến độ" in Resume Study Queue changes activeTab to progress', () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      const progressBtn = screen.getByRole('button', { name: /Tất cả tiến độ/i });
      fireEvent.click(progressBtn);

      // Verify active tab switched to progress
      expect(screen.getByTestId('current-tab').textContent).toBe('progress');
    });
  });
});
