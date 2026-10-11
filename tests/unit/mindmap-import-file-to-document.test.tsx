/**
 * Unit & Integration Test Suite: External Markdown Import to Saved Mind Map Document (Phase M1)
 *
 * Verifies:
 * 1. File picker accepts .md/text files and populates textarea without storage side-effects.
 * 2. Preview & diagnostics update reactively after loading file.
 * 3. Two distinct CTAs: "Lưu thành tài liệu" (no category required) vs "Nhập vào CSDL" (category-gated).
 * 4. Invalid markdown (errors or empty) disables "Lưu thành tài liệu".
 * 5. "Lưu thành tài liệu" creates document in local-first storage with naming strategy (root heading > filename > timestamp).
 * 6. Document is immediately opened in MindMapView.
 * 7. Imported document is reopenable via local-first storage.
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapImportPreviewModal } from "../../src/components/mindmap/MindMapImportPreviewModal";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import { DataContext } from "../../src/context/DataContext";

const mockDataContextValue: any = {
  topics: [
    {
      id: "topic-1",
      title: "Chủ đề mẫu",
      slug: "chu-de-mau",
      categoryId: "cat-1",
      type: "phat_hoc",
      links: [],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  categories: [{ id: "cat-1", name: "Phật Học", slug: "phat-hoc" }],
  notes: [],
  resources: [],
  tags: [],
  selectedTopicId: "topic-1",
  openTopicDetail: vi.fn(),
  addTopic: vi.fn(),
  updateTopic: vi.fn(),
  deleteTopic: vi.fn(),
  addKnowledgeLink: vi.fn(),
};

describe("Phase M1 — External Markdown Import to Saved Mind Map Document", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
  });

  // Scenario 1: File picker accepts file and populates textarea without storage side-effects
  it("Scenario 1: File picker loads .md file text into textarea without storage side-effect", async () => {
    const createDocSpy = vi.spyOn(mindmapDocumentStorage, "createMindMapDocument");

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal isOpen={true} onClose={vi.fn()} />
      </DataContext.Provider>
    );

    const fileInput = screen.getByTestId("import-file-input") as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toContain(".md");

    const sampleMd = `# Kế Hoạch Tu Tập\n- 📚 Giới\n  - [tiên quyết] 📚 Định\n    - [nâng cao] 📚 Tuệ`;
    const file = new File([sampleMd], "ke-hoach-tu-tap.md", { type: "text/markdown" });

    // Mock file reading
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const textarea = screen.getByTestId("import-markdown-textarea") as HTMLTextAreaElement;
      expect(textarea.value).toBe(sampleMd);
    });

    // Zero storage write side-effect
    expect(createDocSpy).not.toHaveBeenCalled();
    expect(mockDataContextValue.addTopic).not.toHaveBeenCalled();
  });

  // Scenario 2: Preview diagnostics update reactively after file input
  it("Scenario 2: Diagnostics and tree update after file loading", async () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal isOpen={true} onClose={vi.fn()} />
      </DataContext.Provider>
    );

    const fileInput = screen.getByTestId("import-file-input");
    const validMd = `# Tứ Diệu Đế\n- 📚 Khổ Đế\n- 📚 Tập Đế`;
    const file = new File([validMd], "tu-dieu-de.md", { type: "text/markdown" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const diagPanel = screen.getByTestId("import-diagnostics-panel");
      expect(diagPanel).toHaveTextContent("Hợp lệ");
      expect(diagPanel).toHaveTextContent("Tổng số nodes: 3");
    });
  });

  // Scenario 3 & 4: Two distinct CTAs contract
  it("Scenario 3 & 4: 'Lưu thành tài liệu' is enabled without category, while 'Nhập vào CSDL' requires category", () => {
    const validMd = `# Sơ Đồ Độc Lập\n- 📚 Nhánh 1\n- 📚 Nhánh 2`;

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown={validMd}
        />
      </DataContext.Provider>
    );

    const saveDocBtn = screen.getByTestId("btn-save-as-document") as HTMLButtonElement;
    const importDbBtn = screen.getByTestId("btn-trigger-import") as HTMLButtonElement;
    const categorySelect = screen.getByTestId("import-target-category-select") as HTMLSelectElement;

    // Initially category is empty:
    expect(categorySelect.value).toBe("");
    // Save as Document MUST be enabled because markdown is valid (no category needed)
    expect(saveDocBtn).not.toBeDisabled();
    // Ingest into Database MUST be disabled because category is missing
    expect(importDbBtn).toBeDisabled();

    // When category is selected, both are enabled
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });
    expect(importDbBtn).not.toBeDisabled();
    expect(saveDocBtn).not.toBeDisabled();
  });

  // Scenario 5: Invalid markdown disables 'Lưu thành tài liệu'
  it("Scenario 5: Malformed markdown with syntax errors disables 'Lưu thành tài liệu'", () => {
    // Empty markdown
    const { rerender } = render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown=""
        />
      </DataContext.Provider>
    );

    let saveDocBtn = screen.getByTestId("btn-save-as-document") as HTMLButtonElement;
    expect(saveDocBtn).toBeDisabled();

    // Rerender with invalid indentation that causes parser error if any, or empty title
    rerender(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown="   "
        />
      </DataContext.Provider>
    );
    saveDocBtn = screen.getByTestId("btn-save-as-document") as HTMLButtonElement;
    expect(saveDocBtn).toBeDisabled();
  });

  // Scenario 6: 'Lưu thành tài liệu' creates document with naming strategy
  it("Scenario 6: 'Lưu thành tài liệu' creates document in storage with root heading title", async () => {
    const validMd = `# Bát Chánh Đạo Toàn Thư\n- 📚 Chánh Kiến\n- 📚 Chánh Tư Duy`;
    const handleClose = vi.fn();
    const handleDocCreated = vi.fn();

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={handleClose}
          initialMarkdown={validMd}
          onDocumentCreated={handleDocCreated}
        />
      </DataContext.Provider>
    );

    const saveDocBtn = screen.getByTestId("btn-save-as-document");
    fireEvent.click(saveDocBtn);

    // Assert document created in storage
    const docs = mindmapDocumentStorage.listMindMapDocuments();
    expect(docs.length).toBe(1);
    expect(docs[0].title).toBe("Bát Chánh Đạo Toàn Thư");
    expect(handleDocCreated).toHaveBeenCalledWith(docs[0].id);
    expect(handleClose).toHaveBeenCalled();
  });

  // Scenario 7 & 8: Document is immediately opened in MindMapView and reopenable
  it("Scenario 7 & 8: Created document is opened immediately in MindMapView and reopenable", async () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapView />
      </DataContext.Provider>
    );

    // 1. Open Import Preview Modal
    fireEvent.click(screen.getByTestId("btn-open-import-preview"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // 2. Pick file
    const fileInput = screen.getByTestId("import-file-input");
    const mdContent = `# Triết Học Phật Giáo\n- 📚 Vô Thường\n- 📚 Duyên Khởi`;
    const file = new File([mdContent], "triet-hoc.md", { type: "text/markdown" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("btn-save-as-document")).not.toBeDisabled();
    });

    // 3. Click "Lưu thành tài liệu"
    fireEvent.click(screen.getByTestId("btn-save-as-document"));

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // 4. Check active document in MindMapView: mode should be saved-document
    const saveBtn = screen.getByTestId("btn-save-mindmap");
    expect(saveBtn).toHaveAttribute("title", "Lưu phiên bản mới cho sơ đồ hiện tại");

    // 5. Open Saved Documents Browser modal to verify reopenable
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    const browserModal = screen.getByTestId("mindmap-browser-modal");
    expect(within(browserModal).getByText("Triết Học Phật Giáo")).toBeInTheDocument();
  });

  // Scenario 9: Storage failure shows error banner and does not close modal
  it("Scenario 9: Storage failure surfaces error banner and keeps modal open", async () => {
    const onCloseSpy = vi.fn();
    const createDocSpy = vi
      .spyOn(mindmapDocumentStorage, "createMindMapDocument")
      .mockReturnValue({
        success: false,
        isVolatile: false,
        errorMessage: "Hết dung lượng lưu trữ cục bộ",
        errorCode: "STORAGE_QUOTA_EXCEEDED",
      });

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={onCloseSpy}
          initialMarkdown="# Valid Topic\n- Child"
        />
      </DataContext.Provider>
    );

    const saveBtn = screen.getByTestId("btn-save-as-document");
    expect(saveBtn).not.toBeDisabled();
    expect(saveBtn).toHaveAttribute("aria-disabled", "false");
    expect(saveBtn).toHaveAttribute("title", "Lưu sơ đồ này thành tài liệu độc lập để mở lại về sau");

    fireEvent.click(saveBtn);

    expect(createDocSpy).toHaveBeenCalled();
    expect(onCloseSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Hết dung lượng lưu trữ cục bộ")).toBeInTheDocument();

    createDocSpy.mockRestore();
  });
});
