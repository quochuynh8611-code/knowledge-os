import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardAnalyticsDashboard } from "../../src/components/flashcards/FlashcardAnalyticsDashboard";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("Phase F6.8: FlashcardAnalyticsDashboard Component", () => {
  const FIXED_NOW = new Date("2026-09-06T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockCards: Flashcard[] = [
    {
      id: "c1",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ số 1 (Đến hạn)",
      back: "Nội dung 1",
      lifecycleStatus: "active",
      schedule: {
        id: "s1",
        flashcardId: "c1",
        state: "review",
        dueAt: FIXED_NOW.toISOString(), // Due today
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: FIXED_NOW.toISOString(),
      },
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    },
    {
      id: "c2",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ số 2 (Yếu do lapses)",
      back: "Nội dung 2",
      lifecycleStatus: "active",
      schedule: {
        id: "s2",
        flashcardId: "c2",
        state: "relearning",
        dueAt: FIXED_NOW.toISOString(),
        interval: 1,
        easeFactor: 2.3,
        repetitions: 0,
        lapses: 4, // Weak!
        updatedAt: FIXED_NOW.toISOString(),
      },
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    },
    {
      id: "c3",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ số 3 (Tương lai)",
      back: "Nội dung 3",
      lifecycleStatus: "active",
      schedule: {
        id: "s3",
        flashcardId: "c3",
        state: "review",
        dueAt: new Date(FIXED_NOW.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        interval: 3,
        easeFactor: 2.5,
        repetitions: 2,
        lapses: 0,
        updatedAt: FIXED_NOW.toISOString(),
      },
      createdAt: FIXED_NOW.toISOString(),
      updatedAt: FIXED_NOW.toISOString(),
    },
  ];

  const mockReviews: FlashcardReview[] = [
    {
      id: "r1",
      clientEventId: "evt-1",
      flashcardId: "c1",
      topicId: "topic-1",
      rating: 4, // Easy
      reviewDurationMs: 1200,
      reviewedAt: new Date(FIXED_NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      stateBefore: "learning",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 3,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBeforeAt: FIXED_NOW.toISOString(),
      dueAfterAt: FIXED_NOW.toISOString(),
    },
    {
      id: "r2",
      clientEventId: "evt-2",
      flashcardId: "c2",
      topicId: "topic-1",
      rating: 1, // Again (Lapse)
      reviewDurationMs: 2200,
      reviewedAt: new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      stateBefore: "review",
      stateAfter: "relearning",
      intervalBefore: 3,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.3,
      dueBeforeAt: FIXED_NOW.toISOString(),
      dueAfterAt: FIXED_NOW.toISOString(),
    },
  ];

  it("renders metric cards with accurate data breakdown", () => {
    render(
      <FlashcardAnalyticsDashboard
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    // Check dashboard container
    expect(screen.getByTestId("flashcard-analytics-dashboard")).toBeInTheDocument();

    // Check metric cards
    expect(screen.getByTestId("stat-total-cards")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-due-overdue")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-retention")).toBeInTheDocument();
  });

  it("renders forecast workload chart and toggles 7d / 30d forecast", () => {
    render(
      <FlashcardAnalyticsDashboard
        cards={mockCards}
        reviews={mockReviews}
      />
    );

    const chart = screen.getByTestId("forecast-workload-chart");
    expect(chart).toBeInTheDocument();

    const btn30d = screen.getByTestId("btn-forecast-30d");
    fireEvent.click(btn30d);
    expect(screen.getByText("30 ngày")).toHaveClass("bg-white");

    const btn7d = screen.getByTestId("btn-forecast-7d");
    fireEvent.click(btn7d);
    expect(screen.getByText("7 ngày")).toHaveClass("bg-white");
  });

  it("renders weak cards panel and triggers onLaunchSession when clicking CTA", () => {
    const onLaunchSession = vi.fn();
    render(
      <FlashcardAnalyticsDashboard
        cards={mockCards}
        reviews={mockReviews}
        onLaunchSession={onLaunchSession}
      />
    );

    const weakPanel = screen.getByTestId("weak-cards-panel");
    expect(weakPanel).toHaveTextContent("Thẻ số 2 (Yếu do lapses)");

    const btnWeak = screen.getByText(/Ôn tập 1 thẻ yếu ngay/i);
    fireEvent.click(btnWeak);

    expect(onLaunchSession).toHaveBeenCalledWith("weak");
  });

  it("renders actionable insights and triggers CTA review", () => {
    const onLaunchSession = vi.fn();
    render(
      <FlashcardAnalyticsDashboard
        cards={mockCards}
        reviews={mockReviews}
        onLaunchSession={onLaunchSession}
      />
    );

    expect(screen.getByTestId("actionable-insights-panel")).toBeInTheDocument();

    const ctaReviewBtn = screen.getByTestId("btn-cta-review");
    expect(ctaReviewBtn).toBeInTheDocument();
    fireEvent.click(ctaReviewBtn);

    expect(onLaunchSession).toHaveBeenCalledWith("review");
  });
});
