/**
 * Unit Tests: SrsVariantComparisonModal Component (Phase F6.12)
 */

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SrsVariantComparisonModal } from "../../src/components/flashcards/SrsVariantComparisonModal";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

function createMockReview(partial: Partial<FlashcardReview>): FlashcardReview {
  return {
    id: partial.id || "rev-1",
    clientEventId: partial.clientEventId || "evt-1",
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

describe("SrsVariantComparisonModal Component", () => {
  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      front: "Card 1",
      back: "Back 1",
      type: "basic",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  ];

  const mockReviews: FlashcardReview[] = [
    createMockReview({
      id: "r1",
      flashcardId: "card-1",
      rating: 3,
      intervalBefore: 1,
      intervalAfter: 3,
      reviewDurationMs: 2000,
      reviewedAt: "2026-09-01T10:00:00.000Z",
    }),
  ];

  it("does not render when isOpen is false", () => {
    render(
      <SrsVariantComparisonModal
        isOpen={false}
        onClose={vi.fn()}
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    expect(
      screen.queryByTestId("srs-variant-comparison-modal")
    ).not.toBeInTheDocument();
  });

  it("renders comparison modal, metrics, and closes on close button click", () => {
    const handleClose = vi.fn();

    render(
      <SrsVariantComparisonModal
        isOpen={true}
        onClose={handleClose}
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    expect(
      screen.getByTestId("srs-variant-comparison-modal")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("metric-variant-a-retention")
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("metric-variant-b-retention")
    ).toBeInTheDocument();
    expect(screen.getByTestId("significance-verdict")).toBeInTheDocument();

    const closeBtn = screen.getByTestId("btn-close-modal");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });
});
