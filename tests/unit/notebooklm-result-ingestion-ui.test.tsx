/**
 * NotebookLM Studio Modal & Antigravity Result Ingestion UI Integration Tests
 *
 * Spec: docs/specs/post-phase5-antigravity-result-ingestion-tracker-completion.md
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

describe('Post-Phase 5: NotebookLM Result Ingestion & Job Completion UI Tests', () => {
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
  // Test 1: Preparing or copying CLI command does NOT complete the job
  // ---------------------------------------------------------------------------
  it('1. Thao tác Chuẩn bị Handoff hoặc Sao chép CLI giữ nguyên trạng thái queued, không tự hoàn tất', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByTestId('handoff-jobs-tracker-list')).toBeInTheDocument();
    });

    // Copy command multiple times
    const copyBtn = screen.getByTestId('btn-copy-handoff-cli');
    fireEvent.click(copyBtn);
    fireEvent.click(copyBtn);

    // Status in tracker must still be queued
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Ingesting a valid artifact transitions matching job to success
  // ---------------------------------------------------------------------------
  it('2. Nạp Artifact kết quả hợp lệ chuyển trạng thái Job tương ứng sang success', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Step 1: Prepare handoff job for study_guide
    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByText(/queued/i)).toBeInTheDocument();
    });

    // Step 2: Open Add Artifact form
    const addArtifactBtn = screen.getByText(/Thêm Kết Quả/i);
    fireEvent.click(addArtifactBtn);

    // Step 3: Fill form with matching artifactType (study_guide)
    const titleInput = screen.getByPlaceholderText(/Tóm tắt Podcast 2 Hosts/i);
    fireEvent.change(titleInput, { target: { value: 'Giáo Trình Khảo Cứu Tâm Sở' } });

    // Select Study Guide option in form
    const studyGuideButtons = screen.getAllByRole('button', { name: /Study Guide/i });
    fireEvent.click(studyGuideButtons[studyGuideButtons.length - 1]);

    const contentTextarea = screen.getByPlaceholderText(/Dán nội dung tóm lược từ NotebookLM/i);
    fireEvent.change(contentTextarea, { target: { value: '# Giáo Trình Khảo Cứu\nNội dung chi tiết...' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(submitBtn);

    // Step 4: Tracker should now display success badge for that job
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Validation failure on artifact import does NOT complete the job
  // ---------------------------------------------------------------------------
  it('3. Lỗi xác thực khi nạp Artifact giữ nguyên trạng thái queued cho Job', async () => {
    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

    // Prepare job
    const prepareBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
    fireEvent.click(prepareBtn);

    await waitFor(() => {
      expect(screen.getByText(/queued/i)).toBeInTheDocument();
    });

    // Open form and submit empty content
    const addArtifactBtn = screen.getByText(/Thêm Kết Quả/i);
    fireEvent.click(addArtifactBtn);

    const submitBtn = screen.getByRole('button', { name: /Lưu Kết Quả/i });
    fireEvent.click(submitBtn);

    // Validation error shown
    expect(screen.getByText(/Nội dung artifact không được để trống/i)).toBeInTheDocument();

    // Job must still be queued
    expect(screen.getByText(/queued/i)).toBeInTheDocument();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });
});
