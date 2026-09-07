/**
 * Unit Tests: RetentionCurveChart Component (Phase F6.12)
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RetentionCurveChart } from "../../src/components/flashcards/RetentionCurveChart";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

function createMockReview(partial: Partial<FlashcardReview>): FlashcardReview {
  return {
    id: partial.id || "rev-1",
    clientEventId: partial.clientEventId || "evt-1",
    flashcardId: partial.flashcardId || "c1",
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

describe("RetentionCurveChart Component", () => {
  const mockCards: Flashcard[] = [
    {
      id: "c1",
      topicId: "topic-1",
      front: "Card 1",
      back: "Back 1",
      type: "basic",
      schedule: {
        id: "s1",
        flashcardId: "c1",
        state: "review",
        dueAt: "2026-09-10T00:00:00.000Z",
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        retentionRate: 0.9,
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  const mockReviews: FlashcardReview[] = [
    createMockReview({
      id: "r1",
      flashcardId: "c1",
      rating: 3,
      intervalBefore: 2,
      intervalAfter: 5,
      reviewedAt: "2026-09-02T10:00:00.000Z",
    }),
    createMockReview({
      id: "r2",
      flashcardId: "c1",
      rating: 4,
      intervalBefore: 5,
      intervalAfter: 12,
      reviewedAt: "2026-09-07T10:00:00.000Z",
    }),
  ];

  it("renders chart container, stability badge, and theoretical path", () => {
    render(<RetentionCurveChart cards={mockCards} reviews={mockReviews} />);

    expect(screen.getByTestId("retention-curve-chart")).toBeInTheDocument();
    expect(screen.getByTestId("stability-badge")).toBeInTheDocument();
    expect(screen.getByTestId("ebbinghaus-path")).toBeInTheDocument();
  });

  it("renders empirical data points and handles difficulty filter toggles", () => {
    render(<RetentionCurveChart cards={mockCards} reviews={mockReviews} />);

    // Check empirical point rendered for day 2 and day 5
    expect(screen.getByTestId("empirical-point-2")).toBeInTheDocument();
    expect(screen.getByTestId("empirical-point-5")).toBeInTheDocument();

    // Click difficulty filter button
    const hardBtn = screen.getByTestId("filter-difficulty-hard");
    fireEvent.click(hardBtn);

    // Filter to easy
    const easyBtn = screen.getByTestId("filter-difficulty-easy");
    fireEvent.click(easyBtn);

    // Filter to all
    const allBtn = screen.getByTestId("filter-difficulty-all");
    fireEvent.click(allBtn);
  });

  it("allows switching time horizon", () => {
    render(<RetentionCurveChart cards={mockCards} reviews={mockReviews} />);

    const h14 = screen.getByTestId("filter-horizon-14");
    fireEvent.click(h14);

    const h60 = screen.getByTestId("filter-horizon-60");
    fireEvent.click(h60);
  });

  it("handles empty reviews gracefully with default theoretical model", () => {
    render(<RetentionCurveChart cards={[]} reviews={[]} />);

    expect(screen.getByTestId("retention-curve-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/Chưa có đủ lượt ôn thực tế/i)
    ).toBeInTheDocument();
  });
});
