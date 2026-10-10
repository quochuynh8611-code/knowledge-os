/**
 * UI Integration Test Suite: Mind Map Multi-Node Selection & Batch Operations (Phase P6a)
 *
 * Verifies:
 * 1. Single click on node card selects only that node (data-selected="true"), action bar hidden (<2).
 * 2. Modifier click (Shift/Cmd/Ctrl) toggles multi-selection:
 *    - Second node selected -> action bar appears (count >= 2).
 *    - Modifier click on selected node deselects it.
 * 3. Clicking canvas backdrop clears selection and hides action bar.
 * 4. Deselect button in action bar clears selection.
 * 5. Batch delete deletes all selected nodes in 1 atomic action and clears selection.
 * 6. Single Undo (Cmd+Z / Ctrl+Z) restores all batch-deleted nodes at once.
 * 7. Root node is preserved if included in multi-selection during batch delete.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MindMapView } from '../../src/components/mindmap/MindMapView';
import * as mindmapDocumentStorage from '../../src/lib/mindmapDocumentStorage';
import { MindMapDocumentNode } from '../../src/types/mindmapDocument';

const mockOpenTopicDetail = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: [
      {
        id: 'topic-1',
        title: 'Chủ đề 1',
        visibility: 'visible',
        parentId: null,
      },
    ],
    notes: [],
    resources: [],
    selectedTopicId: 'topic-1',
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe('Mind Map Multi-Node Selection & Batch Operations (Phase P6a)', () => {
  const mockSavedDocTree: MindMapDocumentNode = {
    id: 'doc-root',
    title: 'Document Root',
    nodeType: 'topic',
    children: [
      {
        id: 'child-1',
        title: 'Child 1',
        nodeType: 'topic',
        children: [],
      },
      {
        id: 'child-2',
        title: 'Child 2',
        nodeType: 'topic',
        children: [],
      },
      {
        id: 'child-3',
        title: 'Child 3',
        nodeType: 'note',
        children: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mindmapDocumentStorage, 'listMindMapDocuments').mockReturnValue([
      {
        id: 'doc-123',
        title: 'Batch Selection Doc',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        tags: [],
        currentVersionNumber: 1,
        totalVersionsCount: 1,
        isArchived: false,
      },
    ]);

    vi.spyOn(mindmapDocumentStorage, 'getMindMapDocumentSummary').mockReturnValue({
      id: 'doc-123',
      title: 'Batch Selection Doc',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      tags: [],
      currentVersionNumber: 1,
      totalVersionsCount: 1,
      isArchived: false,
    });

    vi.spyOn(mindmapDocumentStorage, 'getMindMapVersion').mockReturnValue({
      id: 'ver-1',
      documentId: 'doc-123',
      versionNumber: 1,
      createdAt: '2026-01-01T00:00:00Z',
      treeData: mockSavedDocTree,
      crossLinks: [],
      viewState: {
        layoutMode: 'tree_horizontal',
        collapsedNodeIds: [],
        showCrossLinks: false,
      },
    });
  });

  function openSavedDocument() {
    fireEvent.click(screen.getByTestId('btn-open-mindmap-browser'));
    fireEvent.click(screen.getByText('Batch Selection Doc'));
  }

  it('1. Single click on a node card sets selection count to 1 and does not show action bar', () => {
    render(<MindMapView />);
    openSavedDocument();

    const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    expect(node1Card).toBeInTheDocument();
    expect(node2Card).toBeInTheDocument();

    // Normal click node 1
    fireEvent.click(node1Card);

    expect(node1Card).toHaveAttribute('data-selected', 'true');
    expect(node2Card).not.toHaveAttribute('data-selected', 'true');

    // Floating batch action bar must NOT be displayed when count < 2
    expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
  });

  it('2. Modifier click (Shift/Cmd/Ctrl) toggles multi-selection and displays batch action bar for count >= 2', () => {
    render(<MindMapView />);
    openSavedDocument();

    const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

    // Normal click node 1
    fireEvent.click(node1Card);
    expect(node1Card).toHaveAttribute('data-selected', 'true');

    // Shift-click node 2
    fireEvent.click(node2Card, { shiftKey: true });
    expect(node1Card).toHaveAttribute('data-selected', 'true');
    expect(node2Card).toHaveAttribute('data-selected', 'true');

    // Floating action bar appears
    const actionBar = screen.getByTestId('mindmap-batch-action-bar');
    expect(actionBar).toBeInTheDocument();
    expect(screen.getByTestId('batch-selection-count')).toHaveTextContent('2');

    // Shift-click node 2 again to deselect it
    fireEvent.click(node2Card, { shiftKey: true });
    expect(node2Card).not.toHaveAttribute('data-selected', 'true');
    expect(node1Card).toHaveAttribute('data-selected', 'true');

    // Action bar disappears when count drops below 2
    expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
  });

  it('3. Clicking canvas backdrop or deselect button clears selection and hides action bar', () => {
    render(<MindMapView />);
    openSavedDocument();

    const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    const backdrop = screen.getByTestId('mindmap-canvas-backdrop');

    // Select 2 nodes with Cmd-click
    fireEvent.click(node1Card);
    fireEvent.click(node2Card, { metaKey: true });
    expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

    // Click backdrop
    fireEvent.click(backdrop);

    expect(node1Card).not.toHaveAttribute('data-selected', 'true');
    expect(node2Card).not.toHaveAttribute('data-selected', 'true');
    expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();

    // Re-select 2 nodes and test Deselect button in action bar
    fireEvent.click(node1Card);
    fireEvent.click(node2Card, { ctrlKey: true });
    const deselectBtn = screen.getByTestId('btn-batch-deselect');
    fireEvent.click(deselectBtn);

    expect(node1Card).not.toHaveAttribute('data-selected', 'true');
    expect(node2Card).not.toHaveAttribute('data-selected', 'true');
    expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
  });

  it('4. Batch delete removes all selected nodes in 1 atomic action and clears selection', () => {
    render(<MindMapView />);
    openSavedDocument();

    const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

    // Multi-select child-1 and child-2
    fireEvent.click(node1Card);
    fireEvent.click(node2Card, { shiftKey: true });

    const batchDeleteBtn = screen.getByTestId('btn-batch-delete');
    fireEvent.click(batchDeleteBtn);

    // Both nodes should be removed from DOM
    expect(document.querySelector('[data-node-id="child-1"]')).toBeNull();
    expect(document.querySelector('[data-node-id="child-2"]')).toBeNull();
    // child-3 and root remain
    expect(document.querySelector('[data-node-id="child-3"]')).not.toBeNull();
    expect(document.querySelector('[data-node-id="doc-root"]')).not.toBeNull();

    // Action bar disappears
    expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
  });

  it('5. Single Undo restores all batch-deleted nodes in one step', () => {
    render(<MindMapView />);
    openSavedDocument();

    const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

    // Multi-select child-1 and child-2 and delete
    fireEvent.click(node1Card);
    fireEvent.click(node2Card, { shiftKey: true });
    fireEvent.click(screen.getByTestId('btn-batch-delete'));

    expect(document.querySelector('[data-node-id="child-1"]')).toBeNull();
    expect(document.querySelector('[data-node-id="child-2"]')).toBeNull();

    // Trigger single Undo via Cmd+Z
    fireEvent.keyDown(window, { key: 'z', metaKey: true });

    // Both nodes restored simultaneously
    expect(document.querySelector('[data-node-id="child-1"]')).not.toBeNull();
    expect(document.querySelector('[data-node-id="child-2"]')).not.toBeNull();
  });

  it('6. Preserves root node if root was included in multi-selection during batch delete', () => {
    render(<MindMapView />);
    openSavedDocument();

    const rootCard = document.querySelector('[data-node-id="doc-root"]') as HTMLElement;
    const node3Card = document.querySelector('[data-node-id="child-3"]') as HTMLElement;

    // Multi-select root and child-3
    fireEvent.click(rootCard);
    fireEvent.click(node3Card, { shiftKey: true });

    expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-batch-delete'));

    // child-3 is deleted, root is protected
    expect(document.querySelector('[data-node-id="child-3"]')).toBeNull();
    expect(document.querySelector('[data-node-id="doc-root"]')).not.toBeNull();
  });

  describe('Phase P6b.1 — Keyboard Delete / Backspace & Pan Movement Threshold', () => {
    it('7. Pressing Delete key triggers atomic batch delete when count >= 2', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Multi-select child-1 and child-2
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // Press Delete on canvas
      fireEvent.keyDown(canvas, { key: 'Delete' });

      // Both nodes deleted atomically without opening single confirm modal
      expect(document.querySelector('[data-node-id="child-1"]')).toBeNull();
      expect(document.querySelector('[data-node-id="child-2"]')).toBeNull();
      expect(document.querySelector('[data-node-id="child-3"]')).not.toBeNull();
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
      expect(screen.queryByTestId('confirm-delete-node-modal')).toBeNull();
    });

    it('8. Pressing Backspace key triggers atomic batch delete and supports one-step undo', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Multi-select child-1 and child-2
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });

      // Press Backspace on canvas
      fireEvent.keyDown(canvas, { key: 'Backspace' });

      expect(document.querySelector('[data-node-id="child-1"]')).toBeNull();
      expect(document.querySelector('[data-node-id="child-2"]')).toBeNull();

      // One-step undo via Cmd+Z
      fireEvent.keyDown(window, { key: 'z', metaKey: true });

      expect(document.querySelector('[data-node-id="child-1"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="child-2"]')).not.toBeNull();
    });

    it('9. Preserves single-node delete flow (opening confirm modal) when count < 2', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Single select child-1 (count = 1 < 2)
      fireEvent.click(node1Card);
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();

      // Press Delete on canvas
      fireEvent.keyDown(canvas, { key: 'Delete' });

      // Single-node delete confirmation modal SHOULD be displayed
      expect(screen.getByTestId('confirm-delete-node-modal')).toBeInTheDocument();
      // Node is NOT deleted yet
      expect(document.querySelector('[data-node-id="child-1"]')).not.toBeNull();
    });

    it('10. Preserves root node if root was selected alongside child node during keyboard delete', () => {
      render(<MindMapView />);
      openSavedDocument();

      const rootCard = document.querySelector('[data-node-id="doc-root"]') as HTMLElement;
      const node3Card = document.querySelector('[data-node-id="child-3"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Multi-select root and child-3
      fireEvent.click(rootCard);
      fireEvent.click(node3Card, { shiftKey: true });

      fireEvent.keyDown(canvas, { key: 'Delete' });

      expect(document.querySelector('[data-node-id="child-3"]')).toBeNull();
      expect(document.querySelector('[data-node-id="doc-root"]')).not.toBeNull();
    });

    it('11. Ignores Delete/Backspace shortcut when target is an editable control (input/textarea/modal)', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      const searchInput = screen.getByPlaceholderText('Tìm nút trong sơ đồ...');

      // Multi-select child-1 and child-2
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });

      // Press Delete while focus/event target is inside searchInput
      fireEvent.keyDown(searchInput, { key: 'Delete' });

      // Nodes must NOT be deleted
      expect(document.querySelector('[data-node-id="child-1"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="child-2"]')).not.toBeNull();
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();
    });

    it('12. Pan gesture exceeding movement threshold does NOT clear selection on mouseup/click', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Multi-select child-1 and child-2
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // Simulate Pan drag gesture: pointerDown -> pointerMove (dx=50, dy=50 > 5px threshold) -> pointerUp -> click
      fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150 });
      fireEvent.pointerUp(canvas);
      fireEvent.click(canvas);

      // Selection must be PRESERVED
      expect(node1Card).toHaveAttribute('data-selected', 'true');
      expect(node2Card).toHaveAttribute('data-selected', 'true');
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();
    });

    it('13. Real click on backdrop (within movement threshold) clears selection', () => {
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      const canvas = screen.getByTestId('mindmap-canvas-backdrop');

      // Multi-select child-1 and child-2
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // Real click without moving (dx=0, dy=0 <= 5px threshold)
      fireEvent.pointerDown(canvas, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerUp(canvas);
      fireEvent.click(canvas);

      // Selection must be CLEARED
      expect(node1Card).not.toHaveAttribute('data-selected', 'true');
      expect(node2Card).not.toHaveAttribute('data-selected', 'true');
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
    });
  });
});
