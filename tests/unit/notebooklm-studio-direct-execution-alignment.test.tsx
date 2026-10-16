/**
 * NotebookLM Studio Modal Direct Execution Alignment Unit Tests (RED Suite)
 * (Validates UI-to-backend alignment spec: docs/specs/notebooklm-direct-mcp-ui-execution-alignment.md)
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMStudioModal } from '../../src/components/integrations/NotebookLMStudioModal';
import { Topic, Note, Resource } from '../../src/types';

const mockTopic: Topic = {
  id: 'topic-ky-mon',
  title: 'Kỳ Môn Độn Giáp Toàn Thư',
  slug: 'ky-mon-don-giap',
  type: 'huyen-hoc',
  categoryId: 'cat-dich-hoc',
  categoryName: 'Dịch Học',
  description: 'Khoa thuật số định vị thời không.',
  content: 'Cấu trúc Bát Môn, Cửu Tinh, Bát Thần.',
  tags: ['Kỳ Môn'],
  studyProgress: {
    topicId: 'topic-ky-mon',
    status: 'not_started',
    progress: 0,
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    totalNotes: 0,
    timeSpent: 0,
  },
  createdAt: '2026-08-20T10:00:00Z',
  updatedAt: '2026-08-24T10:00:00Z',
  links: [],
};

const mockNote: Note = {
  id: 'note-01',
  topicId: 'topic-ky-mon',
  title: 'Ghi chép Bát Môn',
  content: 'Nội dung chi tiết Bát Môn định vị thiên địa.',
  createdAt: '2026-08-21T10:00:00Z',
  updatedAt: '2026-08-21T10:00:00Z',
};

const mockResource: Resource = {
  id: 'res-01',
  topicId: 'topic-ky-mon',
  title: 'Tài liệu Kỳ Môn Độn Giáp Cổ Tịch',
  type: 'book',
  url: 'https://example.com/kymon.pdf',
  createdAt: '2026-08-21T10:00:00Z',
  updatedAt: '2026-08-21T10:00:00Z',
};

let currentMockNotes: Note[] = [mockNote];
let currentMockResources: Resource[] = [mockResource];

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [mockTopic],
    notes: currentMockNotes,
    resources: currentMockResources,
  }),
}));

describe('DIRECT NOTEBOOKLM MCP UI EXECUTION ALIGNMENT (RED SUITE)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    currentMockNotes = [mockNote];
    currentMockResources = [mockResource];
  });

  // =========================================================================
  // SCENARIO 1: Block live execution without packaged sources
  // =========================================================================
  it('Scenario 1: Block live execution without packaged sources', async () => {
    // When topic has no notes, resources, description or content (empty source document)
    const emptyTopic: Topic = {
      ...mockTopic,
      id: 'topic-empty',
      description: '',
      content: '',
    };
    currentMockNotes = [];
    currentMockResources = [];

    const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/research-sessions') {
        return {
          ok: true,
          json: async () => ({
            id: 'session-empty-01',
            topicId: 'topic-empty',
            sourcePackages: [],
            artifacts: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    globalThis.fetch = fetchSpy as any;

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={emptyTopic}
      />
    );

    // Navigate to Prompt Step
    const promptStepBtn = screen.getByRole('button', { name: /Bước 2.*Prompt/i });
    fireEvent.click(promptStepBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });

    const liveBtn = screen.getByTestId('btn-execute-live-research');
    fireEvent.click(liveBtn);

    // Verify execute-live was NEVER called
    const executeLiveCalls = fetchSpy.mock.calls.filter((call: any[]) =>
      call[0]?.includes('/execute-live')
    );
    expect(executeLiveCalls.length).toBe(0);

    // Verify error banner shows explicit source-required error
    await waitFor(() => {
      const banner = screen.getByTestId('live-execution-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent).toMatch(/tài liệu nguồn/i);
    });
  });

  // =========================================================================
  // SCENARIO 2: Send override sources to execute-live
  // =========================================================================
  it('Scenario 2: Send override sources to execute-live', async () => {
    let capturedRequestBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
      if (url === '/api/research-sessions') {
        return {
          ok: true,
          json: async () => ({
            id: 'session-src-01',
            topicId: mockTopic.id,
            sourcePackages: [],
            artifacts: [],
          }),
        };
      }
      if (url.includes('/execute-live')) {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            sessionId: 'session-src-01',
            artifactId: 'art-src-01',
            artifactType: 'study_guide',
            title: 'STUDY GUIDE: Kỳ Môn',
            content: '# Nội dung khảo cứu...',
            citedSourceIds: ['client-src-01'],
            cleanupStatus: 'CLEANED',
            executionDurationMs: 3200,
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as any;

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
      />
    );

    const promptStepBtn = screen.getByRole('button', { name: /Bước 2.*Prompt/i });
    fireEvent.click(promptStepBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-execute-live-research'));

    await waitFor(() => {
      expect(capturedRequestBody).not.toBeNull();
    });

    // Request must include override sources
    expect(capturedRequestBody.sources).toBeDefined();
    expect(Array.isArray(capturedRequestBody.sources)).toBe(true);
    expect(capturedRequestBody.sources.length).toBeGreaterThan(0);
    expect(capturedRequestBody.sources[0].textContent).toContain('Kỳ Môn');
  });

  // =========================================================================
  // SCENARIO 3: Render flatten response immediately
  // =========================================================================
  it('Scenario 3: Render flatten response immediately without waiting for syncSession', async () => {
    const flattenResponse = {
      sessionId: 'session-fast-01',
      artifactId: 'art-instant-01',
      artifactType: 'study_guide',
      title: 'STUDY GUIDE: Khảo cứu tức thì',
      content: 'NỘI DUNG TỨC THÌ ĐƯỢC RENDER TRỰC TIẾP TỪ FLATTEN DTO',
      citedSourceIds: ['src-01'],
      citations: { '1': 'src-01' },
      references: [
        {
          sourceId: 'src-01',
          citationNumber: 1,
          citedText: 'Bát Môn',
          sourceTitle: 'Kỳ Môn Toàn Thư',
        },
      ],
      cleanupStatus: 'CLEANED',
      executionDurationMs: 1500,
    };

    let syncSessionCalledAfterExecute = false;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/research-sessions') {
        // First call on mount returns empty artifacts, but secondary reconciliation is delayed
        if (syncSessionCalledAfterExecute) {
          // Simulate slow secondary reconciliation
          await new Promise((r) => setTimeout(r, 1000));
        }
        return {
          ok: true,
          json: async () => ({
            id: 'session-fast-01',
            topicId: mockTopic.id,
            sourcePackages: [],
            artifacts: [], // DB does not have it yet!
          }),
        };
      }
      if (url.includes('/execute-live')) {
        syncSessionCalledAfterExecute = true;
        return {
          ok: true,
          status: 200,
          json: async () => flattenResponse,
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as any;

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
      />
    );

    const promptStepBtn = screen.getByRole('button', { name: /Bước 2.*Prompt/i });
    fireEvent.click(promptStepBtn);

    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('btn-execute-live-research'));

    // Should immediately display content in Results view without waiting for slow syncSession
    await waitFor(() => {
      expect(
        screen.getByText('NỘI DUNG TỨC THÌ ĐƯỢC RENDER TRỰC TIẾP TỪ FLATTEN DTO')
      ).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SCENARIO 4: Distinguish 403 gating from 403 auth failure
  // =========================================================================
  it('Scenario 4: Distinguish 403 gating from 403 auth failure', async () => {
    // 4A: Code DIRECT_EXECUTION_DISABLED
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/research-sessions') {
        return {
          ok: true,
          json: async () => ({
            id: 'session-403-01',
            topicId: mockTopic.id,
            artifacts: [],
          }),
        };
      }
      if (url.includes('/execute-live')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            error: 'Tính năng khảo cứu trực tiếp qua NotebookLM MCP chưa được kích hoạt',
            code: 'DIRECT_EXECUTION_DISABLED',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as any;

    const { unmount } = render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Bước 2.*Prompt/i }));
    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-execute-live-research'));

    await waitFor(() => {
      const banner = screen.getByTestId('live-execution-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent).toContain('NOTEBOOKLM_DIRECT_EXECUTION');
    });

    unmount();

    // 4B: Code AUTHENTICATION_FAILED
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/research-sessions') {
        return {
          ok: true,
          json: async () => ({
            id: 'session-403-02',
            topicId: mockTopic.id,
            artifacts: [],
          }),
        };
      }
      if (url.includes('/execute-live')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            error: 'Xác thực NotebookLM thất bại: cookie hết hạn',
            code: 'AUTHENTICATION_FAILED',
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as any;

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Bước 2.*Prompt/i }));
    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-execute-live-research'));

    await waitFor(() => {
      const banner = screen.getByTestId('live-execution-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent).toMatch(/xác thực|đăng nhập|nlm login/i);
      expect(banner.textContent).not.toContain('NOTEBOOKLM_DIRECT_EXECUTION flag is OFF');
    });
  });

  // =========================================================================
  // SCENARIO 5: Preserve fallback reconciliation
  // =========================================================================
  it('Scenario 5: Preserve fallback reconciliation without clobbering displayed result', async () => {
    const flattenResponse = {
      sessionId: 'session-reconcile-01',
      artifactId: 'art-rec-01',
      artifactType: 'study_guide',
      title: 'STUDY GUIDE: Reconciled',
      content: 'NỘI DUNG KHẢO CỨU ĐÃ ĐƯỢC HIỂN THỊ',
      citedSourceIds: ['src-01'],
      cleanupStatus: 'CLEANED',
      executionDurationMs: 1200,
    };

    let fetchCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/research-sessions') {
        fetchCount++;
        // On reconciliation (second call), DB returns the persisted record
        return {
          ok: true,
          json: async () => ({
            id: 'session-reconcile-01',
            topicId: mockTopic.id,
            artifacts:
              fetchCount > 1
                ? [
                    {
                      id: 'art-rec-01',
                      topicId: mockTopic.id,
                      artifactType: 'study_guide',
                      title: 'STUDY GUIDE: Reconciled',
                      rawContent: 'NỘI DUNG KHẢO CỨU ĐÃ ĐƯỢC HIỂN THỊ',
                      status: 'received',
                      createdAt: new Date().toISOString(),
                    },
                  ]
                : [],
          }),
        };
      }
      if (url.includes('/execute-live')) {
        return {
          ok: true,
          status: 200,
          json: async () => flattenResponse,
        };
      }
      return { ok: true, json: async () => ({}) };
    }) as any;

    render(
      <NotebookLMStudioModal
        isOpen={true}
        onClose={vi.fn()}
        topic={mockTopic}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Bước 2.*Prompt/i }));
    await waitFor(() => {
      expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('btn-execute-live-research'));

    // Check that content is rendered and remains visible after background reconciliation
    await waitFor(() => {
      expect(screen.getByText('NỘI DUNG KHẢO CỨU ĐÃ ĐƯỢC HIỂN THỊ')).toBeInTheDocument();
    });

    // Secondary reconciliation should have been called in background
    await waitFor(() => {
      expect(fetchCount).toBeGreaterThan(1);
    });

    // Result must still be displayed
    expect(screen.getByText('NỘI DUNG KHẢO CỨU ĐÃ ĐƯỢC HIỂN THỊ')).toBeInTheDocument();
  });
});
