import {
  GeminiStructuredResponseSchema,
  ValidatedGeminiStructuredResponse,
} from "../../lib/validation";

export type CanonicalSourceType =
  | "canonical_text"
  | "note"
  | "resource"
  | "flashcard"
  | "obsidian_note";

export interface ClientResearchSourceInput {
  sourceId: string;
  sourceType: CanonicalSourceType;
  title: string;
  content: string;
}

export interface SourceScope {
  canonicalText: boolean;
  notes: boolean;
  resources: boolean;
  flashcards: boolean;
  obsidianVault?: boolean;
  externalResearch: false;
}

export interface SourceRegistryEntry {
  registryId: string;
  sourceId: string;
  sourceType: CanonicalSourceType;
  title: string;
  boundedContent: string;
  truncated: boolean;
}

export interface SourceRegistryStats {
  selectedCount: number;
  usedCount: number;
  truncatedCount: number;
  excludedCount: number;
  totalCharsUsed: number;
}

export interface ObsidianSourceSummary {
  vaultProfileId: string;
  vaultLabel?: string;
  selectedCount: number;
  resolvedCount: number;
  usedCount: number;
  truncatedCount: number;
  excludedCount: number;
  missingCount: number;
}

export interface SourceRegistry {
  entries: SourceRegistryEntry[];
  stats: SourceRegistryStats;
  promptXml: string;
}

export interface ResearchCitationDTO {
  id: string;
  sourceRegistryId: string;
  sourceId: string;
  sourceType: CanonicalSourceType;
  sourceTitle: string;
  evidenceStatus: "grounded" | "inferred" | "insufficient_evidence";
}

export interface ResearchPlanOutlineDTO {
  step: number;
  title: string;
  description?: string;
}

export interface ResearchUncertaintyDTO {
  point: string;
  reason: string;
}

export interface GeminiResearchResponseDTO {
  result: string;
  proposedOutline: ResearchPlanOutlineDTO[];
  citations: ResearchCitationDTO[];
  uncertainties: ResearchUncertaintyDTO[];
  model: string;
  isStructured: boolean;
  timestamp: string;
  sourceStats: SourceRegistryStats;
  fallbackReason?: string;
  obsidianSourceSummary?: ObsidianSourceSummary;
}

const PER_SOURCE_CHAR_LIMITS: Record<CanonicalSourceType, number> = {
  canonical_text: 15_000,
  obsidian_note: 8_000,
  note: 4_000,
  resource: 2_000,
  flashcard: 1_000,
};

const DEFAULT_GLOBAL_CHAR_LIMIT = 40_000;

const SOURCE_TYPE_PRIORITY: Record<CanonicalSourceType, number> = {
  canonical_text: 1,
  obsidian_note: 2,
  note: 3,
  resource: 4,
  flashcard: 5,
};

export interface BuildRegistryOptions {
  globalCharLimit?: number;
}

/**
 * Builds a deterministic, bounded SourceRegistry from untrusted client sources.
 * Enforces canonical taxonomy, per-source truncation, global context quota, and priority exclusion.
 */
export function buildBoundedSourceRegistry(
  rawSources: ClientResearchSourceInput[],
  scope: SourceScope,
  options?: BuildRegistryOptions
): SourceRegistry {
  const globalLimit = options?.globalCharLimit ?? DEFAULT_GLOBAL_CHAR_LIMIT;
  const selectedCount = rawSources.length;

  // 1. Filter by scope & non-empty
  const inScopeSources = rawSources.filter((src) => {
    const trimmed = (src.content || "").trim();
    if (!trimmed || !src.sourceId || !src.title) return false;

    if (src.sourceType === "canonical_text") return scope.canonicalText;
    if (src.sourceType === "obsidian_note") return Boolean(scope.obsidianVault);
    if (src.sourceType === "note") return scope.notes;
    if (src.sourceType === "resource") return scope.resources;
    if (src.sourceType === "flashcard") return scope.flashcards;
    return false;
  });

  // 2. Sort by domain priority
  const sorted = [...inScopeSources].sort(
    (a, b) => (SOURCE_TYPE_PRIORITY[a.sourceType] ?? 99) - (SOURCE_TYPE_PRIORITY[b.sourceType] ?? 99)
  );

  let currentChars = 0;
  let truncatedCount = 0;
  let excludedCount = selectedCount - sorted.length;
  const entries: SourceRegistryEntry[] = [];

  const typeCounters: Record<CanonicalSourceType, number> = {
    canonical_text: 0,
    obsidian_note: 0,
    note: 0,
    resource: 0,
    flashcard: 0,
  };

  for (const src of sorted) {
    const perSourceCap = PER_SOURCE_CHAR_LIMITS[src.sourceType] ?? 2_000;
    const rawContent = src.content.trim();
    let bounded = rawContent;
    let isTruncated = false;

    if (rawContent.length > perSourceCap) {
      bounded = `${rawContent.slice(0, perSourceCap)}... [cắt ngắn do vượt quota nguồn]`;
      isTruncated = true;
    }

    // Check if adding this source exceeds global quota
    if (currentChars + bounded.length > globalLimit) {
      // If we cannot even fit 100 chars, exclude this source
      const remainingQuota = globalLimit - currentChars;
      if (remainingQuota < 100) {
        excludedCount++;
        continue;
      }
      bounded = `${bounded.slice(0, remainingQuota)}... [cắt ngắn do vượt quota global]`;
      isTruncated = true;
    }

    if (isTruncated) {
      truncatedCount++;
    }

    typeCounters[src.sourceType]++;
    let prefix = "SRC-NOTE";
    if (src.sourceType === "canonical_text") prefix = "SRC-CANONICAL";
    else if (src.sourceType === "obsidian_note") prefix = "SRC-OBS";
    else if (src.sourceType === "resource") prefix = "SRC-RES";
    else if (src.sourceType === "flashcard") prefix = "SRC-FC";

    const registryId = `${prefix}-${typeCounters[src.sourceType]}`;

    entries.push({
      registryId,
      sourceId: src.sourceId,
      sourceType: src.sourceType,
      title: src.title.trim(),
      boundedContent: bounded,
      truncated: isTruncated,
    });

    currentChars += bounded.length;
  }

  // 3. Build XML Delimiters for prompt
  const xmlLines: string[] = ["<source_registry>"];
  for (const entry of entries) {
    xmlLines.push(
      `  <source id="${entry.registryId}" type="${entry.sourceType}" title="${escapeXml(entry.title)}">`
    );
    xmlLines.push(`    <![CDATA[\n${sanitizeCdata(entry.boundedContent)}\n    ]]>`);
    xmlLines.push("  </source>");
  }
  xmlLines.push("</source_registry>");

  const stats: SourceRegistryStats = {
    selectedCount,
    usedCount: entries.length,
    truncatedCount,
    excludedCount,
    totalCharsUsed: currentChars,
  };

  return {
    entries,
    stats,
    promptXml: xmlLines.join("\n"),
  };
}

/**
 * Validates returned citations from Gemini against the SourceRegistry allowlist.
 * Filters out all unknown IDs and replaces model-generated metadata with trusted registry values.
 */
export function filterCitationsAgainstRegistry(
  rawCitations: Array<{ sourceRegistryId?: string; evidenceStatus?: string }>,
  registry: { entries: SourceRegistryEntry[] }
): ResearchCitationDTO[] {
  const registryMap = new Map<string, SourceRegistryEntry>();
  for (const entry of registry.entries) {
    registryMap.set(entry.registryId, entry);
  }

  const validCitations: ResearchCitationDTO[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawCitations.length; i++) {
    const raw = rawCitations[i];
    const regId = raw?.sourceRegistryId?.trim() || "";
    if (!regId || !registryMap.has(regId) || seenIds.has(regId)) {
      continue;
    }

    seenIds.add(regId);
    const trusted = registryMap.get(regId)!;
    const status =
      raw.evidenceStatus === "grounded" ||
      raw.evidenceStatus === "inferred" ||
      raw.evidenceStatus === "insufficient_evidence"
        ? raw.evidenceStatus
        : "grounded";

    validCitations.push({
      id: `cit-${i + 1}-${trusted.sourceId}`,
      sourceRegistryId: trusted.registryId,
      sourceId: trusted.sourceId,
      sourceType: trusted.sourceType,
      sourceTitle: trusted.title,
      evidenceStatus: status,
    });
  }

  return validCitations;
}

/**
 * Parses Gemini response text as structured JSON or falls back to raw Markdown safely.
 */
export function parseGeminiResponseWithFallback(
  rawText: string,
  registry: { entries: SourceRegistryEntry[]; stats?: SourceRegistryStats }
): {
  result: string;
  proposedOutline: ResearchPlanOutlineDTO[];
  citations: ResearchCitationDTO[];
  uncertainties: ResearchUncertaintyDTO[];
  isStructured: boolean;
  fallbackReason?: string;
} {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    return {
      result: "Không có phản hồi từ mô hình AI.",
      proposedOutline: [],
      citations: [],
      uncertainties: [],
      isStructured: false,
      fallbackReason: "Empty response",
    };
  }

  let jsonCandidate = trimmed;

  // Extract JSON from ```json ... ``` markdown block if wrapped
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    jsonCandidate = jsonBlockMatch[1].trim();
  }

  try {
    const parsedObj = JSON.parse(jsonCandidate);
    const validated = GeminiStructuredResponseSchema.safeParse(parsedObj);

    if (validated.success) {
      const data: ValidatedGeminiStructuredResponse = validated.data;
      const filteredCitations = filterCitationsAgainstRegistry(
        data.citations || [],
        registry
      );

      return {
        result: data.content,
        proposedOutline: data.proposedOutline || [],
        citations: filteredCitations,
        uncertainties: data.uncertainties || [],
        isStructured: true,
      };
    } else {
      return {
        result: trimmed,
        proposedOutline: [],
        citations: [],
        uncertainties: [],
        isStructured: false,
        fallbackReason: `Schema validation error: ${validated.error.issues.map((i) => i.message).join(", ")}`,
      };
    }
  } catch (err: any) {
    return {
      result: trimmed,
      proposedOutline: [],
      citations: [],
      uncertainties: [],
      isStructured: false,
      fallbackReason: `JSON parse error: ${err?.message || String(err)}`,
    };
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function sanitizeCdata(rawContent: string): string {
  // Neutralize CDATA end delimiters inside untrusted source content to prevent prompt boundary escape
  return rawContent.replace(/]]>/g, "]] >");
}
