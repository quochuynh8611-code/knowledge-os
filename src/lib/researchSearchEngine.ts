/**
 * Research Search Engine with BM25 & Multi-lingual Normalization (Phase F7.0 Task 4)
 *
 * Implements Okapi BM25 ranking algorithm (k1 = 1.2, b = 0.75) across notes, flashcards,
 * and resources with Vietnamese diacritic and Pāli/Sanskrit IAST accent normalization.
 *
 * Strictly zero database migrations: executes 100% in-memory at runtime.
 */

import type { Note, Resource, Topic } from "../types";
import type { Flashcard } from "../types/flashcard";
import { normalizeScholarText } from "./scholarSearch";

export type ResearchSearchEntityType = "note" | "flashcard" | "resource";

export interface SearchableDocument {
  id: string;
  entityId: string;
  type: ResearchSearchEntityType;
  title: string;
  content: string;
  topicId: string;
  topicTitle?: string;
  metadata?: Record<string, any>;
}

export interface SearchResultItem {
  document: SearchableDocument;
  score: number;
  highlightedTitle: string;
  highlightedSnippet: string;
  matchedTerms: string[];
}

export interface BM25IndexOptions {
  k1?: number; // Term frequency saturation (default 1.2)
  b?: number;  // Length normalization (default 0.75)
}

/**
 * Tokenizes a string into normalized, lowercase terms.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeScholarText(text);
  // Split on non-alphanumeric characters
  return normalized
    .split(/[^\w\d_]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Builds searchable documents from system entities.
 */
export function buildSearchableDocuments(data: {
  notes?: Note[];
  flashcards?: Flashcard[];
  resources?: Resource[];
  topics?: Topic[];
}): SearchableDocument[] {
  const docs: SearchableDocument[] = [];
  const notesList = Array.isArray(data.notes) ? data.notes : [];
  const cardsList = Array.isArray(data.flashcards) ? data.flashcards : [];
  const resourcesList = Array.isArray(data.resources) ? data.resources : [];
  const topicsList = Array.isArray(data.topics) ? data.topics : [];

  const topicMap = new Map<string, string>();
  for (const t of topicsList) {
    topicMap.set(t.id, t.title);
  }

  // 1. Notes
  for (const note of notesList) {
    const topicId = note.topicId || (note.topicIds && note.topicIds[0]) || "";
    const tagsStr = (note.tags || []).join(" ");
    docs.push({
      id: `doc-note-${note.id}`,
      entityId: note.id,
      type: "note",
      title: note.title || "Ghi chú không tên",
      content: `${note.title || ""} ${note.content || ""} ${tagsStr}`,
      topicId,
      topicTitle: topicMap.get(topicId),
      metadata: { tags: note.tags, updatedAt: note.updatedAt },
    });
  }

  // 2. Flashcards
  for (const card of cardsList) {
    docs.push({
      id: `doc-card-${card.id}`,
      entityId: card.id,
      type: "flashcard",
      title: card.front || "Thẻ flashcard",
      content: `${card.front || ""} ${card.back || ""}`,
      topicId: card.topicId,
      topicTitle: topicMap.get(card.topicId),
      metadata: { type: card.type, state: card.schedule?.state },
    });
  }

  // 3. Resources
  for (const res of resourcesList) {
    const authorStr = res.author || "";
    const notesStr = res.notes || "";
    docs.push({
      id: `doc-res-${res.id}`,
      entityId: res.id,
      type: "resource",
      title: res.title || "Tài liệu",
      content: `${res.title || ""} ${authorStr} ${notesStr} ${res.url || ""} ${res.filePath || ""}`,
      topicId: res.topicId,
      topicTitle: topicMap.get(res.topicId),
      metadata: { type: res.type, author: res.author, url: res.url },
    });
  }

  return docs;
}

/**
 * In-memory BM25 Search Engine
 */
export class ResearchSearchEngine {
  private documents: SearchableDocument[] = [];
  private docTokens: Map<string, string[]> = new Map();
  private docTermFreqs: Map<string, Map<string, number>> = new Map();
  private docLengths: Map<string, number> = new Map();
  private termDocFreqs: Map<string, number> = new Map(); // n(q)
  private avgDocLength: number = 0;
  private k1: number;
  private b: number;

  constructor(documents: SearchableDocument[] = [], options: BM25IndexOptions = {}) {
    this.k1 = options.k1 ?? 1.2;
    this.b = options.b ?? 0.75;
    this.setDocuments(documents);
  }

  public setDocuments(documents: SearchableDocument[]): void {
    this.documents = documents;
    this.docTokens.clear();
    this.docTermFreqs.clear();
    this.docLengths.clear();
    this.termDocFreqs.clear();

    let totalLength = 0;

    for (const doc of documents) {
      const tokens = tokenizeText(doc.content);
      this.docTokens.set(doc.id, tokens);
      this.docLengths.set(doc.id, tokens.length);
      totalLength += tokens.length;

      const tf = new Map<string, number>();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) || 0) + 1);
      }
      this.docTermFreqs.set(doc.id, tf);

      // Record document frequency for each unique term in doc
      for (const term of tf.keys()) {
        this.termDocFreqs.set(term, (this.termDocFreqs.get(term) || 0) + 1);
      }
    }

    this.avgDocLength = documents.length > 0 ? totalLength / documents.length : 0;
  }

  /**
   * Calculates Robertson-Spärck Jones Inverse Document Frequency (IDF).
   */
  private calculateIdf(term: string): number {
    const N = this.documents.length;
    const n = this.termDocFreqs.get(term) || 0;
    if (n === 0) return 0;
    // RSJ formula with +1 for smooth positive scores
    return Math.log((N - n + 0.5) / (n + 0.5) + 1);
  }

  /**
   * Executes BM25 search query with entity & topic filtering.
   */
  public search(
    query: string,
    options: {
      type?: ResearchSearchEntityType | "all";
      topicId?: string;
      limit?: number;
    } = {}
  ): SearchResultItem[] {
    const { type = "all", topicId, limit = 20 } = options;
    const queryTokens = tokenizeText(query);

    if (queryTokens.length === 0 || this.documents.length === 0) {
      return [];
    }

    // Unique query terms
    const uniqueQueryTerms = Array.from(new Set(queryTokens));
    const termIdfs = new Map<string, number>();
    for (const term of uniqueQueryTerms) {
      termIdfs.set(term, this.calculateIdf(term));
    }

    const results: Array<{ doc: SearchableDocument; score: number; matchedTerms: string[] }> = [];

    for (const doc of this.documents) {
      // Type filter
      if (type !== "all" && doc.type !== type) {
        continue;
      }
      // Topic filter
      if (topicId && doc.topicId !== topicId) {
        continue;
      }

      const docLen = this.docLengths.get(doc.id) || 0;
      const tfMap = this.docTermFreqs.get(doc.id) || new Map();
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of uniqueQueryTerms) {
        // Also support prefix matching for terms >= 3 chars
        let f = tfMap.get(term) || 0;

        if (f === 0 && term.length >= 3) {
          for (const [docTerm, freq] of tfMap.entries()) {
            if (
              docTerm.startsWith(term) ||
              (term.length >= 6 && docTerm.includes(term))
            ) {
              f += freq * 0.8; // discounted match for prefix or long compound words
            }
          }
        }

        if (f > 0) {
          matchedTerms.push(term);
          const idf = termIdfs.get(term) || 0.1;
          const lenNorm = 1 - this.b + this.b * (docLen / (this.avgDocLength || 1));
          const tfScore = (f * (this.k1 + 1)) / (f + this.k1 * lenNorm);
          score += idf * tfScore;
        }
      }

      if (score > 0) {
        results.push({ doc, score, matchedTerms });
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    const sliced = results.slice(0, limit);

    // Format with highlighted snippet & title
    return sliced.map((item) => ({
      document: item.doc,
      score: Number(item.score.toFixed(3)),
      highlightedTitle: highlightMatches(item.doc.title, item.matchedTerms),
      highlightedSnippet: createHighlightedSnippet(
        item.doc.content,
        item.matchedTerms,
        180
      ),
      matchedTerms: item.matchedTerms,
    }));
  }
}

/**
 * Highlights matched terms in a given text using <mark> tag.
 */
export function highlightMatches(text: string, terms: string[]): string {
  if (!text || terms.length === 0) return text || "";

  // Normalize terms and escape regex characters
  const escapedTerms = terms
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escapedTerms.length === 0) return text;

  // We want to match accents too: map character variations
  const pattern = new RegExp(`\\b(${escapedTerms.join("|")})`, "gi");

  // Also check direct substring replacement on words
  const words = text.split(/(\s+|[.,!?;:()[\]{}'"`])/);
  return words
    .map((w) => {
      const normWord = normalizeScholarText(w);
      const isMatch = terms.some((t) => normWord.includes(t));
      if (isMatch) {
        return `<mark class="bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-0.5 rounded font-medium">${escapeHtml(
          w
        )}</mark>`;
      }
      return escapeHtml(w);
    })
    .join("");
}

/**
 * Extracts a window of text surrounding the first matched keyword.
 */
export function createHighlightedSnippet(
  content: string,
  terms: string[],
  maxSnippetLen = 180
): string {
  if (!content) return "";
  if (terms.length === 0) {
    return escapeHtml(content.slice(0, maxSnippetLen)) + (content.length > maxSnippetLen ? "..." : "");
  }

  // Find position of the first term match
  const normContent = normalizeScholarText(content);
  let bestPos = -1;
  for (const term of terms) {
    const pos = normContent.indexOf(term);
    if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
      bestPos = pos;
    }
  }

  if (bestPos === -1) {
    return escapeHtml(content.slice(0, maxSnippetLen)) + (content.length > maxSnippetLen ? "..." : "");
  }

  // Window around bestPos
  const halfWindow = Math.floor(maxSnippetLen / 2);
  const start = Math.max(0, bestPos - halfWindow);
  const end = Math.min(content.length, start + maxSnippetLen);

  const snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
  return highlightMatches(snippet, terms);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
