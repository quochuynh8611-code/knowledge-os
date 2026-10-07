import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import {
  MindMapTreeNode,
  MindMapCrossEdge,
  MindMapCycleAnnotation,
} from "../../src/lib/mindmapProjection";

describe("Mind Map Track B1b: Minimal SVG Overlay & Cycle Badges", () => {
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
  ];

  const mockCycleAnnotations: MindMapCycleAnnotation[] = [
    {
      nodeId: "topic-c",
      targetAncestorId: "topic-a",
      targetAncestorTitle: "Tứ Diệu Đế",
      edgeType: "prerequisite",
      depth: 1,
    },
  ];

  it("Scenario 1: Attaches data-node-id attribute to all rendered node cards", () => {
    const html = renderToStaticMarkup(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
      />
    );

    expect(html).toContain('data-node-id="topic-a"');
    expect(html).toContain('data-node-id="topic-b"');
    expect(html).toContain('data-node-id="topic-c"');
  });

  it("Scenario 2: Renders static cycle badge with format '↻ {targetAncestorTitle}'", () => {
    const html = renderToStaticMarkup(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        cycleAnnotations={mockCycleAnnotations}
      />
    );

    expect(html).toContain("↻ Tứ Diệu Đế");
  });

  it("Scenario 3: Falls back to targetAncestorId when targetAncestorTitle is missing", () => {
    const fallbackCycleAnnotations: MindMapCycleAnnotation[] = [
      {
        nodeId: "topic-c",
        targetAncestorId: "topic-fallback-id",
        targetAncestorTitle: "",
        edgeType: "related",
        depth: 1,
      },
    ];

    const html = renderToStaticMarkup(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        cycleAnnotations={fallbackCycleAnnotations}
      />
    );

    expect(html).toContain("↻ topic-fallback-id");
  });

  it("Scenario 4: Mounts MindMapCrossLinksLayer when showCrossLinks is true", () => {
    const html = renderToStaticMarkup(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={true}
      />
    );

    expect(html).toContain('data-testid="mindmap-crosslinks-layer"');
  });

  it("Scenario 5: Does not mount MindMapCrossLinksLayer when showCrossLinks is false", () => {
    const html = renderToStaticMarkup(
      <MindMapTreeCanvas
        tree={mockTree}
        layoutMode="tree_horizontal"
        collapsedNodeIds={new Set()}
        crossEdges={mockCrossEdges}
        showCrossLinks={false}
      />
    );

    expect(html).not.toContain('data-testid="mindmap-crosslinks-layer"');
  });
});
