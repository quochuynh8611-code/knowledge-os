/**
 * UI Integration Test Suite: Mind Map Export UX Hardening (Phase M4a)
 *
 * Verifies:
 * 1. SVG export triggers download with sanitized filename matching active document title in saved-document mode.
 * 2. PNG export manages loading state and disables button during rasterization, returning to normal on completion.
 * 3. Export triggers visible user feedback upon successful completion (e.g. status notification/toast).
 * 4. Export triggers error feedback when PNG rasterization fails, resetting loading state without uncaught crashes.
 * 5. Export operations do not mark saved document as dirty.
 * 6. Export operations do not pollute canvas undo/redo history stack.
 * 7. Saved-document filename contract prioritizes document title over tree root node title for both SVG and PNG.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import * as mindmapExport from "../../src/lib/mindmapExport";
import { MindMapDocumentNode } from "../../src/types/mindmapDocument";

// Mock DataContext for MindMapView
let mockTopics: any[] = [
  {
    id: "topic-root",
    title: "Chủ đề Kiến Thức Gốc",
    visibility: "visible",
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = "topic-root";
const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Phase M4a: Mind Map Export UX Hardening Integration Workflow", () => {
  const mockSavedDocTree: MindMapDocumentNode = {
    id: "node-root-internal",
    title: "Tiêu Đề Node Gốc Cây Con", // Root node title intentionally differs from Document title
    nodeType: "topic",
    children: [
      {
        id: "child-1",
        title: "Nhánh Con Thứ Nhất",
        nodeType: "topic",
        children: [],
      },
    ],
  };

  const mockDocSummary = {
    id: "doc-kienthuc-2026",
    title: "Chuyên Đề Trí Tuệ Nhân Tạo 2026",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    tags: ["ai", "research"],
    currentVersionNumber: 1,
    totalVersionsCount: 1,
    isArchived: false,
  };

  let createdAnchors: HTMLAnchorElement[] = [];
  let clickSpy: any;
  let originalCreateObjectURL: any;
  let originalRevokeObjectURL: any;

  beforeEach(() => {
    vi.clearAllMocks();
    createdAnchors = [];

    // Spy on anchor creation and click
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === "a") {
        createdAnchors.push(el as HTMLAnchorElement);
      }
      return el;
    });

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    originalCreateObjectURL = globalThis.URL.createObjectURL;
    originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-export-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock document storage
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue({
      id: "ver-1",
      documentId: "doc-kienthuc-2026",
      versionNumber: 1,
      createdAt: "2026-01-01T00:00:00Z",
      treeData: mockSavedDocTree,
      crossLinks: [],
      viewState: {
        layoutMode: "tree_horizontal",
        collapsedNodeIds: [],
        showCrossLinks: false,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.URL.createObjectURL = originalCreateObjectURL;
    globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  // Helper to switch MindMapView to saved-document mode
  const switchToSavedDocMode = () => {
    const openDocBrowserBtn = screen.getByTestId("btn-open-mindmap-browser");
    fireEvent.click(openDocBrowserBtn);

    const docItem = screen.getByText("Chuyên Đề Trí Tuệ Nhân Tạo 2026");
    fireEvent.click(docItem);
  };

  it("1. SVG export triggers download with sanitized filename matching active document title in saved-document mode", () => {
    render(<MindMapView />);
    switchToSavedDocMode();

    const exportSvgBtn = screen.getByTestId("btn-export-svg");
    expect(exportSvgBtn).toBeEnabled();

    fireEvent.click(exportSvgBtn);

    // Verify anchor click was triggered
    expect(clickSpy).toHaveBeenCalled();
    expect(createdAnchors.length).toBeGreaterThan(0);

    const downloadedAnchor = createdAnchors[createdAnchors.length - 1];
    // Document title is 'Chuyên Đề Trí Tuệ Nhân Tạo 2026' -> sanitized should be 'Chuyen_De_Tri_Tue_Nhan_Tao_2026'
    // Root node title is 'Tiêu Đề Node Gốc Cây Con' -> sanitized would be 'Tieu_De_Node_Goc_Cay_Con'
    // Requirement: In saved-document mode, filename MUST use document title, not tree root node title!
    expect(downloadedAnchor.download).toMatch(
      /^MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-tree_horizontal-\d{4}-\d{2}-\d{2}\.svg$/
    );
    expect(downloadedAnchor.download).not.toContain("Tieu_De_Node_Goc_Cay_Con");
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-export-url");
  });

  it("2. PNG export manages loading state and disables button during rasterization", async () => {
    let resolvePngPromise: (b: Blob) => void = () => {};
    const pngPromise = new Promise<Blob>((resolve) => {
      resolvePngPromise = resolve;
    });

    vi.spyOn(mindmapExport, "rasterizeSvgToPng").mockReturnValue(pngPromise);

    render(<MindMapView />);
    switchToSavedDocMode();

    const exportPngBtn = screen.getByTestId("btn-export-png");
    expect(exportPngBtn).toBeEnabled();
    expect(exportPngBtn).toHaveTextContent("Xuất PNG");

    // Click PNG export to trigger rasterization
    fireEvent.click(exportPngBtn);

    // Button should enter loading state and be disabled
    expect(exportPngBtn).toBeDisabled();
    expect(exportPngBtn).toHaveTextContent("Đang xuất PNG...");

    // Resolve rasterization
    resolvePngPromise(new Blob(["mock-png"], { type: "image/png" }));

    // Await completion and verify button returns to normal state
    await waitFor(() => {
      expect(exportPngBtn).not.toBeDisabled();
      expect(exportPngBtn).toHaveTextContent("Xuất PNG");
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("3. Export triggers visible user feedback upon successful completion", async () => {
    render(<MindMapView />);
    switchToSavedDocMode();

    const exportSvgBtn = screen.getByTestId("btn-export-svg");
    fireEvent.click(exportSvgBtn);

    // UI feedback expectation: Toast or status announcement confirming export success
    await waitFor(() => {
      const feedback = screen.queryByRole("status") || screen.queryByTestId("mindmap-export-feedback");
      expect(feedback).not.toBeNull();
      expect(feedback?.textContent).toMatch(/xuất.*thành công|đã xuất/i);
    });
  });

  it("4. Export triggers error feedback when PNG rasterization fails without uncaught crash", async () => {
    vi.spyOn(mindmapExport, "rasterizeSvgToPng").mockRejectedValue(
      new Error("Canvas 2D context unavailable or memory quota exceeded")
    );

    render(<MindMapView />);
    switchToSavedDocMode();

    const exportPngBtn = screen.getByTestId("btn-export-png");
    fireEvent.click(exportPngBtn);

    // UI feedback expectation: Error Toast/Alert notifying user of the failure
    await waitFor(() => {
      const errorFeedback = screen.queryByRole("alert") || screen.queryByTestId("mindmap-export-error");
      expect(errorFeedback).not.toBeNull();
      expect(errorFeedback?.textContent).toMatch(/lỗi khi xuất|không thể xuất/i);
    });

    // Button loading state should be cleanly reset
    expect(exportPngBtn).not.toBeDisabled();
    expect(exportPngBtn).toHaveTextContent("Xuất PNG");
  });

  it("5. Export operations do not mark saved document as dirty", () => {
    render(<MindMapView />);
    switchToSavedDocMode();

    // Verify document is initially clean
    const saveBtn = screen.getByTestId("btn-save-mindmap");
    expect(saveBtn).toBeInTheDocument();
    expect(screen.queryByText(/chưa lưu/i)).toBeNull();

    // Trigger SVG export
    fireEvent.click(screen.getByTestId("btn-export-svg"));

    // Document state must remain clean (not dirty)
    expect(screen.queryByText(/chưa lưu/i)).toBeNull();

    // Trigger PNG export
    vi.spyOn(mindmapExport, "rasterizeSvgToPng").mockResolvedValue(
      new Blob(["mock-png"], { type: "image/png" })
    );
    fireEvent.click(screen.getByTestId("btn-export-png"));

    expect(screen.queryByText(/chưa lưu/i)).toBeNull();
  });

  it("6. Export operations do not pollute canvas undo/redo history stack", () => {
    render(<MindMapView />);
    switchToSavedDocMode();

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    const redoBtn = screen.getByTestId("mindmap-redo-button");

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Trigger SVG export
    fireEvent.click(screen.getByTestId("btn-export-svg"));

    // Undo/Redo stack must not receive any new entry
    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();

    // Trigger PNG export
    vi.spyOn(mindmapExport, "rasterizeSvgToPng").mockResolvedValue(
      new Blob(["mock-png"], { type: "image/png" })
    );
    fireEvent.click(screen.getByTestId("btn-export-png"));

    expect(undoBtn).toBeDisabled();
    expect(redoBtn).toBeDisabled();
  });

  it("7. Saved-document filename contract prioritizes document title over tree root node title for both SVG and PNG", async () => {
    vi.spyOn(mindmapExport, "rasterizeSvgToPng").mockResolvedValue(
      new Blob(["mock-png"], { type: "image/png" })
    );

    render(<MindMapView />);
    switchToSavedDocMode();

    // 1. Export SVG
    fireEvent.click(screen.getByTestId("btn-export-svg"));
    const svgAnchor = createdAnchors[createdAnchors.length - 1];
    expect(svgAnchor.download).toMatch(
      /^MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-tree_horizontal-\d{4}-\d{2}-\d{2}\.svg$/
    );

    // 2. Export PNG
    fireEvent.click(screen.getByTestId("btn-export-png"));
    await waitFor(() => {
      const pngAnchor = createdAnchors[createdAnchors.length - 1];
      expect(pngAnchor.download).toMatch(
        /^MindMap-Chuyen_De_Tri_Tue_Nhan_Tao_2026-tree_horizontal-\d{4}-\d{2}-\d{2}\.png$/
      );
    });
  });
});
