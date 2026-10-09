/**
 * Mind Map Tree Adapter
 *
 * Provides bidirectional transformations between runtime MindMapTreeNode
 * projections and persisted MindMapDocumentNode ASTs.
 *
 * Local-first schema; không làm thay đổi DataContext theo observable contract;
 * blast radius thấp, bounded trong Mind Map context.
 */

import { MindMapTreeNode, MindMapLayoutMode } from './mindmapProjection';
import { MindMapDocumentNode } from '../types/mindmapDocument';
import { SemanticEdgeType, GraphNodeType } from './knowledgeGraph';

/**
 * Converts a runtime projected tree into an immutable AST document node tree.
 */
export function projectedTreeToDocumentTree(node: MindMapTreeNode): MindMapDocumentNode {
  let semanticBadge: string | undefined;
  if (node.edgeTypeToParent) {
    switch (node.edgeTypeToParent) {
      case 'prerequisite':
        semanticBadge = '[tiên quyết]';
        break;
      case 'advanced':
        semanticBadge = '[nâng cao]';
        break;
      case 'related':
        semanticBadge = '[liên quan]';
        break;
      case 'contradicts':
        semanticBadge = '[đối chiếu]';
        break;
      case 'has_note':
        semanticBadge = '[ghi chú]';
        break;
      case 'has_resource':
        semanticBadge = '[tài liệu]';
        break;
    }
  }

  return {
    id: node.id,
    title: node.title,
    nodeType: node.type || 'topic',
    semanticBadge,
    children: Array.isArray(node.children)
      ? node.children.map((child) => projectedTreeToDocumentTree(child))
      : [],
  };
}

/**
 * Converts a persisted AST document node tree back into a runtime projected tree.
 */
export function documentTreeToProjectedTree(
  docNode: MindMapDocumentNode,
  layoutMode: MindMapLayoutMode = 'tree_horizontal',
  hopDistance = 0,
  parentId?: string
): MindMapTreeNode {
  const badge = docNode.semanticBadge?.toLowerCase() || '';
  let edgeTypeToParent: SemanticEdgeType | undefined;
  if (badge.includes('tiên quyết')) edgeTypeToParent = 'prerequisite';
  else if (badge.includes('nâng cao')) edgeTypeToParent = 'advanced';
  else if (badge.includes('liên quan')) edgeTypeToParent = 'related';
  else if (badge.includes('đối chiếu') || badge.includes('mâu thuẫn')) edgeTypeToParent = 'contradicts';
  else if (badge.includes('ghi chú')) edgeTypeToParent = 'has_note';
  else if (badge.includes('tài liệu')) edgeTypeToParent = 'has_resource';

  return {
    id: docNode.id,
    title: docNode.title,
    type: (docNode.nodeType === 'note' || docNode.nodeType === 'resource'
      ? docNode.nodeType
      : 'topic') as GraphNodeType,
    domain: 'general',
    hopDistance,
    parentHopId: parentId,
    edgeTypeToParent,
    tags: [],
    children: Array.isArray(docNode.children)
      ? docNode.children.map((child) =>
          documentTreeToProjectedTree(child, layoutMode, hopDistance + 1, docNode.id)
        )
      : [],
  };
}
