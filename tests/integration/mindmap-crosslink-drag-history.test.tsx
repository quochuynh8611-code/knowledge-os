/**
 * Integration Test Suite: Phase M5b — Canvas Drag-to-Connect History & Working State Integration (Test-First)
 *
 * Mapped Specifications:
 * - Scenario: Drop on valid target creates one cross-link in working state
 * - Scenario: Undo after successful drag removes created edge
 * - Scenario: Redo restores created edge
 * - Scenario: Cancel/invalid drop does not push to history stack
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
  id: "doc-drag-test",
  title: "Sơ Đồ Drag Connect Test",
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

const initialVersion: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-drag-test",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo",
  treeData: docTree,
  crossLinks: [],
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

describe("Phase M5b — Canvas Drag-to-Connect Studio Integration & History Tests", () => {
  beforeEach(() => {
    if (typeof document !== "undefined" && !document.elementFromPoint) {
      document.elementFromPoint = () => null;
    }
    vi.clearAllMocks();
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersion);
  });

  it("Scenario 1: Drag-to-connect adds edge to working state and integrates with Undo/Redo", async () => {
    render(<MindMapView />);

    // 1. Open saved document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Locate node A handle and node B card
    const handleA = screen.getByTestId("connector-handle-doc-node-a");
    const nodeBCard = document.querySelector('[data-node-id="doc-node-b"]')!;

    expect(handleA).toBeInTheDocument();
    expect(nodeBCard).toBeInTheDocument();

    // 3. Drag from handle A and drop onto node B
    vi.spyOn(document, "elementFromPoint").mockReturnValue(nodeBCard);

    fireEvent.pointerDown(handleA, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handleA, { clientX: 300, clientY: 300, pointerId: 1 });
    fireEvent.pointerUp(handleA, { clientX: 300, clientY: 300, pointerId: 1 });

    // 4. Assert: Permanent edge appears on canvas & dirty indicator is active
    expect(screen.getByTestId("dirty-indicator")).toBeInTheDocument();
    const createdEdge = document.querySelector('[data-edge-id^="edge-"]');
    expect(createdEdge).toBeInTheDocument();

    // 5. UNDO (⌘Z)
    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    fireEvent.keyDown(canvasBackdrop, { key: "z", metaKey: true });

    // Edge must disappear
    expect(document.querySelector('[data-edge-id^="edge-"]')).not.toBeInTheDocument();

    // 6. REDO (⇧⌘Z)
    fireEvent.keyDown(canvasBackdrop, { key: "z", metaKey: true, shiftKey: true });

    // Edge must be restored
    expect(document.querySelector('[data-edge-id^="edge-"]')).toBeInTheDocument();
  });

  it("Scenario 2: Canceled drag or invalid drop does not mutate working state or push history", async () => {
    render(<MindMapView />);

    // 1. Open saved document
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    fireEvent.click(screen.getByTestId(`doc-card-${mockDocSummary.id}`));

    // 2. Drag from handle A but drop onto empty canvas (null)
    const handleA = screen.getByTestId("connector-handle-doc-node-a");
    vi.spyOn(document, "elementFromPoint").mockReturnValue(null);

    fireEvent.pointerDown(handleA, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(handleA, { clientX: 500, clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(handleA, { clientX: 500, clientY: 500, pointerId: 1 });

    // 3. Document must NOT be dirty, no edges created
    expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();
    expect(document.querySelector('[data-edge-id^="edge-"]')).not.toBeInTheDocument();

    // 4. Pressing Undo does nothing (not dirty, no history step)
    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    fireEvent.keyDown(canvasBackdrop, { key: "z", metaKey: true });
    expect(screen.queryByTestId("dirty-indicator")).not.toBeInTheDocument();
  });
});
