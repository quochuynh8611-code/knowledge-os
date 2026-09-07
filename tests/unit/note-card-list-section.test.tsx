import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NoteCardListSection } from "../../src/components/notes/NoteCardListSection";
import type { Flashcard } from "../../src/types/flashcard";

const mockCards: Flashcard[] = [
  {
    id: "card-1",
    topicId: "topic-1",
    noteId: "note-123",
    type: "basic",
    front: "Định nghĩa Kinh Bát Nhã Ba La Mật Đa",
    back: "Trí tuệ viên mãn thấu suốt thực tại",
    lifecycleStatus: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    schedule: {
      id: "sch-1",
      flashcardId: "card-1",
      state: "review",
      dueAt: "2026-01-05T00:00:00.000Z",
      interval: 5,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  },
  {
    id: "card-2",
    topicId: "topic-1",
    noteId: "note-123",
    type: "cloze",
    front: "Tướng không của các pháp: {{c1::không sinh}} không diệt",
    back: "không sinh",
    lifecycleStatus: "active",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    schedule: {
      id: "sch-2",
      flashcardId: "card-2",
      state: "new",
      dueAt: "2026-01-02T00:00:00.000Z",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  },
];

describe("Phase F6.10: US4 — NoteCardListSection Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NoteCardListSection.clearCache?.();
  });

  it("fetches and displays flashcards filtered by noteId when rendered", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCards,
    } as Response);

    render(<NoteCardListSection noteId="note-123" />);

    expect(screen.getByTestId("note-card-list-section")).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards?noteId=note-123")
      );
      expect(screen.getByText(/Định nghĩa Kinh Bát Nhã/i)).toBeInTheDocument();
      expect(screen.getByText(/Tướng không của các pháp/i)).toBeInTheDocument();
    });
  });

  it("renders clean empty state with CTA when note has 0 linked flashcards", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const onCreateCardClick = vi.fn();
    render(
      <NoteCardListSection
        noteId="note-empty"
        onCreateCardClick={onCreateCardClick}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/chưa có thẻ nào được tạo từ ghi chú này/i)
      ).toBeInTheDocument();
      const ctaBtn = screen.getByRole("button", {
        name: /tạo thẻ đầu tiên/i,
      });
      expect(ctaBtn).toBeInTheDocument();
      fireEvent.click(ctaBtn);
      expect(onCreateCardClick).toHaveBeenCalled();
    });
  });

  it("renders card items with type badge (basic/cloze), front preview, and repetition count", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCards,
    } as Response);

    render(<NoteCardListSection noteId="note-123" />);

    await waitFor(() => {
      expect(screen.getByText("Basic")).toBeInTheDocument();
      expect(screen.getByText("Cloze")).toBeInTheDocument();
      expect(screen.getByText(/3 lần/i)).toBeInTheDocument();
      expect(screen.getByText(/0 lần/i)).toBeInTheDocument();
    });
  });

  it("clicking a flashcard opens review/detail or calls onSelectCard callback", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCards,
    } as Response);

    const onSelectCard = vi.fn();
    render(
      <NoteCardListSection noteId="note-123" onSelectCard={onSelectCard} />
    );

    await waitFor(() => {
      const cardItem = screen.getByTestId("note-card-item-card-1");
      expect(cardItem).toBeInTheDocument();
      fireEvent.click(cardItem);
      expect(onSelectCard).toHaveBeenCalledWith(mockCards[0]);
    });
  });

  it("handles API error gracefully without crashing NoteReaderModal", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Lỗi kết nối cơ sở dữ liệu"));

    render(<NoteCardListSection noteId="note-123" />);

    await waitFor(() => {
      expect(
        screen.getByText(/không tải được danh sách thẻ nhớ/i)
      ).toBeInTheDocument();
    });
  });

  it("lazy loads and caches results for 5 minutes", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCards,
    } as Response);
    global.fetch = fetchSpy;

    // First render: calls fetch
    const { unmount } = render(<NoteCardListSection noteId="note-123" />);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Second render within 5 minutes: uses cached data
    render(<NoteCardListSection noteId="note-123" />);
    await waitFor(() => {
      expect(screen.getByText(/Định nghĩa Kinh Bát Nhã/i)).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
