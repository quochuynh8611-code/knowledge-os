import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import {
  saveMindMapViewState,
  loadMindMapViewState,
  getMindMapStorageKey,
} from "../../src/lib/mindmapStorage";

describe("Mind Map Track A - Component & View State Tests", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const localStorageMock = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStore[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: localStorageMock,
      },
      writable: true,
      configurable: true,
    });
  });

  const mockTree: MindMapTreeNode = {
    id: "topic-root",
    title: "Chủ Đề Gốc",
    type: "topic",
    domain: "phat-hoc",
    hopDistance: 0,
    tags: ["core"],
    children: [
      {
        id: "topic-branch-1",
        title: "Nhánh Con 1",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        edgeTypeToParent: "prerequisite",
        edgeStrength: 5,
        tags: [],
        children: [
          {
            id: "note-leaf-1",
            title: "Ghi Chú Chi Tiết 1",
            type: "note",
            domain: "phat-hoc",
            hopDistance: 2,
            parentHopId: "topic-branch-1",
            edgeTypeToParent: "has_note",
            tags: [],
            children: [],
          },
        ],
      },
      {
        id: "topic-branch-2",
        title: "Nhánh Con 2",
        type: "topic",
        domain: "phat-hoc",
        hopDistance: 1,
        parentHopId: "topic-root",
        edgeTypeToParent: "related",
        edgeStrength: 3,
        tags: [],
        children: [],
      },
    ],
  };

  describe("1. MindMapTreeCanvas Rendering & Collapse Filtering", () => {
    it("renders all descendant nodes when collapsedNodeIds is empty", () => {
      const html = renderToStaticMarkup(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={new Set()}
        />
      );

      expect(html).toContain("Chủ Đề Gốc");
      expect(html).toContain("Nhánh Con 1");
      expect(html).toContain("Nhánh Con 2");
      expect(html).toContain("Ghi Chú Chi Tiết 1");
      expect(html).toContain('aria-label="Thu gọn nhánh Nhánh Con 1"');
    });

    it("hides descendant nodes when parent node ID is in collapsedNodeIds", () => {
      const collapsed = new Set(["topic-branch-1"]);

      const html = renderToStaticMarkup(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          collapsedNodeIds={collapsed}
        />
      );

      expect(html).toContain("Chủ Đề Gốc");
      expect(html).toContain("Nhánh Con 1");
      expect(html).toContain("Nhánh Con 2");
      // Descendant of topic-branch-1 must NOT be in the rendered output
      expect(html).not.toContain("Ghi Chú Chi Tiết 1");
      // Collapsed count indicator +1 must be displayed
      expect(html).toContain("+1");
      expect(html).toContain('aria-label="Mở rộng nhánh Nhánh Con 1"');
    });

    it("renders vertical layout structure properly with collapsed branch", () => {
      const collapsed = new Set(["topic-branch-2"]);

      const html = renderToStaticMarkup(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_vertical"
          collapsedNodeIds={collapsed}
        />
      );

      expect(html).toContain("Chủ Đề Gốc");
      expect(html).toContain("Nhánh Con 1");
      expect(html).toContain("Ghi Chú Chi Tiết 1");
    });
  });

  describe("2. Persistence Integration Check", () => {
    it("can save and verify localStorage payload format for component consumption", () => {
      const topicId = "topic-root";
      const saveOk = saveMindMapViewState({
        version: 1,
        topicId,
        layoutMode: "tree_vertical",
        collapsedNodeIds: ["topic-branch-1"],
        showCrossLinks: true,
        updatedAt: new Date().toISOString(),
      });

      expect(saveOk).toBe(true);

      const loaded = loadMindMapViewState(topicId);
      expect(loaded.version).toBe(1);
      expect(loaded.layoutMode).toBe("tree_vertical");
      expect(loaded.collapsedNodeIds).toEqual(["topic-branch-1"]);
      expect(loaded.showCrossLinks).toBe(true);

      // Verify raw storage payload contains boolean showCrossLinks
      const raw = JSON.parse(mockStore[getMindMapStorageKey(topicId)]);
      expect(raw.showCrossLinks).toBe(true);
    });

    it("matches canonical key in local storage", () => {
      expect(getMindMapStorageKey("topic-xyz")).toBe(
        "knowledge_os_mindmap_view_state_v1:topic-xyz"
      );
    });
  });
});
