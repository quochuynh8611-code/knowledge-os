/**
 * Unit Test Suite: Phase M5b — Canvas Direct Drag-to-Connect Interaction (Test-First)
 *
 * Mapped Specifications: docs/specs/m5b-canvas-drag-to-connect.md & docs/adr/ADR-M5-003
 *
 * Coverage:
 * 1. Connection handle affordance on node card
 * 2. Gesture isolation (no pan, no marquee, reparenting remains on body)
 * 3. Pointer-driven preview curve tracking and Escape cancellation
 * 4. Hit-testing and real-time validation feedback (valid, self, duplicate, cycle)
 * 5. Drop commits valid cross-link callback, invalid drop no-ops
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapTreeNode, MindMapCrossEdge } from "../../src/lib/mindmapProjection";

describe("Phase M5b — Canvas Direct Drag-to-Connect Unit Tests", () => {
  const SAMPLE_TREE: MindMapTreeNode = {
    id: "node-root",
    title: "Tứ Diệu Đế",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: [],
    children: [
      {
        id: "node-kho-de",
        title: "Khổ Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [
          {
            id: "node-sinh-lao",
            title: "Sinh Lão Bệnh Tử",
            type: "note",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "node-kho-de",
            tags: [],
            children: [],
          },
        ],
      },
      {
        id: "node-tap-de",
        title: "Tập Đế",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "node-root",
        tags: [],
        children: [],
      },
    ],
  };

  const EXISTING_EDGES: MindMapCrossEdge[] = [
    {
      id: "edge-kho-tap",
      sourceNodeId: "node-kho-de",
      sourceTitle: "Khổ Đế",
      targetNodeId: "node-tap-de",
      targetTitle: "Tập Đế",
      type: "related",
      strength: 4,
      label: "Nhân quả",
      isCycle: false,
    },
  ];

  beforeEach(() => {
    if (typeof document !== "undefined" && !document.elementFromPoint) {
      document.elementFromPoint = () => null;
    }
    vi.clearAllMocks();
  });

  describe("1. Connection Handle Affordance & Rendering", () => {
    it("Scenario 1A: renders connection handle on node cards when isEditable is true", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const handleRoot = screen.getByTestId("connector-handle-node-root");
      const handleChild = screen.getByTestId("connector-handle-node-kho-de");

      expect(handleRoot).toBeInTheDocument();
      expect(handleChild).toBeInTheDocument();
      expect(handleChild.getAttribute("role")).toBe("button");
    });

    it("Scenario 1B: does NOT render connection handles when isEditable is false or undefined", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={false}
        />
      );

      expect(screen.queryByTestId("connector-handle-node-root")).not.toBeInTheDocument();
      expect(screen.queryByTestId("connector-handle-node-kho-de")).not.toBeInTheDocument();
    });
  });

  describe("2. Gesture Isolation & Event Ownership", () => {
    it("Scenario 2A: starting pointer down on connection handle does not trigger canvas pan", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const handle = screen.getByTestId("connector-handle-node-kho-de");
      const canvasContent = screen.getByTestId("mindmap-canvas-content");

      // Pointer down on handle and move pointer
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 250, clientY: 250, pointerId: 1 });

      // Canvas pan transform must remain 0, 0 (not panned by dx=150, dy=150)
      expect(canvasContent.style.transform).toContain("translate(0px, 0px)");
    });

    it("Scenario 2B: starting pointer down on connection handle does not trigger marquee selection even if Shift is held", () => {
      const onSelectMultipleNodesMock = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onSelectMultipleNodes={onSelectMultipleNodesMock}
        />
      );

      const handle = screen.getByTestId("connector-handle-node-kho-de");

      // Pointer down with Shift key held
      fireEvent.pointerDown(handle, { button: 0, shiftKey: true, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { shiftKey: true, clientX: 300, clientY: 300, pointerId: 1 });

      // No marquee box should be rendered
      expect(screen.queryByTestId("mindmap-marquee-box")).not.toBeInTheDocument();
      expect(onSelectMultipleNodesMock).not.toHaveBeenCalled();
    });

    it("Scenario 2C: dragging node card body continues to trigger HTML5 DnD reparenting", () => {
      const onReparentNodeMock = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          onReparentNode={onReparentNodeMock}
        />
      );

      const childCard = document.querySelector('[data-node-id="node-kho-de"]')!;
      const targetCard = document.querySelector('[data-node-id="node-tap-de"]')!;

      expect(childCard.getAttribute("draggable")).toBe("true");

      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue("node-kho-de"),
      };

      fireEvent.dragStart(childCard, { dataTransfer });
      fireEvent.dragOver(targetCard, { dataTransfer });
      fireEvent.drop(targetCard, { dataTransfer });

      expect(onReparentNodeMock).toHaveBeenCalledWith("node-kho-de", "node-tap-de");
      // And no connection preview layer should exist
      expect(screen.queryByTestId("mindmap-connect-preview-layer")).not.toBeInTheDocument();
    });
  });

  describe("3. Preview Line Tracking & Cancellation", () => {
    it("Scenario 3A: pointer-down on handle mounts preview line, pointer-move updates target coordinates", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const handle = screen.getByTestId("connector-handle-node-kho-de");

      // Mock handle getBoundingClientRect
      vi.spyOn(handle, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 100,
        right: 120,
        bottom: 120,
        width: 20,
        height: 20,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      fireEvent.pointerDown(handle, { button: 0, clientX: 110, clientY: 110, pointerId: 1 });

      // Preview SVG layer must be mounted
      const previewLayer = screen.getByTestId("mindmap-connect-preview-layer");
      expect(previewLayer).toBeInTheDocument();

      // Move pointer to (200, 250)
      fireEvent.pointerMove(handle, { clientX: 200, clientY: 250, pointerId: 1 });

      const previewLine = screen.getByTestId("mindmap-connect-preview-line");
      expect(previewLine).toBeInTheDocument();
      expect(previewLine.getAttribute("d")).toContain("200 250");
    });

    it("Scenario 3B: pressing Escape cancels drag-to-connect session and unmounts preview line", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const handle = screen.getByTestId("connector-handle-node-kho-de");
      fireEvent.pointerDown(handle, { button: 0, clientX: 110, clientY: 110, pointerId: 1 });
      expect(screen.getByTestId("mindmap-connect-preview-layer")).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      expect(screen.queryByTestId("mindmap-connect-preview-layer")).not.toBeInTheDocument();
    });
  });

  describe("4. Hit-Testing & Real-Time Target Validation Feedback", () => {
    it("Scenario 4A: hovering valid target node marks it with accept state and indigo styling", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const sourceHandle = screen.getByTestId("connector-handle-node-root");
      const targetCard = document.querySelector('[data-node-id="node-tap-de"]')!;

      vi.spyOn(document, "elementFromPoint").mockReturnValue(targetCard);

      fireEvent.pointerDown(sourceHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(sourceHandle, { clientX: 300, clientY: 300, pointerId: 1 });

      expect(targetCard.getAttribute("data-connect-accept")).toBe("true");

      const previewLine = screen.getByTestId("mindmap-connect-preview-line");
      expect(previewLine.getAttribute("data-valid")).toBe("true");
    });

    it("Scenario 4B: hovering source node itself displays reject state (CANNOT_LINK_SELF)", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      const sourceCard = document.querySelector('[data-node-id="node-kho-de"]')!;
      const sourceHandle = screen.getByTestId("connector-handle-node-kho-de");

      // Pointer moves back over source card
      vi.spyOn(document, "elementFromPoint").mockReturnValue(sourceCard);

      fireEvent.pointerDown(sourceHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(sourceHandle, { clientX: 105, clientY: 105, pointerId: 1 });

      expect(sourceCard.getAttribute("data-connect-reject")).toBe("CANNOT_LINK_SELF");

      const previewLine = screen.getByTestId("mindmap-connect-preview-line");
      expect(previewLine.getAttribute("data-valid")).toBe("false");
    });

    it("Scenario 4C: hovering duplicate target displays reject state (DUPLICATE_CROSS_LINK)", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          crossEdges={EXISTING_EDGES}
          showCrossLinks={true}
          isEditable={true}
        />
      );

      const sourceHandle = screen.getByTestId("connector-handle-node-kho-de");
      const targetCard = document.querySelector('[data-node-id="node-tap-de"]')!;

      vi.spyOn(document, "elementFromPoint").mockReturnValue(targetCard);

      fireEvent.pointerDown(sourceHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(sourceHandle, { clientX: 300, clientY: 300, pointerId: 1 });

      expect(targetCard.getAttribute("data-connect-reject")).toBe("DUPLICATE_CROSS_LINK");

      const previewLine = screen.getByTestId("mindmap-connect-preview-line");
      expect(previewLine.getAttribute("data-valid")).toBe("false");
    });

    it("Scenario 4D: hovering ancestor target displays cycle reject state (CYCLE_DETECTED)", () => {
      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
        />
      );

      // Start drag from grandchild "node-sinh-lao" to ancestor "node-kho-de"
      const grandchildHandle = screen.getByTestId("connector-handle-node-sinh-lao");
      const ancestorCard = document.querySelector('[data-node-id="node-kho-de"]')!;

      vi.spyOn(document, "elementFromPoint").mockReturnValue(ancestorCard);

      fireEvent.pointerDown(grandchildHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(grandchildHandle, { clientX: 200, clientY: 200, pointerId: 1 });

      expect(ancestorCard.getAttribute("data-connect-reject")).toBe("CYCLE_DETECTED");

      const previewLine = screen.getByTestId("mindmap-connect-preview-line");
      expect(previewLine.getAttribute("data-valid")).toBe("false");
    });
  });

  describe("5. Drop Action & Callback Dispatch", () => {
    it("Scenario 5A: dropping (pointerup) on valid target triggers onAddCrossLink callback", () => {
      const onAddCrossLinkMock = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          {...({
            onAddCrossLink: onAddCrossLinkMock,
          } as any)}
        />
      );

      const sourceHandle = screen.getByTestId("connector-handle-node-root");
      const targetCard = document.querySelector('[data-node-id="node-tap-de"]')!;

      vi.spyOn(document, "elementFromPoint").mockReturnValue(targetCard);

      fireEvent.pointerDown(sourceHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(sourceHandle, { clientX: 300, clientY: 300, pointerId: 1 });
      fireEvent.pointerUp(sourceHandle, { clientX: 300, clientY: 300, pointerId: 1 });

      expect(onAddCrossLinkMock).toHaveBeenCalledTimes(1);
      expect(onAddCrossLinkMock).toHaveBeenCalledWith({
        sourceNodeId: "node-root",
        targetNodeId: "node-tap-de",
        edgeType: "related",
      });
      // Preview layer cleaned up
      expect(screen.queryByTestId("mindmap-connect-preview-layer")).not.toBeInTheDocument();
    });

    it("Scenario 5B: dropping on invalid target or empty canvas creates nothing and cleans up preview", () => {
      const onAddCrossLinkMock = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={SAMPLE_TREE}
          layoutMode="tree_horizontal"
          isEditable={true}
          {...({
            onAddCrossLink: onAddCrossLinkMock,
          } as any)}
        />
      );

      const sourceHandle = screen.getByTestId("connector-handle-node-root");

      // Pointer over empty canvas (null target)
      vi.spyOn(document, "elementFromPoint").mockReturnValue(null);

      fireEvent.pointerDown(sourceHandle, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(sourceHandle, { clientX: 500, clientY: 500, pointerId: 1 });
      fireEvent.pointerUp(sourceHandle, { clientX: 500, clientY: 500, pointerId: 1 });

      expect(onAddCrossLinkMock).not.toHaveBeenCalled();
      expect(screen.queryByTestId("mindmap-connect-preview-layer")).not.toBeInTheDocument();
    });
  });
});
