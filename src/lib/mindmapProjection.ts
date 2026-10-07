import {
  buildAdjacencyGraph,
  traverseMultiHop,
  GraphNodeType,
  SemanticEdgeType,
  GraphNodeMetadata,
  KnowledgeGraphData,
  SubgraphResult,
} from "./knowledgeGraph";
import { Topic, Note, Resource, TopicStatus, CategoryType } from "../types";

export type MindMapLayoutMode = "tree_horizontal" | "tree_vertical";

export interface MindMapTreeNode {
  id: string;
  title: string;
  type: GraphNodeType;
  domain: CategoryType | "general";
  categoryName?: string;
  studyStatus?: TopicStatus;
  progress?: number;
  hopDistance: number;
  parentHopId?: string;
  edgeTypeToParent?: SemanticEdgeType;
  edgeStrength?: number;
  tags: string[];
  children: MindMapTreeNode[];
}

export interface MindMapTreeProjection {
  rootNodeId: string;
  rootTitle: string;
  layoutMode: MindMapLayoutMode;
  maxDepthReached: number;
  totalNodesCount: number;
  hasTruncatedBranches: boolean;
  hasCyclesDetected: boolean;
  tree: MindMapTreeNode;
  generatedAt: string;
}

export interface MindMapProjectionOptions {
  maxDepth?: number;
  maxNodesLimit?: number;
  layoutMode?: MindMapLayoutMode;
}

// Semantic edge priority map strictly matching knowledgeGraph.ts
const SEMANTIC_EDGE_PRIORITY: Record<string, number> = {
  prerequisite: 5,
  advanced: 4,
  related: 3,
  contradicts: 2,
  has_note: 1,
  has_resource: 1,
};

/**
 * Projects a general knowledge graph into a deterministic, single-parent MindMap Spanning Tree.
 * Leverages buildAdjacencyGraph and traverseMultiHop from knowledgeGraph.ts.
 */
export function projectToMindMapTree(
  dataSource:
    | KnowledgeGraphData
    | {
        topics?: Topic[];
        notes?: Note[];
        resources?: Resource[];
      },
  rootTopicId: string,
  options?: MindMapProjectionOptions
): MindMapTreeProjection | null {
  if (!rootTopicId) return null;

  // 1. Resolve or reuse in-memory graph
  const graph: KnowledgeGraphData =
    "nodes" in dataSource && "adjacency" in dataSource
      ? dataSource
      : buildAdjacencyGraph(dataSource);

  const rootMeta = graph.nodes.get(rootTopicId);
  if (!rootMeta) {
    return null;
  }

  const maxDepth = options?.maxDepth ?? 3;
  const maxNodesLimit = options?.maxNodesLimit ?? 100;
  const layoutMode = options?.layoutMode ?? "tree_horizontal";

  const safeMaxDepth = Math.min(Math.max(1, maxDepth), 5);
  const safeMaxNodes = Math.min(Math.max(1, maxNodesLimit), 500);

  // 2. Perform bounded deterministic BFS traversal
  const subgraph: SubgraphResult = traverseMultiHop(graph, {
    startNodeId: rootTopicId,
    maxDepth: safeMaxDepth,
    maxNodesLimit: safeMaxNodes,
  });

  if (subgraph.nodes.length === 0) {
    return null;
  }

  // 3. Map GraphNodeMetadata to MindMapTreeNode dictionary
  const treeNodeMap = new Map<string, MindMapTreeNode>();
  const childrenMap = new Map<string, MindMapTreeNode[]>();

  for (const node of subgraph.nodes) {
    let edgeTypeToParent: SemanticEdgeType | undefined = undefined;
    let edgeStrength: number | undefined = undefined;

    if (node.parentHopId) {
      const parentId = node.parentHopId;
      const matchedEdge = subgraph.edges.find(
        (e) =>
          (e.source === parentId && e.target === node.id) ||
          (e.source === node.id && e.target === parentId)
      );

      if (matchedEdge) {
        edgeTypeToParent = matchedEdge.type;
        edgeStrength = matchedEdge.strength;
      } else {
        edgeTypeToParent = "related";
        edgeStrength = 3;
      }
    }

    const treeNode: MindMapTreeNode = {
      id: node.id,
      title: node.title,
      type: node.type,
      domain: node.domain,
      categoryName: node.category,
      studyStatus: node.studyStatus as TopicStatus | undefined,
      progress: node.progress,
      hopDistance: node.hopDistance ?? 0,
      parentHopId: node.parentHopId,
      edgeTypeToParent,
      edgeStrength,
      tags: node.tags || [],
      children: [],
    };

    treeNodeMap.set(node.id, treeNode);
  }

  // 4. Build single-parent hierarchy
  for (const node of treeNodeMap.values()) {
    if (node.parentHopId && treeNodeMap.has(node.parentHopId)) {
      if (!childrenMap.has(node.parentHopId)) {
        childrenMap.set(node.parentHopId, []);
      }
      childrenMap.get(node.parentHopId)!.push(node);
    }
  }

  // 5. Attach children recursively and sort deterministically
  const sortChildren = (children: MindMapTreeNode[]) => {
    children.sort((a, b) => {
      // 1. edgeStrength desc
      const strengthDiff = (b.edgeStrength || 0) - (a.edgeStrength || 0);
      if (strengthDiff !== 0) return strengthDiff;

      // 2. semantic edge priority desc
      const priorityA = a.edgeTypeToParent
        ? SEMANTIC_EDGE_PRIORITY[a.edgeTypeToParent] || 0
        : 0;
      const priorityB = b.edgeTypeToParent
        ? SEMANTIC_EDGE_PRIORITY[b.edgeTypeToParent] || 0
        : 0;
      const priorityDiff = priorityB - priorityA;
      if (priorityDiff !== 0) return priorityDiff;

      // 3. id asc
      return a.id.localeCompare(b.id);
    });

    for (const child of children) {
      const grandChildren = childrenMap.get(child.id) || [];
      child.children = grandChildren;
      sortChildren(grandChildren);
    }
  };

  const rootNode = treeNodeMap.get(rootTopicId);
  if (!rootNode) return null;

  rootNode.children = childrenMap.get(rootTopicId) || [];
  sortChildren(rootNode.children);

  // 6. Best-effort truncation signal calculation
  let hasTruncatedBranches = subgraph.totalNodesCount >= safeMaxNodes;
  if (!hasTruncatedBranches && subgraph.depthReached >= safeMaxDepth) {
    // Check if any leaf node at maxDepth has unvisited outgoing/incoming edges in base graph
    const visitedSet = new Set(subgraph.nodes.map((n) => n.id));
    for (const node of subgraph.nodes) {
      if ((node.hopDistance ?? 0) >= safeMaxDepth) {
        const outgoing = graph.adjacency.get(node.id) || [];
        const incoming = graph.reverseAdjacency.get(node.id) || [];
        const hasUnvisited = [...outgoing, ...incoming].some((e) => {
          const neighborId = e.source === node.id ? e.target : e.source;
          return !visitedSet.has(neighborId);
        });
        if (hasUnvisited) {
          hasTruncatedBranches = true;
          break;
        }
      }
    }
  }

  return {
    rootNodeId: rootNode.id,
    rootTitle: rootNode.title,
    layoutMode,
    maxDepthReached: subgraph.depthReached,
    totalNodesCount: subgraph.totalNodesCount,
    hasTruncatedBranches,
    hasCyclesDetected: subgraph.hasCycles,
    tree: rootNode,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Serializes a MindMapTreeProjection to structured Markdown outline with safe link fallbacks.
 */
export function exportMindMapToMarkdown(
  projection: MindMapTreeProjection,
  topicMap?: Map<string, Topic>
): string {
  const { tree, generatedAt } = projection;

  const lines: string[] = [
    `# 🗺️ Sơ Đồ Tư Duy: ${tree.title}`,
    `> Nguồn: Knowledge OS • Xuất bản lúc: ${generatedAt}`,
    "",
  ];

  const formatStudyStatus = (node: MindMapTreeNode): string => {
    if (node.progress !== undefined && node.progress !== null) {
      if (node.progress >= 100 || node.studyStatus === "completed") {
        return " `[Hoàn thành: 100%]`";
      }
      return ` \`[Tiến độ: ${Math.round(node.progress)}%]\``;
    }
    if (node.studyStatus === "in_progress") return " `[Đang học]`";
    if (node.studyStatus === "reviewing") return " `[Đang ôn tập]`";
    if (node.studyStatus === "not_started") return " `[Chưa học]`";
    return "";
  };

  const getRelationBadge = (node: MindMapTreeNode): string => {
    if (!node.edgeTypeToParent) return "";
    switch (node.edgeTypeToParent) {
      case "prerequisite":
        return "[tiên quyết] ";
      case "advanced":
        return "[nâng cao] ";
      case "related":
        return "[liên quan] ";
      case "contradicts":
        return "[đối chiếu] ";
      case "has_note":
        return "[ghi chú] ";
      case "has_resource":
        return "[tài liệu] ";
      default:
        return `[${node.edgeTypeToParent}] `;
    }
  };

  const renderNodeRecursive = (
    node: MindMapTreeNode,
    level: number,
    ancestorTopicId?: string
  ) => {
    const indent = "  ".repeat(level);
    const rel = getRelationBadge(node);
    const status = formatStudyStatus(node);

    let icon = "📚";
    if (node.type === "note") icon = "📝";
    if (node.type === "resource") icon = "🔗";

    let labelWithLink = node.title;

    if (node.type === "topic") {
      // Topic always links to #/topics/<id>
      labelWithLink = `**[${node.title}](#/topics/${encodeURIComponent(node.id)})**`;
    } else {
      // Note or Resource: Try to resolve parent topic link
      const potentialParentId = node.parentHopId || ancestorTopicId;
      const resolvedParentId =
        potentialParentId && (topicMap ? topicMap.has(potentialParentId) : true)
          ? potentialParentId
          : undefined;

      if (resolvedParentId) {
        labelWithLink = `[${node.title}](#/topics/${encodeURIComponent(resolvedParentId)})`;
      } else {
        // Safe fallback: plain text without broken link
        labelWithLink = node.title;
      }
    }

    lines.push(`${indent}- ${rel}${icon} ${labelWithLink}${status}`);

    const currentTopicContext =
      node.type === "topic" ? node.id : ancestorTopicId;

    for (const child of node.children) {
      renderNodeRecursive(child, level + 1, currentTopicContext);
    }
  };

  renderNodeRecursive(tree, 0, tree.id);

  return lines.join("\n");
}
