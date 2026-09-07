/**
 * Integration Tests: Study Session Modes in FlashcardReviewStudio (Phase F6.6)
 *
 * Validates:
 * 1. Cram Mode: Rates card without calling /api/flashcards/review (No Reschedule)
 * 2. New Card Session: Displays session badge and records learned quota
 * 3. Weak Card Session: Displays session badge and processes SM-2 review
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard } from "../../src/types/flashcard";
import * as studyLogic from "../../src/lib/studySessionLogic";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("FlashcardReviewStudio — Study Session Modes (Phase F6.6)", () => {
  const mockCards: Flashcard[] = [
    {
      id: "card-1",
      topicId: "topic-1",
      type: "basic",
      front: "Mặt trước 1",
      back: "Mặt sau 1",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-1",
        flashcardId: "card-1",
        state: "review",
        dueAt: new Date().toISOString(),
        interval: 3,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: "card-2",
      topicId: "topic-1",
      type: "basic",
      front: "Mặt trước 2",
      back: "Mặt sau 2",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-2",
        flashcardId: "card-2",
        state: "new",
        dueAt: new Date().toISOString(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("1. Cram Mode: ratings flip and advance cards WITHOUT sending review request to API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    render(
      <FlashcardReviewStudio
        sessionType="cram"
        initialQueue={mockCards}
      />
    );

    // Verify Cram Mode badge
    expect(screen.getByTestId("badge-session-type")).toHaveTextContent(/cram|cấp tốc/i);

    // Flip card
    const cardEl = screen.getByTestId("flashcard-card");
    fireEvent.click(cardEl);

    // Rate "Good" (3)
    const goodBtn = screen.getByTestId("rating-btn-3");
    fireEvent.click(goodBtn);

    // Verify /api/flashcards/review was NOT called
    const reviewCalls = fetchSpy.mock.calls.filter((call) =>
      String(call[0]).includes("/api/flashcards/review")
    );
    expect(reviewCalls).toHaveLength(0);

    // Advances to card 2
    expect(screen.getByText("Mặt trước 2")).toBeInTheDocument();
  });

  it("2. New Card Session: displays badge, calls review API, and increments daily learned counter", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    const incrementSpy = vi.spyOn(studyLogic, "incrementNewCardsLearnedToday");

    render(
      <FlashcardReviewStudio
        sessionType="new"
        initialQueue={[mockCards[1]]}
      />
    );

    expect(screen.getByTestId("badge-session-type")).toHaveTextContent(/thẻ mới|mới/i);

    // Flip card
    fireEvent.click(screen.getByTestId("flashcard-card"));

    // Rate Good
    fireEvent.click(screen.getByTestId("rating-btn-3"));

    await waitFor(() => {
      const reviewCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("/api/flashcards/review")
      );
      expect(reviewCalls).toHaveLength(1);
      expect(incrementSpy).toHaveBeenCalledWith(1);
    });
  });

  it("3. Weak Card Session: displays weak card badge and processes rating via API", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <FlashcardReviewStudio
        sessionType="weak"
        initialQueue={[mockCards[0]]}
      />
    );

    expect(screen.getByTestId("badge-session-type")).toHaveTextContent(/thẻ yếu|yếu/i);

    // Flip and rate
    fireEvent.click(screen.getByTestId("flashcard-card"));
    fireEvent.click(screen.getByTestId("rating-btn-2"));

    await waitFor(() => {
      const reviewCalls = fetchSpy.mock.calls.filter((call) =>
        String(call[0]).includes("/api/flashcards/review")
      );
      expect(reviewCalls).toHaveLength(1);
    });
  });
});
