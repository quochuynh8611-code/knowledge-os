/**
 * Unit Test Suite: Mind Map Drag-and-Drop Node Reparenting & Pure Mutations (Phase P4)
 *
 * Verifies:
 * 1. isDescendantNode: checks direct child, deep descendants, false for siblings/ancestors.
 * 2. reparentNode pure mutation:
 *    - Successfully moves a leaf node to another parent.
 *    - Successfully moves an entire subtree with all children and grandchildren.
 *    - Updates hopDistance and parentHopId recursively for all moved descendants.
 *    - Supports targetIndex insertion among new siblings.
 *    - Rejects moving root node (ROOT_CANNOT_MOVE / ROOT_REPARENT_FORBIDDEN).
 *    - Rejects reparenting to self (INVALID_REPARENT_TARGET / CANNOT_REPARENT_TO_SELF).
 *    - Rejects reparenting to descendant (CIRCULAR_DEPENDENCY_FORBIDDEN / CANNOT_REPARENT_TO_DESCENDANT).
 *    - Rejects if sourceNode or targetParent does not exist.
 *    - Preserves tree immutability (original tree untouched).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isDescendantNode,
  reparentNode,
  TreeMutationErrorCode,
} from '../../src/lib/mindmapTreeMutations';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Mind Map Drag-and-Drop Reparenting Pure Mutations (Phase P4)', () => {
  let sampleTree: MindMapTreeNode;

  beforeEach(() => {
    sampleTree = {
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
              children: [
                {
                  id: 'node-sinh-kho',
                  title: 'Sinh Khổ',
                  type: 'note',
                  domain: 'general',
                  hopDistance: 3,
                  parentHopId: 'node-sinh-lao',
                  tags: [],
                  children: [],
                },
              ],
            },
            {
              id: 'node-tam-kho',
              title: 'Tam Khổ',
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
          children: [
            {
              id: 'node-thap-nhi-nhan-duyen',
              title: 'Thập Nhị Nhân Duyên',
              type: 'topic',
              domain: 'general',
              hopDistance: 2,
              parentHopId: 'node-tap-de',
              tags: [],
              children: [],
            },
          ],
        },
        {
          id: 'node-diet-de',
          title: 'Diệt Đế',
          type: 'topic',
          domain: 'general',
          hopDistance: 1,
          parentHopId: 'root-topic',
          tags: [],
          children: [],
        },
      ],
    };
  });

  describe('1. isDescendantNode (Circularity Detection Helper)', () => {
    it('returns true when checking direct child', () => {
      expect(isDescendantNode(sampleTree, 'node-kho-de', 'node-sinh-lao')).toBe(true);
    });

    it('returns true when checking multi-depth descendant (grandchild)', () => {
      expect(isDescendantNode(sampleTree, 'node-kho-de', 'node-sinh-kho')).toBe(true);
      expect(isDescendantNode(sampleTree, 'root-topic', 'node-sinh-kho')).toBe(true);
    });

    it('returns false when checking self', () => {
      expect(isDescendantNode(sampleTree, 'node-kho-de', 'node-kho-de')).toBe(false);
    });

    it('returns false when checking siblings or different branches', () => {
      expect(isDescendantNode(sampleTree, 'node-kho-de', 'node-tap-de')).toBe(false);
      expect(isDescendantNode(sampleTree, 'node-sinh-lao', 'node-thap-nhi-nhan-duyen')).toBe(false);
    });

    it('returns false when checking parent/ancestor as candidate child (reverse check)', () => {
      expect(isDescendantNode(sampleTree, 'node-sinh-lao', 'node-kho-de')).toBe(false);
      expect(isDescendantNode(sampleTree, 'node-sinh-lao', 'root-topic')).toBe(false);
    });
  });

  describe('2. reparentNode (Pure Mutation)', () => {
    it('Scenario 2.1: moves a leaf node to another parent and updates hopDistance & parentHopId', () => {
      const result = reparentNode(sampleTree, 'node-tam-kho', 'node-tap-de');
      expect(result.ok).toBe(true);
      expect(result.tree).toBeDefined();

      const newTree = result.tree!;
      const oldParent = newTree.children.find((c) => c.id === 'node-kho-de')!;
      const newParent = newTree.children.find((c) => c.id === 'node-tap-de')!;

      // Removed from old parent
      expect(oldParent.children.some((c) => c.id === 'node-tam-kho')).toBe(false);
      expect(oldParent.children).toHaveLength(1); // only sinh-lao left

      // Added to new parent
      const movedNode = newParent.children.find((c) => c.id === 'node-tam-kho')!;
      expect(movedNode).toBeDefined();
      expect(movedNode.parentHopId).toBe('node-tap-de');
      expect(movedNode.hopDistance).toBe(newParent.hopDistance + 1);
    });

    it('Scenario 2.2: moves an entire subtree with nested descendants, adjusting all hopDistances recursively', () => {
      // Move 'node-sinh-lao' (which has child 'node-sinh-kho') from 'node-kho-de' (hop 1) to 'node-diet-de' (hop 1)
      const result = reparentNode(sampleTree, 'node-sinh-lao', 'node-diet-de');
      expect(result.ok).toBe(true);

      const newTree = result.tree!;
      const dietDe = newTree.children.find((c) => c.id === 'node-diet-de')!;
      const movedBranch = dietDe.children.find((c) => c.id === 'node-sinh-lao')!;

      expect(movedBranch).toBeDefined();
      expect(movedBranch.parentHopId).toBe('node-diet-de');
      expect(movedBranch.hopDistance).toBe(2);

      // Verify grandchild is preserved and hopDistance updated accordingly
      const grandChild = movedBranch.children.find((c) => c.id === 'node-sinh-kho')!;
      expect(grandChild).toBeDefined();
      expect(grandChild.parentHopId).toBe('node-sinh-lao');
      expect(grandChild.hopDistance).toBe(3);
    });

    it('Scenario 2.3: supports specific targetIndex positioning among new siblings', () => {
      // 'node-tap-de' currently has child ['node-thap-nhi-nhan-duyen'] (index 0)
      // We reparent 'node-tam-kho' into 'node-tap-de' at index 0 (before 'node-thap-nhi-nhan-duyen')
      const result = reparentNode(sampleTree, 'node-tam-kho', 'node-tap-de', 0);
      expect(result.ok).toBe(true);

      const tapDe = result.tree!.children.find((c) => c.id === 'node-tap-de')!;
      expect(tapDe.children).toHaveLength(2);
      expect(tapDe.children[0].id).toBe('node-tam-kho');
      expect(tapDe.children[1].id).toBe('node-thap-nhi-nhan-duyen');
    });

    it('Scenario 2.3b: supports reordering siblings within the same parent without index offset bugs', () => {
      // 'node-kho-de' has children ['node-sinh-lao', 'node-tam-kho'] (indices 0 and 1)
      // Moving 'node-tam-kho' to index 0 under same parent 'node-kho-de'
      const result = reparentNode(sampleTree, 'node-tam-kho', 'node-kho-de', 0);
      expect(result.ok).toBe(true);

      const khoDe = result.tree!.children.find((c) => c.id === 'node-kho-de')!;
      expect(khoDe.children).toHaveLength(2);
      expect(khoDe.children[0].id).toBe('node-tam-kho');
      expect(khoDe.children[1].id).toBe('node-sinh-lao');
    });

    it('Scenario 2.4: rejects moving root node with ROOT_CANNOT_MOVE error', () => {
      const result = reparentNode(sampleTree, 'root-topic', 'node-kho-de');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.ROOT_CANNOT_MOVE);
    });

    it('Scenario 2.5: rejects reparenting to self with CANNOT_REPARENT_TO_SELF error', () => {
      const result = reparentNode(sampleTree, 'node-kho-de', 'node-kho-de');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.CANNOT_REPARENT_TO_SELF);
    });

    it('Scenario 2.6: rejects reparenting into own descendant with CANNOT_REPARENT_TO_DESCENDANT (Circularity Defense)', () => {
      // Attempting to drag 'node-kho-de' into its grandchild 'node-sinh-kho'
      const result = reparentNode(sampleTree, 'node-kho-de', 'node-sinh-kho');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.CANNOT_REPARENT_TO_DESCENDANT);
    });

    it('Scenario 2.7: rejects when source node or target parent node does not exist', () => {
      const notFoundSource = reparentNode(sampleTree, 'non-existent-source', 'node-kho-de');
      expect(notFoundSource.ok).toBe(false);
      expect(notFoundSource.error?.code).toBe(TreeMutationErrorCode.NODE_NOT_FOUND);

      const notFoundTarget = reparentNode(sampleTree, 'node-tam-kho', 'non-existent-target');
      expect(notFoundTarget.ok).toBe(false);
      expect(notFoundTarget.error?.code).toBe(TreeMutationErrorCode.PARENT_NOT_FOUND);
    });

    it('Scenario 2.8: guarantees immutability of the original input tree', () => {
      const originalKhoChildrenCount = sampleTree.children[0].children.length;
      const result = reparentNode(sampleTree, 'node-tam-kho', 'node-tap-de');

      expect(result.ok).toBe(true);
      expect(sampleTree.children[0].children.length).toBe(originalKhoChildrenCount);
      expect(sampleTree.children[0].children.some((c) => c.id === 'node-tam-kho')).toBe(true);
      expect(sampleTree.children[1].children.some((c) => c.id === 'node-tam-kho')).toBe(false);
    });
  });
});
