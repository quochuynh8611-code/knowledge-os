import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import { Topic, Note, Resource } from "../../src/types";

let mockTopics: Topic[] = [];
let mockNotes: Note[] = [];
let mockResources: Resource[] = [];
let mockSelectedTopicId: string | null = "topic-root";
let mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

const sampleTree: MindMapTreeNode = {
  id: "node-root",
  title: "Gốc Cây",
  type: "topic",
  domain: "phat-hoc",
  hopDistance: 0,
  tags: [],
  children: [
    {
      id: "node-child-1",
      title: "Nhánh Con 1",
      type: "topic",
      domain: "phat-hoc",
      hopDistance: 1,
      parentHopId: "node-root",
      edgeTypeToParent: "prerequisite",
      tags: [],
      children: [
        {
          id: "node-grandchild-1",
          title: "Cháu 1",
          type: "note",
          domain: "phat-hoc",
          hopDistance: 2,
          parentHopId: "node-child-1",
          tags: [],
          children: [],
        },
      ],
    },
    {
      id: "node-child-2",
      title: "Nhánh Con 2",
      type: "topic",
      domain: "phat-hoc",
      hopDistance: 1,
      parentHopId: "node-root",
      edgeTypeToParent: "related",
      tags: [],
      children: [],
    },
    {
      id: "node-child-3",
      title: "Nhánh Con 3",
      type: "topic",
      domain: "phat-hoc",
      hopDistance: 1,
      parentHopId: "node-root",
      edgeTypeToParent: "advanced",
      tags: [],
      children: [],
    },
  ],
};

describe("Mind Map Phase K1: Keyboard Navigation & A11y Tree Traversal", () => {
  beforeEach(() => {
    mockTopics = [
      {
        id: "topic-root",
        title: "Gốc Cây",
        slug: "goc-cay",
        type: "phat-hoc",
        categoryId: "cat-1",
        description: "Mô tả gốc",
        content: "Nội dung gốc",
        tags: [],
        studyProgress: {
          topicId: "topic-root",
          status: "not_started",
          progress: 0,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [
          { id: "l1", sourceId: "topic-root", targetId: "topic-child-1", linkType: "prerequisite", strength: 5 },
          { id: "l2", sourceId: "topic-root", targetId: "topic-child-2", linkType: "related", strength: 3 },
        ],
      },
      {
        id: "topic-child-1",
        title: "Nhánh Con 1",
        slug: "nhanh-con-1",
        type: "phat-hoc",
        categoryId: "cat-1",
        description: "Mô tả con 1",
        content: "Nội dung con 1",
        tags: [],
        studyProgress: {
          topicId: "topic-child-1",
          status: "not_started",
          progress: 0,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [],
      },
      {
        id: "topic-child-2",
        title: "Nhánh Con 2",
        slug: "nhanh-con-2",
        type: "phat-hoc",
        categoryId: "cat-1",
        description: "Mô tả con 2",
        content: "Nội dung con 2",
        tags: [],
        studyProgress: {
          topicId: "topic-child-2",
          status: "not_started",
          progress: 0,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          totalNotes: 0,
          timeSpent: 0,
        },
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        links: [],
      },
    ];
    mockNotes = [];
    mockResources = [];
    mockSelectedTopicId = "topic-root";
    mockOpenTopicDetail = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("1. Horizontal Layout Arrow Navigation", () => {
    it("Scenario 1.1: navigates between siblings using ArrowDown and ArrowUp with boundary clamping", () => {
      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_horizontal"
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      // Initial key press focuses root, then ArrowRight moves to child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });
      const child1 = document.querySelector('[data-node-id="node-child-1"]');
      expect(child1).toHaveAttribute("data-focused", "true");

      // ArrowDown moves to child-2
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowDown", code: "ArrowDown" });
      const child2 = document.querySelector('[data-node-id="node-child-2"]');
      expect(child2).toHaveAttribute("data-focused", "true");
      expect(child1).not.toHaveAttribute("data-focused", "true");

      // ArrowDown moves to child-3
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowDown", code: "ArrowDown" });
      const child3 = document.querySelector('[data-node-id="node-child-3"]');
      expect(child3).toHaveAttribute("data-focused", "true");

      // Boundary: ArrowDown at last sibling stays on child-3
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowDown", code: "ArrowDown" });
      expect(child3).toHaveAttribute("data-focused", "true");

      // ArrowUp moves back to child-2
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowUp", code: "ArrowUp" });
      expect(child2).toHaveAttribute("data-focused", "true");

      // ArrowUp moves back to child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowUp", code: "ArrowUp" });
      expect(child1).toHaveAttribute("data-focused", "true");

      // Boundary: ArrowUp at first sibling stays on child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowUp", code: "ArrowUp" });
      expect(child1).toHaveAttribute("data-focused", "true");
    });

    it("Scenario 1.2: navigates into child (ArrowRight) and back to parent (ArrowLeft)", () => {
      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_horizontal"
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      // Focus root node
      fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
      const rootNode = document.querySelector('[data-node-id="node-root"]');
      expect(rootNode).toHaveAttribute("data-focused", "true");

      // Boundary: ArrowLeft at root stays at root
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowLeft", code: "ArrowLeft" });
      expect(rootNode).toHaveAttribute("data-focused", "true");

      // ArrowRight enters child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });
      const child1 = document.querySelector('[data-node-id="node-child-1"]');
      expect(child1).toHaveAttribute("data-focused", "true");

      // ArrowRight enters grandchild-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });
      const grandchild1 = document.querySelector('[data-node-id="node-grandchild-1"]');
      expect(grandchild1).toHaveAttribute("data-focused", "true");

      // Boundary: ArrowRight on leaf stays on leaf
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });
      expect(grandchild1).toHaveAttribute("data-focused", "true");

      // ArrowLeft moves back to child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowLeft", code: "ArrowLeft" });
      expect(child1).toHaveAttribute("data-focused", "true");

      // ArrowLeft moves back to root
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowLeft", code: "ArrowLeft" });
      expect(rootNode).toHaveAttribute("data-focused", "true");
    });
  });

  describe("2. Vertical Layout Arrow Navigation", () => {
    it("Scenario 2.1: remaps arrows (Down to child, Up to parent, Right/Left to siblings)", () => {
      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_vertical"
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      // Start at root
      fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
      const rootNode = document.querySelector('[data-node-id="node-root"]');
      expect(rootNode).toHaveAttribute("data-focused", "true");

      // In vertical layout, ArrowDown moves to first child
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowDown", code: "ArrowDown" });
      const child1 = document.querySelector('[data-node-id="node-child-1"]');
      expect(child1).toHaveAttribute("data-focused", "true");

      // ArrowRight moves to next sibling child-2
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });
      const child2 = document.querySelector('[data-node-id="node-child-2"]');
      expect(child2).toHaveAttribute("data-focused", "true");

      // ArrowLeft moves back to sibling child-1
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowLeft", code: "ArrowLeft" });
      expect(child1).toHaveAttribute("data-focused", "true");

      // ArrowUp moves to parent root
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowUp", code: "ArrowUp" });
      expect(rootNode).toHaveAttribute("data-focused", "true");
    });
  });

  describe("3. Action Keys (Space, Enter, Home, Escape)", () => {
    it("Scenario 3.1: Space key invokes onToggleCollapse on focused node", () => {
      const handleToggleCollapse = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_horizontal"
          onToggleCollapse={handleToggleCollapse}
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      // Focus root
      fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
      expect(document.querySelector('[data-node-id="node-root"]')).toHaveAttribute("data-focused", "true");

      // Press Space
      fireEvent.keyDown(canvasBackdrop, { key: " ", code: "Space" });
      expect(handleToggleCollapse).toHaveBeenCalledWith("node-root");
    });

    it("Scenario 3.2: Enter key invokes onSelectTopic on focused topic node", () => {
      const handleSelectTopic = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_horizontal"
          onSelectTopic={handleSelectTopic}
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      // Focus child-1 (topic)
      fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
      fireEvent.keyDown(canvasBackdrop, { key: "ArrowRight", code: "ArrowRight" });

      expect(document.querySelector('[data-node-id="node-child-1"]')).toHaveAttribute("data-focused", "true");

      // Press Enter
      fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });
      expect(handleSelectTopic).toHaveBeenCalledWith("node-child-1");
    });

    it("Scenario 3.3: Escape key clears the active focus state", () => {
      render(
        <MindMapTreeCanvas
          tree={sampleTree}
          layoutMode="tree_horizontal"
        />
      );

      const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");

      fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
      const rootNode = document.querySelector('[data-node-id="node-root"]');
      expect(rootNode).toHaveAttribute("data-focused", "true");

      // Press Escape
      fireEvent.keyDown(canvasBackdrop, { key: "Escape", code: "Escape" });
      expect(document.querySelector('[data-focused="true"]')).toBeNull();
    });
  });

  describe("4. Event Isolation with Search Input in MindMapView", () => {
    it("Scenario 4.1: does not trigger canvas keyboard traversal when typing in search input", () => {
      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");

      // Focus search input and type Space, ArrowDown, Enter
      fireEvent.focus(searchInput);
      fireEvent.keyDown(searchInput, { key: "ArrowDown", code: "ArrowDown" });
      fireEvent.keyDown(searchInput, { key: " ", code: "Space" });
      fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

      // No node card should have received focus from typing inside search input
      expect(document.querySelector('[data-focused="true"]')).toBeNull();
      expect(mockOpenTopicDetail).not.toHaveBeenCalled();
    });
  });
});
