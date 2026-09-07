/**
 * Integration Tests: SRS Algorithm Tuning (Phase F6.12)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [{ id: "topic-1", title: "Thực vật học" }];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {},
  }),
}));

describe("Phase F6.12: SRS Algorithm Tuning Integration", () => {
  const mockCards: Flashcard[] = [
    {
      id: "card-easy",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ dễ 1",
      back: "Đáp án dễ",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-1",
        flashcardId: "card-easy",
        state: "review",
        dueAt: new Date(Date.now() + 86400000 * 5).toISOString(), // due in 5 days
        interval: 10,
        easeFactor: 3.2,
        repetitions: 5,
        lapses: 0,
        retentionRate: 0.95,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: "card-hard-overdue",
      topicId: "topic-1",
      type: "basic",
      front: "Thẻ khó quá hạn",
      back: "Đáp án khó",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-2",
        flashcardId: "card-hard-overdue",
        state: "review",
        dueAt: new Date(Date.now() - 86400000 * 4).toISOString(), // 4 days overdue
        interval: 1,
        easeFactor: 1.5,
        repetitions: 1,
        lapses: 3,
        retentionRate: 0.5,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/reviews")) {
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockCards,
        });
      })
    );
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders Exam Countdown toolbar and handles toggling Retention Curve chart", async () => {
    render(
      <FlashcardReviewStudio
        topicId="topic-1"
        initialQueue={mockCards}
      />
    );

    // Verify Exam Countdown Toolbar is rendered
    expect(screen.getByTestId("exam-countdown-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("btn-toggle-retention-curve")).toBeInTheDocument();
    expect(screen.getByTestId("btn-open-ab-testing")).toBeInTheDocument();

    // Chart should be hidden initially
    expect(screen.queryByTestId("retention-curve-chart")).not.toBeInTheDocument();

    // Toggle Retention Curve Chart
    const curveBtn = screen.getByTestId("btn-toggle-retention-curve");
    fireEvent.click(curveBtn);

    // Chart should now be visible
    expect(screen.getByTestId("retention-curve-chart")).toBeInTheDocument();

    // Toggle it off
    fireEvent.click(curveBtn);
    expect(screen.queryByTestId("retention-curve-chart")).not.toBeInTheDocument();
  });

  it("opens and closes the A/B Testing modal", async () => {
    render(
      <FlashcardReviewStudio
        topicId="topic-1"
        initialQueue={mockCards}
      />
    );

    const abBtn = screen.getByTestId("btn-open-ab-testing");
    fireEvent.click(abBtn);

    // Modal is opened
    expect(screen.getByTestId("srs-variant-comparison-modal")).toBeInTheDocument();
    expect(screen.getByTestId("metric-variant-a-retention")).toBeInTheDocument();
    expect(screen.getByTestId("metric-variant-b-retention")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByTestId("btn-close-modal");
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId("srs-variant-comparison-modal")).not.toBeInTheDocument();
  });

  it("prioritizes hard and overdue cards when Smart Priority Queue is toggled", async () => {
    render(
      <FlashcardReviewStudio
        topicId="topic-1"
        initialQueue={mockCards}
      />
    );

    // Initial order: mockCards[0] is 'Thẻ dễ 1'
    expect(screen.getByText("Thẻ dễ 1")).toBeInTheDocument();

    // Toggle Smart Priority Queue
    const toggleBtn = screen.getByTestId("btn-toggle-smart-queue");
    fireEvent.click(toggleBtn);

    // Now 'Thẻ khó quá hạn' has much higher priority score and should be first
    await waitFor(() => {
      expect(screen.getByText("Thẻ khó quá hạn")).toBeInTheDocument();
    });
  });
});
