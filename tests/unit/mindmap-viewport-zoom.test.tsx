import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import type { MindMapTreeNode } from "../../src/lib/mindmapProjection";

describe("Mind Map Phase B1: Minimal Viewport Zoom Controls", () => {
  afterEach(() => {
    cleanup();
  });

  const mockTree: MindMapTreeNode = {
    id: "topic-a",
    title: "Tứ Diệu Đế",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "topic-b",
        title: "Khổ Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-a",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 5,
        tags: [],
        children: [],
      },
    ],
  };

  it("Scenario 1: Renders zoom controls widget with default 100% zoom", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const controls = screen.getByTestId("mindmap-zoom-controls");
    expect(controls).toBeInTheDocument();

    const btnZoomOut = screen.getByTestId("btn-zoom-out");
    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    const btnZoomReset = screen.getByTestId("btn-zoom-reset");

    expect(btnZoomOut).toBeInTheDocument();
    expect(btnZoomIn).toBeInTheDocument();
    expect(btnZoomReset).toBeInTheDocument();
    expect(btnZoomReset).toHaveTextContent("100%");
  });

  it("Scenario 2: Zoom in increases scale by 10% and updates container style", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    const btnZoomReset = screen.getByTestId("btn-zoom-reset");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");

    fireEvent.click(btnZoomIn);

    expect(btnZoomReset).toHaveTextContent("110%");
    expect(canvasContent.style.transform).toContain("scale(1.1)");
  });

  it("Scenario 3: Zoom out decreases scale by 10% and updates container style", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const btnZoomOut = screen.getByTestId("btn-zoom-out");
    const btnZoomReset = screen.getByTestId("btn-zoom-reset");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");

    fireEvent.click(btnZoomOut);

    expect(btnZoomReset).toHaveTextContent("90%");
    expect(canvasContent.style.transform).toContain("scale(0.9)");
  });

  it("Scenario 4: Zoom scale is clamped at minimum 50% and maximum 200%", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const btnZoomOut = screen.getByTestId("btn-zoom-out");
    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    const btnZoomReset = screen.getByTestId("btn-zoom-reset");

    // Zoom out repeatedly beyond 50%
    for (let i = 0; i < 10; i++) {
      fireEvent.click(btnZoomOut);
    }
    expect(btnZoomReset).toHaveTextContent("50%");
    expect(btnZoomOut).toBeDisabled();

    // Zoom in repeatedly beyond 200%
    for (let i = 0; i < 20; i++) {
      fireEvent.click(btnZoomIn);
    }
    expect(btnZoomReset).toHaveTextContent("200%");
    expect(btnZoomIn).toBeDisabled();
  });

  it("Scenario 5: Reset button restores zoom scale back to 100%", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    const btnZoomReset = screen.getByTestId("btn-zoom-reset");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");

    fireEvent.click(btnZoomIn);
    fireEvent.click(btnZoomIn);
    expect(btnZoomReset).toHaveTextContent("120%");

    fireEvent.click(btnZoomReset);
    expect(btnZoomReset).toHaveTextContent("100%");
    expect(canvasContent.style.transform).toContain("scale(1)");
    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
  });

  describe("Phase B2: Minimal Drag-to-Pan Viewport", () => {
    it("Scenario 6: Dragging on empty backdrop updates transform translate", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      // Initially at (0, 0)
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

      // Pointer down at (100, 100)
      fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, button: 0 });

      // Pointer move to (160, 180) -> delta (60, 80)
      fireEvent.pointerMove(backdrop, { clientX: 160, clientY: 180 });

      expect(canvasContent.style.transform).toContain("translate(60px, 80px)");

      // Pointer up releases drag
      fireEvent.pointerUp(backdrop);

      // Subsequent move without pointerDown should not change pan
      fireEvent.pointerMove(backdrop, { clientX: 200, clientY: 250 });
      expect(canvasContent.style.transform).toContain("translate(60px, 80px)");
    });

    it("Scenario 7: Multiple drags accumulate translation coordinates", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      // First drag: +50px x, +30px y
      fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(backdrop, { clientX: 150, clientY: 130 });
      fireEvent.pointerUp(backdrop);
      expect(canvasContent.style.transform).toContain("translate(50px, 30px)");

      // Second drag: -20px x, +40px y
      fireEvent.pointerDown(backdrop, { clientX: 200, clientY: 200, button: 0 });
      fireEvent.pointerMove(backdrop, { clientX: 180, clientY: 240 });
      fireEvent.pointerUp(backdrop);
      expect(canvasContent.style.transform).toContain("translate(30px, 70px)");
    });

    it("Scenario 8: Reset button restores both pan and zoom back to default", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const btnZoomIn = screen.getByTestId("btn-zoom-in");
      const btnZoomReset = screen.getByTestId("btn-zoom-reset");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      // Zoom to 120%
      fireEvent.click(btnZoomIn);
      fireEvent.click(btnZoomIn);

      // Pan to (45, 65)
      fireEvent.pointerDown(backdrop, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(backdrop, { clientX: 145, clientY: 165 });
      fireEvent.pointerUp(backdrop);

      expect(canvasContent.style.transform).toContain("translate(45px, 65px)");
      expect(canvasContent.style.transform).toContain("scale(1.2)");

      // Click reset
      fireEvent.click(btnZoomReset);

      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
      expect(canvasContent.style.transform).toContain("scale(1)");
      expect(btnZoomReset).toHaveTextContent("100%");
    });

    it("Scenario 9: Node card clicks do not trigger pan and invoke select topic cleanly", () => {
      let selectedTopicId: string | null = null;

      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          onSelectTopic={(id) => {
            selectedTopicId = id;
          }}
        />
      );

      const canvasContent = screen.getByTestId("mindmap-canvas-content");
      const nodeCard = screen.getByText("Khổ Đế");

      // Click node card
      fireEvent.click(nodeCard);

      expect(selectedTopicId).toBe("topic-b");
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });
  });
});
