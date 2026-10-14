/**
 * Test Suite: Phase M3 — Mind Map Keyboard Authoring Hardening
 *
 * Verifies the 10 required hardening behaviors:
 * 1. One Enter produces exactly one sibling mutation and history snapshot.
 * 2. One Tab produces exactly one child mutation and history snapshot.
 * 3. Modified shortcuts (Meta+Enter, Ctrl+Enter, Alt+Enter, Alt+Tab, etc.) do not mutate.
 * 4. Contenteditable target is isolated from canvas authoring.
 * 5. Drawer target is isolated from canvas authoring.
 * 6. Delete fallback prefers preceding sibling.
 * 7. Delete fallback uses succeeding sibling when preceding sibling is absent.
 * 8. Delete fallback reaches parent when no siblings exist.
 * 9. Live-topic mode remains strictly immutable to keyboard authoring.
 * 10. Save Version preserves keyboard mutations faithfully to storage.
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

describe("Phase M3 — Mind Map Keyboard Authoring Hardening", () => {
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

  const createInitialDocTree = (): MindMapDocumentNode => ({
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
  });

  const createInitialVersion = (treeData: MindMapDocumentNode): MindMapVersion => ({
    id: "ver-1",
    documentId: "doc-tu-dieu-de",
    versionNumber: 1,
    createdAt: "2026-01-01T00:00:00Z",
    changeSummary: "Khởi tạo",
    treeData,
    crossLinks: [],
    viewState: {
      layoutMode: "tree_horizontal",
      collapsedNodeIds: [],
      showCrossLinks: false,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    const tree = createInitialDocTree();
    const ver = createInitialVersion(tree);

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(ver);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
  });

  const openSavedDocument = () => {
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    const browserModal = screen.getByTestId("mindmap-browser-modal");
    fireEvent.click(within(browserModal).getByTestId(`btn-open-${mockDocSummary.id}`));
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
  // SCENARIO 1: One Enter produces exactly one sibling mutation
  // =========================================================================
  it("Scenario: One Enter produces exactly one sibling mutation", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    focusNodeOnCanvas("doc-child-kho");

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    expect(undoBtn).toBeDisabled();

    // When the user presses Enter once
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });

    // Exactly one sibling is created
    const newNodes = screen.getAllByText("New node");
    expect(newNodes.length).toBe(1);

    // Exactly one history snapshot is added
    expect(undoBtn).not.toBeDisabled();

    // Focus moves to the new sibling
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveTextContent("New node");
  });

  // =========================================================================
  // SCENARIO 2: One Tab produces exactly one child mutation
  // =========================================================================
  it("Scenario: One Tab produces exactly one child mutation", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    focusNodeOnCanvas("doc-child-tap");

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    expect(undoBtn).toBeDisabled();

    // When the user presses Tab once
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });

    // Exactly one child is created
    const newNodes = screen.getAllByText("New node");
    expect(newNodes.length).toBe(1);

    // Exactly one history snapshot is added
    expect(undoBtn).not.toBeDisabled();

    // Focus moves to the new child
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveTextContent("New node");
  });

  // =========================================================================
  // SCENARIO 3: Modified shortcuts do not mutate
  // =========================================================================
  it("Scenario: Modified shortcuts do not mutate", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    focusNodeOnCanvas("doc-child-kho");

    const undoBtn = screen.getByTestId("mindmap-undo-button");
    expect(undoBtn).toBeDisabled();

    // When the user presses Meta+Enter, Ctrl+Enter, Alt+Enter, or Alt+Tab
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter", metaKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter", ctrlKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter", altKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab", altKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab", ctrlKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab", metaKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete", metaKey: true });
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace", ctrlKey: true });

    // Then the tree remains unchanged
    expect(screen.queryByText("New node")).not.toBeInTheDocument();
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).toBeInTheDocument();

    // And history remains unchanged
    expect(undoBtn).toBeDisabled();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 4: Contenteditable target is isolated
  // =========================================================================
  it("Scenario: Contenteditable target is isolated", () => {
    render(
      <div>
        <div
          data-testid="editable-area"
          contentEditable="true"
          tabIndex={0}
        >
          Editable text area
        </div>
        <MindMapView />
      </div>
    );
    openSavedDocument();

    focusNodeOnCanvas("doc-child-kho");
    const editable = screen.getByTestId("editable-area");
    editable.focus();

    // When the user presses Tab, Enter, Delete, or Backspace inside contenteditable
    fireEvent.keyDown(editable, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(editable, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(editable, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(editable, { key: "Backspace", code: "Backspace" });

    // Then no tree mutation occurs
    expect(screen.queryByText("New node")).not.toBeInTheDocument();
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).toBeInTheDocument();
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 5: Drawer target is isolated
  // =========================================================================
  it("Scenario: Drawer target is isolated", () => {
    render(<MindMapView />);
    openSavedDocument();

    // Click node to open drawer
    const khoNode = document.querySelector('[data-node-id="doc-child-kho"]');
    fireEvent.click(khoNode!);
    const drawer = screen.getByTestId("mindmap-node-drawer");
    expect(drawer).toBeInTheDocument();

    // Keydown dispatched on drawer elements (input or drawer body)
    const titleInput = screen.getByTestId("input-drawer-node-title");
    fireEvent.keyDown(titleInput, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(titleInput, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(titleInput, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(titleInput, { key: "Backspace", code: "Backspace" });

    fireEvent.keyDown(drawer, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(drawer, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(drawer, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(drawer, { key: "Backspace", code: "Backspace" });

    // Then no canvas authoring mutation occurs
    expect(screen.queryByText("New node")).not.toBeInTheDocument();
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 6: Delete fallback prefers preceding sibling
  // =========================================================================
  it("Scenario: Delete fallback prefers preceding sibling", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    // doc-child-tap is preceded by doc-child-kho
    focusNodeOnCanvas("doc-child-tap");

    // When the user presses Delete
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });

    // Then the focused subtree is deleted
    expect(document.querySelector('[data-node-id="doc-child-tap"]')).not.toBeInTheDocument();

    // And focus moves to the preceding sibling
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveAttribute("data-node-id", "doc-child-kho");
  });

  // =========================================================================
  // SCENARIO 7: Delete fallback uses succeeding sibling
  // =========================================================================
  it("Scenario: Delete fallback uses succeeding sibling", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    // doc-child-kho is at index 0 (no preceding sibling), followed by doc-child-tap
    focusNodeOnCanvas("doc-child-kho");

    // When the user presses Backspace
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // Then the focused subtree is deleted
    expect(document.querySelector('[data-node-id="doc-child-kho"]')).not.toBeInTheDocument();

    // And focus moves to the succeeding sibling
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveAttribute("data-node-id", "doc-child-tap");
  });

  // =========================================================================
  // SCENARIO 8: Delete fallback reaches parent
  // =========================================================================
  it("Scenario: Delete fallback reaches parent", () => {
    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    // doc-grandchild-sinh is the only child of doc-child-kho
    focusNodeOnCanvas("doc-grandchild-sinh");

    // When the user presses Delete
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });

    // Then the focused subtree is deleted
    expect(document.querySelector('[data-node-id="doc-grandchild-sinh"]')).not.toBeInTheDocument();

    // And focus moves to the parent
    const focusedElements = document.querySelectorAll('[data-focused="true"]');
    expect(focusedElements.length).toBe(1);
    expect(focusedElements[0]).toHaveAttribute("data-node-id", "doc-child-kho");
  });

  // =========================================================================
  // SCENARIO 9: Live-topic remains immutable
  // =========================================================================
  it("Scenario: Live-topic remains immutable", () => {
    render(<MindMapView />);
    // In live-topic mode (default before opening any document)
    const nodeEl = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
    expect(nodeEl).toBeInTheDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    expect(screen.queryByTestId("mindmap-undo-button")).not.toBeInTheDocument();

    // When the user presses Tab, Enter, Delete, or Backspace
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });
    fireEvent.keyDown(canvasBackdrop, { key: "Backspace", code: "Backspace" });

    // Then the projected tree remains unchanged
    expect(document.querySelector('[data-node-id="topic-bat-chanh-dao"]')).toBeInTheDocument();
    expect(screen.queryByText("New node")).not.toBeInTheDocument();

    // And no dirty-state or history mutation occurs
    expect(screen.queryByTestId("unsaved-changes-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mindmap-undo-button")).not.toBeInTheDocument();
  });

  // =========================================================================
  // SCENARIO 10: Save Version preserves keyboard mutations
  // =========================================================================
  it("Scenario: Save Version preserves keyboard mutations", () => {
    const appendVersionSpy = vi
      .spyOn(mindmapDocumentStorage, "appendMindMapVersion")
      .mockReturnValue({
        success: true,
        isVolatile: false,
        data: {
          ...createInitialVersion(createInitialDocTree()),
          versionNumber: 2,
        },
      });

    render(<MindMapView />);
    openSavedDocument();

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // 1. Tab on doc-child-tap -> adds child
    focusNodeOnCanvas("doc-child-tap");
    fireEvent.keyDown(canvasBackdrop, { key: "Tab", code: "Tab" });

    // 2. Enter on doc-child-kho -> adds sibling
    focusNodeOnCanvas("doc-child-kho");
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });

    // 3. Delete doc-child-diet
    focusNodeOnCanvas("doc-child-diet");
    fireEvent.keyDown(canvasBackdrop, { key: "Delete", code: "Delete" });

    // When the user saves a new version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    fireEvent.change(screen.getByTestId("input-change-summary"), {
      target: { value: "Mutated via keyboard" },
    });
    fireEvent.click(screen.getByTestId("btn-confirm-save-doc"));

    // Then the persisted tree matches the working tree exactly
    expect(appendVersionSpy).toHaveBeenCalled();
    const savedTree = appendVersionSpy.mock.calls[0][0].treeData;

    // doc-child-diet was deleted
    expect(savedTree.children.find((c: any) => c.id === "doc-child-diet")).toBeUndefined();

    // doc-child-tap has 1 child
    const tapNode = savedTree.children.find((c: any) => c.id === "doc-child-tap");
    expect(tapNode?.children.length).toBe(1);
    expect(tapNode?.children[0].title).toBe("New node");

    // Sibling created after doc-child-kho
    const khoIndex = savedTree.children.findIndex((c: any) => c.id === "doc-child-kho");
    expect(savedTree.children[khoIndex + 1]?.title).toBe("New node");
  });
});
