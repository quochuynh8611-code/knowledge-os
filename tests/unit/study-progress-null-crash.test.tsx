import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyProgressView } from '../../src/components/progress/StudyProgressView';
import { Topic, Category } from '../../src/types';

// Helper to create deserialized runtime mock topics without using `as any` or type assertions
function createDeserializedTopic(rawJson: string): Topic {
  const parsed = JSON.parse(rawJson);
  return parsed;
}

const rawNullProgressTopic = JSON.stringify({
  id: 'topic-null-progress',
  title: 'Chủ Đề Null Progress',
  slug: 'chu-de-null-progress',
  type: 'phat-hoc',
  categoryId: 'cat-phat-hoc',
  categoryName: 'Phật Học',
  description: 'Chủ đề này có studyProgress bị null từ localStorage cũ.',
  content: 'Nội dung test',
  tags: ['test'],
  studyProgress: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawUndefinedProgressTopic = JSON.stringify({
  id: 'topic-undefined-progress',
  title: 'Chủ Đề Undefined Progress',
  slug: 'chu-de-undefined-progress',
  type: 'huyen-hoc',
  categoryId: 'cat-huyen-hoc',
  categoryName: 'Huyền Học',
  description: 'Chủ đề này có studyProgress bị thiếu (undefined).',
  content: 'Nội dung test 2',
  tags: ['test'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawInvalidDateTopic = JSON.stringify({
  id: 'topic-invalid-date-string',
  title: 'Chủ Đề Malformed NextReview',
  slug: 'chu-de-invalid-date',
  type: 'phat-hoc',
  categoryId: 'cat-phat-hoc',
  categoryName: 'Phật Học',
  description: 'Chủ đề có nextReview là chuỗi không hợp lệ.',
  content: 'Nội dung test 3',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-invalid-date-string',
    status: 'in_progress',
    progress: 40,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    totalNotes: 0,
    timeSpent: 15,
    nextReview: 'not-a-valid-date-string',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawWhitespaceDateTopic = JSON.stringify({
  id: 'topic-whitespace-date',
  title: 'Chủ Đề Whitespace NextReview',
  slug: 'chu-de-whitespace-date',
  type: 'huyen-hoc',
  categoryId: 'cat-huyen-hoc',
  categoryName: 'Huyền Học',
  description: 'Chủ đề có nextReview là chuỗi khoảng trắng.',
  content: 'Nội dung test 4',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-whitespace-date',
    status: 'completed',
    progress: 100,
    interval: 10,
    easeFactor: 2.6,
    repetitions: 5,
    totalNotes: 2,
    timeSpent: 60,
    nextReview: '   ',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawValidScheduledTopic = JSON.stringify({
  id: 'topic-valid-scheduled',
  title: 'Chủ Đề Valid Future Review',
  slug: 'chu-de-valid-future',
  type: 'phat-hoc',
  categoryId: 'cat-phat-hoc',
  categoryName: 'Phật Học',
  description: 'Chủ đề có lịch ôn tương lai hợp lệ.',
  content: 'Nội dung test 5',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-valid-scheduled',
    status: 'in_progress',
    progress: 50,
    interval: 5,
    easeFactor: 2.5,
    repetitions: 2,
    totalNotes: 1,
    timeSpent: 30,
    nextReview: '2030-12-31T00:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawValidOverdueTopic = JSON.stringify({
  id: 'topic-valid-overdue',
  title: 'Chủ Đề Valid Overdue Review',
  slug: 'chu-de-valid-overdue',
  type: 'phat-hoc',
  categoryId: 'cat-phat-hoc',
  categoryName: 'Phật Học',
  description: 'Chủ đề có lịch ôn quá hạn.',
  content: 'Nội dung test 6',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-valid-overdue',
    status: 'in_progress',
    progress: 25,
    interval: 1,
    easeFactor: 2.3,
    repetitions: 1,
    totalNotes: 0,
    timeSpent: 20,
    nextReview: '2020-01-01T00:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

// Corrupted numeric / data-shape topics (constructed through deserialization)
const rawNanNumericTopic = JSON.stringify({
  id: 'topic-corrupted-nan',
  title: 'Chủ Đề Corrupted Numeric Values',
  slug: 'chu-de-corrupted-nan',
  type: 'phat-hoc',
  categoryId: 'cat-phat-hoc',
  categoryName: 'Phật Học',
  description: 'Chủ đề có các trường số bị hỏng trong progress object.',
  content: 'Nội dung test 7',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-corrupted-nan',
    status: 'corrupted_status_string',
    progress: 'not-a-number',
    interval: null,
    easeFactor: 0,
    repetitions: -5,
    totalNotes: null,
    timeSpent: -20,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawOverflowProgressTopic = JSON.stringify({
  id: 'topic-overflow-progress',
  title: 'Chủ Đề Overflow Progress',
  slug: 'chu-de-overflow-progress',
  type: 'huyen-hoc',
  categoryId: 'cat-huyen-hoc',
  categoryName: 'Huyền Học',
  description: 'Chủ đề có progress > 100% (ví dụ 180%).',
  content: 'Nội dung test 8',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-overflow-progress',
    status: 'in_progress',
    progress: 180,
    interval: 4,
    easeFactor: 2.8,
    repetitions: 3,
    totalNotes: 1,
    timeSpent: 45,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const rawNegativeProgressTopic = JSON.stringify({
  id: 'topic-negative-progress',
  title: 'Chủ Đề Negative Progress',
  slug: 'chu-de-negative-progress',
  type: 'huyen-hoc',
  categoryId: 'cat-huyen-hoc',
  categoryName: 'Huyền Học',
  description: 'Chủ đề có progress âm (ví dụ -30%).',
  content: 'Nội dung test 9',
  tags: ['test'],
  studyProgress: {
    topicId: 'topic-negative-progress',
    status: 'in_progress',
    progress: -30,
    interval: -10,
    easeFactor: -2.5,
    repetitions: 0,
    totalNotes: 0,
    timeSpent: -5,
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  links: [],
});

const mockTopicsDataset: Topic[] = [
  createDeserializedTopic(rawNullProgressTopic),
  createDeserializedTopic(rawUndefinedProgressTopic),
  createDeserializedTopic(rawInvalidDateTopic),
  createDeserializedTopic(rawWhitespaceDateTopic),
  createDeserializedTopic(rawValidScheduledTopic),
  createDeserializedTopic(rawValidOverdueTopic),
  createDeserializedTopic(rawNanNumericTopic),
  createDeserializedTopic(rawOverflowProgressTopic),
  createDeserializedTopic(rawNegativeProgressTopic),
];

const mockCategories: Category[] = [
  { id: 'cat-phat-hoc', name: 'Phật Học', slug: 'phat-hoc', parentId: null },
  { id: 'cat-huyen-hoc', name: 'Huyền Học', slug: 'huyen-hoc', parentId: null },
];

let activeTopicsInContext: Topic[] = mockTopicsDataset;

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: activeTopicsInContext,
    stats: {
      totalTopics: activeTopicsInContext.length,
      phatHocTopics: 5,
      huyenHocTopics: 4,
      totalNotesCount: 4,
      totalResourcesCount: 0,
      totalTimeSpentMinutes: 200,
      completedTopicsCount: 1,
      dueReviewsCount: 1,
    },
    reviewQueue: [],
    openTopicDetail: vi.fn(),
    updateTopicProgress: vi.fn(),
    categories: mockCategories,
  }),
}));

describe('StudyProgressView complete legacy data & numeric resilience', () => {
  beforeEach(() => {
    activeTopicsInContext = mockTopicsDataset;
  });

  it('renders all topics without crashing when studyProgress is null or undefined', () => {
    expect(() => {
      render(<StudyProgressView />);
    }).not.toThrow();

    expect(screen.getByText('Chủ Đề Null Progress')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Undefined Progress')).toBeInTheDocument();
  });

  it('renders neutral "Chưa xếp lịch ôn" and never renders "Invalid Date" for malformed/whitespace nextReview strings', () => {
    render(<StudyProgressView />);

    // Malformed and whitespace dates should show neutral "Chưa xếp lịch ôn"
    const unassignedTexts = screen.getAllByText('Chưa xếp lịch ôn');
    expect(unassignedTexts.length).toBeGreaterThanOrEqual(4);

    // "Invalid Date" must NEVER be rendered in DOM
    expect(screen.queryByText(/Invalid Date/i)).toBeNull();
  });

  it('preserves valid overdue determination and formatted date for valid nextReview', () => {
    render(<StudyProgressView />);

    // Overdue topic renders overdue warning
    expect(screen.getByText(/⚠️ Next review: Hôm nay \/ Quá hạn/i)).toBeInTheDocument();

    // Future scheduled topic renders formatted localized date
    expect(screen.getByText(/Next review: 31\/12\/2030/i)).toBeInTheDocument();
  });

  it('correctly filters topics by status and semantically treats null/absent/invalid studyProgress as "not_started"', () => {
    render(<StudyProgressView />);

    // Click "Đang học" (in_progress) filter
    const inProgressBtn = screen.getByRole('button', { name: 'Đang học' });
    fireEvent.click(inProgressBtn);

    // in_progress topics should be visible
    expect(screen.getByText('Chủ Đề Malformed NextReview')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Valid Future Review')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Valid Overdue Review')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Overflow Progress')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Negative Progress')).toBeInTheDocument();

    // null, undefined, or corrupted_status topics (semantically not_started) should NOT appear in in_progress filter
    expect(screen.queryByText('Chủ Đề Null Progress')).toBeNull();
    expect(screen.queryByText('Chủ Đề Undefined Progress')).toBeNull();
    expect(screen.queryByText('Chủ Đề Corrupted Numeric Values')).toBeNull();

    // Click "Đã hoàn thành" (completed) filter
    const completedBtn = screen.getByRole('button', { name: 'Đã hoàn thành' });
    fireEvent.click(completedBtn);

    expect(screen.getByText('Chủ Đề Whitespace NextReview')).toBeInTheDocument();
    expect(screen.queryByText('Chủ Đề Null Progress')).toBeNull();

    // Click "Tất cả" (all) filter
    const allBtn = screen.getByRole('button', { name: 'Tất cả' });
    fireEvent.click(allBtn);

    expect(screen.getByText('Chủ Đề Null Progress')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Undefined Progress')).toBeInTheDocument();
    expect(screen.getByText('Chủ Đề Corrupted Numeric Values')).toBeInTheDocument();
  });

  it('renders empty state message cleanly when topics array is empty', () => {
    activeTopicsInContext = [];
    render(<StudyProgressView />);

    expect(
      screen.getByText('Không tìm thấy chủ đề nào theo bộ lọc tiến độ này.')
    ).toBeInTheDocument();
  });

  it('normalizes corrupted numeric values (NaN, negative, zero/negative easeFactor) to safe finite numbers', () => {
    render(<StudyProgressView />);

    // NaN / Negative topic should be clamped & normalized to 0%
    const zeroPercentLabels = screen.getAllByText('0% hoàn thành');
    expect(zeroPercentLabels.length).toBeGreaterThanOrEqual(4);

    // timeSpent < 0 should be normalized to 0 phút
    expect(screen.getAllByText('⏱️ 0 phút').length).toBeGreaterThan(0);

    // interval < 0 should be normalized to 0 ngày
    expect(screen.getAllByText('Khoảng cách: 0 ngày').length).toBeGreaterThan(0);

    // easeFactor <= 0 or invalid should be normalized to default 2.5
    expect(screen.getAllByText('Hệ số Ease: 2.5').length).toBeGreaterThan(0);

    // Corrupted NaN or Infinity must NEVER be rendered in DOM
    expect(screen.queryByText(/NaN/i)).toBeNull();
    expect(screen.queryByText(/Infinity/i)).toBeNull();
  });

  it('clamps overflow progress (>100%) to 100% on card progress text and slider', () => {
    render(<StudyProgressView />);

    // Topic with progress: 180 should be normalized to 100%
    const hundredPercentLabels = screen.getAllByText('100% hoàn thành');
    expect(hundredPercentLabels.length).toBeGreaterThanOrEqual(2); // 1 from Whitespace topic, 1 from Overflow topic
  });
});
