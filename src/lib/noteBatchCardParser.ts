/**
 * Phase F6.10: US3 — Note-to-Card Batch Parser & Sequential Creation Engine
 * Converts bullet list lines from notes into flashcards and executes batch creation.
 */

import { detectClozeFromSelection } from "./detectClozeFromSelection";
import { parseFlashcardDelimitedText } from "./csvFlashcardParser";

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

/**
 * Automatically extracts Q&A pairs (Q: ... A: ...) or bullet-list flashcards from markdown research text.
 */
export function extractFlashcardsFromResearchResult(text: string): ParsedCard[] {
  if (!text || typeof text !== "string") return [];

  const cards: ParsedCard[] = [];

  // 1. Try CSV block or raw CSV with header (RFC 4180 format)
  const csvBlockMatch = text.match(/```(?:csv)?\s*([\s\S]*?)```/i);
  const candidateCsv = csvBlockMatch ? csvBlockMatch[1].trim() : text.trim();

  if (/(?:^|\n)\s*["']?front["']?\s*,\s*["']?back["']?/i.test(candidateCsv)) {
    const csvResult = parseFlashcardDelimitedText(candidateCsv, { defaultTopicId: "auto-topic" });
    if (csvResult.validRows.length > 0) {
      for (const row of csvResult.validRows) {
        if (row.card) {
          cards.push({
            front: row.card.front,
            back: row.card.back || undefined,
            type: row.card.type || "basic",
          });
        }
      }
      return cards.slice(0, MAX_BATCH_LIMIT);
    }
  }

  // 2. Try Q&A block regex pattern
  // Matches Q/Question/Câu hỏi/Mặt trước ... followed by A/Answer/Trả lời/Đáp án/Mặt sau ...
  const qaRegex =
    /(?:^|\n)(?:[-*]\s+|\d+[\.)]\s+)?(?:\*\*|#+\s*)?(?:Q(?:uestion)?|Câu\s*hỏi|Mặt\s*trước)(?:\s*\d+)?(?:\*\*)?[:：]\s*([\s\S]*?)(?:\n\s*(?:\*\*|#+\s*)?(?:A(?:nswer)?|Trả\s*lời|Đáp\s*án|Mặt\s*sau)(?:\s*\d+)?(?:\*\*)?[:：]\s*([\s\S]*?))(?=(?:\n\s*(?:[-*]\s+|\d+[\.)]\s+)?(?:\*\*|#+\s*)?(?:Q(?:uestion)?|Câu\s*hỏi|Mặt\s*trước)(?:\s*\d+)?(?:\*\*)?[:：])|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = qaRegex.exec(text)) !== null) {
    const front = match[1].trim().replace(/^\*\*|\*\*$/g, "").trim();
    const back = match[2].trim().replace(/^\*\*|\*\*$/g, "").trim();
    if (front && back) {
      cards.push({
        front,
        back,
        type: "basic",
      });
    }
  }

  // 2. If no cards found via QA regex, fallback to bullet list parser
  if (cards.length === 0) {
    const bulletCards = parseNoteBulletListToCards(text);
    for (const bc of bulletCards) {
      if (bc.front && (bc.back || bc.type === "cloze")) {
        cards.push({
          front: bc.front,
          back: bc.back || "",
          type: bc.type,
        });
      }
    }
  }

  return cards.slice(0, MAX_BATCH_LIMIT);
}
