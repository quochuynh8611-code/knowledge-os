import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardFormModal } from "../../src/components/modals/FlashcardFormModal";

// Mock DataContext
const mockTopics = [
  { id: "topic-1", title: "Bát Nhã Tâm Kinh", categoryId: "cat-1" },
  { id: "topic-2", title: "Trung Quán Luận", categoryId: "cat-1" },
];
const mockNotes = [
  { id: "note-1", topicId: "topic-1", title: "Ghi chú Không Tánh" },
];
const mockResources = [
  { id: "res-1", topicId: "topic-1", title: "Kinh Bát Nhã PDF" },
];

const mockCreateFlashcard = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    dataRepository: {
      createFlashcard: mockCreateFlashcard,
    },
  }),
}));

describe("FlashcardFormModal — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFlashcard.mockResolvedValue({
      id: "fc-123",
      topicId: "topic-1",
      front: "Không là gì?",
      back: "Sắc tức thị không",
      type: "basic",
    });
  });

  it("renders all form elements when open", () => {
    render(
      <FlashcardFormModal isOpen={true} onClose={vi.fn()} />
    );

    expect(screen.getByTestId("flashcard-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("select-topic")).toBeInTheDocument();
    expect(screen.getByTestId("type-toggle-basic")).toBeInTheDocument();
    expect(screen.getByTestId("type-toggle-cloze")).toBeInTheDocument();
    expect(screen.getByTestId("input-front")).toBeInTheDocument();
    expect(screen.getByTestId("input-back")).toBeInTheDocument();
    expect(screen.getByTestId("btn-submit-flashcard")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(
      <FlashcardFormModal isOpen={false} onClose={vi.fn()} />
    );

    expect(screen.queryByTestId("flashcard-form-modal")).not.toBeInTheDocument();
  });

  it("validates topic bắt buộc (shows error when topic is not selected)", async () => {
    const user = userEvent.setup();
    render(
      <FlashcardFormModal isOpen={true} onClose={vi.fn()} />
    );

    // Front & back filled, but topic left unselected
    await user.type(screen.getByTestId("input-front"), "Câu hỏi mẫu");
    await user.type(screen.getByTestId("input-back"), "Câu trả lời mẫu");
    await user.click(screen.getByTestId("btn-submit-flashcard"));

    expect(screen.getByTestId("error-topic")).toBeInTheDocument();
    expect(mockCreateFlashcard).not.toHaveBeenCalled();
  });

  it("validates front bắt buộc (shows error when front is empty)", async () => {
    const user = userEvent.setup();
    render(
      <FlashcardFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
    );

    await user.type(screen.getByTestId("input-back"), "Câu trả lời mẫu");
    await user.click(screen.getByTestId("btn-submit-flashcard"));

    expect(screen.getByTestId("error-front")).toBeInTheDocument();
    expect(mockCreateFlashcard).not.toHaveBeenCalled();
  });

  it("validates back bắt buộc (shows error when back is empty)", async () => {
    const user = userEvent.setup();
    render(
      <FlashcardFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
    );

    await user.type(screen.getByTestId("input-front"), "Câu hỏi mẫu");
    await user.click(screen.getByTestId("btn-submit-flashcard"));

    expect(screen.getByTestId("error-back")).toBeInTheDocument();
    expect(mockCreateFlashcard).not.toHaveBeenCalled();
  });

  it("creates a basic card successfully when all required fields are valid", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        defaultTopicId="topic-1"
      />
    );

    await user.type(screen.getByTestId("input-front"), "Sắc tức thị gì?");
    await user.type(screen.getByTestId("input-back"), "Không");
    await user.click(screen.getByTestId("btn-submit-flashcard"));

    await waitFor(() => {
      expect(mockCreateFlashcard).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: "topic-1",
          type: "basic",
          front: "Sắc tức thị gì?",
          back: "Không",
        })
      );
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("validates cloze card: rejects when cloze pattern is missing", async () => {
    const user = userEvent.setup();
    render(
      <FlashcardFormModal isOpen={true} onClose={vi.fn()} defaultTopicId="topic-1" />
    );

    // Switch to cloze
    await user.click(screen.getByTestId("type-toggle-cloze"));
    await user.type(screen.getByTestId("input-front"), "Sắc tức thị không (không có ngoặc nhọn)");
    await user.type(screen.getByTestId("input-back"), "Không");
    await user.click(screen.getByTestId("btn-submit-flashcard"));

    expect(screen.getByTestId("error-front")).toBeInTheDocument();
    expect(screen.getByTestId("error-front").textContent).toMatch(/cloze/i);
    expect(mockCreateFlashcard).not.toHaveBeenCalled();
  });

  it("creates a cloze card successfully when cloze pattern is present", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        defaultTopicId="topic-1"
      />
    );

    await user.click(screen.getByTestId("type-toggle-cloze"));
    fireEvent.change(screen.getByTestId("input-front"), {
      target: { value: "Sắc tức thị {{c1::không}}" },
    });
    await user.type(screen.getByTestId("input-back"), "không");
    await user.click(screen.getByTestId("btn-submit-flashcard"));


    await waitFor(() => {
      expect(mockCreateFlashcard).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: "topic-1",
          type: "cloze",
          front: "Sắc tức thị {{c1::không}}",
          back: "không",
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("automatically selects cloze tab and generates question prompt when initialized with cloze text", () => {
    render(
      <FlashcardFormModal
        isOpen={true}
        onClose={vi.fn()}
        defaultTopicId="topic-1"
        {...({ initialFront: "This is {{c1::A}} test" } as any)}
      />
    );

    // Tab cloze must be active
    const clozeTab = screen.getByTestId("type-toggle-cloze");
    expect(clozeTab.className).toContain("text-amber-800");

    // Front input must be pre-filled with the cloze text
    const frontInput = screen.getByTestId("input-front") as HTMLTextAreaElement;
    expect(frontInput.value).toBe("This is {{c1::A}} test");
  });
});
