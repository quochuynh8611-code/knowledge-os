import { Topic, Note, Resource, CategoryType, TopicStatus } from "../types";

/**
 * Normalizes text for scholarly searching by:
 * 1. Converting to lowercase and trimming whitespace.
 * 2. Removing Vietnamese diacritics (including đ/Đ -> d).
 * 3. Normalizing Pali and Sanskrit IAST diacritical marks to standard ASCII.
 */
export function normalizeScholarText(text: string): string {
  if (!text) return "";

  // 1. Lowercase and initial trim
  let normalized = text.toLowerCase().trim();

  // 2. Custom IAST character mappings
  const iastMap: Record<string, string> = {
    ā: "a",
    ī: "i",
    ū: "u",
    ṛ: "r",
    ṝ: "r",
    ḷ: "l",
    ḹ: "l",
    ṅ: "n",
    ñ: "n",
    ṇ: "n",
    ṃ: "m",
    ṁ: "m",
    ṭ: "t",
    ḍ: "d",
    ṣ: "s",
    ś: "s",
    ḥ: "h",
    đ: "d",
  };

  normalized = normalized.replace(
    /[āīūṛṝḷḹṅñṇṃṁṭḍṣśḥđ]/g,
    (char) => iastMap[char] || char,
  );

  // 3. Decompose unicode and remove combining diacritical marks (Vietnamese accents)
  normalized = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");

  return normalized;
}

export interface ScholarRelevanceParams {
  query: string;
  title: string;
  tags?: string[];
  author?: string;
  slug?: string;
  description?: string;
  content?: string;
  notes?: string;
  filePath?: string;
}

/**
 * Calculates a weighted relevance score for a given entity against a search query.
 * Weights:
 * - Exact Title: 100
 * - Prefix Title: 80
 * - Substring in Title: 50
 * - Tag match: 50
 * - Author / Slug match: 40
 * - Description match: 30
 * - Content / Notes / FilePath match: 10
 */
export function calculateScholarRelevance(params: ScholarRelevanceParams): number {
  const normQuery = normalizeScholarText(params.query);
  if (!normQuery) return 0;

  let score = 0;

  const normTitle = normalizeScholarText(params.title);
  const normDesc = normalizeScholarText(params.description || "");
  const normContent = normalizeScholarText(params.content || params.notes || "");
  const normAuthor = normalizeScholarText(params.author || "");
  const normSlug = normalizeScholarText(params.slug || "");
  const normFilePath = normalizeScholarText(params.filePath || "");

  // 1. Title Matching (Highest Priority)
  if (normTitle) {
    if (normTitle === normQuery) {
      score += 100;
    } else if (normTitle.startsWith(normQuery)) {
      score += 80;
    } else if (normTitle.includes(normQuery)) {
      score += 50;
    } else {
      // 1b. Multi-token Title Coverage (Additive Affinity Bonus +15 over baseline 50)
      const queryTokens = normQuery.split(/\s+/).filter(Boolean);
      if (
        queryTokens.length > 1 &&
        queryTokens.every((token) => normTitle.includes(token))
      ) {
        score += 65;
      }
    }
  }

  // 2. Tags Matching
  if (params.tags && params.tags.length > 0) {
    for (const tag of params.tags) {
      const normTag = normalizeScholarText(tag);
      if (normTag === normQuery) {
        score += 50;
        break;
      } else if (normTag.includes(normQuery)) {
        score += 30;
        break;
      }
    }
  }

  // 3. Author & Slug Matching
  if (normAuthor && (normAuthor === normQuery || normAuthor.includes(normQuery))) {
    score += 40;
  }
  if (normSlug && (normSlug === normQuery || normSlug.includes(normQuery))) {
    score += 40;
  }

  // 4. Description Matching
  if (normDesc && normDesc.includes(normQuery)) {
    score += 30;
    // Word-boundary bonus (+10) when query is matched with whitespace or boundary
    const escapedQuery = normQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundaryRegex = new RegExp(`(?:^|\\s)${escapedQuery}(?:$|\\s)`, "i");
    if (boundaryRegex.test(normDesc)) {
      score += 10;
    }
  }

  // 5. Content / Notes / FilePath Matching (Metadata only)
  if (normContent && normContent.includes(normQuery)) {
    score += 10;
  }
  if (normFilePath && normFilePath.includes(normQuery)) {
    score += 10;
  }

  return score;
}

export interface ScholarSearchFilters {
  domain?: "all" | CategoryType;
  categoryId?: string | null;
  tag?: string | null;
  status?: "all" | TopicStatus;
}

export interface ScholarSearchQuery {
  query: string;
  topics?: Topic[];
  notes?: Note[];
  resources?: Resource[];
  filters?: ScholarSearchFilters;
}

export interface ScholarSearchResultItem<T> {
  item: T;
  relevanceScore: number;
}

export interface ScholarSearchResult {
  topics: ScholarSearchResultItem<Topic>[];
  notes: ScholarSearchResultItem<Note>[];
  resources: ScholarSearchResultItem<Resource>[];
  totalCount: number;
}

/**
 * Executes a unified multi-collection metadata search across Topics, Notes, and Resources.
 * Guarantees zero binary ingestion by only processing metadata fields.
 */
export function searchScholarCollections(
  searchParams: ScholarSearchQuery,
): ScholarSearchResult {
  const { query, topics = [], notes = [], resources = [], filters } = searchParams;
  const normQuery = normalizeScholarText(query);
  const isQueryEmpty = !normQuery;

  // Filter and score Topics
  let matchedTopics: ScholarSearchResultItem<Topic>[] = [];
  for (const topic of topics) {
    // Check facet filters
    if (filters) {
      if (filters.categoryId && topic.categoryId !== filters.categoryId) {
        continue;
      }
      if (filters.status && filters.status !== "all") {
        if (topic.studyProgress?.status !== filters.status) {
          continue;
        }
      }
      if (filters.tag && !topic.tags.includes(filters.tag)) {
        continue;
      }
      if (filters.domain && filters.domain !== "all") {
        // Topic domain is inferable from categoryId prefix or tags if domain is given
        const isPhatHoc =
          topic.categoryId.includes("phat-hoc") ||
          topic.categoryId.includes("abhidhamma") ||
          topic.tags.includes("phat-hoc") ||
          topic.tags.includes("abhidhamma");
        const isHuyenHoc =
          topic.categoryId.includes("huyen-hoc") ||
          topic.categoryId.includes("dich-hoc") ||
          topic.tags.includes("huyen-hoc");

        if (filters.domain === "phat-hoc" && !isPhatHoc) continue;
        if (filters.domain === "huyen-hoc" && !isHuyenHoc) continue;
      }
    }

    if (isQueryEmpty) {
      matchedTopics.push({ item: topic, relevanceScore: 0 });
    } else {
      const score = calculateScholarRelevance({
        query: normQuery,
        title: topic.title,
        tags: topic.tags,
        slug: topic.slug,
        description: topic.description,
        content: topic.content,
      });

      if (score > 0) {
        matchedTopics.push({ item: topic, relevanceScore: score });
      }
    }
  }

  // Sort topics by score descending
  matchedTopics.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Filter and score Notes
  let matchedNotes: ScholarSearchResultItem<Note>[] = [];
  for (const note of notes) {
    if (filters) {
      if (filters.tag && !note.tags.includes(filters.tag)) {
        continue;
      }
    }

    if (isQueryEmpty) {
      matchedNotes.push({ item: note, relevanceScore: 0 });
    } else {
      const score = calculateScholarRelevance({
        query: normQuery,
        title: note.title,
        tags: note.tags,
        content: note.content,
      });

      if (score > 0) {
        matchedNotes.push({ item: note, relevanceScore: score });
      }
    }
  }
  matchedNotes.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Filter and score Resources (strictly metadata, zero binary ingestion)
  let matchedResources: ScholarSearchResultItem<Resource>[] = [];
  for (const resource of resources) {
    if (isQueryEmpty) {
      matchedResources.push({ item: resource, relevanceScore: 0 });
    } else {
      const score = calculateScholarRelevance({
        query: normQuery,
        title: resource.title,
        author: resource.author,
        notes: resource.notes,
        filePath: resource.filePath,
      });

      if (score > 0) {
        matchedResources.push({ item: resource, relevanceScore: score });
      }
    }
  }
  matchedResources.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const totalCount =
    matchedTopics.length + matchedNotes.length + matchedResources.length;

  return {
    topics: matchedTopics,
    notes: matchedNotes,
    resources: matchedResources,
    totalCount,
  };
}
