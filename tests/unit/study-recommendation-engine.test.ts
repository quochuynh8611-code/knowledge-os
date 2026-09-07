import { describe, it, expect } from "vitest";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import type { Topic } from "../../src/types/index";
import {
  getTargetCardCapacity,
  calculateTopicUtilityScore,
  rankTopicsForStudy,
  filterRecommendationsByTime,
  getStudyRecommendations,
} from "../../src/lib/studyRecommendationEngine";

describe("Study Recommendation Engine (Phase F7.1)", () => {
  const mockTopics: Topic[] = [
    {
      id: "top-1",
      title: "Thiền Tứ Niệm Xứ",
      slug: "thien-tu-niem-xu",
      categoryId: "cat-buddhist",
      type: "study",
      description: "Tứ niệm xứ",
      content: "",
      tags: ["buddhism", "mindfulness"],
      links: [],
      studyProgress: {
        topicId: "top-1",
        status: "in_progress",
        progress: 50,
        interval: 3,
        easeFactor: 2.5,
        repetitions: 2,
        totalNotes: 5,
        timeSpent: 60,
        lastStudied: new Date().toISOString(),
      },
      createdAt: new Date("2026-08-01").toISOString(),
      updatedAt: new Date("2026-08-01").toISOString(),
    },
    {
      id: "top-2",
      title: "Bát Chánh Đạo",
      slug: "bat-chanh-dao",
      categoryId: "cat-buddhist",
      type: "study",
      description: "Con đường tám nhánh",
      content: "",
      tags: ["buddhism"],
      links: [],
      studyProgress: {
        topicId: "top-2",
        status: "completed",
        progress: 100,
        interval: 10,
        easeFactor: 2.5,
        repetitions: 5,
        totalNotes: 8,
        timeSpent: 120,
        lastStudied: new Date().toISOString(),
      },
      createdAt: new Date("2026-08-01").toISOString(),
      updatedAt: new Date("2026-08-01").toISOString(),
    },
  ];

  const now = new Date("2026-09-07T12:00:00Z");

  // Topic 1 cards: overdue and low retention
  const mockCards: Flashcard[] = [
    {
      id: "c1",
      topicId: "top-1",
      type: "basic",
      front: "F1",
      back: "B1",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      schedule: {
        id: "s1",
        flashcardId: "c1",
        state: "review",
        dueAt: "2026-09-05T00:00:00Z", // Past due
        interval: 3,
        easeFactor: 2.2,
        repetitions: 1,
        lapses: 2,
        updatedAt: "2026-08-25T00:00:00Z",
      },
    },
    {
      id: "c2",
      topicId: "top-1",
      type: "basic",
      front: "F2",
      back: "B2",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      schedule: {
        id: "s2",
        flashcardId: "c2",
        state: "relearning", // Lapsed card
        dueAt: "2026-09-07T10:00:00Z",
        interval: 1,
        easeFactor: 1.8,
        repetitions: 0,
        lapses: 3,
        updatedAt: "2026-09-06T00:00:00Z",
      },
    },
    // Topic 2 cards: not due yet
    {
      id: "c3",
      topicId: "top-2",
      type: "basic",
      front: "F3",
      back: "B3",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
      schedule: {
        id: "s3",
        flashcardId: "c3",
        state: "review",
        dueAt: "2026-09-15T00:00:00Z", // Future due
        interval: 14,
        easeFactor: 2.5,
        repetitions: 4,
        lapses: 0,
        updatedAt: "2026-09-01T00:00:00Z",
      },
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "r1",
      clientEventId: "e1",
      flashcardId: "c1",
      topicId: "top-1",
      rating: 1, // Again -> low retention
      reviewDurationMs: 4000,
      reviewedAt: "2026-09-01T00:00:00Z",
      stateBefore: "review",
      stateAfter: "relearning",
      intervalBefore: 3,
      intervalAfter: 1,
      easeFactorBefore: 2.2,
      easeFactorAfter: 2.0,
      dueBeforeAt: "2026-09-01T00:00:00Z",
      dueAfterAt: "2026-09-02T00:00:00Z",
    },
    {
      id: "r2",
      clientEventId: "e2",
      flashcardId: "c3",
      topicId: "top-2",
      rating: 4, // Easy -> high retention
      reviewDurationMs: 3000,
      reviewedAt: "2026-09-01T00:00:00Z",
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 7,
      intervalAfter: 14,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.6,
      dueBeforeAt: "2026-09-01T00:00:00Z",
      dueAfterAt: "2026-09-15T00:00:00Z",
    },
  ];

  describe("getTargetCardCapacity", () => {
    it("computes accurate target capacity for 15, 30, and 60 minutes", () => {
      expect(getTargetCardCapacity(15, 30)).toBe(30);
      expect(getTargetCardCapacity(30, 30)).toBe(60);
      expect(getTargetCardCapacity(60, 30)).toBe(120);
    });
  });

  describe("calculateTopicUtilityScore", () => {
    it("awards higher composite score to topics with urgent due cards and weak retention", () => {
      const top1Result = calculateTopicUtilityScore(mockTopics[0], mockCards, mockReviews, {
        referenceDate: now,
      });
      const top2Result = calculateTopicUtilityScore(mockTopics[1], mockCards, mockReviews, {
        referenceDate: now,
      });

      expect(top1Result.metrics.dueCardsCount).toBe(2);
      expect(top2Result.metrics.dueCardsCount).toBe(0);
      expect(top1Result.metrics.retentionRate).toBeLessThan(0.8);
      expect(top1Result.score).toBeGreaterThan(top2Result.score);
    });

    it("generates an explainable human-readable rationale", () => {
      const result = calculateTopicUtilityScore(mockTopics[0], mockCards, mockReviews, {
        referenceDate: now,
        timeBudgetMinutes: 15,
      });

      expect(result.explanation).toContain("Có 2 thẻ đến hạn ôn");
      expect(result.explanation).toContain("dưới chuẩn 80%");
      expect(result.explanation).toContain("khớp phiên 15m");
    });

    it("applies anti-fatigue 0.8x recency penalty for lastCompletedTopicId", () => {
      const normalScore = calculateTopicUtilityScore(mockTopics[0], mockCards, mockReviews, {
        referenceDate: now,
      }).score;

      const penalizedScore = calculateTopicUtilityScore(mockTopics[0], mockCards, mockReviews, {
        referenceDate: now,
        lastCompletedTopicId: "top-1",
      }).score;

      expect(penalizedScore).toBeCloseTo(normalScore * 0.8, 1);
    });

    it("increases priority when approaching exam target date", () => {
      const withoutExam = calculateTopicUtilityScore(mockTopics[1], mockCards, mockReviews, {
        referenceDate: now,
      }).score;

      const withNearExam = calculateTopicUtilityScore(mockTopics[1], mockCards, mockReviews, {
        referenceDate: now,
        examTargetDates: { "top-2": "2026-09-08T00:00:00Z" }, // 1 day away
      }).score;

      expect(withNearExam).toBeGreaterThan(withoutExam);
    });
  });

  describe("rankTopicsForStudy", () => {
    it("ranks urgent topic as rank 1 with isNextBestTopic flag", () => {
      const ranked = rankTopicsForStudy(mockTopics, mockCards, mockReviews, {
        referenceDate: now,
      });

      expect(ranked).toHaveLength(2);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[0].isNextBestTopic).toBe(true);
      expect(ranked[0].topicId).toBe("top-1");
      expect(ranked[1].rank).toBe(2);
      expect(ranked[1].isNextBestTopic).toBe(false);
      expect(ranked[1].topicId).toBe("top-2");
    });

    it("handles empty topics array gracefully", () => {
      const ranked = rankTopicsForStudy([], mockCards, mockReviews);
      expect(ranked).toEqual([]);
    });
  });

  describe("filterRecommendationsByTime", () => {
    it("adjusts suggested card batch size according to time budget", () => {
      const ranked = rankTopicsForStudy(mockTopics, mockCards, mockReviews, {
        referenceDate: now,
      });

      const filtered15 = filterRecommendationsByTime(ranked, 15);
      const filtered60 = filterRecommendationsByTime(ranked, 60);

      expect(filtered15[0].suggestedCardBatchSize).toBeLessThanOrEqual(30);
      expect(filtered60[0].suggestedCardBatchSize).toBeDefined();
    });
  });

  describe("getStudyRecommendations", () => {
    it("returns complete structured recommendation result with aggregated due count", () => {
      const result = getStudyRecommendations(mockTopics, mockCards, mockReviews, {
        referenceDate: now,
        timeBudgetMinutes: 30,
      });

      expect(result.timeBudgetMinutes).toBe(30);
      expect(result.recommendedTopics).toHaveLength(2);
      expect(result.topRecommendation).not.toBeNull();
      expect(result.topRecommendation?.topicId).toBe("top-1");
      expect(result.totalDueCardsAcrossTopics).toBe(2);
    });
  });
});
