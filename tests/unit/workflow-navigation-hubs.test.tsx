import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { DataContext } from '../../src/context/DataContext';
import { parseLocationHash, buildLocationHash } from '../../src/lib/urlRouting';

describe('Phase 1: Workflow-First Shell & Navigation Hubs', () => {
  const mockSetActiveTab = vi.fn();
  const mockSetSelectedTopicId = vi.fn();
  const mockSetSelectedCategoryFilter = vi.fn();
  const mockAddCategory = vi.fn();

  const baseDataContextValue: any = {
    activeTab: 'dashboard',
    setActiveTab: mockSetActiveTab,
    selectedTopicId: null,
    setSelectedTopicId: mockSetSelectedTopicId,
    selectedCategoryFilter: null,
    setSelectedCategoryFilter: mockSetSelectedCategoryFilter,
    categories: [
      { id: 'cat-phat-hoc', name: 'Phật Học', slug: 'phat-hoc', parentId: null },
      { id: 'cat-huyen-hoc', name: 'Huyền Học', slug: 'huyen-hoc', parentId: null },
    ],
    topics: [
      { id: 'top-1', title: 'Vi Diệu Pháp', categoryId: 'cat-phat-hoc', studyProgress: { progress: 100, status: 'completed' } },
      { id: 'top-2', title: 'Bát Tự', categoryId: 'cat-huyen-hoc', studyProgress: { progress: 40, status: 'in_progress' } },
    ],
    stats: {
      totalTopics: 2,
      totalNotesCount: 5,
      totalResourcesCount: 3,
      totalTimeSpentMinutes: 120,
      completedTopicsCount: 1,
    },
    reviewQueue: [],
    focusDomainId: null,
    addCategory: mockAddCategory,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders 4 Workflow Hub groups on Sidebar (Research, Study, Garden, Insights)', () => {
    render(
      <DataContext.Provider value={baseDataContextValue}>
        <Sidebar />
      </DataContext.Provider>
    );

    // 4 Workflow Hub header labels
    expect(screen.getByText('Khảo Cứu')).toBeInTheDocument();
    expect(screen.getByText('Học Tập & Ôn Tập')).toBeInTheDocument();
    expect(screen.getByText('Vườn Tri Thức')).toBeInTheDocument();
    expect(screen.getByText('Phân Tích & Công Cụ')).toBeInTheDocument();
  });

  it('2. Clicking nav item triggers setActiveTab with canonical activeTab id', () => {
    render(
      <DataContext.Provider value={baseDataContextValue}>
        <Sidebar />
      </DataContext.Provider>
    );

    const flashcardsBtn = screen.getByRole('button', { name: /thẻ nhớ|flashcards/i });
    fireEvent.click(flashcardsBtn);

    expect(mockSetActiveTab).toHaveBeenCalledWith('flashcards');
  });

  it('3. Backward compatibility: parseLocationHash resolves legacy and new tab routes', () => {
    expect(parseLocationHash('#/dashboard').activeTab).toBe('dashboard');
    expect(parseLocationHash('#/topics').activeTab).toBe('topics');
    expect(parseLocationHash('#/resources').activeTab).toBe('resources');
    expect(parseLocationHash('#/library').activeTab).toBe('library');
    expect(parseLocationHash('#/flashcards').activeTab).toBe('flashcards');
    expect(parseLocationHash('#/notes').activeTab).toBe('notes');
    expect(parseLocationHash('#/graph').activeTab).toBe('graph');
    expect(parseLocationHash('#/search').activeTab).toBe('search');
    expect(parseLocationHash('#/ai_studio').activeTab).toBe('ai_studio');
  });

  it('4. Backward compatibility: buildLocationHash preserves deep-link subviews', () => {
    const hash = buildLocationHash({
      activeTab: 'flashcards',
      subView: 'launch',
    });
    expect(hash).toBe('#/flashcards/launch');
  });
});
