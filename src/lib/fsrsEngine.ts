/**
 * FSRS v5 (Free Spaced Repetition Scheduler) Core Engine
 * Implements the Three-Component Model of Memory (Difficulty, Stability, Retrievability - DSR)
 * with Power-Law forgetting curves and a Zero-Migration Bijective SM-2 Bridge.
 */

import type {
  FlashcardSchedule,
  FlashcardState,
  FlashcardReview,
  ReviewRating,
} from '../types/flashcard';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from './storage';

export const SRS_CONFIG_STORAGE_KEY = 'knowledge_os_srs_config';

export interface SrsUserConfig {
  algorithm: 'fsrs' | 'sm2';
  desiredRetention: number; // 0.70 to 0.97 (default: 0.90)
}

export const DEFAULT_SRS_CONFIG: SrsUserConfig = {
  algorithm: 'fsrs',
  desiredRetention: 0.90,
};

/**
 * Bộ trọng số mặc định chuẩn FSRS v4.5 / v5 (19 parameters)
 */
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.40255, 1.18385, 3.173, 15.69105, // w0..w3: Initial stability S0(1..4)
  7.1949, 0.5345, 1.4604, 0.0046,   // w4..w7: Initial difficulty D0 and mean reversion
  1.54575, 0.1192, 1.01925,         // w8..w10: Stability update on recall
  1.9395, 0.11, 0.29605, 0.22695,   // w11..w14: Stability update on forgetting
  0.2315, 2.9898, 0.51655, 0.6621,  // w15..w18: Rating modifiers & bonuses
];

// FSRS power-law forgetting curve constants
const F_FACTOR = 19 / 81;
const C_FACTOR = -0.5;

/**
 * Đọc cấu hình SRS của người dùng
 */
export function getSrsUserConfig(): SrsUserConfig {
  try {
    const raw = safeGetLocalStorageItem(SRS_CONFIG_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SRS_CONFIG };
    const parsed = JSON.parse(raw);
    const algorithm = parsed.algorithm === 'sm2' ? 'sm2' : 'fsrs';
    let desiredRetention = typeof parsed.desiredRetention === 'number' ? parsed.desiredRetention : 0.90;
    desiredRetention = Math.min(0.97, Math.max(0.70, desiredRetention));
    return { algorithm, desiredRetention };
  } catch {
    return { ...DEFAULT_SRS_CONFIG };
  }
}

/**
 * Lưu cấu hình SRS của người dùng
 */
export function setSrsUserConfig(config: Partial<SrsUserConfig>): SrsUserConfig {
  const current = getSrsUserConfig();
  let nextDesired = config.desiredRetention !== undefined ? config.desiredRetention : current.desiredRetention;
  nextDesired = Math.min(0.97, Math.max(0.70, Number(nextDesired.toFixed(2))));

  const updated: SrsUserConfig = {
    algorithm: config.algorithm ? (config.algorithm === 'sm2' ? 'sm2' : 'fsrs') : current.algorithm,
    desiredRetention: nextDesired,
  };

  safeSetLocalStorageItem(SRS_CONFIG_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Đường cong quên hàm lũy thừa Power-law của FSRS
 * R(t, S) = (1 + F * (t / S))^C
 * với F = 19/81 và C = -0.5 đảm bảo tại t = S thì R = 0.90 (90%)
 */
export function calculateFsrsRetrievability(elapsedDays: number, stability: number): number {
  if (elapsedDays <= 0) return 1.0;
  const s = Math.max(0.01, stability);
  const r = Math.pow(1 + F_FACTOR * (elapsedDays / s), C_FACTOR);
  return Math.min(1.0, Math.max(0.0, r));
}

/**
 * Tính khoảng cách ngày ôn tập tiếp theo dựa trên Desired Retention
 * I(R_req, S) = max(1, round( (S / F) * (R_req^(1/C) - 1) ))
 */
export function calculateFsrsNextInterval(stability: number, desiredRetention: number = 0.90): number {
  const clampedRetention = Math.min(0.97, Math.max(0.70, desiredRetention));
  const s = Math.max(0.01, stability);

  // Khi R_req = 0.90, do 0.90^(-2) - 1 = 100/81 - 1 = 19/81 = F_FACTOR,
  // nên (s / F_FACTOR) * F_FACTOR = s
  if (Math.abs(clampedRetention - 0.90) < 0.0001) {
    return Math.max(1, Math.round(s));
  }

  const rawInterval = (s / F_FACTOR) * (Math.pow(clampedRetention, 1 / C_FACTOR) - 1);
  return Math.max(1, Math.round(rawInterval));
}

/**
 * Zero-Migration SM-2 -> FSRS Bridge
 * Suy diễn Difficulty D và Stability S từ các trường SM-2 cũ nếu chưa có
 */
export function migrateSm2ToFsrsState(schedule: FlashcardSchedule): { stability: number; difficulty: number } {
  let stability = schedule.stability;
  let difficulty = schedule.difficulty;

  if (typeof stability !== 'number' || stability <= 0) {
    if (schedule.interval && schedule.interval > 0) {
      stability = Math.max(0.5, schedule.interval);
    } else {
      stability = DEFAULT_FSRS_WEIGHTS[2]; // S0(Good) ~ 3.17 ngày
    }
  }

  if (typeof difficulty !== 'number' || difficulty < 1.0 || difficulty > 10.0) {
    const ef = schedule.easeFactor ?? 2.50;
    const lapses = schedule.lapses ?? 0;
    // Ánh xạ nghịch biến: easeFactor cao (3.5) -> D thấp (1.0), easeFactor thấp (1.3) -> D cao (10.0)
    const normalizedEase = Math.min(1.0, Math.max(0.0, (ef - 1.30) / (3.50 - 1.30)));
    const baseDifficulty = 10.0 - normalizedEase * 9.0;
    const lapsePenalty = lapses * 0.5;
    difficulty = Math.min(10.0, Math.max(1.0, Number((baseDifficulty + lapsePenalty).toFixed(2))));
  }

  return { stability, difficulty };
}

/**
 * Zero-Migration FSRS -> SM-2 Bridge
 * Ánh xạ ngược Difficulty D (1.0..10.0) sang easeFactor tương đương (1.30..3.50)
 */
export function syncFsrsToSm2Fields(difficulty: number): number {
  const d = Math.min(10.0, Math.max(1.0, difficulty));
  const normalizedDifficulty = (d - 1.0) / 9.0; // 0.0 (dễ nhất) -> 1.0 (khó nhất)
  const ease = 3.50 - normalizedDifficulty * (3.50 - 1.30);
  return Number(Math.min(3.50, Math.max(1.30, ease)).toFixed(2));
}

export interface CalculateFsrsReviewInput {
  currentSchedule: FlashcardSchedule;
  rating: ReviewRating; // 1: Again, 2: Hard, 3: Good, 4: Easy
  referenceDate?: Date;
  desiredRetention?: number;
}

export interface FsrsCalculationResult {
  nextSchedule: Omit<FlashcardSchedule, 'id' | 'flashcardId' | 'cardId' | 'updatedAt'>;
  reviewPayload: Omit<FlashcardReview, 'id'>;
}

/**
 * Tính toán bước ôn tiếp theo theo mô hình chuẩn FSRS v5 (DSR)
 */
export function calculateFsrsNextReview(input: CalculateFsrsReviewInput): FsrsCalculationResult {
  const { currentSchedule, rating, referenceDate, desiredRetention: inputRetention } = input;
  const refDate = referenceDate || new Date();
  const targetRetention = inputRetention ?? getSrsUserConfig().desiredRetention;

  const w = DEFAULT_FSRS_WEIGHTS;
  const currentState = currentSchedule.state;
  const currentInterval = currentSchedule.interval || 0;
  const currentReps = currentSchedule.repetitions || 0;
  const currentLapses = currentSchedule.lapses || 0;

  const isInitialCard = currentState === 'new' || currentReps === 0;

  // Tính số ngày đã trôi qua kể từ lần ôn trước (t)
  let elapsedDays = 0;
  if (currentSchedule.lastReviewedAt || currentSchedule.lastReviewed) {
    const lastRev = new Date(currentSchedule.lastReviewedAt || currentSchedule.lastReviewed!).getTime();
    if (!isNaN(lastRev)) {
      elapsedDays = Math.max(0, (refDate.getTime() - lastRev) / (24 * 60 * 60 * 1000));
    }
  }

  let nextStability: number;
  let nextDifficulty: number;
  let nextInterval: number;
  let nextState: FlashcardState;
  let nextReps: number;
  let nextLapses: number;

  if (isInitialCard) {
    // 1. Thẻ mới (Initial review): Sử dụng S0(G) và D0(G)
    nextStability = w[rating - 1]; // w0..w3
    // D0(G) = clamp(w4 - e^(w5 * (G - 1)) + 1, 1, 10)
    const rawD0 = w[4] - Math.exp(w[5] * (rating - 1)) + 1;
    nextDifficulty = Math.min(10.0, Math.max(1.0, Number(rawD0.toFixed(2))));

    if (rating === 1) {
      nextState = 'relearning';
      nextInterval = 1;
      nextReps = 0;
      nextLapses = currentLapses + 1;
    } else {
      nextState = 'review';
      nextInterval = calculateFsrsNextInterval(nextStability, targetRetention);
      nextReps = 1;
      nextLapses = currentLapses;
    }
  } else {
    // 2. Thẻ đã có lịch sử (Review card)
    const { stability: curS, difficulty: curD } = migrateSm2ToFsrsState(currentSchedule);

    // Tính khả năng truy xuất R tại thời điểm ôn tập hiện tại
    const currentRetrievability = calculateFsrsRetrievability(elapsedDays, curS);

    // Cập nhật độ khó D' (Mean reversion):
    // D_raw = D - w6 * (G - 3)
    // D0(4) = w4 - e^(w5 * 3) + 1
    const d0Easy = w[4] - Math.exp(w[5] * 3) + 1;
    const rawD = curD - w[6] * (rating - 3);
    const meanRevertedD = w[7] * d0Easy + (1 - w[7]) * rawD;
    nextDifficulty = Math.min(10.0, Math.max(1.0, Number(meanRevertedD.toFixed(2))));

    if (rating === 1) {
      // Quên thẻ (Again): Lapsed
      nextState = 'relearning';
      // S'_forget = clamp(w11 * D'^(-w12) * ((S + 1)^w13 - 1) * e^(w14 * (1 - R)), 0.1, S)
      const sForgetRaw =
        w[11] *
        Math.pow(nextDifficulty, -w[12]) *
        (Math.pow(curS + 1, w[13]) - 1) *
        Math.exp(w[14] * (1 - currentRetrievability));

      nextStability = Math.min(curS, Math.max(0.1, Number(sForgetRaw.toFixed(2))));
      nextInterval = 1;
      nextReps = 0;
      nextLapses = currentLapses + 1;
    } else {
      // Nhớ thành công (Hard, Good, Easy)
      nextState = 'review';
      let ratingModifier = 1.0;
      if (rating === 2) ratingModifier = w[15]; // Hard penalty ~0.23
      else if (rating === 4) ratingModifier = w[16]; // Easy bonus ~2.99

      // S'_recall = S * (1 + e^w8 * (11 - D') * S^(-w9) * (e^(w10 * (1 - R)) - 1) * modifier)
      const factor =
        Math.exp(w[8]) *
        (11 - nextDifficulty) *
        Math.pow(curS, -w[9]) *
        (Math.exp(w[10] * (1 - currentRetrievability)) - 1) *
        ratingModifier;

      const calculatedS = curS * (1 + factor);

      // Đảm bảo tính tăng tiến hợp lý giữa Hard, Good, Easy
      if (rating === 2) {
        nextStability = Math.max(curS * 1.05, calculatedS);
      } else if (rating === 3) {
        nextStability = Math.max(curS * 1.25, calculatedS);
      } else {
        nextStability = Math.max(curS * 1.50, calculatedS);
      }
      nextStability = Number(nextStability.toFixed(2));

      nextInterval = calculateFsrsNextInterval(nextStability, targetRetention);
      // Đảm bảo interval Hard ít nhất lớn hơn hoặc bằng currentInterval
      if (rating === 2) {
        nextInterval = Math.max(currentInterval, nextInterval);
      }
      nextReps = currentReps + 1;
      nextLapses = currentLapses;
    }
  }

  // Next due date UTC ISO
  const nextDueDate = new Date(refDate.getTime() + nextInterval * 24 * 60 * 60 * 1000);
  const nextDueAt = nextDueDate.toISOString();
  const flashcardId = currentSchedule.flashcardId || currentSchedule.cardId || '';
  const currentDueAt = currentSchedule.dueAt || currentSchedule.due || refDate.toISOString();
  const nextEaseFactor = syncFsrsToSm2Fields(nextDifficulty);

  const nextSchedule: Omit<FlashcardSchedule, 'id' | 'flashcardId' | 'cardId' | 'updatedAt'> = {
    state: nextState,
    dueAt: nextDueAt,
    due: nextDueAt,
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    repetitions: nextReps,
    lapses: nextLapses,
    lastReviewedAt: refDate.toISOString(),
    lastReviewed: refDate.toISOString(),
    stability: nextStability,
    difficulty: nextDifficulty,
    retrievability: 1.0,
    desiredRetention: targetRetention,
  };

  const reviewPayload: Omit<FlashcardReview, 'id'> = {
    clientEventId: '',
    flashcardId,
    cardId: flashcardId,
    topicId: '',
    rating,
    reviewDurationMs: 0,
    reviewedAt: refDate.toISOString(),
    stateBefore: currentState,
    stateAfter: nextState,
    intervalBefore: currentInterval,
    intervalAfter: nextInterval,
    easeFactorBefore: currentSchedule.easeFactor ?? 2.50,
    easeFactorAfter: nextEaseFactor,
    dueBeforeAt: currentDueAt,
    dueBefore: currentDueAt,
    dueAfterAt: nextDueAt,
    dueAfter: nextDueAt,
  };

  return { nextSchedule, reviewPayload };
}

export interface RatingPreviewInfo {
  intervalDays: number;
  nextStability: number;
  nextDifficulty: number;
}

/**
 * Tính trước khoảng cách ngày và stability cho cả 4 nút (1: Again, 2: Hard, 3: Good, 4: Easy)
 */
export function previewCardRatingIntervals(
  schedule: FlashcardSchedule,
  options?: { desiredRetention?: number; referenceDate?: Date }
): Record<ReviewRating, RatingPreviewInfo> {
  const refDate = options?.referenceDate || new Date();
  const retention = options?.desiredRetention ?? getSrsUserConfig().desiredRetention;

  const ratings: ReviewRating[] = [1, 2, 3, 4];
  const result: Partial<Record<ReviewRating, RatingPreviewInfo>> = {};

  for (const r of ratings) {
    const calc = calculateFsrsNextReview({
      currentSchedule: schedule,
      rating: r,
      referenceDate: refDate,
      desiredRetention: retention,
    });
    result[r] = {
      intervalDays: calc.nextSchedule.interval,
      nextStability: calc.nextSchedule.stability || 1,
      nextDifficulty: calc.nextSchedule.difficulty || 5,
    };
  }

  return result as Record<ReviewRating, RatingPreviewInfo>;
}
