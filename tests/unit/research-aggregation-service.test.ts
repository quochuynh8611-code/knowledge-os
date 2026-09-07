/**
 * Unit Tests: Research Aggregation Service (Phase F7.0 Task 1)
 */

import { describe, it, expect } from "vitest";
import {
  aggregateTopicAssets,
  calculateTopicStats,
  calculateTopicRetentionTrend,
  getRecentTopicActivities,
} from "../../src/lib/researchAggregationService";
import type { Note, Resource } from "../../src/types";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("Research Aggregation Service (Phase F7.0 Task 1)", () => {
  const mockNotes: Note[] = [
    {
      id: "note-1",
      topicId: "topic-1",
      title: "Ghi chú quán thân",
      content: "Nội dung quán thân chi tiết",
      type: "study",
      isPrivate: false,
      tags: ["phat-hoc"],
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-02T10:00:00.000Z",
    },
    {
      id: "note-2",
      topicId: "topic-2", // Different topic
      title: "Ghi chú chủ đề khác",
      content: "Nội dung",
      type: "insight",
      isPrivate: false,
      tags: [],
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
    },
  ];

  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Thân quán niệm xứ?",
      back: "Quán hơi thở",
      type: "basic",
      lifecycleStatus: "active",
      schedule: {
        id: "s1",
        flashcardId: "card-1",
        state: "review",
        dueAt: "2026-09-05T00:00:00.000Z", // Due before 2026-09-07
        interval: 3,
        easeFactor: 2.6,
        repetitions: 2,
        lapses: 0,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "card-2",
      topicId: "topic-1",
      front: "Tâm quán niệm xứ?",
      back: "Nhận biết tâm",
      type: "basic",
      lifecycleStatus: "suspended",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  const mockResources: Resource[] = [
    {
      id: "res-1",
      topicId: "topic-1",
      title: "Kinh Đại Niệm Xứ PDF",
      type: "pdf",
      filePath: "/vault/kinh-dai-niem-xu.pdf",
      createdAt: "2026-09-01T08:00:00.000Z",
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "rev-1",
      clientEventId: "evt-1",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 3, // Remembered
      reviewDurationMs: 3000,
      reviewedAt: "2026-09-06T10:00:00.000Z",
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 3,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBeforeAt: "2026-09-05T00:00:00.000Z",
      dueAfterAt: "2026-09-08T00:00:00.000Z",
    },
    {
      id: "rev-2",
      clientEventId: "evt-2",
      flashcardId: "card-1",
      topicId: "topic-1",
      rating: 4, // Remembered
      reviewDurationMs: 1800,
      reviewedAt: "2026-09-07T09:00:00.000Z",
      stateBefore: "review",
      stateAfter: "review",
      intervalBefore: 3,
      intervalAfter: 7,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.65,
      dueBeforeAt: "2026-09-07T00:00:00.000Z",
      dueAfterAt: "2026-09-14T00:00:00.000Z",
    },
  ];

  describe("1. aggregateTopicAssets", () => {
    it("aggregates notes, cards, and resources accurately for a topic", () => {
      const fixedNow = new Date("2026-09-07T12:00:00.000Z");
      const agg = aggregateTopicAssets("topic-1", {
        notes: mockNotes,
        flashcards: mockCards,
        resources: mockResources,
        now: fixedNow,
      });

      expect(agg.topicId).toBe("topic-1");
      expect(agg.notesCount).toBe(1);
      expect(agg.flashcardsCount).toBe(2);
      expect(agg.resourcesCount).toBe(1);
      expect(agg.activeCardsCount).toBe(1);
      expect(agg.suspendedCardsCount).toBe(1);
      expect(agg.cardsDueCount).toBe(1); // card-1 was due on 2026-09-05
    });

    it("handles empty topic gracefully without error", () => {
      const agg = aggregateTopicAssets("topic-empty", {});
      expect(agg.notesCount).toBe(0);
      expect(agg.flashcardsCount).toBe(0);
      expect(agg.resourcesCount).toBe(0);
      expect(agg.cardsDueCount).toBe(0);
    });
  });

  describe("2. calculateTopicStats", () => {
    it("computes retention rate, streak days, and time spent", () => {
      const fixedNow = new Date("2026-09-07T12:00:00.000Z");
      const stats = calculateTopicStats("topic-1", {
        reviews: mockReviews,
        flashcards: mockCards,
        now: fixedNow,
      });

      expect(stats.totalReviews).toBe(2);
      expect(stats.retentionRate).toBe(100); // 2 remembered out of 2
      expect(stats.streakDays).toBeGreaterThanOrEqual(1);
      expect(stats.averageEaseFactor).toBe(2.6);
      expect(stats.stabilityDays).toBeGreaterThan(0);
    });
  });

  describe("3. calculateTopicRetentionTrend", () => {
    it("groups daily retention points for SVG chart", () => {
      const fixedNow = new Date("2026-09-07T12:00:00.000Z");
      const trend = calculateTopicRetentionTrend(mockReviews, "30d", fixedNow);

      expect(trend.length).toBe(2);
      expect(trend[0].date).toBe("2026-09-06");
      expect(trend[0].reviewCount).toBe(1);
      expect(trend[0].retentionRate).toBe(100);
      expect(trend[1].date).toBe("2026-09-07");
    });
  });

  describe("4. getRecentTopicActivities", () => {
    it("returns combined chronological activities up to the limit", () => {
      const activities = getRecentTopicActivities(
        "topic-1",
        {
          notes: mockNotes,
          flashcards: mockCards,
          resources: mockResources,
          reviews: mockReviews,
        },
        5
      );

      expect(activities.length).toBeGreaterThan(0);
      expect(activities.length).toBeLessThanOrEqual(5);

      // Verify descending sort by timestamp
      for (let i = 1; i < activities.length; i++) {
        const prevTime = new Date(activities[i - 1].timestamp).getTime();
        const currTime = new Date(activities[i].timestamp).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });
  });
});
