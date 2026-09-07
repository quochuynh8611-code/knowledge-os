import { describe, it, expect } from "vitest";
import { calculateFlashcardNextReview, getDueFlashcards } from "../../src/lib/flashcardScheduler";
import type { Flashcard, FlashcardSchedule } from "../../src/types/flashcard";

describe("Phase F1B: Flashcard Scheduler Transitions Test Suite", () => {
  const baseSchedule: FlashcardSchedule = {
    id: "sch-test-001",
    flashcardId: "card-test-001",
    state: "new",
    dueAt: "2026-09-06T12:00:00.000Z",
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    updatedAt: "2026-09-06T12:00:00.000Z",
  };

  describe("1. Initial Review Transitions on New Cards", () => {
    it("Rating 1 (Again): Chuyển sang relearning, interval = 1, giảm easeFactor (-0.20), tăng lapses", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 1,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("relearning");
      expect(result.nextSchedule.interval).toBe(1);
      expect(result.nextSchedule.easeFactor).toBe(2.3);
      expect(result.nextSchedule.repetitions).toBe(0);
      expect(result.nextSchedule.lapses).toBe(1);
    });

    it("Rating 2 (Hard): Chuyển sang review, interval = 1, giảm easeFactor nhẹ (-0.15), reps = 1", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 2,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(1);
      expect(result.nextSchedule.easeFactor).toBe(2.35);
      expect(result.nextSchedule.repetitions).toBe(1);
      expect(result.nextSchedule.lapses).toBe(0);
    });

    it("Rating 3 (Good): Chuyển sang review, interval = 1, giữ nguyên easeFactor (2.50), reps = 1", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 3,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(1);
      expect(result.nextSchedule.easeFactor).toBe(2.5);
      expect(result.nextSchedule.repetitions).toBe(1);
      expect(result.nextSchedule.lapses).toBe(0);
    });

    it("Rating 4 (Easy): Chuyển sang review, interval = 4, tăng easeFactor (+0.15), reps = 1", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: baseSchedule,
        rating: 4,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(4);
      expect(result.nextSchedule.easeFactor).toBe(2.65);
      expect(result.nextSchedule.repetitions).toBe(1);
      expect(result.nextSchedule.lapses).toBe(0);
    });
  });

  describe("2. Graduated Progression on Established Review Cards", () => {
    const reviewSchedule: FlashcardSchedule = {
      ...baseSchedule,
      state: "review",
      interval: 6,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
    };

    it("Rating 1 (Again) trên thẻ review: Reset interval = 1, tăng lapses = 1, reps = 0", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: reviewSchedule,
        rating: 1,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("relearning");
      expect(result.nextSchedule.interval).toBe(1);
      expect(result.nextSchedule.easeFactor).toBe(2.3);
      expect(result.nextSchedule.repetitions).toBe(0);
      expect(result.nextSchedule.lapses).toBe(1);
    });

    it("Rating 2 (Hard) trên thẻ review: Giãn interval thận trọng (6 * 1.2 = 7)", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: reviewSchedule,
        rating: 2,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(7);
      expect(result.nextSchedule.easeFactor).toBe(2.35);
      expect(result.nextSchedule.repetitions).toBe(3);
    });

    it("Rating 3 (Good) trên thẻ review: Giãn interval theo công thức SM-2 (6 * 2.5 = 15)", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: reviewSchedule,
        rating: 3,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(15);
      expect(result.nextSchedule.easeFactor).toBe(2.5);
      expect(result.nextSchedule.repetitions).toBe(3);
    });

    it("Rating 4 (Easy) trên thẻ review: Giãn interval với hệ số thưởng (6 * 2.5 * 1.3 = 20)", () => {
      const result = calculateFlashcardNextReview({
        currentSchedule: reviewSchedule,
        rating: 4,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.state).toBe("review");
      expect(result.nextSchedule.interval).toBe(20);
      expect(result.nextSchedule.easeFactor).toBe(2.65);
      expect(result.nextSchedule.repetitions).toBe(3);
    });
  });

  describe("3. Ease Factor Boundaries (Sàn 1.3 & Trần 3.5)", () => {
    it("Không bao giờ giảm easeFactor xuống dưới 1.3 dù bị Again liên tiếp", () => {
      const lowEaseSchedule: FlashcardSchedule = {
        ...baseSchedule,
        state: "review",
        interval: 1,
        easeFactor: 1.35,
        repetitions: 1,
      };

      const result = calculateFlashcardNextReview({
        currentSchedule: lowEaseSchedule,
        rating: 1,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.easeFactor).toBe(1.3);
    });

    it("Không bao giờ tăng easeFactor vượt trần 3.5 dù chọn Easy liên tiếp", () => {
      const highEaseSchedule: FlashcardSchedule = {
        ...baseSchedule,
        state: "review",
        interval: 30,
        easeFactor: 3.45,
        repetitions: 5,
      };

      const result = calculateFlashcardNextReview({
        currentSchedule: highEaseSchedule,
        rating: 4,
        referenceDate: new Date("2026-09-06T12:00:00.000Z"),
      });

      expect(result.nextSchedule.easeFactor).toBe(3.5);
    });
  });

  describe("4. Due Queue & Deterministic Same-DueAt Ordering", () => {
    const referenceNow = new Date("2026-09-06T12:00:00.000Z");

    const createCardWithSchedule = (
      id: string,
      topicId: string,
      dueStr: string
    ): Flashcard => ({
      id,
      topicId,
      type: "basic",
      front: `Front ${id}`,
      back: `Back ${id}`,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      schedule: {
        id: `sch-${id}`,
        flashcardId: id,
        state: "review",
        dueAt: dueStr,
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    });

    it("Chỉ trả về các thẻ có due <= now, loại bỏ các thẻ tương lai", () => {
      const cards: Flashcard[] = [
        createCardWithSchedule("card-overdue", "topic-1", "2026-09-05T12:00:00.000Z"),
        createCardWithSchedule("card-today", "topic-1", "2026-09-06T12:00:00.000Z"),
        createCardWithSchedule("card-future", "topic-1", "2026-09-07T12:00:00.000Z"),
      ];

      const dueCards = getDueFlashcards(cards, undefined, referenceNow);
      expect(dueCards.map((c) => c.id)).toEqual(["card-overdue", "card-today"]);
    });

    it("Deterministic same-dueAt ordering: Nhiều thẻ có cùng dueAt phải được sắp xếp xác định (tie-break bằng card.id ascending)", () => {
      // 3 thẻ có cùng chính xác thời gian due
      const sameDueStr = "2026-09-06T12:00:00.000Z";
      const cardGamma = createCardWithSchedule("card-gamma", "topic-1", sameDueStr);
      const cardAlpha = createCardWithSchedule("card-alpha", "topic-1", sameDueStr);
      const cardBeta = createCardWithSchedule("card-beta", "topic-1", sameDueStr);

      // Thử nghiệm với thứ tự đầu vào xáo trộn 1
      const inputOrder1 = [cardGamma, cardAlpha, cardBeta];
      const result1 = getDueFlashcards(inputOrder1, undefined, referenceNow);

      // Thử nghiệm với thứ tự đầu vào xáo trộn 2
      const inputOrder2 = [cardBeta, cardGamma, cardAlpha];
      const result2 = getDueFlashcards(inputOrder2, undefined, referenceNow);

      // Cả hai lần gọi đều phải cho ra kết quả xác định 100%: card-alpha -> card-beta -> card-gamma
      expect(result1.map((c) => c.id)).toEqual(["card-alpha", "card-beta", "card-gamma"]);
      expect(result2.map((c) => c.id)).toEqual(["card-alpha", "card-beta", "card-gamma"]);
      expect(result1.map((c) => c.id)).toEqual(result2.map((c) => c.id));
    });

    it("Hỗ trợ lọc theo topicId kết hợp thứ tự due xác định", () => {
      const sameDueStr = "2026-09-06T12:00:00.000Z";
      const cards: Flashcard[] = [
        createCardWithSchedule("card-t1-z", "topic-1", sameDueStr),
        createCardWithSchedule("card-t2-a", "topic-2", sameDueStr),
        createCardWithSchedule("card-t1-a", "topic-1", sameDueStr),
      ];

      const topic1Cards = getDueFlashcards(cards, { topicId: "topic-1" }, referenceNow);
      expect(topic1Cards.map((c) => c.id)).toEqual(["card-t1-a", "card-t1-z"]);
    });
  });
});

