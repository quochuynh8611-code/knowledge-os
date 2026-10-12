/**
 * Phase M5a — Pure Mind Map Cross-Link Mutation and Validation Helpers
 */

import { MindMapDocumentEdge } from "../types/mindmapDocument";
import { LinkType } from "../types";
import { MindMapTreeNode } from "./mindmapProjection";

export interface ValidateCrossLinkResult {
  valid: boolean;
  error?: string;
}

/**
 * Checks if a directed path exists from startId to targetId
 * taking into account both hierarchical tree edges (parent -> child)
 * and directed cross-links.
 */
function hasDirectedPath(
  startId: string,
  targetId: string,
  treeRoot?: MindMapTreeNode | null,
  existingEdges: MindMapDocumentEdge[] = []
): boolean {
  if (startId === targetId) return true;

  const adj = new Map<string, string[]>();

  function addEdge(u: string, v: string) {
    if (!adj.has(u)) adj.set(u, []);
    adj.get(u)!.push(v);
  }

  // 1. Add tree parent -> child edges
  function traverseTree(node?: MindMapTreeNode | null) {
    if (!node) return;
    for (const child of node.children || []) {
      addEdge(node.id, child.id);
      traverseTree(child);
    }
  }
  if (treeRoot) {
    traverseTree(treeRoot);
  }

  // 2. Add cross-links
  for (const edge of existingEdges) {
    addEdge(edge.sourceNodeId, edge.targetNodeId);
  }

  // 3. BFS search from startId to targetId
  const visited = new Set<string>();
  const queue: string[] = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === targetId) return true;

    for (const neighbor of adj.get(current) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Validates adding a cross-link according to M5a policies:
 * - Reject self-link (CANNOT_LINK_SELF)
 * - Reject duplicate edge (DUPLICATE_CROSS_LINK)
 * - Reject cycle under M5a policy (CYCLE_DETECTED)
 */
export function validateCrossLinkMutation(
  sourceNodeId: string,
  targetNodeId: string,
  edgeType: LinkType,
  existingEdges: MindMapDocumentEdge[] = [],
  treeRoot?: MindMapTreeNode | null
): ValidateCrossLinkResult {
  if (sourceNodeId === targetNodeId) {
    return { valid: false, error: "CANNOT_LINK_SELF" };
  }

  const isDuplicate = existingEdges.some(
    (e) =>
      e.sourceNodeId === sourceNodeId &&
      e.targetNodeId === targetNodeId &&
      e.edgeType === edgeType
  );
  if (isDuplicate) {
    return { valid: false, error: "DUPLICATE_CROSS_LINK" };
  }

  if (treeRoot && hasDirectedPath(targetNodeId, sourceNodeId, treeRoot, existingEdges)) {
    return { valid: false, error: "CYCLE_DETECTED" };
  }

  return { valid: true };
}

/**
 * Pure helper to prune cross-links that point to or originate from deleted nodes.
 */
export function pruneDanglingCrossLinks(
  edges: MindMapDocumentEdge[],
  validNodeIds: Set<string>
): {
  prunedCrossLinks: MindMapDocumentEdge[];
  prunedCount: number;
} {
  const prunedCrossLinks = edges.filter(
    (edge) => validNodeIds.has(edge.sourceNodeId) && validNodeIds.has(edge.targetNodeId)
  );

  return {
    prunedCrossLinks,
    prunedCount: edges.length - prunedCrossLinks.length,
  };
}
