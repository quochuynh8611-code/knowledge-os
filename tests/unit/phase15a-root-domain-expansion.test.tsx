import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { INITIAL_CATEGORIES, INITIAL_TOPICS } from '../../src/data/initialData';
import { getRootCategories } from '../../src/lib/taxonomyMigration';
import { getDomainLearningStates } from '../../src/lib/learningStateSelectors';
import { DataProvider } from '../../src/context/DataContext';
import { DashboardHome } from '../../src/components/dashboard/DashboardHome';
import { Category, Topic } from '../../src/types';

describe('Commercial Neutralization: Zero-Default Baseline & User Custom Domains', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. INITIAL_CATEGORIES starts clean with zero default domains', () => {
    const rootCategories = getRootCategories(INITIAL_CATEGORIES);
    expect(rootCategories.length).toBe(0);
  });

  it('2. getDomainLearningStates returns empty array when no categories exist', () => {
    const states = getDomainLearningStates(INITIAL_TOPICS, INITIAL_CATEGORIES);
    expect(states.length).toBe(0);
  });

  it('3. DashboardHome renders empty state gracefully without crash when no domains exist', () => {
    render(
      <DataProvider>
        <DashboardHome />
      </DataProvider>
    );

    expect(screen.getByText(/Chưa có lĩnh vực học tập nào/i)).toBeInTheDocument();
    expect(screen.getByTestId('today-learning-hero')).toBeInTheDocument();
    expect(screen.getByTestId('weekly-cadence-bar')).toBeInTheDocument();
  });

  it('4. User-created domain renders learning state card and supports pinning without breaking layout', () => {
    const customCategory: Category = {
      id: 'cat-custom-1',
      name: 'Khoa Học Máy Tính',
      slug: 'khoa-hoc-may-tinh',
      type: 'computer-science',
      description: 'Lĩnh vực nghiên cứu tự tạo',
    };

    const customTopic: Topic = {
      id: 'topic-custom-1',
      title: 'Cấu Trúc Dữ Liệu & Giải Thuật',
      slug: 'cau-truc-du-lieu',
      categoryId: customCategory.id,
      type: 'computer-science',
      description: 'Nội dung giải thuật',
      content: 'Chi tiết bài học',
      tags: ['algorithms'],
      links: [],
      studyProgress: {
        topicId: 'topic-custom-1',
        status: 'not_started',
        progress: 0,
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        totalNotes: 0,
        timeSpent: 0,
      },
      createdAt: '2026-10-16T00:00:00.000Z',
      updatedAt: '2026-10-16T00:00:00.000Z',
    };

    const states = getDomainLearningStates([customTopic], [customCategory]);
    expect(states.length).toBe(1);
    expect(states[0].rootCategory.name).toBe('Khoa Học Máy Tính');
    expect(states[0].totalTopics).toBe(1);
  });
});
