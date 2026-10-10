import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import type { MindMapTreeNode } from "../../src/lib/mindmapProjection";

describe("Phase P7.A — Marquee Drag-Box Selection & Selection Ergonomics", () => {
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

  const mockNestedTree: MindMapTreeNode = {
    id: "topic-root",
    title: "Root Topic",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "branch-a",
        title: "Branch A",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        tags: [],
        children: [
          {
            id: "leaf-1",
            title: "Leaf 1",
            type: "note",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "branch-a",
            tags: [],
            children: [],
          },
        ],
      },
      {
        id: "branch-b",
        title: "Branch B",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        tags: [],
        children: [
          {
            id: "leaf-2",
            title: "Leaf 2",
            type: "note",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "branch-b",
            tags: [],
            children: [],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = vi.fn();
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = vi.fn();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // Scenario 1
  it("Scenario 1: Shift + Drag on backdrop draws marquee box and selects intersected nodes", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const node1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    const node2 = document.querySelector('[data-node-id="child-2"]') as HTMLElement;
    const node3 = document.querySelector('[data-node-id="child-3"]') as HTMLElement;

    expect(node1).toBeInTheDocument();
    expect(node2).toBeInTheDocument();
    expect(node3).toBeInTheDocument();

    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    vi.spyOn(node1, "getBoundingClientRect").mockReturnValue({
      left: 150,
      top: 150,
      right: 250,
      bottom: 200,
      width: 100,
      height: 50,
      x: 150,
      y: 150,
      toJSON: () => {},
    });

    vi.spyOn(node2, "getBoundingClientRect").mockReturnValue({
      left: 300,
      top: 220,
      right: 380,
      bottom: 270,
      width: 80,
      height: 50,
      x: 300,
      y: 220,
      toJSON: () => {},
    });

    vi.spyOn(node3, "getBoundingClientRect").mockReturnValue({
      left: 500,
      top: 500,
      right: 600,
      bottom: 550,
      width: 100,
      height: 50,
      x: 500,
      y: 500,
      toJSON: () => {},
    });

    // Pointer down with Shift
    fireEvent.pointerDown(backdrop, {
      clientX: 100,
      clientY: 100,
      shiftKey: true,
      button: 0,
    });

    // Pointer move to (400, 300)
    fireEvent.pointerMove(backdrop, {
      clientX: 400,
      clientY: 300,
      shiftKey: true,
    });

    // Marquee box should be visible
    const marqueeBox = screen.getByTestId("mindmap-marquee-box");
    expect(marqueeBox).toBeInTheDocument();
    expect(marqueeBox.style.width).toBe("300px");
    expect(marqueeBox.style.height).toBe("200px");

    // Pointer up
    fireEvent.pointerUp(backdrop, {
      clientX: 400,
      clientY: 300,
      shiftKey: true,
    });

    // Marquee box removed
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();

    // Intersected nodes child-1 and child-2 selected
    expect(onSelectMultipleNodes).toHaveBeenCalledWith(["child-1", "child-2"]);
  });

  // Scenario 2
  it("Scenario 2: Regular drag on backdrop without Shift pans canvas and does not draw marquee box", () => {
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
    const content = screen.getByTestId("mindmap-canvas-content");

    // Drag without Shift
    fireEvent.pointerDown(backdrop, {
      clientX: 100,
      clientY: 100,
      shiftKey: false,
      button: 0,
    });
    fireEvent.pointerMove(backdrop, {
      clientX: 200,
      clientY: 150,
      shiftKey: false,
    });
    fireEvent.pointerUp(backdrop);

    // Pan offset updated
    expect(content.style.transform).toContain("translate(100px, 50px)");

    // No marquee box rendered
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();
    expect(onSelectMultipleNodes).not.toHaveBeenCalled();
  });

  // Scenario 3
  it("Scenario 3: Pressing Escape clears selection and hides batch action bar", () => {
    const onClearSelection = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1", "child-2", "child-3"])}
        onClearSelection={onClearSelection}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    backdrop.focus();

    fireEvent.keyDown(backdrop, { key: "Escape" });

    expect(onClearSelection).toHaveBeenCalled();
  });

  // Scenario 4
  it("Scenario 4: Cmd+A / Ctrl+A selects all logical visible nodes excluding collapsed descendants", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockNestedTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set(["branch-b"])}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    backdrop.focus();

    const preventDefault = vi.fn();
    fireEvent.keyDown(backdrop, {
      key: "a",
      metaKey: true,
      preventDefault,
    });

    // topic-root, branch-a, leaf-1, branch-b are selected; leaf-2 is collapsed descendant so excluded
    expect(onSelectMultipleNodes).toHaveBeenCalledWith([
      "topic-root",
      "branch-a",
      "leaf-1",
      "branch-b",
    ]);
  });

  // Scenario 5
  it("Scenario 5: Escape and Cmd+A do not interfere with editable text inputs", () => {
    const onClearSelection = vi.fn();
    const onSelectMultipleNodes = vi.fn();
    render(
      <div>
        <input data-testid="test-text-input" type="text" />
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          selectedNodeIds={new Set(["child-1"])}
          onClearSelection={onClearSelection}
          onSelectMultipleNodes={onSelectMultipleNodes}
        />
      </div>
    );

    const input = screen.getByTestId("test-text-input");
    input.focus();

    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "a", metaKey: true });

    expect(onClearSelection).not.toHaveBeenCalled();
    expect(onSelectMultipleNodes).not.toHaveBeenCalled();
  });

  // Scenario 6
  it("Scenario 6: Marquee drag does not trigger backdrop click deselect", () => {
    const onClearSelection = vi.fn();
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        selectedNodeIds={new Set(["child-1"])}
        onClearSelection={onClearSelection}
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");

    // Perform marquee drag (> 5px)
    fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 200, clientY: 200, shiftKey: true });
    fireEvent.pointerUp(backdrop, { clientX: 200, clientY: 200, shiftKey: true });

    // Subsequent click event on backdrop fired by browser
    fireEvent.click(backdrop);

    // Click handler must NOT call onClearSelection
    expect(onClearSelection).not.toHaveBeenCalled();
  });

  // Scenario 7
  it("Scenario 7: Canvas scroll offset is compensated when positioning marquee box", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    Object.defineProperty(backdrop, "scrollLeft", { value: 150, writable: true });
    Object.defineProperty(backdrop, "scrollTop", { value: 80, writable: true });

    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      right: 810,
      bottom: 620,
      width: 800,
      height: 600,
      x: 10,
      y: 20,
      toJSON: () => {},
    });

    fireEvent.pointerDown(backdrop, { clientX: 200, clientY: 200, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 350, clientY: 300, shiftKey: true });

    const marqueeBox = screen.getByTestId("mindmap-marquee-box");
    expect(marqueeBox).toBeInTheDocument();

    // left = min(200, 350) - 10 + 150 = 340px
    // top = min(200, 300) - 20 + 80 = 260px
    expect(marqueeBox.style.left).toBe("340px");
    expect(marqueeBox.style.top).toBe("260px");
    expect(marqueeBox.style.width).toBe("150px");
    expect(marqueeBox.style.height).toBe("100px");
  });

  // Scenario 8
  it("Scenario 8: Pointer cancel aborts marquee without mutating selection", () => {
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

    fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 300, clientY: 300, shiftKey: true });

    expect(screen.getByTestId("mindmap-marquee-box")).toBeInTheDocument();

    // Pointer cancel
    fireEvent.pointerCancel(backdrop);

    // Box immediately removed and selection not mutated
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();
    expect(onSelectMultipleNodes).not.toHaveBeenCalled();
  });

  // Scenario 9
  it("Scenario 9: Empty marquee clears previous selection", () => {
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

    // All nodes placed outside (10, 10) -> (50, 50)
    const node1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    vi.spyOn(node1, "getBoundingClientRect").mockReturnValue({
      left: 300,
      top: 300,
      right: 400,
      bottom: 350,
      width: 100,
      height: 50,
      x: 300,
      y: 300,
      toJSON: () => {},
    });

    fireEvent.pointerDown(backdrop, { clientX: 10, clientY: 10, shiftKey: true, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 50, clientY: 50, shiftKey: true });
    fireEvent.pointerUp(backdrop, { clientX: 50, clientY: 50, shiftKey: true });

    // onSelectMultipleNodes called with empty array to clear previous selection
    expect(onSelectMultipleNodes).toHaveBeenCalledWith([]);
  });

  // Scenario 10
  it("Scenario 10: Cmd+A selects logical visible nodes including nodes outside the viewport", () => {
    const onSelectMultipleNodes = vi.fn();
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        onSelectMultipleNodes={onSelectMultipleNodes}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    backdrop.focus();

    fireEvent.keyDown(backdrop, { key: "A", ctrlKey: true });

    expect(onSelectMultipleNodes).toHaveBeenCalledWith([
      "topic-root",
      "child-1",
      "child-2",
      "child-3",
    ]);
  });

  // Scenario 11
  it("Scenario 11: Pointer-down on a node does not start marquee mode", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
      />
    );

    const node1 = document.querySelector('[data-node-id="child-1"]') as HTMLElement;
    expect(node1).toBeInTheDocument();

    // Pointer-down directly on node card with Shift
    fireEvent.pointerDown(node1, { clientX: 150, clientY: 150, shiftKey: true, button: 0 });
    fireEvent.pointerMove(node1, { clientX: 300, clientY: 300, shiftKey: true });

    // Marquee box must NOT be rendered
    expect(screen.queryByTestId("mindmap-marquee-box")).toBeNull();
  });
});
