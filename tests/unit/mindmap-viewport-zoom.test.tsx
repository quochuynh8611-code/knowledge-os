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
  });
});
