/**
 * Research Aggregation Service (Phase F7.0)
 *
 * Consolidates and aggregates multi-domain assets (Notes, Flashcards, Resources, Reviews)
 * for Topic Dashboards, Analytics, and Research Overviews.
 *
 * Strictly zero database migrations: derived purely at runtime.
 */

import type { Note, Resource, Topic } from "../types";
import type { Flashcard, FlashcardReview } from "../types/flashcard";
import { calculateStabilityFromReviews } from "./srsAlgorithmTuning";
import { calculateStreakDays } from "./flashcardReviewSessionUtils";

export interface TopicAssetAggregation {
  topicId: string;
  notesCount: number;
  flashcardsCount: number;
  resourcesCount: number;
  activeCardsCount: number;
  suspendedCardsCount: number;
  cardsDueCount: number;
}

export interface TopicResearchStats {
  topicId: string;
  totalReviews: number;
  retentionRate: number; // percentage 0 - 100
  streakDays: number;
  timeSpentMinutes: number;
  averageEaseFactor: number;
  stabilityDays: number;
}

export interface RetentionTrendPoint {
  date: string; // YYYY-MM-DD
  retentionRate: number; // percentage 0 - 100
  reviewCount: number;
  rememberedCount: number;
}

export type ActivityItemType = "note" | "flashcard" | "review" | "resource";

export interface TopicActivityItem {
  id: string;
  type: ActivityItemType;
  title: string;
  snippet?: string;
  timestamp: string; // ISO 8601
  entityId: string;
  metadata?: Record<string, any>;
}

/**
 * 1. Aggregates asset counts and statuses for a given topic.
 */
export function aggregateTopicAssets(
  topicId: string,
  data: {
    notes?: Note[];
    flashcards?: Flashcard[];
    resources?: Resource[];
    now?: Date;
  }
): TopicAssetAggregation {
  const notes = (data.notes || []).filter(
    (n) => n.topicId === topicId || (n.topicIds && n.topicIds.includes(topicId))
  );

  const flashcards = (data.flashcards || []).filter(
    (f) => f.topicId === topicId
  );

  const resources = (data.resources || []).filter(
    (r) => r.topicId === topicId
  );

  const nowTime = (data.now || new Date()).getTime();

  let activeCardsCount = 0;
  let suspendedCardsCount = 0;
  let cardsDueCount = 0;

  for (const card of flashcards) {
    if (card.lifecycleStatus === "suspended" || card.lifecycleStatus === "archived") {
      suspendedCardsCount++;
    } else {
      activeCardsCount++;
      if (card.schedule?.dueAt) {
        const dueTime = new Date(card.schedule.dueAt).getTime();
        if (dueTime <= nowTime) {
          cardsDueCount++;
        }
      }
    }
  }

  return {
    topicId,
    notesCount: notes.length,
    flashcardsCount: flashcards.length,
    resourcesCount: resources.length,
    activeCardsCount,
    suspendedCardsCount,
    cardsDueCount,
  };
}

/**
 * 2. Computes learning performance stats (retention rate, streak, time spent) for a topic.
 */
export function calculateTopicStats(
  topicId: string,
  data: {
    reviews?: FlashcardReview[];
    flashcards?: Flashcard[];
    now?: Date;
  }
): TopicResearchStats {
  const now = data.now || new Date();
  const allReviews = data.reviews || [];
  const flashcards = (data.flashcards || []).filter((f) => f.topicId === topicId);

  const cardIdSet = new Set(flashcards.map((f) => f.id));

  // Reviews matching either topicId directly or belonging to cards in this topic
  const topicReviews = allReviews.filter(
    (r) => r.topicId === topicId || cardIdSet.has(r.flashcardId || r.cardId || "")
  );

  const totalReviews = topicReviews.length;
  let rememberedReviews = 0;
  let totalDurationMs = 0;

  for (const r of topicReviews) {
    if (r.rating === 3 || r.rating === 4) {
      rememberedReviews++;
    }
    totalDurationMs += r.reviewDurationMs || 0;
  }

  const retentionRate =
    totalReviews > 0 ? Math.round((rememberedReviews / totalReviews) * 100) : 100;

  const streakDays = calculateStreakDays(topicReviews, now);
  const timeSpentMinutes = Math.round(totalDurationMs / 60000);

  // Average Ease Factor across active flashcards
  let easeFactorSum = 0;
  let cardCount = 0;
  for (const card of flashcards) {
    if (card.schedule?.easeFactor) {
      easeFactorSum += card.schedule.easeFactor;
      cardCount++;
    }
  }
  const averageEaseFactor =
    cardCount > 0 ? Number((easeFactorSum / cardCount).toFixed(2)) : 2.5;

  const stabilityDays = calculateStabilityFromReviews(topicReviews);

  return {
    topicId,
    totalReviews,
    retentionRate,
    streakDays,
    timeSpentMinutes,
    averageEaseFactor,
    stabilityDays,
  };
}

/**
 * 3. Calculates retention trend points grouped by day for SVG chart rendering.
 */
export function calculateTopicRetentionTrend(
  reviews: FlashcardReview[],
  dateRange: "7d" | "30d" | "90d" | "all" = "30d",
  now: Date = new Date()
): RetentionTrendPoint[] {
  if (!reviews || reviews.length === 0) {
    return [];
  }

  // Filter reviews by dateRange
  const nowMs = now.getTime();
  let cutoffMs = 0;

  if (dateRange === "7d") {
    cutoffMs = nowMs - 7 * 86400000;
  } else if (dateRange === "30d") {
    cutoffMs = nowMs - 30 * 86400000;
  } else if (dateRange === "90d") {
    cutoffMs = nowMs - 90 * 86400000;
  }

  const filtered = cutoffMs > 0
    ? reviews.filter((r) => new Date(r.reviewedAt).getTime() >= cutoffMs)
    : reviews;

  // Group by YYYY-MM-DD
  const dayBuckets = new Map<string, { remembered: number; total: number }>();

  for (const r of filtered) {
    const dayKey = new Date(r.reviewedAt).toISOString().split("T")[0];
    const existing = dayBuckets.get(dayKey) || { remembered: 0, total: 0 };
    existing.total++;
    if (r.rating === 3 || r.rating === 4) {
      existing.remembered++;
    }
    dayBuckets.set(dayKey, existing);
  }

  const points: RetentionTrendPoint[] = [];

  for (const [date, stats] of dayBuckets.entries()) {
    const rate = stats.total > 0 ? Math.round((stats.remembered / stats.total) * 100) : 100;
    points.push({
      date,
      retentionRate: rate,
      reviewCount: stats.total,
      rememberedCount: stats.remembered,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 4. Extracts the most recent activity items across all assets for a given topic.
 */
export function getRecentTopicActivities(
  topicId: string,
  data: {
    notes?: Note[];
    flashcards?: Flashcard[];
    reviews?: FlashcardReview[];
    resources?: Resource[];
  },
  limit = 10
): TopicActivityItem[] {
  const activities: TopicActivityItem[] = [];

  // Notes
  const topicNotes = (data.notes || []).filter(
    (n) => n.topicId === topicId || (n.topicIds && n.topicIds.includes(topicId))
  );
  for (const note of topicNotes) {
    activities.push({
      id: `act-note-${note.id}`,
      type: "note",
      title: note.title || "Ghi chú không tên",
      snippet: (note.content || "").slice(0, 120),
      timestamp: note.updatedAt || note.createdAt,
      entityId: note.id,
      metadata: { tags: note.tags, isPrivate: note.isPrivate },
    });
  }

  // Flashcards
  const topicCards = (data.flashcards || []).filter((f) => f.topicId === topicId);
  for (const card of topicCards) {
    activities.push({
      id: `act-card-${card.id}`,
      type: "flashcard",
      title: card.front || "Thẻ ghi nhớ",
      snippet: (card.back || "").slice(0, 100),
      timestamp: card.updatedAt || card.createdAt,
      entityId: card.id,
      metadata: { type: card.type, state: card.schedule?.state },
    });
  }

  // Resources
  const topicResources = (data.resources || []).filter((r) => r.topicId === topicId);
  for (const res of topicResources) {
    activities.push({
      id: `act-res-${res.id}`,
      type: "resource",
      title: res.title || "Tài liệu",
      snippet: res.notes || res.url || res.filePath || "",
      timestamp: res.createdAt,
      entityId: res.id,
      metadata: { type: res.type, author: res.author },
    });
  }

  // Reviews
  const cardIdSet = new Set(topicCards.map((c) => c.id));
  const topicReviews = (data.reviews || []).filter(
    (r) => r.topicId === topicId || cardIdSet.has(r.flashcardId || r.cardId || "")
  );
  for (const rev of topicReviews) {
    activities.push({
      id: `act-rev-${rev.id}`,
      type: "review",
      title: `Ôn tập thẻ (Điểm: ${rev.rating}/4)`,
      snippet: `Thời gian: ${(rev.reviewDurationMs / 1000).toFixed(1)}s`,
      timestamp: rev.reviewedAt,
      entityId: rev.flashcardId || rev.cardId || rev.id,
      metadata: { rating: rev.rating, stateAfter: rev.stateAfter },
    });
  }

  // Sort descending by timestamp
  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return activities.slice(0, limit);
}
