import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnifiedSelectionToolbar } from "../../src/components/reader/UnifiedSelectionToolbar";
import { NoteReaderModal } from "../../src/components/modals/NoteReaderModal";
import { PdfReaderAdapter } from "../../src/components/reader/adapters/PdfReaderAdapter";
import { DataContext } from "../../src/context/DataContext";
import { Note } from "../../src/types";

describe("Safe Clipboard Copying across Reader & Note components (Unit Tests)", () => {
  let originalClipboard: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    originalClipboard = navigator.clipboard;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  describe("1. UnifiedSelectionToolbar Copy Action", () => {
    it("copies selected plain text to clipboard and displays feedback 'Đã chép'", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const onAction = vi.fn();
      const onClose = vi.fn();

      render(
        <UnifiedSelectionToolbar
          isOpen={true}
          position={{ top: 100, left: 100 }}
          selectedText="đoạn trích nghiên cứu"
          onAction={onAction}
          onClose={onClose}
        />
      );

      const copyBtn = screen.getByRole("button", { name: /Sao chép/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith("đoạn trích nghiên cứu");
        expect(screen.getByText("Đã chép")).toBeInTheDocument();
        expect(onAction).toHaveBeenCalledWith("copy", { text: "đoạn trích nghiên cứu" });
      });
    });

    it("falls back to execCommand when navigator.clipboard.writeText rejects", async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error("Permission denied"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      const onAction = vi.fn();
      const onClose = vi.fn();

      render(
        <UnifiedSelectionToolbar
          isOpen={true}
          position={{ top: 100, left: 100 }}
          selectedText="đoạn trích fallback"
          onAction={onAction}
          onClose={onClose}
        />
      );

      const copyBtn = screen.getByRole("button", { name: /Sao chép/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(execCommandMock).toHaveBeenCalledWith("copy");
        expect(screen.getByText("Đã chép")).toBeInTheDocument();
      });
    });
  });

  describe("2. NoteReaderModal Content Copy", () => {
    it("copies entire note content and shows 'Đã sao chép!'", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const mockNote: Note = {
        id: "note-123",
        topicId: "topic-1",
        title: "Ghi chú khảo cứu",
        content: "Toàn bộ nội dung khảo cứu chi tiết",
        type: "insight",
        tags: [],
        isPrivate: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <DataContext.Provider
          value={
            {
              categories: [],
              topics: [],
              notes: [mockNote],
              resources: [],
              studyProgress: [],
              activeTopicId: null,
              setActiveTopicId: vi.fn(),
              deleteNote: vi.fn(),
            } as any
          }
        >
          <NoteReaderModal
            isOpen={true}
            note={mockNote}
            onClose={vi.fn()}
            onEdit={vi.fn()}
          />
        </DataContext.Provider>
      );

      const copyContentBtn = screen.getByRole("button", { name: /Sao chép nội dung/i });
      fireEvent.click(copyContentBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith("Toàn bộ nội dung khảo cứu chi tiết");
        expect(screen.getByText("Đã sao chép!")).toBeInTheDocument();
      });
    });
  });

  describe("3. PdfReaderAdapter Local Path Fallback Copy", () => {
    it("copies local file path and displays 'Đã sao chép đường dẫn'", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      render(
        <PdfReaderAdapter
          fileUrl="/Users/local/document.pdf"
          documentId="doc-1"
          title="Tài liệu PDF"
        />
      );

      const copyPathBtn = screen.getByRole("button", { name: /Sao chép đường dẫn/i });
      fireEvent.click(copyPathBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith("/Users/local/document.pdf");
        expect(screen.getByText("Đã sao chép đường dẫn")).toBeInTheDocument();
      });
    });
  });
});
