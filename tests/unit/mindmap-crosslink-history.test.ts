/**
 * Test Suite: Phase M5a — MindMap History Composite Snapshot & Cascade Pruning (Test-First)
 *
 * Mapped Specifications:
 * - Scenario: Delete node and cascade prune connected cross-links
 * - Scenario: Undo add cross-link
 * - Scenario: Redo add cross-link
 * - Scenario: Undo delete node restores both node and cross-links consistently
 */

import { describe, it, expect } from "vitest";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";
import { MindMapDocumentEdge } from "../../src/types/mindmapDocument";
import * as mindmapHistory from "../../src/lib/mindmapHistory";

// Dynamic access to future M5 helpers (currently not implemented in mindmapHistory)
const {
  pruneDanglingCrossLinks,
  createMindMapDocumentHistory,
  pushDocumentHistoryMutation,
  undoDocumentHistory,
  redoDocumentHistory,
} = mindmapHistory as any;

function createMockTree(
  rootId: string,
  children: { id: string; title: string }[] = []
): MindMapTreeNode {
  return {
    id: rootId,
    title: "Root Node",
    type: "topic",
    domain: "general",
    hopDistance: 0,
    tags: [],
    children: children.map((c) => ({
      id: c.id,
      title: c.title,
      type: "topic",
      domain: "general",
      hopDistance: 1,
      tags: [],
      children: [],
    })),
  };
}

describe("Phase M5a — History Composite Snapshot & Cascade Pruning Unit Tests", () => {
  describe("1. Pure Cascade Pruning Helper", () => {
    it("prunes cross-links referencing deleted nodes (source or target)", () => {
      expect(typeof pruneDanglingCrossLinks).toBe("function");

      const edges: MindMapDocumentEdge[] = [
        {
          id: "edge-1",
          sourceNodeId: "node-a",
          targetNodeId: "node-b",
          edgeType: "related",
        },
        {
          id: "edge-2",
          sourceNodeId: "node-b",
          targetNodeId: "node-c",
          edgeType: "prerequisite",
        },
        {
          id: "edge-3",
          sourceNodeId: "node-a",
          targetNodeId: "node-c",
          edgeType: "advanced",
        },
      ];

      // If node-b is deleted, valid nodes are only { node-a, node-c }
      const validNodeIds = new Set(["node-a", "node-c"]);
      const result = pruneDanglingCrossLinks(edges, validNodeIds);

      // edge-1 (target node-b) and edge-2 (source node-b) must be pruned
      expect(result.prunedCrossLinks).toEqual([
        {
          id: "edge-3",
          sourceNodeId: "node-a",
          targetNodeId: "node-c",
          edgeType: "advanced",
        },
      ]);
      expect(result.prunedCount).toBe(2);
    });

    it("retains all edges when all referenced nodes exist", () => {
      expect(typeof pruneDanglingCrossLinks).toBe("function");

      const edges: MindMapDocumentEdge[] = [
        {
          id: "edge-1",
          sourceNodeId: "node-a",
          targetNodeId: "node-b",
          edgeType: "related",
        },
      ];

      const validNodeIds = new Set(["node-a", "node-b"]);
      const result = pruneDanglingCrossLinks(edges, validNodeIds);

      expect(result.prunedCrossLinks).toHaveLength(1);
      expect(result.prunedCount).toBe(0);
    });
  });

  describe("2. Composite History Snapshot (Tree + CrossLinks)", () => {
    it("initializes document history containing both tree and cross-links in present", () => {
      expect(typeof createMindMapDocumentHistory).toBe("function");

      const tree = createMockTree("root", [
        { id: "node-a", title: "A" },
        { id: "node-b", title: "B" },
      ]);
      const crossLinks: MindMapDocumentEdge[] = [
        {
          id: "edge-1",
          sourceNodeId: "node-a",
          targetNodeId: "node-b",
          edgeType: "related",
        },
      ];

      const history = createMindMapDocumentHistory(tree, crossLinks);

      expect(history.present.tree.id).toBe("root");
      expect(history.present.crossLinks).toHaveLength(1);
      expect(history.present.crossLinks[0].id).toBe("edge-1");
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });

    it("Undo and Redo add cross-link mutation", () => {
      expect(typeof pushDocumentHistoryMutation).toBe("function");
      expect(typeof undoDocumentHistory).toBe("function");
      expect(typeof redoDocumentHistory).toBe("function");

      const tree = createMockTree("root", [
        { id: "node-a", title: "A" },
        { id: "node-b", title: "B" },
      ]);
      const initialLinks: MindMapDocumentEdge[] = [];

      let history = createMindMapDocumentHistory(tree, initialLinks);

      // Mutation: Add cross-link
      const nextLinks: MindMapDocumentEdge[] = [
        {
          id: "edge-new",
          sourceNodeId: "node-a",
          targetNodeId: "node-b",
          edgeType: "prerequisite",
        },
      ];
      history = pushDocumentHistoryMutation(history, tree, nextLinks);

      expect(history.present.crossLinks).toHaveLength(1);
      expect(history.past).toHaveLength(1);

      // UNDO
      history = undoDocumentHistory(history);
      expect(history.present.crossLinks).toHaveLength(0);
      expect(history.future).toHaveLength(1);

      // REDO
      history = redoDocumentHistory(history);
      expect(history.present.crossLinks).toHaveLength(1);
      expect(history.present.crossLinks[0].id).toBe("edge-new");
    });

    it("Undo delete node consistently restores BOTH the node and its pruned cross-links", () => {
      expect(typeof pushDocumentHistoryMutation).toBe("function");
      expect(typeof undoDocumentHistory).toBe("function");

      const treeWithB = createMockTree("root", [
        { id: "node-a", title: "A" },
        { id: "node-b", title: "B" },
      ]);
      const linksWithB: MindMapDocumentEdge[] = [
        {
          id: "edge-a-b",
          sourceNodeId: "node-a",
          targetNodeId: "node-b",
          edgeType: "related",
        },
      ];

      let history = createMindMapDocumentHistory(treeWithB, linksWithB);

      // Mutation: Delete node-b (tree loses node-b, cross-links pruned)
      const treeWithoutB = createMockTree("root", [{ id: "node-a", title: "A" }]);
      const linksWithoutB: MindMapDocumentEdge[] = [];

      history = pushDocumentHistoryMutation(history, treeWithoutB, linksWithoutB);

      expect(history.present.tree.children).toHaveLength(1);
      expect(history.present.crossLinks).toHaveLength(0);

      // UNDO deletion
      history = undoDocumentHistory(history);

      // Both node-b and edge-a-b must be restored
      expect(history.present.tree.children).toHaveLength(2);
      expect(
        history.present.tree.children.some((c: any) => c.id === "node-b")
      ).toBe(true);
      expect(history.present.crossLinks).toHaveLength(1);
      expect(history.present.crossLinks[0].id).toBe("edge-a-b");
    });
  });
});
