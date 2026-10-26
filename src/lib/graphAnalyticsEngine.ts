/**
 * Graph Intelligence Engine (Phase 10A — ADR-114).
 *
 * Implements:
 * 1. Weighted Degree & Iterative PageRank Centrality Ranking (Hubs detection).
 * 2. Orphan Topic Detector ('completely-isolated' vs 'unlinked-island').
 * 3. Connected Components clustering & Network Density analysis.
 * 4. Local Vector-driven Semantic Bridge Recommender (Cosine similarity over 128-D embeddings).
 *
 * Strictly zero database migrations: pure functions with hermetic execution.
 */

import type { Topic, Note, Resource, LinkType } from '../types';
import {
  KnowledgeGraphData,
  GraphNodeType,
  buildAdjacencyGraph,
} from './knowledgeGraph';
import {
  computeLocalEmbedding,
  cosineSimilarity,
} from './vectorSearchEngine';
import { normalizeScholarText } from './scholarSearch';

export interface GraphCentralityEntry {
  nodeId: string;
  title: string;
  type: GraphNodeType;
  domain: string;
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  weightedDegree: number;
  pageRankScore: number;
}

export interface OrphanTopicReport {
  topicId: string;
  title: string;
  domain: string;
  status: 'completely-isolated' | 'unlinked-island';
  noteCount: number;
  resourceCount: number;
}

export interface GraphClusterSummary {
  clusterId: string;
  nodeIds: string[];
  topicCount: number;
  totalNodes: number;
  dominantDomain: string;
}

export interface TopologyHealthReport {
  totalNodes: number;
  totalEdges: number;
  networkDensity: number;
  clusterCount: number;
  clusters: GraphClusterSummary[];
  orphanTopics: OrphanTopicReport[];
}

export interface SemanticBridgeRecommendation {
  id: string;
  sourceTopicId: string;
  sourceTitle: string;
  targetTopicId: string;
  targetTitle: string;
  similarityScore: number;
  suggestedLinkType: LinkType;
  suggestedStrength: number;
  sharedTerms: string[];
  isCrossDomain: boolean;
  reason: string;
}

export interface GraphIntelligenceReport {
  centralityRanking: GraphCentralityEntry[];
  topHubs: GraphCentralityEntry[];
  topology: TopologyHealthReport;
  bridgeRecommendations: SemanticBridgeRecommendation[];
}

/**
 * Computes Degree Centrality and iterative PageRank for all nodes in the knowledge graph.
 */
export function computeGraphCentrality(
  graph: KnowledgeGraphData,
  options?: { dampingFactor?: number; iterations?: number }
): GraphCentralityEntry[] {
  const dampingFactor = options?.dampingFactor ?? 0.85;
  const iterations = options?.iterations ?? 25;

  const nodeEntries = Array.from(graph.nodes.values());
  const N = nodeEntries.length;

  if (N === 0) {
    return [];
  }

  // Pre-calculate degrees and weighted degree
  const degrees = new Map<
    string,
    { inDegree: number; outDegree: number; totalDegree: number; weightedDegree: number }
  >();

  for (const node of nodeEntries) {
    const incoming = graph.reverseAdjacency.get(node.id) || [];
    const outgoing = graph.adjacency.get(node.id) || [];

    const inDegree = incoming.length;
    const outDegree = outgoing.length;
    const totalDegree = inDegree + outDegree;

    const inWeight = incoming.reduce((sum, e) => sum + (e.strength || 1), 0);
    const outWeight = outgoing.reduce((sum, e) => sum + (e.strength || 1), 0);
    const weightedDegree = inWeight + outWeight;

    degrees.set(node.id, { inDegree, outDegree, totalDegree, weightedDegree });
  }

  // PageRank initialization
  let pr = new Map<string, number>();
  const initialScore = 1 / N;
  for (const node of nodeEntries) {
    pr.set(node.id, initialScore);
  }

  // Iterative PageRank loop
  for (let iter = 0; iter < iterations; iter++) {
    const nextPr = new Map<string, number>();
    let danglingSum = 0;

    for (const node of nodeEntries) {
      const deg = degrees.get(node.id);
      if (!deg || deg.outDegree === 0) {
        danglingSum += pr.get(node.id) || 0;
      }
    }

    for (const node of nodeEntries) {
      const incoming = graph.reverseAdjacency.get(node.id) || [];
      let incomingSum = 0;

      for (const edge of incoming) {
        const sourceOutDegree = degrees.get(edge.source)?.outDegree || 1;
        const sourcePr = pr.get(edge.source) || 0;
        incomingSum += sourcePr / sourceOutDegree;
      }

      const newScore =
        (1 - dampingFactor) / N +
        dampingFactor * (danglingSum / N + incomingSum);

      nextPr.set(node.id, newScore);
    }

    pr = nextPr;
  }

  // Convert to formatted entries and sort
  const results: GraphCentralityEntry[] = nodeEntries.map((node) => {
    const deg = degrees.get(node.id) || {
      inDegree: 0,
      outDegree: 0,
      totalDegree: 0,
      weightedDegree: 0,
    };
    const rawPr = pr.get(node.id) || 0;
    // Scale PageRank to percentage [0, 100] with 3 decimal precision
    const pageRankScore = Math.round(rawPr * 100 * 1000) / 1000;

    return {
      nodeId: node.id,
      title: node.title,
      type: node.type,
      domain: node.domain,
      inDegree: deg.inDegree,
      outDegree: deg.outDegree,
      totalDegree: deg.totalDegree,
      weightedDegree: deg.weightedDegree,
      pageRankScore,
    };
  });

  // Sort descending by PageRank, tie-break by weightedDegree, then nodeId
  results.sort((a, b) => {
    if (b.pageRankScore !== a.pageRankScore) {
      return b.pageRankScore - a.pageRankScore;
    }
    if (b.weightedDegree !== a.weightedDegree) {
      return b.weightedDegree - a.weightedDegree;
    }
    return a.nodeId.localeCompare(b.nodeId);
  });

  return results;
}

/**
 * Detects orphan topics ('completely-isolated' vs 'unlinked-island'),
 * computes connected components, and calculates overall network density.
 */
export function detectOrphanNodesAndClusters(
  graph: KnowledgeGraphData,
  data?: { topics?: Topic[]; notes?: Note[]; resources?: Resource[] }
): TopologyHealthReport {
  const topics = data?.topics ?? Array.from(graph.nodes.values())
    .filter((n) => n.type === 'topic')
    .map((n) => ({
      id: n.id,
      title: n.title,
      type: n.domain,
      categoryId: n.category,
      links: [],
      createdAt: '',
      updatedAt: '',
    } as unknown as Topic));

  const notes = data?.notes || [];
  const resources = data?.resources || [];

  // Count notes and resources per topic
  const noteCounts = new Map<string, number>();
  for (const n of notes) {
    noteCounts.set(n.topicId, (noteCounts.get(n.topicId) || 0) + 1);
  }

  const resourceCounts = new Map<string, number>();
  for (const r of resources) {
    resourceCounts.set(r.topicId, (resourceCounts.get(r.topicId) || 0) + 1);
  }

  // Count semantic links between topics (excluding structural has_note / has_resource)
  const topicSemanticDegrees = new Map<string, number>();
  const undirectedTopicAdjacency = new Map<string, Set<string>>();

  for (const t of topics) {
    topicSemanticDegrees.set(t.id, 0);
    undirectedTopicAdjacency.set(t.id, new Set());
  }

  for (const edge of graph.edges) {
    if (edge.type !== 'has_note' && edge.type !== 'has_resource') {
      if (undirectedTopicAdjacency.has(edge.source) && undirectedTopicAdjacency.has(edge.target)) {
        topicSemanticDegrees.set(
          edge.source,
          (topicSemanticDegrees.get(edge.source) || 0) + 1
        );
        topicSemanticDegrees.set(
          edge.target,
          (topicSemanticDegrees.get(edge.target) || 0) + 1
        );

        undirectedTopicAdjacency.get(edge.source)?.add(edge.target);
        undirectedTopicAdjacency.get(edge.target)?.add(edge.source);
      }
    }
  }

  // Identify orphan topics
  const orphanTopics: OrphanTopicReport[] = [];
  for (const t of topics) {
    const semDeg = topicSemanticDegrees.get(t.id) || 0;
    if (semDeg === 0) {
      const nCt = noteCounts.get(t.id) || 0;
      const rCt = resourceCounts.get(t.id) || 0;
      const status = nCt === 0 && rCt === 0 ? 'completely-isolated' : 'unlinked-island';

      orphanTopics.push({
        topicId: t.id,
        title: t.title,
        domain: t.type || 'general',
        status,
        noteCount: nCt,
        resourceCount: rCt,
      });
    }
  }

  // Partition topics into connected components using BFS
  const visited = new Set<string>();
  const clusters: GraphClusterSummary[] = [];

  for (const t of topics) {
    if (!visited.has(t.id)) {
      const clusterNodeIds: string[] = [];
      const queue = [t.id];
      visited.add(t.id);

      const domainCounts = new Map<string, number>();

      while (queue.length > 0) {
        const curr = queue.shift()!;
        clusterNodeIds.push(curr);

        const currTopic = topics.find((item) => item.id === curr);
        const dom = currTopic?.type || 'general';
        domainCounts.set(dom, (domainCounts.get(dom) || 0) + 1);

        const neighbors = undirectedTopicAdjacency.get(curr) || new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      let dominantDomain = 'general';
      let maxDomCount = -1;
      for (const [dom, count] of domainCounts.entries()) {
        if (count > maxDomCount) {
          maxDomCount = count;
          dominantDomain = dom;
        }
      }

      clusters.push({
        clusterId: `cluster-${clusters.length + 1}`,
        nodeIds: clusterNodeIds,
        topicCount: clusterNodeIds.length,
        totalNodes: clusterNodeIds.length,
        dominantDomain,
      });
    }
  }

  // Calculate network density: 2 * |E| / (|V| * (|V| - 1))
  const totalNodes = graph.nodes.size;
  const totalEdges = graph.edges.length;
  let networkDensity = 0;

  if (totalNodes > 1) {
    const maxPossibleEdges = totalNodes * (totalNodes - 1);
    // Standard directed network density
    const rawDensity = (2 * totalEdges) / maxPossibleEdges;
    networkDensity = Math.min(1, Math.max(0, Math.round(rawDensity * 1000) / 1000));
  }

  return {
    totalNodes,
    totalEdges,
    networkDensity,
    clusterCount: clusters.length,
    clusters,
    orphanTopics,
  };
}

/**
 * Recommends semantic bridges between unlinked topics using local 128-D vector embeddings.
 */
export function recommendSemanticBridges(
  topics: Topic[],
  options?: {
    notes?: Note[];
    minSimilarity?: number;
    maxRecommendations?: number;
  }
): SemanticBridgeRecommendation[] {
  const minSimilarity = options?.minSimilarity ?? 0.28;
  const maxRecommendations = options?.maxRecommendations ?? 20;

  if (topics.length < 2) {
    return [];
  }

  // Build set of existing direct links in both directions
  const existingLinks = new Set<string>();
  for (const t of topics) {
    if (t.links && Array.isArray(t.links)) {
      for (const l of t.links) {
        existingLinks.add(`${t.id}::${l.targetId}`);
        existingLinks.add(`${l.targetId}::${t.id}`);
      }
    }
  }

  // Pre-aggregate notes per topic
  const notesByTopic = new Map<string, string[]>();
  if (options?.notes) {
    for (const n of options.notes) {
      const arr = notesByTopic.get(n.topicId) || [];
      arr.push(`${n.title} ${n.content}`);
      notesByTopic.set(n.topicId, arr);
    }
  }

  // Pre-compute 128-D embeddings and extract distinctive terms
  const embeddings = new Map<string, Float32Array>();
  const termsMap = new Map<string, Set<string>>();

  const stopwords = new Set([
    'va', 'la', 'cac', 'cua', 'nhung', 'cho', 'trong', 'duoc', 'voi', 've',
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'then', 'not',
    'nghien', 'cuu', 'chu', 'de', 'bai', 'viet', 'hoc', 'tap',
  ]);

  for (const t of topics) {
    const noteText = (notesByTopic.get(t.id) || []).slice(0, 5).join(' ');
    const tagText = (t.tags || []).join(' ');
    const richText = `${t.title} ${t.description || ''} ${t.content || ''} ${tagText} ${noteText}`.trim();

    embeddings.set(t.id, computeLocalEmbedding(richText, 128));

    const normalizedWords = normalizeScholarText(richText)
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !stopwords.has(w));

    const termsSet = new Set<string>(normalizedWords);
    for (const tag of t.tags || []) {
      const normTag = normalizeScholarText(tag);
      if (normTag.length >= 2) {
        termsSet.add(normTag);
      }
    }

    termsMap.set(t.id, termsSet);
  }

  const recommendations: SemanticBridgeRecommendation[] = [];

  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const topicA = topics[i];
      const topicB = topics[j];

      // Skip if already linked in either direction
      if (existingLinks.has(`${topicA.id}::${topicB.id}`)) {
        continue;
      }

      const vecA = embeddings.get(topicA.id)!;
      const vecB = embeddings.get(topicB.id)!;
      const rawSim = cosineSimilarity(vecA, vecB);
      const similarityScore = Math.round(rawSim * 1000) / 1000;

      // Find shared terms
      const setA = termsMap.get(topicA.id)!;
      const setB = termsMap.get(topicB.id)!;
      const sharedTerms: string[] = [];

      for (const term of setA) {
        if (setB.has(term)) {
          sharedTerms.push(term);
        }
      }

      // Check if candidate qualifies
      const qualifies =
        similarityScore >= minSimilarity ||
        (sharedTerms.length >= 2 && similarityScore >= 0.2);

      if (qualifies) {
        // Suggested Strength mapping: 1..5
        let suggestedStrength = 2;
        if (similarityScore >= 0.75) suggestedStrength = 5;
        else if (similarityScore >= 0.55) suggestedStrength = 4;
        else if (similarityScore >= 0.4) suggestedStrength = 3;

        // Suggested Link Type inference
        const combinedRaw =
          `${topicA.title} ${topicA.description || ''} ${topicB.title} ${topicB.description || ''}`.toLowerCase();
        const combinedNorm = normalizeScholarText(combinedRaw);

        let suggestedLinkType: LinkType = 'related';
        if (
          /\b(mau thuan|mâu thuẫn|trai nguoc|trái ngược|phan bac|phản bác|doi lap|đối lập|contradict|refute|oppose)\b/i.test(
            combinedRaw
          ) ||
          /\b(mau thuan|trai nguoc|phan bac|doi lap|contradict|refute|oppose)\b/i.test(
            combinedNorm
          )
        ) {
          suggestedLinkType = 'contradicts';
        } else if (
          /\b(tien quyet|tiên quyết|nen tang|nền tảng|co ban|cơ bản|truoc khi|trước khi|prerequisite|foundation|fundamental)\b/i.test(
            combinedRaw
          ) ||
          /\b(tien quyet|nen tang|co ban|truoc khi|prerequisite|foundation|fundamental)\b/i.test(
            combinedNorm
          )
        ) {
          suggestedLinkType = 'prerequisite';
        } else if (
          /\b(nang cao|nâng cao|chuyen sau|chuyên sâu|mo rong|mở rộng|advanced|extended)\b/i.test(
            combinedRaw
          ) ||
          /\b(nang cao|chuyen sau|mo rong|advanced|extended)\b/i.test(
            combinedNorm
          )
        ) {
          suggestedLinkType = 'advanced';
        }

        // Cross-domain detection
        const isCrossDomain = Boolean(
          (topicA.categoryId &&
            topicB.categoryId &&
            topicA.categoryId !== topicB.categoryId) ||
            (topicA.type && topicB.type && topicA.type !== topicB.type)
        );

        const reason =
          `Độ tương đồng ngữ nghĩa ${Math.round(similarityScore * 100)}%` +
          (sharedTerms.length > 0
            ? ` (khái niệm chung: ${sharedTerms.slice(0, 3).join(', ')})`
            : '');

        recommendations.push({
          id: `bridge-${topicA.id}-${topicB.id}`,
          sourceTopicId: topicA.id,
          sourceTitle: topicA.title,
          targetTopicId: topicB.id,
          targetTitle: topicB.title,
          similarityScore,
          suggestedLinkType,
          suggestedStrength,
          sharedTerms,
          isCrossDomain,
          reason,
        });
      }
    }
  }

  // Sort descending by similarityScore
  recommendations.sort((a, b) => b.similarityScore - a.similarityScore);

  return recommendations.slice(0, maxRecommendations);
}

/**
 * Main coordinator function producing a comprehensive Graph Intelligence Report.
 */
export function analyzeKnowledgeGraphIntelligence(
  data: { topics: Topic[]; notes?: Note[]; resources?: Resource[] },
  options?: { minSimilarity?: number; maxRecommendations?: number }
): GraphIntelligenceReport {
  const { topics, notes = [], resources = [] } = data;

  const graph = buildAdjacencyGraph({ topics, notes, resources });

  const centralityRanking = computeGraphCentrality(graph);
  const topHubs = centralityRanking.slice(0, 5);

  const topology = detectOrphanNodesAndClusters(graph, { topics, notes, resources });

  const bridgeRecommendations = recommendSemanticBridges(topics, {
    notes,
    minSimilarity: options?.minSimilarity,
    maxRecommendations: options?.maxRecommendations,
  });

  return {
    centralityRanking,
    topHubs,
    topology,
    bridgeRecommendations,
  };
}
