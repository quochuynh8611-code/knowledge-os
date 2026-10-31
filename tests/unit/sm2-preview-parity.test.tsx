import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import { setSrsUserConfig } from "../../src/lib/fsrsEngine";
import type { Flashcard, FlashcardSchedule } from "../../src/types/flashcard";

describe("Ca kiểm chứng số 2 — SM-2 Preview Parity Contract (UI Production Verification)", () => {
  beforeEach(() => {
    localStorage.clear();
    // Cấu hình SM-2 tường minh bằng đúng storage key 'knowledge_os_srs_config'
    setSrsUserConfig({ algorithm: "sm2", desiredRetention: 0.90 });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  function createCardWithSchedule(schedule: FlashcardSchedule): Flashcard {
    return {
      id: schedule.flashcardId,
      topicId: "topic-test-sm2",
      type: "basic",
      front: "Mặt trước câu hỏi kiểm thử",
      back: "Mặt sau đáp án kiểm thử",
      lifecycleStatus: "active",
      createdAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
      schedule,
    };
  }

  // ==========================================
  // FIXTURE 1: Thẻ new (state='new', repetitions=0, interval=0, ease=2.5, lapses=0)
  // Contract SM-2 (calculateFlashcardNextReview):
  // - Again (1): nextInterval = 1 -> nhãn "1d"
  // - Hard  (2): nextInterval = 1 -> nhãn "1d"
  // - Good  (3): nextInterval = 1 -> nhãn "1d"
  // - Easy  (4): nextInterval = 4 -> nhãn "4d"
  // ==========================================
  describe("Fixture 1: Thẻ mới (new card)", () => {
    const card = createCardWithSchedule({
      id: "sch-new",
      flashcardId: "card-new",
      state: "new",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("1.1 (RED) Nút Again [1] phải hiển thị '1d' khớp scheduler, không hiển thị '< 1d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewAgain = screen.getByTestId("rating-interval-preview-1");
      // Mong đợi: Scheduler dời 1 ngày -> "1d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "< 1d" (do intervalDays = 0)
      expect(previewAgain.textContent?.trim()).toBe("1d");
    });

    it("1.2 Nút Hard [2], Good [3], Easy [4] hiển thị khớp với thẻ mới", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-2").textContent?.trim()).toBe("1d");
      expect(screen.getByTestId("rating-interval-preview-3").textContent?.trim()).toBe("1d");
      expect(screen.getByTestId("rating-interval-preview-4").textContent?.trim()).toBe("4d");
    });
  });

  // ==========================================
  // FIXTURE 2: Thẻ repetitions=0 (learning state)
  // ==========================================
  describe("Fixture 2: Thẻ đang học có repetitions=0 (learning card)", () => {
    const card = createCardWithSchedule({
      id: "sch-learning-0",
      flashcardId: "card-learning-0",
      state: "learning",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("2.1 (RED) Nút Again [1] phải hiển thị '1d' khớp scheduler", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-1").textContent?.trim()).toBe("1d");
    });
  });

  // ==========================================
  // FIXTURE 3: Thẻ review sau 1 lần nhớ thành công (reps=1, interval=1, ease=2.5)
  // Contract SM-2 (calculateFlashcardNextReview):
  // - Again (1): 1d
  // - Hard  (2): Math.round(1 * 1.2) = 1d
  // - Good  (3): Bước nhảy SuperMemo-2 I(2) = 6d
  // - Easy  (4): Bước nhảy SuperMemo-2 kèm thưởng 6 * 1.3 = 7.8 -> 8d
  // ==========================================
  describe("Fixture 3: Thẻ review sau 1 lần nhớ (reps=1, interval=1, ease=2.5)", () => {
    const card = createCardWithSchedule({
      id: "sch-rev-1",
      flashcardId: "card-rev-1",
      state: "review",
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("3.1 (RED) Nút Again [1] phải hiển thị '1d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-1").textContent?.trim()).toBe("1d");
    });

    it("3.2 (RED) Nút Good [3] phải hiển thị '6d' chuẩn SM-2, không hiển thị '3d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewGood = screen.getByTestId("rating-interval-preview-3");
      // Mong đợi: SM-2 I(2) = 6 -> "6d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "3d" (do Math.round(1 * 2.5))
      expect(previewGood.textContent?.trim()).toBe("6d");
    });

    it("3.3 (RED) Nút Easy [4] phải hiển thị '8d' chuẩn SM-2, không hiển thị '4d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewEasy = screen.getByTestId("rating-interval-preview-4");
      // Mong đợi: SM-2 Easy = Math.round(6 * 1.3) = 8 -> "8d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "4d" (do Math.round(1 * 3.5))
      expect(previewEasy.textContent?.trim()).toBe("8d");
    });
  });

  // ==========================================
  // FIXTURE 4: Thẻ review nhiều lần nhớ, ease thấp (reps=3, interval=10, ease=1.8)
  // Contract SM-2 (calculateFlashcardNextReview):
  // - Again (1): 1d
  // - Hard  (2): Math.round(10 * 1.2) = 12d
  // - Good  (3): Math.round(10 * 1.8) = 18d
  // - Easy  (4): Math.round(10 * 1.8 * 1.3) = 23.4 -> 23d
  // ==========================================
  describe("Fixture 4: Thẻ review nhiều lần, easeFactor thấp (reps=3, interval=10, ease=1.8)", () => {
    const card = createCardWithSchedule({
      id: "sch-rev-3",
      flashcardId: "card-rev-3",
      state: "review",
      interval: 10,
      easeFactor: 1.8,
      repetitions: 3,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("4.1 (RED) Nút Hard [2] phải hiển thị '12d' (10 * 1.2), không hiển thị '10d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewHard = screen.getByTestId("rating-interval-preview-2");
      // Mong đợi: 10 * 1.2 = 12 -> "12d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "10d" (do Math.max(1, 10))
      expect(previewHard.textContent?.trim()).toBe("12d");
    });

    it("4.2 (RED) Nút Good [3] phải hiển thị '18d' (10 * 1.8), không hiển thị '25d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewGood = screen.getByTestId("rating-interval-preview-3");
      // Mong đợi: 10 * 1.8 = 18 -> "18d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "25d" (do hardcode 10 * 2.5)
      expect(previewGood.textContent?.trim()).toBe("18d");
    });

    it("4.3 (RED) Nút Easy [4] phải hiển thị '23d' (10 * 1.8 * 1.3), không hiển thị '35d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewEasy = screen.getByTestId("rating-interval-preview-4");
      // Mong đợi: 10 * 1.8 * 1.3 = 23 -> "23d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "35d" (do hardcode 10 * 3.5)
      expect(previewEasy.textContent?.trim()).toBe("23d");
    });
  });

  // ==========================================
  // FIXTURE 5: Thẻ relearning sau lapse (state='relearning', reps=0, interval=1, ease=2.3, lapses=1)
  // Contract SM-2 (calculateFlashcardNextReview):
  // - Again (1): 1d
  // - Hard  (2): 1d
  // - Good  (3): 1d
  // - Easy  (4): 4d
  // ==========================================
  describe("Fixture 5: Thẻ relearning sau lapse (reps=0, interval=1, ease=2.3)", () => {
    const card = createCardWithSchedule({
      id: "sch-relearning",
      flashcardId: "card-relearning",
      state: "relearning",
      interval: 1,
      easeFactor: 2.3,
      repetitions: 0,
      lapses: 1,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("5.1 (RED) Nút Again [1] phải hiển thị '1d' khớp scheduler", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-1").textContent?.trim()).toBe("1d");
    });

    it("5.2 (RED) Nút Good [3] phải hiển thị '1d' (thẻ relearning reps=0), không hiển thị '3d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewGood = screen.getByTestId("rating-interval-preview-3");
      // Mong đợi: Thẻ reps=0 thì Good dời 1 ngày -> "1d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "3d" (do currentInterval=1 nhân 2.5)
      expect(previewGood.textContent?.trim()).toBe("1d");
    });
  });

  // ==========================================
  // FIXTURE 6: Thẻ review có easeFactor cao (reps=2, interval=6, ease=3.0)
  // Contract SM-2 (calculateFlashcardNextReview):
  // - Hard (2): Math.round(6 * 1.2) = 7.2 -> 7d
  // - Good (3): Math.round(6 * 3.0) = 18d
  // - Easy (4): Math.round(6 * 3.0 * 1.3) = 23.4 -> 23d
  // ==========================================
  describe("Fixture 6: Thẻ review có easeFactor cao (reps=2, interval=6, ease=3.0)", () => {
    const card = createCardWithSchedule({
      id: "sch-high-ease",
      flashcardId: "card-high-ease",
      state: "review",
      interval: 6,
      easeFactor: 3.0,
      repetitions: 2,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("6.1 (RED) Nút Hard [2] phải hiển thị '7d' (6 * 1.2), không hiển thị '6d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-2").textContent?.trim()).toBe("7d");
    });

    it("6.2 (RED) Nút Good [3] phải hiển thị '18d' (6 * 3.0), không hiển thị '15d'", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewGood = screen.getByTestId("rating-interval-preview-3");
      // Mong đợi: 6 * 3.0 = 18 -> "18d"
      // THỰC TẾ TRƯỚC PATCH: UI hiển thị "15d" (do 6 * 2.5 = 15)
      expect(previewGood.textContent?.trim()).toBe("18d");
    });
  });

  // ==========================================
  // FIXTURE 7: Thẻ có interval lớn để kiểm tra format d/m/y (reps=5, interval=60, ease=2.5)
  // Contract:
  // - Good (3): Math.round(60 * 2.5) = 150d -> format 150/30 = 5.0m
  // - Easy (4): Math.round(60 * 2.5 * 1.3) = 195d -> format 195/30 = 6.5m
  // ==========================================
  describe("Fixture 7: Format d/m/y cho khoảng cách lớn (interval=60d)", () => {
    const card = createCardWithSchedule({
      id: "sch-long-interval",
      flashcardId: "card-long-interval",
      state: "review",
      interval: 60,
      easeFactor: 2.5,
      repetitions: 5,
      lapses: 0,
      dueAt: "2026-10-17T00:00:00.000Z",
      updatedAt: "2026-10-17T00:00:00.000Z",
    });

    it("7.1 Nút Good [3] hiển thị '5m' (150 ngày = 5.0m rút gọn thành 5m)", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      expect(screen.getByTestId("rating-interval-preview-3").textContent?.trim()).toBe("5m");
    });

    it("7.2 (RED) Nút Easy [4] phải hiển thị '6.5m' (195 ngày), không hiển thị '7.0m' (210 ngày)", () => {
      render(<FlashcardReviewStudio initialQueue={[card]} />);
      fireEvent.click(screen.getByText("Mặt trước câu hỏi kiểm thử"));

      const previewEasy = screen.getByTestId("rating-interval-preview-4");
      // Mong đợi: 60 * 2.5 * 1.3 = 195d -> 195 / 30 = 6.5m
      // THỰC TẾ TRƯỚC PATCH: 60 * 3.5 = 210d -> 210 / 30 = 7.0m
      expect(previewEasy.textContent?.trim()).toBe("6.5m");
    });
  });
});
