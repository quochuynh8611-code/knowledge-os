import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import {
  getStoredArtifacts,
  saveArtifact,
  deduplicateArtifacts,
  NotebookLMArtifact,
} from '../../src/lib/notebooklm';
import { Topic, Note, Resource } from '../../src/types';

const mockTopics: Topic[] = [
  {
    id: 'topic-a',
    title: 'Chủ đề A',
    slug: 'chu-de-a',
    type: 'khoa-hoc',
    categoryId: 'cat-a',
    categoryName: 'Khoa Học',
    description: 'Mô tả A',
    content: 'Nội dung A',
    tags: ['A'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
    studyProgress: {
      topicId: 'topic-a',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
  },
  {
    id: 'topic-b',
    title: 'Chủ đề B',
    slug: 'chu-de-b',
    type: 'khoa-hoc',
    categoryId: 'cat-b',
    categoryName: 'Khoa Học',
    description: 'Mô tả B',
    content: 'Nội dung B',
    tags: ['B'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
    studyProgress: {
      topicId: 'topic-b',
      status: 'not_started',
      progress: 0,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 0,
      timeSpent: 0,
    },
  },
];

const mockNotes: Note[] = [
  {
    id: 'note-1',
    topicId: 'topic-a',
    topicTitle: 'Chủ đề A',
    title: 'Ghi chú 1',
    content: 'Nội dung ghi chú 1',
    type: 'insight',
    isPrivate: false,
    tags: [],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources: Resource[] = [];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    researchExcerpts: [],
  }),
}));

describe('Commit 7: Reliable Artifact Sync and Session Idempotency', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Scenario: Tạo artifact offline rồi sync thành công', () => {
    it('creates artifact with pending status on failure, then syncs to backend on retry', async () => {
      let ingestCalls = 0;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          ingestCalls++;
          if (ingestCalls === 1) {
            // First time: backend fails
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: 'Internal Server Error' }),
            } as any;
          }
          // Retry time: backend recovers
          return {
            ok: true,
            status: 200,
            json: async () => ({
              artifact: {
                id: 'server-artifact-999',
                sessionId: 'session-a',
                topicId: 'topic-a',
                artifactType: 'study_guide',
                title: 'Artifact A',
                rawContent: 'Nội dung khảo cứu',
                status: 'imported',
                syncStatus: 'synced',
              },
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Switch to Step 3: Results
      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      // Fill in artifact form
      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Artifact A' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung khảo cứu' },
      });

      // Submit artifact when backend fails (1st attempt)
      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        // Then artifact local có syncStatus pending
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].syncStatus).toBe('pending');
        // And UI hiển thị chưa đồng bộ backend
        expect(screen.getByText(/Chưa đồng bộ backend/i)).toBeInTheDocument();
      });

      // When backend phục hồi và người dùng bấm Retry
      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        // Then artifact được cập nhật id backend
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].id).toBe('server-artifact-999');
        // And syncStatus là synced
        expect(stored[0].syncStatus).toBe('synced');
        // And không có bản sao trùng
        expect(screen.queryByText(/Chưa đồng bộ backend/i)).not.toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: API lỗi không được báo thành công', () => {
    it('does not display success alert when POST /api/artifacts/ingest returns 500', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Database crash 500' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Bản Nháp Test' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung nháp' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        // Then UI không hiển thị thành công như một kết quả đồng bộ backend
        expect(screen.queryByText(/Đã lưu kết quả thành công/i)).not.toBeInTheDocument();
        // And artifact có syncStatus pending hoặc failed
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(['pending', 'failed']).toContain(stored[0].syncStatus);
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Hai artifact cùng title khác id được đếm 2', () => {
    it('counts 2 when artifacts share title but have different ids', () => {
      const local = [{ id: 'local-1', title: 'Tổng hợp', content: 'C1', topicId: 'topic-a' }];
      const session = [{ id: 'server-1', title: 'Tổng hợp', rawContent: 'C2', topicId: 'topic-a' }];
      const res = deduplicateArtifacts(session, local);
      expect(res.count).toBe(2);
    });
  });

  describe('Scenario: Đổi topic nhanh phải hủy request cũ', () => {
    it('aborts or ignores previous session request when rapidly switching topics', async () => {
      let abortedUrls: string[] = [];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any, init?: any) => {
        const url = typeof info === 'string' ? info : info.url;
        const signal: AbortSignal | undefined = init?.signal;

        if (url.includes('/api/research-sessions')) {
          const body = JSON.parse(init?.body || '{}');
          if (body.topicId === 'topic-a') {
            // Topic A delays and listens to abort
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({ id: 'session-a', topicId: 'topic-a', artifacts: [] }),
                } as any);
              }, 200);

              signal?.addEventListener('abort', () => {
                clearTimeout(timer);
                abortedUrls.push(url);
                const abortErr = new Error('The user aborted a request.');
                abortErr.name = 'AbortError';
                reject(abortErr);
              });
            });
          }

          if (body.topicId === 'topic-b') {
            return {
              ok: true,
              status: 200,
              json: async () => ({ id: 'session-b', topicId: 'topic-b', artifacts: [] }),
            } as any;
          }
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      const { rerender } = render(
        <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
      );

      // Rapidly switch topic to B
      rerender(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[1]} />);

      await waitFor(() => {
        // Topic A request was aborted
        expect(abortedUrls.length).toBeGreaterThan(0);
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Không tạo trùng research session', () => {
    it('does not re-request POST /api/research-sessions if session already matches topicId', async () => {
      let sessionPosts = 0;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url === '/api/research-sessions') {
          sessionPosts++;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      const { rerender } = render(
        <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
      );

      await waitFor(() => {
        expect(sessionPosts).toBe(1);
      });

      // Rerender with same topic
      rerender(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Must not call POST /api/research-sessions again
      expect(sessionPosts).toBe(1);

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Audio overview không bị remap', () => {
    it('disables direct execution and displays explanation for audio_overview_summary without sending study_guide', async () => {
      let lastLiveCallBody: any = null;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any, init?: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/execute-live')) {
          lastLiveCallBody = JSON.parse(init?.body || '{}');
          return {
            ok: true,
            json: async () => ({
              artifactId: 'live-art-1',
              sessionId: 'session-a',
              artifactType: 'audio_overview_summary',
              title: 'Audio Summary',
              content: 'Nội dung',
            }),
          } as any;
        }
        if (url.includes('/api/research-sessions')) {
          return {
            ok: true,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              sourcePackages: [{ id: 'sp-1', version: 1 }],
              artifacts: [],
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Switch to Step 2: Prompt
      fireEvent.click(screen.getByRole('button', { name: /Bước 2: Prompt/i }));

      // Select Audio Overview
      fireEvent.click(screen.getByRole('button', { name: /Audio Overview/i }));

      // Check button is disabled or explains reason
      const directExecBtn = screen.getByTestId('btn-execute-live-research');
      expect(directExecBtn).toBeDisabled();
      expect(
        screen.getByText(/chưa hỗ trợ thực thi trực tiếp.*Chuẩn bị Handoff/i)
      ).toBeInTheDocument();

      // System does not call execute-live with study_guide
      expect(lastLiveCallBody).toBeNull();

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Sync nguồn lỗi phải cảnh báo', () => {
    it('allows local copy of source but displays warning when backend package-sources sync fails', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/package-sources')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Sync source package failed' }),
          } as any;
        }
        if (url.includes('/api/research-sessions')) {
          return {
            ok: true,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Step 1: Click Copy Source
      const copyBtn = screen.getByTestId('btn-copy-source-document');
      fireEvent.click(copyBtn);

      // Local action succeeded
      expect(writeTextMock).toHaveBeenCalled();

      // UI displays warning about unsynced session
      await waitFor(() => {
        expect(
          screen.getByText(/Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu/i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Retry thất bại phải hiển thị lỗi và chuyển failed', () => {
    it('updates syncStatus to failed and displays retry warning when POST /api/artifacts/ingest returns 500 on retry', async () => {
      // Given artifact đang pending
      saveArtifact({
        id: 'pending-art-1',
        topicId: 'topic-a',
        type: 'study_guide',
        title: 'Pending Artifact 1',
        content: 'Nội dung pending',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Still down 500' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Switch to Step 3: Results
      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      // When Retry
      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        // Then syncStatus là failed
        const stored = getStoredArtifacts();
        expect(stored[0].syncStatus).toBe('failed');
        // And UI hiển thị cảnh báo retry thất bại
        expect(
          screen.getByText(/Retry đồng bộ artifact thất bại\. Vui lòng thử lại\./i)
        ).toBeInTheDocument();
        // And không hiển thị thành công
        expect(screen.queryByText(/Đã lưu kết quả thành công/i)).not.toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Retry lỗi mạng phải hiển thị lỗi và chuyển failed', () => {
    it('updates syncStatus to failed and displays error message when retry fetch throws', async () => {
      // Given artifact đang pending
      saveArtifact({
        id: 'pending-art-2',
        topicId: 'topic-a',
        type: 'study_guide',
        title: 'Pending Artifact 2',
        content: 'Nội dung pending mạng',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-a',
              topicId: 'topic-a',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          throw new Error('Network offline connection reset');
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        // Then syncStatus là failed
        const stored = getStoredArtifacts();
        expect(stored[0].syncStatus).toBe('failed');
        // And UI hiển thị cảnh báo retry thất bại có message
        expect(
          screen.getByText(/Retry đồng bộ thất bại: Network offline connection reset/i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  describe('Scenario: Không có session thì Retry phải cảnh báo', () => {
    it('displays warning when session cannot be established for retry', async () => {
      // Given artifact đang pending
      saveArtifact({
        id: 'pending-art-3',
        topicId: 'topic-a',
        type: 'study_guide',
        title: 'Pending Artifact 3',
        content: 'Nội dung pending không session',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions')) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'Service Unavailable' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        // Then UI hiển thị cảnh báo chưa có phiên nghiên cứu
        expect(
          screen.getByText(/Chưa thể đồng bộ artifact vì chưa có phiên nghiên cứu/i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });
});
