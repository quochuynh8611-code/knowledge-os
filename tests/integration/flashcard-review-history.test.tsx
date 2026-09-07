/**
 * Integration Tests: View History Modal (Ctrl+H / Cmd+H) (Phase F6.11 Task 4)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardCardView } from "../../src/components/flashcards/FlashcardCardView";
import { FlashcardReviewHistoryModal } from "../../src/components/flashcards/FlashcardReviewHistoryModal";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [
  { id: "topic-1", title: "Phật Pháp Căn Bản" },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {},
  }),
}));

describe("Phase F6.11 Task 4: View History Modal & Timeline", () => {
  const mockCard: Flashcard = {
    id: "card-hist-1",
    topicId: "topic-1",
    type: "basic",
    front: "Tứ Diệu Đế là gì?",
    back: "Khổ, Tập, Diệt, Đạo.",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "sch-hist-1",
      flashcardId: "card-hist-1",
      state: "review",
      dueAt: new Date().toISOString(),
      interval: 6,
      easeFactor: 2.4,
      repetitions: 3,
      lapses: 1,
      updatedAt: new Date().toISOString(),
    },
  };

  const mockReviews: FlashcardReview[] = [
    {
      id: "rev-1",
      clientEventId: "evt-1",
      flashcardId: "card-hist-1",
      cardId: "card-hist-1",
      topicId: "topic-1",
      rating: 3, // Good
      stateBefore: "learning",
      stateAfter: "review",
      intervalBefore: 0,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      reviewDurationMs: 3200,
      reviewedAt: new Date("2026-09-01T08:00:00Z").toISOString(),
      dueBeforeAt: new Date("2026-09-01T08:00:00Z").toISOString(),
      dueAfterAt: new Date("2026-09-02T08:00:00Z").toISOString(),
    },
    {
      id: "rev-2",
      clientEventId: "evt-2",
      flashcardId: "card-hist-1",
      cardId: "card-hist-1",
      topicId: "topic-1",
      rating: 1, // Again
      stateBefore: "review",
      stateAfter: "relearning",
      intervalBefore: 1,
      intervalAfter: 0,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.3,
      reviewDurationMs: 4500,
      reviewedAt: new Date("2026-09-03T09:30:00Z").toISOString(),
      dueBeforeAt: new Date("2026-09-03T09:30:00Z").toISOString(),
      dueAfterAt: new Date("2026-09-03T09:40:00Z").toISOString(),
    },
    {
      id: "rev-3",
      clientEventId: "evt-3",
      flashcardId: "card-hist-1",
      cardId: "card-hist-1",
      topicId: "topic-1",
      rating: 4, // Easy
      stateBefore: "relearning",
      stateAfter: "review",
      intervalBefore: 0,
      intervalAfter: 6,
      easeFactorBefore: 2.3,
      easeFactorAfter: 2.4,
      reviewDurationMs: 2100,
      reviewedAt: new Date("2026-09-05T10:15:00Z").toISOString(),
      dueBeforeAt: new Date("2026-09-05T10:15:00Z").toISOString(),
      dueAfterAt: new Date("2026-09-11T10:15:00Z").toISOString(),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("FlashcardCardView History Button", () => {
    it("renders history button when onHistory is provided and does not flip card when clicked", () => {
      const onFlipMock = vi.fn();
      const onHistoryMock = vi.fn();

      render(
        <FlashcardCardView
          card={mockCard}
          isFlipped={false}
          onFlip={onFlipMock}
          onHistory={onHistoryMock}
        />
      );

      const historyBtn = screen.getByTestId("btn-view-card-history");
      expect(historyBtn).toBeInTheDocument();

      fireEvent.click(historyBtn);

      expect(onHistoryMock).toHaveBeenCalledTimes(1);
      expect(onFlipMock).not.toHaveBeenCalled();
    });
  });

  describe("FlashcardReviewHistoryModal Component", () => {
    it("renders card content, SRS parameters, and review events when initialReviews is provided", () => {
      const onCloseMock = vi.fn();

      render(
        <FlashcardReviewHistoryModal
          isOpen={true}
          onClose={onCloseMock}
          card={mockCard}
          initialReviews={mockReviews}
        />
      );

      // Verify header & card preview
      expect(screen.getByText("Lịch sử Ôn tập Thẻ Nhớ")).toBeInTheDocument();
      expect(screen.getByText("Tứ Diệu Đế là gì?")).toBeInTheDocument();
      expect(screen.getByText("Khổ, Tập, Diệt, Đạo.")).toBeInTheDocument();

      // Verify SRS stats
      expect(screen.getByTestId("history-stat-interval")).toHaveTextContent("6d");
      expect(screen.getByTestId("history-stat-ease")).toHaveTextContent("2.40");
      expect(screen.getByTestId("history-stat-repetitions")).toHaveTextContent("3");
      expect(screen.getByTestId("history-stat-lapses")).toHaveTextContent("1");

      // Verify timeline reviews
      expect(screen.getByTestId("review-history-timeline")).toBeInTheDocument();
      expect(screen.getByTestId("review-item-rev-1")).toBeInTheDocument();
      expect(screen.getByTestId("review-item-rev-2")).toBeInTheDocument();
      expect(screen.getByTestId("review-item-rev-3")).toBeInTheDocument();

      // Verify rating badges
      expect(screen.getByText("Good (Nhớ) [3]")).toBeInTheDocument();
      expect(screen.getByText("Again (Quên) [1]")).toBeInTheDocument();
      expect(screen.getByText("Easy (Dễ) [4]")).toBeInTheDocument();

      // Close button
      const closeBtn = screen.getByTestId("btn-close-history");
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("fetches reviews from /api/flashcards/:id/reviews if not passed via props", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/card-hist-1/reviews")) {
          return Promise.resolve({
            ok: true,
            json: async () => mockReviews,
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(
        <FlashcardReviewHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          card={mockCard}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("review-item-rev-1")).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith("/api/flashcards/card-hist-1/reviews");
    });

    it("displays empty state message when card has no reviews yet", async () => {
      render(
        <FlashcardReviewHistoryModal
          isOpen={true}
          onClose={vi.fn()}
          card={mockCard}
          initialReviews={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId("empty-history-timeline")).toBeInTheDocument();
        expect(
          screen.getByText("Chưa có lượt ôn tập nào được ghi nhận cho thẻ này.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("FlashcardReviewStudio History Integration & Shortcut", () => {
    it("opens history modal on Ctrl+H and shows timeline for active card", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/due")) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockCard],
          });
        }
        if (url.includes(`/api/flashcards/${mockCard.id}/reviews`)) {
          return Promise.resolve({
            ok: true,
            json: async () => mockReviews,
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<FlashcardReviewStudio />);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Tứ Diệu Đế là gì?")).toBeInTheDocument();
      });

      // Press Ctrl+H
      fireEvent.keyDown(window, { key: "h", ctrlKey: true });

      // History modal should appear
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Lịch sử Ôn tập Thẻ Nhớ" })).toBeInTheDocument();
        expect(screen.getByTestId("history-stat-interval")).toHaveTextContent("6d");
      });

      // Close modal
      const closeBtn = screen.getByTestId("btn-close-history-footer");
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "Lịch sử Ôn tập Thẻ Nhớ" })
        ).not.toBeInTheDocument();
      });
    });

    it("opens history modal when clicking the History button on the card view", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/due")) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockCard],
          });
        }
        if (url.includes(`/api/flashcards/${mockCard.id}/reviews`)) {
          return Promise.resolve({
            ok: true,
            json: async () => mockReviews,
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<FlashcardReviewStudio />);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Tứ Diệu Đế là gì?")).toBeInTheDocument();
      });

      // Click history button on card
      const historyBtn = screen.getByTestId("btn-view-card-history");
      fireEvent.click(historyBtn);

      // Verify modal is open
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Lịch sử Ôn tập Thẻ Nhớ" })).toBeInTheDocument();
      });
    });
  });
});
