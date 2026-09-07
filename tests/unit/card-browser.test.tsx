import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CardBrowser } from "../../src/components/flashcards/CardBrowser";
import { useData } from "../../src/context/DataContext";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("../../src/context/DataContext", () => ({
  useData: vi.fn(),
}));

const mockCards: Flashcard[] = [
  {
    id: "c-1",
    topicId: "topic-1",
    type: "basic",
    front: "Thận tạng tinh là gì?",
    back: "Lưu giữ chân âm chân dương của cơ thể",
    lifecycleStatus: "active",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    schedule: {
      id: "s-1",
      flashcardId: "c-1",
      state: "review",
      dueAt: "2026-09-05T00:00:00.000Z",
      interval: 4,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
  },
  {
    id: "c-2",
    topicId: "topic-1",
    type: "cloze",
    front: "Tâm chủ về {{c1::thần minh}}",
    back: "thần minh",
    lifecycleStatus: "active",
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    schedule: {
      id: "s-2",
      flashcardId: "c-2",
      state: "learning",
      dueAt: "2026-09-06T00:00:00.000Z",
      interval: 1,
      easeFactor: 1.8,
      repetitions: 1,
      lapses: 3,
      updatedAt: "2026-09-02T00:00:00.000Z",
    },
  },
  {
    id: "c-3",
    topicId: "topic-2",
    type: "basic",
    front: "Tứ Diệu Đế",
    back: "Khổ, Tập, Diệt, Đạo",
    lifecycleStatus: "suspended",
    createdAt: "2026-09-03T00:00:00.000Z",
    updatedAt: "2026-09-03T00:00:00.000Z",
    schedule: {
      id: "s-3",
      flashcardId: "c-3",
      state: "new",
      dueAt: "2026-09-10T00:00:00.000Z",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      updatedAt: "2026-09-03T00:00:00.000Z",
    },
  },
];

describe("Phase F6.5 — Card Browser Component (CardBrowser.tsx)", () => {
  const mockOnViewHistory = vi.fn();
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useData as any).mockReturnValue({
      topics: [
        { id: "topic-1", title: "Đông Y & Kinh Lạc" },
        { id: "topic-2", title: "Phật Học Nguyên Thủy" },
      ],
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("1. renders search bar, filters toolbar, and card table rows", async () => {
    render(
      <CardBrowser
        initialCards={mockCards}
        onViewHistory={mockOnViewHistory}
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByTestId("input-card-search")).toBeInTheDocument();
    expect(screen.getByTestId("select-filter-state")).toBeInTheDocument();
    expect(screen.getByTestId("select-filter-lifecycle")).toBeInTheDocument();
    expect(screen.getByTestId("select-filter-due")).toBeInTheDocument();
    expect(screen.getByTestId("checkbox-filter-weak")).toBeInTheDocument();
    expect(screen.getByTestId("select-card-sort")).toBeInTheDocument();

    // Check rows rendered
    expect(screen.getByTestId("card-row-c-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-row-c-2")).toBeInTheDocument();
    expect(screen.getByTestId("card-row-c-3")).toBeInTheDocument();
  });

  it("2. filters table in real-time when typing in search bar", async () => {
    render(<CardBrowser initialCards={mockCards} />);

    const searchInput = screen.getByTestId("input-card-search");
    fireEvent.change(searchInput, { target: { value: "Tứ Diệu Đế" } });

    expect(screen.getByTestId("card-row-c-3")).toBeInTheDocument();
    expect(screen.queryByTestId("card-row-c-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-row-c-2")).not.toBeInTheDocument();
  });

  it("3. filters table by lifecycleStatus dropdown", async () => {
    render(<CardBrowser initialCards={mockCards} />);

    const lifecycleSelect = screen.getByTestId("select-filter-lifecycle");
    fireEvent.change(lifecycleSelect, { target: { value: "suspended" } });

    expect(screen.getByTestId("card-row-c-3")).toBeInTheDocument();
    expect(screen.queryByTestId("card-row-c-1")).not.toBeInTheDocument();
  });

  it("4. selects individual cards and triggers bulk action bar", async () => {
    render(<CardBrowser initialCards={mockCards} />);

    // Initially bulk action bar is not visible
    expect(screen.queryByTestId("bulk-action-bar")).not.toBeInTheDocument();

    // Select first card
    const cb1 = screen.getByTestId("checkbox-select-card-c-1");
    fireEvent.click(cb1);

    // Bulk bar appears
    expect(await screen.findByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("1");
    expect(screen.getByTestId("btn-bulk-suspend")).toBeInTheDocument();
    expect(screen.getByTestId("btn-bulk-archive")).toBeInTheDocument();

    // Select second card
    const cb2 = screen.getByTestId("checkbox-select-card-c-2");
    fireEvent.click(cb2);
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("2");
  });

  it("5. clicking 'Select All' selects all visible cards", async () => {
    render(<CardBrowser initialCards={mockCards} />);

    const selectAllCb = screen.getByTestId("checkbox-select-all");
    fireEvent.click(selectAllCb);

    expect(await screen.findByTestId("bulk-action-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bulk-selected-count")).toHaveTextContent("3");
  });

  it("6. bulk action opens confirmation modal before applying mutation", async () => {
    render(<CardBrowser initialCards={mockCards} />);

    // Select card 1
    fireEvent.click(screen.getByTestId("checkbox-select-card-c-1"));

    // Click Suspend in bulk bar
    fireEvent.click(screen.getByTestId("btn-bulk-suspend"));

    // Confirmation modal opens
    expect(await screen.findByTestId("modal-card-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("btn-confirm-action")).toBeInTheDocument();
    expect(screen.getByTestId("btn-cancel-action")).toBeInTheDocument();
  });

  it("7. clicking history button invokes onViewHistory callback", async () => {
    render(
      <CardBrowser
        initialCards={mockCards}
        onViewHistory={mockOnViewHistory}
      />
    );

    const historyBtn = screen.getByTestId("btn-view-history-c-1");
    fireEvent.click(historyBtn);

    expect(mockOnViewHistory).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c-1" })
    );
  });
});
