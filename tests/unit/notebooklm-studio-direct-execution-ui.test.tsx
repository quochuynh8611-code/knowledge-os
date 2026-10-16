/**
 * NotebookLM Studio Modal & Prompt Step Direct Execution UI Unit Tests
 * (Phase 3 Validation Suite: Direct NotebookLM MCP Integration UI Contract)
 *
 * Validates:
 * 1. Action Buttons Coexistence: Preserves Antigravity Handoff alongside Live MCP button
 * 2. Execution State & Loading Invariants: Disables buttons during live execution
 * 3. Error & Gating Banner Presentation: Displays friendly message on 403 / error
 * 4. Modal Flow: Shifts to Results tab on 200 success
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotebookLMPromptStep } from '../../src/components/integrations/notebooklm/NotebookLMPromptStep';
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

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [mockTopic],
    notes: [],
    resources: [],
  }),
}));

describe('NOTEBOOKLM STUDIO — DIRECT EXECUTION UI (PHASE 3)', () => {
  // =========================================================================
  // 1. BUTTON COEXISTENCE & RENDERING
  // =========================================================================
  describe('NotebookLMPromptStep Presentation Contract', () => {
    it('renders Live MCP button while strictly preserving Antigravity Handoff and Copy buttons', () => {
      const mockExecute = vi.fn();
      const mockHandoff = vi.fn();
      const mockCopy = vi.fn();

      render(
        <NotebookLMPromptStep
          currentTopic={mockTopic}
          promptArtifactType="study_guide"
          onSelectArtifactType={vi.fn()}
          customInstructions=""
          onChangeCustomInstructions={vi.fn()}
          taskPrompt="Phân tích Bát Môn"
          copiedPrompt={false}
          onCopyPrompt={mockCopy}
          isHandoffSubmitting={false}
          onPrepareHandoff={mockHandoff}
          onProceedToResults={vi.fn()}
          onBackToSource={vi.fn()}
          isLiveExecuting={false}
          liveExecutionError={null}
          onExecuteLiveResearch={mockExecute}
        />
      );

      const liveBtn = screen.getByTestId('btn-execute-live-research');
      const handoffBtn = screen.getByTestId('btn-prepare-antigravity-handoff');
      const copyBtn = screen.getByTestId('btn-copy-task-prompt');

      expect(liveBtn).toBeInTheDocument();
      expect(liveBtn).toHaveTextContent('Khảo cứu trực tiếp (Live MCP)');

      expect(handoffBtn).toBeInTheDocument();
      expect(handoffBtn).toHaveTextContent('Chuẩn bị Handoff Antigravity');

      expect(copyBtn).toBeInTheDocument();
      expect(copyBtn).toHaveTextContent('Sao chép Task Prompt');

      // Click live button triggers callback
      fireEvent.click(liveBtn);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('shows loading state and disables actions during isLiveExecuting', () => {
      render(
        <NotebookLMPromptStep
          currentTopic={mockTopic}
          promptArtifactType="study_guide"
          onSelectArtifactType={vi.fn()}
          customInstructions=""
          onChangeCustomInstructions={vi.fn()}
          taskPrompt="Phân tích Bát Môn"
          copiedPrompt={false}
          onCopyPrompt={vi.fn()}
          isHandoffSubmitting={false}
          onPrepareHandoff={vi.fn()}
          onProceedToResults={vi.fn()}
          onBackToSource={vi.fn()}
          isLiveExecuting={true}
          liveExecutionError={null}
          onExecuteLiveResearch={vi.fn()}
        />
      );

      const liveBtn = screen.getByTestId('btn-execute-live-research');
      const handoffBtn = screen.getByTestId('btn-prepare-antigravity-handoff');

      expect(liveBtn).toBeDisabled();
      expect(liveBtn).toHaveTextContent('Đang khảo cứu trực tiếp...');
      expect(handoffBtn).toBeDisabled();
    });

    it('displays error banner when liveExecutionError is provided', () => {
      const errorMessage =
        '🔒 Tính năng Khảo cứu trực tiếp qua MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION flag is OFF).';

      render(
        <NotebookLMPromptStep
          currentTopic={mockTopic}
          promptArtifactType="study_guide"
          onSelectArtifactType={vi.fn()}
          customInstructions=""
          onChangeCustomInstructions={vi.fn()}
          taskPrompt="Phân tích Bát Môn"
          copiedPrompt={false}
          onCopyPrompt={vi.fn()}
          isHandoffSubmitting={false}
          onPrepareHandoff={vi.fn()}
          onProceedToResults={vi.fn()}
          onBackToSource={vi.fn()}
          isLiveExecuting={false}
          liveExecutionError={errorMessage}
          onExecuteLiveResearch={vi.fn()}
        />
      );

      const errorBanner = screen.getByTestId('live-execution-error-banner');
      expect(errorBanner).toBeInTheDocument();
      expect(errorBanner).toHaveTextContent(errorMessage);
    });
  });

  // =========================================================================
  // 2. MODAL END-TO-END FLOW (FETCH MOCKING)
  // =========================================================================
  describe('NotebookLMStudioModal Live Execution Integration', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('handles 403 Forbidden gating rejection by displaying warning banner and leaving fallback intact', async () => {
      // Mock fetch: session creation returns session-1, execute-live returns 403
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/research-sessions') {
          return {
            ok: true,
            json: async () => ({
              id: 'session-live-01',
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

      render(
        <NotebookLMStudioModal
          isOpen={true}
          onClose={vi.fn()}
          topic={mockTopic}
        />
      );

      // Navigate to Prompt Step
      const promptStepBtn = screen.getByRole('button', { name: /Bước 2.*Prompt/i });
      fireEvent.click(promptStepBtn);

      // Find and click Live Execution button
      await waitFor(() => {
        expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
      });

      const liveBtn = screen.getByTestId('btn-execute-live-research');
      fireEvent.click(liveBtn);

      // Verify error banner appears with friendly gating explanation
      await waitFor(() => {
        const errorBanner = screen.getByTestId('live-execution-error-banner');
        expect(errorBanner).toBeInTheDocument();
        expect(errorBanner).toHaveTextContent('NOTEBOOKLM_DIRECT_EXECUTION flag is OFF');
      });

      // Verify Antigravity fallback button is still functional and visible
      expect(screen.getByTestId('btn-prepare-antigravity-handoff')).toBeInTheDocument();
    });

    it('transitions to Results step on successful HTTP 200 response', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === '/api/research-sessions') {
          return {
            ok: true,
            json: async () => ({
              id: 'session-live-02',
              topicId: mockTopic.id,
              artifacts: [
                {
                  id: 'art-live-01',
                  title: 'STUDY GUIDE: Kỳ Môn Độn Giáp Toàn Thư',
                  artifactType: 'study_guide',
                  rawContent: '# Nội dung khảo cứu trực tiếp...',
                  topicId: mockTopic.id,
                  createdAt: new Date().toISOString(),
                },
              ],
            }),
          };
        }
        if (url.includes('/execute-live')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              sessionId: 'session-live-02',
              artifactId: 'art-live-01',
              artifactType: 'study_guide',
              title: 'STUDY GUIDE: Kỳ Môn Độn Giáp Toàn Thư',
              content: '# Nội dung khảo cứu trực tiếp...',
              citedSourceIds: ['src-01'],
              cleanupStatus: 'CLEANED',
              executionDurationMs: 4500,
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

      // Navigate to Prompt Step
      const promptStepBtn = screen.getByRole('button', { name: /Bước 2.*Prompt/i });
      fireEvent.click(promptStepBtn);

      await waitFor(() => {
        expect(screen.getByTestId('btn-execute-live-research')).toBeInTheDocument();
      });

      const liveBtn = screen.getByTestId('btn-execute-live-research');
      fireEvent.click(liveBtn);

      // Verify that after 200, modal transitions to Results step
      await waitFor(() => {
        expect(screen.getByTestId('artifact-locker-context-bar')).toBeInTheDocument();
      });
    });
  });
});
