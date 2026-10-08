import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import type { MindMapTreeNode } from "../../src/lib/mindmapProjection";

describe("Mind Map Phase E1: Minimap Overview Radar (Minimal First Slice)", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const mockMultiNodeTree: MindMapTreeNode = {
    id: "topic-root",
    title: "Tứ Diệu Đế",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "topic-child-1",
        title: "Khổ Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 5,
        tags: [],
        children: [
          {
            id: "topic-grandchild-1",
            title: "Tam Khổ",
            type: "topic",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "topic-child-1",
            edgeTypeToParent: "related",
            edgeStrength: 3,
            tags: [],
            children: [],
          },
        ],
      },
      {
        id: "topic-child-2",
        title: "Tập Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 5,
        tags: [],
        children: [],
      },
    ],
  };

  const mockSingleNodeTree: MindMapTreeNode = {
    id: "topic-root-only",
    title: "Chủ Đề Độc Lập",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [],
  };

  it("Scenario 1: Renders minimap container and radar SVG for non-trivial tree on desktop", () => {
    // Given: A non-trivial multi-node tree
    // When: Rendered inside MindMapTreeCanvas
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // Then: Minimap container and SVG radar should be present in the canvas
    const minimap = screen.getByTestId("mindmap-minimap");
    expect(minimap).toBeInTheDocument();

    const radarSvg = screen.getByTestId("minimap-radar-svg");
    expect(radarSvg).toBeInTheDocument();

    const viewportRect = screen.getByTestId("minimap-viewport-rect");
    expect(viewportRect).toBeInTheDocument();
  });

  it("Scenario 2: Gracefully hides or no-ops minimap for single-node root tree", () => {
    // Given: A trivial tree with only a root node and no children
    // When: Rendered inside MindMapTreeCanvas
    render(
      <MindMapTreeCanvas
        tree={mockSingleNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // Then: Minimap should not render to avoid UI clutter
    const minimap = screen.queryByTestId("mindmap-minimap");
    expect(minimap).not.toBeInTheDocument();
  });

  it("Scenario 3: Computes and updates viewport indicator size from zoom scale ratio", () => {
    // Given: Multi-node tree with mocked geometry
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");

    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
      width: 1600,
      height: 1200,
      top: 0,
      left: 0,
      bottom: 1200,
      right: 1600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    // When: Zoom in to increase canvas scale
    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    fireEvent.click(btnZoomIn);

    // Then: Viewport indicator rectangle should be scaled inversely
    const viewportRect = screen.getByTestId("minimap-viewport-rect");
    expect(viewportRect).toBeInTheDocument();
    // Indicator width/height should be non-zero and non-negative
    const widthAttr = viewportRect.getAttribute("width") || viewportRect.style.width;
    expect(Number.parseFloat(widthAttr || "0")).toBeGreaterThan(0);
  });

  it("Scenario 4: Clicking minimap requests pan change to center target coordinates", () => {
    // Given: Multi-node tree rendered with zoom
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");

    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
      width: 1600,
      height: 1200,
      top: 0,
      left: 0,
      bottom: 1200,
      right: 1600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const radarSvg = screen.getByTestId("minimap-radar-svg");
    vi.spyOn(radarSvg, "getBoundingClientRect").mockReturnValue({
      width: 160,
      height: 120,
      top: 100,
      left: 100,
      bottom: 220,
      right: 260,
      x: 100,
      y: 100,
      toJSON: () => {},
    });

    // Initial transform
    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

    // When: Click inside minimap radar at a target coordinate (e.g. right side x=150)
    fireEvent.click(radarSvg, { clientX: 150, clientY: 110 });

    // Then: Main canvas pan should update to reflect recentering
    expect(canvasContent.style.transform).not.toContain("translate(0px, 0px)");
  });

  it("Scenario 5: Pointer interaction on minimap stops propagation and does not trigger backdrop drag", () => {
    // Given: Multi-node tree with backdrop
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");
    const minimap = screen.getByTestId("mindmap-minimap");

    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

    // When: Pointer down on minimap container, then move pointer
    fireEvent.pointerDown(minimap, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 120, clientY: 150 });
    fireEvent.pointerUp(backdrop);

    // Then: Backdrop drag should NOT have been activated, pan remains (0, 0)
    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
  });
});
