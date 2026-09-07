/**
 * Study Recommendation Engine (Phase F7.1)
 *
 * Implements multi-criteria decision modeling for intelligent topic recommendations:
 * 1. Urgency scoring based on due & overdue cards
 * 2. Retention weakness scoring (retention < 80% target & lapses)
 * 3. Exam proximity & goal importance weighting
 * 4. Time-budget fitting (15m, 30m, 60m sessions)
 * 5. Anti-fatigue diversity dampener (0.8x recency penalty)
 * 6. Explainable AI rationale generation for every recommendation
 *
 * Conforms strictly to Zero Database Schema Migrations.
 */

import type { Flashcard, FlashcardReview } from "../types/flashcard";
import type { Topic } from "../types/index";

export type TimeBudgetMinutes = 15 | 30 | 60;

export interface StudyRecommendationOptions {
  timeBudgetMinutes?: TimeBudgetMinutes;
  lastCompletedTopicId?: string | null;
  targetRetention?: number; // default 0.80
  examTargetDates?: Record<string, string>; // topicId -> ISO date string
  secondsPerCard?: number; // default 30s
  referenceDate?: Date; // default new Date()
}

export interface RecommendationMetrics {
  totalCards: number;
  dueCardsCount: number;
  newCardsCount: number;
  retentionRate: number; // 0.0 to 1.0
  estimatedMinutesNeeded: number;
  urgencyScore: number; // 0.0 to 1.0
  weakRetentionScore: number; // 0.0 to 1.0
  examImportanceScore: number; // 0.0 to 1.0
  timeFitScore: number; // 0.0 to 1.0
  recencyMultiplier: number; // 1.0 or 0.8
}

export interface TopicRecommendation {
  topicId: string;
  topicTitle: string;
  categoryId: string;
  compositeScore: number; // 0.0 to 100.0
  rank: number;
  isNextBestTopic: boolean;
  metrics: RecommendationMetrics;
  explanation: string;
  suggestedCardBatchSize: number;
}

export interface StudyRecommendationResult {
  timeBudgetMinutes: TimeBudgetMinutes;
  recommendedTopics: TopicRecommendation[];
  topRecommendation: TopicRecommendation | null;
  totalDueCardsAcrossTopics: number;
}

const DEFAULT_TARGET_RETENTION = 0.8;
const DEFAULT_SECONDS_PER_CARD = 30; // 30 seconds average per card review

/**
 * Calculates time-budget target card capacity.
 * 15m -> 30 cards, 30m -> 60 cards, 60m -> 120 cards (at 30s/card)
 */
export function getTargetCardCapacity(
  timeBudgetMinutes: TimeBudgetMinutes = 30,
  secondsPerCard: number = DEFAULT_SECONDS_PER_CARD
): number {
  return Math.max(5, Math.round((timeBudgetMinutes * 60) / secondsPerCard));
}

/**
 * Generates an explainable human-readable rationale for a topic recommendation.
 */
export function generateRecommendationExplanation(
  metrics: RecommendationMetrics,
  timeBudgetMinutes: TimeBudgetMinutes,
  topicTitle: string,
  examDaysRemaining?: number | null
): string {
  const parts: string[] = [];

  // 1. Urgency / Due status
  if (metrics.dueCardsCount > 0) {
    parts.push(`Có ${metrics.dueCardsCount} thẻ đến hạn ôn`);
  } else if (metrics.newCardsCount > 0) {
    parts.push(`Có ${metrics.newCardsCount} thẻ mới cần bắt đầu`);
  } else {
    parts.push("Đã hoàn thành các thẻ đến hạn");
  }

  // 2. Retention Health
  const retPct = Math.round(metrics.retentionRate * 100);
  if (metrics.retentionRate < 0.8 && metrics.totalCards > 0) {
    parts.push(`Tỷ lệ nhớ ${retPct}% (dưới chuẩn 80%, cần củng cố)`);
  } else if (metrics.retentionRate >= 0.8 && metrics.totalCards > 0) {
    parts.push(`Trí nhớ ổn định (${retPct}%)`);
  }

  // 3. Exam countdown
  if (examDaysRemaining !== null && examDaysRemaining !== undefined) {
    if (examDaysRemaining <= 1) {
      parts.push("⚠️ Kế hoạch ôn tập sát ngày thi (còn 1 ngày)!");
    } else if (examDaysRemaining <= 7) {
      parts.push(`Gần ngày kiểm tra (còn ${examDaysRemaining} ngày)`);
    } else {
      parts.push(`Đang trong tiến trình hướng tới mục tiêu (${examDaysRemaining} ngày)`);
    }
  }

  // 4. Session Time Fit
  parts.push(`Thời lượng ước tính ~${metrics.estimatedMinutesNeeded} phút (khớp phiên ${timeBudgetMinutes}m)`);

  // 5. Anti-fatigue diversity
  if (metrics.recencyMultiplier < 1.0) {
    parts.push("(Vừa ôn ở phiên trước, giảm nhẹ ưu tiên để xoay vòng chủ đề)");
  }

  return parts.join(" • ");
}

/**
 * Calculates utility score & recommendation metrics for a single topic.
 */
export function calculateTopicUtilityScore(
  topic: Topic,
  allCards: Flashcard[],
  allReviews: FlashcardReview[],
  options: StudyRecommendationOptions = {}
): { score: number; metrics: RecommendationMetrics; explanation: string } {
  const timeBudget = options.timeBudgetMinutes ?? 30;
  const targetRetention = options.targetRetention ?? DEFAULT_TARGET_RETENTION;
  const secondsPerCard = options.secondsPerCard ?? DEFAULT_SECONDS_PER_CARD;
  const refDate = options.referenceDate ?? new Date();
  const refTime = refDate.getTime();

  const topicCards = allCards.filter((c) => c.topicId === topic.id);
  const cardIdSet = new Set(topicCards.map((c) => c.id));
  const topicReviews = allReviews.filter(
    (r) => r.topicId === topic.id || cardIdSet.has(r.flashcardId || (r as any).cardId || "")
  );

  // 1. Due & New Cards
  let dueCardsCount = 0;
  let newCardsCount = 0;

  for (const card of topicCards) {
    if (!card.schedule || card.schedule.state === "new") {
      newCardsCount++;
    } else {
      const dueTime = new Date(card.schedule.dueAt || (card.schedule as any).due || "").getTime();
      if (dueTime <= refTime || card.schedule.state === "relearning") {
        dueCardsCount++;
      }
    }
  }

  // 2. Retention Rate
  let retentionRate = 0.85; // default optimistic baseline if no reviews
  if (topicReviews.length > 0) {
    const correctCount = topicReviews.filter((r) => r.rating >= 3).length;
    retentionRate = correctCount / topicReviews.length;
  }

  // 3. Estimated Time Needed (minutes)
  const activeWorkload = dueCardsCount + Math.min(newCardsCount, 10);
  const estimatedMinutesNeeded = Math.max(
    1,
    Math.round((activeWorkload * secondsPerCard) / 60)
  );

  // 4. Urgency Score (0.0 to 1.0)
  const capacity = getTargetCardCapacity(timeBudget, secondsPerCard);
  const dueRatio = Math.min(1.0, dueCardsCount / Math.max(1, capacity));
  const topicDueRatio = topicCards.length > 0 ? dueCardsCount / topicCards.length : 0;
  const urgencyScore = Math.min(1.0, dueRatio * 0.65 + topicDueRatio * 0.35);

  // 5. Weak Retention Score (0.0 to 1.0)
  let weakRetentionScore = 0.0;
  if (topicCards.length > 0 && retentionRate < targetRetention) {
    weakRetentionScore = Math.min(1.0, (targetRetention - retentionRate) / targetRetention);
  }
  // Add weight for card lapses
  const lapsesSum = topicCards.reduce((sum, c) => sum + (c.schedule?.lapses || 0), 0);
  if (lapsesSum > 0) {
    weakRetentionScore = Math.min(1.0, weakRetentionScore + Math.min(0.3, lapsesSum * 0.05));
  }

  // 6. Exam Proximity Score (0.0 to 1.0)
  let examImportanceScore = 0.0;
  let examDaysRemaining: number | null = null;

  if (options.examTargetDates && options.examTargetDates[topic.id]) {
    const examDate = new Date(options.examTargetDates[topic.id]).getTime();
    const diffDays = Math.max(0, (examDate - refTime) / 86400000);
    examDaysRemaining = Math.round(diffDays);

    if (diffDays <= 1) {
      examImportanceScore = 1.0;
    } else if (diffDays <= 3) {
      examImportanceScore = 0.9;
    } else if (diffDays <= 7) {
      examImportanceScore = 0.7;
    } else if (diffDays <= 14) {
      examImportanceScore = 0.45;
    } else if (diffDays <= 30) {
      examImportanceScore = 0.25;
    }
  }

  // 7. Time Fit Score (0.0 to 1.0)
  // Highest when workload is close to capacity without excessive overflow
  const workloadRatio = activeWorkload / Math.max(1, capacity);
  let timeFitScore = 1.0 - Math.min(1.0, Math.abs(1.0 - workloadRatio));
  if (workloadRatio === 0) {
    timeFitScore = 0.1; // Minimal fit when nothing to review
  }

  // 8. Anti-fatigue recency multiplier
  const recencyMultiplier = options.lastCompletedTopicId === topic.id ? 0.8 : 1.0;

  // Composite Score (0.0 to 100.0)
  const rawScore =
    0.40 * urgencyScore +
    0.35 * weakRetentionScore +
    0.15 * examImportanceScore +
    0.10 * timeFitScore;

  const finalScore = Number((rawScore * 100 * recencyMultiplier).toFixed(2));

  const metrics: RecommendationMetrics = {
    totalCards: topicCards.length,
    dueCardsCount,
    newCardsCount,
    retentionRate: Number(retentionRate.toFixed(4)),
    estimatedMinutesNeeded,
    urgencyScore: Number(urgencyScore.toFixed(4)),
    weakRetentionScore: Number(weakRetentionScore.toFixed(4)),
    examImportanceScore: Number(examImportanceScore.toFixed(4)),
    timeFitScore: Number(timeFitScore.toFixed(4)),
    recencyMultiplier,
  };

  const explanation = generateRecommendationExplanation(
    metrics,
    timeBudget,
    topic.title,
    examDaysRemaining
  );

  return { score: finalScore, metrics, explanation };
}

/**
 * Ranks topics for study based on multi-criteria utility scoring.
 */
export function rankTopicsForStudy(
  topics: Topic[],
  cards: Flashcard[],
  reviews: FlashcardReview[],
  options: StudyRecommendationOptions = {}
): TopicRecommendation[] {
  if (!topics || topics.length === 0) return [];

  const timeBudget = options.timeBudgetMinutes ?? 30;
  const capacity = getTargetCardCapacity(timeBudget, options.secondsPerCard);

  const scoredList = topics.map((topic) => {
    const { score, metrics, explanation } = calculateTopicUtilityScore(
      topic,
      cards,
      reviews,
      options
    );

    const suggestedCardBatchSize = Math.min(
      capacity,
      metrics.dueCardsCount > 0 ? metrics.dueCardsCount : metrics.newCardsCount
    );

    return {
      topicId: topic.id,
      topicTitle: topic.title,
      categoryId: topic.categoryId,
      compositeScore: score,
      metrics,
      explanation,
      suggestedCardBatchSize: Math.max(1, suggestedCardBatchSize),
    };
  });

  // Sort descending by compositeScore
  scoredList.sort((a, b) => b.compositeScore - a.compositeScore);

  return scoredList.map((item, index) => ({
    ...item,
    rank: index + 1,
    isNextBestTopic: index === 0,
  }));
}

/**
 * Filters and prepares study recommendations for a specific time budget.
 */
export function filterRecommendationsByTime(
  recommendations: TopicRecommendation[],
  timeBudgetMinutes: TimeBudgetMinutes
): TopicRecommendation[] {
  const capacity = getTargetCardCapacity(timeBudgetMinutes);

  return recommendations
    .map((rec) => {
      const adjustedBatchSize = Math.min(
        capacity,
        rec.metrics.dueCardsCount > 0
          ? rec.metrics.dueCardsCount
          : Math.min(capacity, rec.metrics.newCardsCount)
      );

      return {
        ...rec,
        suggestedCardBatchSize: Math.max(1, adjustedBatchSize),
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * High-level orchestration function to obtain full recommendation result.
 */
export function getStudyRecommendations(
  topics: Topic[],
  cards: Flashcard[],
  reviews: FlashcardReview[],
  options: StudyRecommendationOptions = {}
): StudyRecommendationResult {
  const timeBudget = options.timeBudgetMinutes ?? 30;
  const ranked = rankTopicsForStudy(topics, cards, reviews, options);
  const topRecommendation = ranked.length > 0 ? ranked[0] : null;

  const totalDueCardsAcrossTopics = ranked.reduce(
    (sum, r) => sum + r.metrics.dueCardsCount,
    0
  );

  return {
    timeBudgetMinutes: timeBudget,
    recommendedTopics: ranked,
    topRecommendation,
    totalDueCardsAcrossTopics,
  };
}
