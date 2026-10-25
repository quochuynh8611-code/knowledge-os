/**
 * Core Vector Search, Hybrid RRF & Grounded RAG Engine (Phase 5 — Chặng 5A)
 *
 * Implements:
 * 1. 128-dimensional local semantic embedding via Character Trigrams, Token Projections,
 *    and Balanced-Sign Academic Bilingual Concept Clusters (Zero external API dependencies, hermetic).
 * 2. Cosine Similarity & L2 vector normalization.
 * 3. 5-Entity Knowledge Document Indexer ('topic' | 'note' | 'resource' | 'flashcard' | 'excerpt').
 * 4. Hybrid Reciprocal Rank Fusion (RRF) combining Okapi BM25 and Semantic Vector scores.
 * 5. Grounded RAG Retrieval Pipeline generating [^SRC-N] citation-annotated context bundles.
 *
 * Strictly adheres to Zero-Default rule and Hermetic test guards.
 */

import type { Note, Resource, Topic, ResearchExcerpt } from "../types";
import type { Flashcard } from "../types/flashcard";
import { normalizeScholarText } from "./scholarSearch";
import { ResearchSearchEngine, SearchableDocument, tokenizeText } from "./researchSearchEngine";

export type KnowledgeEntityType = "topic" | "note" | "resource" | "flashcard" | "excerpt";
export type SearchMode = "keyword" | "semantic" | "hybrid";

export interface KnowledgeSearchDocument {
  id: string;
  entityId: string;
  type: KnowledgeEntityType;
  title: string;
  content: string;
  topicId?: string;
  topicTitle?: string;
  metadata?: Record<string, any>;
  embedding?: Float32Array;
}

export interface HybridSearchResultItem {
  document: KnowledgeSearchDocument;
  score: number;
  bm25Score: number;
  semanticScore: number;
  rrfScore: number;
  matchedTerms?: string[];
}

export interface GroundedContextChunk {
  sourceId: string;
  sourceType: KnowledgeEntityType;
  title: string;
  snippet: string;
  citationMarker: string; // e.g. [^SRC-1]
  similarityScore: number;
  pageNumber?: number;
  url?: string;
}

export interface GroundedRagContextBundle {
  query: string;
  chunks: GroundedContextChunk[];
  totalSources: number;
  formattedPromptContext: string;
}

export interface EmbeddingProvider {
  name: string;
  getEmbedding(text: string): Promise<Float32Array> | Float32Array;
}

/**
 * Fast 32-bit integer hash for string features
 */
function hashString(str: string, seed = 0): number {
  let h = seed ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

/**
 * Academic Concept Cluster Specifications
 * Matches semantic concepts across Vietnamese and English without false positives on substrings.
 */
interface ConceptClusterSpec {
  id: string;
  pattern: RegExp;
  weight: number;
}

const CONCEPT_CLUSTERS: ConceptClusterSpec[] = [
  {
    id: "memory_retention",
    pattern: /\b(tri nho|ky uc|cung co|quen|lang quen|on tap|khoang cach|suy giam|ghi nho|retention|memory|memories|recall|forgetting|decay|spaced|repetition|fsrs|sm2|ebbinghaus|stability|difficulty|retrievability)\b/i,
    weight: 3.5,
  },
  {
    id: "cognition_epistemology",
    pattern: /\b(nhan thuc|tri tue|nao bo|tam ly|tu duy|cognition|cognitive|epistemology|neuroscience|psychology|intellect|perception|mental)\b/i,
    weight: 3.0,
  },
  {
    id: "rag_ai_llm",
    pattern: /\b(rag|retrieval|augmented|generation|hallucination|ao giac|transformer|attention|llm|copilot|embedding|dense vector|grounding|parametric)\b/i,
    weight: 3.5,
  },
  {
    id: "quantum_physics",
    pattern: /\b(luong tu|vat ly|quang hoc|photon|quanta|quantum|wave function|entanglement|schrodinger|spin|subatomic)\b/i,
    weight: 3.0,
  },
  {
    id: "genetics_dna",
    pattern: /\b(di truyen|nhiem sac the|te bao|genetics|genome|dna|rna|heredity|mutation|biology|chromosomes)\b/i,
    weight: 3.0,
  },
  {
    id: "ethics_philosophy",
    pattern: /\b(dao duc|luan ly|triet hoc|nhan sinh|ethics|ethical|morality|moral|philosophy|justice|virtue|deontology)\b/i,
    weight: 3.0,
  },
  {
    id: "algorithm_software",
    pattern: /\b(thuat toan|giai thuat|lap trinh|phan mem|algorithm|algorithmic|computation|data structure|software architecture)\b/i,
    weight: 3.0,
  },
  {
    id: "academic_methodology",
    pattern: /\b(nghien cuu|hoc thuat|phuong phap luan|thuc nghiem|bang chung|trich dan|research methodology|empirical|citation|scholar|hypothesis)\b/i,
    weight: 2.5,
  },
];

/**
 * Pre-computes a zero-centered, balanced (+ / -) feature seed vector for a concept cluster.
 * This guarantees zero expected correlation with orthogonal clusters.
 */
function getClusterSeedVector(clusterId: string, dimensions: number): Float64Array {
  const seedVec = new Float64Array(dimensions);
  for (let i = 0; i < 16; i++) {
    const h = hashString(`${clusterId}:${i}`, 0x9e3779b9);
    const dim = h % dimensions;
    const sign = (h & 0x80000000) ? -1 : 1;
    seedVec[dim] += sign * 3.0;
  }
  return seedVec;
}

// Cache of cluster vectors per dimension
const clusterVectorCache = new Map<string, Float64Array>();
function getCachedClusterVector(clusterId: string, dimensions: number): Float64Array {
  const key = `${clusterId}:${dimensions}`;
  let vec = clusterVectorCache.get(key);
  if (!vec) {
    vec = getClusterSeedVector(clusterId, dimensions);
    clusterVectorCache.set(key, vec);
  }
  return vec;
}

/**
 * Computes a 128-dimensional L2-normalized vector embedding for given text
 * completely locally using character trigrams, token hashing, and balanced concept clusters.
 */
export function computeLocalEmbedding(text: string, dimensions = 128): Float32Array {
  const vector = new Float32Array(dimensions);
  if (!text || !text.trim()) {
    return vector;
  }

  const normalized = normalizeScholarText(text);
  const rawTokens = tokenizeText(normalized);
  if (rawTokens.length === 0) {
    return vector;
  }

  const rawFeatures = new Float64Array(dimensions);

  // 1. Word Token Projections (balanced +/- signs)
  for (const token of rawTokens) {
    const tokenHash = hashString(token, 1337);
    const dimIdx = tokenHash % dimensions;
    const sign = (tokenHash & 0x80000000) ? -1 : 1;
    rawFeatures[dimIdx] += sign * 1.5;

    // 2. Character Trigram Sliding Window (morphological affinity and typo tolerance)
    if (token.length >= 3) {
      for (let i = 0; i <= token.length - 3; i++) {
        const trigram = token.substring(i, i + 3);
        const triHash = hashString(trigram, 42);
        const triDim = triHash % dimensions;
        const triSign = (triHash & 0x40000000) ? -1 : 1;
        rawFeatures[triDim] += triSign * 0.5;
      }
    }
  }

  // 3. Academic Concept Cluster Activation (adds balanced seed vector when pattern matches)
  for (const cluster of CONCEPT_CLUSTERS) {
    if (cluster.pattern.test(normalized)) {
      const clusterVec = getCachedClusterVector(cluster.id, dimensions);
      for (let i = 0; i < dimensions; i++) {
        rawFeatures[i] += clusterVec[i] * cluster.weight;
      }
    }
  }

  // 4. L2 Normalization: Euclidean norm = sqrt(sum(v_i^2))
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += rawFeatures[i] * rawFeatures[i];
  }

  const norm = Math.sqrt(sumSq);
  if (norm > 1e-9) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = rawFeatures[i] / norm;
    }
  }

  return vector;
}

/**
 * Calculates Cosine Similarity between two L2-normalized vectors.
 * Returns value in [-1, 1] (or 0 for null/zero vectors).
 */
export function cosineSimilarity(vecA: Float32Array, vecB: Float32Array): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA <= 1e-9 || normB <= 1e-9) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Bound to [-1, 1] against floating point inaccuracies
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Indexer: Transforms system entities (topics, notes, resources, flashcards, excerpts)
 * into a unified Searchable Knowledge Document collection.
 */
export function buildSearchableKnowledgeDocuments(data: {
  topics?: Topic[];
  notes?: Note[];
  resources?: Resource[];
  flashcards?: Flashcard[];
  excerpts?: ResearchExcerpt[];
}): KnowledgeSearchDocument[] {
  const docs: KnowledgeSearchDocument[] = [];
  const topicsList = Array.isArray(data.topics) ? data.topics : [];
  const notesList = Array.isArray(data.notes) ? data.notes : [];
  const resourcesList = Array.isArray(data.resources) ? data.resources : [];
  const flashcardsList = Array.isArray(data.flashcards) ? data.flashcards : [];
  const excerptsList = Array.isArray(data.excerpts) ? data.excerpts : [];

  const topicMap = new Map<string, string>();
  for (const t of topicsList) {
    topicMap.set(t.id, t.title);
  }

  const resourceMap = new Map<string, Resource>();
  for (const r of resourcesList) {
    resourceMap.set(r.id, r);
  }

  // 1. Topics
  for (const topic of topicsList) {
    const content = `${topic.title} ${topic.description || ""}`.trim();
    docs.push({
      id: `doc-topic-${topic.id}`,
      entityId: topic.id,
      type: "topic",
      title: topic.title,
      content,
      topicId: topic.id,
      topicTitle: topic.title,
      metadata: { categoryId: topic.categoryId, visibility: topic.visibility },
      embedding: computeLocalEmbedding(content),
    });
  }

  // 2. Notes
  for (const note of notesList) {
    const topicId = note.topicId || (note.topicIds && note.topicIds[0]) || "";
    const tagsStr = (note.tags || []).join(" ");
    const content = `${note.title || ""} ${note.content || ""} ${tagsStr}`.trim();
    docs.push({
      id: `doc-note-${note.id}`,
      entityId: note.id,
      type: "note",
      title: note.title || "Ghi chú không tên",
      content,
      topicId,
      topicTitle: topicMap.get(topicId),
      metadata: { tags: note.tags, updatedAt: note.updatedAt },
      embedding: computeLocalEmbedding(content),
    });
  }

  // 3. Resources
  for (const res of resourcesList) {
    const authorStr = res.author || "";
    const notesStr = res.notes || "";
    const content = `${res.title || ""} ${authorStr} ${notesStr} ${res.url || ""} ${res.filePath || ""}`.trim();
    docs.push({
      id: `doc-res-${res.id}`,
      entityId: res.id,
      type: "resource",
      title: res.title || "Tài liệu",
      content,
      topicId: res.topicId,
      topicTitle: topicMap.get(res.topicId),
      metadata: { type: res.type, author: res.author, url: res.url },
      embedding: computeLocalEmbedding(content),
    });
  }

  // 4. Flashcards
  for (const card of flashcardsList) {
    const content = `${card.front || ""} ${card.back || ""}`.trim();
    docs.push({
      id: `doc-card-${card.id}`,
      entityId: card.id,
      type: "flashcard",
      title: card.front || "Thẻ flashcard",
      content,
      topicId: card.topicId,
      topicTitle: topicMap.get(card.topicId),
      metadata: { type: card.type, state: card.schedule?.state },
      embedding: computeLocalEmbedding(content),
    });
  }

  // 5. Excerpts
  for (const exc of excerptsList) {
    const parentResource = resourceMap.get(exc.archivedDocumentId);
    const parentTitle = parentResource?.title || "Tài liệu lưu trữ";
    const topicId = parentResource?.topicId || "";
    const pageNum = exc.positionSelector?.pageNumber;
    const pageStr = pageNum ? ` (Trang ${pageNum})` : "";
    const title = `Trích dẫn: ${parentTitle}${pageStr}`;
    const content = exc.selectedText || "";

    docs.push({
      id: `doc-exc-${exc.id}`,
      entityId: exc.id,
      type: "excerpt",
      title,
      content,
      topicId,
      topicTitle: topicMap.get(topicId),
      metadata: {
        archivedDocumentId: exc.archivedDocumentId,
        pageNumber: pageNum,
        highlightColor: exc.highlightColor,
        targetNoteId: exc.targetNoteId,
      },
      embedding: computeLocalEmbedding(content),
    });
  }

  return docs;
}

/**
 * Hybrid Knowledge Search Engine
 * Combines Okapi BM25 and Semantic Vector Similarity via Reciprocal Rank Fusion (RRF).
 */
export class HybridKnowledgeSearchEngine {
  private documents: KnowledgeSearchDocument[] = [];
  private bm25Engine: ResearchSearchEngine;
  private rrfK: number;

  constructor(
    documents: KnowledgeSearchDocument[] = [],
    options: { rrfK?: number } = {}
  ) {
    this.rrfK = options.rrfK ?? 60;
    this.documents = documents;

    // Convert KnowledgeSearchDocuments to SearchableDocuments for BM25 Engine
    const bm25Docs: SearchableDocument[] = documents.map((doc) => ({
      id: doc.id,
      entityId: doc.entityId,
      type: (doc.type === "topic" || doc.type === "excerpt") ? "note" : (doc.type as any),
      title: doc.title,
      content: doc.content,
      topicId: doc.topicId || "",
      topicTitle: doc.topicTitle,
      metadata: { ...doc.metadata, originalType: doc.type },
    }));

    this.bm25Engine = new ResearchSearchEngine(bm25Docs);
  }

  /**
   * Searches across knowledge entities with specified mode ('keyword', 'semantic', 'hybrid')
   */
  public search(
    query: string,
    options: {
      mode?: SearchMode;
      type?: KnowledgeEntityType | "all";
      topicId?: string;
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): HybridSearchResultItem[] {
    const { mode = "hybrid", type = "all", topicId, limit = 20, minSimilarity = 0.0 } = options;

    if (!query || !query.trim() || this.documents.length === 0) {
      return [];
    }

    // Filter documents by entity type and topicId if specified
    const eligibleDocs = this.documents.filter((doc) => {
      if (type !== "all" && doc.type !== type) return false;
      if (topicId && doc.topicId !== topicId) return false;
      return true;
    });

    if (eligibleDocs.length === 0) {
      return [];
    }

    // 1. BM25 Search
    const bm25RawResults = this.bm25Engine.search(query, {
      type: "all",
      topicId,
      limit: this.documents.length,
    });

    const bm25RankMap = new Map<string, { rank: number; score: number; matchedTerms: string[] }>();
    bm25RawResults.forEach((res, index) => {
      bm25RankMap.set(res.document.id, {
        rank: index + 1,
        score: res.score,
        matchedTerms: res.matchedTerms,
      });
    });

    // 2. Semantic Search
    const queryEmbedding = computeLocalEmbedding(query);
    const semanticScores: Array<{ doc: KnowledgeSearchDocument; score: number }> = [];

    for (const doc of eligibleDocs) {
      const docEmbedding = doc.embedding || computeLocalEmbedding(doc.content);
      const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
      if (similarity >= minSimilarity) {
        semanticScores.push({ doc, score: similarity });
      }
    }

    semanticScores.sort((a, b) => b.score - a.score);

    const semanticRankMap = new Map<string, { rank: number; score: number }>();
    semanticScores.forEach((item, index) => {
      semanticRankMap.set(item.doc.id, {
        rank: index + 1,
        score: item.score,
      });
    });

    // 3. Execution based on mode
    if (mode === "keyword") {
      const items: HybridSearchResultItem[] = [];
      for (const raw of bm25RawResults) {
        const doc = eligibleDocs.find((d) => d.id === raw.document.id);
        if (doc) {
          items.push({
            document: doc,
            score: raw.score,
            bm25Score: raw.score,
            semanticScore: semanticRankMap.get(doc.id)?.score || 0,
            rrfScore: raw.score,
            matchedTerms: raw.matchedTerms,
          });
        }
      }
      return items.slice(0, limit);
    }

    if (mode === "semantic") {
      const items: HybridSearchResultItem[] = semanticScores.map((item) => {
        const bm25Info = bm25RankMap.get(item.doc.id);
        return {
          document: item.doc,
          score: item.score,
          bm25Score: bm25Info?.score || 0,
          semanticScore: item.score,
          rrfScore: item.score,
          matchedTerms: bm25Info?.matchedTerms,
        };
      });
      return items.slice(0, limit);
    }

    // Mode: 'hybrid' -> Reciprocal Rank Fusion (RRF)
    // RRF(d) = 1 / (k + rank_bm25(d)) + 1 / (k + rank_sem(d))
    const hybridItems: HybridSearchResultItem[] = [];

    for (const doc of eligibleDocs) {
      const bm25Entry = bm25RankMap.get(doc.id);
      const semEntry = semanticRankMap.get(doc.id);

      const hasBm25 = bm25Entry !== undefined && bm25Entry.score > 0;
      const hasSem = semEntry !== undefined && semEntry.score > 0.05;

      if (!hasBm25 && !hasSem) {
        continue;
      }

      const bm25Rank = bm25Entry ? bm25Entry.rank : 1000;
      const semRank = semEntry ? semEntry.rank : 1000;

      let rrfScore = 0;
      if (hasBm25) {
        rrfScore += 1.0 / (this.rrfK + bm25Rank);
      }
      if (hasSem) {
        rrfScore += 1.0 / (this.rrfK + semRank);
      }

      hybridItems.push({
        document: doc,
        score: rrfScore,
        bm25Score: bm25Entry?.score || 0,
        semanticScore: semEntry?.score || 0,
        rrfScore,
        matchedTerms: bm25Entry?.matchedTerms,
      });
    }

    hybridItems.sort((a, b) => b.rrfScore - a.rrfScore);
    return hybridItems.slice(0, limit);
  }
}

/**
 * RAG Grounding Retrieval Pipeline
 *
 * Given a research query and knowledge entities, performs Hybrid Search
 * and constructs a GroundedRagContextBundle with sequential [^SRC-N] citation
 * markers ready to feed directly into the Gemini AI Copilot prompt.
 */
export function retrieveGroundedContextForQuery(
  query: string,
  data: {
    topics?: Topic[];
    notes?: Note[];
    resources?: Resource[];
    flashcards?: Flashcard[];
    excerpts?: ResearchExcerpt[];
  },
  options: {
    topK?: number;
    minSimilarity?: number;
  } = {}
): GroundedRagContextBundle {
  const { topK = 8, minSimilarity = 0.05 } = options;

  if (!query || !query.trim()) {
    return {
      query: "",
      chunks: [],
      totalSources: 0,
      formattedPromptContext: "",
    };
  }

  const docs = buildSearchableKnowledgeDocuments(data);
  if (docs.length === 0) {
    return {
      query,
      chunks: [],
      totalSources: 0,
      formattedPromptContext: "",
    };
  }

  const engine = new HybridKnowledgeSearchEngine(docs);
  const searchResults = engine.search(query, {
    mode: "hybrid",
    limit: topK,
    minSimilarity,
  });

  if (searchResults.length === 0) {
    return {
      query,
      chunks: [],
      totalSources: 0,
      formattedPromptContext: "",
    };
  }

  const chunks: GroundedContextChunk[] = searchResults.map((item, index) => {
    const doc = item.document;
    const citationMarker = `[^SRC-${index + 1}]`;

    // Extract relevant snippet (truncate around 300 characters cleanly)
    let snippet = doc.content.replace(/\s+/g, " ").trim();
    if (snippet.length > 300) {
      snippet = snippet.substring(0, 300) + "...";
    }

    return {
      sourceId: doc.entityId,
      sourceType: doc.type,
      title: doc.title,
      snippet,
      citationMarker,
      similarityScore: item.semanticScore > 0 ? item.semanticScore : item.score,
      pageNumber: doc.metadata?.pageNumber,
      url: doc.metadata?.url,
    };
  });

  // Construct XML formatted prompt block for Gemini Grounded RAG
  const contextLines: string[] = [
    "<grounded_knowledge_context>",
    "Dưới đây là các tài liệu và bằng chứng đã được trích xuất từ cơ sở tri thức cục bộ liên quan đến câu hỏi nghiên cứu:",
    "",
  ];

  for (const chunk of chunks) {
    const pageInfo = chunk.pageNumber ? `, Trang ${chunk.pageNumber}` : "";
    contextLines.push(
      `${chunk.citationMarker} [${chunk.sourceType.toUpperCase()}] ${chunk.title}${pageInfo}:`,
      `"${chunk.snippet}"`,
      ""
    );
  }

  contextLines.push(
    "HƯỚNG DẪN DẪN NGUỒN:",
    "- Hãy dựa vào các nguồn tài liệu trên để trả lời câu hỏi.",
    "- Bắt buộc đính kèm mã dẫn nguồn tương ứng như [^SRC-1], [^SRC-2] ngay sau luận điểm hoặc dữ kiện được trích dẫn.",
    "- Nếu thông tin không có trong tài liệu, hãy nói rõ rằng cơ sở tri thức cục bộ chưa ghi nhận dữ kiện này.",
    "</grounded_knowledge_context>"
  );

  return {
    query,
    chunks,
    totalSources: chunks.length,
    formattedPromptContext: contextLines.join("\n"),
  };
}
