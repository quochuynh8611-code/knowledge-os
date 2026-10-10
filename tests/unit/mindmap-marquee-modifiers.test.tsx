import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import type { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import type { MindMapDocumentNode } from "../../src/types/mindmapDocument";

let mockTopics: any[] = [
  {
    id: "topic-root",
    title: "Root Topic",
    visibility: "visible",
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = "topic-root";

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: vi.fn(),
  }),
}));

describe("Phase P7.B — Additive & Subtractive Marquee Selection", () => {
  const mockTree: MindMapTreeNode = {
    id: "topic-root",
    title: "Root Topic",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "child-1",
        title: "Child 1",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        tags: [],
        children: [],
      },
      {
        id: "child-2",
        title: "Child 2",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        tags: [],
        children: [],
      },
      {
        id: "child-3",
        title: "Child 3",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        tags: [],
        children: [],
      },
    ],
  };

  const mockSavedDocTree: MindMapDocumentNode = {
    id: "topic-root",
    title: "Root Topic",
    nodeType: "topic",
    children: [
      {
        id: "child-1",
        title: "Child 1",
        nodeType: "topic",
        children: [],
      },
      {
        id: "child-2",
        title: "Child 2",
        nodeType: "topic",
        children: [],
      },
      {
        id: "child-3",
        title: "Child 3",
        nodeType: "topic",
        children: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTopics = [
      {
        id: "topic-root",
        title: "Root Topic",
        visibility: "visible",
        parentId: null,
      },
    ];
    mockSelectedTopicId = "topic-root";

    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn();
    }

    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([
      {
        id: "doc-p7b",
        title: "P7B Marquee Modifiers Doc",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        tags: [],
        currentVersionNumber: 1,
        totalVersionsCount: 1,
        isArchived: false,
      },
    ]);

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue({
      id: "doc-p7b",
      title: "P7B Marquee Modifiers Doc",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      tags: [],
      currentVersionNumber: 1,
      totalVersionsCount: 1,
      isArchived: false,
    });

    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue({
      id: "ver-p7b",
      documentId: "doc-p7b",
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
    cleanup();
    vi.restoreAllMocks();
  });

  function setupGeometry(backdrop: HTMLElement, node1?: HTMLElement, node2?: HTMLElement, node3?: HTMLElement) {
    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 800,
      width: 1000,
      height: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    if (node1) {
      vi.spyOn(node1, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 100,
        right: 200,
        bottom: 150,
        width: 100,
        height: 50,
        x: 100,
        y: 100,
        toJSON: () => {},
      });
    }

    if (node2) {
      vi.spyOn(node2, "getBoundingClientRect").mockReturnValue({
        left: 250,
        top: 100,
        right: 350,
        bottom: 150,
        width: 100,
        height: 50,
        x: 250,
        y: 100,
        toJSON: () => {},
      });
    }

    if (node3) {
      vi.spyOn(node3, "getBoundingClientRect").mockReturnValue({
        left: 400,
        top: 100,
        right: 500,
        bottom: 150,
        width: 100,
        height: 50,
        x: 400,
        y: 100,
        toJSON: () => {},
      });
    }
  }

  // Scenario 1: Shift + drag replaces existing selection with intersected nodes
  it("Scenario 1: Shift + drag passes mode 'replace' and replaces existing selection", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const node3 = document.querySelector('[data-node-id="child-3"]') as HTMLElement;
    setupGeometry(backdrop, undefined, undefined, node3);

    // Shift + drag over child-3 (380, 80) -> (520, 180)
    fireEvent.pointerDown(backdrop, { clientX: 380, clientY: 80, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 520, clientY: 180, shiftKey: true });
    fireEvent.pointerUp(backdrop, { clientX: 520, clientY: 180, shiftKey: true });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith(["child-3"]);
  });

  // Scenario 2: Cmd/Ctrl + Shift + drag adds intersected nodes to existing selection
  it("Scenario 2: Cmd/Ctrl + Shift + drag passes mode 'add' to union with existing selection", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const node2 = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    const node3 = document.querySelector('[data-node-id="child-3"]') as HTMLElement;
    setupGeometry(backdrop, undefined, node2, node3);

    // Cmd + Shift + drag over child-2 and child-3 (220, 80) -> (520, 180)
    fireEvent.pointerDown(backdrop, {
      clientX: 220,
      clientY: 80,
      shiftKey: true,
      metaKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 520,
      clientY: 180,
      shiftKey: true,
      metaKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 520,
      clientY: 180,
      shiftKey: true,
      metaKey: true,
    });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith(["child-2", "child-3"], "add");
  });

  // Scenario 3: Alt/Option + Shift + drag subtracts intersected nodes from existing selection
  it("Scenario 3: Alt/Option + Shift + drag passes mode 'subtract' to difference from existing selection", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2", "child-3"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const node2 = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    setupGeometry(backdrop, undefined, node2, undefined);

    // Alt + Shift + drag over child-2 (220, 80) -> (360, 180)
    fireEvent.pointerDown(backdrop, {
      clientX: 220,
      clientY: 80,
      shiftKey: true,
      altKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 360,
      clientY: 180,
      shiftKey: true,
      altKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 360,
      clientY: 180,
      shiftKey: true,
      altKey: true,
    });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith(["child-2"], "subtract");
  });

  // Scenario 4: Empty marquee in replace mode clears existing selection
  it("Scenario 4: Empty marquee in replace mode clears existing selection", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop);

    // Drag over empty area (10, 10) -> (50, 50)
    fireEvent.pointerDown(backdrop, { clientX: 10, clientY: 10, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 50, clientY: 50, shiftKey: true });
    fireEvent.pointerUp(backdrop, { clientX: 50, clientY: 50, shiftKey: true });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith([]);
  });

  // Scenario 5: Empty marquee in add mode preserves existing selection
  it("Scenario 5: Empty marquee in add mode preserves existing selection (no-op)", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop);

    // Cmd + Shift + drag over empty area (10, 10) -> (50, 50)
    fireEvent.pointerDown(backdrop, {
      clientX: 10,
      clientY: 10,
      shiftKey: true,
      metaKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 50,
      clientY: 50,
      shiftKey: true,
      metaKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 50,
      clientY: 50,
      shiftKey: true,
      metaKey: true,
    });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith([], "add");
  });

  // Scenario 6: Empty marquee in subtract mode preserves existing selection
  it("Scenario 6: Empty marquee in subtract mode preserves existing selection (no-op)", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop);

    // Alt + Shift + drag over empty area (10, 10) -> (50, 50)
    fireEvent.pointerDown(backdrop, {
      clientX: 10,
      clientY: 10,
      shiftKey: true,
      altKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 50,
      clientY: 50,
      shiftKey: true,
      altKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 50,
      clientY: 50,
      shiftKey: true,
      altKey: true,
    });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith([], "subtract");
  });

  // Scenario 7: Ambiguous modifier combination does not start marquee mode
  it("Scenario 7: Ambiguous modifier combination (Cmd/Ctrl + Alt/Option + Shift) does not start marquee mode", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop);

    // Hold BOTH Cmd/Ctrl AND Alt with Shift
    fireEvent.pointerDown(backdrop, {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      metaKey: true,
      altKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 300,
      clientY: 300,
      shiftKey: true,
      metaKey: true,
      altKey: true,
    });

    // Marquee box must NOT be rendered
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();

    fireEvent.pointerUp(backdrop, {
      clientX: 300,
      clientY: 300,
      shiftKey: true,
      metaKey: true,
      altKey: true,
    });

    expect(onSelectMultipleNodes).not.toHaveBeenCalled();
  });

  // Scenario 8: Marquee box dynamic visual styling reflects the active mode
  it("Scenario 8: Marquee box visual styles reflect active mode (indigo for replace, emerald for add, rose for subtract)", () => {
    const { unmount } = render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop);

    // 1. Replace mode (Shift only) -> indigo
    fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 200, clientY: 200, shiftKey: true });
    let box = screen.getByTestId("mindmap-marquee-box");
    expect(box.className).toContain("border-indigo-500");
    fireEvent.pointerUp(backdrop);

    // 2. Add mode (Cmd + Shift) -> emerald
    fireEvent.pointerDown(backdrop, {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      metaKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 200,
      clientY: 200,
      shiftKey: true,
      metaKey: true,
    });
    box = screen.getByTestId("mindmap-marquee-box");
    expect(box.className).toContain("border-emerald-500");
    fireEvent.pointerUp(backdrop);

    // 3. Subtract mode (Alt + Shift) -> rose
    fireEvent.pointerDown(backdrop, {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      altKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 200,
      clientY: 200,
      shiftKey: true,
      altKey: true,
    });
    box = screen.getByTestId("mindmap-marquee-box");
    expect(box.className).toContain("border-rose-500");
    fireEvent.pointerUp(backdrop);
  });

  // Scenario 9: Node-origin pointerdown with modifier keys does not start marquee mode
  it("Scenario 9: Node-origin pointerdown with modifier keys does not start marquee mode", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
      />
    );

    const node1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    expect(node1).toBeInTheDocument();

    // Pointer-down directly on node card with Cmd + Shift
    fireEvent.pointerDown(node1, {
      clientX: 150,
      clientY: 150,
      shiftKey: true,
      metaKey: true,
      button: 0,
    });
    fireEvent.pointerMove(node1, {
      clientX: 300,
      clientY: 300,
      shiftKey: true,
      metaKey: true,
    });

    // Marquee box must NOT be rendered
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();
  });

  // Scenario 10: MindMapView orchestrator handles replace, add, and subtract set operations
  it("Scenario 10: MindMapView orchestrator handles replace, add, and subtract set operations", () => {
    render(<MindMapView />);

    // Open saved doc
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByText("P7B Marquee Modifiers Doc"));

    const node1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2 = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    const node3 = document.querySelector('[data-node-id="child-3"]') as HTMLElement;
    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    setupGeometry(backdrop, node1, node2, node3);

    // Initial select child-1 by clicking
    fireEvent.click(node1);
    expect(node1).toHaveAttribute("data-selected", "true");
    expect(node2).not.toHaveAttribute("data-selected", "true");

    // Add child-2 via Cmd + Shift + drag over child-2
    fireEvent.pointerDown(backdrop, {
      clientX: 230,
      clientY: 80,
      shiftKey: true,
      metaKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 370,
      clientY: 170,
      shiftKey: true,
      metaKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 370,
      clientY: 170,
      shiftKey: true,
      metaKey: true,
    });

    // Both child-1 and child-2 should now be selected (Union)
    expect(node1).toHaveAttribute("data-selected", "true");
    expect(node2).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("batch-selection-count")).toHaveTextContent("2");

    // Subtract child-1 via Alt + Shift + drag over child-1
    fireEvent.pointerDown(backdrop, {
      clientX: 80,
      clientY: 80,
      shiftKey: true,
      altKey: true,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 220,
      clientY: 170,
      shiftKey: true,
      altKey: true,
    });
    fireEvent.pointerUp(backdrop, {
      clientX: 220,
      clientY: 170,
      shiftKey: true,
      altKey: true,
    });

    // child-1 is subtracted, child-2 remains selected (Difference)
    expect(node1).not.toHaveAttribute("data-selected", "true");
    expect(node2).toHaveAttribute("data-selected", "true");
  });
});
