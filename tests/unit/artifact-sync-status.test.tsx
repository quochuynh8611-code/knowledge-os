import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import {
  saveArtifact,
  getStoredArtifacts,
  NOTEBOOKLM_STORAGE_KEY,
} from '../../src/lib/notebooklm';
import { Topic } from '../../src/types';

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [
      {
        id: 'topic-sync-1',
        title: 'Nghiên cứu Duy Thức Học',
        description: 'Khảo cứu 100 pháp và bản thể nhận thức',
        content: 'Chi tiết luận thuyết Duy Thức',
        categoryId: 'cat-triet-hoc',
        categoryName: 'Triết Học',
        createdAt: '2026-08-20T10:00:00Z',
        updatedAt: '2026-08-24T10:00:00Z',
      },
    ],
    notes: [],
    resources: [],
    categories: [],
  }),
}));

describe('PR 3 (Phase 25): Artifact Synchronization Status & 5-State Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockTopic: Topic = {
    id: 'topic-sync-1',
    title: 'Nghiên cứu Duy Thức Học',
    slug: 'nghien-cuu-duy-thuc-hoc',
    type: 'triet-hoc',
    description: 'Khảo cứu 100 pháp và bản thể nhận thức',
    content: 'Chi tiết luận thuyết Duy Thức',
    categoryId: 'cat-triet-hoc',
    categoryName: 'Triết Học',
    tags: ['triet-hoc'],
    links: [],
    studyProgress: {
      topicId: 'topic-sync-1',
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
  };

  const sampleSession = {
    id: 'session-sync-1',
    topicId: 'topic-sync-1',
    status: 'active',
    artifacts: [],
    sourcePackages: [{ id: 'pkg-1', version: 1 }],
    taskPrompts: [{ id: 'prompt-1' }],
  };

  // ==========================================
  // Test 1: First-time sync succeeds -> Synced
  // ==========================================
  it("Test 1: When POST /api/artifacts/ingest returns isDuplicate=false, marks status 'Synced', displays 'Đã đồng bộ artifact.', and hides retry button", async () => {
    saveArtifact({
      id: 'art-new-1',
      topicId: 'topic-sync-1',
      type: 'study_guide',
      title: 'Giáo trình Duy Thức',
      content: 'Nội dung giáo trình mới',
      syncStatus: 'pending',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
      const url = typeof info === 'string' ? info : info.url;
      if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleSession,
        } as any;
      }
      if (url.includes('/api/artifacts/ingest')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            artifact: {
              id: 'server-art-101',
              sessionId: 'session-sync-1',
              topicId: 'topic-sync-1',
              artifactType: 'study_guide',
              title: 'Giáo trình Duy Thức',
              rawContent: 'Nội dung giáo trình mới',
              status: 'imported',
            },
            isDuplicate: false,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    // Go to Results Step
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

    const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      const stored = getStoredArtifacts();
      expect(stored[0].syncStatus).toBe('synced');
      expect(stored[0].isDuplicate).toBe(false);

      // UI displays Synced status badge
      expect(screen.getByText(/Đã đồng bộ artifact\./i)).toBeInTheDocument();

      // Retry button is hidden
      expect(screen.queryByTestId('btn-retry-artifact-sync')).not.toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });

  // ==========================================
  // Test 2: Existing / Duplicate artifact -> AlreadySynchronized
  // ==========================================
  it("Test 2: When POST /api/artifacts/ingest returns isDuplicate=true, marks status 'AlreadySynchronized', displays 'Artifact đã tồn tại trên máy chủ — đã đồng bộ.', and hides retry button", async () => {
    saveArtifact({
      id: 'art-dup-1',
      topicId: 'topic-sync-1',
      type: 'study_guide',
      title: 'Giáo trình Đã Tồn Tại',
      content: 'Nội dung trùng',
      syncStatus: 'pending',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
      const url = typeof info === 'string' ? info : info.url;
      if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleSession,
        } as any;
      }
      if (url.includes('/api/artifacts/ingest')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            artifact: {
              id: 'server-art-existing-202',
              sessionId: 'session-sync-1',
              topicId: 'topic-sync-1',
              artifactType: 'study_guide',
              title: 'Giáo trình Đã Tồn Tại',
              rawContent: 'Nội dung trùng',
              status: 'imported',
            },
            isDuplicate: true,
          }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    // Go to Results Step
    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

    const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const stored = getStoredArtifacts();
      expect(stored[0].syncStatus).toBe('already_synchronized');
      expect(stored[0].isDuplicate).toBe(true);

      // UI displays AlreadySynchronized status
      expect(
        screen.getByText(/Artifact đã tồn tại trên máy chủ — đã đồng bộ\./i)
      ).toBeInTheDocument();

      // Retry button is hidden
      expect(screen.queryByTestId('btn-retry-artifact-sync')).not.toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });

  // ==========================================
  // Test 3: Sync failure -> Failed
  // ==========================================
  it("Test 3: When sync fails with 500 error, marks status 'failed', displays error hint, and keeps retry button enabled", async () => {
    saveArtifact({
      id: 'art-fail-1',
      topicId: 'topic-sync-1',
      type: 'study_guide',
      title: 'Giáo trình Gặp Lỗi',
      content: 'Nội dung lỗi',
      syncStatus: 'pending',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
      const url = typeof info === 'string' ? info : info.url;
      if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleSession,
        } as any;
      }
      if (url.includes('/api/artifacts/ingest')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal Server Error' }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

    const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      const stored = getStoredArtifacts();
      expect(stored[0].syncStatus).toBe('failed');
      expect(
        screen.getByText(/Retry đồng bộ artifact thất bại\. Vui lòng thử lại\./i)
      ).toBeInTheDocument();
      // Retry button remains available
      expect(screen.getByTestId('btn-retry-artifact-sync')).toBeInTheDocument();
      expect(screen.getByTestId('btn-retry-artifact-sync')).not.toBeDisabled();
    });

    fetchSpy.mockRestore();
  });

  // ==========================================
  // Test 4: In-flight Retry -> Retrying & button disabled
  // ==========================================
  it('Test 4: When retry is in-flight, transitions to Retrying state, disables retry button, and prevents concurrent retry calls', async () => {
    saveArtifact({
      id: 'art-inflight-1',
      topicId: 'topic-sync-1',
      type: 'study_guide',
      title: 'Giáo trình Đang Sync',
      content: 'Nội dung in-flight',
      syncStatus: 'failed',
    });

    let resolveIngest: (val: any) => void;
    const ingestPromise = new Promise((res) => {
      resolveIngest = res;
    });

    let ingestCallCount = 0;

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
      const url = typeof info === 'string' ? info : info.url;
      if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
        return {
          ok: true,
          status: 200,
          json: async () => sampleSession,
        } as any;
      }
      if (url.includes('/api/artifacts/ingest')) {
        ingestCallCount++;
        return await ingestPromise;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopic} />);

    fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

    const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
    expect(retryBtn).not.toBeDisabled();

    // First click: triggers retry
    fireEvent.click(retryBtn);

    // During in-flight:
    await waitFor(() => {
      expect(screen.getAllByText(/Đang thử lại đồng bộ/i).length).toBeGreaterThanOrEqual(1);
      expect(retryBtn).toBeDisabled();
    });

    expect(ingestCallCount).toBe(1);

    // Attempt second click while in-flight -> MUST BE BLOCKED
    fireEvent.click(retryBtn);
    expect(ingestCallCount).toBe(1);

    // Now resolve the promise with success
    resolveIngest!({
      ok: true,
      status: 201,
      json: async () => ({
        artifact: {
          id: 'server-resolved-303',
          sessionId: 'session-sync-1',
          topicId: 'topic-sync-1',
          artifactType: 'study_guide',
          title: 'Giáo trình Đang Sync',
          rawContent: 'Nội dung in-flight',
          status: 'imported',
        },
        isDuplicate: false,
      }),
    });

    await waitFor(() => {
      const stored = getStoredArtifacts();
      expect(stored[0].syncStatus).toBe('synced');
      expect(screen.getByText(/Đã đồng bộ artifact\./i)).toBeInTheDocument();
    });

    fetchSpy.mockRestore();
  });
});
