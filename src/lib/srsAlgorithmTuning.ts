/**
 * SRS Algorithm Tuning & Adaptive Engine Utilities (Phase F6.12)
 *
 * Provides pure mathematical and algorithmic capabilities:
 * 1. Memory stability estimation from review history
 * 2. Ebbinghaus forgetting curve modeling: R(t) = exp(-t / S)
 * 3. Empirical retention rate aggregation
 * 4. Card difficulty inference (Easy / Medium / Hard)
 * 5. Adaptive scheduling with response latency & difficulty adjustments
 * 6. Smart review queue priority scoring with Exam Countdown compression
 * 7. Card-level A/B testing partition (Variant A: SM-2 vs Variant B: Adaptive)
 * 8. Two-proportion Z-test statistical significance calculation
 *
 * Conforms strictly to Zero Schema Migrations.
 */

import type {
  Flashcard,
  FlashcardSchedule,
  FlashcardReview,
  ReviewRating,
  FlashcardState,
} from "../types/flashcard";

export type CardDifficultyLevel = "easy" | "medium" | "hard";

export interface CardDifficulty {
  difficulty: CardDifficultyLevel;
  score: number; // 1.0 (easiest) to 10.0 (hardest)
  factors: {
    lapseScore: number;
    easeScore: number;
    retentionScore: number;
    latencyScore: number;
  };
}

export interface EbbinghausDataPoint {
  day: number;
  retentionRate: number; // 0.0 to 1.0
}

export interface EmpiricalRetentionPoint {
  day: number;
  retentionRate: number; // 0.0 to 1.0
  count: number;
  rememberedCount: number;
}

export interface VariantStats {
  variant: "A" | "B";
  name: string;
  totalReviews: number;
  rememberedReviews: number;
  retentionRate: number; // 0.0 to 1.0
  totalLapses: number;
  lapseRate: number; // 0.0 to 1.0
  avgDurationMs: number;
}

export interface VariantComparisonResult {
  variantA: VariantStats;
  variantB: VariantStats;
  effectSize: number; // difference in retention rate (B - A)
  zScore: number;
  pValue: number;
  isSignificant: boolean; // p < 0.05
}

/**
 * 1. Estimates memory stability S from review history.
 * Stability S represents the number of days for memory retention to drop to ~36.8% (1/e),
 * or equivalently R(t) = exp(-t / S).
 * Uses linear regression on log(retention) vs elapsed days.
 */
export function calculateStabilityFromReviews(
  reviews: FlashcardReview[]
): number {
  if (!reviews || reviews.length < 3) {
    return 2.5; // Default fallback stability
  }

  // Sort reviews chronologically
  const sorted = [...reviews].sort(
    (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
  );

  // Group by elapsed days since last review
  const dayBuckets = new Map<number, { remembered: number; total: number }>();

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevTime = new Date(prev.reviewedAt).getTime();
    const currTime = new Date(curr.reviewedAt).getTime();
    const elapsedDays = Math.max(1, Math.round((currTime - prevTime) / 86400000));

    const bucketKey = Math.min(30, elapsedDays);
    const existing = dayBuckets.get(bucketKey) || { remembered: 0, total: 0 };
    existing.total += 1;
    if (curr.rating === 3 || curr.rating === 4) {
      existing.remembered += 1;
    }
    dayBuckets.set(bucketKey, existing);
  }

  // Need at least 2 distinct day buckets with data to fit a line
  if (dayBuckets.size < 2) {
    // Fallback: average interval of remembered reviews or ease-based
    const remembered = sorted.filter((r) => r.rating >= 3);
    if (remembered.length > 0) {
      const avgInterval =
        remembered.reduce((sum, r) => sum + (r.intervalAfter || 1), 0) /
        remembered.length;
      return Math.max(1.0, Math.min(60.0, avgInterval));
    }
    return 2.5;
  }

  // Linear regression: y = ln(R), x = t. Since R(0) = 1 => y(0) = ln(1) = 0.
  // Model through origin: y = m * x => m = sum(x * y) / sum(x^2)
  let sumXY = 0;
  let sumX2 = 0;

  for (const [day, stats] of dayBuckets.entries()) {
    if (stats.total === 0) continue;
    // Laplace smoothing to avoid ln(0) or ln(1) singularities
    const smoothedR = (stats.remembered + 0.5) / (stats.total + 1.0);
    const y = Math.log(Math.max(0.01, Math.min(0.99, smoothedR)));
    const x = day;

    sumXY += x * y;
    sumX2 += x * x;
  }

  if (sumX2 === 0) return 2.5;

  const slope = sumXY / sumX2;

  // Slope should be negative for forgetting curve (R decreases as t increases)
  if (slope < -0.001) {
    const estimatedS = -1 / slope;
    return Math.max(0.5, Math.min(365.0, Number(estimatedS.toFixed(2))));
  }

  // Fallback to average interval if slope is non-negative
  const avgInterval =
    sorted.reduce((sum, r) => sum + (r.intervalAfter || 1), 0) / sorted.length;
  return Math.max(1.0, Math.min(60.0, Number(avgInterval.toFixed(2))));
}

/**
 * 2. Generates theoretical Ebbinghaus forgetting curve data points:
 * R(t) = exp(-t / S) for t from 0 to maxDays.
 */
export function calculateEbbinghausCurve(
  stability: number,
  maxDays = 30
): EbbinghausDataPoint[] {
  const safeS = Math.max(0.1, stability);
  const points: EbbinghausDataPoint[] = [];

  for (let day = 0; day <= maxDays; day++) {
    const retentionRate = Math.exp(-day / safeS);
    points.push({
      day,
      retentionRate: Number(retentionRate.toFixed(4)),
    });
  }

  return points;
}

/**
 * 3. Aggregates empirical retention points from historical reviews.
 * Groups by days elapsed and computes observed recall rate.
 */
export function aggregateEmpiricalRetention(
  reviews: FlashcardReview[]
): EmpiricalRetentionPoint[] {
  if (!reviews || reviews.length === 0) {
    return [];
  }

  // Map of day -> stats
  const buckets = new Map<number, { remembered: number; total: number }>();

  // Use intervalBefore or review sequence
  for (const rev of reviews) {
    // If intervalBefore is recorded, use it as the elapsed target interval
    const day = Math.min(30, Math.max(0, rev.intervalBefore ?? 0));
    const current = buckets.get(day) || { remembered: 0, total: 0 };
    current.total += 1;
    if (rev.rating === 3 || rev.rating === 4) {
      current.remembered += 1;
    }
    buckets.set(day, current);
  }

  const result: EmpiricalRetentionPoint[] = [];
  for (const [day, stats] of buckets.entries()) {
    result.push({
      day,
      count: stats.total,
      rememberedCount: stats.remembered,
      retentionRate: Number((stats.remembered / stats.total).toFixed(4)),
    });
  }

  return result.sort((a, b) => a.day - b.day);
}

/**
 * 4. Infers card difficulty level ('easy' | 'medium' | 'hard') and continuous score [1..10].
 * Factors: lapses, easeFactor, historical retention rate, and latency.
 */
export function inferCardDifficulty(
  card: Flashcard,
  reviews?: FlashcardReview[]
): CardDifficulty {
  const lapses = card.schedule?.lapses ?? 0;
  const easeFactor = card.schedule?.easeFactor ?? 2.5;
  const retentionRate = card.schedule?.retentionRate ?? 0.8;

  // Factor 1: Lapses (0 = 0, 1 = +1.5, 2+ = +3.0)
  const lapseScore = Math.min(4.0, lapses * 1.5);

  // Factor 2: Ease factor (2.5 -> normal ~2.5, 1.3 -> hard ~5.0, 3.5 -> easy ~1.0)
  // Mapping: (3.5 - easeFactor) * 2.0
  const easeScore = Math.max(0, Math.min(4.5, (3.5 - easeFactor) * 2.0));

  // Factor 3: Retention rate (< 0.6 -> +2.0, < 0.8 -> +1.0, >= 0.8 -> 0)
  const retentionScore = retentionRate < 0.6 ? 2.5 : retentionRate < 0.8 ? 1.2 : 0;

  // Factor 4: Review Latency (if reviews provided)
  let latencyScore = 0;
  if (reviews && reviews.length > 0) {
    const totalMs = reviews.reduce((acc, r) => acc + (r.reviewDurationMs || 0), 0);
    const avgMs = totalMs / reviews.length;
    if (avgMs > 12000) {
      latencyScore = 1.0; // Struggled / hesitated
    } else if (avgMs < 2500) {
      latencyScore = -0.5; // Fast automatic recall
    }
  }

  // Base score centered at 3.0
  const rawScore = 2.0 + lapseScore + easeScore + retentionScore + latencyScore;
  const score = Number(Math.max(1.0, Math.min(10.0, rawScore)).toFixed(1));

  let difficulty: CardDifficultyLevel = "medium";
  if (score <= 3.5) {
    difficulty = "easy";
  } else if (score > 6.5) {
    difficulty = "hard";
  }

  return {
    difficulty,
    score,
    factors: {
      lapseScore,
      easeScore,
      retentionScore,
      latencyScore,
    },
  };
}

/**
 * 5. Adaptive Scheduling Engine.
 * Calculates next schedule adapting to inferred difficulty, response latency, and circadian time.
 */
export function calculateAdaptiveSchedule({
  card,
  rating,
  reviewDurationMs = 3000,
  reviewedAt = new Date(),
}: {
  card: Flashcard;
  rating: number;
  reviewDurationMs?: number;
  reviewedAt?: Date;
}): FlashcardSchedule {
  const existingSchedule: FlashcardSchedule = card.schedule || {
    id: `sch-${card.id}`,
    flashcardId: card.id,
    state: "new",
    dueAt: reviewedAt.toISOString(),
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    updatedAt: reviewedAt.toISOString(),
  };

  const { score: difficultyScore } = inferCardDifficulty(card);
  let { state, interval, easeFactor, repetitions, lapses } = existingSchedule;

  // Clamp rating between 1 and 4
  const cleanRating = Math.max(1, Math.min(4, rating)) as ReviewRating;

  // Latency modifier:
  // Fast answer (< 2.5s) on good/easy indicates high mastery
  // Slow answer (> 15s) indicates high cognitive load
  const isFastRecall = reviewDurationMs < 2500 && cleanRating >= 3;
  const isSlowRecall = reviewDurationMs > 15000;

  // 1: Again (Quên)
  if (cleanRating === 1) {
    state = "relearning";
    repetitions = 0;
    lapses += 1;
    // Harder penalty for already difficult cards
    const lapsePenalty = difficultyScore > 6.5 ? 0.25 : 0.2;
    easeFactor = Math.max(1.3, Number((easeFactor - lapsePenalty).toFixed(2)));
    interval = 1; // 1 day retry
  }
  // 2: Hard (Khó)
  else if (cleanRating === 2) {
    state = "review";
    repetitions += 1;
    easeFactor = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
    interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2));
  }
  // 3: Good (Nhớ)
  else if (cleanRating === 3) {
    state = "review";
    repetitions += 1;
    // Normal SM-2 ease adjustment
    easeFactor = Math.max(1.3, Math.min(3.5, Number((easeFactor + 0.0).toFixed(2))));
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = isFastRecall ? 7 : 6;
    } else {
      let multiplier = easeFactor;
      if (isSlowRecall) multiplier *= 0.9;
      if (isFastRecall) multiplier *= 1.1;
      interval = Math.max(1, Math.round(interval * multiplier));
    }
  }
  // 4: Easy (Dễ)
  else if (cleanRating === 4) {
    state = "review";
    repetitions += 1;
    // Adaptive ease boost + fast recall bonus
    const easeBoost = isFastRecall ? 0.2 : 0.15;
    easeFactor = Math.max(1.3, Math.min(3.5, Number((easeFactor + easeBoost).toFixed(2))));
    if (repetitions === 1) {
      interval = isFastRecall ? 5 : 4;
    } else if (repetitions === 2) {
      interval = isFastRecall ? 12 : 10;
    } else {
      const adaptiveBonus = isFastRecall ? 1.35 : 1.25;
      interval = Math.max(1, Math.round(interval * easeFactor * adaptiveBonus));
    }
  }

  // Calculate due date
  const nextDueDate = new Date(reviewedAt.getTime());
  nextDueDate.setDate(nextDueDate.getDate() + interval);

  return {
    id: existingSchedule.id,
    flashcardId: card.id,
    cardId: card.id,
    state,
    dueAt: nextDueDate.toISOString(),
    due: nextDueDate.toISOString(),
    interval,
    easeFactor,
    repetitions,
    lapses,
    lastReviewedAt: reviewedAt.toISOString(),
    lastReviewed: reviewedAt.toISOString(),
    updatedAt: reviewedAt.toISOString(),
  };
}

/**
 * 6. Calculates Priority Score for a card to order the Smart Review Queue.
 * Higher score = higher priority to review immediately.
 * Factors:
 * - Days overdue (positive boost)
 * - Low retention rate / lapses
 * - Inferred difficulty
 * - Exam Countdown urgency (compresses intervals before examDate)
 */
export function calculateCardPriorityScore(
  card: Flashcard,
  options?: {
    examDate?: Date | string;
    now?: Date;
  }
): number {
  const now = options?.now || new Date();
  const schedule = card.schedule;

  let score = 0;

  // 1. Overdue Factor
  if (schedule?.dueAt) {
    const dueTime = new Date(schedule.dueAt).getTime();
    const overdueMs = now.getTime() - dueTime;
    const overdueDays = overdueMs / 86400000;
    if (overdueDays > 0) {
      // Overdue cards get proportional priority
      score += Math.min(10, overdueDays * 2.0);
    } else {
      // Not yet due: negative score unless exam countdown pulls it forward
      score += overdueDays * 0.5;
    }
  } else {
    // New cards without schedule have high priority to start learning
    score += 5.0;
  }

  // 2. Lapse & Forgetting Risk Factor
  const lapses = schedule?.lapses ?? 0;
  score += Math.min(6.0, lapses * 2.0);

  const retentionRate = schedule?.retentionRate ?? 0.8;
  score += (1.0 - retentionRate) * 4.0;

  // 3. Difficulty Factor
  const { score: diffScore } = inferCardDifficulty(card);
  score += diffScore * 0.5;

  // 4. Exam Countdown Factor
  if (options?.examDate) {
    const examTime = new Date(options.examDate).getTime();
    const daysUntilExam = (examTime - now.getTime()) / 86400000;

    if (daysUntilExam > 0 && daysUntilExam <= 14) {
      // The closer to the exam, the higher priority unmastered cards receive
      const urgencyWeight = Math.max(1, 15 - Math.floor(daysUntilExam));
      if (retentionRate < 0.8 || lapses >= 1 || (schedule?.repetitions ?? 0) < 3) {
        score += urgencyWeight * 1.8;
      }
    }
  }

  return Number(score.toFixed(2));
}

/**
 * 7. Assigns an algorithm variant to a card deterministically via FNV-1a hash.
 * Variant A: SM-2 Classic
 * Variant B: Adaptive Scheduling Engine
 */
export function getCardAlgorithmVariant(cardId: string): "A" | "B" {
  if (!cardId) return "A";

  let hash = 2166136261;
  for (let i = 0; i < cardId.length; i++) {
    hash ^= cardId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 2 === 0 ? "A" : "B";
}

/**
 * Helper: Standard normal cumulative distribution function approximation (Phi).
 */
function standardNormalCdf(z: number): number {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (z >= 0.0) {
    const t = 1.0 / (1.0 + p * z);
    return 1.0 - c * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * z);
    return c * Math.exp((-z * z) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

/**
 * 8. Evaluates A/B testing comparison between Variant A and Variant B.
 * Calculates Two-Proportion Z-Test for retention rates.
 */
export function calculateVariantComparison(
  reviews: FlashcardReview[],
  cardsMap?: Map<string, Flashcard> | Record<string, Flashcard>
): VariantComparisonResult {
  const getCardId = (r: FlashcardReview) => r.flashcardId || r.cardId || "";

  let totalA = 0;
  let rememberedA = 0;
  let lapsesA = 0;
  let durationSumA = 0;

  let totalB = 0;
  let rememberedB = 0;
  let lapsesB = 0;
  let durationSumB = 0;

  for (const r of reviews) {
    const cId = getCardId(r);
    const variant = getCardAlgorithmVariant(cId);

    const isRemembered = r.rating === 3 || r.rating === 4;
    const isLapse = r.rating === 1;
    const dur = r.reviewDurationMs || 0;

    if (variant === "A") {
      totalA += 1;
      if (isRemembered) rememberedA += 1;
      if (isLapse) lapsesA += 1;
      durationSumA += dur;
    } else {
      totalB += 1;
      if (isRemembered) rememberedB += 1;
      if (isLapse) lapsesB += 1;
      durationSumB += dur;
    }
  }

  const retRateA = totalA > 0 ? rememberedA / totalA : 1.0;
  const retRateB = totalB > 0 ? rememberedB / totalB : 1.0;

  const lapseRateA = totalA > 0 ? lapsesA / totalA : 0.0;
  const lapseRateB = totalB > 0 ? lapsesB / totalB : 0.0;

  const avgDurA = totalA > 0 ? durationSumA / totalA : 0;
  const avgDurB = totalB > 0 ? durationSumB / totalB : 0;

  const effectSize = Number((retRateB - retRateA).toFixed(4));

  // Two-proportion Z-test
  let zScore = 0;
  let pValue = 1.0;

  if (totalA >= 5 && totalB >= 5) {
    const pooledP = (rememberedA + rememberedB) / (totalA + totalB);
    const standardError = Math.sqrt(
      pooledP * (1 - pooledP) * (1 / totalA + 1 / totalB)
    );

    if (standardError > 0.0001) {
      zScore = (retRateB - retRateA) / standardError;
      // Two-tailed p-value = 2 * (1 - Phi(|Z|))
      pValue = 2 * (1 - standardNormalCdf(Math.abs(zScore)));
    }
  }

  return {
    variantA: {
      variant: "A",
      name: "Variant A: SM-2 Classic",
      totalReviews: totalA,
      rememberedReviews: rememberedA,
      retentionRate: Number(retRateA.toFixed(4)),
      totalLapses: lapsesA,
      lapseRate: Number(lapseRateA.toFixed(4)),
      avgDurationMs: Math.round(avgDurA),
    },
    variantB: {
      variant: "B",
      name: "Variant B: Adaptive SRS",
      totalReviews: totalB,
      rememberedReviews: rememberedB,
      retentionRate: Number(retRateB.toFixed(4)),
      totalLapses: lapsesB,
      lapseRate: Number(lapseRateB.toFixed(4)),
      avgDurationMs: Math.round(avgDurB),
    },
    effectSize,
    zScore: Number(zScore.toFixed(3)),
    pValue: Number(pValue.toFixed(4)),
    isSignificant: pValue < 0.05 && totalA >= 10 && totalB >= 10,
  };
}
