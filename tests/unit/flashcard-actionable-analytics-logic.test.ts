import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import {
  calculateRetentionRate,
  calculateWorkloadForecast,
  getWeakCardsMetrics,
  calculateLapseTrend,
  calculateOverviewMetrics,
  generateActionableInsights,
} from "../../src/lib/flashcardAnalyticsLogic";

describe("Phase F6.8: Actionable Analytics Pure Logic Engine", () => {
  const FIXED_NOW = new Date("2026-09-06T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper factory for mock reviews
  function createMockReview(
    id: string,
    rating: 1 | 2 | 3 | 4,
    daysAgo: number,
    topicId = "topic-1"
  ): FlashcardReview {
    const reviewedAt = new Date(
      FIXED_NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000
    ).toISOString();
    return {
      id,
      clientEventId: `client-${id}`,
      flashcardId: `card-${id}`,
      topicId,
      rating,
      reviewDurationMs: 1500,
      reviewedAt,
      stateBefore: "learning",
      stateAfter: rating === 1 ? "relearning" : "review",
      intervalBefore: 1,
      intervalAfter: rating >= 3 ? 3 : 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: rating >= 3 ? 2.5 : 2.3,
      dueBeforeAt: reviewedAt,
      dueAfterAt: new Date(
        FIXED_NOW.getTime() + (rating >= 3 ? 3 : 1) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  // Helper factory for mock flashcards
  function createMockCard(
    id: string,
    opts: {
      topicId?: string;
      lifecycleStatus?: "active" | "suspended" | "archived";
      state?: "new" | "learning" | "review" | "relearning";
      dueDaysOffset?: number; // 0 = today, -1 = yesterday (overdue), 2 = 2 days future
      lapses?: number;
      easeFactor?: number;
    } = {}
  ): Flashcard {
    const dueAtDate =
      opts.dueDaysOffset !== undefined
        ? new Date(FIXED_NOW.getTime() + opts.dueDaysOffset * 24 * 60 * 60 * 1000)
        : FIXED_NOW;

    return {
      id,
      topicId: opts.topicId || "topic-1",
      type: "basic",
      front: `Front of ${id}`,
      back: `Back of ${id}`,
      lifecycleStatus: opts.lifecycleStatus || "active",
      schedule: {
        id: `sch-${id}`,
        flashcardId: id,
        state: opts.state || "review",
        dueAt: dueAtDate.toISOString(),
        interval: 1,
        easeFactor: opts.easeFactor !== undefined ? opts.easeFactor : 2.5,
        repetitions: 1,
        lapses: opts.lapses !== undefined ? opts.lapses : 0,
        lastReviewedAt: FIXED_NOW.toISOString(),
        updatedAt: FIXED_NOW.toISOString(),
      },
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    };
  }

  describe("1. calculateRetentionRate()", () => {
    it("returns 100% when there are no reviews", () => {
      expect(calculateRetentionRate([])).toBe(100);
    });

    it("calculates retention = (rating >= 3) / total * 100", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 1, 1), // Again (fail)
        createMockReview("r2", 2, 1), // Hard (fail for retention numerator)
        createMockReview("r3", 3, 2), // Good (success)
        createMockReview("r4", 4, 3), // Easy (success)
      ];
      // 2 remembered (ratings 3 and 4) out of 4 total reviews = 50%
      expect(calculateRetentionRate(reviews)).toBe(50);
    });

    it("filters correctly by timeframe (7 days, 30 days, all-time)", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 4, 2), // within 7d -> pass
        createMockReview("r2", 3, 5), // within 7d -> pass
        createMockReview("r3", 1, 15), // within 30d, but > 7d -> fail for 7d
        createMockReview("r4", 1, 40), // > 30d -> fail for 7d and 30d
      ];

      // 7-day: r1 (Easy) and r2 (Good) -> 2/2 = 100%
      expect(calculateRetentionRate(reviews, 7, FIXED_NOW)).toBe(100);

      // 30-day: r1 (Easy), r2 (Good), r3 (Again) -> 2/3 = 67%
      expect(calculateRetentionRate(reviews, 30, FIXED_NOW)).toBe(67);

      // all-time: r1, r2, r3, r4 -> 2/4 = 50%
      expect(calculateRetentionRate(reviews, undefined, FIXED_NOW)).toBe(50);
    });

    it("supports topic-scoped filtering when topicId is passed", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 4, 1, "topic-a"),
        createMockReview("r2", 1, 2, "topic-b"),
      ];
      expect(calculateRetentionRate(reviews, undefined, FIXED_NOW, "topic-a")).toBe(100);
      expect(calculateRetentionRate(reviews, undefined, FIXED_NOW, "topic-b")).toBe(0);
    });
  });

  describe("2. calculateWorkloadForecast()", () => {
    it("generates bucketed daily forecasts for 7 days", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { dueDaysOffset: 0 }), // Today (Day 0)
        createMockCard("c2", { dueDaysOffset: 0 }), // Today (Day 0)
        createMockCard("c3", { dueDaysOffset: 1 }), // Tomorrow (Day 1)
        createMockCard("c4", { dueDaysOffset: 3 }), // Day 3
        createMockCard("c5", { dueDaysOffset: 10 }), // Beyond 7 days
      ];

      const forecast = calculateWorkloadForecast(cards, 7, FIXED_NOW);
      expect(forecast).toHaveLength(7);
      expect(forecast[0].isToday).toBe(true);
      expect(forecast[0].count).toBe(2);
      expect(forecast[1].count).toBe(1);
      expect(forecast[2].count).toBe(0);
      expect(forecast[3].count).toBe(1);
      expect(forecast[4].count).toBe(0);
      expect(forecast[5].count).toBe(0);
      expect(forecast[6].count).toBe(0);
    });

    it("generates bucketed daily forecasts for 30 days", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { dueDaysOffset: 29 }),
        createMockCard("c2", { dueDaysOffset: 35 }), // Beyond 30 days
      ];

      const forecast = calculateWorkloadForecast(cards, 30, FIXED_NOW);
      expect(forecast).toHaveLength(30);
      expect(forecast[29].count).toBe(1);
    });

    it("ignores suspended and archived cards from the forecast", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { dueDaysOffset: 0, lifecycleStatus: "active" }),
        createMockCard("c2", { dueDaysOffset: 0, lifecycleStatus: "suspended" }),
        createMockCard("c3", { dueDaysOffset: 0, lifecycleStatus: "archived" }),
      ];

      const forecast = calculateWorkloadForecast(cards, 7, FIXED_NOW);
      expect(forecast[0].count).toBe(1);
    });

    it("scopes forecast by topicId if provided", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { dueDaysOffset: 1, topicId: "topic-a" }),
        createMockCard("c2", { dueDaysOffset: 1, topicId: "topic-b" }),
      ];

      const forecastA = calculateWorkloadForecast(cards, 7, FIXED_NOW, "topic-a");
      expect(forecastA[1].count).toBe(1);

      const forecastB = calculateWorkloadForecast(cards, 7, FIXED_NOW, "topic-b");
      expect(forecastB[1].count).toBe(1);
    });
  });

  describe("3. getWeakCardsMetrics()", () => {
    it("identifies cards with lapses >= 3 OR easeFactor <= 2.0 as weak", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { lapses: 3, easeFactor: 2.5 }), // Weak by lapses
        createMockCard("c2", { lapses: 0, easeFactor: 1.8 }), // Weak by easeFactor
        createMockCard("c3", { lapses: 4, easeFactor: 1.5 }), // Weak by both
        createMockCard("c4", { lapses: 1, easeFactor: 2.5 }), // Healthy
        createMockCard("c5", { lapses: 0, easeFactor: 2.8 }), // Healthy
      ];

      const metrics = getWeakCardsMetrics(cards);
      expect(metrics.count).toBe(3);
      expect(metrics.weakCards.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
      expect(metrics.percentage).toBe(60); // 3 out of 5 = 60%
    });

    it("excludes non-active cards from weak cards", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { lapses: 3, lifecycleStatus: "suspended" }),
        createMockCard("c2", { easeFactor: 1.8, lifecycleStatus: "archived" }),
        createMockCard("c3", { lapses: 3, lifecycleStatus: "active" }),
      ];

      const metrics = getWeakCardsMetrics(cards);
      expect(metrics.count).toBe(1);
      expect(metrics.weakCards[0].id).toBe("c3");
    });
  });

  describe("4. calculateLapseTrend()", () => {
    it("aggregates lapses (rating = 1) per day for the last 7 days", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 1, 0), // Today lapse
        createMockReview("r2", 1, 0), // Today lapse
        createMockReview("r3", 1, 1), // Yesterday lapse
        createMockReview("r4", 3, 1), // Good (not a lapse)
        createMockReview("r5", 1, 10), // 10 days ago (previous period)
      ];

      const analysis = calculateLapseTrend(reviews, 7, FIXED_NOW);
      expect(analysis.dailyPoints).toHaveLength(7);
      expect(analysis.currentPeriodLapses).toBe(3); // r1, r2, r3
      expect(analysis.previousPeriodLapses).toBe(1); // r5 in prev 7-14 day window
      expect(analysis.percentChange).toBe(200); // from 1 to 3 is +200%
      expect(analysis.isSpike).toBe(true); // > 50% increase
    });

    it("handles zero lapses without division by zero error", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 3, 1),
        createMockReview("r2", 4, 2),
      ];

      const analysis = calculateLapseTrend(reviews, 7, FIXED_NOW);
      expect(analysis.currentPeriodLapses).toBe(0);
      expect(analysis.previousPeriodLapses).toBe(0);
      expect(analysis.percentChange).toBe(0);
      expect(analysis.isSpike).toBe(false);
    });
  });

  describe("5. calculateOverviewMetrics()", () => {
    it("accurately calculates overview breakdown and retention rates", () => {
      const cards: Flashcard[] = [
        createMockCard("c1", { lifecycleStatus: "active", dueDaysOffset: 0 }), // due today
        createMockCard("c2", { lifecycleStatus: "active", dueDaysOffset: -2 }), // overdue
        createMockCard("c3", { lifecycleStatus: "active", dueDaysOffset: 5 }), // future
        createMockCard("c4", { lifecycleStatus: "suspended" }),
        createMockCard("c5", { lifecycleStatus: "archived" }),
      ];

      const reviews: FlashcardReview[] = [
        createMockReview("r1", 4, 1),
        createMockReview("r2", 3, 2),
      ];

      const overview = calculateOverviewMetrics(cards, reviews, 20, 5, FIXED_NOW);
      expect(overview.totalCards).toBe(5);
      expect(overview.activeCards).toBe(3);
      expect(overview.suspendedCards).toBe(1);
      expect(overview.archivedCards).toBe(1);
      expect(overview.dueToday).toBe(1);
      expect(overview.overdue).toBe(1);
      expect(overview.dailyNewLimit).toBe(20);
      expect(overview.newCardsLearnedToday).toBe(5);
      expect(overview.retention7d).toBe(100);
      expect(overview.retention30d).toBe(100);
      expect(overview.retentionAllTime).toBe(100);
    });
  });

  describe("6. generateActionableInsights()", () => {
    it("generates review_due CTA when dueToday > 0", () => {
      const overview = calculateOverviewMetrics(
        [createMockCard("c1", { dueDaysOffset: 0 })],
        [],
        20,
        0,
        FIXED_NOW
      );
      const forecast = calculateWorkloadForecast([createMockCard("c1", { dueDaysOffset: 0 })], 7, FIXED_NOW);
      const lapseTrend = calculateLapseTrend([], 7, FIXED_NOW);

      const insights = generateActionableInsights(overview, forecast, lapseTrend);
      const reviewCta = insights.find((i) => i.type === "review_due");
      expect(reviewCta).toBeDefined();
      expect(reviewCta?.ctaText).toBe("Ôn đến hạn ngay");
      expect(reviewCta?.ctaAction).toBe("launch_review");
    });

    it("generates weak_cards CTA when weakCardsCount > 0", () => {
      const card = createMockCard("c1", { lapses: 3 });
      const overview = calculateOverviewMetrics([card], [], 20, 0, FIXED_NOW);
      const forecast = calculateWorkloadForecast([card], 7, FIXED_NOW);
      const lapseTrend = calculateLapseTrend([], 7, FIXED_NOW);

      const insights = generateActionableInsights(overview, forecast, lapseTrend);
      const weakCta = insights.find((i) => i.type === "weak_cards");
      expect(weakCta).toBeDefined();
      expect(weakCta?.ctaText).toBe("Khắc phục thẻ yếu");
      expect(weakCta?.ctaAction).toBe("launch_weak");
    });

    it("generates overload_forecast CTA when average daily forecast > 40", () => {
      // 350 cards due in next 7 days = 50 cards/day average
      const cards: Flashcard[] = [];
      for (let i = 0; i < 350; i++) {
        cards.push(createMockCard(`c-${i}`, { dueDaysOffset: i % 7 }));
      }
      const overview = calculateOverviewMetrics(cards, [], 20, 0, FIXED_NOW);
      const forecast = calculateWorkloadForecast(cards, 7, FIXED_NOW);
      const lapseTrend = calculateLapseTrend([], 7, FIXED_NOW);

      const insights = generateActionableInsights(overview, forecast, lapseTrend);
      const overloadCta = insights.find((i) => i.type === "overload_forecast");
      expect(overloadCta).toBeDefined();
      expect(overloadCta?.ctaText).toBe("Giảm thẻ mới");
      expect(overloadCta?.ctaAction).toBe("adjust_limit");
    });

    it("generates lapse_spike Warning when lapse trend increases > 50%", () => {
      const reviews: FlashcardReview[] = [
        createMockReview("r1", 1, 1),
        createMockReview("r2", 1, 2),
        createMockReview("r3", 1, 3),
        createMockReview("r4", 1, 10), // Prev period had only 1 lapse
      ];
      const overview = calculateOverviewMetrics([], reviews, 20, 0, FIXED_NOW);
      const forecast = calculateWorkloadForecast([], 7, FIXED_NOW);
      const lapseTrend = calculateLapseTrend(reviews, 7, FIXED_NOW);

      const insights = generateActionableInsights(overview, forecast, lapseTrend);
      const lapseCta = insights.find((i) => i.type === "lapse_spike");
      expect(lapseCta).toBeDefined();
      expect(lapseCta?.ctaText).toBe("Nghỉ ngơi / Giảm tải");
      expect(lapseCta?.severity).toBe("warning");
    });
  });
});
