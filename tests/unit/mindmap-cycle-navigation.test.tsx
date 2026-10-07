import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { useData } from "../../src/context/DataContext";
import type { MindMapTreeNode, MindMapCycleAnnotation } from "../../src/lib/mindmapProjection";
import type { Topic } from "../../src/types";

vi.mock("../../src/context/DataContext", () => ({
  useData: vi.fn(),
}));

function createTopic(
  id: string,
  title: string,
  links: Array<{ id: string; targetId: string; linkType: Topic["links"][0]["linkType"]; strength: number }> = []
): Topic {
  return {
    id,
    title,
    slug: id,
    type: "phat-hoc",
    description: `${title} description`,
    content: `${title} content`,
    categoryId: "cat-1",
    tags: ["core"],
    studyProgress: {
      topicId: id,
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
    links: links.map((l) => ({
      ...l,
      sourceId: id,
    })),
  };
}

describe("Mind Map Track B2a: Interactive Cycle Badge Navigation & Target Focus", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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
        children: [
          {
            id: "topic-c",
            title: "Chánh Kiến",
            type: "topic",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "topic-b",
            edgeTypeToParent: "prerequisite",
            edgeStrength: 4,
            tags: [],
            children: [],
          },
        ],
      },
    ],
  };

  const mockCycleAnnotations: MindMapCycleAnnotation[] = [
    {
      nodeId: "topic-c",
      targetAncestorId: "topic-a",
      targetAncestorTitle: "Tứ Diệu Đế",
      edgeType: "prerequisite",
      depth: 2,
    },
  ];

  describe("1. MindMapTreeCanvas Cycle Badge as Interactive Button", () => {
    it("Scenario 1: Renders cycle badge as interactive button element", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          cycleAnnotations={mockCycleAnnotations}
        />
      );

      const badge = screen.getByTestId("cycle-badge-topic-c");
      expect(badge.tagName).toBe("BUTTON");
      expect(badge.textContent).toContain("↻ Tứ Diệu Đế");
    });

    it("Scenario 2: Clicking cycle badge calls onFocusNode with targetAncestorId and stops propagation", () => {
      const onFocusNode = vi.fn();
      const onSelectTopic = vi.fn();

      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          cycleAnnotations={mockCycleAnnotations}
          onFocusNode={onFocusNode}
          onSelectTopic={onSelectTopic}
        />
      );

      const badge = screen.getByTestId("cycle-badge-topic-c");
      fireEvent.click(badge);

      expect(onFocusNode).toHaveBeenCalledTimes(1);
      expect(onFocusNode).toHaveBeenCalledWith("topic-a");
      // Must not bubble to topic click
      expect(onSelectTopic).not.toHaveBeenCalled();
    });

    it("Scenario 3: Renders temporary highlight styling when highlightedNodeId matches", () => {
      const { rerender } = render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          highlightedNodeId={null}
        />
      );

      const nodeCard = document.querySelector('[data-node-id="topic-a"]') as HTMLElement;
      expect(nodeCard.getAttribute("data-highlighted")).toBeNull();

      rerender(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
          highlightedNodeId="topic-a"
        />
      );

      expect(nodeCard.getAttribute("data-highlighted")).toBe("true");
      expect(nodeCard.className).toContain("ring-");
    });
  });

  describe("2. MindMapView Focus & Uncollapse Orchestration", () => {
    let mockTopics: Topic[];

    beforeEach(() => {
      // Mock scrollIntoView in JSDOM
      Element.prototype.scrollIntoView = vi.fn();

      mockTopics = [
        createTopic("topic-a", "Tứ Diệu Đế", [
          { id: "link-a-b", targetId: "topic-b", linkType: "prerequisite", strength: 5 },
        ]),
        createTopic("topic-b", "Bát Chánh Đạo", [
          { id: "link-b-c", targetId: "topic-c", linkType: "prerequisite", strength: 5 },
        ]),
        createTopic("topic-c", "Chánh Kiến", [
          { id: "link-c-d", targetId: "topic-d", linkType: "prerequisite", strength: 4 },
        ]),
        createTopic("topic-d", "Thiền Định", [
          { id: "link-d-b", targetId: "topic-b", linkType: "related", strength: 3 },
        ]),
      ];

      vi.mocked(useData).mockReturnValue({
        topics: mockTopics,
        notes: [],
        resources: [],
        selectedTopicId: "topic-a",
        openTopicDetail: vi.fn(),
      } as any);
    });

    it("Scenario 4: Collapsing and expanding branches manages visibility cleanly", () => {
      render(<MindMapView />);

      // Verify initial tree structure: topic-a (root) -> topic-b -> [topic-c, topic-d]
      expect(document.querySelector('[data-node-id="topic-a"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="topic-b"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="topic-c"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="topic-d"]')).not.toBeNull();

      // Collapse topic-b so children topic-c and topic-d are hidden
      const collapseBBtn = screen.getByRole("button", { name: /Thu gọn nhánh Bát Chánh Đạo/i });
      fireEvent.click(collapseBBtn);

      expect(document.querySelector('[data-node-id="topic-c"]')).toBeNull();
      expect(document.querySelector('[data-node-id="topic-d"]')).toBeNull();

      // Collapse topic-a so topic-b is also hidden
      const collapseABtn = screen.getByRole("button", { name: /Thu gọn nhánh Tứ Diệu Đế/i });
      fireEvent.click(collapseABtn);

      expect(document.querySelector('[data-node-id="topic-b"]')).toBeNull();
      expect(document.querySelector('[data-node-id="topic-c"]')).toBeNull();
      expect(document.querySelector('[data-node-id="topic-d"]')).toBeNull();

      // Re-expand topic-a
      fireEvent.click(screen.getByRole("button", { name: /Mở rộng nhánh Tứ Diệu Đế/i }));
      expect(document.querySelector('[data-node-id="topic-b"]')).not.toBeNull();

      // Re-expand topic-b
      fireEvent.click(screen.getByRole("button", { name: /Mở rộng nhánh Bát Chánh Đạo/i }));
      expect(document.querySelector('[data-node-id="topic-c"]')).not.toBeNull();
      expect(document.querySelector('[data-node-id="topic-d"]')).not.toBeNull();
    });

    it("Scenario 5: Focus scrolls to target DOM node and highlights temporarily then clears", async () => {
      vi.useFakeTimers();
      render(<MindMapView />);

      // Find cycle badge on topic-d (cycle back to ancestor topic-b)
      const cycleBadge = screen.getByTestId("cycle-badge-topic-d");
      expect(cycleBadge).toBeDefined();
      expect(cycleBadge.textContent).toContain("↻ Bát Chánh Đạo");

      fireEvent.click(cycleBadge);

      // scrollIntoView should have been called on target element topic-b
      const targetEl = document.querySelector('[data-node-id="topic-b"]');
      expect(targetEl).not.toBeNull();
      expect(targetEl?.getAttribute("data-highlighted")).toBe("true");

      // After timer expires (e.g. 2000ms), highlight is removed
      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(targetEl?.getAttribute("data-highlighted")).toBeNull();
    });

    it("Scenario 6: Gracefully handles non-existent target node without crashing", () => {
      render(<MindMapView />);

      expect(() => {
        const heading = screen.getByRole("heading", { name: /Sơ Đồ Tư Duy/i });
        expect(heading).toBeDefined();
      }).not.toThrow();
    });

    it("Scenario 7: Focusing a node hidden under a collapsed ancestor automatically uncollapses the ancestor", () => {
      // Create a scenario where topic-a -> topic-b -> topic-c and topic-a -> topic-e -> cycle to topic-c
      const specializedTopics: Topic[] = [
        createTopic("topic-a", "Tứ Diệu Đế", [
          { id: "link-a-b", targetId: "topic-b", linkType: "prerequisite", strength: 5 },
          { id: "link-a-e", targetId: "topic-e", linkType: "prerequisite", strength: 4 },
        ]),
        createTopic("topic-b", "Bát Chánh Đạo", [
          { id: "link-b-c", targetId: "topic-c", linkType: "prerequisite", strength: 5 },
        ]),
        createTopic("topic-c", "Chánh Kiến", []),
        createTopic("topic-e", "Giới Định Tuệ", [
          { id: "link-e-a", targetId: "topic-a", linkType: "related", strength: 3 },
        ]),
      ];

      vi.mocked(useData).mockReturnValue({
        topics: specializedTopics,
        notes: [],
        resources: [],
        selectedTopicId: "topic-a",
        openTopicDetail: vi.fn(),
      } as any);

      render(<MindMapView />);

      // Collapse topic-a (so children topic-b and topic-e are hidden)
      const collapseABtn = screen.getByRole("button", { name: /Thu gọn nhánh Tứ Diệu Đế/i });
      fireEvent.click(collapseABtn);

      expect(document.querySelector('[data-node-id="topic-b"]')).toBeNull();
      expect(document.querySelector('[data-node-id="topic-e"]')).toBeNull();

      // Re-expand topic-a
      fireEvent.click(screen.getByRole("button", { name: /Mở rộng nhánh Tứ Diệu Đế/i }));

      // Now collapse topic-b (so topic-c is hidden while topic-e is visible)
      const collapseBBtn = screen.getByRole("button", { name: /Thu gọn nhánh Bát Chánh Đạo/i });
      fireEvent.click(collapseBBtn);

      expect(document.querySelector('[data-node-id="topic-c"]')).toBeNull();
      expect(document.querySelector('[data-node-id="topic-e"]')).not.toBeNull();

      // Click cycle badge on topic-e (which targets topic-a)
      const cycleBadgeE = screen.getByTestId("cycle-badge-topic-e");
      fireEvent.click(cycleBadgeE);

      // Root topic-a receives highlight
      const rootEl = document.querySelector('[data-node-id="topic-a"]');
      expect(rootEl?.getAttribute("data-highlighted")).toBe("true");
    });
  });
});
