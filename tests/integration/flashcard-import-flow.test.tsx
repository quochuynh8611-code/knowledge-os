import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlashcardImportModal } from "../../src/components/modals/FlashcardImportModal";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

// Mock DataContext
const mockTopics = [
  { id: "topic-1", title: "Bát Nhã Tâm Kinh", categoryId: "cat-1" },
  { id: "topic-2", title: "Trung Quán Luận", categoryId: "cat-1" },
];

const mockCreateFlashcard = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {
      createFlashcard: mockCreateFlashcard,
    },
  }),
}));


describe("FlashcardImportFlow & Studio Integration — Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFlashcard.mockResolvedValue({
      id: "fc-imported-1",
      topicId: "topic-1",
      front: "Front",
      back: "Back",
      type: "basic",
    });
  });

  describe("FlashcardImportModal Flow", () => {
    it("renders modal with topic selector, input area, and action buttons", () => {
      render(<FlashcardImportModal isOpen={true} onClose={vi.fn()} />);

      expect(screen.getByTestId("flashcard-import-modal")).toBeInTheDocument();
      expect(screen.getByTestId("select-default-topic")).toBeInTheDocument();
      expect(screen.getByTestId("raw-text-input")).toBeInTheDocument();
      expect(screen.getByTestId("btn-parse-preview")).toBeInTheDocument();
    });

    it("parses CSV and displays preview with valid and rejected rows", async () => {
      const user = userEvent.setup();
      render(
        <FlashcardImportModal
          isOpen={true}
          onClose={vi.fn()}
          defaultTopicId="topic-1"
        />
      );

      const csvContent = `front,back,type\n"Thủ đô Việt Nam?","Hà Nội","basic"\n"","Thiếu câu hỏi","basic"\n"Câu hỏi 3","","basic"`;

      await user.type(screen.getByTestId("raw-text-input"), csvContent);
      await user.click(screen.getByTestId("btn-parse-preview"));

      // Preview counts
      expect(screen.getByTestId("preview-valid-count").textContent).toContain("1");
      expect(screen.getByTestId("preview-invalid-count").textContent).toContain("2");

      // Submit button should be enabled for the 1 valid card
      expect(screen.getByTestId("btn-submit-import")).toBeEnabled();
    });

    it("submits valid rows and displays import report summary", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      render(
        <FlashcardImportModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
          defaultTopicId="topic-1"
        />
      );

      const csvContent = `front,back\n"Question 1","Answer 1"\n"Question 2","Answer 2"`;

      await user.type(screen.getByTestId("raw-text-input"), csvContent);
      await user.click(screen.getByTestId("btn-parse-preview"));
      await user.click(screen.getByTestId("btn-submit-import"));

      await waitFor(() => {
        expect(mockCreateFlashcard).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId("import-report-summary")).toBeInTheDocument();
        expect(screen.getByTestId("report-success-count").textContent).toContain("2");
        expect(onSuccess).toHaveBeenCalledWith(2);
      });
    });

    it("rejects import when no defaultTopicId is selected and rows lack topicId", async () => {
      const user = userEvent.setup();
      render(<FlashcardImportModal isOpen={true} onClose={vi.fn()} />);

      const csvContent = `front,back\n"Question 1","Answer 1"`;

      await user.type(screen.getByTestId("raw-text-input"), csvContent);
      await user.click(screen.getByTestId("btn-parse-preview"));

      // Invalid because no topicId in row and no default topic selected
      expect(screen.getByTestId("preview-valid-count").textContent).toContain("0");
      expect(screen.getByTestId("preview-invalid-count").textContent).toContain("1");
      expect(screen.getByTestId("btn-submit-import")).toBeDisabled();
    });
  });

  describe("FlashcardReviewStudio Action Buttons & Empty State Integration", () => {
    beforeEach(() => {
      // Mock fetch /api/flashcards/due to return empty queue
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
    });

    it("renders 'Tạo thẻ mới' and 'Nhập CSV/TSV' buttons in empty queue state", async () => {
      render(<FlashcardReviewStudio onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("empty-queue-state")).toBeInTheDocument();
      });

      expect(screen.getByTestId("btn-create-card-empty")).toBeInTheDocument();
      expect(screen.getByTestId("btn-import-csv-empty")).toBeInTheDocument();
    });

    it("opens FlashcardFormModal when clicking 'Tạo thẻ mới' in empty state", async () => {
      const user = userEvent.setup();
      render(<FlashcardReviewStudio onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-create-card-empty")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("btn-create-card-empty"));

      expect(screen.getByTestId("flashcard-form-modal")).toBeInTheDocument();
    });

    it("opens FlashcardImportModal when clicking 'Nhập CSV / TSV' in empty state", async () => {
      const user = userEvent.setup();
      render(<FlashcardReviewStudio onClose={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-import-csv-empty")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("btn-import-csv-empty"));

      expect(screen.getByTestId("flashcard-import-modal")).toBeInTheDocument();
    });
  });
});
