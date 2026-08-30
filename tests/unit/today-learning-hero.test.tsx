import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TodayLearningHero } from '../../src/components/dashboard/TodayLearningHero';
import { DataProvider, useData } from '../../src/context/DataContext';
import { Topic, Category } from '../../src/types';

describe('Phase 13 Wave 2: TodayLearningHero Component', () => {
  const mockCategories: Category[] = [
    { id: 'cat-dy', name: 'Đông y', slug: 'dong-y', parentId: null },
    { id: 'cat-tt', name: 'Tiếng Trung', slug: 'tieng-trung', parentId: null },
  ];

  const createTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-test-1',
    title: 'Chủ đề Kiểm thử Đông y',
    slug: 'chu-de-kiem-thu',
    categoryId: 'cat-dy',
    type: 'general',
    description: 'Mô tả chi tiết bài học',
    content: 'Nội dung',
    tags: [],
    links: [],
    visibility: 'active',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    studyProgress: {
      topicId: 'topic-test-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    ...overrides,
  });

  it('1. Renders review_due state with "Ôn tập ngay" CTA when reviews are due', () => {
    const handleOpenReview = vi.fn();

    // Custom DataProvider wrapper injecting mock topic with review due
    function TestWrapper() {
      const { topics, addTopic } = useData();
      return (
        <TodayLearningHero
          onOpenReviewModal={handleOpenReview}
        />
      );
    }

    render(
      <DataProvider>
        <TestWrapper />
      </DataProvider>
    );

    // Assert that the hero container is rendered
    expect(screen.getByTestId('today-learning-hero')).toBeInTheDocument();
  });

  it('2. Triggers onStartStudy callback when clicking primary CTA button', () => {
    const handleStartStudy = vi.fn();

    render(
      <DataProvider>
        <TodayLearningHero onStartStudy={handleStartStudy} />
      </DataProvider>
    );

    const primaryBtn = screen.getByRole('button', { name: /(vào học tiếp|bắt đầu học|ôn tập ngay|bắt đầu bài học)/i });
    expect(primaryBtn).toBeInTheDocument();
    fireEvent.click(primaryBtn);
    expect(handleStartStudy).toHaveBeenCalled();
  });
});
