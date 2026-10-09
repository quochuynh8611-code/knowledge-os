import { describe, it, expect } from "vitest";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import {
  createMindMapHistory,
  pushHistoryMutation,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  isHistoryDirty,
  commitHistorySave,
  resetHistoryToSavedBaseline,
  shouldIgnoreCanvasShortcut,
} from "../../src/lib/mindmapHistory";

function createMockTree(title: string, childCount: number = 0): MindMapTreeNode {
  return {
    id: `node-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    type: "topic",
    domain: "general",
    hopDistance: 0,
    tags: [],
    children: Array.from({ length: childCount }, (_, i) => ({
      id: `child-${i}`,
      title: `Child ${i + 1}`,
      type: "note",
      domain: "general",
      hopDistance: 1,
      tags: [],
      children: [],
    })),
  };
}

describe("Phase P5 — MindMap History Unit Tests", () => {
  describe("1. Initial History State", () => {
    it("initializes with empty past/future and present set to initial tree", () => {
      const initial = createMockTree("Root");
      const history = createMindMapHistory(initial, 40);

      expect(history.present).toBe(initial);
      expect(history.past).toEqual([]);
      expect(history.future).toEqual([]);
      expect(history.savedBaseline).toBe(initial);
      expect(history.maxDepth).toBe(40);
      expect(canUndo(history)).toBe(false);
      expect(canRedo(history)).toBe(false);
      expect(isHistoryDirty(history)).toBe(false);
    });
  });

  describe("2. Push, Undo, Redo Flow", () => {
    it("pushes a new mutation, enabling undo and clearing future", () => {
      const v0 = createMockTree("Root V0");
      const v1 = createMockTree("Root V1");
      const history0 = createMindMapHistory(v0);

      const history1 = pushHistoryMutation(history0, v1);

      expect(history1.present).toBe(v1);
      expect(history1.past).toHaveLength(1);
      expect(history1.past[0]).toBe(v0);
      expect(history1.future).toHaveLength(0);
      expect(canUndo(history1)).toBe(true);
      expect(canRedo(history1)).toBe(false);
    });

    it("undoes back to previous state and enables redo", () => {
      const v0 = createMockTree("Root V0");
      const v1 = createMockTree("Root V1");
      const history0 = createMindMapHistory(v0);
      const history1 = pushHistoryMutation(history0, v1);

      const historyAfterUndo = undoHistory(history1);

      expect(historyAfterUndo.present).toBe(v0);
      expect(historyAfterUndo.past).toHaveLength(0);
      expect(historyAfterUndo.future).toHaveLength(1);
      expect(historyAfterUndo.future[0]).toBe(v1);
      expect(canUndo(historyAfterUndo)).toBe(false);
      expect(canRedo(historyAfterUndo)).toBe(true);
    });

    it("redoes back to newer state and restores past", () => {
      const v0 = createMockTree("Root V0");
      const v1 = createMockTree("Root V1");
      const history0 = createMindMapHistory(v0);
      const history1 = pushHistoryMutation(history0, v1);
      const historyUndone = undoHistory(history1);

      const historyRedone = redoHistory(historyUndone);

      expect(historyRedone.present).toBe(v1);
      expect(historyRedone.past).toHaveLength(1);
      expect(historyRedone.past[0]).toBe(v0);
      expect(historyRedone.future).toHaveLength(0);
      expect(canUndo(historyRedone)).toBe(true);
      expect(canRedo(historyRedone)).toBe(false);
    });

    it("no-ops safely when undo is called on empty past", () => {
      const v0 = createMockTree("Root V0");
      const history = createMindMapHistory(v0);

      const result = undoHistory(history);

      expect(result.present).toBe(v0);
      expect(result.past).toHaveLength(0);
      expect(result.future).toHaveLength(0);
    });

    it("no-ops safely when redo is called on empty future", () => {
      const v0 = createMockTree("Root V0");
      const history = createMindMapHistory(v0);

      const result = redoHistory(history);

      expect(result.present).toBe(v0);
      expect(result.past).toHaveLength(0);
      expect(result.future).toHaveLength(0);
    });
  });

  describe("3. Future Invalidation on New Mutation", () => {
    it("discards all future entries when a new mutation is pushed after undo", () => {
      const v0 = createMockTree("Step 0");
      const v1 = createMockTree("Step 1");
      const v2 = createMockTree("Step 2");
      const v3Alt = createMockTree("Step 3 Alt");

      let history = createMindMapHistory(v0);
      history = pushHistoryMutation(history, v1);
      history = pushHistoryMutation(history, v2);

      // Undo 2 times -> present is v0, future has [v1, v2]
      history = undoHistory(history);
      history = undoHistory(history);
      expect(history.present).toBe(v0);
      expect(history.future).toHaveLength(2);

      // New mutation v3Alt pushed
      history = pushHistoryMutation(history, v3Alt);

      expect(history.present).toBe(v3Alt);
      expect(history.past).toHaveLength(1);
      expect(history.past[0]).toBe(v0);
      expect(history.future).toEqual([]);
      expect(canRedo(history)).toBe(false);
    });
  });

  describe("4. Max History Depth Ceiling", () => {
    it("drops oldest past item when history depth exceeds maxDepth (40)", () => {
      const maxDepth = 5;
      const initial = createMockTree("Step 0");
      let history = createMindMapHistory(initial, maxDepth);

      for (let i = 1; i <= 8; i++) {
        history = pushHistoryMutation(history, createMockTree(`Step ${i}`));
      }

      expect(history.past).toHaveLength(maxDepth);
      expect(history.present.title).toBe("Step 8");
      // Oldest remaining past item should be Step 3 (0, 1, 2 were dropped)
      expect(history.past[0].title).toBe("Step 3");
      expect(history.past[history.past.length - 1].title).toBe("Step 7");
    });
  });

  describe("5. Dirty Alignment with Saved Baseline", () => {
    it("tracks dirty flag accurately on mutations, undos, saves, and resets", () => {
      const v0 = createMockTree("Baseline Tree");
      const v1 = createMockTree("Mutated Tree 1");
      let history = createMindMapHistory(v0);

      expect(isHistoryDirty(history)).toBe(false);

      // 1. Mutate -> dirty
      history = pushHistoryMutation(history, v1);
      expect(isHistoryDirty(history)).toBe(true);

      // 2. Undo back to v0 -> not dirty
      history = undoHistory(history);
      expect(isHistoryDirty(history)).toBe(false);

      // 3. Redo to v1 -> dirty again
      history = redoHistory(history);
      expect(isHistoryDirty(history)).toBe(true);

      // 4. Commit save at v1 -> v1 becomes baseline, not dirty
      history = commitHistorySave(history);
      expect(isHistoryDirty(history)).toBe(false);
      expect(history.savedBaseline).toBe(v1);

      // 5. Undo back to v0 -> now dirty compared to new baseline v1!
      history = undoHistory(history);
      expect(isHistoryDirty(history)).toBe(true);

      // 6. Reset to saved baseline -> restores v1, clears past & future, not dirty
      history = resetHistoryToSavedBaseline(history);
      expect(history.present).toBe(v1);
      expect(history.past).toEqual([]);
      expect(history.future).toEqual([]);
      expect(isHistoryDirty(history)).toBe(false);
    });
  });

  describe("6. Canvas Keyboard Shortcut Exclusion Rules", () => {
    it("returns true (ignore shortcut) for input, textarea, and contenteditable elements", () => {
      const inputEl = document.createElement("input");
      const textareaEl = document.createElement("textarea");
      const contentEditableEl = document.createElement("div");
      contentEditableEl.contentEditable = "true";
      const regularDiv = document.createElement("div");

      expect(shouldIgnoreCanvasShortcut(inputEl)).toBe(true);
      expect(shouldIgnoreCanvasShortcut(textareaEl)).toBe(true);
      expect(shouldIgnoreCanvasShortcut(contentEditableEl)).toBe(true);
      expect(shouldIgnoreCanvasShortcut(regularDiv)).toBe(false);
    });

    it("returns true (ignore shortcut) for elements inside a modal or dialog", () => {
      const modalContainer = document.createElement("div");
      modalContainer.setAttribute("role", "dialog");
      const buttonInsideModal = document.createElement("button");
      modalContainer.appendChild(buttonInsideModal);
      document.body.appendChild(modalContainer);

      expect(shouldIgnoreCanvasShortcut(buttonInsideModal)).toBe(true);

      document.body.removeChild(modalContainer);
    });
  });
});
