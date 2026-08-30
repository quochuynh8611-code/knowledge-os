import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LearningStateCard } from '../../src/components/dashboard/LearningStateCard';
import { DomainLearningState } from '../../src/lib/learningStateSelectors';

describe('Phase 13 Wave 3: LearningStateCard Component', () => {
  const mockState: DomainLearningState = {
    rootCategory: {
      id: 'cat-dy',
      name: 'Đông y',
      slug: 'dong-y',
      parentId: null,
      color: '#059669',
    },
    status: 'active',
    statusLabel: 'Đang học',
    totalTopics: 10,
    completedTopics: 4,
    inProgressTopics: 2,
    donePercent: 40,
    totalTimeSpentMinutes: 180,
    lastStudiedAt: '2026-08-30T10:00:00.000Z',
    nextStepTopic: {
      id: 'topic-next-1',
      title: 'Biện chứng Bát Cương',
      slug: 'bien-chung-bat-cuong',
      categoryId: 'cat-dy',
      type: 'general',
      description: 'Khảo sát 8 cương lĩnh chẩn đoán',
      content: '',
      tags: [],
      links: [],
      visibility: 'active',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-30T10:00:00.000Z',
      studyProgress: {
        topicId: 'topic-next-1',
        status: 'in_progress',
        progress: 45,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        totalNotes: 2,
        timeSpent: 45,
      },
    },
  };

  it('1. Renders domain name, status badge, and true learning progress', () => {
    const handleSelectDomain = vi.fn();

    render(
      <LearningStateCard
        state={mockState}
        onSelectDomain={handleSelectDomain}
      />
    );

    // Domain name
    expect(screen.getByText('Đông y')).toBeInTheDocument();
    // Status label
    expect(screen.getByText('Đang học')).toBeInTheDocument();
    // Progress
    expect(screen.getByText(/4\/10 bài \(40%\)/i)).toBeInTheDocument();
    // Next step topic title
    expect(screen.getByText('Biện chứng Bát Cương')).toBeInTheDocument();
  });

  it('2. Triggers onStartStudyTopic when clicking "Học bài này" CTA button', () => {
    const handleStartStudy = vi.fn();
    const handleSelectDomain = vi.fn();

    render(
      <LearningStateCard
        state={mockState}
        onSelectDomain={handleSelectDomain}
        onStartStudyTopic={handleStartStudy}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Học bài này/i });
    expect(startBtn).toBeInTheDocument();
    fireEvent.click(startBtn);

    expect(handleStartStudy).toHaveBeenCalledWith('topic-next-1');
  });

  it('3. Triggers onSelectDomain when clicking root category header', () => {
    const handleSelectDomain = vi.fn();

    render(
      <LearningStateCard
        state={mockState}
        onSelectDomain={handleSelectDomain}
      />
    );

    const domainTitle = screen.getByText('Đông y');
    fireEvent.click(domainTitle);

    expect(handleSelectDomain).toHaveBeenCalledWith('cat-dy');
  });
});
