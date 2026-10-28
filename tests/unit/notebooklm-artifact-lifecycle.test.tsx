import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import {
  getStoredArtifacts,
  saveArtifact,
  deduplicateArtifacts,
  computeArtifactContentHash,
  NotebookLMArtifact,
} from '../../src/lib/notebooklm';
import { Topic, Note, Resource } from '../../src/types';

const mockTopics: Topic[] = [
  {
    id: 'topic-alpha',
    title: 'Chủ Đề Khảo Cứu Alpha',
    slug: 'chu-de-khao-cuu-alpha',
    type: 'khoa-hoc',
    categoryId: 'cat-alpha',
    categoryName: 'Khoa Học Tự Nhiên',
    description: 'Tài liệu nguồn chuyên sâu Alpha',
    content: 'Nội dung nguyên bản Alpha về cơ sở luận thuyết.',
    tags: ['Alpha', 'Nghiencuu'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
    studyProgress: {
      topicId: 'topic-alpha',
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
    id: 'topic-beta',
    title: 'Chủ Đề Khảo Cứu Beta',
    slug: 'chu-de-khao-cuu-beta',
    type: 'khoa-hoc',
    categoryId: 'cat-beta',
    categoryName: 'Khoa Học Xã Hội',
    description: 'Tài liệu nguồn chuyên sâu Beta',
    content: 'Nội dung nguyên bản Beta về phương pháp luận.',
    tags: ['Beta', 'TrietHoc'],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    links: [],
    studyProgress: {
      topicId: 'topic-beta',
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
    id: 'note-alpha-1',
    topicId: 'topic-alpha',
    topicTitle: 'Chủ Đề Khảo Cứu Alpha',
    title: 'Ghi chú khảo cứu Alpha 1',
    content: 'Phân tích bản thể và hiện tượng học.',
    type: 'insight',
    isPrivate: false,
    tags: [],
    createdAt: '2026-08-21T10:00:00Z',
    updatedAt: '2026-08-22T10:00:00Z',
  },
];

const mockResources: Resource[] = [
  {
    id: 'res-alpha-1',
    topicId: 'topic-alpha',
    title: 'Thư tịch nguồn Alpha',
    type: 'book',
    author: 'Học giả A',
    notes: 'Bản dịch chuẩn 2026',
    createdAt: '2026-08-21T10:00:00Z',
  },
];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    researchExcerpts: [],
  }),
}));

describe('Commit 8: NotebookLM Artifact Lifecycle and Offline Failure Coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // Scope 1: Artifact Lifecycle (Creation, Backend Ingest, Storage Reload)
  // =========================================================================
  describe('Scope 1: Artifact Lifecycle', () => {
    it('creates artifact, syncs to backend, updates server id and synced status, and preserves single artifact upon reload', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-100',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              artifact: {
                id: 'server-artifact-uuid-888',
                sessionId: 'session-alpha-100',
                topicId: 'topic-alpha',
                artifactType: 'study_guide',
                title: 'Giáo trình Tổng hợp Alpha',
                rawContent: 'Nội dung giáo trình đã đối chiếu.',
                status: 'imported',
                syncStatus: 'synced',
              },
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      const { unmount } = render(
        <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
      );

      // Switch to Step 3: Results
      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      // Fill in artifact form
      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Giáo trình Tổng hợp Alpha' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung giáo trình đã đối chiếu.' },
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].id).toBe('server-artifact-uuid-888');
        expect(stored[0].syncStatus).toBe('synced');
        expect(screen.queryByText(/Chưa đồng bộ backend/i)).not.toBeInTheDocument();
      });

      // Simulate app reload by unmounting and checking getStoredArtifacts()
      unmount();
      const reloadedStored = getStoredArtifacts();
      expect(reloadedStored.length).toBe(1);
      expect(reloadedStored[0].id).toBe('server-artifact-uuid-888');
      expect(reloadedStored[0].syncStatus).toBe('synced');
      expect(reloadedStored[0].title).toBe('Giáo trình Tổng hợp Alpha');

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // Scope 2: Offline & Backend Failure Spectrum (500, 503, Network throw)
  // =========================================================================
  describe('Scope 2: Offline & Backend Failure Spectrum', () => {
    it('persists artifact locally as pending draft when backend responds with 500 error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-500',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Database Internal Server Error 500' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Bản Nháp Khi 500' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung nháp khi 500.' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].syncStatus).toBe('pending');
        expect(screen.getByText(/Chưa đồng bộ backend/i)).toBeInTheDocument();
        expect(screen.getByTestId('btn-retry-artifact-sync')).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });

    it('persists artifact locally as pending draft when backend responds with 503 Service Unavailable', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-503',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'NotebookLM Service Unavailable 503' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Bản Nháp Khi 503' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung nháp khi 503.' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].syncStatus).toBe('pending');
        expect(screen.getByText(/Chưa đồng bộ backend/i)).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });

    it('persists artifact locally as pending draft when fetch throws network offline error on ingest', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-net-err',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          throw new TypeError('Failed to fetch: Network is offline');
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));
      fireEvent.click(screen.getByText(/Thêm Kết Quả/i));

      fireEvent.change(screen.getByLabelText(/Tiêu đề kết quả:/i), {
        target: { value: 'Bản Nháp Offline Network' },
      });
      fireEvent.change(screen.getByLabelText(/Nội dung tóm tắt/i), {
        target: { value: 'Nội dung offline network.' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Lưu Kết Quả/i }));

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].syncStatus).toBe('pending');
        expect(screen.getByText(/Chưa đồng bộ backend/i)).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // Scope 3: Retry Spectrum (Success, 500 failure, Network throw, No session)
  // =========================================================================
  describe('Scope 3: Retry Spectrum', () => {
    it('successfully recovers pending artifact on retry and clears sync warning', async () => {
      saveArtifact({
        id: 'offline-art-recovery',
        topicId: 'topic-alpha',
        type: 'study_guide',
        title: 'Artifact Cần Phục Hồi',
        content: 'Nội dung phục hồi',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-rec',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              artifact: {
                id: 'server-recovered-uuid-777',
                sessionId: 'session-alpha-rec',
                topicId: 'topic-alpha',
                artifactType: 'study_guide',
                title: 'Artifact Cần Phục Hồi',
                rawContent: 'Nội dung phục hồi',
                status: 'imported',
                syncStatus: 'synced',
              },
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored.length).toBe(1);
        expect(stored[0].id).toBe('server-recovered-uuid-777');
        expect(stored[0].syncStatus).toBe('synced');
        expect(screen.queryByTestId('sync-warning-banner')).not.toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });

    it('transitions syncStatus to failed and shows warning when retry returns 500', async () => {
      saveArtifact({
        id: 'offline-art-500',
        topicId: 'topic-alpha',
        type: 'study_guide',
        title: 'Artifact Lỗi 500',
        content: 'Nội dung 500',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-500',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: 'Ingest 500 failure' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored[0].syncStatus).toBe('failed');
        expect(screen.getByTestId('sync-warning-banner')).toBeInTheDocument();
        expect(
          screen.getByText(/Retry đồng bộ artifact thất bại\. Vui lòng thử lại\./i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });

    it('transitions syncStatus to failed and shows descriptive warning when retry network throws', async () => {
      saveArtifact({
        id: 'offline-art-throw',
        topicId: 'topic-alpha',
        type: 'study_guide',
        title: 'Artifact Lỗi Throw',
        content: 'Nội dung throw',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions') && !url.includes('ingest')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-throw',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        if (url.includes('/api/artifacts/ingest')) {
          throw new Error('Connection refused by remote host');
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        const stored = getStoredArtifacts();
        expect(stored[0].syncStatus).toBe('failed');
        expect(
          screen.getByText(/Retry đồng bộ thất bại: Connection refused by remote host/i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });

    it('displays warning when session cannot be established for retry', async () => {
      saveArtifact({
        id: 'offline-art-no-session',
        topicId: 'topic-alpha',
        type: 'study_guide',
        title: 'Artifact Thiếu Session',
        content: 'Nội dung thiếu session',
        syncStatus: 'pending',
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/api/research-sessions')) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: 'Session Service Offline' }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      fireEvent.click(screen.getByRole('button', { name: /Bước 3: Kết quả/i }));

      const retryBtn = screen.getByTestId('btn-retry-artifact-sync');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Chưa thể đồng bộ artifact vì chưa có phiên nghiên cứu/i)
        ).toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // Scope 4: Dedupe Matrix (Title vs ID, IdempotencyKey, ContentHash, Unique)
  // =========================================================================
  describe('Scope 4: Deduplication Matrix', () => {
    it('Case 1: two artifacts sharing same title but different id are counted as 2', () => {
      const local = [{ id: 'loc-1', topicId: 'topic-alpha', title: 'Tóm tắt chung', content: 'Nội dung 1' }];
      const session = [{ id: 'srv-1', topicId: 'topic-alpha', title: 'Tóm tắt chung', rawContent: 'Nội dung 2' }];
      const result = deduplicateArtifacts(session, local);
      expect(result.count).toBe(2);
      expect(result.mergedArtifacts.length).toBe(2);
    });

    it('Case 2: two artifacts sharing same idempotencyKey are deduped to 1', () => {
      const local = [{
        id: 'loc-dup-idem',
        topicId: 'topic-alpha',
        title: 'Tiêu đề cục bộ',
        content: 'Nội dung',
        idempotencyKey: 'shared-idem-key-99',
      }];
      const session = [{
        id: 'srv-dup-idem',
        topicId: 'topic-alpha',
        title: 'Tiêu đề server',
        rawContent: 'Nội dung',
        idempotencyKey: 'shared-idem-key-99',
      }];
      const result = deduplicateArtifacts(session, local);
      expect(result.count).toBe(1);
    });

    it('Case 3: two artifacts sharing same contentHash are deduped to 1', () => {
      const hash = computeArtifactContentHash({
        topicId: 'topic-alpha',
        type: 'study_guide',
        title: 'Tiêu đề chuẩn',
        content: 'Nội dung trùng hash',
      });
      const local = [{
        id: 'loc-hash-1',
        topicId: 'topic-alpha',
        title: 'Tiêu đề A',
        content: 'Nội dung trùng hash',
        contentHash: hash,
      }];
      const session = [{
        id: 'srv-hash-2',
        topicId: 'topic-alpha',
        title: 'Tiêu đề B',
        rawContent: 'Nội dung trùng hash',
        contentHash: hash,
      }];
      const result = deduplicateArtifacts(session, local);
      expect(result.count).toBe(1);
    });

    it('Case 4: two artifacts with different id, idempotencyKey, and content are counted as 2', () => {
      const local = [{
        id: 'art-unique-1',
        topicId: 'topic-alpha',
        title: 'Bài học 1',
        content: 'Nội dung 1',
        idempotencyKey: 'key-1',
      }];
      const session = [{
        id: 'art-unique-2',
        topicId: 'topic-alpha',
        title: 'Bài học 2',
        rawContent: 'Nội dung 2',
        idempotencyKey: 'key-2',
      }];
      const result = deduplicateArtifacts(session, local);
      expect(result.count).toBe(2);
    });
  });

  // =========================================================================
  // Scope 5: Research Session Idempotency & Abort Controller
  // =========================================================================
  describe('Scope 5: Research Session Idempotency & Abort Controller', () => {
    it('does not re-request POST /api/research-sessions if session already matches topicId', async () => {
      let callCount = 0;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url === '/api/research-sessions') {
          callCount++;
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 'session-alpha-idempotent', topicId: 'topic-alpha', artifacts: [] }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      const { rerender } = render(
        <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
      );

      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Rerender with the identical topic
      rerender(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // Must remain exactly 1 request
      expect(callCount).toBe(1);

      fetchSpy.mockRestore();
    });

    it('aborts pending session request when user rapidly switches between topics', async () => {
      let abortedUrls: string[] = [];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any, init?: any) => {
        const url = typeof info === 'string' ? info : info.url;
        const signal: AbortSignal | undefined = init?.signal;

        if (url === '/api/research-sessions') {
          const body = JSON.parse(init?.body || '{}');
          if (body.topicId === 'topic-alpha') {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                resolve({
                  ok: true,
                  status: 200,
                  json: async () => ({ id: 'session-alpha', topicId: 'topic-alpha', artifacts: [] }),
                } as any);
              }, 300);

              signal?.addEventListener('abort', () => {
                clearTimeout(timer);
                abortedUrls.push(url);
                const err = new Error('The user aborted a request.');
                err.name = 'AbortError';
                reject(err);
              });
            });
          }

          if (body.topicId === 'topic-beta') {
            return {
              ok: true,
              status: 200,
              json: async () => ({ id: 'session-beta', topicId: 'topic-beta', artifacts: [] }),
            } as any;
          }
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      const { rerender } = render(
        <NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />
      );

      // Fast switch to Beta
      rerender(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[1]} />);

      await waitFor(() => {
        expect(abortedUrls.length).toBeGreaterThan(0);
      });

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // Scope 6: Direct Execution Safety (Audio Overview Guard)
  // =========================================================================
  describe('Scope 6: Direct Execution Safety', () => {
    it('disables direct execution for audio_overview_summary without sending study_guide replacement', async () => {
      let livePayload: any = null;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any, init?: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/execute-live')) {
          livePayload = JSON.parse(init?.body || '{}');
          return { ok: true, json: async () => ({}) } as any;
        }
        if (url.includes('/api/research-sessions')) {
          return {
            ok: true,
            json: async () => ({
              id: 'session-alpha-live',
              topicId: 'topic-alpha',
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

      // Assert direct execution button is disabled
      const directBtn = screen.getByTestId('btn-execute-live-research');
      expect(directBtn).toBeDisabled();

      // Assert guidance notice is displayed
      expect(
        screen.getByText(/chưa hỗ trợ thực thi trực tiếp.*Chuẩn bị Handoff/i)
      ).toBeInTheDocument();

      // Ensure execute-live was never called with study_guide
      expect(livePayload).toBeNull();

      fetchSpy.mockRestore();
    });
  });

  // =========================================================================
  // Scope 7: Source & Task Prompt Sync Warning Lifecycle
  // =========================================================================
  describe('Scope 7: Source & Task Prompt Sync Warning Lifecycle', () => {
    it('shows sync warning when package-sources fails, and clears warning when subsequent sync succeeds', async () => {
      let packageSourcesFails = true;
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (info: any) => {
        const url = typeof info === 'string' ? info : info.url;
        if (url.includes('/package-sources')) {
          if (packageSourcesFails) {
            return {
              ok: false,
              status: 500,
              json: async () => ({ error: 'Failed to package sources' }),
            } as any;
          }
          return { ok: true, status: 200, json: async () => ({ ok: true }) } as any;
        }
        if (url.includes('/api/research-sessions')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: 'session-alpha-sync-warn',
              topicId: 'topic-alpha',
              status: 'active',
              artifacts: [],
            }),
          } as any;
        }
        return { ok: true, json: async () => ({}) } as any;
      });

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

      render(<NotebookLMStudioModal isOpen={true} onClose={vi.fn()} topic={mockTopics[0]} />);

      // 1. Copy source when backend fails
      const copyBtn = screen.getByTestId('btn-copy-source-document');
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalled();

      // Warning appears
      await waitFor(() => {
        expect(
          screen.getByText(/Đã thực hiện cục bộ, nhưng chưa đồng bộ vào phiên nghiên cứu/i)
        ).toBeInTheDocument();
      });

      // 2. Subsequent sync succeeds
      packageSourcesFails = false;
      fireEvent.click(copyBtn);

      // Warning is cleared
      await waitFor(() => {
        expect(screen.queryByTestId('sync-warning-banner')).not.toBeInTheDocument();
      });

      fetchSpy.mockRestore();
    });
  });
});

