import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataProvider, useData } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { calculateRootCategoryStats } from '../../src/lib/taxonomyMigration';
import { STORAGE_ROOT_KEY, STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION } from '../../src/lib/storage';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
  };
});

const sampleRootCategory = {
  id: 'cat-test-root',
  name: 'Nghiên Cứu Mẫu',
  slug: 'nghien-cuu-mau',
  parentId: null,
};

const sampleChildCategory = {
  id: 'cat-test-child',
  name: 'Chuyên Đề Mẫu',
  slug: 'chuyen-de-mau',
  parentId: 'cat-test-root',
};

const sampleTopic: import('../../src/types').Topic = {
  id: 'top-test-1',
  title: 'Chủ đề mẫu',
  slug: 'chu-de-mau',
  categoryId: 'cat-test-child',
  type: 'general',
  description: 'Mô tả chủ đề mẫu',
  content: 'Nội dung chủ đề mẫu',
  tags: ['test'],
  links: [],
  studyProgress: {
    topicId: 'top-test-1',
    status: 'completed' as const,
    progress: 100,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    totalNotes: 1,
    timeSpent: 60,
  },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

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
    localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    const categoriesFixture = [sampleRootCategory, sampleChildCategory];
    const topicsFixture = [sampleTopic];
    localStorage.setItem(`${STORAGE_ROOT_KEY}_categories`, JSON.stringify(categoriesFixture));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_topics`, JSON.stringify(topicsFixture));
    localStorage.setItem(`${STORAGE_ROOT_KEY}_notes`, JSON.stringify([]));
    localStorage.setItem(
      STORAGE_ROOT_KEY,
      JSON.stringify({
        categories: categoriesFixture,
        topics: topicsFixture,
        notes: [],
        resources: [],
        tags: [],
      })
    );
  });

  describe('1. Pure Helper: calculateRootCategoryStats', () => {
    it('calculates totalTopics, completedTopics, and donePercent for root categories with descendants', () => {
      const stats = calculateRootCategoryStats(
        [sampleTopic],
        [sampleRootCategory, sampleChildCategory],
        sampleRootCategory.id
      );
      expect(stats.totalTopics).toBe(1);
      expect(stats.completedTopics).toBe(1);
      expect(stats.donePercent).toBe(100);

      // Custom root with no topics
      const customCats = [
        sampleRootCategory,
        sampleChildCategory,
        { id: 'cat-root-kinh-te', name: 'Kinh Tế', slug: 'kinh-te', parentId: null },
      ];
      const ktStats = calculateRootCategoryStats([sampleTopic], customCats, 'cat-root-kinh-te');
      expect(ktStats.totalTopics).toBe(0);
      expect(ktStats.donePercent).toBe(0);
    });
  });

  describe('2. UI Integration: Dynamic Dashboard Domain Cards', () => {
    it('renders root domain cards for default categories (Nghiên Cứu Mẫu)', async () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Verify domain card is rendered after async hydration
      expect((await screen.findAllByText(/Nghiên Cứu Mẫu/i)).length).toBeGreaterThan(0);
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

    it('clicking a root domain card title sets selectedCategoryFilter to root.id and changes activeTab to topics', async () => {
      render(
        <TestHarness>
          <DynamicDashboardConsumer />
        </TestHarness>
      );

      // Click "Nghiên Cứu Mẫu" card
      const rootCard = await screen.findByTestId(`learning-state-card-${sampleRootCategory.id}`);
      fireEvent.click(rootCard);

      // Verify active tab switched to topics and filter is set
      expect(screen.getByTestId('current-tab').textContent).toBe('topics');
      expect(screen.getByTestId('current-filter').textContent).toBe(sampleRootCategory.id);
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
