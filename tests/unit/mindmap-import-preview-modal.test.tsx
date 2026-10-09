import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { convertImportAstToMindMapTreeNode } from "../../src/lib/mindmapImportPreviewAdapter";
import { parseMindMapMarkdownOutline } from "../../src/lib/mindmapImportParser";
import { MindMapImportPreviewModal } from "../../src/components/mindmap/MindMapImportPreviewModal";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { DataContext } from "../../src/context/DataContext";
import { Topic } from "../../src/types";

// Mock DataContext value
const mockTopics: Topic[] = [
  {
    id: "topic-1",
    title: "Chánh Kiến",
    slug: "chanh-kien",
    categoryId: "cat-1",
    type: "phat_hoc",
    description: "Mô tả",
    content: "Nội dung",
    tags: ["bát chánh đạo"],
    links: [],
    studyProgress: {
      topicId: "topic-1",
      status: "in_progress",
      progress: 50,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 0,
      timeSpent: 10,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockDataContextValue: any = {
  topics: mockTopics,
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

describe("Phase I2: Mind Map Preview-Only Sandbox Modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Scenario 1: Pure adapter correctly converts AST to MindMapTreeNode", () => {
    const markdown = `- 📚 Root Topic \`[Tiến độ: 80%]\`
  - [tiên quyết] 📚 Prerequisite Child
  - [liên quan] 📝 Related Note
`;
    const parseResult = parseMindMapMarkdownOutline(markdown);
    expect(parseResult.root).not.toBeNull();

    const treeNode = convertImportAstToMindMapTreeNode(parseResult.root!, "general");

    expect(treeNode.title).toBe("Root Topic");
    expect(treeNode.type).toBe("topic");
    expect(treeNode.progress).toBe(80);
    expect(treeNode.studyStatus).toBe("in_progress");
    expect(treeNode.children.length).toBe(2);

    const child1 = treeNode.children[0];
    expect(child1.title).toBe("Prerequisite Child");
    expect(child1.edgeTypeToParent).toBe("prerequisite");
    expect(child1.hopDistance).toBe(1);

    const child2 = treeNode.children[1];
    expect(child2.title).toBe("Related Note");
    expect(child2.type).toBe("note");
    expect(child2.edgeTypeToParent).toBe("related");
  });

  it("Scenario 2: Open and close Preview Modal from MindMapView", () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapView />
      </DataContext.Provider>
    );

    const openBtn = screen.getByTestId("btn-open-import-preview");
    expect(openBtn).toBeInTheDocument();

    // Open modal
    fireEvent.click(openBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Xem Trước Dàn Ý Sơ Đồ Tư Duy")).toBeInTheDocument();

    // Close modal via footer button
    const closeBtn = screen.getByTestId("btn-close-import-preview-footer");
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Scenario 3: Real-time rendering of AST on Markdown typing and sample button", () => {
    render(
      <MindMapImportPreviewModal isOpen={true} onClose={vi.fn()} />
    );

    const textarea = screen.getByTestId("import-markdown-textarea") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Type markdown outline
    const inputMd = `# Sơ Đồ Xem Trước
- 📚 Gốc A
  - [tiên quyết] 📚 Nhánh B
  - [liên quan] 📚 Nhánh C
`;
    fireEvent.change(textarea, { target: { value: inputMd } });

    // Assert diagnostics summary
    const diagPanel = screen.getByTestId("import-diagnostics-panel");
    expect(diagPanel).toHaveTextContent("Hợp lệ");
    expect(diagPanel).toHaveTextContent("Tổng số nodes: 4");
    expect(diagPanel).toHaveTextContent("Độ sâu tối đa: 2");

    // Click sample button
    const sampleBtn = screen.getByTestId("btn-load-sample");
    fireEvent.click(sampleBtn);
    expect(textarea.value).toContain("Bát Chánh Đạo");
    expect(diagPanel).toHaveTextContent("Tổng số nodes:");
  });

  it("Scenario 4: Layout mode toggling inside preview modal", () => {
    render(
      <MindMapImportPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        initialMarkdown="- 📚 Root Node\n  - 📚 Child"
      />
    );

    const btnHorizontal = screen.getByTestId("btn-preview-layout-horizontal");
    const btnVertical = screen.getByTestId("btn-preview-layout-vertical");

    expect(btnHorizontal).toBeInTheDocument();
    expect(btnVertical).toBeInTheDocument();

    // Switch to vertical layout
    fireEvent.click(btnVertical);
    expect(btnVertical.className).toContain("bg-white");

    // Switch back to horizontal layout
    fireEvent.click(btnHorizontal);
    expect(btnHorizontal.className).toContain("bg-white");
  });

  it("Scenario 5: Diagnostics warnings rendering for malformed outline", () => {
    const malformedOutline = `- Root
        - Jump Node Level 4 without parent
`;
    render(
      <MindMapImportPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        initialMarkdown={malformedOutline}
      />
    );

    const diagPanel = screen.getByTestId("import-diagnostics-panel");
    expect(diagPanel).toHaveTextContent("Có cảnh báo");
    expect(diagPanel).toHaveTextContent("Jump indentation");
  });

  it("Scenario 6: Empty input state rendering", () => {
    render(
      <MindMapImportPreviewModal
        isOpen={true}
        onClose={vi.fn()}
        initialMarkdown=""
      />
    );

    const emptyState = screen.getByTestId("import-preview-empty-state");
    expect(emptyState).toBeInTheDocument();
    expect(emptyState).toHaveTextContent("Dán dàn ý Markdown để xem trước sơ đồ");
  });

  it("Scenario 7: Proof of Zero-Write and Zero-Navigation Invariants", () => {
    const initialHash = window.location.hash;

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown="- 📚 **[Topic Test](#/topics/topic-1)**"
        />
      </DataContext.Provider>
    );

    // URL hash must remain unmodified
    expect(window.location.hash).toBe(initialHash);

    // Assert zero calls to DataContext mutation APIs
    expect(mockDataContextValue.addTopic).not.toHaveBeenCalled();
    expect(mockDataContextValue.updateTopic).not.toHaveBeenCalled();
    expect(mockDataContextValue.deleteTopic).not.toHaveBeenCalled();
    expect(mockDataContextValue.addKnowledgeLink).not.toHaveBeenCalled();
  });

  it("Scenario 8: Category selection is required to enable Import CTA", () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown="- 📚 **[Topic Test](#/topics/topic-1)**"
        />
      </DataContext.Provider>
    );

    const categorySelect = screen.getByTestId("import-target-category-select") as HTMLSelectElement;
    const importBtn = screen.getByTestId("btn-trigger-import") as HTMLButtonElement;

    expect(categorySelect).toBeInTheDocument();
    expect(importBtn).toBeDisabled();

    // Select category
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });
    expect(importBtn).not.toBeDisabled();
  });

  it("Scenario 9: Opening Confirmation Dialog shows summary before committing write", () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown={"- 📚 Gốc\n  - [tiên quyết] 📚 Nhánh 1"}
        />
      </DataContext.Provider>
    );

    const categorySelect = screen.getByTestId("import-target-category-select");
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });

    const importBtn = screen.getByTestId("btn-trigger-import");
    fireEvent.click(importBtn);

    // Confirmation dialog appears
    const confirmDialog = screen.getByTestId("import-confirm-dialog");
    expect(confirmDialog).toBeInTheDocument();
    expect(confirmDialog).toHaveTextContent("Xác nhận nhập sơ đồ vào CSDL");
    expect(confirmDialog).toHaveTextContent("2 chủ đề");
  });

  it("Scenario 10: Canceling confirmation dialog performs zero-write", () => {
    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={vi.fn()}
          initialMarkdown={"- 📚 Gốc\n  - [tiên quyết] 📚 Nhánh 1"}
        />
      </DataContext.Provider>
    );

    const categorySelect = screen.getByTestId("import-target-category-select");
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });

    const importBtn = screen.getByTestId("btn-trigger-import");
    fireEvent.click(importBtn);

    const cancelBtn = screen.getByTestId("btn-cancel-import-confirm");
    fireEvent.click(cancelBtn);

    // Dialog closes and zero writes performed
    expect(screen.queryByTestId("import-confirm-dialog")).not.toBeInTheDocument();
    expect(mockDataContextValue.addTopic).not.toHaveBeenCalled();
  });

  it("Scenario 11: Submitting confirmation dialog invokes ingestion port and closes modal", async () => {
    const handleClose = vi.fn();
    mockDataContextValue.addTopic.mockReturnValue("new-topic-id-1");

    render(
      <DataContext.Provider value={mockDataContextValue}>
        <MindMapImportPreviewModal
          isOpen={true}
          onClose={handleClose}
          initialMarkdown={"- 📚 Gốc\n  - [tiên quyết] 📚 Nhánh 1"}
        />
      </DataContext.Provider>
    );

    const categorySelect = screen.getByTestId("import-target-category-select");
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });

    const importBtn = screen.getByTestId("btn-trigger-import");
    fireEvent.click(importBtn);

    const submitBtn = screen.getByTestId("btn-submit-import-confirm");
    await fireEvent.click(submitBtn);

    // Assert addTopic was called
    expect(mockDataContextValue.addTopic).toHaveBeenCalled();
  });
});
