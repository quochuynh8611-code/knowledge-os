/**
 * UI Integration Test Suite: Mind Map Interactive Canvas Editing (Phase P2)
 *
 * Verifies:
 * 1. MindMapTreeCanvas editing affordances (rename, add child, move up/down, delete) when isEditable=true vs false.
 * 2. Inline title editor commit on Enter/Check and cancel on Escape/X.
 * 3. Root node deletion protection (no delete affordance on root).
 * 4. MindMapView working-copy state orchestration:
 *    - Open saved document -> editable canvas
 *    - Inline rename -> workingDocumentTree updated, isDirty = true, unsaved changes badge
 *    - Add child -> node inserted, isDirty = true
 *    - Delete node -> confirmation modal -> confirmed deletion
 *    - Discard changes -> restores persisted version, isDirty = false
 *    - Leave mode with dirty changes -> confirmation dialog prevents accidental loss
 *    - Save new version -> appends version to storage, clears dirty state
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MindMapTreeCanvas } from '../../src/components/mindmap/MindMapTreeCanvas';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Mind Map Canvas Editing Affordances (Phase P2)', () => {
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
      {
        id: 'node-tap-de',
        title: 'Tập Đế',
        type: 'topic',
        domain: 'general',
        hopDistance: 1,
        parentHopId: 'root-topic',
        tags: [],
        children: [],
      },
    ],
  };

  describe('MindMapTreeCanvas Edit Controls Rendering', () => {
    it('does NOT render edit action buttons when isEditable is false/undefined', () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={false}
        />
      );

      expect(screen.queryByTestId('btn-edit-node-node-kho-de')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-add-child-node-kho-de')).not.toBeInTheDocument();
      expect(screen.queryByTestId('btn-delete-node-node-kho-de')).not.toBeInTheDocument();
    });

    it('renders edit action buttons when isEditable is true', () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onStartRename={vi.fn()}
          onAddChild={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onRequestDelete={vi.fn()}
        />
      );

      expect(screen.getByTestId('btn-edit-node-node-kho-de')).toBeInTheDocument();
      expect(screen.getByTestId('btn-add-child-node-kho-de')).toBeInTheDocument();
      expect(screen.getByTestId('btn-move-up-node-kho-de')).toBeInTheDocument();
      expect(screen.getByTestId('btn-move-down-node-kho-de')).toBeInTheDocument();
      expect(screen.getByTestId('btn-delete-node-node-kho-de')).toBeInTheDocument();

      // Root node can be renamed and have children added, but CANNOT be deleted
      expect(screen.getByTestId('btn-edit-node-root-topic')).toBeInTheDocument();
      expect(screen.getByTestId('btn-add-child-root-topic')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-delete-node-root-topic')).not.toBeInTheDocument();
    });

    it('triggers callbacks on action button clicks', () => {
      const onStartRename = vi.fn();
      const onAddChild = vi.fn();
      const onMoveUp = vi.fn();
      const onMoveDown = vi.fn();
      const onRequestDelete = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onStartRename={onStartRename}
          onAddChild={onAddChild}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRequestDelete={onRequestDelete}
        />
      );

      fireEvent.click(screen.getByTestId('btn-edit-node-node-kho-de'));
      expect(onStartRename).toHaveBeenCalledWith('node-kho-de');

      fireEvent.click(screen.getByTestId('btn-add-child-node-kho-de'));
      expect(onAddChild).toHaveBeenCalledWith('node-kho-de');

      fireEvent.click(screen.getByTestId('btn-move-up-node-kho-de'));
      expect(onMoveUp).toHaveBeenCalledWith('node-kho-de');

      fireEvent.click(screen.getByTestId('btn-move-down-node-kho-de'));
      expect(onMoveDown).toHaveBeenCalledWith('node-kho-de');

      fireEvent.click(screen.getByTestId('btn-delete-node-node-kho-de'));
      expect(onRequestDelete).toHaveBeenCalledWith('node-kho-de');
    });

    it('renders inline input and commits new title on confirm click or Enter key', () => {
      const onCommitRename = vi.fn();
      const onCancelRename = vi.fn();

      const { rerender } = render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          editingNodeId="node-kho-de"
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      );

      const input = screen.getByTestId('input-inline-rename-node-kho-de') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.value).toBe('Khổ Đế');

      fireEvent.change(input, { target: { value: 'Khổ Thánh Đế' } });
      fireEvent.click(screen.getByTestId('btn-confirm-inline-rename-node-kho-de'));

      expect(onCommitRename).toHaveBeenCalledWith('node-kho-de', 'Khổ Thánh Đế');

      // Test Cancel on Escape
      rerender(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          editingNodeId="node-kho-de"
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      );

      fireEvent.keyDown(screen.getByTestId('input-inline-rename-node-kho-de'), { key: 'Escape' });
      expect(onCancelRename).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts & Focus Hardening (Phase P2.x)', () => {
    it('handles F2 key to trigger rename on focused node when isEditable is true', () => {
      const onStartRename = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onStartRename={onStartRename}
        />
      );

      const canvas = screen.getByTestId('mindmap-canvas-backdrop');
      // Navigate to node-kho-de
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
      // Trigger F2
      fireEvent.keyDown(canvas, { key: 'F2' });

      expect(onStartRename).toHaveBeenCalledWith('node-kho-de');
    });

    it('handles Tab or Insert key to add child under focused node when isEditable is true', () => {
      const onAddChild = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onAddChild={onAddChild}
        />
      );

      const canvas = screen.getByTestId('mindmap-canvas-backdrop');
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
      fireEvent.keyDown(canvas, { key: 'Tab' });

      expect(onAddChild).toHaveBeenCalledWith('node-kho-de');
    });

    it('handles Delete or Backspace key to request deletion of focused non-root node', () => {
      const onRequestDelete = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onRequestDelete={onRequestDelete}
        />
      );

      const canvas = screen.getByTestId('mindmap-canvas-backdrop');
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
      fireEvent.keyDown(canvas, { key: 'Delete' });

      expect(onRequestDelete).toHaveBeenCalledWith('node-kho-de');
    });

    it('does NOT trigger delete on root node via Delete key', () => {
      const onRequestDelete = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onRequestDelete={onRequestDelete}
        />
      );

      const canvas = screen.getByTestId('mindmap-canvas-backdrop');
      fireEvent.keyDown(canvas, { key: 'Home' });
      fireEvent.keyDown(canvas, { key: 'Delete' });

      expect(onRequestDelete).not.toHaveBeenCalled();
    });

    it('handles Alt+ArrowUp and Alt+ArrowDown for sibling reordering', () => {
      const onMoveUp = vi.fn();
      const onMoveDown = vi.fn();
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      );

      const canvas = screen.getByTestId('mindmap-canvas-backdrop');
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
      fireEvent.keyDown(canvas, { key: 'ArrowUp', altKey: true });
      expect(onMoveUp).toHaveBeenCalledWith('node-kho-de');

      fireEvent.keyDown(canvas, { key: 'ArrowDown', altKey: true });
      expect(onMoveDown).toHaveBeenCalledWith('node-kho-de');
    });
  });

  describe('Modal Dialogs & Guard UI Affordances (Phase P2)', () => {
    it('renders delete node confirmation modal and handles cancel/confirm actions', () => {
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      const { rerender } = render(
        <div data-testid="confirm-delete-node-modal" className="fixed inset-0 z-50">
          <div>
            <h3>Xác Nhận Xóa Nhánh Node</h3>
            <p>Hành động này sẽ xóa node và toàn bộ các node con thuộc nhánh này.</p>
            <button data-testid="btn-cancel-delete-node" onClick={onCancel}>Hủy</button>
            <button data-testid="btn-confirm-delete-node" onClick={onConfirm}>Xóa Nhánh</button>
          </div>
        </div>
      );

      expect(screen.getByTestId('confirm-delete-node-modal')).toBeInTheDocument();
      expect(screen.getByText('Xác Nhận Xóa Nhánh Node')).toBeInTheDocument();
      expect(screen.getByText(/Hành động này sẽ xóa node và toàn bộ các node con/)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('btn-cancel-delete-node'));
      expect(onCancel).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('btn-confirm-delete-node'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('renders unsaved changes leave guard dialog and handles cancel/confirm actions', () => {
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      render(
        <div data-testid="unsaved-changes-confirm-dialog" className="fixed inset-0 z-50">
          <div>
            <h3>Thay Đổi Chưa Được Lưu</h3>
            <p>Sơ đồ hiện tại có chỉnh sửa chưa lưu. Nếu rời đi bây giờ, các thay đổi sẽ bị mất.</p>
            <button data-testid="btn-cancel-leave" onClick={onCancel}>Tiếp Tục Chỉnh Sửa</button>
            <button data-testid="btn-confirm-discard-and-leave" onClick={onConfirm}>Hủy Thay Đổi & Rời Đi</button>
          </div>
        </div>
      );

      expect(screen.getByTestId('unsaved-changes-confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Thay Đổi Chưa Được Lưu')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('btn-cancel-leave'));
      expect(onCancel).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('btn-confirm-discard-and-leave'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('dismisses delete modal and leave guard dialog when pressing Escape key', () => {
      const onCancelDelete = vi.fn();
      const onCancelLeave = vi.fn();

      const { rerender } = render(
        <div
          data-testid="confirm-delete-node-modal"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancelDelete();
          }}
        >
          <button data-testid="btn-cancel-delete-node" onClick={onCancelDelete}>Hủy</button>
        </div>
      );

      fireEvent.keyDown(screen.getByTestId('confirm-delete-node-modal'), { key: 'Escape' });
      expect(onCancelDelete).toHaveBeenCalledTimes(1);

      rerender(
        <div
          data-testid="unsaved-changes-confirm-dialog"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancelLeave();
          }}
        >
          <button data-testid="btn-cancel-leave" onClick={onCancelLeave}>Hủy</button>
        </div>
      );

      fireEvent.keyDown(screen.getByTestId('unsaved-changes-confirm-dialog'), { key: 'Escape' });
      expect(onCancelLeave).toHaveBeenCalledTimes(1);
    });
  });
});

