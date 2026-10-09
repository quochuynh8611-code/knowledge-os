/**
 * Mind Map Pure Tree Mutations (Phase P2)
 *
 * Provides pure, immutable operations for manipulating MindMapTreeNode structures
 * in saved-document editing mode (rename, insert child, delete, sibling reorder).
 *
 * Local-first; không làm thay đổi DataContext theo observable contract;
 * blast radius thấp, bounded trong Mind Map context.
 */

import { MindMapTreeNode } from './mindmapProjection';
import { GraphNodeType } from './knowledgeGraph';

export enum TreeMutationErrorCode {
  EMPTY_TITLE = 'EMPTY_TITLE',
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  PARENT_NOT_FOUND = 'PARENT_NOT_FOUND',
  ROOT_DELETION_FORBIDDEN = 'ROOT_DELETION_FORBIDDEN',
  ROOT_CANNOT_MOVE = 'ROOT_CANNOT_MOVE',
  BOUNDARY_REACHED = 'BOUNDARY_REACHED',
  DUPLICATE_ID = 'DUPLICATE_ID',
  CANNOT_REPARENT_TO_SELF = 'CANNOT_REPARENT_TO_SELF',
  CANNOT_REPARENT_TO_DESCENDANT = 'CANNOT_REPARENT_TO_DESCENDANT',
}

export interface TreeMutationResult {
  ok: boolean;
  tree?: MindMapTreeNode;
  error?: {
    code: TreeMutationErrorCode;
    message: string;
  };
}

/**
 * Deep clones a MindMapTreeNode immutably.
 */
function cloneTreeNode(node: MindMapTreeNode): MindMapTreeNode {
  return {
    ...node,
    tags: Array.isArray(node.tags) ? [...node.tags] : [],
    children: Array.isArray(node.children) ? node.children.map(cloneTreeNode) : [],
  };
}

/**
 * Counts the total number of nodes in a subtree.
 */
export function countTreeNodes(tree: MindMapTreeNode): number {
  if (!tree) return 0;
  let count = 1;
  if (Array.isArray(tree.children)) {
    for (const child of tree.children) {
      count += countTreeNodes(child);
    }
  }
  return count;
}

/**
 * Finds a node by its ID anywhere in the tree.
 */
export function findNodeById(tree: MindMapTreeNode, nodeId: string): MindMapTreeNode | null {
  if (!tree || !nodeId) return null;
  if (tree.id === nodeId) return tree;
  if (Array.isArray(tree.children)) {
    for (const child of tree.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Renames a node title immutably.
 * Rejects empty or whitespace-only titles.
 */
export function renameNodeTitle(
  tree: MindMapTreeNode,
  nodeId: string,
  nextTitle: string
): TreeMutationResult {
  const trimmed = (nextTitle || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.EMPTY_TITLE,
        message: 'Tiêu đề nút không được để trống.',
      },
    };
  }

  let found = false;

  function updateNode(node: MindMapTreeNode): MindMapTreeNode {
    if (node.id === nodeId) {
      found = true;
      return {
        ...node,
        title: trimmed,
        tags: [...node.tags],
        children: node.children.map(updateNode),
      };
    }
    return {
      ...node,
      tags: [...node.tags],
      children: node.children.map(updateNode),
    };
  }

  const newTree = updateNode(tree);

  if (!found) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.NODE_NOT_FOUND,
        message: `Không tìm thấy nút có ID "${nodeId}".`,
      },
    };
  }

  return {
    ok: true,
    tree: newTree,
  };
}

/**
 * Inserts a new child node under a parent node immutably.
 */
export function insertChildNode(
  tree: MindMapTreeNode,
  parentNodeId: string,
  input?: { title?: string; type?: GraphNodeType }
): TreeMutationResult {
  const parent = findNodeById(tree, parentNodeId);
  if (!parent) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.PARENT_NOT_FOUND,
        message: `Không tìm thấy nút cha có ID "${parentNodeId}".`,
      },
    };
  }

  const customId = `node-custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const title = (input?.title || '').trim() || 'Nút mới';
  const nodeType = input?.type || 'topic';

  const newChild: MindMapTreeNode = {
    id: customId,
    title,
    type: nodeType,
    domain: 'general',
    hopDistance: parent.hopDistance + 1,
    parentHopId: parent.id,
    tags: [],
    children: [],
  };

  function appendToParent(node: MindMapTreeNode): MindMapTreeNode {
    if (node.id === parentNodeId) {
      return {
        ...node,
        tags: [...node.tags],
        children: [...node.children.map(cloneTreeNode), newChild],
      };
    }
    return {
      ...node,
      tags: [...node.tags],
      children: node.children.map(appendToParent),
    };
  }

  const newTree = appendToParent(tree);

  return {
    ok: true,
    tree: newTree,
  };
}

/**
 * Deletes a node and its entire subtree immutably.
 * Rejects root node deletion.
 */
export function deleteNode(tree: MindMapTreeNode, nodeId: string): TreeMutationResult {
  if (tree.id === nodeId) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.ROOT_DELETION_FORBIDDEN,
        message: 'Không thể xóa nút gốc của sơ đồ tư duy.',
      },
    };
  }

  const target = findNodeById(tree, nodeId);
  if (!target) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.NODE_NOT_FOUND,
        message: `Không tìm thấy nút có ID "${nodeId}".`,
      },
    };
  }

  function removeRecursively(node: MindMapTreeNode): MindMapTreeNode {
    return {
      ...node,
      tags: [...node.tags],
      children: node.children
        .filter((child) => child.id !== nodeId)
        .map(removeRecursively),
    };
  }

  const newTree = removeRecursively(tree);

  return {
    ok: true,
    tree: newTree,
  };
}

/**
 * Reorders a node within its parent's sibling children list immutably.
 */
export function moveNodeWithinParent(
  tree: MindMapTreeNode,
  nodeId: string,
  direction: 'up' | 'down'
): TreeMutationResult {
  if (tree.id === nodeId) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.ROOT_CANNOT_MOVE,
        message: 'Nút gốc không có nhánh cùng cấp để di chuyển.',
      },
    };
  }

  let parentFound = false;
  let boundaryReached = false;

  function reorderInParent(node: MindMapTreeNode): MindMapTreeNode {
    const idx = node.children.findIndex((c) => c.id === nodeId);
    if (idx !== -1) {
      parentFound = true;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= node.children.length) {
        boundaryReached = true;
        return cloneTreeNode(node);
      }

      const nextChildren = node.children.map(cloneTreeNode);
      const temp = nextChildren[idx];
      nextChildren[idx] = nextChildren[targetIdx];
      nextChildren[targetIdx] = temp;

      return {
        ...node,
        tags: [...node.tags],
        children: nextChildren,
      };
    }

    return {
      ...node,
      tags: [...node.tags],
      children: node.children.map(reorderInParent),
    };
  }

  const newTree = reorderInParent(tree);

  if (!parentFound) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.NODE_NOT_FOUND,
        message: `Không tìm thấy nút có ID "${nodeId}".`,
      },
    };
  }

  if (boundaryReached) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.BOUNDARY_REACHED,
        message:
          direction === 'up'
            ? 'Nút đã ở vị trí đầu tiên của nhánh.'
            : 'Nút đã ở vị trí cuối cùng của nhánh.',
      },
    };
  }

  return {
    ok: true,
    tree: newTree,
  };
}

/**
 * Validates the structural integrity of a mind map tree.
 */
export function validateMindMapTree(tree: MindMapTreeNode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  function validateNode(node: MindMapTreeNode) {
    if (!node) return;

    if (seenIds.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}".`);
    } else {
      seenIds.add(node.id);
    }

    if (!node.title || !node.title.trim()) {
      errors.push(`Node "${node.id}" has an empty title.`);
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        validateNode(child);
      }
    }
  }

  validateNode(tree);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Inserts a batch of child nodes under a parent node immutably (Phase P3 AI Expansion).
 * Generates unique node IDs and preserves flat child structure.
 */
export function insertBatchChildNodes(
  tree: MindMapTreeNode,
  parentNodeId: string,
  candidates: Array<{ title: string; type?: GraphNodeType }>
): TreeMutationResult {
  const parent = findNodeById(tree, parentNodeId);
  if (!parent) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.PARENT_NOT_FOUND,
        message: `Không tìm thấy nút cha có ID "${parentNodeId}".`,
      },
    };
  }

  if (!candidates || candidates.length === 0) {
    return {
      ok: true,
      tree: cloneTreeNode(tree),
    };
  }

  const newChildren: MindMapTreeNode[] = candidates
    .filter((c) => (c.title || '').trim().length > 0)
    .map((c, idx) => {
      const customId = `node-ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      return {
        id: customId,
        title: c.title.trim(),
        type: c.type || 'topic',
        domain: parent.domain || 'general',
        hopDistance: parent.hopDistance + 1,
        parentHopId: parent.id,
        tags: [],
        children: [],
      };
    });

  function appendBatchToParent(node: MindMapTreeNode): MindMapTreeNode {
    if (node.id === parentNodeId) {
      return {
        ...node,
        tags: [...node.tags],
        children: [...node.children.map(cloneTreeNode), ...newChildren],
      };
    }
    return {
      ...node,
      tags: [...node.tags],
      children: node.children.map(appendBatchToParent),
    };
  }

  const newTree = appendBatchToParent(tree);

  return {
    ok: true,
    tree: newTree,
  };
}

/**
 * Checks if a candidate node is a descendant (child, grandchild, etc.) of an ancestor node.
 * Used for circularity defense in drag-and-drop reparenting.
 */
export function isDescendantNode(
  tree: MindMapTreeNode,
  ancestorId: string,
  candidateChildId: string
): boolean {
  if (!tree || !ancestorId || !candidateChildId || ancestorId === candidateChildId) {
    return false;
  }

  const ancestor = findNodeById(tree, ancestorId);
  if (!ancestor || !Array.isArray(ancestor.children) || ancestor.children.length === 0) {
    return false;
  }

  return findNodeById({ ...ancestor, id: '__virtual_check_root__' }, candidateChildId) !== null;
}

/**
 * Recursively recomputes hopDistance and parentHopId for a subtree being moved.
 */
function recomputeSubtreeHops(
  node: MindMapTreeNode,
  newParentHopId: string,
  newParentHopDistance: number
): MindMapTreeNode {
  const hopDistance = newParentHopDistance + 1;
  return {
    ...node,
    parentHopId: newParentHopId,
    hopDistance,
    tags: Array.isArray(node.tags) ? [...node.tags] : [],
    children: Array.isArray(node.children)
      ? node.children.map((child) => recomputeSubtreeHops(child, node.id, hopDistance))
      : [],
  };
}

/**
 * Reparents a node (and its entire subtree) to a new parent node immutably (Phase P4).
 * Supports reordering among siblings via targetIndex.
 * Enforces cycle defense, self-reparenting defense, and root node protection.
 */
export function reparentNode(
  tree: MindMapTreeNode,
  sourceNodeId: string,
  targetParentId: string,
  targetIndex?: number
): TreeMutationResult {
  if (!tree) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.NODE_NOT_FOUND,
        message: 'Cây sơ đồ tư duy không hợp lệ.',
      },
    };
  }

  // 1. Root cannot be moved
  if (sourceNodeId === tree.id) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.ROOT_CANNOT_MOVE,
        message: 'Không thể di chuyển nút gốc của sơ đồ tư duy.',
      },
    };
  }

  // 2. Cannot reparent to self
  if (sourceNodeId === targetParentId) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.CANNOT_REPARENT_TO_SELF,
        message: 'Không thể đặt một nút làm con của chính nó.',
      },
    };
  }

  // 3. Circularity defense: cannot reparent to own descendant
  if (isDescendantNode(tree, sourceNodeId, targetParentId)) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.CANNOT_REPARENT_TO_DESCENDANT,
        message: 'Không thể di chuyển một nút vào các nhánh con cháu của chính nó.',
      },
    };
  }

  // 4. Validate source node exists
  const sourceNode = findNodeById(tree, sourceNodeId);
  if (!sourceNode) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.NODE_NOT_FOUND,
        message: `Không tìm thấy nút nguồn có ID "${sourceNodeId}".`,
      },
    };
  }

  // 5. Validate target parent exists
  const targetParent = findNodeById(tree, targetParentId);
  if (!targetParent) {
    return {
      ok: false,
      error: {
        code: TreeMutationErrorCode.PARENT_NOT_FOUND,
        message: `Không tìm thấy nút cha đích có ID "${targetParentId}".`,
      },
    };
  }

  // 6. Extract source subtree with updated hop hierarchy
  const movedSubtree = recomputeSubtreeHops(
    sourceNode,
    targetParent.id,
    targetParent.hopDistance
  );

  // 7. Pure tree transformation: remove from old parent and insert into new parent
  function transformNode(node: MindMapTreeNode): MindMapTreeNode {
    // If this node is the old parent, remove sourceNodeId from its children
    let filteredChildren = node.children.filter((c) => c.id !== sourceNodeId);

    // If this node is the target parent, insert movedSubtree
    if (node.id === targetParentId) {
      const updatedChildren = filteredChildren.map(transformNode);
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= updatedChildren.length) {
        const nextChildren = [...updatedChildren];
        nextChildren.splice(targetIndex, 0, movedSubtree);
        return {
          ...node,
          tags: [...node.tags],
          children: nextChildren,
        };
      } else {
        return {
          ...node,
          tags: [...node.tags],
          children: [...updatedChildren, movedSubtree],
        };
      }
    }

    return {
      ...node,
      tags: [...node.tags],
      children: filteredChildren.map(transformNode),
    };
  }

  const newTree = transformNode(tree);

  return {
    ok: true,
    tree: newTree,
  };
}

