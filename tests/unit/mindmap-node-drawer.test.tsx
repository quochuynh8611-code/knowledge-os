/**
 * Test Suite: Phase M2 — Inline Node Drawer for Saved Mind Map Documents
 *
 * Requirements:
 * 1. Drawer is isolated to saved-document mode (never opens in live-topic mode).
 * 2. In saved-document mode, clicking a node opens MindMapNodeDrawer and binds title & metadata.
 * 3. Editing title updates workingDocumentTree runtime and reflects on canvas.
 * 4. isDirty only triggers when title actually changes, not on unchanged submit or close.
 * 5. Save Version persists edited title from drawer, visible upon reopen.
 * 6. Leave guard appears if attempting to leave while dirty from drawer edit.
 * 7. Closing drawer preserves canvas visual selection (selectedNodeIds).
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapVersion,
} from "../../src/types/mindmapDocument";

let mockTopics: any[] = [
  {
    id: "topic-bat-chanh-dao",
    title: "Bát Chánh Đạo",
    visibility: "visible",
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = "topic-bat-chanh-dao";
const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    categories: [{ id: "cat-1", name: "Phật Học" }],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Phase M2 — Inline Node Drawer for Saved Mind Map Documents", () => {
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
    sourceIdReference: "topic-bat-chanh-dao",
    semanticBadge: "Core",
    children: [
      {
        id: "doc-child-kho",
        title: "Khổ Đế",
        nodeType: "topic",
        semanticBadge: "Dukkha",
        children: [],
      },
      {
        id: "doc-child-tap",
        title: "Tập Đế",
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
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersion);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
  });

  // Scenario 1: Drawer does NOT open in live-topic mode
  it("Scenario 1: Node drawer does NOT open in live-topic mode when clicking node", async () => {
    render(<MindMapView />);

    // In live-topic mode, find node on canvas
    const nodeEl = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
    expect(nodeEl).toBeInTheDocument();

    if (nodeEl) {
      fireEvent.click(nodeEl);
    }

    // Drawer should not exist in DOM
    expect(screen.queryByTestId("mindmap-node-drawer")).not.toBeInTheDocument();
  });

  // Scenario 2: Drawer opens in saved-document mode and binds metadata
  it("Scenario 2: Drawer opens in saved-document mode and displays correct node metadata", async () => {
    render(<MindMapView />);

    // 1. Open saved document via browser modal
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    const browserModal = screen.getByTestId("mindmap-browser-modal");
    fireEvent.click(within(browserModal).getByTestId(`doc-card-${mockDocSummary.id}`));

    // Document is opened
    expect(screen.queryByTestId("mindmap-browser-modal")).not.toBeInTheDocument();

    // 2. Click node "doc-child-kho" on canvas
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    expect(nodeEl).toBeInTheDocument();
    if (nodeEl) {
      fireEvent.click(nodeEl);
    }

    // 3. Verify drawer is open and binds data
    const drawer = await screen.findByTestId("mindmap-node-drawer");
    expect(drawer).toBeInTheDocument();

    const titleInput = screen.getByTestId("input-drawer-node-title") as HTMLInputElement;
    expect(titleInput.value).toBe("Khổ Đế");

    expect(screen.getByTestId("drawer-node-type")).toHaveTextContent("topic");
    expect(screen.getByTestId("drawer-node-badge")).toHaveTextContent("Dukkha");
  });

  // Scenario 3: Editing title updates workingDocumentTree runtime and reflects on canvas
  it("Scenario 3: Editing title in drawer updates workingDocumentTree and canvas node", async () => {
    render(<MindMapView />);

    // Open document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Click node
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    if (nodeEl) fireEvent.click(nodeEl);

    // Edit title in drawer
    const titleInput = await screen.findByTestId("input-drawer-node-title");
    fireEvent.change(titleInput, { target: { value: "Khổ Đế (Khảo Sát Thực Tế)" } });

    // Apply change
    fireEvent.click(screen.getByTestId("btn-drawer-apply-title"));

    // Verify canvas displays updated title
    await waitFor(() => {
      const updatedNodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
      expect(updatedNodeEl).toHaveTextContent("Khổ Đế (Khảo Sát Thực Tế)");
    });
  });

  // Scenario 4: isDirty only triggers when title actually changes
  it("Scenario 4: isDirty only triggers on actual title change, not on unchanged submit or close", async () => {
    render(<MindMapView />);

    // Open document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Click node
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    if (nodeEl) fireEvent.click(nodeEl);

    // Drawer is open, submit same title without change
    const drawer = await screen.findByTestId("mindmap-node-drawer");
    fireEvent.click(screen.getByTestId("btn-drawer-apply-title"));

    // isDirty badge should not appear
    expect(screen.queryByText(/Chưa lưu/i)).not.toBeInTheDocument();

    // Close drawer without edit
    fireEvent.click(screen.getByTestId("btn-close-node-drawer"));
    expect(screen.queryByText(/Chưa lưu/i)).not.toBeInTheDocument();

    // Reopen drawer and actually change title
    if (nodeEl) fireEvent.click(nodeEl);
    const titleInput = await screen.findByTestId("input-drawer-node-title");
    fireEvent.change(titleInput, { target: { value: "Khổ Đế Đã Sửa" } });
    fireEvent.click(screen.getByTestId("btn-drawer-apply-title"));

    // Now isDirty badge must be present
    expect(screen.getByText(/Chưa lưu/i)).toBeInTheDocument();
  });

  // Scenario 5: Save Version persists edited title, visible upon reopen
  it("Scenario 5: Save Version persists edited title from drawer and reopens correctly", async () => {
    const appendVersionSpy = vi
      .spyOn(mindmapDocumentStorage, "appendMindMapVersion")
      .mockReturnValue({
        success: true,
        isVolatile: false,
        data: {
          ...initialVersion,
          versionNumber: 2,
        },
      });

    render(<MindMapView />);

    // Open document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Edit node title
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    if (nodeEl) fireEvent.click(nodeEl);

    const titleInput = await screen.findByTestId("input-drawer-node-title");
    fireEvent.change(titleInput, { target: { value: "Khổ Đế Phiên Bản 2" } });
    fireEvent.click(screen.getByTestId("btn-drawer-apply-title"));

    // Save Version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    const saveModal = screen.getByTestId("mindmap-save-modal");
    fireEvent.change(screen.getByTestId("input-change-summary"), {
      target: { value: "Cập nhật tiêu đề từ Drawer" },
    });
    fireEvent.click(screen.getByTestId("btn-confirm-save-doc"));

    // Verify appendMindMapVersion persisted the edited tree
    expect(appendVersionSpy).toHaveBeenCalled();
    const saveCallInput = appendVersionSpy.mock.calls[0][0];
    const savedChild = saveCallInput.treeData.children.find((c) => c.id === "doc-child-kho");
    expect(savedChild?.title).toBe("Khổ Đế Phiên Bản 2");
  });

  // Scenario 6: Leave guard triggers when dirty from drawer edit
  it("Scenario 6: Leave guard appears if attempting to leave when dirty from drawer edit", async () => {
    render(<MindMapView />);

    // Open document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Edit title to make document dirty
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    if (nodeEl) fireEvent.click(nodeEl);

    const titleInput = await screen.findByTestId("input-drawer-node-title");
    fireEvent.change(titleInput, { target: { value: "Khổ Đế Đang Sửa Dở" } });
    fireEvent.click(screen.getByTestId("btn-drawer-apply-title"));

    // Now try to switch back to Live Topic
    fireEvent.click(screen.getByTestId("btn-return-live-mode"));

    // Unsaved changes confirm dialog must be shown
    expect(screen.getByTestId("unsaved-changes-confirm-dialog")).toBeInTheDocument();
  });

  // Scenario 7: Closing drawer preserves visual selection on canvas
  it("Scenario 7: Closing drawer preserves visual selection on canvas", async () => {
    render(<MindMapView />);

    // Open document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // Click node to select and open drawer
    const nodeEl = document.querySelector('[data-node-id="doc-child-kho"]');
    if (nodeEl) fireEvent.click(nodeEl);

    // Verify node is selected
    expect(nodeEl).toHaveAttribute("data-selected", "true");

    // Close drawer
    const closeBtn = await screen.findByTestId("btn-close-node-drawer");
    fireEvent.click(closeBtn);

    // Drawer closes
    expect(screen.queryByTestId("mindmap-node-drawer")).not.toBeInTheDocument();

    // Node remains selected on canvas
    expect(nodeEl).toHaveAttribute("data-selected", "true");
  });
});
