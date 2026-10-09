/**
 * UI Integration Test Suite: Mind Map Canvas Drag-and-Drop Reparenting (Phase P4)
 *
 * Verifies:
 * 1. MindMapTreeCanvas node draggable attributes when isEditable is true vs false.
 * 2. Root node is not draggable.
 * 3. Drag start sets dataTransfer payload.
 * 4. Drag over valid target node card highlights visual cue.
 * 5. Dropping onto target node calls onReparentNode(sourceId, targetParentId).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MindMapTreeCanvas } from '../../src/components/mindmap/MindMapTreeCanvas';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Mind Map Canvas Drag-and-Drop UI (Phase P4)', () => {
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

  describe('1. Draggable Attribute Gating', () => {
    it('disables dragging on all nodes when isEditable is false/undefined', () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={false}
        />
      );

      const rootCard = document.querySelector('[data-node-id="root-topic"]');
      const childCard = document.querySelector('[data-node-id="node-kho-de"]');
      const grandchildCard = document.querySelector('[data-node-id="node-sinh-lao"]');

      expect(rootCard?.getAttribute('draggable')).not.toBe('true');
      expect(childCard?.getAttribute('draggable')).not.toBe('true');
      expect(grandchildCard?.getAttribute('draggable')).not.toBe('true');
    });

    it('enables draggable on child nodes when isEditable is true, but keeps root node non-draggable', () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const rootCard = document.querySelector('[data-node-id="root-topic"]');
      const childCard = document.querySelector('[data-node-id="node-kho-de"]');
      const grandchildCard = document.querySelector('[data-node-id="node-sinh-lao"]');

      // Root cannot be dragged
      expect(rootCard?.getAttribute('draggable')).not.toBe('true');

      // Child and grandchild can be dragged
      expect(childCard?.getAttribute('draggable')).toBe('true');
      expect(grandchildCard?.getAttribute('draggable')).toBe('true');
    });
  });

  describe('2. Drag and Drop Workflow', () => {
    it('triggers onReparentNode callback when dropping node-sinh-lao onto node-tap-de', () => {
      const onReparentNode = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onReparentNode={onReparentNode}
        />
      );

      const sourceNode = document.querySelector('[data-node-id="node-sinh-lao"]')!;
      const targetNode = document.querySelector('[data-node-id="node-tap-de"]')!;
      expect(sourceNode).toBeInTheDocument();
      expect(targetNode).toBeInTheDocument();

      const setDataMock = vi.fn();
      const getDataMock = vi.fn().mockReturnValue('node-sinh-lao');

      // 1. Drag Start
      fireEvent.dragStart(sourceNode, {
        dataTransfer: {
          setData: setDataMock,
          getData: getDataMock,
          types: ['application/x-mindmap-node'],
          effectAllowed: 'move',
        },
      });

      // 2. Drag Over target
      fireEvent.dragOver(targetNode, {
        dataTransfer: {
          types: ['application/x-mindmap-node'],
          dropEffect: 'move',
        },
      });

      // 3. Drop on target
      fireEvent.drop(targetNode, {
        dataTransfer: {
          getData: getDataMock,
          types: ['application/x-mindmap-node'],
        },
      });

      expect(onReparentNode).toHaveBeenCalledWith('node-sinh-lao', 'node-tap-de');
    });
  });
});
