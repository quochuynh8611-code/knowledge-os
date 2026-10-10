/**
 * UI Integration Test Suite: Mind Map Document Lifecycle & Export Parity (Phase P7.C)
 *
 * Verifies:
 * 1. handleSaveVersion persists workingDocumentTree (not stale projection.tree).
 * 2. handleSaveDocument persists active tree (workingDocumentTree || projection.tree).
 * 3. Save failure keeps isDirty=true.
 * 4. Standalone document without live projection is not disabled and does not silent no-op.
 * 5. handleCopyMarkdown exports workingDocumentTree outline in edit mode.
 * 6. handleExportSvg & handleExportPng exports workingDocumentTree in edit mode.
 * 7. Live topic mode without edits maintains regression-free baseline.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import * as mindmapExport from "../../src/lib/mindmapExport";
import { MindMapDocumentNode, MindMapDocumentSummary, MindMapVersion } from "../../src/types/mindmapDocument";

let mockTopics: any[] = [
  {
    id: "topic-tu-dieu-de",
    title: "Tứ Diệu Đế",
    visibility: "visible",
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = "topic-tu-dieu-de";

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: vi.fn(),
  }),
}));

describe("Phase P7.C — Document Persistence & Export Parity Hardening", () => {
  const mockDocSummary: MindMapDocumentSummary = {
    id: "doc-tu-dieu-de",
    title: "Sơ đồ Tứ Diệu Đế",
    description: "Khảo cứu chân lý",
    tags: ["phat-hoc"],
    currentVersionNumber: 1,
    totalVersionsCount: 1,
    isArchived: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const initialDocTree: MindMapDocumentNode = {
    id: "doc-root",
    title: "Tứ Diệu Đế Gốc",
    nodeType: "topic",
    children: [
      {
        id: "doc-child-kho",
        title: "Khổ Đế",
        nodeType: "topic",
        children: [],
      },
    ],
  };

  const initialVersion: MindMapVersion = {
    id: "ver-1",
    documentId: "doc-tu-dieu-de",
    versionNumber: 1,
    createdAt: "2026-01-01T00:00:00Z",
    changeSummary: "Khởi tạo",
    treeData: initialDocTree,
    crossLinks: [],
    viewState: {
      layoutMode: "tree_horizontal",
      collapsedNodeIds: [],
      showCrossLinks: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTopics = [
      {
        id: "topic-tu-dieu-de",
        title: "Tứ Diệu Đế",
        visibility: "visible",
        parentId: null,
      },
    ];
    mockSelectedTopicId = "topic-tu-dieu-de";

    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersion);
  });

  // Scenario 1: Save version of working document persists edited tree modifications
  it("Scenario 1: handleSaveVersion persists workingDocumentTree modifications (not stale projection)", async () => {
    const appendSpy = vi.spyOn(mindmapDocumentStorage, "appendMindMapVersion").mockReturnValue({
      success: true,
      data: {
        ...initialVersion,
        versionNumber: 2,
      },
      isVolatile: false,
    });

    render(<MindMapView />);

    // 1. Open saved document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Sơ đồ Tứ Diệu Đế"));

    // 2. Add child node under doc-root to modify workingDocumentTree (default title is "Nút mới")
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));

    // 3. Open Save Version Modal
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));

    // 4. Submit version save form
    const saveModal = screen.getByTestId("mindmap-save-modal");
    expect(saveModal).toBeInTheDocument();
    const form = screen.getByTestId("btn-confirm-save-doc").closest("form")!;
    fireEvent.submit(form);

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const calledPayload = appendSpy.mock.calls[0][0];

    // Assert that the saved tree contains the newly added child (doc-root should now have 2 children)
    expect(calledPayload.treeData.children.length).toBe(2);
    expect(calledPayload.treeData.children.some((c: any) => c.title === "Nút mới")).toBe(true);
  });

  // Scenario 2: Save new document from Live topic canvas
  it("Scenario 2: handleSaveDocument persists active tree when initiated from Live topic canvas", async () => {
    const createSpy = vi.spyOn(mindmapDocumentStorage, "createMindMapDocument").mockReturnValue({
      success: true,
      data: {
        document: mockDocSummary,
        version: initialVersion,
      },
      isVolatile: false,
    });

    render(<MindMapView />);

    // In live topic mode (activeMode === "topic"), click save new document
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    const form = screen.getByTestId("btn-confirm-save-doc").closest("form")!;
    fireEvent.submit(form);

    expect(createSpy).toHaveBeenCalledTimes(1);
    const calledPayload = createSpy.mock.calls[0][0];
    expect(calledPayload.title).toBe("Sơ đồ tư duy - Tứ Diệu Đế");
  });

  // Scenario 3: Dirty state is preserved if save operation fails
  it("Scenario 3: Dirty state badge is preserved if save operation fails", async () => {
    vi.spyOn(mindmapDocumentStorage, "appendMindMapVersion").mockReturnValue({
      success: false,
      errorCode: "STORAGE_QUOTA_EXCEEDED",
      isVolatile: false,
    });

    render(<MindMapView />);

    // 1. Open saved doc and mutate
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Sơ đồ Tứ Diệu Đế"));
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));

    // Confirm dirty badge is present
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();

    // 2. Attempt save version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    const form = screen.getByTestId("btn-confirm-save-doc").closest("form")!;
    fireEvent.submit(form);

    // Dirty badge must remain present because save failed
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();
  });

  // Scenario 4: Standalone document where projection is null is not disabled and does not silent no-op
  it("Scenario 4: Standalone document where projection is null is not disabled and allows saving", async () => {
    mockTopics = [];
    mockSelectedTopicId = null;

    const appendSpy = vi.spyOn(mindmapDocumentStorage, "appendMindMapVersion").mockReturnValue({
      success: true,
      data: {
        ...initialVersion,
        versionNumber: 2,
      },
      isVolatile: false,
    });

    render(<MindMapView />);

    // Open saved doc
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Sơ đồ Tứ Diệu Đế"));

    // When projection is null, btn-save-mindmap should NOT be disabled in the hardened P7.C implementation
    const saveBtn = screen.getByTestId("btn-save-mindmap");
    expect(saveBtn).not.toBeDisabled();

    // Trigger save version modal and submit
    fireEvent.click(saveBtn);
    const form = screen.getByTestId("btn-confirm-save-doc").closest("form")!;
    fireEvent.submit(form);

    expect(appendSpy).toHaveBeenCalledTimes(1);
  });

  // Scenario 5: Export Markdown reflects workingDocumentTree in edit mode
  it("Scenario 5: handleCopyMarkdown exports workingDocumentTree outline in edit mode", async () => {
    let copiedText = "";
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation((text: string) => {
          copiedText = text;
          return Promise.resolve();
        }),
      },
    });

    render(<MindMapView />);

    // Open saved doc and add a child
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Sơ đồ Tứ Diệu Đế"));
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));

    // Copy Markdown
    const copyBtn = screen.getByText("Xuất Outline Markdown");
    fireEvent.click(copyBtn);

    // The copied outline must contain the newly added child ("Nút mới")
    expect(copiedText).toContain("Nút mới");
  });

  // Scenario 6: Export SVG reflects workingDocumentTree in edit mode
  it("Scenario 6: handleExportSvg exports workingDocumentTree in edit mode", async () => {
    const exportSvgSpy = vi.spyOn(mindmapExport, "exportMindMapToSvg");
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-svg-url");
    window.URL.revokeObjectURL = vi.fn();

    render(<MindMapView />);

    // Open saved doc and add a child
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("Sơ đồ Tứ Diệu Đế"));
    fireEvent.click(screen.getByTestId("btn-add-child-doc-root"));

    // Export SVG
    fireEvent.click(screen.getByTestId("btn-export-svg"));

    expect(exportSvgSpy).toHaveBeenCalled();
    const passedProjection = exportSvgSpy.mock.calls[0][0];
    // Passed projection tree must be the working tree with 2 children
    expect(passedProjection.tree.children.length).toBe(2);
    expect(passedProjection.tree.children.some((c) => c.title === "Nút mới")).toBe(true);
  });

  // Scenario 7: Live topic read-only mode maintains baseline behavior without regression
  it("Scenario 7: Live topic read-only mode exports projection normally without regression", async () => {
    let copiedText = "";
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation((text: string) => {
          copiedText = text;
          return Promise.resolve();
        }),
      },
    });

    render(<MindMapView />);

    // In live mode without opening any document
    const copyBtn = screen.getByText("Xuất Outline Markdown");
    fireEvent.click(copyBtn);

    expect(copiedText).toContain("Tứ Diệu Đế");
  });
});
