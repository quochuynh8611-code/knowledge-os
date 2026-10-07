import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MINDMAP_STORAGE_PREFIX,
  getMindMapStorageKey,
  getDefaultMindMapViewState,
  loadMindMapViewState,
  saveMindMapViewState,
  sanitizeCollapsedIds,
  MindMapLocalViewState,
} from "../../src/lib/mindmapStorage";

describe("Mind Map Track A - mindmapStorage Helper", () => {
  // Mock localStorage in-memory store
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};

    // Setup global localStorage mock
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStore[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStore[key];
      }),
      clear: vi.fn(() => {
        mockStore = {};
      }),
    };

    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: localStorageMock,
      },
      writable: true,
      configurable: true,
    });
  });

  describe("1. Key & Default State Generators", () => {
    it("generates canonical storage key with unified prefix", () => {
      expect(getMindMapStorageKey("topic-tu-dieu-de")).toBe(
        `${MINDMAP_STORAGE_PREFIX}topic-tu-dieu-de`
      );
      expect(getMindMapStorageKey("topic-tu-dieu-de")).toBe(
        "knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"
      );
    });

    it("returns standard default state for uninitialized topics", () => {
      const state = getDefaultMindMapViewState("topic-123");
      expect(state.version).toBe(1);
      expect(state.topicId).toBe("topic-123");
      expect(state.layoutMode).toBe("tree_horizontal");
      expect(state.collapsedNodeIds).toEqual([]);
      expect(state.showCrossLinks).toBe(false);
      expect(typeof state.updatedAt).toBe("string");
    });
  });

  describe("2. Sanitizer Logic", () => {
    it("sanitizes arrays, removing duplicates and non-string elements", () => {
      const messyInput = ["node-1", "node-2", "node-1", null, undefined, 123, "   ", "node-3"];
      const result = sanitizeCollapsedIds(messyInput);
      expect(result).toEqual(["node-1", "node-2", "node-3"]);
    });

    it("returns empty array for non-array inputs", () => {
      expect(sanitizeCollapsedIds(null)).toEqual([]);
      expect(sanitizeCollapsedIds(undefined)).toEqual([]);
      expect(sanitizeCollapsedIds("invalid")).toEqual([]);
      expect(sanitizeCollapsedIds(12345)).toEqual([]);
    });

    it("filters out stale IDs when validNodeIds set is provided", () => {
      const storedIds = ["node-active-1", "node-deleted-old", "node-active-2"];
      const validNodes = new Set(["node-active-1", "node-active-2", "node-active-3"]);

      const sanitized = sanitizeCollapsedIds(storedIds, validNodes);
      expect(sanitized).toEqual(["node-active-1", "node-active-2"]);
      expect(sanitized).not.toContain("node-deleted-old");
    });
  });

  describe("3. Load & Save Operations", () => {
    it("saves and loads valid view state successfully with showCrossLinks", () => {
      const stateToSave: MindMapLocalViewState = {
        version: 1,
        topicId: "topic-tu-dieu-de",
        layoutMode: "tree_vertical",
        collapsedNodeIds: ["node-bat-chanh-dao", "node-tam-tuong"],
        showCrossLinks: true,
        updatedAt: "2026-10-07T00:00:00.000Z",
      };

      const saveSuccess = saveMindMapViewState(stateToSave);
      expect(saveSuccess).toBe(true);

      const loaded = loadMindMapViewState("topic-tu-dieu-de");
      expect(loaded.version).toBe(1);
      expect(loaded.topicId).toBe("topic-tu-dieu-de");
      expect(loaded.layoutMode).toBe("tree_vertical");
      expect(loaded.collapsedNodeIds).toEqual(["node-bat-chanh-dao", "node-tam-tuong"]);
      expect(loaded.showCrossLinks).toBe(true);
    });

    it("isolates storage state between distinct topics including showCrossLinks", () => {
      saveMindMapViewState({
        version: 1,
        topicId: "topic-A",
        layoutMode: "tree_horizontal",
        collapsedNodeIds: ["node-A1"],
        showCrossLinks: true,
        updatedAt: new Date().toISOString(),
      });

      saveMindMapViewState({
        version: 1,
        topicId: "topic-B",
        layoutMode: "tree_vertical",
        collapsedNodeIds: ["node-B1", "node-B2"],
        showCrossLinks: false,
        updatedAt: new Date().toISOString(),
      });

      const loadedA = loadMindMapViewState("topic-A");
      const loadedB = loadMindMapViewState("topic-B");

      expect(loadedA.topicId).toBe("topic-A");
      expect(loadedA.layoutMode).toBe("tree_horizontal");
      expect(loadedA.collapsedNodeIds).toEqual(["node-A1"]);
      expect(loadedA.showCrossLinks).toBe(true);

      expect(loadedB.topicId).toBe("topic-B");
      expect(loadedB.layoutMode).toBe("tree_vertical");
      expect(loadedB.collapsedNodeIds).toEqual(["node-B1", "node-B2"]);
      expect(loadedB.showCrossLinks).toBe(false);
    });

    it("handles backward compatibility when legacy payload lacks showCrossLinks", () => {
      // Legacy payload format from Track A without showCrossLinks property
      mockStore[getMindMapStorageKey("topic-legacy")] = JSON.stringify({
        version: 1,
        topicId: "topic-legacy",
        layoutMode: "tree_vertical",
        collapsedNodeIds: ["node-legacy-1"],
        updatedAt: "2026-01-01T00:00:00Z",
      });

      const loaded = loadMindMapViewState("topic-legacy");
      expect(loaded.topicId).toBe("topic-legacy");
      expect(loaded.layoutMode).toBe("tree_vertical");
      expect(loaded.collapsedNodeIds).toEqual(["node-legacy-1"]);
      // Must fallback to false safely
      expect(loaded.showCrossLinks).toBe(false);
    });

    it("sanitizes stale IDs upon save when validNodeIds is provided", () => {
      const validNodes = new Set(["node-valid-1"]);
      saveMindMapViewState(
        {
          version: 1,
          topicId: "topic-prune",
          layoutMode: "tree_horizontal",
          collapsedNodeIds: ["node-valid-1", "node-stale-2"],
          showCrossLinks: false,
          updatedAt: new Date().toISOString(),
        },
        validNodes
      );

      const loaded = loadMindMapViewState("topic-prune");
      expect(loaded.collapsedNodeIds).toEqual(["node-valid-1"]);
      expect(loaded.showCrossLinks).toBe(false);
    });
  });

  describe("4. Defensive Fallbacks & Error Recovery", () => {
    it("returns default state gracefully when key is absent", () => {
      const state = loadMindMapViewState("non-existent-topic");
      expect(state.topicId).toBe("non-existent-topic");
      expect(state.collapsedNodeIds).toEqual([]);
      expect(state.layoutMode).toBe("tree_horizontal");
    });

    it("handles corrupted JSON payload safely without throwing", () => {
      mockStore[getMindMapStorageKey("topic-corrupt")] = "{ invalid json payload syntax...";

      const state = loadMindMapViewState("topic-corrupt");
      expect(state.topicId).toBe("topic-corrupt");
      expect(state.collapsedNodeIds).toEqual([]);
      expect(state.layoutMode).toBe("tree_horizontal");
    });

    it("handles incompatible version payload safely", () => {
      mockStore[getMindMapStorageKey("topic-v2")] = JSON.stringify({
        version: 999,
        topicId: "topic-v2",
        collapsedNodeIds: ["abc"],
      });

      const state = loadMindMapViewState("topic-v2");
      expect(state.topicId).toBe("topic-v2");
      expect(state.collapsedNodeIds).toEqual([]);
    });

    it("handles QuotaExceededError on setItem gracefully without throwing exception", () => {
      const throwingStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          const err = new Error("Quota exceeded");
          err.name = "QuotaExceededError";
          throw err;
        }),
      };

      Object.defineProperty(globalThis, "window", {
        value: { localStorage: throwingStorage },
        writable: true,
        configurable: true,
      });

      const saveResult = saveMindMapViewState({
        version: 1,
        topicId: "topic-overflow",
        layoutMode: "tree_horizontal",
        collapsedNodeIds: ["node-1"],
        updatedAt: new Date().toISOString(),
      });

      expect(saveResult).toBe(false);
    });

    it("handles missing window or localStorage gracefully", () => {
      Object.defineProperty(globalThis, "window", {
        value: {},
        writable: true,
        configurable: true,
      });

      const loaded = loadMindMapViewState("topic-no-storage");
      expect(loaded.topicId).toBe("topic-no-storage");
      expect(loaded.collapsedNodeIds).toEqual([]);

      const saved = saveMindMapViewState({
        version: 1,
        topicId: "topic-no-storage",
        layoutMode: "tree_horizontal",
        collapsedNodeIds: [],
        updatedAt: new Date().toISOString(),
      });
      expect(saved).toBe(false);
    });
  });
});
