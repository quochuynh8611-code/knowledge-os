/**
 * Unit Test Suite: Mind Map Pure Batch Mutations (Phase P6a)
 *
 * Verifies:
 * 1. deleteBatchNodes deletes multiple independent leaf and branch nodes in a single step.
 * 2. Root node protection: root is never deleted even if present in targetNodeIds.
 * 3. Ancestor pruning: when both parent and descendant are in targetNodeIds, prunes at highest ancestor.
 * 4. Duplicate IDs: handles duplicate targetNodeIds gracefully without side-effects.
 * 5. Unknown IDs: ignores non-existent node IDs safely while deleting existing valid targets.
 * 6. Empty targetNodeIds: returns ok: true with unchanged tree reference.
 * 7. Immutability: original tree is not mutated in-place.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  deleteBatchNodes,
  findNodeById,
  countTreeNodes,
} from '../../src/lib/mindmapTreeMutations';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Phase P6a — Mind Map Pure Batch Mutations (deleteBatchNodes)', () => {
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
              id: 'node-ngu-uon',
              title: 'Ngũ Uẩn Khổ',
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
              id: 'node-tham-ai',
              title: 'Tham Ái',
              type: 'note',
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

  describe('1. Multiple Independent Node Deletions', () => {
    it('deletes multiple independent leaf and branch nodes in a single atomic pass', () => {
      const initialCount = countTreeNodes(sampleTree);
      expect(initialCount).toBe(8);

      // Delete a leaf (node-ngu-uon) and a branch with children (node-tap-de)
      const res = deleteBatchNodes(sampleTree, ['node-ngu-uon', 'node-tap-de']);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      // Both deleted nodes must not exist in resulting tree
      expect(findNodeById(res.tree, 'node-ngu-uon')).toBeNull();
      expect(findNodeById(res.tree, 'node-tap-de')).toBeNull();
      // Descendant of tap-de should also be gone
      expect(findNodeById(res.tree, 'node-tham-ai')).toBeNull();

      // Untargeted nodes must still exist
      expect(findNodeById(res.tree, 'root-topic')).not.toBeNull();
      expect(findNodeById(res.tree, 'node-kho-de')).not.toBeNull();
      expect(findNodeById(res.tree, 'node-sinh-lao')).not.toBeNull();
      expect(findNodeById(res.tree, 'node-diet-de')).not.toBeNull();

      // Total nodes = 8 - 1 (ngu-uon) - 2 (tap-de + tham-ai) = 5
      expect(countTreeNodes(res.tree)).toBe(5);
    });
  });

  describe('2. Root Node Protection', () => {
    it('ignores root node ID when mixed with other valid targets and deletes only non-root nodes', () => {
      const res = deleteBatchNodes(sampleTree, ['root-topic', 'node-diet-de']);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      // Root remains untouched
      expect(findNodeById(res.tree, 'root-topic')).not.toBeNull();
      // Non-root target is deleted
      expect(findNodeById(res.tree, 'node-diet-de')).toBeNull();
    });

    it('preserves entire tree when only root node is specified in targets', () => {
      const res = deleteBatchNodes(sampleTree, ['root-topic']);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      expect(countTreeNodes(res.tree)).toBe(countTreeNodes(sampleTree));
      expect(findNodeById(res.tree, 'root-topic')).not.toBeNull();
    });
  });

  describe('3. Ancestor Pruning (Redundant Descendant Elimination)', () => {
    it('prunes at top-most selected ancestor when parent and descendants are all selected', () => {
      // Both parent (node-kho-de), child (node-sinh-lao), and grandchild (node-sinh-kho) selected
      const res = deleteBatchNodes(sampleTree, [
        'node-kho-de',
        'node-sinh-lao',
        'node-sinh-kho',
      ]);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      // kho-de and all its subtree must be removed
      expect(findNodeById(res.tree, 'node-kho-de')).toBeNull();
      expect(findNodeById(res.tree, 'node-sinh-lao')).toBeNull();
      expect(findNodeById(res.tree, 'node-sinh-kho')).toBeNull();
      expect(findNodeById(res.tree, 'node-ngu-uon')).toBeNull();

      // Sibling branches remain intact
      expect(findNodeById(res.tree, 'node-tap-de')).not.toBeNull();
      expect(findNodeById(res.tree, 'node-diet-de')).not.toBeNull();
    });
  });

  describe('4. Duplicate Target IDs', () => {
    it('handles duplicate target IDs cleanly without error or double deletion', () => {
      const res = deleteBatchNodes(sampleTree, [
        'node-diet-de',
        'node-diet-de',
        'node-ngu-uon',
        'node-diet-de',
      ]);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      expect(findNodeById(res.tree, 'node-diet-de')).toBeNull();
      expect(findNodeById(res.tree, 'node-ngu-uon')).toBeNull();
      expect(countTreeNodes(res.tree)).toBe(6);
    });
  });

  describe('5. Unknown and Empty Target IDs', () => {
    it('ignores unknown IDs safely and deletes existing valid targets', () => {
      const res = deleteBatchNodes(sampleTree, [
        'non-existent-id-1',
        'node-diet-de',
        'non-existent-id-2',
      ]);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      expect(findNodeById(res.tree, 'node-diet-de')).toBeNull();
      expect(countTreeNodes(res.tree)).toBe(7);
    });

    it('returns ok: true with unchanged tree when all target IDs are unknown', () => {
      const res = deleteBatchNodes(sampleTree, ['unknown-1', 'unknown-2']);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      expect(countTreeNodes(res.tree)).toBe(countTreeNodes(sampleTree));
    });

    it('returns ok: true with unchanged tree when targetNodeIds is empty', () => {
      const res = deleteBatchNodes(sampleTree, []);

      expect(res.ok).toBe(true);
      expect(res.tree).toBeDefined();
      if (!res.tree) return;

      expect(countTreeNodes(res.tree)).toBe(countTreeNodes(sampleTree));
    });
  });

  describe('6. Immutability & Tree Integrity', () => {
    it('does not mutate original tree in-place', () => {
      const originalNodeCount = countTreeNodes(sampleTree);
      const res = deleteBatchNodes(sampleTree, ['node-diet-de']);

      expect(res.ok).toBe(true);
      // Original tree must remain untouched
      expect(countTreeNodes(sampleTree)).toBe(originalNodeCount);
      expect(findNodeById(sampleTree, 'node-diet-de')).not.toBeNull();
      // Result tree has node removed
      if (res.tree) {
        expect(findNodeById(res.tree, 'node-diet-de')).toBeNull();
      }
    });
  });
});
