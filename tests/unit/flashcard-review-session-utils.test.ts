/**
 * Unit Tests: Flashcard Review Session Utilities (Phase F6.11)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateStreakDays,
  isLowRetention,
  calculateCardRetentionRate,
  generateReviewSessionCSV,
  downloadCSV,
  formatLocalDateKey,
} from "../../src/lib/flashcardReviewSessionUtils";
import type {
  Flashcard,
  FlashcardReview,
  FlashcardWithSchedule,
} from "../../src/types/flashcard";

describe("flashcardReviewSessionUtils", () => {
  describe("formatLocalDateKey", () => {
    it("formats dates as YYYY-MM-DD", () => {
      const d = new Date(2026, 8, 7); // Sept 7, 2026
      expect(formatLocalDateKey(d)).toBe("2026-09-07");
    });
  });

  describe("calculateStreakDays", () => {
    const fixedNow = new Date(2026, 8, 7, 12, 0, 0); // Sept 7, 2026 noon

    it("returns 0 for empty or invalid reviews", () => {
      expect(calculateStreakDays([], fixedNow)).toBe(0);
      expect(calculateStreakDays([{ reviewedAt: "invalid-date" }], fixedNow)).toBe(0);
    });

    it("returns 1 when user reviewed today only", () => {
      const reviews = [{ reviewedAt: new Date(2026, 8, 7, 9, 0, 0) }];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(1);
    });

    it("returns 1 when user reviewed yesterday only (streak not broken yet today)", () => {
      const reviews = [{ reviewedAt: new Date(2026, 8, 6, 18, 0, 0) }];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(1);
    });

    it("returns consecutive days when user reviewed today, yesterday, and 2 days ago", () => {
      const reviews = [
        { reviewedAt: new Date(2026, 8, 7, 8, 0, 0) },
        { reviewedAt: new Date(2026, 8, 6, 10, 0, 0) },
        { reviewedAt: new Date(2026, 8, 5, 20, 0, 0) },
      ];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(3);
    });

    it("returns consecutive days when user reviewed yesterday and 2 days ago (no review today yet)", () => {
      const reviews = [
        { reviewedAt: new Date(2026, 8, 6, 10, 0, 0) },
        { reviewedAt: new Date(2026, 8, 5, 20, 0, 0) },
      ];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(2);
    });

    it("handles multiple reviews on the same day without overcounting", () => {
      const reviews = [
        { reviewedAt: new Date(2026, 8, 7, 8, 0, 0) },
        { reviewedAt: new Date(2026, 8, 7, 11, 0, 0) },
        { reviewedAt: new Date(2026, 8, 6, 14, 0, 0) },
      ];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(2);
    });

    it("returns 0 when last review was 2 or more days ago (gap broke the streak)", () => {
      const reviews = [
        { reviewedAt: new Date(2026, 8, 5, 10, 0, 0) }, // 2 days ago
        { reviewedAt: new Date(2026, 8, 4, 10, 0, 0) }, // 3 days ago
      ];
      expect(calculateStreakDays(reviews, fixedNow)).toBe(0);
    });
  });

  describe("isLowRetention", () => {
    const baseCard: FlashcardWithSchedule = {
      id: "card-1",
      topicId: "topic-1",
      type: "basic",
      front: "Front",
      back: "Back",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-1",
        flashcardId: "card-1",
        state: "review",
        dueAt: new Date().toISOString(),
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    };

    it("returns false for a healthy card with no lapses and high ease", () => {
      expect(isLowRetention(baseCard)).toBe(false);
    });

    it("returns true when lapses >= 2 (score += 0.4 >= 0.4)", () => {
      const card: FlashcardWithSchedule = {
        ...baseCard,
        schedule: { ...baseCard.schedule, lapses: 2, easeFactor: 2.5 },
      };
      expect(isLowRetention(card)).toBe(true);
    });

    it("returns false when easeFactor <= 2.0 alone (score = 0.3 < 0.4)", () => {
      const card: FlashcardWithSchedule = {
        ...baseCard,
        schedule: { ...baseCard.schedule, lapses: 0, easeFactor: 1.8 },
      };
      expect(isLowRetention(card)).toBe(false);
    });

    it("returns true when easeFactor <= 2.0 AND retentionRate < 0.6 (score = 0.3 + 0.3 = 0.6 >= 0.4)", () => {
      const card: FlashcardWithSchedule = {
        ...baseCard,
        schedule: {
          ...baseCard.schedule,
          lapses: 0,
          easeFactor: 1.9,
          retentionRate: 0.5,
        },
      };
      expect(isLowRetention(card)).toBe(true);
    });

    it("returns false if card has no schedule", () => {
      const cardWithoutSchedule: Flashcard = {
        id: "card-2",
        topicId: "topic-1",
        type: "basic",
        front: "Front",
        back: "Back",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(isLowRetention(cardWithoutSchedule)).toBe(false);
    });
  });

  describe("calculateCardRetentionRate", () => {
    it("returns 1.0 for cards without review history", () => {
      expect(calculateCardRetentionRate([])).toBe(1.0);
    });

    it("calculates ratio correctly based on rating >= 3", () => {
      const mockReviews: FlashcardReview[] = [
        {
          id: "r1",
          clientEventId: "e1",
          flashcardId: "c1",
          topicId: "t1",
          rating: 3, // remembered
          reviewDurationMs: 1000,
          reviewedAt: new Date().toISOString(),
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 1,
          intervalAfter: 3,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.5,
          dueBeforeAt: new Date().toISOString(),
          dueAfterAt: new Date().toISOString(),
        },
        {
          id: "r2",
          clientEventId: "e2",
          flashcardId: "c1",
          topicId: "t1",
          rating: 4, // remembered
          reviewDurationMs: 1000,
          reviewedAt: new Date().toISOString(),
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 3,
          intervalAfter: 7,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.6,
          dueBeforeAt: new Date().toISOString(),
          dueAfterAt: new Date().toISOString(),
        },
        {
          id: "r3",
          clientEventId: "e3",
          flashcardId: "c1",
          topicId: "t1",
          rating: 1, // failed
          reviewDurationMs: 1000,
          reviewedAt: new Date().toISOString(),
          stateBefore: "review",
          stateAfter: "relearning",
          intervalBefore: 7,
          intervalAfter: 1,
          easeFactorBefore: 2.6,
          easeFactorAfter: 2.4,
          dueBeforeAt: new Date().toISOString(),
          dueAfterAt: new Date().toISOString(),
        },
        {
          id: "r4",
          clientEventId: "e4",
          flashcardId: "c1",
          topicId: "t1",
          rating: 2, // hard (not >= 3)
          reviewDurationMs: 1000,
          reviewedAt: new Date().toISOString(),
          stateBefore: "relearning",
          stateAfter: "learning",
          intervalBefore: 1,
          intervalAfter: 1,
          easeFactorBefore: 2.4,
          easeFactorAfter: 2.25,
          dueBeforeAt: new Date().toISOString(),
          dueAfterAt: new Date().toISOString(),
        },
      ];

      // 2 out of 4 remembered = 0.5
      expect(calculateCardRetentionRate(mockReviews)).toBe(0.5);
    });
  });

  describe("generateReviewSessionCSV", () => {
    it("generates formatted CSV with UTF-8 BOM and correct headers", () => {
      const card: Flashcard = {
        id: "c-1",
        topicId: "t-1",
        type: "basic",
        front: 'Câu hỏi: "Tứ Diệu Đế", có dấu phẩy',
        back: "Khổ, Tập, Diệt, Đạo",
        createdAt: "2026-09-07T00:00:00.000Z",
        updatedAt: "2026-09-07T00:00:00.000Z",
      };
      const cardsMap = new Map<string, Flashcard>([["c-1", card]]);

      const review: FlashcardReview = {
        id: "r-1",
        clientEventId: "evt-1",
        flashcardId: "c-1",
        topicId: "t-1",
        rating: 3,
        reviewDurationMs: 4500,
        reviewedAt: "2026-09-07T10:00:00.000Z",
        stateBefore: "learning",
        stateAfter: "review",
        intervalBefore: 1,
        intervalAfter: 6,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        dueBeforeAt: "2026-09-07T00:00:00.000Z",
        dueAfterAt: "2026-09-13T00:00:00.000Z",
      };

      const csv = generateReviewSessionCSV([review], cardsMap);

      // Verify UTF-8 BOM prefix
      expect(csv.startsWith("\uFEFF")).toBe(true);

      // Verify Header
      expect(csv).toContain("Thời gian (ISO),ID thẻ,ID chủ đề,Đánh giá (1-4)");

      // Verify Data row
      expect(csv).toContain("2026-09-07T10:00:00.000Z,c-1,t-1,3,learning,review,6,2.50,2026-09-13T00:00:00.000Z,4.5");

      // Verify RFC 4180 Escaping for front with quotes and commas
      expect(csv).toContain('"Câu hỏi: ""Tứ Diệu Đế"", có dấu phẩy"');
    });
  });

  describe("downloadCSV", () => {
    it("handles browser environment correctly and creates download link", () => {
      const clickSpy = vi.fn();
      const mockAnchor = {
        setAttribute: vi.fn(),
        style: {},
        click: clickSpy,
      };

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag) => {
        if (tag === "a") return mockAnchor as any;
        return originalCreateElement(tag);
      });

      const appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => mockAnchor as any);
      const removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => mockAnchor as any);

      // Mock URL methods
      global.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      global.URL.revokeObjectURL = vi.fn();

      downloadCSV("col1,col2\nval1,val2", "test-export.csv");

      expect(mockAnchor.setAttribute).toHaveBeenCalledWith("download", "test-export.csv");
      expect(mockAnchor.setAttribute).toHaveBeenCalledWith("href", "blob:mock-url");
      expect(clickSpy).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });
});
