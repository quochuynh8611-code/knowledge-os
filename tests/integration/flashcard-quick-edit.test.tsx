/**
 * Integration Tests: Quick Edit Modal & In-place Updates (Phase F6.11 Task 3)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardCardView } from "../../src/components/flashcards/FlashcardCardView";
import { FlashcardFormModal } from "../../src/components/modals/FlashcardFormModal";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [
  { id: "topic-1", title: "Phật Pháp Căn Bản" },
  { id: "topic-2", title: "Bát Nhã Ba La Mật" },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {},
  }),
}));

describe("Phase F6.11 Task 3: Quick Edit Modal & In-Place Updates", () => {
  const mockCard: Flashcard = {
    id: "card-edit-1",
    topicId: "topic-1",
    type: "basic",
    front: "Câu hỏi ban đầu?",
    back: "Đáp án ban đầu.",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "sch-1",
      flashcardId: "card-edit-1",
      state: "review",
      dueAt: new Date().toISOString(),
      interval: 3,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      updatedAt: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("FlashcardCardView Edit Button", () => {
    it("renders edit button when onEdit is provided and does not flip card when clicked", () => {
      const onFlipMock = vi.fn();
      const onEditMock = vi.fn();

      render(
        <FlashcardCardView
          card={mockCard}
          isFlipped={false}
          onFlip={onFlipMock}
          onEdit={onEditMock}
        />
      );

      const editBtn = screen.getByTestId("btn-quick-edit-card");
      expect(editBtn).toBeInTheDocument();

      fireEvent.click(editBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
      // Ensure stopPropagation prevented onFlip from firing
      expect(onFlipMock).not.toHaveBeenCalled();
    });
  });

  describe("FlashcardFormModal in Edit Mode", () => {
    it("pre-fills form with editingCard data and calls updateFlashcard on submit", async () => {
      const updateFlashcardMock = vi.fn().mockResolvedValue({
        ...mockCard,
        front: "Câu hỏi đã sửa?",
        back: "Đáp án đã sửa.",
      });
      const onCloseMock = vi.fn();
      const onSuccessMock = vi.fn();

      render(
        <FlashcardFormModal
          isOpen={true}
          onClose={onCloseMock}
          onSuccess={onSuccessMock}
          editingCard={mockCard}
          dataRepository={{
            updateFlashcard: updateFlashcardMock,
          }}
        />
      );

      expect(screen.getByText("Chỉnh Sửa Flashcard")).toBeInTheDocument();

      const frontInput = screen.getByDisplayValue("Câu hỏi ban đầu?");
      const backInput = screen.getByDisplayValue("Đáp án ban đầu.");

      fireEvent.change(frontInput, { target: { value: "Câu hỏi đã sửa?" } });
      fireEvent.change(backInput, { target: { value: "Đáp án đã sửa." } });

      const submitBtn = screen.getByTestId("btn-submit-flashcard");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(updateFlashcardMock).toHaveBeenCalledWith("card-edit-1", {
          topicId: "topic-1",
          noteId: null,
          resourceId: null,
          type: "basic",
          front: "Câu hỏi đã sửa?",
          back: "Đáp án đã sửa.",
        });
        expect(onSuccessMock).toHaveBeenCalledWith(
          expect.objectContaining({
            front: "Câu hỏi đã sửa?",
            back: "Đáp án đã sửa.",
          })
        );
        expect(onCloseMock).toHaveBeenCalled();
      });
    });
  });

  describe("FlashcardReviewStudio Quick Edit Integration & Keyboard Shortcut", () => {
    it("opens edit modal on Ctrl+E and updates card in-place without resetting session", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
        if (url.includes("/api/flashcards/due")) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockCard],
          });
        }
        if (options?.method === "PUT" && url.includes("/api/flashcards/card-edit-1")) {
          const body = JSON.parse(options.body);
          return Promise.resolve({
            ok: true,
            json: async () => ({
              ...mockCard,
              front: body.front,
              back: body.back,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<FlashcardReviewStudio />);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Câu hỏi ban đầu?")).toBeInTheDocument();
      });

      // Press Ctrl+E
      fireEvent.keyDown(window, { key: "e", ctrlKey: true });

      // Modal should open
      await waitFor(() => {
        expect(screen.getByText("Chỉnh Sửa Flashcard")).toBeInTheDocument();
      });

      // Change front content
      const frontInput = screen.getByDisplayValue("Câu hỏi ban đầu?");
      fireEvent.change(frontInput, { target: { value: "Nội dung mới sau chỉnh sửa!" } });

      // Click submit
      const saveBtn = screen.getByTestId("btn-submit-flashcard");
      fireEvent.click(saveBtn);

      // Verify in-place update on review screen
      await waitFor(() => {
        expect(screen.getByText("Nội dung mới sau chỉnh sửa!")).toBeInTheDocument();
        expect(screen.queryByText("Chỉnh Sửa Flashcard")).not.toBeInTheDocument();
      });

      // Verify queue progress is still 1 / 1 (not reset or disrupted)
      expect(screen.getByTestId("queue-progress")).toHaveTextContent("1 / 1");
    });
  });
});
