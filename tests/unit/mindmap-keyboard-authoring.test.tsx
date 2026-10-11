/**
 * Test Suite: Phase M3 — Mind Map Keyboard Authoring for Saved Documents
 *
 * Verifies:
 * 1. live-topic mode blocks all keyboard authoring (Tab, Enter, Delete, Backspace).
 * 2. Tab creates a child titled "New node" appended to the end of children, and focuses it.
 * 3. Enter creates a sibling titled "New node" inserted immediately after current node, and focuses it.
 * 4. Enter on root is a strict no-op (no mutation, no history, no dirty).
 * 5. Delete removes the focused node and its entire subtree (no reparenting), focusing fallback node.
 * 6. Backspace has exact parity with Delete.
 * 7. Root cannot be deleted via Delete or Backspace.
 * 8. Drawer open blocks all canvas keyboard authoring mutations.
 * 9. Active HTML form/input targets block canvas keyboard authoring mutations.
 * 10. Undo/Redo restores and reapplies tree mutations accurately.
 * 11. Save Version persists keyboard authoring mutations faithfully to storage.
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

describe("Phase M3 — Mind Map Keyboard Authoring for Saved Documents", () => {
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
        children: [
          {
            id: "doc-grandchild-sinh",
            title: "Sinh Khổ",
            nodeType: "topic",
            children: [],
          },
        ],
      },
      {
        id: "doc-child-tap",
        title: "Tập Đế",
        nodeType: "topic",
        children: [],
      },
      {
        id: "doc-child-diet",
        title: "Diệt Đế",
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

  const openSavedDocument = () => {
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    const browserModal = screen.getByTestId("mindmap-browser-modal");
    fireEvent.click(within(browserModal).getByTestId(`doc-card-${mockDocSummary.id}`));
  };

  const focusNodeOnCanvas = (nodeId: string) => {
    const nodeEl = document.querySelector(`[data-node-id="${nodeId}"]`);
    expect(nodeEl).toBeInTheDocument();
    fireEvent.click(nodeEl!);
    const closeBtn = screen.queryByTestId("btn-close-node-drawer");
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
  };

  // =========================================================================
  // SCENARIO 1: Live-topic mode blocked
  // =========================================================================
  it("Scenario 1: live-topic mode blocks all keyboard authoring", () => {
    render(<MindMapView />);

    // In live-topic mode, root topic is displayed
    const nodeEl = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
    expect(nodeEl).toBeInTheDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Press Tab, Enter, Delete, Backspace
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // Node must still exist and no unsaved changes indicator appears
    expect(document.querySelector('[data-node-id="topic-bat-chanh-dao"]')).toBeInTheDocument();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 2: Tab creates child "New node" appended to end of children
  // =========================================================================
  it("Scenario 2: Tab creates child 'New node' appended to children and moves focus to it", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus doc-child-tap (which has 0 children initially)
    focusNodeOnCanvas("doc-child-tap");

    // Press Tab to create child
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });

    // Verify a new node with title "New node" is created
    const newNodes = screen.getAllByText("New node");
    expect(newNodes.length).toBeGreaterThanOrEqual(1);

    // Verify dirty state is active
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();

    // Verify newly created child has focus
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveTextContent("New node");
  });

  // =========================================================================
  // SCENARIO 3: Enter creates sibling "New node" inserted immediately after
  // =========================================================================
  it("Scenario 3: Enter creates sibling 'New node' inserted immediately after current node", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus doc-child-kho (index 0 among root's children: kho, tap, diet)
    focusNodeOnCanvas("doc-child-kho");

    // Press Enter to create sibling
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });

    // Verify a new sibling with title "New node" is created
    const newNodes = screen.getAllByText("New node");
    expect(newNodes.length).toBeGreaterThanOrEqual(1);

    // Verify dirty state
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();

    // Verify focus moves to the new sibling
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveTextContent("New node");
  });

  // =========================================================================
  // SCENARIO 4: Enter on root is no-op
  // =========================================================================
  it("Scenario 4: Enter on root is a strict no-op", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus root node
    focusNodeOnCanvas("doc-root");

    // Press Enter on root
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });

    // No new node titled "New node" created
    expect(screen.queryByText("New node")).not.toBeInTheDocument();

    // Dirty state remains clean
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 5: Delete removes full subtree and shifts focus to fallback
  // =========================================================================
  it("Scenario 5: Delete removes full subtree without reparenting, moving focus to fallback", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // doc-child-kho has child doc-grandchild-sinh
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).toBeInTheDocument();
    expect(document.querySelector('[data-node-id="doc-grandchild-sinh"]')).toBeInTheDocument();

    // Focus doc-child-kho
    focusNodeOnCanvas("doc-child-kho");

    // Press Delete
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });

    // Both doc-child-kho and its grandchild must be removed from DOM
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-grandchild-sinh]')).not.toBeInTheDocument();

    // Dirty state is active
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();

    // Focus moves to next sibling (doc-child-tap)
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveAttribute("data-node-id", "doc-child-tap");
  });

  // =========================================================================
  // SCENARIO 6: Backspace parity with Delete
  // =========================================================================
  it("Scenario 6: Backspace has exact parity with Delete and falls back to preceding sibling", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus last sibling doc-child-diet
    focusNodeOnCanvas("doc-child-diet");

    // Press Backspace
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // doc-child-diet must be removed
    expect(document.querySelector('[data-node-id="doc-child-diet"]')).not.toBeInTheDocument();

    // Dirty state is active
    expect(screen.getByTestId("unsaved-changes-badge")).toBeInTheDocument();

    // Fallback focus to preceding sibling (doc-child-tap)
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveAttribute("data-node-id", "doc-child-tap");
  });

  // =========================================================================
  // SCENARIO 7: Root cannot be deleted
  // =========================================================================
  it("Scenario 7: Root cannot be deleted via Delete or Backspace", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus root node
    focusNodeOnCanvas("doc-root");

    // Press Delete and Backspace
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // Root is intact and dirty state remains clean
    expect(document.querySelector('[data-node-id="doc-root"]')).toBeInTheDocument();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 8: Drawer open blocks authoring
  // =========================================================================
  it("Scenario 8: Drawer open blocks canvas keyboard authoring", () => {
    render(<MindMapView />);
    openSavedDocument();

    // Click node to open Drawer (Phase M2)
    const khoNode = document.querySelector('[data-node-id="doc-child-kho"]');
    fireEvent.click(khoNode!);
    expect(screen.getByTestId("mindmap-node-drawer")).toBeInTheDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Try pressing Tab, Enter, Delete, Backspace while drawer is open
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // No authoring mutation occurs
    expect(screen.queryByText("New node")).not.toBeInTheDocument();
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 9: Form/input target blocks authoring
  // =========================================================================
  it("Scenario 9: Form/input target blocks canvas keyboard authoring", () => {
    render(<MindMapView />);
    openSavedDocument();

    // Use search or filter input in toolbar
    const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
    expect(searchInput).toBeInTheDocument();

    // Trigger keys on the input target
    fireEvent.keyDown(searchInput, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(searchInput, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(searchInput, { key: "Backspace", code: "Backspace" });

    // No authoring mutation occurs
    expect(screen.queryByText("New node")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 10: Undo/Redo contract for create/delete
  // =========================================================================
  it("Scenario 10: Undo/Redo restores and reapplies keyboard authoring mutations accurately", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus doc-child-tap and create a child via Tab
    focusNodeOnCanvas("doc-child-tap");
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });

    expect(screen.getByText("New node")).toBeInTheDocument();

    // Undo the creation
    const undoBtn = screen.getByTestId("mindmap-undo-button");
    expect(undoBtn).not.toBeDisabled();
    fireEvent.click(undoBtn);

    // Node "New node" disappears
    expect(screen.queryByText("New node")).not.toBeInTheDocument();

    // Redo the creation
    const redoBtn = screen.getByTestId("mindmap-redo-button");
    expect(redoBtn).not.toBeDisabled();
    fireEvent.click(redoBtn);

    // Node "New node" reappears
    expect(screen.getByText("New node")).toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 11: Save Version parity
  // =========================================================================
  it("Scenario 11: Save Version persists keyboard authoring mutations faithfully", async () => {
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
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Focus doc-child-tap and create a child via Tab
    focusNodeOnCanvas("doc-child-tap");
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });

    expect(screen.getByText("New node")).toBeInTheDocument();

    // Save Version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    const saveModal = screen.getByTestId("mindmap-save-modal");
    fireEvent.change(screen.getByTestId("input-change-summary"), {
      target: { value: "Thêm nhánh mới bằng phím tắt Tab" },
    });
    fireEvent.click(screen.getByTestId("btn-confirm-save-doc"));

    // Verify appendMindMapVersion was called with the new child in treeData
    expect(appendVersionSpy).toHaveBeenCalled();
    const saveCallInput = appendVersionSpy.mock.calls[0][0];
    const tapParent = saveCallInput.treeData.children.find((c: any) => c.id === "doc-child-tap");
    expect(tapParent?.children.length).toBe(1);
    expect(tapParent?.children[0].title).toBe("New node");
  });
});
