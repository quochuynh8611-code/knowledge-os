import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import * as mindmapDocumentStorage from "../../src/lib/mindmapDocumentStorage";
import {
  MindMapDocumentNode,
  MindMapDocumentSummary,
  MindMapVersion,
} from "../../src/types/mindmapDocument";

const mockTopics = [
  {
    id: "topic-bat-chanh-dao",
    title: "Bát Chánh Đạo",
    description: "Con đường tám nhánh",
    category: "Phật Học",
    categoryId: "cat-1",
    tags: ["co-ban"],
    order: 1,
    parentId: null,
  },
];
let mockSelectedTopicId: string | null = "topic-bat-chanh-dao";
const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    categories: [{ id: "cat-1", name: "Phật Học" }],
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

const mockDocSummary: MindMapDocumentSummary = {
  id: "doc-tu-dieu-de",
  title: "Sơ đồ Tứ Diệu Đế",
  description: "Khảo cứu chân lý",
  tags: ["phat-hoc"],
  currentVersionNumber: 1,
  totalVersionsCount: 1,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const initialDocTree: MindMapDocumentNode = {
  id: "doc-root",
  title: "Tứ Diệu Đế Gốc",
  nodeType: "topic",
  sourceIdReference: "topic-bat-chanh-dao",
  semanticBadge: "Core",
  children: [
    {
      id: "doc-child-kho",
      title: "Khổ Đế",
      nodeType: "topic",
      semanticBadge: "Dukkha",
      children: [],
    },
  ],
};

const initialVersion: MindMapVersion = {
  id: "ver-1",
  documentId: "doc-tu-dieu-de",
  versionNumber: 1,
  createdAt: "2026-01-01T00:00:00Z",
  changeSummary: "Khởi tạo",
  treeData: initialDocTree,
  crossLinks: [],
  viewState: {
    layoutMode: "tree_horizontal",
    collapsedNodeIds: [],
    showCrossLinks: false,
  },
};

describe("Bug Prevention: Node click must NOT navigate away to Topic Detail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectedTopicId = "topic-bat-chanh-dao";
    mindmapDocumentStorage.clearVolatileStorageForTests();
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }

    vi.spyOn(mindmapDocumentStorage, "getMindMapDocumentSummary").mockReturnValue(mockDocSummary);
    vi.spyOn(mindmapDocumentStorage, "getMindMapVersion").mockReturnValue(initialVersion);
    vi.spyOn(mindmapDocumentStorage, "listMindMapDocuments").mockReturnValue([mockDocSummary]);
  });

  it("1. Clicking a topic node in Live Topic mode stays on Mind Map and never calls openTopicDetail", async () => {
    render(<MindMapView />);

    const nodeEl = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
    expect(nodeEl).toBeInTheDocument();

    // Click the node card
    if (nodeEl) {
      fireEvent.click(nodeEl);
    }

    // Must NOT call openTopicDetail
    expect(mockOpenTopicDetail).not.toHaveBeenCalled();
    // Must set focus on the node within Mind Map canvas
    expect(nodeEl).toHaveAttribute("data-focused", "true");
  });

  it("2. Clicking a topic node in Saved Document mode stays on Mind Map and never calls openTopicDetail", async () => {
    render(<MindMapView />);

    // Open saved document via browser modal
    fireEvent.click(screen.getByTestId("btn-open-mindmap-browser"));
    const browserModal = screen.getByTestId("mindmap-browser-modal");
    fireEvent.click(within(browserModal).getByTestId(`btn-open-${mockDocSummary.id}`));

    // Find topic node on canvas
    const nodeEl = await screen.findByText("Khổ Đế");
    expect(nodeEl).toBeInTheDocument();

    const nodeCard = document.querySelector('[data-node-id="doc-child-kho"]');
    expect(nodeCard).toBeInTheDocument();

    if (nodeCard) {
      fireEvent.click(nodeCard);
    }

    // Must NOT call openTopicDetail
    expect(mockOpenTopicDetail).not.toHaveBeenCalled();
  });

  it("3. Pressing Enter on a focused node on canvas does NOT trigger openTopicDetail", async () => {
    render(<MindMapView />);

    const canvasBackdrop = screen.getByTestId("mindmap-canvas-backdrop");
    const nodeEl = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
    expect(nodeEl).toBeInTheDocument();

    // Focus node
    fireEvent.keyDown(canvasBackdrop, { key: "Home", code: "Home" });
    expect(nodeEl).toHaveAttribute("data-focused", "true");

    // Press Enter
    fireEvent.keyDown(canvasBackdrop, { key: "Enter", code: "Enter" });

    // Must NOT navigate out to topic detail
    expect(mockOpenTopicDetail).not.toHaveBeenCalled();
  });
});
