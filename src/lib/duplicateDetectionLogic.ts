/**
 * Pure Duplicate Detection Logic Engine (Phase F6.9)
 *
 * Implements:
 * - Vietnamese diacritics removal, markdown stripping & cloze unwrapping
 * - Deterministic duplicate key generation: topicId::type::normalizedFront::normalizedBack
 * - Duplicate candidate grouping
 * - Primary card selection based on SRS repetitions and creation age
 * - Levenshtein distance similarity scoring
 * - LocalStorage-backed Audit Trail logging
 */

import type { Flashcard } from "../types/flashcard";

export interface DuplicateCandidateGroup {
  id: string;
  normalizedKey: string;
  primaryCard: Flashcard;
  duplicateCards: Flashcard[];
  similarityScore: number;
  matchReason: "exact_normalized" | "fuzzy";
}

export interface DuplicateAuditLogEntry {
  id: string;
  topicId: string;
  action: "suspend_duplicate" | "skip";
  primaryCardId: string;
  duplicateCardId: string;
  reason?: string;
  resolvedAt: string;
}

export const AUDIT_STORAGE_KEY = "knowledge_os_duplicate_audit_logs";

/**
 * 1. Normalizes flashcard text:
 * - Unwraps cloze syntax {{c1::answer}} and {{c1::answer::hint}}
 * - Strips markdown (**bold**, _italic_, `code`, # header)
 * - Removes Vietnamese diacritics and replaces đ/Đ with d
 * - Converts to lowercase, trims and collapses multiple spaces
 */
export function normalizeCardContent(text: string): string {
  if (!text) return "";

  let cleaned = text
    // Unwrap cloze patterns {{c1::answer}} or {{c1::answer::hint}} -> answer
    .replace(/\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g, "$1")
    // Strip bold/italic markdown (**text**, *text*, _text_)
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Strip headers # Header
    .replace(/^#+\s+/gm, "")
    // Strip backticks `code`
    .replace(/`([^`]+)`/g, "$1");

  // Normalize accents/diacritics and convert to lowercase
  return cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 2. Generates a deterministic duplicate key:
 * format: topicId::type::normalizedFront::normalizedBack
 */
export function generateCardDuplicateKey(card: Flashcard): string {
  const normFront = normalizeCardContent(card.front);
  const normBack = normalizeCardContent(card.back);
  const type = card.type || "basic";
  return `${card.topicId}::${type}::${normFront}::${normBack}`;
}

/**
 * Levenshtein distance helper
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * 3. Calculates similarity score between two cards (0 - 100)
 */
export function calculateSimilarityScore(
  cardA: Flashcard,
  cardB: Flashcard
): number {
  const contentA = `${normalizeCardContent(cardA.front)} ${normalizeCardContent(cardA.back)}`;
  const contentB = `${normalizeCardContent(cardB.front)} ${normalizeCardContent(cardB.back)}`;

  if (contentA === contentB) {
    return 100;
  }

  const maxLen = Math.max(contentA.length, contentB.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(contentA, contentB);
  return Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
}

/**
 * 4. Determines the primary card from a list of duplicates:
 * - Cards with repetitions > 0 are prioritized over cards with 0
 * - Tie-break: Higher repetitions count
 * - Tie-break: Earlier createdAt timestamp
 */
export function determinePrimaryCard(cards: Flashcard[]): {
  primary: Flashcard;
  duplicates: Flashcard[];
} {
  if (cards.length === 0) {
    throw new Error("Cannot determine primary card from an empty array");
  }

  const sorted = [...cards].sort((a, b) => {
    const repsA = a.schedule?.repetitions ?? 0;
    const repsB = b.schedule?.repetitions ?? 0;

    // Prioritize cards with study history
    if (repsA > 0 && repsB === 0) return -1;
    if (repsB > 0 && repsA === 0) return 1;
    if (repsA !== repsB) return repsB - repsA;

    // Tie-break: earlier creation date
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) return dateA - dateB;

    return a.id.localeCompare(b.id);
  });

  return {
    primary: sorted[0],
    duplicates: sorted.slice(1),
  };
}

/**
 * 5. Detects duplicate candidate groups across cards
 */
export function detectDuplicateGroups(
  cards: Flashcard[],
  topicId?: string
): DuplicateCandidateGroup[] {
  // Only inspect active cards
  const activeCards = cards.filter((c) => {
    if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
    if (topicId && c.topicId !== topicId) return false;
    return true;
  });

  const keyMap = new Map<string, Flashcard[]>();

  for (const card of activeCards) {
    const key = generateCardDuplicateKey(card);
    const existing = keyMap.get(key) || [];
    existing.push(card);
    keyMap.set(key, existing);
  }

  const groups: DuplicateCandidateGroup[] = [];
  let index = 1;

  for (const [key, groupCards] of keyMap.entries()) {
    if (groupCards.length >= 2) {
      const { primary, duplicates } = determinePrimaryCard(groupCards);
      groups.push({
        id: `dup-group-${index++}`,
        normalizedKey: key,
        primaryCard: primary,
        duplicateCards: duplicates,
        similarityScore: 100,
        matchReason: "exact_normalized",
      });
    }
  }

  return groups;
}

/**
 * 6. Audit Trail Logging
 */
export function saveDuplicateAuditLog(entry: DuplicateAuditLogEntry): void {
  try {
    const existing = getDuplicateAuditLogs();
    const updated = [entry, ...existing];
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save duplicate audit log to localStorage", err);
  }
}

export function getDuplicateAuditLogs(): DuplicateAuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearDuplicateAuditLogs(): void {
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  } catch {
    // Graceful no-op
  }
}
