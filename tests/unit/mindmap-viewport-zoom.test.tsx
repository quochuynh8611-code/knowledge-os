import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen } from "@testing-library/react";
import {
  MindMapTreeCanvas,
  clampZoom,
  computeFitScale,
  formatZoomPercent,
} from "../../src/components/mindmap/MindMapTreeCanvas";
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

  describe("Phase B3: Fit-to-Viewport Viewport Controls", () => {
    it("Scenario 10: Backdrop smaller than content calculates fitting scale and centers pan", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");
      const btnFit = screen.getByTestId("btn-zoom-fit");

      expect(btnFit).toBeInTheDocument();

      // Mock geometry: backdrop (600 x 400), content (1000 x 800)
      vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
        width: 600,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.click(btnFit);

      // (400 - 64) / 800 = 336 / 800 = 0.42 (fits below 0.5 down to FIT_MIN_ZOOM 0.1)
      expect(canvasContent.style.transform).toContain("scale(0.42)");
    });

    it("Scenario 11: Very large content with computed scale < 0.5 scales down to FIT_MIN_ZOOM (0.1) instead of being cut off at 0.5", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");
      const btnFit = screen.getByTestId("btn-zoom-fit");
      const btnZoomReset = screen.getByTestId("btn-zoom-reset");

      // Mock geometry: backdrop (400 x 300), content (2000 x 2000)
      // Available: height = 300 - 64 = 236 -> 236 / 2000 = 0.118 -> 0.12
      vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
        width: 2000,
        height: 2000,
        top: 0,
        left: 0,
        bottom: 2000,
        right: 2000,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.click(btnFit);

      expect(btnZoomReset).toHaveTextContent("12%");
      expect(canvasContent.style.transform).toContain("scale(0.12)");
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });

    it("Scenario 12: Reset button restores transform back to translate(0px, 0px) scale(1) after fit", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");
      const btnFit = screen.getByTestId("btn-zoom-fit");
      const btnZoomReset = screen.getByTestId("btn-zoom-reset");

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
        width: 1200,
        height: 900,
        top: 0,
        left: 0,
        bottom: 900,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.click(btnFit);
      expect(canvasContent.style.transform).not.toContain("scale(1)");

      fireEvent.click(btnZoomReset);
      expect(btnZoomReset).toHaveTextContent("100%");
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
      expect(canvasContent.style.transform).toContain("scale(1)");
    });
  });

  describe("Phase M4b-A: Viewport Zoom Polish & Control Isolation Hardening", () => {
    it("Scenario 13: Zero-size geometry fails closed to zoom 1.0 and pan (0, 0) upon fit", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");
      const btnFit = screen.getByTestId("btn-zoom-fit");
      const btnZoomReset = screen.getByTestId("btn-zoom-reset");

      // Backdrop has 0 width and height (e.g. unmounted or hidden container)
      vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
        width: 1000,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.click(btnFit);

      expect(btnZoomReset).toHaveTextContent("100%");
      expect(canvasContent.style.transform).toContain("scale(1)");
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });

    it("Scenario 14: Pointer down on zoom controls widget does not trigger backdrop drag-pan", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const zoomControls = screen.getByTestId("mindmap-zoom-controls");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

      // Pointer down directly on controls widget
      fireEvent.pointerDown(zoomControls, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(zoomControls, { clientX: 180, clientY: 190 });
      fireEvent.pointerUp(zoomControls);

      // Pan translation must remain untouched at (0px, 0px)
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });

    it("Scenario 15: Pointer down on minimap radar does not trigger backdrop drag-pan", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      const minimap = screen.getByTestId("mindmap-minimap");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

      // Pointer down on minimap container
      fireEvent.pointerDown(minimap, { clientX: 50, clientY: 50, button: 0 });
      fireEvent.pointerMove(minimap, { clientX: 120, clientY: 130 });
      fireEvent.pointerUp(minimap);

      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });

    it("Scenario 16: Canvas keyboard shortcuts respect shouldIgnoreCanvasShortcut in interactive elements", () => {
      const onSelectMultipleNodesMock = vi.fn();

      render(
        <div>
          <input data-testid="test-text-input" type="text" />
          <MindMapTreeCanvas
            tree={mockTree}
            layoutMode="tree_horizontal"
            collapsedNodeIds={new Set()}
            onSelectMultipleNodes={onSelectMultipleNodesMock}
          />
        </div>
      );

      const input = screen.getByTestId("test-text-input");

      // Press Cmd+A inside text input
      fireEvent.keyDown(input, { key: "a", metaKey: true });

      // Canvas shortcut must not hijack input Cmd+A
      expect(onSelectMultipleNodesMock).not.toHaveBeenCalled();
    });

    it("Scenario 17: Pure viewport arithmetic helpers enforce clamps, formatting, and fail-closed geometry", () => {
      // 1. clampZoom tests
      expect(clampZoom(1.0)).toBe(1.0);
      expect(clampZoom(0.2)).toBe(0.5);
      expect(clampZoom(3.5)).toBe(2.0);
      expect(clampZoom(0.5)).toBe(0.5);
      expect(clampZoom(2.0)).toBe(2.0);

      // 2. formatZoomPercent tests
      expect(formatZoomPercent(1.0)).toBe("100%");
      expect(formatZoomPercent(0.5)).toBe("50%");
      expect(formatZoomPercent(2.0)).toBe("200%");
      expect(formatZoomPercent(1.15)).toBe("115%");

      // 3. computeFitScale tests with valid geometry
      const fitNormal = computeFitScale(1000, 800, 1000, 800, 1.0, 64);
      // (1000 - 64) / 1000 = 0.936 -> 0.94
      expect(fitNormal.scale).toBeLessThanOrEqual(2.0);
      expect(fitNormal.scale).toBeGreaterThanOrEqual(0.5);
      expect(fitNormal.pan).toEqual({ x: 0, y: 0 });

      // 4. computeFitScale fail-closed on zero or invalid geometry
      const fitZeroW = computeFitScale(0, 500, 1000, 800, 1.0, 64);
      expect(fitZeroW).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });

      const fitZeroH = computeFitScale(800, 0, 1000, 800, 1.0, 64);
      expect(fitZeroH).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });

      const fitZeroContent = computeFitScale(800, 600, 0, 0, 1.0, 64);
      expect(fitZeroContent).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });
    });

    it("Scenario: Fit zoom bounds separate FIT_MIN_ZOOM (0.1) from USER_MIN_ZOOM (0.5)", () => {
      // 1. Scenario: Canvas lớn phải fit toàn bộ
      // Given backdrop 1200x800 and content 4000x3000
      const fitLarge = computeFitScale(1200, 800, 4000, 3000, 1.0, 64);
      expect(fitLarge.scale).toBeLessThan(0.5);
      expect(fitLarge.scale).toBeGreaterThanOrEqual(0.1);

      // 2. Scenario: Canvas nhỏ không phóng quá giới hạn
      const fitSmall = computeFitScale(1200, 800, 200, 150, 1.0, 64);
      expect(fitSmall.scale).toBeLessThanOrEqual(2.0);

      // 3. Scenario: Kích thước không hợp lệ phải fail-closed
      expect(computeFitScale(0, 800, 4000, 3000, 1.0, 64)).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });
      expect(computeFitScale(1200, -100, 4000, 3000, 1.0, 64)).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });
      expect(computeFitScale(1200, 800, NaN, 3000, 1.0, 64)).toEqual({ scale: 1.0, pan: { x: 0, y: 0 } });

      // 4. Scenario: Zoom thủ công vẫn bị giới hạn [0.5, 2.0]
      expect(clampZoom(0.2)).toBe(0.5);
      expect(clampZoom(3.0)).toBe(2.0);
    });

    it("Scenario 18: Viewport interactions are read-only and do not mutate tree structure", () => {
      const onMoveUpMock = vi.fn();
      const onAddChildMock = vi.fn();
      const onDeleteNodeDirectlyMock = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          onMoveUp={onMoveUpMock}
          onAddChild={onAddChildMock}
          onDeleteNodeDirectly={onDeleteNodeDirectlyMock}
        />
      );

      const btnZoomIn = screen.getByTestId("btn-zoom-in");
      const btnZoomOut = screen.getByTestId("btn-zoom-out");
      const btnZoomReset = screen.getByTestId("btn-zoom-reset");
      const btnFit = screen.getByTestId("btn-zoom-fit");

      fireEvent.click(btnZoomIn);
      fireEvent.click(btnZoomOut);
      fireEvent.click(btnFit);
      fireEvent.click(btnZoomReset);

      // Verify zero mutation callbacks were triggered
      expect(onMoveUpMock).not.toHaveBeenCalled();
      expect(onAddChildMock).not.toHaveBeenCalled();
      expect(onDeleteNodeDirectlyMock).not.toHaveBeenCalled();
    });
  });
});
