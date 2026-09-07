/**
 * Pure Spaced Repetition (SM-2 based) Scheduling Engine for Knowledge OS.
 * Deterministic, side-effect free transitions and queue derivations.
 */

import type {
  Flashcard,
  FlashcardReview,
  FlashcardSchedule,
  FlashcardState,
  ReviewRating,
} from "../types/flashcard";

export interface CalculateNextReviewInput {
  currentSchedule: FlashcardSchedule;
  rating: ReviewRating; // 1: Again, 2: Hard, 3: Good, 4: Easy
  referenceDate?: Date; // Default: new Date()
}

export interface NextReviewCalculationResult {
  nextSchedule: Omit<FlashcardSchedule, "id" | "flashcardId" | "cardId" | "updatedAt">;
  reviewPayload: Omit<FlashcardReview, "id">;
}

export interface FlashcardQueueFilters {
  topicId?: string;
}

const EASE_MIN = 1.3;
const EASE_MAX = 3.5;

function clampEaseFactor(ease: number): number {
  const rounded = Number(ease.toFixed(2));
  return Math.min(EASE_MAX, Math.max(EASE_MIN, rounded));
}

/**
 * Pure calculation function: computes next schedule and review payload
 * given current schedule and user rating (1-4).
 */
export function calculateFlashcardNextReview(
  input: CalculateNextReviewInput
): NextReviewCalculationResult {
  const { currentSchedule, rating, referenceDate } = input;
  const refDate = referenceDate || new Date();

  const currentInterval = currentSchedule.interval;
  const currentEase = currentSchedule.easeFactor ?? 2.5;
  const currentReps = currentSchedule.repetitions ?? 0;
  const currentLapses = currentSchedule.lapses ?? 0;
  const currentState = currentSchedule.state;

  let nextState: FlashcardState;
  let nextInterval: number;
  let nextEase: number;
  let nextReps: number;
  let nextLapses: number;

  const isInitialCard = currentState === "new" || currentReps === 0;

  if (isInitialCard) {
    switch (rating) {
      case 1: // Again
        nextState = "relearning";
        nextInterval = 1;
        nextEase = clampEaseFactor(currentEase - 0.2);
        nextReps = 0;
        nextLapses = currentLapses + 1;
        break;

      case 2: // Hard
        nextState = "review";
        nextInterval = 1;
        nextEase = clampEaseFactor(currentEase - 0.15);
        nextReps = 1;
        nextLapses = currentLapses;
        break;

      case 3: // Good
        nextState = "review";
        nextInterval = 1;
        nextEase = clampEaseFactor(currentEase);
        nextReps = 1;
        nextLapses = currentLapses;
        break;

      case 4: // Easy
        nextState = "review";
        nextInterval = 4;
        nextEase = clampEaseFactor(currentEase + 0.15);
        nextReps = 1;
        nextLapses = currentLapses;
        break;
    }
  } else {
    // Established review card (currentState === 'review' or repetitions > 0)
    switch (rating) {
      case 1: // Again: card lapses into relearning
        nextState = "relearning";
        nextInterval = 1;
        nextEase = clampEaseFactor(currentEase - 0.2);
        nextReps = 0;
        nextLapses = currentLapses + 1;
        break;

      case 2: // Hard: conservative interval progression (* 1.2)
        nextState = "review";
        nextInterval = Math.max(1, Math.round(currentInterval * 1.2));
        nextEase = clampEaseFactor(currentEase - 0.15);
        nextReps = currentReps + 1;
        nextLapses = currentLapses;
        break;

      case 3: // Good: standard SM-2 interval progression (* easeFactor)
        nextState = "review";
        if (currentReps === 1) {
          nextInterval = 6;
        } else {
          nextInterval = Math.max(1, Math.round(currentInterval * currentEase));
        }
        nextEase = clampEaseFactor(currentEase);
        nextReps = currentReps + 1;
        nextLapses = currentLapses;
        break;

      case 4: // Easy: accelerated progression (* easeFactor * 1.3 bonus)
        nextState = "review";
        if (currentReps === 1) {
          nextInterval = Math.max(1, Math.round(6 * 1.3));
        } else {
          nextInterval = Math.max(
            1,
            Math.round(currentInterval * currentEase * 1.3)
          );
        }
        nextEase = clampEaseFactor(currentEase + 0.15);
        nextReps = currentReps + 1;
        nextLapses = currentLapses;
        break;
    }
  }

  // Calculate next due date in UTC ISO 8601
  const nextDueDate = new Date(
    refDate.getTime() + nextInterval * 24 * 60 * 60 * 1000
  );
  const nextDueAt = nextDueDate.toISOString();

  const flashcardId =
    currentSchedule.flashcardId || currentSchedule.cardId || "";
  const currentDueAt =
    currentSchedule.dueAt || currentSchedule.due || refDate.toISOString();

  const nextSchedule: Omit<
    FlashcardSchedule,
    "id" | "flashcardId" | "cardId" | "updatedAt"
  > = {
    state: nextState,
    dueAt: nextDueAt,
    due: nextDueAt,
    interval: nextInterval,
    easeFactor: nextEase,
    repetitions: nextReps,
    lapses: nextLapses,
    lastReviewedAt: refDate.toISOString(),
    lastReviewed: refDate.toISOString(),
  };

  const reviewPayload: Omit<FlashcardReview, "id"> = {
    clientEventId: "", // caller attaches clientEventId
    flashcardId,
    cardId: flashcardId,
    topicId: "", // caller attaches topicId
    rating,
    reviewDurationMs: 0,
    reviewedAt: refDate.toISOString(),
    stateBefore: currentState,
    stateAfter: nextState,
    intervalBefore: currentInterval,
    intervalAfter: nextInterval,
    easeFactorBefore: currentEase,
    easeFactorAfter: nextEase,
    dueBeforeAt: currentDueAt,
    dueBefore: currentDueAt,
    dueAfterAt: nextDueAt,
    dueAfter: nextDueAt,
  };

  return {
    nextSchedule,
    reviewPayload,
  };
}

/**
 * Pure selector: returns cards due on or before `now` (excluding non-active cards),
 * sorted by due date ascending, tie-broken deterministically by card.id ascending.
 */
export function getDueFlashcards(
  cards: Flashcard[],
  filters?: FlashcardQueueFilters,
  now?: Date
): Flashcard[] {
  if (!cards || !Array.isArray(cards)) {
    return [];
  }

  const currentNow = now ? now.getTime() : Date.now();

  return cards
    .filter((card) => {
      // Must have schedule
      if (!card.schedule) {
        return false;
      }

      // Filter by lifecycleStatus: only 'active' cards (default to active if undefined)
      const status = card.lifecycleStatus || "active";
      if (status !== "active") {
        return false;
      }

      // Optional topicId filter
      if (filters?.topicId && card.topicId !== filters.topicId) {
        return false;
      }

      // Due date check: card due must be on or before now
      const dueStr = card.schedule.dueAt || card.schedule.due;
      if (!dueStr) {
        return false;
      }

      const dueTime = new Date(dueStr).getTime();
      return !isNaN(dueTime) && dueTime <= currentNow;
    })
    .sort((a, b) => {
      const dueA = new Date(a.schedule!.dueAt || a.schedule!.due!).getTime();
      const dueB = new Date(b.schedule!.dueAt || b.schedule!.due!).getTime();

      if (dueA !== dueB) {
        return dueA - dueB; // Earliest due first
      }

      // Deterministic tie-breaker: card.id ascending
      return a.id.localeCompare(b.id);
    });
}
