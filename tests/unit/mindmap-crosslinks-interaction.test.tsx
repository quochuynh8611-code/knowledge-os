import React from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import type { MindMapTreeNode, MindMapCrossEdge } from "../../src/lib/mindmapProjection";

describe("Mind Map Phase B2b1: Cross-Link Mutual Highlight on Node Hover", () => {
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
        title: "Bát Chánh Đạo",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-a",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 5,
        tags: [],
        children: [],
      },
      {
        id: "topic-c",
        title: "Duyên Khởi",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-a",
        edgeTypeToParent: "related",
        edgeStrength: 4,
        tags: [],
        children: [],
      },
      {
        id: "topic-d",
        title: "Tam Pháp Ấn",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-a",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 4,
        tags: [],
        children: [],
      },
      {
        id: "topic-e",
        title: "Vô Ngã",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-a",
        edgeTypeToParent: "related",
        edgeStrength: 3,
        tags: [],
        children: [],
      },
    ],
  };

  const mockCrossEdges: MindMapCrossEdge[] = [
    {
      id: "edge-b-c",
      sourceNodeId: "topic-b",
      sourceTitle: "Bát Chánh Đạo",
      targetNodeId: "topic-c",
      targetTitle: "Duyên Khởi",
      type: "related",
      strength: 4,
      label: "Liên quan",
      isCycle: false,
    },
    {
      id: "edge-d-e",
      sourceNodeId: "topic-d",
      sourceTitle: "Tam Pháp Ấn",
      targetNodeId: "topic-e",
      targetTitle: "Vô Ngã",
      type: "prerequisite",
      strength: 5,
      label: "Tiên quyết",
      isCycle: false,
    },
  ];

  it("Scenario 1: Default state when no node is hovered - no active/dimmed edges and no peer-highlights", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    // Cross-edge paths must exist and not be highlighted or dimmed
    const edgeBC = document.querySelector('[data-edge-id="edge-b-c"]');
    const edgeDE = document.querySelector('[data-edge-id="edge-d-e"]');

    expect(edgeBC).not.toBeNull();
    expect(edgeDE).not.toBeNull();
    expect(edgeBC?.getAttribute("data-highlighted")).toBeNull();
    expect(edgeBC?.getAttribute("data-dimmed")).toBeNull();
    expect(edgeDE?.getAttribute("data-highlighted")).toBeNull();
    expect(edgeDE?.getAttribute("data-dimmed")).toBeNull();

    // Node cards must not have peer highlight
    const nodeB = document.querySelector('[data-node-id="topic-b"]');
    const nodeC = document.querySelector('[data-node-id="topic-c"]');
    const nodeD = document.querySelector('[data-node-id="topic-d"]');
    const nodeE = document.querySelector('[data-node-id="topic-e"]');

    expect(nodeB?.getAttribute("data-peer-highlighted")).toBeNull();
    expect(nodeC?.getAttribute("data-peer-highlighted")).toBeNull();
    expect(nodeD?.getAttribute("data-peer-highlighted")).toBeNull();
    expect(nodeE?.getAttribute("data-peer-highlighted")).toBeNull();
  });

  it("Scenario 2: Hovering node with cross-link marks connected cross-edge as active (data-highlighted)", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    const nodeB = document.querySelector('[data-node-id="topic-b"]')!;
    expect(nodeB).not.toBeNull();

    fireEvent.mouseEnter(nodeB);

    const edgeBC = document.querySelector('[data-edge-id="edge-b-c"]');
    expect(edgeBC?.getAttribute("data-highlighted")).toBe("true");
  });

  it("Scenario 3: Hovering node with cross-link marks unrelated cross-edges as dimmed (data-dimmed)", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    const nodeB = document.querySelector('[data-node-id="topic-b"]')!;
    fireEvent.mouseEnter(nodeB);

    const edgeDE = document.querySelector('[data-edge-id="edge-d-e"]');
    expect(edgeDE?.getAttribute("data-dimmed")).toBe("true");
    expect(edgeDE?.getAttribute("data-highlighted")).toBeNull();
  });

  it("Scenario 4: Hovering node with cross-link marks counterpart peer node with data-peer-highlighted", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    const nodeB = document.querySelector('[data-node-id="topic-b"]')!;
    fireEvent.mouseEnter(nodeB);

    const nodeC = document.querySelector('[data-node-id="topic-c"]');
    expect(nodeC?.getAttribute("data-peer-highlighted")).toBe("true");

    // Unrelated nodes must not receive peer highlight
    const nodeD = document.querySelector('[data-node-id="topic-d"]');
    const nodeE = document.querySelector('[data-node-id="topic-e"]');
    expect(nodeD?.getAttribute("data-peer-highlighted")).toBeNull();
    expect(nodeE?.getAttribute("data-peer-highlighted")).toBeNull();
  });

  it("Scenario 5: Mouse leave resets all cross-edges and nodes to default un-highlighted state", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    const nodeB = document.querySelector('[data-node-id="topic-b"]')!;
    fireEvent.mouseEnter(nodeB);

    // Verify highlights were applied
    expect(document.querySelector('[data-edge-id="edge-b-c"]')?.getAttribute("data-highlighted")).toBe("true");
    expect(document.querySelector('[data-node-id="topic-c"]')?.getAttribute("data-peer-highlighted")).toBe("true");

    // Mouse leave
    fireEvent.mouseLeave(nodeB);

    const edgeBC = document.querySelector('[data-edge-id="edge-b-c"]');
    const edgeDE = document.querySelector('[data-edge-id="edge-d-e"]');
    const nodeC = document.querySelector('[data-node-id="topic-c"]');

    expect(edgeBC?.getAttribute("data-highlighted")).toBeNull();
    expect(edgeBC?.getAttribute("data-dimmed")).toBeNull();
    expect(edgeDE?.getAttribute("data-highlighted")).toBeNull();
    expect(edgeDE?.getAttribute("data-dimmed")).toBeNull();
    expect(nodeC?.getAttribute("data-peer-highlighted")).toBeNull();
  });

  it("Scenario 6: Collapsed endpoint skips edge rendering and prevents peer-highlight", () => {
    render(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set(["topic-c"])}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    const nodeB = document.querySelector('[data-node-id="topic-b"]')!;
    fireEvent.mouseEnter(nodeB);

    // Edge b-c is skipped from SVG layer because topic-c is in collapsedNodeIds
    const edgeBC = document.querySelector('[data-edge-id="edge-b-c"]');
    expect(edgeBC).toBeNull();

    // Node C does not receive peer highlight
    const nodeC = document.querySelector('[data-node-id="topic-c"]');
    expect(nodeC?.getAttribute("data-peer-highlighted")).toBeNull();
  });
});
