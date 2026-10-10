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

let mockTopics: any[] = [
  {
    id: 'topic-1',
    title: 'Chủ đề 1',
    visibility: 'visible',
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = 'topic-1';
const mockOpenTopicDetail = vi.fn();

vi.mock('../../src/context/DataContext', () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    selectedTopicId: mockSelectedTopicId,
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
        children: [
          {
            id: 'grandchild-1',
            title: 'Grandchild 1',
            nodeType: 'note',
            children: [],
          },
        ],
      },
      {
        id: 'child-2',
        title: 'Child 2',
        nodeType: 'topic',
        children: [
          {
            id: 'grandchild-2',
            title: 'Grandchild 2',
            nodeType: 'note',
            children: [],
          },
        ],
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
    mockTopics = [
      {
        id: 'topic-1',
        title: 'Chủ đề 1',
        visibility: 'visible',
        parentId: null,
      },
    ];
    mockSelectedTopicId = 'topic-1';
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

  describe('Phase P6b.2 — Selection-Aware View-State Operations & Context Isolation', () => {
    it('14. AC-01: Renders Batch Collapse and Batch Expand buttons on Floating Action Bar when count >= 2', () => {
      // Given: Người dùng mở saved document
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

      // When: Chọn 2 node bằng Shift-click
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });

      // Then: Floating Action Bar phải hiển thị nút "Thu gọn" và "Mở rộng"
      const batchCollapseBtn = screen.getByTestId('btn-batch-collapse');
      const batchExpandBtn = screen.getByTestId('btn-batch-expand');
      expect(batchCollapseBtn).toBeInTheDocument();
      expect(batchExpandBtn).toBeInTheDocument();
    });

    it('15. AC-02 & AC-03: Clicking Batch Collapse collapses selected nodes with children, Batch Expand expands them', () => {
      // Given: Người dùng mở saved document và các nhánh con đang hiển thị
      render(<MindMapView />);
      openSavedDocument();

      expect(document.querySelector('[data-node-id="grandchild-1"]')).toBeInTheDocument();
      expect(document.querySelector('[data-node-id="grandchild-2"]')).toBeInTheDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

      // When: Chọn child-1 và child-2 rồi nhấn "Thu gọn các nhánh"
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });

      const batchCollapseBtn = screen.getByTestId('btn-batch-collapse');
      fireEvent.click(batchCollapseBtn);

      // Then: grandchild-1 và grandchild-2 bị ẩn khỏi DOM
      expect(document.querySelector('[data-node-id="grandchild-1"]')).toBeNull();
      expect(document.querySelector('[data-node-id="grandchild-2"]')).toBeNull();

      // When: Nhấn "Mở rộng các nhánh"
      const batchExpandBtn = screen.getByTestId('btn-batch-expand');
      fireEvent.click(batchExpandBtn);

      // Then: grandchild-1 và grandchild-2 xuất hiện trở lại trong DOM
      expect(document.querySelector('[data-node-id="grandchild-1"]')).toBeInTheDocument();
      expect(document.querySelector('[data-node-id="grandchild-2"]')).toBeInTheDocument();
    });

    it('16. Open Decision 1: Batch Collapse ignores leaf nodes without children', () => {
      // Given: child-1 có con, child-3 là leaf node không có con
      render(<MindMapView />);
      openSavedDocument();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node3Card = document.querySelector('[data-node-id="child-3"]') as HTMLElement;

      // When: Chọn child-1 và child-3 rồi nhấn "Thu gọn"
      fireEvent.click(node1Card);
      fireEvent.click(node3Card, { shiftKey: true });

      const batchCollapseBtn = screen.getByTestId('btn-batch-collapse');
      fireEvent.click(batchCollapseBtn);

      // Then: child-1 bị thu gọn (grandchild-1 bị ẩn), child-3 vẫn hiển thị bình thường
      expect(document.querySelector('[data-node-id="grandchild-1"]')).toBeNull();
      expect(document.querySelector('[data-node-id="child-3"]')).toBeInTheDocument();
    });

    it('17. AC-04: Batch Collapse and Batch Expand do not mutate treeData, do not set isDirty, and do not record undo history', () => {
      // Given: Document vừa mở, trạng thái clean, undo button disabled
      render(<MindMapView />);
      openSavedDocument();

      const undoBtn = screen.getByTestId('mindmap-undo-button');
      expect(undoBtn).toBeDisabled();
      expect(screen.queryByTestId('unsaved-changes-badge')).toBeNull();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

      // When: Thực hiện Batch Collapse
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });
      fireEvent.click(screen.getByTestId('btn-batch-collapse'));

      // Then: Undo button vẫn disabled, isDirty không bị bật
      expect(undoBtn).toBeDisabled();
      expect(screen.queryByTestId('unsaved-changes-badge')).toBeNull();

      // When: Thực hiện Batch Expand
      fireEvent.click(screen.getByTestId('btn-batch-expand'));

      // Then: Undo button vẫn disabled, isDirty vẫn là false
      expect(undoBtn).toBeDisabled();
      expect(screen.queryByTestId('unsaved-changes-badge')).toBeNull();
    });

    it('18. AC-05: Prunes stale collapsed IDs after batch delete so deleted IDs are not persisted into version snapshot', () => {
      // Given: child-1 ban đầu đang bị thu gọn (collapsedNodeIds chứa "child-1")
      vi.spyOn(mindmapDocumentStorage, 'getMindMapVersion').mockReturnValueOnce({
        id: 'ver-1',
        documentId: 'doc-123',
        versionNumber: 1,
        createdAt: '2026-01-01T00:00:00Z',
        treeData: mockSavedDocTree,
        crossLinks: [],
        viewState: {
          layoutMode: 'tree_horizontal',
          collapsedNodeIds: ['child-1'],
          showCrossLinks: false,
        },
      });

      const appendVersionSpy = vi.spyOn(mindmapDocumentStorage, 'appendMindMapVersion');

      render(<MindMapView />);
      openSavedDocument();

      // child-1 bị thu gọn nên grandchild-1 không hiển thị
      expect(document.querySelector('[data-node-id="grandchild-1"]')).toBeNull();

      const node1Card = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const node2Card = document.querySelector('[data-node-id="child-2"]') as HTMLElement;

      // When: Chọn child-1 và child-2 rồi thực hiện xóa hàng loạt
      fireEvent.click(node1Card);
      fireEvent.click(node2Card, { shiftKey: true });
      fireEvent.click(screen.getByTestId('btn-batch-delete'));

      // child-1 và child-2 đã bị xóa khỏi DOM
      expect(document.querySelector('[data-node-id="child-1"]')).toBeNull();
      expect(document.querySelector('[data-node-id="child-2"]')).toBeNull();

      // When: Lưu version mới
      fireEvent.click(screen.getByTestId('btn-save-mindmap'));
      const summaryInput = screen.getByTestId('input-change-summary');
      fireEvent.change(summaryInput, { target: { value: 'Xóa 2 nhánh' } });
      fireEvent.click(screen.getByTestId('btn-confirm-save-doc'));

      // Then: appendMindMapVersion được gọi và viewState.collapsedNodeIds KHÔNG được chứa "child-1" đã bị xóa
      expect(appendVersionSpy).toHaveBeenCalled();
      const lastCallArg = appendVersionSpy.mock.calls[appendVersionSpy.mock.calls.length - 1][0];
      expect(lastCallArg.viewState?.collapsedNodeIds).not.toContain('child-1');
    });

    it('19. AC-06: Context Isolation: Resets selectedNodeIds when switching active topic in Live Mode', () => {
      // Given: Topic-1 có 2 node trong Live Mode
      mockTopics = [
        {
          id: 'topic-1',
          title: 'Chủ đề 1',
          visibility: 'visible',
          parentId: null,
          links: [{ id: 'l1', sourceId: 'topic-1', targetId: 'topic-1-sub', linkType: 'prerequisite', strength: 5 }],
        },
        {
          id: 'topic-1-sub',
          title: 'Nhánh con 1',
          visibility: 'visible',
          parentId: 'topic-1',
          links: [],
        },
        {
          id: 'topic-2',
          title: 'Chủ đề 2',
          visibility: 'visible',
          parentId: null,
          links: [],
        },
      ];
      render(<MindMapView />);

      const rootNode = document.querySelector('[data-node-id="topic-1"]') as HTMLElement;
      const subNode = document.querySelector('[data-node-id="topic-1-sub"]') as HTMLElement;
      expect(rootNode).toBeInTheDocument();
      expect(subNode).toBeInTheDocument();

      // Multi-select 2 nodes in topic-1 -> Action bar appears
      fireEvent.click(rootNode);
      fireEvent.click(subNode, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // When: Chuyển sang topic-2 qua topic select dropdown
      const topicSelect = screen.getByLabelText('Chọn chủ đề gốc');
      fireEvent.change(topicSelect, { target: { value: 'topic-2' } });

      // Then: Action bar phải biến mất và selectedNodeIds phải được reset hoàn toàn
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
      expect(document.querySelector('[data-selected="true"]')).toBeNull();
    });

    it('20. AC-07 & AC-08: Context Isolation: Resets selectedNodeIds when switching between live mode and saved document', () => {
      // Given: Ở Live Mode, chọn 2 node để action bar xuất hiện
      mockTopics = [
        {
          id: 'topic-1',
          title: 'Chủ đề 1',
          visibility: 'visible',
          parentId: null,
          links: [{ id: 'l1', sourceId: 'topic-1', targetId: 'topic-1-sub', linkType: 'prerequisite', strength: 5 }],
        },
        {
          id: 'topic-1-sub',
          title: 'Nhánh con 1',
          visibility: 'visible',
          parentId: 'topic-1',
          links: [],
        },
      ];
      render(<MindMapView />);

      const rootNode = document.querySelector('[data-node-id="topic-1"]') as HTMLElement;
      const subNode = document.querySelector('[data-node-id="topic-1-sub"]') as HTMLElement;
      fireEvent.click(rootNode);
      fireEvent.click(subNode, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // When: Mở Saved Document
      openSavedDocument();

      // Then: Selection từ Live Mode không được rò rỉ sang Saved Document
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
      expect(document.querySelector('[data-selected="true"]')).toBeNull();

      // When: Chọn 2 node trong Saved Document
      const child1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
      const child2 = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
      fireEvent.click(child1);
      fireEvent.click(child2, { shiftKey: true });
      expect(screen.getByTestId('mindmap-batch-action-bar')).toBeInTheDocument();

      // When: Quay về Live Mode
      fireEvent.click(screen.getByTestId('btn-return-live-mode'));

      // Then: Selection từ Saved Document bị xóa hoàn toàn, action bar không xuất hiện
      expect(screen.queryByTestId('mindmap-batch-action-bar')).toBeNull();
      expect(document.querySelector('[data-selected="true"]')).toBeNull();
    });
  });
});
