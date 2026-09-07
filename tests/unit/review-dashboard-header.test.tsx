/**
 * Unit Tests: ReviewDashboardHeader Component (Phase F6.11)
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewDashboardHeader } from "../../src/components/flashcards/ReviewDashboardHeader";
import type { FlashcardProgressStats } from "../../src/types/flashcard";

describe("ReviewDashboardHeader Component", () => {
  it("renders 4 KPI metrics correctly from stats object", () => {
    const mockStats: FlashcardProgressStats = {
      totalCards: 50,
      newCards: 12,
      learningCards: 8,
      reviewCards: 30,
      dueToday: 15,
      retentionRate: 85,
      streakDays: 7,
    };

    render(<ReviewDashboardHeader stats={mockStats} />);

    expect(screen.getByTestId("review-dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("value-due-today")).toHaveTextContent("15");
    expect(screen.getByTestId("value-new-cards")).toHaveTextContent("12");
    expect(screen.getByTestId("value-retention-rate")).toHaveTextContent("85%");
    expect(screen.getByTestId("value-streak-days")).toHaveTextContent("7");
  });

  it("renders metrics provided via explicit props", () => {
    render(
      <ReviewDashboardHeader
        dueToday={5}
        newCards={20}
        retentionRate={92}
        streakDays={14}
      />
    );

    expect(screen.getByTestId("value-due-today")).toHaveTextContent("5");
    expect(screen.getByTestId("value-new-cards")).toHaveTextContent("20");
    expect(screen.getByTestId("value-retention-rate")).toHaveTextContent("92%");
    expect(screen.getByTestId("value-streak-days")).toHaveTextContent("14");
  });

  it("renders skeleton loading state when loading=true", () => {
    render(<ReviewDashboardHeader loading={true} />);

    expect(
      screen.getByTestId("review-dashboard-header-skeleton")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("review-dashboard-header")).not.toBeInTheDocument();
  });
});
