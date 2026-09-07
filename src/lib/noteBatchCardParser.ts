/**
 * Phase F6.10: US3 — Note-to-Card Batch Parser & Sequential Creation Engine
 * Converts bullet list lines from notes into flashcards and executes batch creation.
 */

import { detectClozeFromSelection } from "./detectClozeFromSelection";

export interface ParsedCard {
  front: string;
  back?: string;
  type: "basic" | "cloze";
}

export const MAX_BATCH_LIMIT = 50;

/**
 * Parses markdown bullet points into flashcard candidate objects.
 * Supported separators:
 * - "Front :: Back"
 * - "Front: Back"
 * - "Front - Back"
 * If Anki-style cloze syntax is detected ({{c1::...}}), card type is set to "cloze".
 * Automatically enforces MAX_BATCH_LIMIT (50).
 */
export function parseNoteBulletListToCards(noteContent: string): ParsedCard[] {
  if (!noteContent || typeof noteContent !== "string") {
    return [];
  }

  const lines = noteContent.split(/\r?\n/);
  const cards: ParsedCard[] = [];

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();

    // Must be a bullet line starting with "-" or "*"
    // Must NOT be markdown headings or standard paragraph text
    if (!/^\s*[-*]\s+/.test(rawLine)) {
      continue;
    }

    // Strip leading bullet marker
    const content = rawLine.replace(/^\s*[-*]\s+/, "").trim();
    if (!content) {
      continue;
    }

    // 1. Check for Cloze Deletion syntax
    const clozeCheck = detectClozeFromSelection(content);
    if (clozeCheck.hasCloze) {
      cards.push({
        front: content,
        back: undefined,
        type: "cloze",
      });
      continue;
    }

    // 2. Check for "::" separator (highest priority)
    const doubleColonIndex = content.indexOf("::");
    if (doubleColonIndex !== -1) {
      const front = content.slice(0, doubleColonIndex).trim();
      const back = content.slice(doubleColonIndex + 2).trim();
      cards.push({
        front,
        back: back || undefined,
        type: "basic",
      });
      continue;
    }

    // 3. Check for " - " separator (dash with surrounding spaces)
    const dashSeparatorIndex = content.indexOf(" - ");
    if (dashSeparatorIndex !== -1) {
      const front = content.slice(0, dashSeparatorIndex).trim();
      const back = content.slice(dashSeparatorIndex + 3).trim();
      cards.push({
        front,
        back: back || undefined,
        type: "basic",
      });
      continue;
    }

    // 4. Check for ":" colon separator
    const colonMatch = content.match(/:\s*/);
    if (colonMatch && colonMatch.index !== undefined) {
      const front = content.slice(0, colonMatch.index).trim();
      const back = content.slice(colonMatch.index + colonMatch[0].length).trim();
      cards.push({
        front,
        back: back || undefined,
        type: "basic",
      });
      continue;
    }

    // 5. Fallback: Entire content as front
    cards.push({
      front: content,
      back: undefined,
      type: "basic",
    });
  }

  // Enforce MAX_BATCH_LIMIT = 50
  return cards.slice(0, MAX_BATCH_LIMIT);
}

export interface BatchCardResult {
  success: boolean;
  card: ParsedCard;
  error?: string;
  createdCard?: any;
}

export interface BatchCreationResult {
  total: number;
  successCount: number;
  failedCount: number;
  results: BatchCardResult[];
}

export interface BatchCreationOptions {
  cards: ParsedCard[];
  topicId: string;
  noteId?: string;
  repository: {
    createFlashcard: (input: any) => Promise<any>;
  };
  onProgress?: (progress: { current: number; total: number; card?: ParsedCard }) => void;
}

/**
 * Sequentially creates flashcards from batch array with progress reporting and resilient error handling.
 */
export async function executeBatchCreation(
  optionsOrCards: BatchCreationOptions | ParsedCard[],
  maybeRepo?: { createFlashcard: (input: any) => Promise<any> },
  maybeOnProgress?: (progress: { current: number; total: number }) => void
): Promise<BatchCreationResult> {
  let cards: ParsedCard[] = [];
  let topicId = "";
  let noteId: string | undefined = undefined;
  let repo: { createFlashcard: (input: any) => Promise<any> };
  let onProgress: ((progress: { current: number; total: number; card?: ParsedCard }) => void) | undefined;

  if (Array.isArray(optionsOrCards)) {
    cards = optionsOrCards;
    repo = maybeRepo!;
    onProgress = maybeOnProgress;
  } else {
    cards = optionsOrCards.cards;
    topicId = optionsOrCards.topicId;
    noteId = optionsOrCards.noteId;
    repo = optionsOrCards.repository;
    onProgress = optionsOrCards.onProgress;
  }

  const boundedCards = cards.slice(0, MAX_BATCH_LIMIT);
  const total = boundedCards.length;
  const results: BatchCardResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < total; i++) {
    const card = boundedCards[i];
    try {
      const payload: Record<string, any> = {
        front: card.front,
        back: card.back || "",
        type: card.type,
      };
      if (topicId) payload.topicId = topicId;
      if (noteId) payload.noteId = noteId;

      const createdCard = await repo.createFlashcard(payload);
      successCount++;
      results.push({
        success: true,
        card,
        createdCard,
      });
    } catch (err) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : String(err);
      results.push({
        success: false,
        card,
        error: errorMessage,
      });
    }

    onProgress?.({
      current: i + 1,
      total,
      card,
    });
  }

  return {
    total,
    successCount,
    failedCount,
    results,
  };
}
