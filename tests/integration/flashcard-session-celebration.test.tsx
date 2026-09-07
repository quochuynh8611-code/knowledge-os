/**
 * Integration Tests: Flashcard Session Complete Celebration (Phase F6.11 Task 6)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import confetti from "canvas-confetti";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [
  { id: "topic-p1", title: "Thiền Tứ Niệm Xứ" },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {},
  }),
}));

describe("Phase F6.11 Task 6: Session Complete Celebration", () => {
  const mockCards: Flashcard[] = [
    {
      id: "card-cel-1",
      topicId: "topic-p1",
      type: "basic",
      front: "Thân quán niệm xứ là gì?",
      back: "Quán sát hơi thở vào ra, các tư thế thân thể.",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-cel-1",
        flashcardId: "card-cel-1",
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
      id: "card-cel-2",
      topicId: "topic-p1",
      type: "basic",
      front: "Tâm quán niệm xứ là gì?",
      back: "Nhận biết tâm có tham, sân, si hay không tham, sân, si.",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-cel-2",
        flashcardId: "card-cel-2",
        state: "review",
        dueAt: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.4,
        repetitions: 1,
        lapses: 1,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers confetti and displays complete stats summary and rating breakdown", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCards,
        });
      }
      if (opts?.method === "POST" && url.includes("/api/flashcards/review")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const onCloseMock = vi.fn();

    render(
      <FlashcardReviewStudio
        topicId="topic-p1"
        onClose={onCloseMock}
      />
    );

    // Wait for card 1 to load
    await waitFor(() => {
      expect(screen.getByText("Thân quán niệm xứ là gì?")).toBeInTheDocument();
    });

    // Card 1: Flip & Rate 3 (Good)
    fireEvent.click(screen.getByTestId("flashcard-card"));
    fireEvent.click(screen.getByTestId("rating-btn-3"));

    // Card 2: Wait to appear, Flip & Rate 1 (Again)
    await waitFor(() => {
      expect(screen.getByText("Tâm quán niệm xứ là gì?")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("flashcard-card"));
    fireEvent.click(screen.getByTestId("rating-btn-1"));

    // Verify confetti animation was triggered
    await waitFor(() => {
      expect(confetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 80,
          spread: 80,
        })
      );
    });

    // Verify celebration view appeared
    expect(screen.getByTestId("session-completed-view")).toBeInTheDocument();
    expect(screen.getByText(/Hoàn thành phiên ôn tập cho "Thiền Tứ Niệm Xứ"!/i)).toBeInTheDocument();

    // Verify KPI stats (total = 2, 1 Good out of 2 = 50% correct rate)
    expect(screen.getByTestId("celebration-stat-total")).toHaveTextContent("2");
    expect(screen.getByTestId("celebration-stat-correct-rate")).toHaveTextContent("50%");
    expect(screen.getByTestId("celebration-stat-time")).toBeInTheDocument();

    // Verify breakdown: 1 Again, 0 Hard, 1 Good, 0 Easy
    expect(screen.getByTestId("breakdown-rating-1")).toHaveTextContent("1");
    expect(screen.getByTestId("breakdown-rating-2")).toHaveTextContent("0");
    expect(screen.getByTestId("breakdown-rating-3")).toHaveTextContent("1");
    expect(screen.getByTestId("breakdown-rating-4")).toHaveTextContent("0");

    // Verify Export CSV button opens modal
    const exportBtn = screen.getByTestId("btn-export-completed-session");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Xuất dữ liệu ôn tập CSV" })).toBeInTheDocument();
      expect(screen.getByTestId("session-reviews-count")).toHaveTextContent("2 lượt");
    });

    // Close export modal
    fireEvent.click(screen.getByTestId("btn-close-export-modal"));

    // Test Exit button
    const exitBtn = screen.getByTestId("btn-exit-session");
    fireEvent.click(exitBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("resets celebration state when clicking 'Ôn tập lại'", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => [mockCards[0]],
        });
      }
      if (opts?.method === "POST" && url.includes("/api/flashcards/review")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);

    await waitFor(() => {
      expect(screen.getByText("Thân quán niệm xứ là gì?")).toBeInTheDocument();
    });

    // Flip & Rate
    fireEvent.click(screen.getByTestId("flashcard-card"));
    fireEvent.click(screen.getByTestId("rating-btn-4")); // Easy

    // Celebration screen should appear
    await waitFor(() => {
      expect(screen.getByTestId("session-completed-view")).toBeInTheDocument();
      expect(screen.getByTestId("celebration-stat-correct-rate")).toHaveTextContent("100%");
    });

    // Click "Ôn tập lại"
    const reviewAgainBtn = screen.getByTestId("btn-review-again");
    fireEvent.click(reviewAgainBtn);

    // Queue reloads and celebration view disappears
    await waitFor(() => {
      expect(screen.queryByTestId("session-completed-view")).not.toBeInTheDocument();
      expect(screen.getByTestId("queue-progress")).toHaveTextContent("1 / 1");
    });
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});
