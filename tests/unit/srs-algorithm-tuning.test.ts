import { describe, it, expect } from "vitest";
import {
  calculateStabilityFromReviews,
  calculateEbbinghausCurve,
  aggregateEmpiricalRetention,
  inferCardDifficulty,
  calculateAdaptiveSchedule,
  calculateCardPriorityScore,
  getCardAlgorithmVariant,
  calculateVariantComparison,
} from "../../src/lib/srsAlgorithmTuning";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

function createMockReview(partial: Partial<FlashcardReview>): FlashcardReview {
  return {
    id: partial.id || "rev-1",
    clientEventId: partial.clientEventId || `evt-${Math.random()}`,
    flashcardId: partial.flashcardId || "card-1",
    topicId: partial.topicId || "topic-1",
    rating: partial.rating ?? 3,
    reviewDurationMs: partial.reviewDurationMs ?? 2000,
    reviewedAt: partial.reviewedAt || new Date().toISOString(),
    stateBefore: partial.stateBefore || "review",
    stateAfter: partial.stateAfter || "review",
    intervalBefore: partial.intervalBefore ?? 1,
    intervalAfter: partial.intervalAfter ?? 3,
    easeFactorBefore: partial.easeFactorBefore ?? 2.5,
    easeFactorAfter: partial.easeFactorAfter ?? 2.5,
    dueBeforeAt: partial.dueBeforeAt || new Date().toISOString(),
    dueAfterAt: partial.dueAfterAt || new Date().toISOString(),
  };
}

describe("SRS Algorithm Tuning & Adaptive Engine (Phase F6.12)", () => {
  describe("1. calculateStabilityFromReviews", () => {
    it("returns default stability 2.5 when reviews count is less than 3", () => {
      expect(calculateStabilityFromReviews([])).toBe(2.5);

      const fewReviews: FlashcardReview[] = [
        createMockReview({
          id: "r1",
          flashcardId: "card-1",
          rating: 3,
          intervalBefore: 1,
          intervalAfter: 2,
          reviewDurationMs: 3000,
          reviewedAt: "2026-09-01T10:00:00.000Z",
        }),
      ];
      expect(calculateStabilityFromReviews(fewReviews)).toBe(2.5);
    });

    it("estimates memory stability S from review history regression", () => {
      const reviews: FlashcardReview[] = [
        createMockReview({
          id: "r1",
          flashcardId: "c1",
          rating: 4,
          intervalBefore: 0,
          intervalAfter: 1,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.65,
          reviewDurationMs: 2000,
          reviewedAt: "2026-08-20T10:00:00.000Z",
        }),
        createMockReview({
          id: "r2",
          flashcardId: "c1",
          rating: 3,
          intervalBefore: 1,
          intervalAfter: 3,
          easeFactorBefore: 2.65,
          easeFactorAfter: 2.65,
          reviewDurationMs: 2200,
          reviewedAt: "2026-08-22T10:00:00.000Z",
        }),
        createMockReview({
          id: "r3",
          flashcardId: "c1",
          rating: 3,
          intervalBefore: 3,
          intervalAfter: 7,
          easeFactorBefore: 2.65,
          easeFactorAfter: 2.65,
          reviewDurationMs: 2500,
          reviewedAt: "2026-08-27T10:00:00.000Z",
        }),
        createMockReview({
          id: "r4",
          flashcardId: "c1",
          rating: 1,
          intervalBefore: 7,
          intervalAfter: 1,
          easeFactorBefore: 2.65,
          easeFactorAfter: 2.45,
          reviewDurationMs: 8000,
          reviewedAt: "2026-09-06T10:00:00.000Z",
        }),
      ];

      const s = calculateStabilityFromReviews(reviews);
      expect(s).toBeGreaterThan(0.5);
      expect(s).toBeLessThanOrEqual(365.0);
    });
  });

  describe("2. calculateEbbinghausCurve", () => {
    it("generates theoretical Ebbinghaus curve points starting at 1.0", () => {
      const curve = calculateEbbinghausCurve(5.0, 10);
      expect(curve).toHaveLength(11);
      expect(curve[0].day).toBe(0);
      expect(curve[0].retentionRate).toBe(1.0);
      expect(curve[10].day).toBe(10);
      // R(t) strictly decreases
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].retentionRate).toBeLessThan(curve[i - 1].retentionRate);
      }
    });
  });

  describe("3. aggregateEmpiricalRetention", () => {
    it("aggregates observed recall rate across day intervals", () => {
      const reviews: FlashcardReview[] = [
        createMockReview({
          id: "r1",
          flashcardId: "c1",
          rating: 3,
          intervalBefore: 2,
          intervalAfter: 6,
          reviewDurationMs: 3000,
          reviewedAt: "2026-09-01T10:00:00.000Z",
        }),
        createMockReview({
          id: "r2",
          flashcardId: "c2",
          rating: 4,
          intervalBefore: 2,
          intervalAfter: 8,
          reviewDurationMs: 1500,
          reviewedAt: "2026-09-01T11:00:00.000Z",
        }),
        createMockReview({
          id: "r3",
          flashcardId: "c3",
          rating: 1,
          intervalBefore: 2,
          intervalAfter: 1,
          reviewDurationMs: 7000,
          reviewedAt: "2026-09-01T12:00:00.000Z",
        }),
      ];

      const empirical = aggregateEmpiricalRetention(reviews);
      expect(empirical.length).toBeGreaterThan(0);
      const day2 = empirical.find((p) => p.day === 2);
      expect(day2).toBeDefined();
      expect(day2?.count).toBe(3);
      expect(day2?.rememberedCount).toBe(2);
      expect(day2?.retentionRate).toBeCloseTo(0.6667, 3);
    });
  });

  describe("4. inferCardDifficulty", () => {
    it("classifies cards into easy, medium, or hard based on metrics and latency", () => {
      const easyCard: Flashcard = {
        id: "easy-card",
        topicId: "topic-1",
        front: "Front",
        back: "Back",
        type: "basic",
        schedule: {
          id: "s1",
          flashcardId: "easy-card",
          state: "review",
          dueAt: "2026-09-10T00:00:00.000Z",
          interval: 15,
          easeFactor: 3.2,
          repetitions: 5,
          lapses: 0,
          retentionRate: 0.95,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      const hardCard: Flashcard = {
        id: "hard-card",
        topicId: "topic-1",
        front: "Hard Front",
        back: "Hard Back",
        type: "basic",
        schedule: {
          id: "s2",
          flashcardId: "hard-card",
          state: "relearning",
          dueAt: "2026-09-01T00:00:00.000Z",
          interval: 1,
          easeFactor: 1.4,
          repetitions: 1,
          lapses: 4,
          retentionRate: 0.4,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      const easyDiff = inferCardDifficulty(easyCard);
      expect(easyDiff.difficulty).toBe("easy");
      expect(easyDiff.score).toBeLessThanOrEqual(3.5);

      const hardDiff = inferCardDifficulty(hardCard);
      expect(hardDiff.difficulty).toBe("hard");
      expect(hardDiff.score).toBeGreaterThan(6.5);
    });
  });

  describe("5. calculateAdaptiveSchedule", () => {
    const baseCard: Flashcard = {
      id: "test-card",
      topicId: "topic-1",
      front: "Question",
      back: "Answer",
      type: "basic",
      schedule: {
        id: "s-base",
        flashcardId: "test-card",
        state: "review",
        dueAt: "2026-09-01T00:00:00.000Z",
        interval: 6,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    it("handles Again (1) rating with lapse penalty and relearning reset", () => {
      const nextSchedule = calculateAdaptiveSchedule({
        card: baseCard,
        rating: 1,
        reviewDurationMs: 4000,
        reviewedAt: new Date("2026-09-07T10:00:00.000Z"),
      });

      expect(nextSchedule.state).toBe("relearning");
      expect(nextSchedule.interval).toBe(1);
      expect(nextSchedule.repetitions).toBe(0);
      expect(nextSchedule.lapses).toBe(1);
      expect(nextSchedule.easeFactor).toBeLessThan(2.5);
    });

    it("rewards fast recall (<2.5s) on Easy (4) with adaptive ease bonus", () => {
      const nextSchedule = calculateAdaptiveSchedule({
        card: baseCard,
        rating: 4,
        reviewDurationMs: 1800,
        reviewedAt: new Date("2026-09-07T10:00:00.000Z"),
      });

      expect(nextSchedule.easeFactor).toBeGreaterThan(2.5);
      expect(nextSchedule.interval).toBeGreaterThan(6);
    });
  });

  describe("6. calculateCardPriorityScore", () => {
    it("boosts priority score for overdue cards and near exam date", () => {
      const overdueCard: Flashcard = {
        id: "overdue-card",
        topicId: "topic-1",
        front: "Overdue",
        back: "Card",
        type: "basic",
        schedule: {
          id: "s-ov",
          flashcardId: "overdue-card",
          state: "review",
          dueAt: "2026-09-01T00:00:00.000Z", // 6 days ago relative to 2026-09-07
          interval: 5,
          easeFactor: 2.2,
          repetitions: 3,
          lapses: 2,
          retentionRate: 0.6,
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      };

      const now = new Date("2026-09-07T10:00:00.000Z");
      const baseScore = calculateCardPriorityScore(overdueCard, { now });
      expect(baseScore).toBeGreaterThan(10);

      // Exam in 3 days compresses review urgency
      const examScore = calculateCardPriorityScore(overdueCard, {
        now,
        examDate: "2026-09-10T00:00:00.000Z",
      });
      expect(examScore).toBeGreaterThan(baseScore);
    });
  });

  describe("7. getCardAlgorithmVariant", () => {
    it("assigns deterministic variants A or B via FNV-1a hash", () => {
      const v1 = getCardAlgorithmVariant("card-1001");
      const v2 = getCardAlgorithmVariant("card-1001");
      expect(v1).toBe(v2); // Strictly deterministic
      expect(["A", "B"]).toContain(v1);

      // Distribution across multiple cards
      const variants = ["card-1", "card-2", "card-3", "card-4", "card-5"].map(
        getCardAlgorithmVariant
      );
      expect(variants.includes("A") || variants.includes("B")).toBe(true);
    });
  });

  describe("8. calculateVariantComparison", () => {
    it("computes two-proportion comparison and z-test significance", () => {
      const reviews: FlashcardReview[] = [];

      // Generate 20 reviews for Variant A cards and 20 for Variant B cards
      for (let i = 0; i < 40; i++) {
        const cardId = `test-card-${i}`;
        const variant = getCardAlgorithmVariant(cardId);
        // Make Variant B have higher success rate to test difference
        const rating = variant === "B" ? 4 : i % 2 === 0 ? 3 : 1;
        reviews.push(
          createMockReview({
            id: `rev-${i}`,
            flashcardId: cardId,
            rating: rating as 1 | 3 | 4,
            intervalBefore: 2,
            intervalAfter: 5,
            reviewDurationMs: 2500,
            reviewedAt: new Date(2026, 8, 1 + (i % 5)).toISOString(),
          })
        );
      }

      const comparison = calculateVariantComparison(reviews);
      expect(comparison.variantA.totalReviews).toBeGreaterThan(0);
      expect(comparison.variantB.totalReviews).toBeGreaterThan(0);
      expect(typeof comparison.effectSize).toBe("number");
      expect(typeof comparison.pValue).toBe("number");
      expect(comparison.pValue).toBeGreaterThanOrEqual(0);
      expect(comparison.pValue).toBeLessThanOrEqual(1);
    });
  });
});
