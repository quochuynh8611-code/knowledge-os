import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { TopicDetail } from '../../src/components/topics/TopicDetail';
import type { Topic, Category, Note, Resource, Tag } from '../../src/types';

const mockCategories: Category[] = [
  { id: 'cat-phat-hoc', name: 'Phật Học', slug: 'phat-hoc', type: 'phat-hoc' },
  { id: 'cat-dong-y', name: 'Đông Y', slug: 'dong-y', type: 'dong-y' },
  { id: 'cat-huyen-hoc', name: 'Huyền Học', slug: 'huyen-hoc', type: 'huyen-hoc' },
];

const mockTopics: Topic[] = [
  {
    id: 'topic-bat-nha',
    title: 'Bát Nhã Tâm Kinh',
    slug: 'bat-nha-tam-kinh',
    categoryId: 'cat-phat-hoc',
    categoryName: 'Phật Học',
    type: 'phat-hoc',
    description: 'Khảo cứu Bát Nhã Tâm Kinh và Tánh Không',
    content: 'Nội dung Bát Nhã...',
    tags: ['BatNha', 'TanhKhong'],
    links: [],
    studyProgress: {
      topicId: 'topic-bat-nha',
      status: 'in_progress',
      progress: 60,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 2,
      totalNotes: 2,
      timeSpent: 120,
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
  },
  {
    id: 'topic-dong-y-1',
    title: 'Âm Dương Ngũ Hành Đông Y',
    slug: 'am-duong-ngu-hanh-dong-y',
    categoryId: 'cat-dong-y',
    categoryName: 'Đông Y',
    type: 'dong-y',
    description: 'Học thuyết Âm Dương và Tạng Tượng',
    content: 'Nội dung Đông Y...',
    tags: ['DongY', 'AmDuong'],
    links: [],
    studyProgress: {
      topicId: 'topic-dong-y-1',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
  },
  {
    id: 'topic-huyen-hoc-1',
    title: 'Kinh Dịch Nhập Môn',
    slug: 'kinh-dich-nhap-mon',
    categoryId: 'cat-huyen-hoc',
    categoryName: 'Huyền Học',
    type: 'huyen-hoc',
    description: '64 Quẻ Kinh Dịch',
    content: 'Nội dung Kinh Dịch...',
    tags: ['KinhDich'],
    links: [],
    studyProgress: {
      topicId: 'topic-huyen-hoc-1',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-01-01',
    updatedAt: '2026-01-02',
  },
];

// Mock Notes
const mockNotes: Note[] = [
  {
    id: 'note-1',
    topicId: 'topic-bat-nha',
    title: 'Khảo sát Tánh Không trong Bát Nhã',
    content: '# Tánh Không\n\nSắc bất dị không, không bất dị sắc.',
    type: 'insight',
    isPrivate: false,
    tags: ['BatNha', 'Insight'],
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'note-2-cross-topic',
    topicId: 'topic-bat-nha',
    topicIds: ['topic-bat-nha', 'topic-dong-y-1'], // Linked to both Phat Hoc and Dong Y
    title: 'Tâm Thức & Khí Huyết tương thông',
    content: 'Đối chiếu giữa Tâm giải thoát và Điều hòa Khí Huyết trong Đông Y.',
    type: 'summary',
    isPrivate: false,
    tags: ['LienNganh'],
    createdAt: '2026-02-02T10:00:00.000Z',
    updatedAt: '2026-02-02T10:00:00.000Z',
  },
  {
    id: 'note-3-dong-y-only',
    topicId: 'topic-dong-y-1',
    title: 'Chẩn đoán Bát Cương',
    content: 'Biện chứng Âm Dương, Biểu Lý, Hàn Nhiệt, Hư Thực.',
    type: 'study',
    isPrivate: false,
    tags: ['BatCuong'],
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-03T10:00:00.000Z',
  },
];

let currentSelectedTopicId: string | null = 'topic-bat-nha';
const mockDeleteNote = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    categories: mockCategories,
    selectedTopicId: currentSelectedTopicId,
    setSelectedTopicId: (id: string | null) => {
      currentSelectedTopicId = id;
    },
    topics: mockTopics,
    notes: mockNotes,
    resources: [] as Resource[],
    tags: [] as Tag[],
    updateTopicProgress: vi.fn(),
    deleteNote: mockDeleteNote,
    addResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
    addKnowledgeLink: vi.fn(),
    removeKnowledgeLink: vi.fn(),
    activeTimerTopicId: null,
    isTimerRunning: false,
    timerSeconds: 0,
    startStudyTimer: vi.fn(),
    resumeStudyTimer: vi.fn(),
  }),
}));

describe('Option A: Topic-scoped Research Notes in TopicDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSelectedTopicId = 'topic-bat-nha';
  });

  it('1. Only displays notes scoped to the active topic (including multi-topic links)', () => {
    currentSelectedTopicId = 'topic-bat-nha';
    render(<TopicDetail />);

    // Switch to notes tab
    const notesTabBtn = screen.getByTestId('tab-btn-notes');
    expect(notesTabBtn).toHaveTextContent('Ghi Chú (2)');
    fireEvent.click(notesTabBtn);

    // Topic Bát Nhã should show note-1 and note-2-cross-topic, but NOT note-3-dong-y-only
    expect(screen.getByText('Khảo sát Tánh Không trong Bát Nhã')).toBeInTheDocument();
    expect(screen.getByText('Tâm Thức & Khí Huyết tương thông')).toBeInTheDocument();
    expect(screen.queryByText('Chẩn đoán Bát Cương')).not.toBeInTheDocument();
  });

  it('2. Multi-topic note is displayed under both associated topics without duplication', () => {
    // Check in Dong Y topic
    currentSelectedTopicId = 'topic-dong-y-1';
    render(<TopicDetail />);

    const notesTabBtn = screen.getByTestId('tab-btn-notes');
    expect(notesTabBtn).toHaveTextContent('Ghi Chú (2)');
    fireEvent.click(notesTabBtn);

    // Topic Dong Y should show note-2-cross-topic and note-3-dong-y-only, but NOT note-1
    expect(screen.getByText('Tâm Thức & Khí Huyết tương thông')).toBeInTheDocument();
    expect(screen.getByText('Chẩn đoán Bát Cương')).toBeInTheDocument();
    expect(screen.queryByText('Khảo sát Tánh Không trong Bát Nhã')).not.toBeInTheDocument();

    // Verify exactly 1 instance of note-2-cross-topic rendered (no duplication)
    const crossNotes = screen.getAllByText('Tâm Thức & Khí Huyết tương thông');
    expect(crossNotes).toHaveLength(1);
  });

  it('3. Each note card has a "Đọc tiếp" button and clicking it opens NoteReaderModal', async () => {
    currentSelectedTopicId = 'topic-bat-nha';
    render(<TopicDetail />);

    const notesTabBtn = screen.getByTestId('tab-btn-notes');
    fireEvent.click(notesTabBtn);

    // Find "Đọc tiếp" button for the first note
    const readBtn = screen.getByLabelText('Đọc tiếp ghi chú Khảo sát Tánh Không trong Bát Nhã');
    expect(readBtn).toBeInTheDocument();

    // Click "Đọc tiếp"
    fireEvent.click(readBtn);

    // NoteReaderModal dialog should open with note title and rendered markdown
    await waitFor(() => {
      const modal = screen.getByRole('dialog', { name: /Chi tiết ghi chú/i });
      expect(modal).toBeInTheDocument();
      expect(within(modal).getByRole('heading', { name: /Khảo sát Tánh Không trong Bát Nhã/i, level: 2 })).toBeInTheDocument();
      expect(within(modal).getByText(/Sắc bất dị không, không bất dị sắc/i)).toBeInTheDocument();
    });
  });

  it('4. Only the explicit "Đọc tiếp" button triggers NoteReaderModal (clicking card title does not open reader)', () => {
    currentSelectedTopicId = 'topic-bat-nha';
    render(<TopicDetail />);

    const notesTabBtn = screen.getByTestId('tab-btn-notes');
    fireEvent.click(notesTabBtn);

    // Clicking card title should NOT open reader modal
    const cardTitle = screen.getByText('Khảo sát Tánh Không trong Bát Nhã');
    fireEvent.click(cardTitle);

    expect(screen.queryByRole('dialog', { name: /Chi tiết ghi chú/i })).not.toBeInTheDocument();

    // Clicking explicit "Đọc tiếp" button opens reader modal
    const readBtn = screen.getByLabelText('Đọc tiếp ghi chú Khảo sát Tánh Không trong Bát Nhã');
    fireEvent.click(readBtn);

    expect(screen.getByRole('dialog', { name: /Chi tiết ghi chú/i })).toBeInTheDocument();
  });

  it('5. Renders clean empty state when a topic has no linked notes', () => {
    currentSelectedTopicId = 'topic-huyen-hoc-1';
    render(<TopicDetail />);

    const notesTabBtn = screen.getByTestId('tab-btn-notes');
    expect(notesTabBtn).toHaveTextContent('Ghi Chú (0)');
    fireEvent.click(notesTabBtn);

    expect(screen.getByText('Chưa có ghi chú nào cho chủ đề này')).toBeInTheDocument();
    expect(screen.getByText('Thêm ghi chú đầu tiên')).toBeInTheDocument();
  });
});
