/**
 * Unit Test Suite: Pure Immutable Mind Map Tree Mutations (Phase P2)
 *
 * Verifies:
 * 1. renameNodeTitle (success, trimming, blank rejection, not found rejection).
 * 2. insertChildNode (success, default title, custom title, unique IDs, parent not found).
 * 3. deleteNode (leaf deletion, branch & subtree deletion, root deletion protection).
 * 4. moveNodeWithinParent (sibling up/down reordering, boundary no-ops, root protection).
 * 5. findNodeById & validateMindMapTree (lookup, duplicate IDs, empty titles).
 * 6. Immutability: input tree is never mutated in place.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  renameNodeTitle,
  insertChildNode,
  deleteNode,
  moveNodeWithinParent,
  findNodeById,
  validateMindMapTree,
  countTreeNodes,
  insertBatchChildNodes,
  TreeMutationErrorCode,
} from '../../src/lib/mindmapTreeMutations';
import { MindMapTreeNode } from '../../src/lib/mindmapProjection';

describe('Mind Map Tree Mutations (Phase P2)', () => {
  let sampleTree: MindMapTreeNode;

  beforeEach(() => {
    sampleTree = {
      id: 'root-1',
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
          parentHopId: 'root-1',
          tags: [],
          children: [
            {
              id: 'node-sinh-lao-benh-tu',
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
          parentHopId: 'root-1',
          tags: [],
          children: [],
        },
        {
          id: 'node-diet-de',
          title: 'Diệt Đế',
          type: 'topic',
          domain: 'general',
          hopDistance: 1,
          parentHopId: 'root-1',
          tags: [],
          children: [],
        },
        {
          id: 'node-dao-de',
          title: 'Đạo Đế',
          type: 'topic',
          domain: 'general',
          hopDistance: 1,
          parentHopId: 'root-1',
          tags: [],
          children: [],
        },
      ],
    };
  });

  // =========================================================================
  // 1. RENAME NODE
  // =========================================================================
  describe('renameNodeTitle', () => {
    it('renames an existing node title successfully and trims whitespace', () => {
      const result = renameNodeTitle(sampleTree, 'node-kho-de', '  Khổ Thánh Đế  ');
      expect(result.ok).toBe(true);
      expect(result.tree).toBeDefined();

      const updatedNode = findNodeById(result.tree!, 'node-kho-de');
      expect(updatedNode?.title).toBe('Khổ Thánh Đế');

      // Original tree remains unchanged
      expect(findNodeById(sampleTree, 'node-kho-de')?.title).toBe('Khổ Đế');
    });

    it('renames root node title successfully', () => {
      const result = renameNodeTitle(sampleTree, 'root-1', 'Bốn Chân Lý Thánh');
      expect(result.ok).toBe(true);
      expect(result.tree?.title).toBe('Bốn Chân Lý Thánh');
      expect(sampleTree.title).toBe('Tứ Diệu Đế');
    });

    it('rejects empty title or whitespace-only title with EMPTY_TITLE error', () => {
      const resultEmpty = renameNodeTitle(sampleTree, 'node-tap-de', '');
      expect(resultEmpty.ok).toBe(false);
      expect(resultEmpty.error?.code).toBe(TreeMutationErrorCode.EMPTY_TITLE);

      const resultWhitespace = renameNodeTitle(sampleTree, 'node-tap-de', '   ');
      expect(resultWhitespace.ok).toBe(false);
      expect(resultWhitespace.error?.code).toBe(TreeMutationErrorCode.EMPTY_TITLE);
    });

    it('rejects non-existent node with NODE_NOT_FOUND error', () => {
      const result = renameNodeTitle(sampleTree, 'non-existent-id', 'Tiêu đề mới');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.NODE_NOT_FOUND);
    });
  });

  // =========================================================================
  // 2. INSERT CHILD NODE
  // =========================================================================
  describe('insertChildNode', () => {
    it('appends a child node with default title "Nút mới" under valid parent', () => {
      const initialCount = countTreeNodes(sampleTree);
      const result = insertChildNode(sampleTree, 'node-tap-de');

      expect(result.ok).toBe(true);
      expect(result.tree).toBeDefined();
      expect(countTreeNodes(result.tree!)).toBe(initialCount + 1);

      const parentNode = findNodeById(result.tree!, 'node-tap-de');
      expect(parentNode?.children.length).toBe(1);
      const newChild = parentNode?.children[0];
      expect(newChild?.title).toBe('Nút mới');
      expect(newChild?.parentHopId).toBe('node-tap-de');
      expect(newChild?.hopDistance).toBe(2);
      expect(newChild?.id).toMatch(/^node-custom-/);
    });

    it('appends a child node with custom title and type', () => {
      const result = insertChildNode(sampleTree, 'node-dao-de', {
        title: 'Bát Chánh Đạo',
        type: 'topic',
      });

      expect(result.ok).toBe(true);
      const parentNode = findNodeById(result.tree!, 'node-dao-de');
      expect(parentNode?.children.length).toBe(1);
      expect(parentNode?.children[0].title).toBe('Bát Chánh Đạo');
      expect(parentNode?.children[0].type).toBe('topic');
    });

    it('generates unique IDs across multiple child insertions', () => {
      let tree = sampleTree;
      const result1 = insertChildNode(tree, 'node-diet-de');
      const result2 = insertChildNode(result1.tree!, 'node-diet-de');

      const parentNode = findNodeById(result2.tree!, 'node-diet-de');
      expect(parentNode?.children.length).toBe(2);
      expect(parentNode?.children[0].id).not.toBe(parentNode?.children[1].id);
    });

    it('rejects inserting under non-existent parent with PARENT_NOT_FOUND error', () => {
      const result = insertChildNode(sampleTree, 'ghost-parent-id');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.PARENT_NOT_FOUND);
    });
  });

  // =========================================================================
  // 3. DELETE NODE
  // =========================================================================
  describe('deleteNode', () => {
    it('deletes a leaf node cleanly from parent children array', () => {
      const result = deleteNode(sampleTree, 'node-sinh-lao-benh-tu');
      expect(result.ok).toBe(true);

      const parentNode = findNodeById(result.tree!, 'node-kho-de');
      expect(parentNode?.children.length).toBe(0);
      expect(findNodeById(result.tree!, 'node-sinh-lao-benh-tu')).toBeNull();
    });

    it('deletes a branch node along with its entire subtree', () => {
      const initialTotal = countTreeNodes(sampleTree);
      const result = deleteNode(sampleTree, 'node-kho-de');

      expect(result.ok).toBe(true);
      expect(findNodeById(result.tree!, 'node-kho-de')).toBeNull();
      expect(findNodeById(result.tree!, 'node-sinh-lao-benh-tu')).toBeNull();
      expect(countTreeNodes(result.tree!)).toBe(initialTotal - 2);
    });

    it('blocks deletion of root node with ROOT_DELETION_FORBIDDEN error', () => {
      const result = deleteNode(sampleTree, 'root-1');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.ROOT_DELETION_FORBIDDEN);
      expect(countTreeNodes(sampleTree)).toBe(6);
    });

    it('rejects non-existent node deletion with NODE_NOT_FOUND error', () => {
      const result = deleteNode(sampleTree, 'fake-node-id');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.NODE_NOT_FOUND);
    });
  });

  // =========================================================================
  // 4. MOVE SIBLING UP / DOWN
  // =========================================================================
  describe('moveNodeWithinParent', () => {
    it('moves a middle sibling UP in order', () => {
      // Order before: Khổ Đế (0), Tập Đế (1), Diệt Đế (2), Đạo Đế (3)
      const result = moveNodeWithinParent(sampleTree, 'node-tap-de', 'up');
      expect(result.ok).toBe(true);

      const rootChildren = result.tree!.children.map((c) => c.id);
      expect(rootChildren).toEqual([
        'node-tap-de',
        'node-kho-de',
        'node-diet-de',
        'node-dao-de',
      ]);
    });

    it('moves a middle sibling DOWN in order', () => {
      // Move Tập Đế (index 1) down -> should become index 2
      const result = moveNodeWithinParent(sampleTree, 'node-tap-de', 'down');
      expect(result.ok).toBe(true);

      const rootChildren = result.tree!.children.map((c) => c.id);
      expect(rootChildren).toEqual([
        'node-kho-de',
        'node-diet-de',
        'node-tap-de',
        'node-dao-de',
      ]);
    });

    it('no-ops safely when moving first sibling UP with BOUNDARY_REACHED error', () => {
      const result = moveNodeWithinParent(sampleTree, 'node-kho-de', 'up');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.BOUNDARY_REACHED);
    });

    it('no-ops safely when moving last sibling DOWN with BOUNDARY_REACHED error', () => {
      const result = moveNodeWithinParent(sampleTree, 'node-dao-de', 'down');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.BOUNDARY_REACHED);
    });

    it('rejects moving root node with ROOT_CANNOT_MOVE error', () => {
      const result = moveNodeWithinParent(sampleTree, 'root-1', 'up');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.ROOT_CANNOT_MOVE);
    });

    it('rejects moving non-existent node with NODE_NOT_FOUND error', () => {
      const result = moveNodeWithinParent(sampleTree, 'ghost-node', 'down');
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.NODE_NOT_FOUND);
    });
  });

  // =========================================================================
  // 5. VALIDATION & LOOKUP
  // =========================================================================
  describe('findNodeById & validateMindMapTree', () => {
    it('finds node at any depth', () => {
      expect(findNodeById(sampleTree, 'root-1')?.title).toBe('Tứ Diệu Đế');
      expect(findNodeById(sampleTree, 'node-kho-de')?.title).toBe('Khổ Đế');
      expect(findNodeById(sampleTree, 'node-sinh-lao-benh-tu')?.title).toBe('Sinh Lão Bệnh Tử');
      expect(findNodeById(sampleTree, 'non-existent')).toBeNull();
    });

    it('validates a correct tree structure', () => {
      const validation = validateMindMapTree(sampleTree);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('detects blank title error in tree validation', () => {
      const corruptedTree = {
        ...sampleTree,
        children: [
          ...sampleTree.children,
          {
            id: 'node-blank',
            title: '   ',
            type: 'topic' as const,
            domain: 'general' as const,
            hopDistance: 1,
            tags: [],
            children: [],
          },
        ],
      };

      const validation = validateMindMapTree(corruptedTree);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Node "node-blank" has an empty title.');
    });

    it('detects duplicate node ID error in tree validation', () => {
      const duplicateTree = {
        ...sampleTree,
        children: [
          ...sampleTree.children,
          {
            id: 'node-kho-de', // duplicate of first child
            title: 'Khổ Đế Trùng Lặp',
            type: 'topic' as const,
            domain: 'general' as const,
            hopDistance: 1,
            tags: [],
            children: [],
          },
        ],
      };

      const validation = validateMindMapTree(duplicateTree);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate node ID detected: "node-kho-de".');
    });
  });

  // =========================================================================
  // 6. IMMUTABILITY GUARANTEE
  // =========================================================================
  describe('Immutability Guarantee', () => {
    it('does not mutate input tree during rename, add, delete, or move', () => {
      const originalSerialized = JSON.stringify(sampleTree);

      renameNodeTitle(sampleTree, 'node-kho-de', 'Khổ Thay Đổi');
      expect(JSON.stringify(sampleTree)).toBe(originalSerialized);

      insertChildNode(sampleTree, 'node-tap-de', { title: 'Ái Dục' });
      expect(JSON.stringify(sampleTree)).toBe(originalSerialized);

      deleteNode(sampleTree, 'node-dao-de');
      expect(JSON.stringify(sampleTree)).toBe(originalSerialized);

      moveNodeWithinParent(sampleTree, 'node-tap-de', 'up');
      expect(JSON.stringify(sampleTree)).toBe(originalSerialized);
    });
  });

  // =========================================================================
  // 7. BATCH INSERTION (Phase P3 AI Expansion)
  // =========================================================================
  describe('insertBatchChildNodes', () => {
    it('inserts multiple child nodes under a parent node in one immutable operation', () => {
      const candidates = [
        { title: 'Chánh Kiến' },
        { title: 'Chánh Tư Duy' },
        { title: 'Chánh Ngữ' },
      ];

      const result = insertBatchChildNodes(sampleTree, 'node-dao-de', candidates);
      expect(result.ok).toBe(true);
      expect(result.tree).toBeDefined();

      const parentNode = findNodeById(result.tree!, 'node-dao-de');
      expect(parentNode?.children).toHaveLength(3);
      expect(parentNode?.children[0].title).toBe('Chánh Kiến');
      expect(parentNode?.children[1].title).toBe('Chánh Tư Duy');
      expect(parentNode?.children[2].title).toBe('Chánh Ngữ');

      // Verify unique IDs and hop distances
      expect(parentNode?.children[0].id).toMatch(/^node-ai-/);
      expect(parentNode?.children[0].hopDistance).toBe(2);
      expect(parentNode?.children[0].parentHopId).toBe('node-dao-de');

      // Verify input tree immutability
      expect(findNodeById(sampleTree, 'node-dao-de')?.children).toHaveLength(0);
    });

    it('rejects batch insert if parent node does not exist', () => {
      const result = insertBatchChildNodes(sampleTree, 'ghost-parent-id', [{ title: 'Test' }]);
      expect(result.ok).toBe(false);
      expect(result.error?.code).toBe(TreeMutationErrorCode.PARENT_NOT_FOUND);
    });

    it('handles empty candidates array as a safe no-op', () => {
      const result = insertBatchChildNodes(sampleTree, 'node-dao-de', []);
      expect(result.ok).toBe(true);
      expect(result.tree).toBeDefined();
    });
  });
});
