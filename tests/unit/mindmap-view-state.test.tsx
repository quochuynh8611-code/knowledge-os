import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import {
  saveMindMapViewState,
  loadMindMapViewState,
  getMindMapStorageKey,
  sanitizeCollapsedIds,
  getDefaultMindMapViewState,
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

  describe("3. Storage Resilience & Sanitization Hardening", () => {
    it("loadMindMapViewState gracefully falls back to default state when storage data is malformed JSON or has wrong version", () => {
      const topicId = "topic-corrupted";
      const storageKey = getMindMapStorageKey(topicId);

      // Case 1: Corrupted/Malformed JSON string
      mockStore[storageKey] = "{malformed-json-payload-without-closing";
      const fallbackFromMalformed = loadMindMapViewState(topicId);
      expect(fallbackFromMalformed.version).toBe(1);
      expect(fallbackFromMalformed.topicId).toBe(topicId);
      expect(fallbackFromMalformed.layoutMode).toBe("tree_horizontal");
      expect(fallbackFromMalformed.collapsedNodeIds).toEqual([]);
      expect(fallbackFromMalformed.showCrossLinks).toBe(false);

      // Case 2: Incompatible schema version
      mockStore[storageKey] = JSON.stringify({
        version: 99,
        topicId,
        layoutMode: "tree_vertical",
        collapsedNodeIds: ["node-1"],
      });
      const fallbackFromWrongVersion = loadMindMapViewState(topicId);
      expect(fallbackFromWrongVersion.version).toBe(1);
      expect(fallbackFromWrongVersion.layoutMode).toBe("tree_horizontal");
      expect(fallbackFromWrongVersion.collapsedNodeIds).toEqual([]);

      // Case 3: Invalid collapsedNodeIds type (not an array)
      mockStore[storageKey] = JSON.stringify({
        version: 1,
        topicId,
        collapsedNodeIds: "invalid_string_not_array",
      });
      const fallbackFromInvalidField = loadMindMapViewState(topicId);
      expect(fallbackFromInvalidField.version).toBe(1);
      expect(fallbackFromInvalidField.layoutMode).toBe("tree_horizontal");
      expect(fallbackFromInvalidField.collapsedNodeIds).toEqual([]);
    });

    it("saveMindMapViewState returns false and handles QuotaExceededError without throwing uncaught exceptions", () => {
      const topicId = "topic-quota-test";
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Mock localStorage.setItem to throw QuotaExceededError
      window.localStorage.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };

      let saveResult = false;
      expect(() => {
        saveResult = saveMindMapViewState({
          version: 1,
          topicId,
          layoutMode: "tree_horizontal",
          collapsedNodeIds: ["node-1"],
          showCrossLinks: false,
          updatedAt: new Date().toISOString(),
        });
      }).not.toThrow();

      expect(saveResult).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("sanitizeCollapsedIds prunes duplicate, non-string, and stale IDs not present in validNodeIds", () => {
      // 1. Non-array input
      expect(sanitizeCollapsedIds(null)).toEqual([]);
      expect(sanitizeCollapsedIds(undefined)).toEqual([]);
      expect(sanitizeCollapsedIds({ foo: "bar" })).toEqual([]);

      // 2. Duplicates, empty strings, and non-string types
      const dirtyIds = [
        "node-a",
        "node-b",
        "node-a", // duplicate
        123, // number
        null, // null
        "", // empty
        "   ", // whitespace only
        "node-c",
      ];
      expect(sanitizeCollapsedIds(dirtyIds)).toEqual(["node-a", "node-b", "node-c"]);

      // 3. Pruning stale/orphan IDs against validNodeIds
      const validNodes = new Set(["node-a", "node-c", "node-active"]);
      const pruned = sanitizeCollapsedIds(["node-a", "node-b", "node-c", "node-orphan"], validNodes);
      expect(pruned).toEqual(["node-a", "node-c"]);

      // 4. Persistence roundtrip with validNodeIds pruning
      const topicId = "topic-prune-test";
      const ok = saveMindMapViewState(
        {
          version: 1,
          topicId,
          layoutMode: "tree_horizontal",
          collapsedNodeIds: ["node-a", "node-orphan"],
          showCrossLinks: false,
          updatedAt: new Date().toISOString(),
        },
        validNodes
      );
      expect(ok).toBe(true);

      const saved = loadMindMapViewState(topicId);
      expect(saved.collapsedNodeIds).toEqual(["node-a"]);
    });
  });
});
