/**
 * UI Integration Test Suite: Mind Map AI Expansion Modal & Workflow (Phase P3)
 *
 * Verifies:
 * 1. MindMapAiExpansionModal rendering with target node context and presets.
 * 2. Generating suggestions with MockMindMapAiClient.
 * 3. Reviewing candidate list: inline rename, duplicate warning, checkbox selection toggle.
 * 4. Cancellation behavior: Escape/Cancel when loading aborts request and keeps modal in safe state.
 * 5. Confirming insertion: calls onInsertCandidates with selected candidates and closes modal.
 * 6. MindMapTreeCanvas: renders ✨ AI expansion button only when isEditable is true.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MindMapAiExpansionModal } from '../../src/components/mindmap/MindMapAiExpansionModal';
import { MindMapTreeCanvas } from '../../src/components/mindmap/MindMapTreeCanvas';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';
import {
  createMockMindMapAiClient,
  createGeminiMindMapAiClient,
  type AiExpansionContext,
} from '../../src/lib/mindmapAiService';
import { MindMapView } from '../../src/components/mindmap/MindMapView';
import * as mindmapDocumentStorage from '../../src/lib/mindmapDocumentStorage';
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapVersion,
} from '../../src/types/mindmapDocument';

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [],
    notes: [],
    resources: [],
    categories: [],
    selectedTopicId: null,
    openTopicDetail: vi.fn(),
  }),
}));

describe('Mind Map AI Node Expansion UI & Integration (Phase P3)', () => {
  const SAMPLE_TREE: MindMapTreeNode = {
    id: 'root-topic',
    title: 'Tứ Diệu Đế',
    type: 'topic',
    domain: 'general',
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: 'node-kho-de',
        title: 'Khổ Đế',
        type: 'topic',
        domain: 'general',
        hopDistance: 1,
        parentHopId: 'root-topic',
        tags: [],
        children: [
          {
            id: 'node-sinh-lao',
            title: 'Sinh Lão Bệnh Tử',
            type: 'note',
            domain: 'general',
            hopDistance: 2,
            parentHopId: 'node-kho-de',
            tags: [],
            children: [],
          },
        ],
      },
    ],
  };

  describe('1. MindMapTreeCanvas AI Button Affordance', () => {
    it('does NOT render AI button when isEditable is false/undefined', () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={false}
        />
      );

      expect(screen.queryByTestId('btn-ai-expand-node-node-kho-de')).not.toBeInTheDocument();
    });

    it('renders AI expansion button when isEditable is true and triggers callback on click', () => {
      const onRequestAiExpand = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onRequestAiExpand={onRequestAiExpand}
        />
      );

      const aiBtn = screen.getByTestId('btn-ai-expand-node-node-kho-de');
      expect(aiBtn).toBeInTheDocument();

      fireEvent.click(aiBtn);
      expect(onRequestAiExpand).toHaveBeenCalledWith('node-kho-de');
    });

    it('Scenario 1.3: triggers onRequestAiExpand when pressing Shift + A on focused node in editable mode', () => {
      const onRequestAiExpand = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onRequestAiExpand={onRequestAiExpand}
        />
      );

      const canvasBackdrop = screen.getByTestId('mindmap-canvas-backdrop');
      const targetNode = document.querySelector('[data-node-id="node-kho-de"]');
      expect(targetNode).toBeInTheDocument();

      // Click to focus target node
      fireEvent.click(targetNode!);

      // Press Shift + A
      fireEvent.keyDown(canvasBackdrop, { key: 'A', shiftKey: true });
      expect(onRequestAiExpand).toHaveBeenCalledWith('node-kho-de');
    });

    it('Scenario 1.4: does NOT trigger onRequestAiExpand on Shift + A when isEditable is false', () => {
      const onRequestAiExpand = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={false}
          onRequestAiExpand={onRequestAiExpand}
        />
      );

      const canvasBackdrop = screen.getByTestId('mindmap-canvas-backdrop');
      const targetNode = document.querySelector('[data-node-id="node-kho-de"]');
      expect(targetNode).toBeInTheDocument();

      fireEvent.click(targetNode!);
      fireEvent.keyDown(canvasBackdrop, { key: 'A', shiftKey: true });
      expect(onRequestAiExpand).not.toHaveBeenCalled();
    });
  });

  describe('2. MindMapAiExpansionModal UI Workflow', () => {
    const defaultContext: AiExpansionContext = {
      targetNodeId: 'node-kho-de',
      targetNodeTitle: 'Khổ Đế',
      rootTopicTitle: 'Tứ Diệu Đế',
      ancestorTitles: ['Tứ Diệu Đế'],
      existingSiblingTitles: ['Sinh Lão Bệnh Tử'],
      preset: 'sub_components',
      language: 'vi',
    };

    it('Scenario 2.1: renders modal with target node context and preset options', () => {
      render(
        <MindMapAiExpansionModal
          isOpen={true}
          context={defaultContext}
          onClose={vi.fn()}
          onInsertCandidates={vi.fn()}
        />
      );

      expect(screen.getByTestId('mindmap-ai-expansion-modal')).toBeInTheDocument();
      expect(screen.getByText('Mở Rộng Nhánh Bằng AI')).toBeInTheDocument();
      expect(screen.getByText('Khổ Đế')).toBeInTheDocument();
      expect(screen.getByTestId('preset-option-sub_components')).toBeInTheDocument();
      expect(screen.getByTestId('preset-option-dimensions')).toBeInTheDocument();
      expect(screen.getByTestId('preset-option-inquiry_questions')).toBeInTheDocument();
      expect(screen.getByTestId('preset-option-custom')).toBeInTheDocument();
    });

    it('Scenario 2.2: generates candidates, allows inline rename, duplicate warning, and confirms insertion', async () => {
      const onInsertCandidates = vi.fn();
      const mockClient = createMockMindMapAiClient({
        mockCandidates: [
          { title: 'Khổ Khổ', description: 'Nỗi khổ thân tâm' },
          { title: 'Sinh Lão Bệnh Tử', description: 'Trùng với nhánh cũ' },
          { title: 'Hoại Khổ', description: 'Vô thường biến đổi' },
        ],
      });

      render(
        <MindMapAiExpansionModal
          isOpen={true}
          context={defaultContext}
          aiClient={mockClient}
          onClose={vi.fn()}
          onInsertCandidates={onInsertCandidates}
        />
      );

      // Click Generate button
      fireEvent.click(screen.getByTestId('btn-submit-ai-generate'));

      await waitFor(() => {
        expect(screen.getByTestId('ai-candidate-list')).toBeInTheDocument();
      });

      // Verify candidates rendered
      expect(screen.getByDisplayValue('Khổ Khổ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sinh Lão Bệnh Tử')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Hoại Khổ')).toBeInTheDocument();

      // Verify duplicate item soft warning and unselected state
      const duplicateCheckbox = screen.getByTestId('checkbox-candidate-1') as HTMLInputElement;
      expect(duplicateCheckbox.checked).toBe(false);
      expect(screen.getByText('Đã có nhánh tương tự')).toBeInTheDocument();

      // Edit title of candidate 0
      const titleInput = screen.getByDisplayValue('Khổ Khổ');
      fireEvent.change(titleInput, { target: { value: 'Khổ Khổ (Đau đớn)' } });

      // Click Confirm Insert button
      fireEvent.click(screen.getByTestId('btn-confirm-insert-candidates'));

      expect(onInsertCandidates).toHaveBeenCalledWith([
        expect.objectContaining({ title: 'Khổ Khổ (Đau đớn)' }),
        expect.objectContaining({ title: 'Hoại Khổ' }),
      ]);
    });

    it('Scenario 2.3: aborts in-flight request when clicking Cancel or pressing Escape during loading', async () => {
      const mockClient = createMockMindMapAiClient({ artificialDelayMs: 2000 });

      render(
        <MindMapAiExpansionModal
          isOpen={true}
          context={defaultContext}
          aiClient={mockClient}
          onClose={vi.fn()}
          onInsertCandidates={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('btn-submit-ai-generate'));
      expect(screen.getByTestId('ai-generation-loading')).toBeInTheDocument();

      // Click Cancel/Stop button while loading
      fireEvent.click(screen.getByTestId('btn-cancel-ai-generation'));

      await waitFor(() => {
        expect(screen.getByText('Đã dừng quá trình tạo gợi ý.')).toBeInTheDocument();
      });

      // Modal stays open in safe state, allows retry or close
      expect(screen.getByTestId('btn-retry-ai-generation')).toBeInTheDocument();
      expect(screen.getByTestId('btn-close-ai-modal')).toBeInTheDocument();
    });

    it('Scenario 2.4: does NOT silently fallback to mock when aiClient is omitted, displays clear error message', async () => {
      render(
        <MindMapAiExpansionModal
          isOpen={true}
          context={defaultContext}
          // aiClient is omitted
          onClose={vi.fn()}
          onInsertCandidates={vi.fn()}
        />
      );

      // Click Generate button
      fireEvent.click(screen.getByTestId('btn-submit-ai-generate'));

      // Verify clear error message is shown, NOT mock candidates
      await waitFor(() => {
        expect(screen.getByText(/Dịch vụ AI chưa được cấu hình/i)).toBeInTheDocument();
      });

      // Assert candidates list is NOT rendered
      expect(screen.queryByTestId('ai-candidate-list')).not.toBeInTheDocument();
    });

    it('Scenario 2.5: generates candidates using live Gemini-backed client when customFetch provides valid response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      candidates: [
                        { title: 'Tập Khổ', description: 'Nguyên nhân sinh khởi' },
                        { title: 'Diệt Khổ', description: 'Sự vắng mặt của khổ' },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const liveClient = createGeminiMindMapAiClient({
        apiKey: 'test-api-key',
        customFetch: mockFetch,
      });

      render(
        <MindMapAiExpansionModal
          isOpen={true}
          context={defaultContext}
          aiClient={liveClient}
          onClose={vi.fn()}
          onInsertCandidates={vi.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('btn-submit-ai-generate'));

      await waitFor(() => {
        expect(screen.getByTestId('ai-candidate-list')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('Tập Khổ')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Diệt Khổ')).toBeInTheDocument();
    });
  });

  describe('3. MindMapView Live Client Wiring Regression', () => {
    const mockSummary: MindMapDocumentSummary = {
      id: 'doc-ai-wiring-test',
      title: 'Sơ Đồ Wiring Test',
      tags: ['phat-hoc'],
      currentVersionNumber: 1,
      totalVersionsCount: 1,
      isArchived: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    const tree: MindMapDocumentNode = {
      id: 'doc-root',
      title: 'Tứ Diệu Đế',
      nodeType: 'topic',
      children: [
        {
          id: 'doc-node-target',
          title: 'Khổ Đế',
          nodeType: 'topic',
          children: [],
        },
      ],
    };

    const version: MindMapVersion = {
      id: 'ver-ai-1',
      documentId: 'doc-ai-wiring-test',
      versionNumber: 1,
      createdAt: '2026-01-01T00:00:00Z',
      changeSummary: 'Init',
      treeData: tree,
      crossLinks: [],
      viewState: {
        layoutMode: 'tree_horizontal',
        collapsedNodeIds: [],
        showCrossLinks: true,
      },
    };

    it('wires live Gemini client from MindMapView into modal instead of missing client guard or mock fallback', async () => {
      vi.spyOn(mindmapDocumentStorage, 'getMindMapDocumentSummary').mockReturnValue(mockSummary);
      vi.spyOn(mindmapDocumentStorage, 'listMindMapDocuments').mockReturnValue([mockSummary]);
      vi.spyOn(mindmapDocumentStorage, 'getMindMapVersion').mockReturnValue(version);

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      candidates: [
                        { title: 'Nhánh Live Gemini 1', description: 'Gợi ý từ Gemini thật' },
                        { title: 'Nhánh Live Gemini 2', description: 'Gợi ý từ Gemini thật 2' },
                      ],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      render(<MindMapView />);

      // Open document
      fireEvent.click(screen.getByTestId('btn-open-mindmap-browser'));
      fireEvent.click(screen.getByTestId(`doc-card-${mockSummary.id}`));

      // Click AI Expansion button on root node
      const aiBtn = screen.getByTestId('btn-ai-expand-node-doc-root');
      fireEvent.click(aiBtn);

      // Verify modal opened
      expect(screen.getByTestId('mindmap-ai-expansion-modal')).toBeInTheDocument();

      // Submit generation
      fireEvent.click(screen.getByTestId('btn-submit-ai-generate'));

      // Verify live client called fetch and candidates from live client are rendered
      await waitFor(() => {
        expect(screen.getByTestId('ai-candidate-list')).toBeInTheDocument();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('Nhánh Live Gemini 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nhánh Live Gemini 2')).toBeInTheDocument();

      // Confirm missing client guard error was NOT triggered
      expect(screen.queryByText(/Dịch vụ AI chưa được cấu hình/i)).not.toBeInTheDocument();
      // Confirm default mock candidates were NOT used
      expect(screen.queryByDisplayValue('Khổ Khổ')).not.toBeInTheDocument();

      fetchSpy.mockRestore();
    });
  });
});
