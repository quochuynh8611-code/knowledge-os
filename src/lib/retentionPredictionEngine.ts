/**
 * Retention Prediction Engine (Phase F7.1)
 *
 * Implements mathematical predictive models for spaced repetition:
 * 1. Exponential decay memory modeling: R(t) = exp(-t / S)
 * 2. Multi-horizon recall predictions (1d, 3d, 7d, 14d, 30d)
 * 3. 80% & 95% confidence intervals based on residual review variance
 * 4. Optimal next review date computation when R(t) drops to target threshold
 * 5. Retention model calibration against historical review outcomes
 * 6. Batch evaluation across multiple flashcards
 *
 * Conforms strictly to Zero Database Schema Migrations (Pure runtime calculations).
 */

import type { Flashcard, FlashcardReview } from "../types/flashcard";
import { calculateStabilityFromReviews } from "./srsAlgorithmTuning";

export interface RetentionHorizonPoint {
  horizonDays: number;
  retentionProbability: number; // 0.0 to 1.0
  confidenceInterval80: [number, number]; // [lower, upper]
  confidenceInterval95: [number, number]; // [lower, upper]
}

export interface ForgettingCurvePoint {
  day: number;
  retentionRate: number; // 0.0 to 1.0 (percentage / 100)
  ci80Lower: number;
  ci80Upper: number;
  ci95Lower: number;
  ci95Upper: number;
}

export type PredictionConfidenceLevel = "high" | "medium" | "low" | "initial";

export interface RetentionPredictionResult {
  cardId: string;
  stability: number; // Days to 1/e retention
  decayRate: number; // lambda = 1 / S
  calibratedDecayRate?: number;
  lastReviewedAt: string | null;
  daysSinceLastReview: number;
  currentRetentionProbability: number;
  horizons: RetentionHorizonPoint[];
  optimalReviewDays: number;
  optimalReviewDate: string; // ISO 8601 string
  targetRetention: number; // default 0.80
  confidence: PredictionConfidenceLevel;
  reviewCount: number;
}

export interface RetentionPredictionSummary {
  totalCards: number;
  avgStability: number;
  avgCurrentRetention: number;
  cardsNeedingReviewSoon: number; // cards with current or near-term retention < target
  predictions: RetentionPredictionResult[];
}

export interface RetentionModelCalibration {
  originalDecayRate: number;
  calibratedDecayRate: number;
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  calibrationFactor: number; // Multiplier applied: calibrated = factor * original
  sampleSize: number;
}

export interface RetentionPredictionOptions {
  targetRetention?: number; // default 0.80
  customStability?: number;
  calibrationFactor?: number;
  referenceDate?: Date; // default new Date()
}

const DEFAULT_TARGET_RETENTION = 0.8;
const DEFAULT_INITIAL_STABILITY = 2.5; // days

// Standard normal distribution critical values
const Z_80 = 1.282; // 80% confidence interval z-score
const Z_95 = 1.96; // 95% confidence interval z-score

/**
 * Derives the effective stability S for a specific card.
 */
export function deriveCardStability(
  card: Flashcard,
  reviews: FlashcardReview[],
  customStability?: number
): { stability: number; confidence: PredictionConfidenceLevel; cardReviews: FlashcardReview[] } {
  if (customStability && customStability > 0) {
    return {
      stability: Math.max(0.5, Math.min(365, customStability)),
      confidence: "medium",
      cardReviews: [],
    };
  }

  const cardId = card.id;
  const cardReviews = reviews.filter(
    (r) => r.flashcardId === cardId || (r as any).cardId === cardId
  );

  if (cardReviews.length >= 5) {
    const s = calculateStabilityFromReviews(cardReviews);
    return { stability: s, confidence: "high", cardReviews };
  }

  if (cardReviews.length >= 2) {
    const s = calculateStabilityFromReviews(cardReviews);
    return { stability: s, confidence: "medium", cardReviews };
  }

  // Fallback to schedule interval & ease if available
  if (card.schedule && card.schedule.interval > 0) {
    const s = Math.max(1.0, card.schedule.interval * (card.schedule.easeFactor / 2.5));
    return {
      stability: Math.min(60.0, Number(s.toFixed(2))),
      confidence: "low",
      cardReviews,
    };
  }

  return {
    stability: DEFAULT_INITIAL_STABILITY,
    confidence: "initial",
    cardReviews,
  };
}

/**
 * Calculates standard deviation of review prediction residuals to establish confidence intervals.
 */
export function calculateResidualStandardDeviation(
  reviews: FlashcardReview[],
  stability: number
): number {
  if (!reviews || reviews.length < 2) {
    return 0.35; // Default standard error for few reviews
  }

  let sumSquaredError = 0;
  let count = 0;

  for (const review of reviews) {
    const interval = Math.max(1, review.intervalBefore || review.intervalAfter || 1);
    const predicted = Math.exp(-interval / stability);
    const observed = review.rating >= 3 ? 1.0 : 0.0;
    const err = observed - predicted;
    sumSquaredError += err * err;
    count++;
  }

  if (count === 0) return 0.35;
  const variance = sumSquaredError / count;
  return Math.max(0.1, Math.min(0.6, Math.sqrt(variance)));
}

/**
 * Computes bounded confidence intervals for retention R(t).
 */
export function computeConfidenceIntervals(
  retention: number,
  stdDev: number,
  sampleSize: number
): { ci80: [number, number]; ci95: [number, number] } {
  if (retention >= 0.999) {
    return { ci80: [1.0, 1.0], ci95: [1.0, 1.0] };
  }
  if (retention <= 0.001) {
    return { ci80: [0.0, 0.0], ci95: [0.0, 0.0] };
  }

  const effectiveN = Math.max(1, sampleSize);
  const margin80 = Z_80 * (stdDev / Math.sqrt(effectiveN));
  const margin95 = Z_95 * (stdDev / Math.sqrt(effectiveN));

  const ci80Lower = Math.max(0.0, Math.min(retention, retention * Math.exp(-margin80)));
  const ci80Upper = Math.min(1.0, Math.max(retention, retention * Math.exp(margin80)));

  const ci95Lower = Math.max(0.0, Math.min(retention, retention * Math.exp(-margin95)));
  const ci95Upper = Math.min(1.0, Math.max(retention, retention * Math.exp(margin95)));

  return {
    ci80: [Number(ci80Lower.toFixed(4)), Number(ci80Upper.toFixed(4))],
    ci95: [Number(ci95Lower.toFixed(4)), Number(ci95Upper.toFixed(4))],
  };
}

/**
 * Predicts retention probability at future horizons for a single flashcard.
 */
export function predictCardRetention(
  card: Flashcard,
  reviews: FlashcardReview[],
  daysAhead = 0,
  options: RetentionPredictionOptions = {}
): RetentionPredictionResult {
  const targetRetention = options.targetRetention ?? DEFAULT_TARGET_RETENTION;
  const calibrationFactor = options.calibrationFactor ?? 1.0;
  const refDate = options.referenceDate ?? new Date();

  const { stability, confidence, cardReviews } = deriveCardStability(
    card,
    reviews,
    options.customStability
  );

  const originalDecayRate = 1 / stability;
  const effectiveDecayRate = originalDecayRate * Math.max(0.1, Math.min(10, calibrationFactor));
  const effectiveStability = 1 / effectiveDecayRate;

  // Determine days elapsed since last review
  let lastReviewedAt: string | null = null;
  if (card.schedule?.lastReviewedAt) {
    lastReviewedAt = card.schedule.lastReviewedAt;
  } else if (cardReviews.length > 0) {
    const latest = [...cardReviews].sort(
      (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
    )[0];
    lastReviewedAt = latest.reviewedAt;
  } else if (card.createdAt) {
    lastReviewedAt = card.createdAt;
  }

  let daysSinceLastReview = 0;
  if (lastReviewedAt) {
    const diffMs = refDate.getTime() - new Date(lastReviewedAt).getTime();
    daysSinceLastReview = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
  }

  const currentT = daysSinceLastReview + daysAhead;
  const currentRetentionProbability = Math.min(
    1.0,
    Math.max(0.0, Math.exp(-currentT * effectiveDecayRate))
  );

  const stdDev = calculateResidualStandardDeviation(cardReviews, effectiveStability);

  // Calculate prediction at standard horizons: 1d, 3d, 7d, 14d, 30d
  const horizonDaysList = [1, 3, 7, 14, 30];
  const horizons: RetentionHorizonPoint[] = horizonDaysList.map((hDays) => {
    const t = daysSinceLastReview + hDays;
    const prob = Math.min(1.0, Math.max(0.0, Math.exp(-t * effectiveDecayRate)));
    const { ci80, ci95 } = computeConfidenceIntervals(prob, stdDev, cardReviews.length);
    return {
      horizonDays: hDays,
      retentionProbability: Number(prob.toFixed(4)),
      confidenceInterval80: ci80,
      confidenceInterval95: ci95,
    };
  });

  // Calculate optimal review days: t* = -S * ln(targetRetention)
  // Elapsed time until retention hits target: remainingDays = t* - daysSinceLastReview
  const totalDaysToTarget = -effectiveStability * Math.log(targetRetention);
  const optimalReviewDays = Math.max(0, Number((totalDaysToTarget - daysSinceLastReview).toFixed(1)));

  const optimalDateObj = new Date(refDate.getTime() + optimalReviewDays * 86400000);
  const optimalReviewDate = optimalDateObj.toISOString();

  return {
    cardId: card.id,
    stability: Number(effectiveStability.toFixed(2)),
    decayRate: Number(originalDecayRate.toFixed(4)),
    calibratedDecayRate: Number(effectiveDecayRate.toFixed(4)),
    lastReviewedAt,
    daysSinceLastReview: Number(daysSinceLastReview.toFixed(1)),
    currentRetentionProbability: Number(currentRetentionProbability.toFixed(4)),
    horizons,
    optimalReviewDays,
    optimalReviewDate,
    targetRetention,
    confidence,
    reviewCount: cardReviews.length,
  };
}

/**
 * Generates continuous forgetting curve forecast points (0 to maxDays) for SVG visualization.
 */
export function generateForgettingCurveForecast(
  card: Flashcard,
  reviews: FlashcardReview[],
  maxDays = 30,
  options: RetentionPredictionOptions = {}
): ForgettingCurvePoint[] {
  const calibrationFactor = options.calibrationFactor ?? 1.0;
  const { stability, cardReviews } = deriveCardStability(
    card,
    reviews,
    options.customStability
  );

  const effectiveDecayRate = (1 / stability) * Math.max(0.1, Math.min(10, calibrationFactor));
  const effectiveStability = 1 / effectiveDecayRate;
  const stdDev = calculateResidualStandardDeviation(cardReviews, effectiveStability);

  const points: ForgettingCurvePoint[] = [];

  for (let day = 0; day <= maxDays; day++) {
    const rate = Math.exp(-day * effectiveDecayRate);
    const { ci80, ci95 } = computeConfidenceIntervals(rate, stdDev, cardReviews.length);

    points.push({
      day,
      retentionRate: Number(rate.toFixed(4)),
      ci80Lower: ci80[0],
      ci80Upper: ci80[1],
      ci95Lower: ci95[0],
      ci95Upper: ci95[1],
    });
  }

  return points;
}

/**
 * Calculates optimal next review date when retention touches target threshold.
 */
export function calculateOptimalReviewDate(
  card: Flashcard,
  reviews: FlashcardReview[],
  targetRetention = DEFAULT_TARGET_RETENTION,
  options: RetentionPredictionOptions = {}
): { optimalDays: number; optimalDate: Date } {
  const pred = predictCardRetention(card, reviews, 0, {
    ...options,
    targetRetention,
  });

  return {
    optimalDays: pred.optimalReviewDays,
    optimalDate: new Date(pred.optimalReviewDate),
  };
}

/**
 * Calibrates retention model against historical review outcomes.
 * Finds the decay rate multiplier that minimizes Mean Squared Error (MSE) on review logs.
 */
export function calibrateRetentionModel(
  reviews: FlashcardReview[],
  predictions?: RetentionPredictionResult[]
): RetentionModelCalibration {
  if (!reviews || reviews.length < 3) {
    const baseDecay = 1 / DEFAULT_INITIAL_STABILITY;
    return {
      originalDecayRate: Number(baseDecay.toFixed(4)),
      calibratedDecayRate: Number(baseDecay.toFixed(4)),
      meanAbsoluteError: 0,
      rootMeanSquaredError: 0,
      calibrationFactor: 1.0,
      sampleSize: reviews ? reviews.length : 0,
    };
  }

  // Derive empirical baseline decay
  const baseStability = calculateStabilityFromReviews(reviews);
  const baseDecay = 1 / baseStability;

  // Build calibration data points: (elapsedDays, wasCorrect)
  const dataPoints: Array<{ elapsedDays: number; isCorrect: number }> = [];

  const sorted = [...reviews].sort(
    (a, b) => new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime()
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevTime = new Date(prev.reviewedAt).getTime();
    const currTime = new Date(curr.reviewedAt).getTime();
    const elapsedDays = Math.max(1, Math.round((currTime - prevTime) / 86400000));
    const isCorrect = curr.rating >= 3 ? 1 : 0;
    dataPoints.push({ elapsedDays, isCorrect });
  }

  if (dataPoints.length === 0) {
    return {
      originalDecayRate: Number(baseDecay.toFixed(4)),
      calibratedDecayRate: Number(baseDecay.toFixed(4)),
      meanAbsoluteError: 0,
      rootMeanSquaredError: 0,
      calibrationFactor: 1.0,
      sampleSize: 0,
    };
  }

  // Grid search for optimal calibration multiplier k in [0.2, 3.0] with step 0.05
  let bestK = 1.0;
  let minMSE = Number.MAX_VALUE;

  for (let k = 0.2; k <= 3.01; k += 0.05) {
    let currentSSE = 0;
    for (const pt of dataPoints) {
      const pred = Math.exp(-k * baseDecay * pt.elapsedDays);
      const diff = pt.isCorrect - pred;
      currentSSE += diff * diff;
    }
    const currentMSE = currentSSE / dataPoints.length;
    if (currentMSE < minMSE) {
      minMSE = currentMSE;
      bestK = k;
    }
  }

  // Calculate final MAE & RMSE with bestK
  let sumAE = 0;
  let sumSE = 0;
  for (const pt of dataPoints) {
    const pred = Math.exp(-bestK * baseDecay * pt.elapsedDays);
    const diff = pt.isCorrect - pred;
    sumAE += Math.abs(diff);
    sumSE += diff * diff;
  }

  const mae = sumAE / dataPoints.length;
  const rmse = Math.sqrt(sumSE / dataPoints.length);
  const calibratedDecay = baseDecay * bestK;

  return {
    originalDecayRate: Number(baseDecay.toFixed(4)),
    calibratedDecayRate: Number(calibratedDecay.toFixed(4)),
    meanAbsoluteError: Number(mae.toFixed(4)),
    rootMeanSquaredError: Number(rmse.toFixed(4)),
    calibrationFactor: Number(bestK.toFixed(2)),
    sampleSize: dataPoints.length,
  };
}

/**
 * Batch evaluates retention predictions across multiple flashcards.
 */
export function batchPredictRetention(
  cards: Flashcard[],
  reviews: FlashcardReview[],
  options: RetentionPredictionOptions = {}
): RetentionPredictionSummary {
  if (!cards || cards.length === 0) {
    return {
      totalCards: 0,
      avgStability: 0,
      avgCurrentRetention: 0,
      cardsNeedingReviewSoon: 0,
      predictions: [],
    };
  }

  const targetRetention = options.targetRetention ?? DEFAULT_TARGET_RETENTION;
  const predictions = cards.map((c) => predictCardRetention(c, reviews, 0, options));

  const totalStability = predictions.reduce((sum, p) => sum + p.stability, 0);
  const totalRetention = predictions.reduce(
    (sum, p) => sum + p.currentRetentionProbability,
    0
  );

  const cardsNeedingReviewSoon = predictions.filter(
    (p) => p.currentRetentionProbability <= targetRetention || p.optimalReviewDays <= 1
  ).length;

  return {
    totalCards: cards.length,
    avgStability: Number((totalStability / cards.length).toFixed(2)),
    avgCurrentRetention: Number((totalRetention / cards.length).toFixed(4)),
    cardsNeedingReviewSoon,
    predictions,
  };
}
