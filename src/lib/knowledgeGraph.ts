import { Topic, Note, Resource, CategoryType, LinkType } from "../types";

export type GraphNodeType = "topic" | "note" | "resource";

export type SemanticEdgeType =
  | LinkType
  | "has_note"
  | "has_resource";

export interface GraphNodeMetadata {
  id: string;
  title: string;
  type: GraphNodeType;
  domain: CategoryType | "general";
  category?: string;
  tags?: string[];
  filePath?: string;
  studyStatus?: string;
  progress?: number;
  hopDistance?: number;
  parentHopId?: string;
}

export interface GraphEdgeMetadata {
  id: string;
  source: string;
  target: string;
  type: SemanticEdgeType;
  strength: number;
  notes?: string;
}

export interface KnowledgeGraphData {
  nodes: Map<string, GraphNodeMetadata>;
  edges: GraphEdgeMetadata[];
  adjacency: Map<string, GraphEdgeMetadata[]>;
  reverseAdjacency: Map<string, GraphEdgeMetadata[]>;
}

export interface GraphTraversalOptions {
  startNodeId: string;
  maxDepth?: number;
  maxNodesLimit?: number;
  edgeTypes?: SemanticEdgeType[];
  nodeTypes?: GraphNodeType[];
}

export interface SubgraphResult {
  rootNodeId?: string;
  nodes: GraphNodeMetadata[];
  edges: GraphEdgeMetadata[];
  depthReached: number;
  totalNodesCount: number;
  hasCycles: boolean;
}

export interface DirectNeighborsResult {
  node?: GraphNodeMetadata;
  nodes: GraphNodeMetadata[];
  edges: GraphEdgeMetadata[];
  degree: number;
}

/**
 * Builds an in-memory knowledge graph data structure from topics, notes, and resources.
 * Automatically purges dangling edges and guarantees zero binary ingestion.
 */
export function buildAdjacencyGraph(data: {
  topics?: Topic[];
  notes?: Note[];
  resources?: Resource[];
}): KnowledgeGraphData {
  const { topics = [], notes = [], resources = [] } = data;

  const nodes = new Map<string, GraphNodeMetadata>();
  const edges: GraphEdgeMetadata[] = [];
  const adjacency = new Map<string, GraphEdgeMetadata[]>();
  const reverseAdjacency = new Map<string, GraphEdgeMetadata[]>();

  // 1. Populate Topic Nodes
  for (const topic of topics) {
    nodes.set(topic.id, {
      id: topic.id,
      title: topic.title,
      type: "topic",
      domain: topic.type || "general",
      category: topic.categoryName || topic.categoryId,
      tags: topic.tags || [],
      studyStatus: topic.studyProgress?.status,
      progress: topic.studyProgress?.progress,
    });
    adjacency.set(topic.id, []);
    reverseAdjacency.set(topic.id, []);
  }

  // 2. Populate Note Nodes (Attached to topics)
  for (const note of notes) {
    if (nodes.has(note.topicId)) {
      const parentTopic = nodes.get(note.topicId);
      nodes.set(note.id, {
        id: note.id,
        title: note.title,
        type: "note",
        domain: parentTopic?.domain || "general",
        tags: note.tags || [],
      });
      adjacency.set(note.id, []);
      reverseAdjacency.set(note.id, []);
    }
  }

  // 3. Populate Resource Nodes (Metadata only, Zero Binary Ingestion)
  for (const res of resources) {
    if (nodes.has(res.topicId)) {
      const parentTopic = nodes.get(res.topicId);
      nodes.set(res.id, {
        id: res.id,
        title: res.title,
        type: "resource",
        domain: parentTopic?.domain || "general",
        filePath: res.filePath,
      });
      adjacency.set(res.id, []);
      reverseAdjacency.set(res.id, []);
    }
  }

  // Helper to add valid edge
  const addEdge = (edge: GraphEdgeMetadata) => {
    if (nodes.has(edge.source) && nodes.has(edge.target)) {
      edges.push(edge);
      adjacency.get(edge.source)?.push(edge);
      reverseAdjacency.get(edge.target)?.push(edge);
    }
  };

  // 4. Populate Topic-to-Topic Semantic Edges (Purge dangling edges)
  for (const topic of topics) {
    if (topic.links && Array.isArray(topic.links)) {
      for (const link of topic.links) {
        addEdge({
          id: link.id || `edge-${topic.id}-${link.targetId}-${link.linkType}`,
          source: topic.id,
          target: link.targetId,
          type: link.linkType,
          strength: link.strength || 3,
          notes: link.notes,
        });
      }
    }
  }

  // 5. Populate Structural Edges (Topic -> Note)
  for (const note of notes) {
    if (nodes.has(note.topicId) && nodes.has(note.id)) {
      addEdge({
        id: `has_note-${note.topicId}-${note.id}`,
        source: note.topicId,
        target: note.id,
        type: "has_note",
        strength: 2,
      });
    }
  }

  // 6. Populate Structural Edges (Topic -> Resource)
  for (const res of resources) {
    if (nodes.has(res.topicId) && nodes.has(res.id)) {
      addEdge({
        id: `has_resource-${res.topicId}-${res.id}`,
        source: res.topicId,
        target: res.id,
        type: "has_resource",
        strength: 2,
      });
    }
  }

  return { nodes, edges, adjacency, reverseAdjacency };
}

/**
 * Retrieves the 1-hop direct neighborhood and computes the degree of a given node.
 */
export function getDirectNeighbors(
  graph: KnowledgeGraphData,
  nodeId: string,
): DirectNeighborsResult {
  const rootNode = graph.nodes.get(nodeId);
  if (!rootNode) {
    return { nodes: [], edges: [], degree: 0 };
  }

  const outgoingEdges = graph.adjacency.get(nodeId) || [];
  const incomingEdges = graph.reverseAdjacency.get(nodeId) || [];

  const neighborIds = new Set<string>();
  const neighborEdges: GraphEdgeMetadata[] = [];

  for (const edge of outgoingEdges) {
    neighborIds.add(edge.target);
    neighborEdges.push(edge);
  }
  for (const edge of incomingEdges) {
    neighborIds.add(edge.source);
    neighborEdges.push(edge);
  }

  const neighborNodes: GraphNodeMetadata[] = [];
  for (const id of neighborIds) {
    const n = graph.nodes.get(id);
    if (n) neighborNodes.push(n);
  }

  return {
    node: rootNode,
    nodes: neighborNodes,
    edges: neighborEdges,
    degree: neighborEdges.length,
  };
}

/**
 * Traverses the knowledge graph using Breadth-First Search (BFS) with hard limits on depth and node count.
 * Detects cycles and guarantees cycle avoidance.
 */
export function traverseMultiHop(
  graph: KnowledgeGraphData,
  options: GraphTraversalOptions,
): SubgraphResult {
  const {
    startNodeId,
    maxDepth = 2,
    maxNodesLimit = 200,
    edgeTypes,
    nodeTypes,
  } = options;

  // Apply hard caps for safety
  const safeMaxDepth = Math.min(Math.max(1, maxDepth), 5);
  const safeMaxNodes = Math.min(Math.max(1, maxNodesLimit), 500);

  const startNode = graph.nodes.get(startNodeId);
  if (!startNode) {
    return {
      rootNodeId: startNodeId,
      nodes: [],
      edges: [],
      depthReached: 0,
      totalNodesCount: 0,
      hasCycles: false,
    };
  }

  const visitedNodeIds = new Set<string>([startNodeId]);
  const rootWithHop: GraphNodeMetadata = {
    ...startNode,
    hopDistance: 0,
    parentHopId: undefined,
  };
  const resultNodes: GraphNodeMetadata[] = [rootWithHop];
  const resultEdges: GraphEdgeMetadata[] = [];
  const edgeIdSet = new Set<string>();

  let hasCycles = false;
  let depthReached = 0;

  // Semantic edge type priority for deterministic expansion
  const edgeTypePriority: Record<string, number> = {
    prerequisite: 5,
    advanced: 4,
    related: 3,
    contradicts: 2,
    has_note: 1,
    has_resource: 1,
  };

  // BFS Queue: [nodeId, currentDepth]
  const queue: Array<[string, number]> = [[startNodeId, 0]];

  while (queue.length > 0) {
    const [currentId, currentDepth] = queue.shift()!;

    if (currentDepth >= safeMaxDepth || resultNodes.length >= safeMaxNodes) {
      continue;
    }

    const outgoing = graph.adjacency.get(currentId) || [];
    const incoming = graph.reverseAdjacency.get(currentId) || [];

    // Sort adjacent edges deterministically:
    // 1. strength desc
    // 2. semantic edge priority desc
    // 3. neighborId asc, then edge.id asc
    const adjacentEdges = [...outgoing, ...incoming].sort((a, b) => {
      const strengthDiff = (b.strength || 0) - (a.strength || 0);
      if (strengthDiff !== 0) return strengthDiff;

      const priorityDiff = (edgeTypePriority[b.type] || 0) - (edgeTypePriority[a.type] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      const neighborA = a.source === currentId ? a.target : a.source;
      const neighborB = b.source === currentId ? b.target : b.source;
      if (neighborA !== neighborB) {
        return neighborA.localeCompare(neighborB);
      }
      return a.id.localeCompare(b.id);
    });

    for (const edge of adjacentEdges) {
      // Filter edge types if specified
      if (edgeTypes && !edgeTypes.includes(edge.type)) {
        continue;
      }

      const neighborId = edge.source === currentId ? edge.target : edge.source;
      const neighborNode = graph.nodes.get(neighborId);
      if (!neighborNode) continue;

      // Filter node types if specified
      if (nodeTypes && !nodeTypes.includes(neighborNode.type)) {
        continue;
      }

      // Check for cycles
      if (visitedNodeIds.has(neighborId)) {
        if (neighborId !== currentId) {
          hasCycles = true;
        }
      } else {
        if (resultNodes.length < safeMaxNodes) {
          visitedNodeIds.add(neighborId);
          const neighborWithHop: GraphNodeMetadata = {
            ...neighborNode,
            hopDistance: currentDepth + 1,
            parentHopId: currentId,
          };
          resultNodes.push(neighborWithHop);
          depthReached = Math.max(depthReached, currentDepth + 1);
          queue.push([neighborId, currentDepth + 1]);
        }
      }

      // Collect edge once
      if (!edgeIdSet.has(edge.id)) {
        edgeIdSet.add(edge.id);
        resultEdges.push(edge);
      }
    }
  }

  return {
    rootNodeId: startNodeId,
    nodes: resultNodes,
    edges: resultEdges,
    depthReached,
    totalNodesCount: resultNodes.length,
    hasCycles,
  };
}

/**
 * Filters the entire knowledge graph based on specific node types and edge types.
 */
export function filterSubgraph(
  graph: KnowledgeGraphData,
  options: {
    nodeTypes?: GraphNodeType[];
    edgeTypes?: SemanticEdgeType[];
  },
): SubgraphResult {
  const { nodeTypes, edgeTypes } = options;

  const validNodes: GraphNodeMetadata[] = [];
  const validNodeIdSet = new Set<string>();

  for (const node of graph.nodes.values()) {
    if (!nodeTypes || nodeTypes.includes(node.type)) {
      validNodes.push(node);
      validNodeIdSet.add(node.id);
    }
  }

  const validEdges: GraphEdgeMetadata[] = [];
  for (const edge of graph.edges) {
    if (
      validNodeIdSet.has(edge.source) &&
      validNodeIdSet.has(edge.target) &&
      (!edgeTypes || edgeTypes.includes(edge.type))
    ) {
      validEdges.push(edge);
    }
  }

  return {
    nodes: validNodes,
    edges: validEdges,
    depthReached: 0,
    totalNodesCount: validNodes.length,
    hasCycles: false,
  };
}
