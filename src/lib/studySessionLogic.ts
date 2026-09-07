/**
 * Pure Study Session Logic & Queue Builder for Knowledge OS (Phase F6.6).
 *
 * Provides deterministic queue creation for all study session types:
 * - review: Due cards via SM-2 schedule
 * - new: New cards bounded by daily new-card limit
 * - weak: Struggling cards (lapses >= 3 or easeFactor <= 2.0)
 * - cram: All active cards without altering SRS schedules
 *
 * Manages daily new-card limits and learned quotas in localStorage.
 */

import type { Flashcard } from "../types/flashcard";

export type StudySessionType = "review" | "new" | "weak" | "cram";

export interface SessionQueueOptions {
  sessionType?: StudySessionType;
  dailyNewLimit?: number;
  topicId?: string;
  maxCards?: number;
  shuffle?: boolean;
  now?: Date;
}

export const DAILY_NEW_LIMIT_STORAGE_KEY =
  "knowledge_os_flashcard_daily_new_limit";
export const DEFAULT_DAILY_NEW_LIMIT = 20;
export const MIN_DAILY_NEW_LIMIT = 1;
export const MAX_DAILY_NEW_LIMIT = 200;

function getTodayKey(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `knowledge_os_new_learned_${year}-${month}-${day}`;
}

/**
 * Retrieves configured daily new-card limit from localStorage (default: 20).
 */
export function getDailyNewLimit(): number {
  if (typeof localStorage === "undefined") {
    return DEFAULT_DAILY_NEW_LIMIT;
  }
  try {
    const raw = localStorage.getItem(DAILY_NEW_LIMIT_STORAGE_KEY);
    if (!raw) return DEFAULT_DAILY_NEW_LIMIT;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) return DEFAULT_DAILY_NEW_LIMIT;
    return Math.min(
      MAX_DAILY_NEW_LIMIT,
      Math.max(MIN_DAILY_NEW_LIMIT, parsed)
    );
  } catch {
    return DEFAULT_DAILY_NEW_LIMIT;
  }
}

/**
 * Saves custom daily new-card limit to localStorage (bounded 1 to 200).
 */
export function setDailyNewLimit(val: number): void {
  const bounded = Math.min(
    MAX_DAILY_NEW_LIMIT,
    Math.max(MIN_DAILY_NEW_LIMIT, Math.round(val))
  );
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DAILY_NEW_LIMIT_STORAGE_KEY, String(bounded));
    } catch {
      // Ignore storage quota errors
    }
  }
}

/**
 * Gets count of new cards learned today.
 */
export function getNewCardsLearnedToday(date?: Date): number {
  if (typeof localStorage === "undefined") return 0;
  try {
    const key = getTodayKey(date);
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const count = parseInt(raw, 10);
    return isNaN(count) ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Increments count of new cards learned today.
 */
export function incrementNewCardsLearnedToday(
  count: number = 1,
  date?: Date
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const key = getTodayKey(date);
    const current = getNewCardsLearnedToday(date);
    localStorage.setItem(key, String(current + count));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Helper to reset in-memory or storage state for testing.
 */
export function resetDailyLimitStorage(): void {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(DAILY_NEW_LIMIT_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }
}

/**
 * Filters and builds queue of active cards due on or before `now`.
 */
export function getDueQueue(
  cards: Flashcard[],
  options?: SessionQueueOptions
): Flashcard[] {
  if (!cards || !Array.isArray(cards)) return [];

  const currentNow = options?.now ? options.now.getTime() : Date.now();

  return cards
    .filter((card) => {
      if ((card.lifecycleStatus || "active") !== "active") return false;
      if (!card.schedule) return false;
      if (card.schedule.state === "new") return false;
      if (options?.topicId && card.topicId !== options.topicId) return false;

      const dueStr = card.schedule.dueAt || card.schedule.due;
      if (!dueStr) return false;
      const dueTime = new Date(dueStr).getTime();
      return !isNaN(dueTime) && dueTime <= currentNow;
    })
    .sort((a, b) => {
      const dueA = new Date(a.schedule!.dueAt || a.schedule!.due!).getTime();
      const dueB = new Date(b.schedule!.dueAt || b.schedule!.due!).getTime();
      if (dueA !== dueB) return dueA - dueB;
      return a.id.localeCompare(b.id);
    });
}

/**
 * Filters and builds queue of unlearned 'new' active cards, bounded by daily limit.
 */
export function getNewQueue(
  cards: Flashcard[],
  options?: SessionQueueOptions
): Flashcard[] {
  if (!cards || !Array.isArray(cards)) return [];

  const limit =
    options?.dailyNewLimit !== undefined
      ? options.dailyNewLimit
      : getDailyNewLimit();

  const newCards = cards
    .filter((card) => {
      if ((card.lifecycleStatus || "active") !== "active") return false;
      if (options?.topicId && card.topicId !== options.topicId) return false;
      if (!card.schedule) return true;
      return (
        card.schedule.state === "new" ||
        (card.schedule.repetitions === 0 && card.schedule.lapses === 0)
      );
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return newCards.slice(0, Math.max(0, limit));
}

/**
 * Filters and builds queue of struggling 'weak' cards (lapses >= 3 OR easeFactor <= 2.0).
 */
export function getWeakQueue(
  cards: Flashcard[],
  options?: SessionQueueOptions
): Flashcard[] {
  if (!cards || !Array.isArray(cards)) return [];

  return cards
    .filter((card) => {
      if ((card.lifecycleStatus || "active") !== "active") return false;
      if (!card.schedule) return false;
      if (options?.topicId && card.topicId !== options.topicId) return false;

      const lapses = card.schedule.lapses ?? 0;
      const ease = card.schedule.easeFactor ?? 2.5;

      return lapses >= 3 || ease <= 2.0;
    })
    .sort((a, b) => {
      const easeA = a.schedule!.easeFactor ?? 2.5;
      const easeB = b.schedule!.easeFactor ?? 2.5;
      if (easeA !== easeB) {
        return easeA - easeB; // Hardest (lowest ease) first
      }
      const lapsesA = a.schedule!.lapses ?? 0;
      const lapsesB = b.schedule!.lapses ?? 0;
      if (lapsesA !== lapsesB) {
        return lapsesB - lapsesA; // Most lapses first
      }
      return a.id.localeCompare(b.id);
    });
}

/**
 * Builds cram queue of all active cards without filtering by due date.
 */
export function getCramQueue(
  cards: Flashcard[],
  options?: SessionQueueOptions
): Flashcard[] {
  if (!cards || !Array.isArray(cards)) return [];

  let result = cards.filter((card) => {
    if ((card.lifecycleStatus || "active") !== "active") return false;
    if (options?.topicId && card.topicId !== options.topicId) return false;
    return true;
  });

  if (options?.shuffle) {
    // Deterministic or pseudo-random shuffle
    result = [...result].sort(() => Math.random() - 0.5);
  }

  if (options?.maxCards && options.maxCards > 0) {
    result = result.slice(0, options.maxCards);
  }

  return result;
}

/**
 * Master session queue dispatcher based on sessionType.
 */
export function buildSessionQueue(
  cards: Flashcard[],
  options: SessionQueueOptions
): Flashcard[] {
  const type = options.sessionType || "review";
  switch (type) {
    case "new":
      return getNewQueue(cards, options);
    case "weak":
      return getWeakQueue(cards, options);
    case "cram":
      return getCramQueue(cards, options);
    case "review":
    default:
      return getDueQueue(cards, options);
  }
}
