/**
 * Integration Test Suite: Phase M5a — Cross-Link Save & Cascade Prune Workflow (Test-First)
 *
 * Mapped Specifications:
 * - Scenario: Save persists cross-links into document version
 * - Scenario: Delete node and cascade prune connected cross-links
 * - Scenario: Save after prune does not trigger dangling-edge validation error
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapVersion,
} from "../../src/types/mindmapDocument";

const mockDocSummary: MindMapDocumentSummary = {
  id: "doc-crosslink-test",
  title: "Sơ Đồ Liên Kết Chéo",
  tags: ["triet-hoc"],
  currentVersionNumber: 1,
  totalVersionsCount: 1,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const initialDocTree: MindMapDocumentNode = {
  id: "doc-root",
  title: "Gốc Triết Học",
  nodeType: "topic",
  children: [
    {
      id: "doc-node-a",
      title: "Khái Niệm A",
      nodeType: "topic",
      children: [],
    },
    {
      id: "doc-node-b",
      title: "Khái Niệm B",
      nodeType: "topic",
      children: [],
    },
  ],
};

const initialVersionWithNoLinks: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-crosslink-test",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo",
  treeData: initialDocTree,
  crossLinks: [],
  viewState: {
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    showCrossLinks: true,
  },
};

const initialVersionWithExistingLink: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-crosslink-test",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo có link",
  treeData: initialDocTree,
  crossLinks: [
    {
      id: "edge-a-to-b",
      sourceNodeId: "doc-node-a",
      targetNodeId: "doc-node-b",
      edgeType: "prerequisite",
      label: "Tiên quyết",
    },
  ],
  viewState: {
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    showCrossLinks: true,
  },
};

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: [],
    notes: [],
    resources: [],
    categories: [],
    selectedTopicId: null,
    openTopicDetail: vi.fn(),
  }),
}));

describe("Phase M5a — Cross-Link Save & Cascade Prune Workflow Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
  });

  it("Scenario 1: Adding a cross-link via Drawer persists into document version upon save", async () => {
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(
      initialVersionWithNoLinks
    );

    const appendVersionSpy = vi
      .spyOn(mindmapDocumentStorage, "appendMindMapVersion")
      .mockReturnValue({
        success: true,
        isVolatile: false,
        data: {
          ...initialVersionWithNoLinks,
          versionNumber: 2,
        },
      });

    render(<MindMapView />);

    // 1. Open document via browser modal
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Open drawer by clicking node "doc-node-a"
    const nodeAEl = document.querySelector('[data-node-id="doc-node-a"]');
    expect(nodeAEl).toBeInTheDocument();
    if (nodeAEl) fireEvent.click(nodeAEl);

    // 3. In Drawer: Add cross-link to "doc-node-b"
    const targetSelect = screen.getByTestId("crosslink-target-select");
    fireEvent.change(targetSelect, { target: { value: "doc-node-b" } });

    const typeSelect = screen.getByTestId("crosslink-type-select");
    fireEvent.change(typeSelect, { target: { value: "related" } });

    const addBtn = screen.getByTestId("crosslink-add-btn");
    fireEvent.click(addBtn);

    // 4. Save Version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    expect(screen.getByTestId("mindmap-save-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("input-change-summary"), {
      target: { value: "Thêm liên kết A -> B" },
    });
    fireEvent.click(screen.getByTestId("btn-confirm-save-doc"));

    // 5. Assert: appendMindMapVersion was called with the new cross-link in crossLinks array
    expect(appendVersionSpy).toHaveBeenCalledTimes(1);
    const savedPayload = appendVersionSpy.mock.calls[0][0];

    expect(savedPayload.crossLinks).toBeDefined();
    expect(savedPayload.crossLinks).toHaveLength(1);
    expect(savedPayload.crossLinks[0].targetNodeId).toBe("doc-node-b");
    expect(savedPayload.crossLinks[0].edgeType).toBe("related");
  });

  it("Scenario 2: Deleting a node cascade-prunes connected cross-links and avoids DANGLING_EDGE_REFERENCE on save", async () => {
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(
      initialVersionWithExistingLink
    );

    const appendVersionSpy = vi
      .spyOn(mindmapDocumentStorage, "appendMindMapVersion")
      .mockReturnValue({
        success: true,
        isVolatile: false,
        data: {
          ...initialVersionWithExistingLink,
          versionNumber: 2,
        },
      });

    render(<MindMapView />);

    // 1. Open document via browser modal
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Delete node "doc-node-b" from canvas
    const deleteBtn = screen.getByTestId("btn-delete-node-doc-node-b");
    fireEvent.click(deleteBtn);

    const confirmBtn = screen.queryByTestId("btn-confirm-delete-node");
    if (confirmBtn) {
      fireEvent.click(confirmBtn);
    }

    // 3. Save Version
    fireEvent.click(screen.getByTestId("btn-save-mindmap"));
    expect(screen.getByTestId("mindmap-save-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("input-change-summary"), {
      target: { value: "Xóa nút B và cascade prune liên kết" },
    });
    fireEvent.click(screen.getByTestId("btn-confirm-save-doc"));

    // 4. Assert: appendMindMapVersion must NOT receive edge-a-to-b (because node-b no longer exists in tree)
    expect(appendVersionSpy).toHaveBeenCalledTimes(1);
    const savedPayload = appendVersionSpy.mock.calls[0][0];

    // crossLinks should be pruned to empty
    expect(savedPayload.crossLinks).toHaveLength(0);

    // Storage input validation MUST pass (not throw dangling edge)
    const validation = mindmapDocumentStorage.validateDocumentInput({
      title: mockDocSummary.title,
      treeData: savedPayload.treeData,
      crossLinks: savedPayload.crossLinks,
    });
    expect(validation.valid).toBe(true);
  });
});
