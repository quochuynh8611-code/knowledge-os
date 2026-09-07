import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NoteReaderModal } from "../../src/components/modals/NoteReaderModal";
import type { Note } from "../../src/types";

const mockNote: Note = {
  id: "note-123",
  topicId: "topic-456",
  title: "Ghi chú khảo cứu ngũ hành",
  content: "Đoạn văn bản khảo cứu ngũ hành tương sinh tương khắc trong kinh điển.",
  type: "study",
  isPrivate: false,
  tags: ["triết-học"],
  createdAt: new Date().toISOString() as any,
  updatedAt: new Date().toISOString() as any,
};

const mockCreateFlashcard = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: [{ id: "topic-456", title: "Ngũ Hành", categoryId: "cat-1" }],
    notes: [mockNote],
    resources: [],
    openTopicDetail: vi.fn(),
    dataRepository: {
      createFlashcard: mockCreateFlashcard,
    },
  }),
}));

describe("Phase F6.10: US1 — Note Selection to FlashcardFormModal Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockSelection = (text: string) => {
    const mockRange = {
      getBoundingClientRect: () => ({
        top: 200,
        left: 300,
        width: 100,
        height: 24,
        bottom: 224,
        right: 400,
      }),
    };

    const mockSelection = {
      isCollapsed: false,
      rangeCount: 1,
      toString: () => text,
      getRangeAt: () => mockRange,
      removeAllRanges: vi.fn(),
    };

    vi.spyOn(window, "getSelection").mockReturnValue(mockSelection as any);
  };

  it("clicking 'Tạo thẻ' from popover opens FlashcardFormModal with front pre-filled, topicId and noteId bound", async () => {
    render(
      <NoteReaderModal
        isOpen={true}
        note={mockNote}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    // 1. Simulate user selecting text inside reader
    setupMockSelection("ngũ hành tương sinh");
    fireEvent.mouseUp(document);

    // 2. Expect TextSelectionPopover to appear
    const createBtn = await screen.findByRole("button", { name: /tạo thẻ nhớ/i });
    expect(createBtn).toBeInTheDocument();

    // 3. Click button to open FlashcardFormModal
    fireEvent.click(createBtn);

    // 4. Expect FlashcardFormModal to open with pre-filled values
    await waitFor(() => {
      expect(screen.getByTestId("flashcard-form-modal")).toBeInTheDocument();
      const frontInput = screen.getByTestId("input-front") as HTMLTextAreaElement;
      expect(frontInput.value).toBe("ngũ hành tương sinh");

      const topicSelect = screen.getByTestId("select-topic") as HTMLSelectElement;
      expect(topicSelect.value).toBe("topic-456");

      const noteSelect = screen.getByTestId("select-note") as HTMLSelectElement;
      expect(noteSelect.value).toBe("note-123");
    });
  });

  it("supports keyboard shortcut (Alt+F) to capture current text selection and trigger flashcard modal", async () => {
    render(
      <NoteReaderModal
        isOpen={true}
        note={mockNote}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    // 1. Setup selection
    setupMockSelection("kinh điển tương khắc");

    // 2. Trigger Alt+F shortcut
    fireEvent.keyDown(window, { key: "f", altKey: true });

    // 3. Modal opens directly with captured selection
    await waitFor(() => {
      expect(screen.getByTestId("flashcard-form-modal")).toBeInTheDocument();
      const frontInput = screen.getByTestId("input-front") as HTMLTextAreaElement;
      expect(frontInput.value).toBe("kinh điển tương khắc");
    });
  });
});
