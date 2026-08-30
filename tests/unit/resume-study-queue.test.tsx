import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumeStudyQueue } from '../../src/components/dashboard/ResumeStudyQueue';
import { Topic } from '../../src/types';

describe('Phase 13 Wave 4: ResumeStudyQueue Component', () => {
  const mockTopics: Topic[] = [
    {
      id: 'topic-1',
      title: 'Dược lý Cổ truyền',
      slug: 'duoc-ly-co-truyen',
      categoryId: 'cat-dy',
      categoryName: 'Đông y',
      type: 'general',
      description: 'Khảo sát dược tính và tính vị quy kinh',
      content: '',
      tags: [],
      links: [],
      visibility: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z',
      studyProgress: {
        topicId: 'topic-1',
        status: 'in_progress',
        progress: 60,
        interval: 2,
        easeFactor: 2.5,
        repetitions: 2,
        totalNotes: 3,
        timeSpent: 60,
        lastStudied: '2026-08-30T10:00:00.000Z',
      },
    },
    {
      id: 'topic-2',
      title: 'Ngữ pháp HSK 5',
      slug: 'ngu-phap-hsk-5',
      categoryId: 'cat-tt',
      categoryName: 'Tiếng Trung',
      type: 'general',
      description: 'Cấu trúc câu phức',
      content: '',
      tags: [],
      links: [],
      visibility: 'active',
      createdAt: '2026-08-05T00:00:00.000Z',
      updatedAt: '2026-08-29T10:00:00.000Z',
      studyProgress: {
        topicId: 'topic-2',
        status: 'in_progress',
        progress: 30,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 1,
        timeSpent: 30,
        lastStudied: '2026-08-29T10:00:00.000Z',
      },
    },
  ];

  it('1. Renders in-progress topics with category tags and progress percentage', () => {
    const handleStartStudy = vi.fn();
    const handleOpenTopicDetail = vi.fn();

    render(
      <ResumeStudyQueue
        topics={mockTopics}
        onStartStudy={handleStartStudy}
        onOpenTopicDetail={handleOpenTopicDetail}
      />
    );

    expect(screen.getByText('Tiếp tục bài học dở dang')).toBeInTheDocument();
    expect(screen.getByText('Dược lý Cổ truyền')).toBeInTheDocument();
    expect(screen.getByText('Ngữ pháp HSK 5')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('2. Triggers onStartStudy with topicId when clicking "Học tiếp" button', () => {
    const handleStartStudy = vi.fn();
    const handleOpenTopicDetail = vi.fn();

    render(
      <ResumeStudyQueue
        topics={mockTopics}
        onStartStudy={handleStartStudy}
        onOpenTopicDetail={handleOpenTopicDetail}
      />
    );

    const studyButtons = screen.getAllByRole('button', { name: /Học tiếp/i });
    expect(studyButtons.length).toBe(2);
    fireEvent.click(studyButtons[0]);

    expect(handleStartStudy).toHaveBeenCalledWith('topic-1');
  });

  it('3. Renders friendly empty state when there are no in-progress topics', () => {
    render(
      <ResumeStudyQueue
        topics={[]}
        onStartStudy={vi.fn()}
        onOpenTopicDetail={vi.fn()}
      />
    );

    expect(screen.getByText('Không có bài học nào đang dở dang')).toBeInTheDocument();
  });
});
