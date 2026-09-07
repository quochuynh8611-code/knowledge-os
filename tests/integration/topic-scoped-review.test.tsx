import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [
  { id: "topic-dong-y-1", title: "Đông Y & Kinh Lạc Học" },
  { id: "topic-phat-hoc-2", title: "Phật Học Cơ Bản" },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    categories: [],
  }),
}));

const mockDongYCards: Flashcard[] = [
  {
    id: "card-dy-001",
    front: "Thập Nhị Kinh Lạc là gì?",
    back: "12 đường kinh chính vận hành khí huyết",
    type: "basic",
    topicId: "topic-dong-y-1",
    noteId: null,
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "sch-1",
      flashcardId: "card-dy-001",
      state: "new",
      dueAt: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      lastReviewedAt: null,
      updatedAt: new Date().toISOString(),
    },
  },
];

describe("Phase F6.4 — Scoped Review Studio Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. calls /api/flashcards/due with exact topicId filter when topicId is provided", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDongYCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio topicId="topic-dong-y-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/due?topicId=topic-dong-y-1")
      );
    });

    expect(await screen.findByText("Thập Nhị Kinh Lạc là gì?")).toBeInTheDocument();
  });

  it("2. displays topic title context in review header badge", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDongYCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio topicId="topic-dong-y-1" />);

    const topicBadge = await screen.findByTestId("review-topic-context");
    expect(topicBadge).toBeInTheDocument();
    expect(topicBadge).toHaveTextContent("Đông Y & Kinh Lạc Học");
  });

  it("3. displays topic-scoped empty state when no cards are due for this topic", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<FlashcardReviewStudio topicId="topic-dong-y-1" />);

    expect(await screen.findByTestId("empty-queue-state")).toBeInTheDocument();
    expect(screen.getByText(/Không có thẻ cần ôn cho chủ đề này/i)).toBeInTheDocument();
  });

  it("4. clicking Close button invokes onClose callback returning to topic detail", async () => {
    const handleClose = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDongYCards,
    });

    render(<FlashcardReviewStudio topicId="topic-dong-y-1" onClose={handleClose} />);
    await screen.findByText("Thập Nhị Kinh Lạc là gì?");

    const closeBtn = screen.getByTestId("btn-close-review");
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("5. preserves global all-topics review when topicId is undefined", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDongYCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/flashcards/due");
    });
    expect(screen.queryByTestId("review-topic-context")).not.toBeInTheDocument();
  });
});
