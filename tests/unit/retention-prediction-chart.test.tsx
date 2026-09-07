import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RetentionPredictionChart } from "../../src/components/research/RetentionPredictionChart";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

describe("RetentionPredictionChart Component", () => {
  const mockCard: Flashcard = {
    id: "card-chart-1",
    topicId: "topic-1",
    type: "basic",
    front: "Front",
    back: "Back",
    createdAt: new Date("2026-09-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-09-01T00:00:00Z").toISOString(),
    schedule: {
      id: "sched-1",
      flashcardId: "card-chart-1",
      state: "review",
      dueAt: new Date("2026-09-05T00:00:00Z").toISOString(),
      interval: 5,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      lastReviewedAt: new Date("2026-09-01T00:00:00Z").toISOString(),
      updatedAt: new Date("2026-09-01T00:00:00Z").toISOString(),
    },
  };

  const mockReviews: FlashcardReview[] = [
    {
      id: "r1",
      clientEventId: "e1",
      flashcardId: "card-chart-1",
      topicId: "topic-1",
      rating: 3,
      reviewDurationMs: 5000,
      reviewedAt: new Date("2026-09-01T00:00:00Z").toISOString(),
      stateBefore: "learning",
      stateAfter: "review",
      intervalBefore: 1,
      intervalAfter: 5,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBeforeAt: new Date("2026-09-01T00:00:00Z").toISOString(),
      dueAfterAt: new Date("2026-09-06T00:00:00Z").toISOString(),
    },
  ];

  it("renders empty state when neither card nor points are provided", () => {
    render(<RetentionPredictionChart />);
    expect(
      screen.getByText(/Chưa có dữ liệu dự báo suy giảm trí nhớ/i)
    ).toBeInTheDocument();
  });

  it("renders SVG chart with forgetting curve, confidence bands, and threshold line", () => {
    render(<RetentionPredictionChart card={mockCard} reviews={mockReviews} />);

    expect(screen.getByTestId("retention-prediction-chart")).toBeInTheDocument();
    expect(screen.getByTestId("main-curve-path")).toBeInTheDocument();
    expect(screen.getByTestId("ci80-band")).toBeInTheDocument();
    expect(screen.getByTestId("ci95-band")).toBeInTheDocument();
    expect(screen.getByTestId("target-threshold-line")).toBeInTheDocument();
    expect(screen.getByTestId("optimal-point-marker")).toBeInTheDocument();
  });

  it("renders horizon pills for 1d, 3d, 7d, 14d, 30d", () => {
    render(
      <RetentionPredictionChart
        card={mockCard}
        reviews={mockReviews}
        showHorizonPills={true}
      />
    );

    expect(screen.getByTestId("horizon-pills-container")).toBeInTheDocument();
    expect(screen.getByText(/Sau 1 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/Sau 3 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/Sau 7 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/Sau 14 ngày/i)).toBeInTheDocument();
    expect(screen.getByText(/Sau 30 ngày/i)).toBeInTheDocument();
  });

  it("renders legend when showLegend is true", () => {
    render(
      <RetentionPredictionChart
        card={mockCard}
        reviews={mockReviews}
        showLegend={true}
      />
    );

    expect(screen.getByText(/Đường dự báo suy giảm/i)).toBeInTheDocument();
    expect(screen.getByText(/Khoảng tin cậy 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/Khoảng tin cậy 95%/i)).toBeInTheDocument();
    expect(screen.getByText(/Điểm nên ôn lại/i)).toBeInTheDocument();
  });

  it("shows tooltip on point hover", () => {
    const { container } = render(
      <RetentionPredictionChart card={mockCard} reviews={mockReviews} />
    );

    // Hoverable invisible rects have class cursor-pointer
    const rects = container.querySelectorAll("rect.cursor-pointer");
    expect(rects.length).toBeGreaterThan(0);

    // Hover over the 5th day point rect
    fireEvent.mouseEnter(rects[5]);

    expect(screen.getByTestId("chart-tooltip")).toBeInTheDocument();
    expect(screen.getByText(/Ngày thứ 5/i)).toBeInTheDocument();

    // Mouse leave removes tooltip
    fireEvent.mouseLeave(rects[5]);
    expect(screen.queryByTestId("chart-tooltip")).not.toBeInTheDocument();
  });
});
