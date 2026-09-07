/**
 * Pure Logic Engine for Flashcard Actionable Analytics (Phase F6.8)
 *
 * Implements:
 * - Retention rate calculation (7-day, 30-day, all-time, topic-scoped)
 * - Workload forecast calculation (7-day, 30-day bucketed forecasts)
 * - Weak cards identification & metrics (lapses >= 3 or easeFactor <= 2.0)
 * - Lapse trend & spike analysis (rating = 1 Again over time)
 * - Comprehensive overview aggregation (lifecycle, due, overdue, daily limit)
 * - Actionable insights & Call-To-Action (CTA) generator
 */

import type { Flashcard, FlashcardReview } from "../types/flashcard";

export interface DailyWorkloadForecast {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM
  count: number;
  isToday: boolean;
}

export interface WeakCardsMetrics {
  count: number;
  weakCards: Flashcard[];
  percentage: number;
}

export interface DailyLapsePoint {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // DD/MM
  lapses: number;
}

export interface LapseTrendAnalysis {
  dailyPoints: DailyLapsePoint[];
  currentPeriodLapses: number;
  previousPeriodLapses: number;
  percentChange: number;
  isSpike: boolean;
}

export interface FlashcardAnalyticsOverview {
  totalCards: number;
  activeCards: number;
  suspendedCards: number;
  archivedCards: number;
  dueToday: number;
  overdue: number;
  newCardsLearnedToday: number;
  dailyNewLimit: number;
  retention7d: number;
  retention30d: number;
  retentionAllTime: number;
  weakCardsCount: number;
}

export interface ActionableInsight {
  id: string;
  type: "review_due" | "weak_cards" | "overload_forecast" | "lapse_spike" | "all_good";
  title: string;
  description: string;
  ctaText?: string;
  ctaAction?: "launch_review" | "launch_weak" | "adjust_limit" | "take_break";
  severity: "info" | "warning" | "urgent" | "success";
}

/**
 * Helper to get YYYY-MM-DD in UTC
 */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Helper to format DD/MM
 */
function toDisplayDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

/**
 * 1. Calculates retention rate as:
 * Retention = (Reviews with rating >= 3 [Good/Easy]) / (Total reviews) * 100
 */
export function calculateRetentionRate(
  reviews: FlashcardReview[],
  timeframeDays?: number,
  now: Date = new Date(),
  topicId?: string
): number {
  let filtered = reviews;

  if (topicId) {
    filtered = filtered.filter((r) => r.topicId === topicId);
  }

  if (timeframeDays !== undefined && timeframeDays > 0) {
    const cutoff = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((r) => new Date(r.reviewedAt) >= cutoff);
  }

  if (filtered.length === 0) {
    return 100;
  }

  const remembered = filtered.filter((r) => r.rating === 3 || r.rating === 4).length;
  return Math.round((remembered / filtered.length) * 100);
}

/**
 * 2. Calculates workload forecast bucketed into days (7 or 30 days) based on dueAt
 */
export function calculateWorkloadForecast(
  cards: Flashcard[],
  days: number = 7,
  now: Date = new Date(),
  topicId?: string
): DailyWorkloadForecast[] {
  // Filter active cards only
  const activeCards = cards.filter((c) => {
    if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
    if (topicId && c.topicId !== topicId) return false;
    return true;
  });

  const buckets: DailyWorkloadForecast[] = [];
  const nowDayStr = toDateString(now);

  for (let i = 0; i < days; i++) {
    const bucketDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = toDateString(bucketDate);
    const dateFormatted = toDisplayDate(bucketDate);

    // Day 0 includes cards due today
    let count = 0;
    for (const card of activeCards) {
      if (!card.schedule?.dueAt) continue;
      const cardDateStr = toDateString(new Date(card.schedule.dueAt));

      if (i === 0) {
        if (cardDateStr === dateStr) {
          count++;
        }
      } else {
        if (cardDateStr === dateStr) {
          count++;
        }
      }
    }

    buckets.push({
      date: dateStr,
      dateFormatted,
      count,
      isToday: i === 0,
    });
  }

  return buckets;
}

/**
 * 3. Identifies weak cards: lapses >= 3 OR easeFactor <= 2.0
 */
export function getWeakCardsMetrics(
  cards: Flashcard[],
  topicId?: string
): WeakCardsMetrics {
  const activeCards = cards.filter((c) => {
    if (c.lifecycleStatus && c.lifecycleStatus !== "active") return false;
    if (topicId && c.topicId !== topicId) return false;
    return true;
  });

  const weakCards = activeCards.filter((c) => {
    const lapses = c.schedule?.lapses ?? 0;
    const easeFactor = c.schedule?.easeFactor ?? 2.5;
    return lapses >= 3 || easeFactor <= 2.0;
  });

  const percentage =
    activeCards.length === 0
      ? 0
      : Math.round((weakCards.length / activeCards.length) * 100);

  return {
    count: weakCards.length,
    weakCards,
    percentage,
  };
}

/**
 * 4. Calculates daily lapse trend (rating = 1 Again) over the timeframe
 */
export function calculateLapseTrend(
  reviews: FlashcardReview[],
  days: number = 7,
  now: Date = new Date(),
  topicId?: string
): LapseTrendAnalysis {
  let filtered = reviews;
  if (topicId) {
    filtered = filtered.filter((r) => r.topicId === topicId);
  }

  const currentWindowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

  // Daily points for the current window
  const dailyPoints: DailyLapsePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = toDateString(targetDate);
    const dateFormatted = toDisplayDate(targetDate);

    const lapses = filtered.filter((r) => {
      if (r.rating !== 1) return false;
      const rDateStr = toDateString(new Date(r.reviewedAt));
      return rDateStr === dateStr;
    }).length;

    dailyPoints.push({
      date: dateStr,
      dateFormatted,
      lapses,
    });
  }

  // Count lapses in current window
  const currentPeriodLapses = filtered.filter((r) => {
    if (r.rating !== 1) return false;
    const d = new Date(r.reviewedAt);
    return d >= currentWindowStart && d <= now;
  }).length;

  // Count lapses in previous window
  const previousPeriodLapses = filtered.filter((r) => {
    if (r.rating !== 1) return false;
    const d = new Date(r.reviewedAt);
    return d >= prevWindowStart && d < currentWindowStart;
  }).length;

  let percentChange = 0;
  if (previousPeriodLapses > 0) {
    percentChange = Math.round(
      ((currentPeriodLapses - previousPeriodLapses) / previousPeriodLapses) * 100
    );
  } else if (currentPeriodLapses > 0) {
    percentChange = 100;
  }

  const isSpike = percentChange >= 50 && currentPeriodLapses > previousPeriodLapses;

  return {
    dailyPoints,
    currentPeriodLapses,
    previousPeriodLapses,
    percentChange,
    isSpike,
  };
}

/**
 * 5. Calculates comprehensive overview metrics
 */
export function calculateOverviewMetrics(
  cards: Flashcard[],
  reviews: FlashcardReview[],
  dailyLimit: number,
  learnedToday: number,
  now: Date = new Date(),
  topicId?: string
): FlashcardAnalyticsOverview {
  let filteredCards = cards;
  if (topicId) {
    filteredCards = filteredCards.filter((c) => c.topicId === topicId);
  }

  const totalCards = filteredCards.length;
  let activeCards = 0;
  let suspendedCards = 0;
  let archivedCards = 0;
  let dueToday = 0;
  let overdue = 0;

  const todayDateStr = toDateString(now);

  for (const c of filteredCards) {
    const status = c.lifecycleStatus || "active";
    if (status === "suspended") {
      suspendedCards++;
      continue;
    }
    if (status === "archived") {
      archivedCards++;
      continue;
    }
    activeCards++;

    if (!c.schedule?.dueAt) continue;
    const cardDateStr = toDateString(new Date(c.schedule.dueAt));

    if (cardDateStr < todayDateStr) {
      overdue++;
    } else if (cardDateStr === todayDateStr) {
      dueToday++;
    }
  }

  const retention7d = calculateRetentionRate(reviews, 7, now, topicId);
  const retention30d = calculateRetentionRate(reviews, 30, now, topicId);
  const retentionAllTime = calculateRetentionRate(reviews, undefined, now, topicId);
  const weakMetrics = getWeakCardsMetrics(filteredCards, topicId);

  return {
    totalCards,
    activeCards,
    suspendedCards,
    archivedCards,
    dueToday,
    overdue,
    newCardsLearnedToday: learnedToday,
    dailyNewLimit: dailyLimit,
    retention7d,
    retention30d,
    retentionAllTime,
    weakCardsCount: weakMetrics.count,
  };
}

/**
 * 6. Generates Actionable Insights with direct CTAs
 */
export function generateActionableInsights(
  overview: FlashcardAnalyticsOverview,
  forecast: DailyWorkloadForecast[],
  lapseTrend: LapseTrendAnalysis
): ActionableInsight[] {
  const insights: ActionableInsight[] = [];

  // Insight 1: Due reviews needed
  if (overview.dueToday > 0 || overview.overdue > 0) {
    const totalDue = overview.dueToday + overview.overdue;
    insights.push({
      id: "review_due",
      type: "review_due",
      title: "Thẻ đến hạn cần ôn tập",
      description: `Bạn có ${totalDue} thẻ cần ôn (${overview.dueToday} thẻ hôm nay, ${overview.overdue} thẻ quá hạn).`,
      ctaText: "Ôn đến hạn ngay",
      ctaAction: "launch_review",
      severity: overview.overdue > 0 ? "urgent" : "info",
    });
  }

  // Insight 2: Weak cards present
  if (overview.weakCardsCount > 0) {
    insights.push({
      id: "weak_cards",
      type: "weak_cards",
      title: "Củng cố thẻ yếu",
      description: `Phát hiện ${overview.weakCardsCount} thẻ khó nhớ hoặc thường xuyên quên. Cần ôn tập chuyên sâu.`,
      ctaText: "Khắc phục thẻ yếu",
      ctaAction: "launch_weak",
      severity: "warning",
    });
  }

  // Insight 3: Overload forecast (> 40 cards/day average)
  if (forecast.length > 0) {
    const totalForecast = forecast.reduce((sum, f) => sum + f.count, 0);
    const avgForecast = totalForecast / forecast.length;
    if (avgForecast > 40) {
      insights.push({
        id: "overload_forecast",
        type: "overload_forecast",
        title: "Nguy cơ quá tải ôn tập",
        description: `Dự báo trung bình ${Math.round(avgForecast)} thẻ/ngày trong ${forecast.length} ngày tới. Khuyến nghị giảm lượng thẻ mới mỗi ngày.`,
        ctaText: "Giảm thẻ mới",
        ctaAction: "adjust_limit",
        severity: "warning",
      });
    }
  }

  // Insight 4: Lapse spike
  if (lapseTrend.isSpike) {
    insights.push({
      id: "lapse_spike",
      type: "lapse_spike",
      title: "Tỷ lệ quên tăng đột biến",
      description: `Số lần quên tăng ${lapseTrend.percentChange}% so với chu kỳ trước (${lapseTrend.currentPeriodLapses} lần). Hãy tạm nghỉ ngơi hoặc giãn tiến độ học.`,
      ctaText: "Nghỉ ngơi / Giảm tải",
      ctaAction: "take_break",
      severity: "warning",
    });
  }

  // Fallback: All good
  if (insights.length === 0) {
    insights.push({
      id: "all_good",
      type: "all_good",
      title: "Lộ trình học tập tuyệt vời",
      description: "Không có thẻ quá hạn hay thẻ yếu khẩn cấp. Bạn đang duy trì phong độ ghi nhớ rất tốt!",
      severity: "success",
    });
  }

  return insights;
}
