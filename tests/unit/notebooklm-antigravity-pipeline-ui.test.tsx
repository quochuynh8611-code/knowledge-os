/**
 * NotebookLM Studio Modal & Antigravity Pipeline UI Integration Tests
 *
 * Spec: docs/specs/post-phase5-automated-antigravity-notebooklm-handoff.md
 * ADR: docs/specs/adr-015-automated-antigravity-notebooklm-handoff.md
 * Target: src/components/integrations/NotebookLMStudioModal.tsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import { Topic, Note, Resource } from '../../src/types';

const mockTopics: Topic[] = [
  {
    id: 'topic-vi-dieu-phap',
    title: 'Vi Diệu Pháp Toàn Tập',
    slug: 'vi-dieu-phap-toan-tap',
    type: 'phat-hoc',
    categoryId: 'cat-abhidharma',
    categoryName: 'Vi Diệu Pháp',
    description: 'Khảo luận chi tiết 89/121 Tâm.',
    content: 'Tâm là thực tại nhận biết cảnh.',
    tags: ['Abhidharma'],
    studyProgress: {
      topicId: 'topic-vi-dieu-phap',
      status: 'not_started',
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
  },
];

const mockNotes: Note[] = [];
const mockResources: Resource[] = [];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    studyProgress: {},
    tags: [],
    selectedTopic: null,
    addResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
  }),
}));

describe('Post-Phase 5: NotebookLM Studio Modal & Antigravity Pipeline UI Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Test 1: Renders Prepare Antigravity Handoff button
  // ---------------------------------------------------------------------------
  it('1. Hiển thị nút "Chuẩn bị Handoff Antigravity" trong tab Task Prompt', () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    expect(prepareBtn).toBeInTheDocument();
    expect(prepareBtn).toHaveTextContent(/Chuẩn bị Handoff Antigravity/i);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Clicking Prepare Handoff creates a queued job and displays CLI command
  // ---------------------------------------------------------------------------
  it('2. Nhấn nút "Chuẩn bị Handoff Antigravity" tạo bản ghi queued và hiển thị lệnh CLI', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByTestId('handoff-cli-command-preview')).toBeInTheDocument();
    });

    const commandPreview = screen.getByTestId('handoff-cli-command-preview');
    expect(commandPreview).toHaveTextContent(/agy -p/i);
    expect(commandPreview).toHaveTextContent(/Vi Diệu Pháp Toàn Tập/i);

    // Tracker item displayed
    expect(screen.getByTestId('handoff-jobs-tracker-list')).toBeInTheDocument();
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 3: Copies generated CLI command to clipboard
  // ---------------------------------------------------------------------------
  it('3. Sao chép lệnh CLI headless vào clipboard thành công', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-copy-handoff-cli')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTestId('btn-copy-handoff-cli');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('agy -p')
      );
      expect(screen.getByText(/Đã sao chép lệnh CLI/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Deleting a job from tracker
  // ---------------------------------------------------------------------------
  it('4. Cho phép xóa Job khỏi danh sách theo dõi tracker', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-delete-handoff-job')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('btn-delete-handoff-job');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('handoff-job-item')).not.toBeInTheDocument();
    });
  });
});
