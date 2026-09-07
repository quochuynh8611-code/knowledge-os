import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardReviewHistoryModal } from "../../src/components/flashcards/CardReviewHistoryModal";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

const mockCard: Flashcard = {
  id: "card-history-1",
  topicId: "topic-dong-y",
  type: "basic",
  front: "Can chủ về sơ tiết nghĩa là gì?",
  back: "Điều hòa khí cơ toàn thân, thông sướng tinh thần và bài tiết mật.",
  lifecycleStatus: "active",
  createdAt: "2026-09-01T08:00:00.000Z",
  updatedAt: "2026-09-01T08:00:00.000Z",
  schedule: {
    id: "sch-1",
    flashcardId: "card-history-1",
    state: "review",
    dueAt: "2026-09-10T08:00:00.000Z",
    interval: 6,
    easeFactor: 2.6,
    repetitions: 3,
    lapses: 0,
    updatedAt: "2026-09-04T08:00:00.000Z",
  },
};

const mockReviews: FlashcardReview[] = [
  {
    id: "rev-2",
    clientEventId: "client-event-2",
    flashcardId: "card-history-1",
    topicId: "topic-dong-y",
    rating: 4, // Easy
    reviewDurationMs: 3200,
    reviewedAt: "2026-09-04T08:00:00.000Z",
    stateBefore: "review",
    stateAfter: "review",
    intervalBefore: 1,
    intervalAfter: 6,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.65,
    dueBeforeAt: "2026-09-04T08:00:00.000Z",
    dueAfterAt: "2026-09-10T08:00:00.000Z",
  },
  {
    id: "rev-1",
    clientEventId: "client-event-1",
    flashcardId: "card-history-1",
    topicId: "topic-dong-y",
    rating: 3, // Good
    reviewDurationMs: 4500,
    reviewedAt: "2026-09-01T08:00:00.000Z",
    stateBefore: "new",
    stateAfter: "review",
    intervalBefore: 0,
    intervalAfter: 1,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.5,
    dueBeforeAt: "2026-09-01T08:00:00.000Z",
    dueAfterAt: "2026-09-02T08:00:00.000Z",
  },
];

describe("Phase F6.5 — Card Review History Modal (CardReviewHistoryModal.tsx)", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/card-history-1/reviews")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockReviews,
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
  });

  it("1. renders card content and current SRS parameters", async () => {
    render(
      <CardReviewHistoryModal
        isOpen={true}
        card={mockCard}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByTestId("modal-card-history")).toBeInTheDocument();
    expect(screen.getByText(/Can chủ về sơ tiết nghĩa là gì?/i)).toBeInTheDocument();
    expect(screen.getByText(/Điều hòa khí cơ toàn thân/i)).toBeInTheDocument();

    // Check stats summary
    expect(screen.getByTestId("history-stat-interval")).toHaveTextContent("6");
    expect(screen.getByTestId("history-stat-ease")).toHaveTextContent("2.6");
    expect(screen.getByTestId("history-stat-repetitions")).toHaveTextContent("3");
  });

  it("2. displays review event timeline with rating, duration, and state transition", async () => {
    render(
      <CardReviewHistoryModal
        isOpen={true}
        card={mockCard}
        initialReviews={mockReviews}
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByTestId("review-item-rev-2")).toBeInTheDocument();
    expect(screen.getByTestId("review-item-rev-1")).toBeInTheDocument();

    // Rating badges
    expect(screen.getByTestId("badge-rating-rev-2")).toHaveTextContent(/Easy/i);
    expect(screen.getByTestId("badge-rating-rev-1")).toHaveTextContent(/Good/i);

    // State transition
    expect(screen.getByTestId("transition-rev-1")).toHaveTextContent(/new.*review/i);
  });

  it("3. clicking close button triggers onClose callback", async () => {
    render(
      <CardReviewHistoryModal
        isOpen={true}
        card={mockCard}
        onClose={mockOnClose}
      />
    );

    const closeBtn = screen.getByTestId("btn-close-history");
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
