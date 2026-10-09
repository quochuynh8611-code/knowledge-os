import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { MindMapTreeCanvas } from "../../src/components/mindmap/MindMapTreeCanvas";
import { Topic, Note, Resource } from "../../src/types";
import { MindMapTreeNode } from "../../src/lib/mindmapProjection";

let mockTopics: Topic[] = [];
let mockNotes: Note[] = [];
let mockResources: Resource[] = [];
let mockSelectedTopicId: string | null = "topic-tu-dieu-de";
let mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    selectedTopicId: mockSelectedTopicId,
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

function createMockTopic(
  id: string,
  title: string,
  links: Array<{ id: string; targetId: string; linkType: "related" | "prerequisite" | "advanced" | "contradicts"; strength: number }> = []
): Topic {
  return {
    id,
    title,
    slug: id,
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    description: `${title} mô tả`,
    content: `${title} nội dung`,
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

describe("Mind Map Feature S1: In-Canvas Search & Node Highlight Filter", () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => store[k] ?? null,
          setItem: (k: string, v: string) => {
            store[k] = v;
          },
          removeItem: (k: string) => {
            delete store[k];
          },
          clear: () => {
            for (const k in store) delete store[k];
          },
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    mockTopics = [
      createMockTopic("topic-tu-dieu-de", "Tứ Diệu Đế", [
        { id: "l1", targetId: "topic-bat-chanh-dao", linkType: "prerequisite", strength: 5 },
        { id: "l2", targetId: "topic-tam-tuong", linkType: "related", strength: 3 },
      ]),
      createMockTopic("topic-bat-chanh-dao", "Bát Chánh Đạo", [
        { id: "l3", targetId: "topic-chanh-kien", linkType: "prerequisite", strength: 5 },
      ]),
      createMockTopic("topic-tam-tuong", "Tam Tướng", []),
      createMockTopic("topic-chanh-kien", "Chánh Kiến", []),
    ];

    mockNotes = [
      {
        id: "note-1",
        title: "Tóm Lược 4 Chân Lý",
        content: "Nội dung tóm tắt",
        topicId: "topic-tu-dieu-de",
        type: "summary",
        isPrivate: false,
        tags: ["note"],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    mockResources = [];
    mockSelectedTopicId = "topic-tu-dieu-de";
    mockOpenTopicDetail = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("1. MindMapTreeCanvas Matching & Dimming Prop Contract", () => {
    const mockTree: MindMapTreeNode = {
      id: "node-root",
      title: "Root Topic",
      type: "topic",
      domain: "general",
      hopDistance: 0,
      tags: [],
      children: [
        {
          id: "node-match",
          title: "Matching Child",
          type: "topic",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [],
        },
        {
          id: "node-other",
          title: "Other Child",
          type: "note",
          domain: "general",
          hopDistance: 1,
          tags: [],
          children: [],
        },
      ],
    };

    it("Scenario 1.1: renders data-search-match on matching node and data-search-dim on non-matching nodes when search is active", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          matchingNodeIds={new Set(["node-match"])}
        />
      );

      const matchNode = screen.getByText("Matching Child").closest('[data-node-id="node-match"]');
      const otherNode = screen.getByText("Other Child").closest('[data-node-id="node-other"]');
      const rootNode = screen.getByText("Root Topic").closest('[data-node-id="node-root"]');

      expect(matchNode).toHaveAttribute("data-search-match", "true");
      expect(matchNode).not.toHaveAttribute("data-search-dim");

      expect(otherNode).toHaveAttribute("data-search-dim", "true");
      expect(otherNode).not.toHaveAttribute("data-search-match");

      expect(rootNode).toHaveAttribute("data-search-dim", "true");
      expect(rootNode).not.toHaveAttribute("data-search-match");
    });

    it("Scenario 1.2: does not render search match or dim attributes when matchingNodeIds is null (idle search)", () => {
      render(
        <MindMapTreeCanvas
          tree={mockTree}
          layoutMode="tree_horizontal"
          matchingNodeIds={null}
        />
      );

      const matchNode = screen.getByText("Matching Child").closest('[data-node-id="node-match"]');
      const otherNode = screen.getByText("Other Child").closest('[data-node-id="node-other"]');

      expect(matchNode).not.toHaveAttribute("data-search-match");
      expect(matchNode).not.toHaveAttribute("data-search-dim");
      expect(otherNode).not.toHaveAttribute("data-search-match");
      expect(otherNode).not.toHaveAttribute("data-search-dim");
    });
  });

  describe("2. MindMapView In-Canvas Search Toolbar & Highlight Lifecycle", () => {
    it("Scenario 2.1: typing search query matches title case-insensitively, highlights matching node, and displays match counter", () => {
      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "bát chánh" } });

      // Match count badge
      expect(screen.getByText(/1 khớp/i)).toBeInTheDocument();

      // Check highlighted match
      const matchedNode = document.querySelector('[data-node-id="topic-bat-chanh-dao"]');
      expect(matchedNode).toHaveAttribute("data-search-match", "true");
      expect(matchedNode).not.toHaveAttribute("data-search-dim");

      // Check dimmed non-matches
      const rootNode = document.querySelector('[data-node-id="topic-tu-dieu-de"]');
      expect(rootNode).toHaveAttribute("data-search-dim", "true");
    });

    it("Scenario 2.2: auto-expands collapsed ancestor path in-memory when matching node is inside a collapsed branch", () => {
      // Pre-collapse topic-bat-chanh-dao in localStorage
      store["knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"] = JSON.stringify({
        version: 1,
        topicId: "topic-tu-dieu-de",
        layoutMode: "tree_horizontal",
        collapsedNodeIds: ["topic-bat-chanh-dao"],
        showCrossLinks: false,
        updatedAt: "2026-01-01T00:00:00Z",
      });

      render(<MindMapView />);

      // Initially "Chánh Kiến" node is not in DOM because parent "Bát Chánh Đạo" is collapsed
      expect(document.querySelector('[data-node-id="topic-chanh-kien"]')).toBeNull();

      // Search for "Chánh Kiến"
      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      fireEvent.change(searchInput, { target: { value: "Chánh Kiến" } });

      // Node "Chánh Kiến" should now be revealed on canvas and highlighted
      const chanhKienNode = document.querySelector('[data-node-id="topic-chanh-kien"]');
      expect(chanhKienNode).not.toBeNull();
      expect(chanhKienNode).toHaveAttribute("data-search-match", "true");
    });

    it("Scenario 2.3: clearing search via clear button or Escape key restores original view state without persisting override to LocalStorage", () => {
      // Pre-collapse topic-bat-chanh-dao
      store["knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"] = JSON.stringify({
        version: 1,
        topicId: "topic-tu-dieu-de",
        layoutMode: "tree_horizontal",
        collapsedNodeIds: ["topic-bat-chanh-dao"],
        showCrossLinks: false,
        updatedAt: "2026-01-01T00:00:00Z",
      });

      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      fireEvent.change(searchInput, { target: { value: "Chánh Kiến" } });
      expect(document.querySelector('[data-node-id="topic-chanh-kien"]')).not.toBeNull();

      // Click clear button
      const clearBtn = screen.getByLabelText("Xóa tìm kiếm");
      fireEvent.click(clearBtn);

      // Search input is empty
      expect(searchInput).toHaveValue("");

      // Original collapsed branch is restored (Chánh Kiến is hidden again)
      expect(document.querySelector('[data-node-id="topic-chanh-kien"]')).toBeNull();

      // LocalStorage was not corrupted by the search operation
      const saved = JSON.parse(store["knowledge_os_mindmap_view_state_v1:topic-tu-dieu-de"]);
      expect(saved.collapsedNodeIds).toEqual(["topic-bat-chanh-dao"]);
    });

    it("Scenario 2.4: pressing Escape key in search input clears the active search", () => {
      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      fireEvent.change(searchInput, { target: { value: "Bát Chánh" } });
      expect(screen.getByText(/1 khớp/i)).toBeInTheDocument();

      fireEvent.keyDown(searchInput, { key: "Escape", code: "Escape" });

      expect(searchInput).toHaveValue("");
      expect(screen.queryByText(/khớp/i)).not.toBeInTheDocument();
    });

    it("Scenario 2.5: whitespace-only query is treated as a no-op", () => {
      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      fireEvent.change(searchInput, { target: { value: "    " } });

      expect(screen.queryByText(/khớp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/0 kết quả/i)).not.toBeInTheDocument();

      const rootNode = document.querySelector('[data-node-id="topic-tu-dieu-de"]');
      expect(rootNode).not.toHaveAttribute("data-search-dim");
      expect(rootNode).not.toHaveAttribute("data-search-match");
    });

    it("Scenario 2.6: displays 0 kết quả and dims nodes safely when no nodes match the query", () => {
      render(<MindMapView />);

      const searchInput = screen.getByPlaceholderText("Tìm nút trong sơ đồ...");
      fireEvent.change(searchInput, { target: { value: "NonExistentTermXYZ" } });

      expect(screen.getByText(/0 kết quả/i)).toBeInTheDocument();

      const rootNode = document.querySelector('[data-node-id="topic-tu-dieu-de"]');
      expect(rootNode).toHaveAttribute("data-search-dim", "true");
      expect(rootNode).not.toHaveAttribute("data-search-match");
    });
  });
});
