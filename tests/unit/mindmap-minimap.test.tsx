import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup, screen, act } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import type { MindMapTreeNode } from "../../src/lib/mindmapProjection";

class MockResizeObserver {
  callback: ResizeObserverCallback;
  observedElements: Element[] = [];
  isDisconnected: boolean = false;
  triggerCount: number = 0;
  static instances: MockResizeObserver[] = [];

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe = vi.fn((element: Element) => {
    if (this.isDisconnected) return;
    this.observedElements.push(element);
  });

  unobserve = vi.fn((element: Element) => {
    this.observedElements = this.observedElements.filter((el) => el !== element);
  });

  disconnect = vi.fn(() => {
    this.isDisconnected = true;
    this.observedElements = [];
  });

  trigger(entries: Partial<ResizeObserverEntry>[] = []) {
    if (this.isDisconnected) return;
    this.triggerCount++;
    this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

describe("Mind Map Phase E1: Minimap Overview Radar", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    MockResizeObserver.instances = [];
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

  function setupGeometryMocks() {
    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const canvasContent = screen.getByTestId("mindmap-canvas-content");
    const radarSvg = screen.getByTestId("minimap-radar-svg");

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

    return { backdrop, canvasContent, radarSvg };
  }

  // --- E1 MVP Base Tests (Scenarios 1 - 5) ---

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

    setupGeometryMocks();

    // When: Zoom in to increase canvas scale
    const btnZoomIn = screen.getByTestId("btn-zoom-in");
    fireEvent.click(btnZoomIn);

    // Then: Viewport indicator rectangle should be scaled inversely
    const viewportRect = screen.getByTestId("minimap-viewport-rect");
    expect(viewportRect).toBeInTheDocument();
    const widthAttr = viewportRect.getAttribute("width") || viewportRect.style.width;
    expect(Number.parseFloat(widthAttr || "0")).toBeGreaterThan(0);
  });

  it("Scenario 4: Clicking minimap requests pan change to center target coordinates", () => {
    // Given: Multi-node tree rendered with zoom and mocked geometry
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { canvasContent, radarSvg } = setupGeometryMocks();

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

  // --- Phase E1d: Drag Viewport Indicator Failing Tests (Scenarios 6 - 10) ---

  it("Scenario 6: Dragging viewport indicator updates canvas pan from mapped delta", () => {
    // Given: Multi-node tree with mocked geometry
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { canvasContent } = setupGeometryMocks();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

    // When: Pointer down on viewport indicator rect and dragged by (+20px, +10px)
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewportRect, { clientX: 90, clientY: 60, pointerId: 1 });

    // Then: Canvas transform should update with mapped delta pan
    expect(canvasContent.style.transform).not.toContain("translate(0px, 0px)");
  });

  it("Scenario 7: Pointer release or cancel stops further pan updates", () => {
    // Given: Multi-node tree with active indicator drag
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { canvasContent } = setupGeometryMocks();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // Drag start and first move
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewportRect, { clientX: 85, clientY: 55, pointerId: 1 });

    const panAfterDrag = canvasContent.style.transform;
    expect(panAfterDrag).not.toContain("translate(0px, 0px)");

    // When: Pointer is released (pointerUp)
    fireEvent.pointerUp(viewportRect, { clientX: 85, clientY: 55, pointerId: 1 });

    // Subsequent pointer movement should not change pan
    fireEvent.pointerMove(viewportRect, { clientX: 130, clientY: 90, pointerId: 1 });

    // Then: Canvas transform remains at the position captured upon pointerUp
    expect(canvasContent.style.transform).toBe(panAfterDrag);
  });

  it("Scenario 8: Dragging viewport indicator isolates background canvas drag", () => {
    // Given: Multi-node tree with backdrop
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { backdrop, canvasContent } = setupGeometryMocks();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // When: Pointer down on viewport indicator, then pointer move on backdrop
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(backdrop, { clientX: 150, clientY: 150 });

    // Then: Backdrop drag handler must not start or corrupt the indicator drag state
    expect(canvasContent.style.transform).not.toContain("translate(150px, 150px)");
  });

  it("Scenario 9: Dragging viewport indicator does not trigger SVG click-to-center", () => {
    // Given: Multi-node tree with viewport indicator
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { canvasContent } = setupGeometryMocks();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // When: Pointer down, move, up, then click event on rect
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewportRect, { clientX: 80, clientY: 55, pointerId: 1 });
    fireEvent.pointerUp(viewportRect, { clientX: 80, clientY: 55, pointerId: 1 });

    const panAfterDrag = canvasContent.style.transform;

    // Click event on the rect should be stopped from propagating to SVG click-to-center
    fireEvent.click(viewportRect);

    // Then: Canvas pan should remain as set by drag without being overwritten by click-to-center
    expect(canvasContent.style.transform).toBe(panAfterDrag);
  });

  it("Scenario 10: Dragging viewport indicator remains clamped within minimap bounds", () => {
    // Given: Multi-node tree with mocked geometry
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    setupGeometryMocks();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // When: Dragged beyond the radar boundary with extreme coordinates
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewportRect, { clientX: 1000, clientY: 1000, pointerId: 1 });
    fireEvent.pointerUp(viewportRect, { clientX: 1000, clientY: 1000, pointerId: 1 });

    // Then: The indicator attributes x, y must remain clamped and non-NaN
    const x = Number.parseFloat(viewportRect.getAttribute("x") || "0");
    const y = Number.parseFloat(viewportRect.getAttribute("y") || "0");
    const width = Number.parseFloat(viewportRect.getAttribute("width") || "0");
    const height = Number.parseFloat(viewportRect.getAttribute("height") || "0");

    expect(isNaN(x)).toBe(false);
    expect(isNaN(y)).toBe(false);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + width).toBeLessThanOrEqual(160);
    expect(y + height).toBeLessThanOrEqual(120);
  });

  // --- Phase E2a: Mobile Minimap Toggle Test-First Contract (Scenarios 11 - 17) ---

  it("Scenario 11: Mobile toggle is rendered collapsed by default for multi-node trees", () => {
    // Given: A non-trivial multi-node tree
    // When: Rendered inside MindMapTreeCanvas
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // Then: Mobile toggle button should be present in the document
    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // And: Mobile minimap panel should initially be collapsed/hidden on mobile
    const mobilePanel = screen.queryByTestId("mindmap-minimap-panel");
    expect(mobilePanel).not.toBeInTheDocument();
  });

  it("Scenario 12: Activating mobile toggle opens minimap without changing current pan/zoom", () => {
    // Given: Multi-node tree with initial pan/zoom
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    setupGeometryMocks();
    const canvasContent = screen.getByTestId("mindmap-canvas-content");
    const initialTransform = canvasContent.style.transform;

    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // When: User activates the mobile toggle
    fireEvent.click(toggle);

    // Then: Toggle updates to aria-expanded="true" and mobile panel becomes visible
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const mobilePanel = screen.getByTestId("mindmap-minimap-panel");
    expect(mobilePanel).toBeInTheDocument();

    // And: Canvas pan and zoom remain strictly unchanged
    expect(canvasContent.style.transform).toBe(initialTransform);
  });

  it("Scenario 13: Activating mobile toggle again closes minimap without triggering backdrop drag", () => {
    // Given: Multi-node tree with open mobile minimap
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("mindmap-minimap-panel")).toBeInTheDocument();

    const canvasContent = screen.getByTestId("mindmap-canvas-content");
    const panBeforeClose = canvasContent.style.transform;

    // When: User clicks toggle button again to close
    fireEvent.click(toggle);

    // Then: Toggle returns to aria-expanded="false" and mobile panel is closed/hidden
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("mindmap-minimap-panel")).not.toBeInTheDocument();

    // And: No backdrop drag was triggered, pan remains stable
    expect(canvasContent.style.transform).toBe(panBeforeClose);
  });

  it("Scenario 14: Escape closes open mobile minimap", () => {
    // Given: Multi-node tree with open mobile minimap
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("mindmap-minimap-panel")).toBeInTheDocument();

    // When: User presses Escape key
    fireEvent.keyDown(window, { key: "Escape" });

    // Then: Mobile minimap closes and toggle returns to aria-expanded="false"
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("mindmap-minimap-panel")).not.toBeInTheDocument();
  });

  it("Scenario 15: Single-node tree hides both mobile toggle and minimap radar", () => {
    // Given: A trivial single-node tree
    // When: Rendered inside MindMapTreeCanvas
    render(
      <MindMapTreeCanvas
        tree={mockSingleNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // Then: Neither mobile toggle, panel, nor desktop minimap should be in the document
    expect(screen.queryByTestId("mindmap-minimap-toggle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mindmap-minimap-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mindmap-minimap")).not.toBeInTheDocument();
  });

  it("Scenario 16: Desktop keeps minimap visible and does not render mobile-only toggle", () => {
    // Given: Multi-node tree rendered on desktop where minimap radar is always available
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // Then: Minimap container and viewport rect are present for desktop interaction
    const minimap = screen.getByTestId("mindmap-minimap");
    expect(minimap).toBeInTheDocument();

    // And: Mobile toggle has appropriate accessibility/responsive attributes
    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle.className).toContain("sm:hidden");
  });

  it("Scenario 17: Open mobile minimap preserves viewport indicator drag contract", () => {
    // Given: Multi-node tree with mocked geometry and open mobile minimap
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const { canvasContent } = setupGeometryMocks();
    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    fireEvent.click(toggle);

    const mobilePanel = screen.getByTestId("mindmap-minimap-panel");
    const viewportRect = mobilePanel.querySelector('[data-testid="minimap-viewport-rect"]') as HTMLElement;
    expect(viewportRect).toBeInTheDocument();
    expect(canvasContent.style.transform).toContain("translate(0px, 0px)");

    // When: User drags viewport indicator in the mobile minimap
    fireEvent.pointerDown(viewportRect, { clientX: 70, clientY: 50, pointerId: 1, button: 0 });
    fireEvent.pointerMove(viewportRect, { clientX: 95, clientY: 65, pointerId: 1 });

    // Then: Canvas transform updates accordingly via E1d drag delta mapping
    expect(canvasContent.style.transform).not.toContain("translate(0px, 0px)");
  });

  // --- Phase E5: Mobile Minimap Toggle Touch Target Hardening ---

  it("Scenario 18: Mobile toggle provides minimum 44x44px touch target", () => {
    // Given: Multi-node tree rendered inside MindMapTreeCanvas
    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    // When: Querying mobile toggle button
    const toggle = screen.getByTestId("mindmap-minimap-toggle");
    expect(toggle).toBeInTheDocument();

    // Then: Toggle has 44x44px minimum sizing classes
    expect(toggle.className).toContain("w-11");
    expect(toggle.className).toContain("h-11");
    expect(toggle.className).toContain("min-w-[44px]");
    expect(toggle.className).toContain("min-h-[44px]");

    // And: No longer contains 40px sizing classes
    expect(toggle.className).not.toContain("w-10");
    expect(toggle.className).not.toContain("h-10");
    expect(toggle.className).not.toContain("min-w-[40px]");
    expect(toggle.className).not.toContain("min-h-[40px]");
  });

  // --- Phase E6: Dynamic ResizeObserver for Minimap Bounds ---

  it("Scenario 19: Component initializes with ResizeObserver observing geometry elements without throwing", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    expect(MockResizeObserver.instances.length).toBeGreaterThan(0);
    const observer = MockResizeObserver.instances[0];
    expect(observer.observe).toHaveBeenCalled();
    expect(observer.isDisconnected).toBe(false);
    expect(observer.observedElements.length).toBeGreaterThanOrEqual(1);

    const minimap = screen.getByTestId("mindmap-minimap");
    expect(minimap).toBeInTheDocument();
  });

  it("Scenario 20: ResizeObserver callback on backdrop dimension change updates viewport indicator with bounded geometry", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // Capture baseline geometry before resize (800x600 backdrop on 1600x1200 content => scaleRatio 0.1, rect 80x60)
    const beforeWidth = Number(viewportRect.getAttribute("width"));
    const beforeHeight = Number(viewportRect.getAttribute("height"));
    const beforeX = Number(viewportRect.getAttribute("x"));
    const beforeY = Number(viewportRect.getAttribute("y"));

    expect(beforeWidth).toBe(80);
    expect(beforeHeight).toBe(60);
    expect(beforeX).toBe(40);
    expect(beforeY).toBe(30);

    // Mock enlarged backdrop dimension (1200x900 viewport on 1600x1200 content => scaleRatio 0.1, rect 120x90)
    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
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

    const observer = MockResizeObserver.instances[0];
    act(() => {
      observer.trigger();
    });

    const afterWidth = Number(viewportRect.getAttribute("width"));
    const afterHeight = Number(viewportRect.getAttribute("height"));
    const afterX = Number(viewportRect.getAttribute("x"));
    const afterY = Number(viewportRect.getAttribute("y"));

    // Assert reactive change: dimension must differ from pre-trigger baseline
    expect(afterWidth).not.toBe(beforeWidth);
    expect(afterHeight).not.toBe(beforeHeight);
    expect(afterX).not.toBe(beforeX);
    expect(afterY).not.toBe(beforeY);

    // Assert mathematically exact derived geometry
    expect(afterWidth).toBe(120);
    expect(afterHeight).toBe(90);
    expect(afterX).toBe(20);
    expect(afterY).toBe(15);
    expect(Number.isFinite(afterWidth)).toBe(true);
    expect(Number.isFinite(afterHeight)).toBe(true);
  });

  it("Scenario 21: ResizeObserver callback on content container change updates geometry without NaN or Infinity", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const canvasContent = screen.getByTestId("mindmap-canvas-content");
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // Capture baseline geometry before content resize
    const beforeWidth = Number(viewportRect.getAttribute("width"));
    const beforeHeight = Number(viewportRect.getAttribute("height"));
    expect(beforeWidth).toBe(80);
    expect(beforeHeight).toBe(60);

    // Mock enlarged tree content size (3200x2400 content on 800x600 backdrop => scaleRatio 0.05, rect 40x30)
    vi.spyOn(canvasContent, "getBoundingClientRect").mockReturnValue({
      width: 3200,
      height: 2400,
      top: 0,
      left: 0,
      bottom: 2400,
      right: 3200,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const observer = MockResizeObserver.instances[0];
    act(() => {
      observer.trigger();
    });

    const afterWidth = Number(viewportRect.getAttribute("width"));
    const afterHeight = Number(viewportRect.getAttribute("height"));
    const afterX = Number(viewportRect.getAttribute("x"));
    const afterY = Number(viewportRect.getAttribute("y"));

    // Assert reactive change
    expect(afterWidth).toBe(40);
    expect(afterHeight).toBe(30);
    expect(afterX).toBe(60);
    expect(afterY).toBe(45);

    // Assert valid finite numbers
    expect(viewportRect.getAttribute("width")).not.toBe("NaN");
    expect(viewportRect.getAttribute("width")).not.toBe("Infinity");
    expect(viewportRect.getAttribute("height")).not.toBe("NaN");
    expect(viewportRect.getAttribute("height")).not.toBe("Infinity");
    expect(viewportRect.getAttribute("x")).not.toBe("NaN");
    expect(viewportRect.getAttribute("x")).not.toBe("Infinity");
    expect(viewportRect.getAttribute("y")).not.toBe("NaN");
    expect(viewportRect.getAttribute("y")).not.toBe("Infinity");
  });

  it("Scenario 22: ResizeObserver callback reporting zero or invalid dimensions preserves safe fallback", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const backdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const viewportRect = screen.getByTestId("minimap-viewport-rect");

    // Capture valid baseline before invalid trigger
    const baselineWidth = Number(viewportRect.getAttribute("width"));
    const baselineHeight = Number(viewportRect.getAttribute("height"));
    const baselineX = Number(viewportRect.getAttribute("x"));
    const baselineY = Number(viewportRect.getAttribute("y"));
    expect(baselineWidth).toBe(80);
    expect(baselineHeight).toBe(60);

    // Mock zero / non-finite dimensions
    vi.spyOn(backdrop, "getBoundingClientRect").mockReturnValue({
      width: 0,
      height: -100,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const observer = MockResizeObserver.instances[0];
    expect(() => {
      act(() => {
        observer.trigger();
      });
    }).not.toThrow();

    // Sane geometry must not be corrupted by invalid measurements
    const currentWidth = Number(viewportRect.getAttribute("width"));
    const currentHeight = Number(viewportRect.getAttribute("height"));
    const currentX = Number(viewportRect.getAttribute("x"));
    const currentY = Number(viewportRect.getAttribute("y"));

    expect(currentWidth).toBe(baselineWidth);
    expect(currentHeight).toBe(baselineHeight);
    expect(currentX).toBe(baselineX);
    expect(currentY).toBe(baselineY);
    expect(Number.isFinite(currentWidth)).toBe(true);
    expect(Number.isFinite(currentHeight)).toBe(true);
  });

  it("Scenario 23: Unmounting component calls disconnect and subsequent callbacks do not throw", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    const { unmount } = render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const observer = MockResizeObserver.instances[0];
    expect(observer.disconnect).not.toHaveBeenCalled();
    expect(observer.isDisconnected).toBe(false);

    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
    expect(observer.isDisconnected).toBe(true);
    expect(observer.observedElements.length).toBe(0);

    const countBefore = observer.triggerCount;

    // Post-unmount synthetic trigger is suppressed by disconnected observer
    expect(() => {
      act(() => {
        observer.trigger();
      });
    }).not.toThrow();
    expect(observer.triggerCount).toBe(countBefore);

    // Even if callback is invoked directly bypassing observer, component's isMounted guard ensures safety
    expect(() => {
      act(() => {
        observer.callback([], observer as unknown as ResizeObserver);
      });
    }).not.toThrow();
  });

  it("Scenario 24: Repeated callbacks with identical dimensions maintain stable derived geometry output (equality guard)", () => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = MockResizeObserver;

    render(
      <MindMapTreeCanvas
        tree={mockMultiNodeTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    const viewportRect = screen.getByTestId("minimap-viewport-rect");
    const initialWidth = viewportRect.getAttribute("width");
    const initialHeight = viewportRect.getAttribute("height");
    const initialX = viewportRect.getAttribute("x");
    const initialY = viewportRect.getAttribute("y");

    const observer = MockResizeObserver.instances[0];

    // Trigger multiple identical measurement cycles
    act(() => {
      observer.trigger();
      observer.trigger();
      observer.trigger();
    });

    // Derived geometry remains strictly unchanged across all trigger cycles
    expect(viewportRect.getAttribute("width")).toBe(initialWidth);
    expect(viewportRect.getAttribute("height")).toBe(initialHeight);
    expect(viewportRect.getAttribute("x")).toBe(initialX);
    expect(viewportRect.getAttribute("y")).toBe(initialY);
  });

  it("Scenario 25: Environment without ResizeObserver renders seamlessly with fallback dimensions", () => {
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;

    expect(() => {
      render(
        <MindMapTreeCanvas
          tree={mockMultiNodeTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );
    }).not.toThrow();

    const minimap = screen.getByTestId("mindmap-minimap");
    expect(minimap).toBeInTheDocument();
    const viewportRect = screen.getByTestId("minimap-viewport-rect");
    expect(viewportRect).toBeInTheDocument();
  });
});
