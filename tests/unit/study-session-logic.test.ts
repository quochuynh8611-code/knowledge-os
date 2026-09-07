/**
 * Unit Tests: Study Session Logic & Queue Builder (Phase F6.6)
 *
 * Feature: Study Launcher Pure Logic & Daily Limit Management
 *
 * Test coverage:
 * - getDueQueue: Active cards with dueAt <= now, sorted dueAt asc, topic-scoped
 * - getNewQueue: Active cards with state === 'new', limited by daily limit, topic-scoped
 * - getWeakQueue: Active cards with lapses >= 3 OR easeFactor <= 2.0, sorted, topic-scoped
 * - getCramQueue: All active cards, optional shuffle, topic-scoped
 * - buildSessionQueue: Unified builder for all session types
 * - Daily Limit Storage: default 20, localStorage persistence
 * - Daily New Cards Learned Tracking: daily reset, increment count
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDueQueue,
  getNewQueue,
  getWeakQueue,
  getCramQueue,
  buildSessionQueue,
  getDailyNewLimit,
  setDailyNewLimit,
  getNewCardsLearnedToday,
  incrementNewCardsLearnedToday,
  resetDailyLimitStorage,
  type StudySessionType,
  type SessionQueueOptions,
} from "../../src/lib/studySessionLogic";
import type { Flashcard } from "../../src/types/flashcard";

describe("Study Session Logic & Queue Builder (studySessionLogic.ts)", () => {
  const refNow = new Date("2026-09-06T12:00:00.000Z");

  const mockCards: Flashcard[] = [
    // 1. Due card, normal ease
    {
      id: "card-due-1",
      topicId: "topic-pali",
      type: "basic",
      front: "Dukkha là gì?",
      back: "Khổ, sự bất toàn, sự biến dịch.",
      lifecycleStatus: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-1",
        flashcardId: "card-due-1",
        state: "review",
        dueAt: "2026-09-05T00:00:00.000Z", // Past due
        interval: 3,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
        updatedAt: "2026-09-02T00:00:00.000Z",
      },
    },
    // 2. Due card earlier, another topic
    {
      id: "card-due-2",
      topicId: "topic-tcm",
      type: "basic",
      front: "Huyệt Hợp Cốc thuộc kinh nào?",
      back: "Thủ Dương Minh Đại Trường Kinh.",
      lifecycleStatus: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-2",
        flashcardId: "card-due-2",
        state: "review",
        dueAt: "2026-09-04T00:00:00.000Z", // Even earlier
        interval: 2,
        easeFactor: 2.4,
        repetitions: 1,
        lapses: 1,
        updatedAt: "2026-09-02T00:00:00.000Z",
      },
    },
    // 3. Not due card
    {
      id: "card-not-due",
      topicId: "topic-pali",
      type: "basic",
      front: "Anicca là gì?",
      back: "Vô thường.",
      lifecycleStatus: "active",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-3",
        flashcardId: "card-not-due",
        state: "review",
        dueAt: "2026-09-10T00:00:00.000Z", // Future
        interval: 7,
        easeFactor: 2.6,
        repetitions: 4,
        lapses: 0,
        updatedAt: "2026-09-03T00:00:00.000Z",
      },
    },
    // 4. New card 1
    {
      id: "card-new-1",
      topicId: "topic-pali",
      type: "basic",
      front: "Anatta là gì?",
      back: "Vô ngã.",
      lifecycleStatus: "active",
      createdAt: "2026-09-06T00:00:00.000Z",
      updatedAt: "2026-09-06T00:00:00.000Z",
      schedule: {
        id: "sch-4",
        flashcardId: "card-new-1",
        state: "new",
        dueAt: "2026-09-06T00:00:00.000Z",
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: "2026-09-06T00:00:00.000Z",
      },
    },
    // 5. New card 2
    {
      id: "card-new-2",
      topicId: "topic-tcm",
      type: "basic",
      front: "Huyệt Thái Xung?",
      back: "Túc Quyết Âm Can Kinh.",
      lifecycleStatus: "active",
      createdAt: "2026-09-06T01:00:00.000Z",
      updatedAt: "2026-09-06T01:00:00.000Z",
      schedule: {
        id: "sch-5",
        flashcardId: "card-new-2",
        state: "new",
        dueAt: "2026-09-06T01:00:00.000Z",
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: "2026-09-06T01:00:00.000Z",
      },
    },
    // 6. Weak card (lapses >= 3)
    {
      id: "card-weak-lapses",
      topicId: "topic-pali",
      type: "basic",
      front: "Paticcasamuppada là gì?",
      back: "Duyên khởi (Thập nhị nhân duyên).",
      lifecycleStatus: "active",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-6",
        flashcardId: "card-weak-lapses",
        state: "relearning",
        dueAt: "2026-09-05T00:00:00.000Z",
        interval: 1,
        easeFactor: 2.1,
        repetitions: 1,
        lapses: 4, // Lapses >= 3
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    },
    // 7. Weak card (easeFactor <= 2.0)
    {
      id: "card-weak-ease",
      topicId: "topic-tcm",
      type: "basic",
      front: "Lục khí gồm?",
      back: "Phong, Hàn, Thử, Thấp, Táo, Hỏa.",
      lifecycleStatus: "active",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-7",
        flashcardId: "card-weak-ease",
        state: "review",
        dueAt: "2026-09-08T00:00:00.000Z",
        interval: 2,
        easeFactor: 1.8, // Ease <= 2.0
        repetitions: 2,
        lapses: 1,
        updatedAt: "2026-09-04T00:00:00.000Z",
      },
    },
    // 8. Suspended card (should be ignored across all queues)
    {
      id: "card-suspended",
      topicId: "topic-pali",
      type: "basic",
      front: "Thẻ tạm ngưng?",
      back: "Không nên hiển thị.",
      lifecycleStatus: "suspended",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: "sch-8",
        flashcardId: "card-suspended",
        state: "review",
        dueAt: "2026-09-01T00:00:00.000Z",
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 5,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    resetDailyLimitStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getDueQueue", () => {
    it("returns only active cards whose dueAt is <= now, sorted by dueAt asc", () => {
      const queue = getDueQueue(mockCards, { now: refNow });
      // card-due-2 (Sep 4) comes before card-due-1 (Sep 5) & card-weak-lapses (Sep 5)
      expect(queue.map((c) => c.id)).toContain("card-due-1");
      expect(queue.map((c) => c.id)).toContain("card-due-2");
      expect(queue.map((c) => c.id)).toContain("card-weak-lapses");
      expect(queue.map((c) => c.id)).not.toContain("card-not-due");
      expect(queue.map((c) => c.id)).not.toContain("card-suspended");

      // Verify earliest due first
      expect(queue[0].id).toBe("card-due-2");
    });

    it("filters by topicId if provided", () => {
      const queue = getDueQueue(mockCards, { topicId: "topic-pali", now: refNow });
      expect(queue.every((c) => c.topicId === "topic-pali")).toBe(true);
      expect(queue.map((c) => c.id)).toContain("card-due-1");
      expect(queue.map((c) => c.id)).not.toContain("card-due-2");
    });
  });

  describe("getNewQueue", () => {
    it("returns active cards in 'new' state, bounded by dailyNewLimit", () => {
      const queue = getNewQueue(mockCards, { dailyNewLimit: 1 });
      expect(queue).toHaveLength(1);
      expect(queue[0].schedule?.state).toBe("new");
    });

    it("returns all new cards when below dailyNewLimit", () => {
      const queue = getNewQueue(mockCards, { dailyNewLimit: 20 });
      expect(queue).toHaveLength(2);
      expect(queue.map((c) => c.id)).toEqual(["card-new-1", "card-new-2"]);
    });

    it("filters by topicId when provided", () => {
      const queue = getNewQueue(mockCards, { topicId: "topic-pali", dailyNewLimit: 10 });
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("card-new-1");
    });
  });

  describe("getWeakQueue", () => {
    it("returns cards with lapses >= 3 OR easeFactor <= 2.0 (excluding non-active)", () => {
      const queue = getWeakQueue(mockCards);
      const ids = queue.map((c) => c.id);
      expect(ids).toContain("card-weak-lapses");
      expect(ids).toContain("card-weak-ease");
      expect(ids).not.toContain("card-suspended");
      expect(ids).not.toContain("card-due-1"); // lapses 0, ease 2.5
    });

    it("sorts weak cards by easeFactor ASC or lapses DESC", () => {
      const queue = getWeakQueue(mockCards);
      // Lowest ease or highest lapses should be prioritized
      expect(queue.length).toBe(2);
      expect(queue[0].schedule?.easeFactor).toBeLessThanOrEqual(queue[1].schedule?.easeFactor ?? 3);
    });

    it("filters weak cards by topicId when provided", () => {
      const queue = getWeakQueue(mockCards, { topicId: "topic-tcm" });
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("card-weak-ease");
    });
  });

  describe("getCramQueue", () => {
    it("returns all active cards regardless of dueAt or schedule state", () => {
      const queue = getCramQueue(mockCards, { shuffle: false });
      // 7 active cards total (1 suspended excluded)
      expect(queue).toHaveLength(7);
      expect(queue.map((c) => c.id)).not.toContain("card-suspended");
    });

    it("filters cram cards by topicId", () => {
      const queue = getCramQueue(mockCards, { topicId: "topic-tcm", shuffle: false });
      expect(queue.every((c) => c.topicId === "topic-tcm")).toBe(true);
      expect(queue).toHaveLength(3); // card-due-2, card-new-2, card-weak-ease
    });

    it("supports optional shuffling", () => {
      // Mock Math.random to verify deterministic shuffle branch
      const spy = vi.spyOn(Math, "random").mockReturnValue(0.5);
      const queue = getCramQueue(mockCards, { shuffle: true });
      expect(queue.length).toBe(7);
      spy.mockRestore();
    });
  });

  describe("buildSessionQueue", () => {
    it("routes correctly to corresponding queue builder by sessionType", () => {
      const reviewQueue = buildSessionQueue(mockCards, { sessionType: "review", now: refNow });
      const newQueue = buildSessionQueue(mockCards, { sessionType: "new" });
      const weakQueue = buildSessionQueue(mockCards, { sessionType: "weak" });
      const cramQueue = buildSessionQueue(mockCards, { sessionType: "cram", shuffle: false });

      expect(reviewQueue.length).toBe(3);
      expect(newQueue.length).toBe(2);
      expect(weakQueue.length).toBe(2);
      expect(cramQueue.length).toBe(7);
    });
  });

  describe("Daily New-Card Limit Storage", () => {
    it("defaults to 20 when not set in localStorage", () => {
      expect(getDailyNewLimit()).toBe(20);
    });

    it("persists custom limit in localStorage and reads back correctly", () => {
      setDailyNewLimit(35);
      expect(getDailyNewLimit()).toBe(35);
      expect(localStorage.getItem("knowledge_os_flashcard_daily_new_limit")).toBe("35");
    });

    it("validates floor at 1 and ceiling at 200", () => {
      setDailyNewLimit(-5);
      expect(getDailyNewLimit()).toBe(1);

      setDailyNewLimit(500);
      expect(getDailyNewLimit()).toBe(200);
    });
  });

  describe("Daily New Cards Learned Tracking", () => {
    it("initializes to 0 for a new day", () => {
      expect(getNewCardsLearnedToday()).toBe(0);
    });

    it("increments count correctly and retrieves updated total", () => {
      incrementNewCardsLearnedToday(1);
      expect(getNewCardsLearnedToday()).toBe(1);

      incrementNewCardsLearnedToday(4);
      expect(getNewCardsLearnedToday()).toBe(5);
    });

    it("resets when a different date string is encountered", () => {
      incrementNewCardsLearnedToday(10);
      expect(getNewCardsLearnedToday()).toBe(10);

      // Simulate next day dynamically
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(getNewCardsLearnedToday(tomorrow)).toBe(0);
    });
  });
});
