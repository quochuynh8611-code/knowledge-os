import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopicFormModal } from '../../src/components/modals/TopicFormModal';
import { StudyTimerModal } from '../../src/components/modals/StudyTimerModal';
import { NoteFormModal } from '../../src/components/modals/NoteFormModal';
import { SpacedReviewModal } from '../../src/components/modals/SpacedReviewModal';
import { ExportImportModal } from '../../src/components/modals/ExportImportModal';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import { SearchFilters } from '../../src/components/search/SearchFilters';
import { KnowledgeGraph } from '../../src/components/graph/KnowledgeGraph';
import { Category, Topic, Note, Resource, Tag } from '../../src/types';

const mockCategories: Category[] = [
  {
    id: 'cat-root-kinh-te',
    name: 'Kinh Tế Học',
    slug: 'kinh-te',
    type: 'kinh-te',
    color: '#059669',
    parentId: null,
    description: 'Lĩnh vực kinh tế',
  },
  {
    id: 'cat-root-triet-hoc',
    name: 'Triết Học',
    slug: 'triet-hoc',
    type: 'triet-hoc',
    color: '#7C3AED',
    parentId: null,
    description: 'Lĩnh vực triết học',
  },
  {
    id: 'cat-vi-mo',
    name: 'Kinh Tế Vĩ Mô',
    slug: 'kinh-te-vi-mo',
    type: 'kinh-te',
    parentId: 'cat-root-kinh-te',
  },
];

const mockTopics: Topic[] = [
  {
    id: 'topic-kinh-te-1',
    title: 'Lạm Phát và Lãi Suất',
    slug: 'lam-phat-va-lai-suat',
    categoryId: 'cat-vi-mo',
    categoryName: 'Kinh Tế Vĩ Mô',
    type: 'kinh-te',
    description: 'Nghiên cứu mối quan hệ lạm phát và lãi suất',
    content: 'Nội dung kinh tế học...',
    tags: ['kinh-te'],
    links: [],
    studyProgress: {
      topicId: 'topic-kinh-te-1',
      status: 'in_progress',
      progress: 40,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 45,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'topic-triet-hoc-1',
    title: 'Nhận Thức Luận Căn Bản',
    slug: 'nhan-thuc-luan-can-ban',
    categoryId: 'cat-root-triet-hoc',
    categoryName: 'Triết Học',
    type: 'triet-hoc',
    description: 'Nhận thức luận triết học',
    content: 'Nội dung triết học...',
    tags: ['triet-hoc'],
    links: [],
    studyProgress: {
      topicId: 'topic-triet-hoc-1',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: mockCategories,
    topics: mockTopics,
    notes: [] as Note[],
    resources: [] as Resource[],
    tags: [] as Tag[],
    selectedTopicId: 'topic-kinh-te-1',
    setSelectedTopicId: vi.fn(),
    addTopic: vi.fn(),
    updateTopic: vi.fn(),
    updateTopicProgress: vi.fn(),
    deleteTopic: vi.fn(),
    addCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    addNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    addResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
    addKnowledgeLink: vi.fn(),
    removeKnowledgeLink: vi.fn(),
    startStudyTimer: vi.fn(),
    pauseStudyTimer: vi.fn(),
    stopAndSaveStudyTimer: vi.fn(),
    activeTimerTopicId: null,
    timerSeconds: 0,
    isTimerRunning: false,
    timerMode: 'stopwatch',
    pomodoroTimeRemaining: 1500,
    reviewQueue: mockTopics,
    reviewTopicSM2: vi.fn(),
    exportAllDataJSON: vi.fn(() => JSON.stringify({ topics: mockTopics })),
    importAllDataJSON: vi.fn(),
    resetToDefaultData: vi.fn(),
    reloadAllData: vi.fn(),
  }),
}));

describe('Increment B: Dynamic Domain UI Generalization', () => {
  it('1. TopicFormModal: sets default category and derived type from custom root category', () => {
    render(<TopicFormModal isOpen={true} onClose={vi.fn()} />);

    // Form modal renders category select containing custom root categories
    expect(screen.getByText('Tạo Chủ Đề Mới')).toBeInTheDocument();
    expect(screen.getByText('[Gốc] Kinh Tế Học')).toBeInTheDocument();
  });

  it('2. StudyTimerModal: displays dynamic domain/category name instead of hardcoded binary labels', () => {
    render(<StudyTimerModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-triet-hoc-1" />);

    // Option should display [Triết Học] or categoryName instead of [Phật Học] or [Huyền Học]
    const option = screen.getByRole('option', { name: /Nhận Thức Luận Căn Bản/ });
    expect(option).toBeInTheDocument();
    expect(option.textContent).toContain('Triết Học');
    expect(option.textContent).not.toContain('Huyền Học');
    expect(option.textContent).not.toContain('Phật Học');
  });

  it('3. NoteFormModal: displays dynamic category label in topic selector', () => {
    render(<NoteFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-kinh-te-1" />);

    const option = screen.getByText(/Lạm Phát và Lãi Suất/);
    expect(option).toBeInTheDocument();
    expect(option.textContent).toContain('Kinh Tế');
    expect(option.textContent).not.toContain('Huyền Học');
    expect(option.textContent).not.toContain('Phật Học');
  });

  it('4. SpacedReviewModal: displays dynamic domain badge for custom domain', () => {
    render(<SpacedReviewModal isOpen={true} onClose={vi.fn()} initialTopic={mockTopics[0]} />);

    // The badge should display Kinh Tế Học or Kinh Tế Vĩ Mô
    expect(screen.getByText(/Kinh Tế/)).toBeInTheDocument();
    expect(screen.queryByText(/Huyền Học/)).not.toBeInTheDocument();
  });

  it('5. ExportImportModal: export action triggers with knowledge-os naming scheme', async () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const mockRepo: any = {
      getBackupSnapshot: vi.fn().mockResolvedValue({
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        checksum: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        counts: { categories: 3, topics: 2, notes: 0, resources: 0, tags: 0 },
        data: { categories: mockCategories, topics: mockTopics, notes: [], resources: [], tags: [] },
      }),
      getDbHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        details: { database: 'connected', latencyMs: 5 },
      }),
    };

    render(<ExportImportModal isOpen={true} onClose={vi.fn()} repository={mockRepo} defaultTab="export" />);

    const exportBtn = screen.getByRole('button', { name: /Tải Xuống Bản Sao Lưu/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);

    await waitFor(() => {
      const anchor = createElementSpy.mock.results.find((r) => r.value?.tagName === 'A')?.value as HTMLAnchorElement | undefined;
      expect(anchor).toBeDefined();
      if (anchor) {
        expect(anchor.download).not.toContain('phat-hoc-huyen-hoc');
        expect(anchor.download).toContain('knowledge-os');
      }
    });

    createElementSpy.mockRestore();
  });

  it('6. TopicDetail: renders dynamic domain in breadcrumbs and header badge', () => {
    render(<TopicDetail />);

    // Domain badge and breadcrumb should show "Kinh Tế Học" instead of "Huyền Học"
    expect(screen.getAllByText(/Kinh Tế/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Huyền Học • Kinh Tế Vĩ Mô')).not.toBeInTheDocument();
  });

  it('7. SearchFilters: renders dynamic domain filter buttons for all root categories', () => {
    render(
      <SearchFilters
        filters={{ domain: 'all', categoryId: null, tag: null, status: 'all' }}
        onFilterChange={vi.fn()}
        categories={mockCategories}
        tags={[]}
      />
    );

    // Filter buttons should include Kinh Tế Học and Triết Học
    expect(screen.getByRole('button', { name: /Kinh Tế Học/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Triết Học/i })).toBeInTheDocument();
  });

  it('8. KnowledgeGraph: renders dynamic domain legend pills', () => {
    render(<KnowledgeGraph />);

    // Legend should contain dynamic root category names
    expect(screen.getAllByText('Kinh Tế Học').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Triết Học').length).toBeGreaterThan(0);
  });
});
