/**
 * Integration Test Suite: Phase M7a — On-Canvas Cross-Link Quick Delete History Integration
 *
 * Mapped Specifications:
 * - Scenario: Delete cross-link via on-canvas quick action creates one atomic history snapshot
 * - Scenario: Undo (Cmd+Z / Ctrl+Z) restores the deleted cross-link
 * - Scenario: Redo (Cmd+Shift+Z / Ctrl+Shift+Z) re-deletes the cross-link
 * - Scenario: Dismissing popover on Escape does not dirty history or document
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
  id: "doc-quick-delete-test",
  title: "Sơ Đồ Quick Delete Test",
  tags: ["triet-hoc"],
  currentVersionNumber: 1,
  totalVersionsCount: 1,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const docTree: MindMapDocumentNode = {
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

const initialVersionWithCrossLink: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-quick-delete-test",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo với liên kết",
  treeData: docTree,
  crossLinks: [
    {
      id: "edge-test-a-b",
      sourceNodeId: "doc-node-a",
      targetNodeId: "doc-node-b",
      edgeType: "related",
      label: "Quan hệ thử nghiệm",
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

describe("Phase M7a — On-Canvas Cross-Link Quick Delete History Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersionWithCrossLink);
  });

  it("Scenario 1: On-canvas quick delete removes edge and integrates with Undo/Redo", async () => {
    render(<MindMapView />);

    // 1. Mở tài liệu có sẵn liên kết
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Định vị hit target của cross-link
    const hitTarget = screen.getByTestId("crosslink-hit-target-edge-test-a-b");
    expect(hitTarget).toBeInTheDocument();

    // 3. Click chọn cross-link để mở quick action popover
    fireEvent.click(hitTarget);
    const deleteBtn = screen.getByTestId("crosslink-quick-delete");
    expect(deleteBtn).toBeInTheDocument();

    // 4. Click nút xóa
    fireEvent.click(deleteBtn);

    // 5. Kiểm tra: Edge biến mất khỏi canvas & dirty indicator xuất hiện
    expect(screen.queryByTestId("crosslink-hit-target-edge-test-a-b")).not.toBeInTheDocument();
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();

    // 6. Nhấn Undo (Cmd+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true });

    // Edge được khôi phục trên canvas
    expect(screen.getByTestId("crosslink-hit-target-edge-test-a-b")).toBeInTheDocument();

    // 7. Nhấn Redo (Cmd+Shift+Z)
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });

    // Edge lại bị xóa
    expect(screen.queryByTestId("crosslink-hit-target-edge-test-a-b")).not.toBeInTheDocument();
  });
});
