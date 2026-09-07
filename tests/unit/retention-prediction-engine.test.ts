import { describe, it, expect } from "vitest";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import {
  deriveCardStability,
  calculateResidualStandardDeviation,
  computeConfidenceIntervals,
  predictCardRetention,
  generateForgettingCurveForecast,
  calculateOptimalReviewDate,
  calibrateRetentionModel,
  batchPredictRetention,
} from "../../src/lib/retentionPredictionEngine";

describe("Retention Prediction Engine (Phase F7.1)", () => {
  const mockCard: Flashcard = {
    id: "card-1",
    topicId: "topic-1",
    type: "basic",
    front: "What is Anicca?",
    back: "Impermanence",
    createdAt: new Date("2026-09-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-09-01T00:00:00Z").toISOString(),
    schedule: {
      id: "sched-1",
      flashcardId: "card-1",
      state: "review",
      dueAt: new Date("2026-09-05T00:00:00Z").toISOString(),
      interval: 6,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      lastReviewedAt: new Date("2026-08-30T00:00:00Z").toISOString(),
      updatedAt: new Date("2026-08-30T00:00:00Z").toISOString(),
    },
  };

  const mockReviews: FlashcardReview[] = [
    {
      id: "rev-1",
      clientEventId: "evt-1",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 3,
      reviewDurationMs: 12000,
      reviewedAt: new Date("2026-08-20T08:00:00Z").toISOString(),
      stateBefore: "new",
      stateAfter: "learning",
      intervalBefore: 0,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBeforeAt: new Date("2026-08-20T08:00:00Z").toISOString(),
      dueAfterAt: new Date("2026-08-21T08:00:00Z").toISOString(),
    },
    {
      id: "rev-2",
      clientEventId: "evt-2",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 3,
      reviewDurationMs: 8000,
      reviewedAt: new Date("2026-08-23T08:00:00Z").toISOString(),
      stateBefore: "learning",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 3,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBeforeAt: new Date("2026-08-23T08:00:00Z").toISOString(),
      dueAfterAt: new Date("2026-08-26T08:00:00Z").toISOString(),
    },
    {
      id: "rev-3",
      clientEventId: "evt-3",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 4,
      reviewDurationMs: 6000,
      reviewedAt: new Date("2026-08-30T08:00:00Z").toISOString(),
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 3,
      intervalAfter: 7,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.6,
      dueBeforeAt: new Date("2026-08-30T08:00:00Z").toISOString(),
      dueAfterAt: new Date("2026-09-06T08:00:00Z").toISOString(),
    },
  ];

  describe("deriveCardStability", () => {
    it("returns initial stability (2.5) for newly created card with 0 reviews and no schedule", () => {
      const newCard: Flashcard = {
        ...mockCard,
        id: "card-new",
        schedule: undefined,
      };
      const result = deriveCardStability(newCard, []);
      expect(result.stability).toBe(2.5);
      expect(result.confidence).toBe("initial");
    });

    it("derives stability from schedule interval & ease when reviews are absent", () => {
      const scheduledCard: Flashcard = {
        ...mockCard,
        id: "card-sched-only",
        schedule: {
          ...mockCard.schedule!,
          interval: 10,
          easeFactor: 2.5,
        },
      };
      const result = deriveCardStability(scheduledCard, []);
      expect(result.stability).toBe(10);
      expect(result.confidence).toBe("low");
    });

    it("derives stability from reviews when >= 2 reviews exist", () => {
      const result = deriveCardStability(mockCard, mockReviews);
      expect(result.stability).toBeGreaterThan(0.5);
      expect(result.confidence).toBe("medium");
      expect(result.cardReviews.length).toBe(3);
    });

    it("respects customStability parameter", () => {
      const result = deriveCardStability(mockCard, mockReviews, 15.5);
      expect(result.stability).toBe(15.5);
      expect(result.confidence).toBe("medium");
    });
  });

  describe("calculateResidualStandardDeviation", () => {
    it("returns default 0.35 for empty review array", () => {
      const std = calculateResidualStandardDeviation([], 5.0);
      expect(std).toBe(0.35);
    });

    it("calculates positive bounded standard deviation from review samples", () => {
      const std = calculateResidualStandardDeviation(mockReviews, 5.0);
      expect(std).toBeGreaterThanOrEqual(0.1);
      expect(std).toBeLessThanOrEqual(0.6);
    });
  });

  describe("computeConfidenceIntervals", () => {
    it("handles boundary values 0 and 1 correctly", () => {
      const atZero = computeConfidenceIntervals(0.0, 0.3, 5);
      expect(atZero.ci80).toEqual([0.0, 0.0]);
      expect(atZero.ci95).toEqual([0.0, 0.0]);

      const atOne = computeConfidenceIntervals(1.0, 0.3, 5);
      expect(atOne.ci80).toEqual([1.0, 1.0]);
      expect(atOne.ci95).toEqual([1.0, 1.0]);
    });

    it("ensures 95% confidence interval is wider than 80% confidence interval", () => {
      const { ci80, ci95 } = computeConfidenceIntervals(0.75, 0.3, 5);
      const width80 = ci80[1] - ci80[0];
      const width95 = ci95[1] - ci95[0];

      expect(width95).toBeGreaterThan(width80);
      expect(ci95[0]).toBeLessThanOrEqual(ci80[0]);
      expect(ci95[1]).toBeGreaterThanOrEqual(ci80[1]);
    });
  });

  describe("predictCardRetention", () => {
    it("computes retention predictions across all target horizons (1d, 3d, 7d, 14d, 30d)", () => {
      const refDate = new Date("2026-09-01T08:00:00Z");
      const result = predictCardRetention(mockCard, mockReviews, 0, {
        referenceDate: refDate,
      });

      expect(result.cardId).toBe(mockCard.id);
      expect(result.stability).toBeGreaterThan(0);
      expect(result.decayRate).toBeCloseTo(1 / result.stability, 2);
      expect(result.horizons).toHaveLength(5);
      expect(result.horizons.map((h) => h.horizonDays)).toEqual([1, 3, 7, 14, 30]);

      // Monotonically decreasing retention over time
      for (let i = 1; i < result.horizons.length; i++) {
        expect(result.horizons[i].retentionProbability).toBeLessThanOrEqual(
          result.horizons[i - 1].retentionProbability
        );
      }
    });

    it("calculates optimal review days and date accurately", () => {
      const refDate = new Date("2026-09-01T08:00:00Z");
      const result = predictCardRetention(mockCard, mockReviews, 0, {
        targetRetention: 0.8,
        referenceDate: refDate,
      });

      expect(result.optimalReviewDays).toBeGreaterThanOrEqual(0);
      expect(result.optimalReviewDate).toBeDefined();
      expect(new Date(result.optimalReviewDate).getTime()).toBeGreaterThanOrEqual(
        refDate.getTime()
      );
    });

    it("adapts retention probability when daysAhead is provided", () => {
      const base = predictCardRetention(mockCard, mockReviews, 0);
      const inFuture = predictCardRetention(mockCard, mockReviews, 10);

      expect(inFuture.currentRetentionProbability).toBeLessThan(
        base.currentRetentionProbability
      );
    });
  });

  describe("generateForgettingCurveForecast", () => {
    it("generates continuous curve points from day 0 to maxDays", () => {
      const maxDays = 20;
      const points = generateForgettingCurveForecast(mockCard, mockReviews, maxDays);

      expect(points).toHaveLength(maxDays + 1);
      expect(points[0].day).toBe(0);
      expect(points[0].retentionRate).toBe(1.0);
      expect(points[maxDays].day).toBe(maxDays);

      // Check decay
      expect(points[maxDays].retentionRate).toBeLessThan(points[0].retentionRate);
      // Check confidence bands exist
      expect(points[5].ci80Lower).toBeLessThanOrEqual(points[5].retentionRate);
      expect(points[5].ci80Upper).toBeGreaterThanOrEqual(points[5].retentionRate);
    });
  });

  describe("calculateOptimalReviewDate", () => {
    it("returns optimal days and Date instance", () => {
      const result = calculateOptimalReviewDate(mockCard, mockReviews, 0.85);
      expect(typeof result.optimalDays).toBe("number");
      expect(result.optimalDate).toBeInstanceOf(Date);
    });
  });

  describe("calibrateRetentionModel", () => {
    it("returns neutral calibration for small review history (< 3 reviews)", () => {
      const cal = calibrateRetentionModel(mockReviews.slice(0, 2));
      expect(cal.calibrationFactor).toBe(1.0);
      expect(cal.meanAbsoluteError).toBe(0);
      expect(cal.rootMeanSquaredError).toBe(0);
    });

    it("calibrates decay rate and produces positive error metrics for historical data", () => {
      const cal = calibrateRetentionModel(mockReviews);
      expect(cal.originalDecayRate).toBeGreaterThan(0);
      expect(cal.calibratedDecayRate).toBeGreaterThan(0);
      expect(cal.calibrationFactor).toBeGreaterThan(0);
      expect(cal.sampleSize).toBe(2);
      expect(cal.meanAbsoluteError).toBeGreaterThanOrEqual(0);
      expect(cal.rootMeanSquaredError).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batchPredictRetention", () => {
    it("handles empty card list gracefully", () => {
      const summary = batchPredictRetention([], []);
      expect(summary.totalCards).toBe(0);
      expect(summary.predictions).toHaveLength(0);
      expect(summary.avgStability).toBe(0);
    });

    it("aggregates predictions and identifies cards needing review soon", () => {
      const card2: Flashcard = {
        ...mockCard,
        id: "card-2",
        schedule: {
          ...mockCard.schedule!,
          interval: 1,
          lastReviewedAt: new Date("2026-08-01T00:00:00Z").toISOString(), // Long ago -> low retention
        },
      };

      const summary = batchPredictRetention([mockCard, card2], mockReviews);
      expect(summary.totalCards).toBe(2);
      expect(summary.predictions).toHaveLength(2);
      expect(summary.avgStability).toBeGreaterThan(0);
      expect(summary.cardsNeedingReviewSoon).toBeGreaterThanOrEqual(1);
    });
  });
});
