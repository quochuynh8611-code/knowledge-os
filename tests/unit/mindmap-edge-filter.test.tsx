import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MindMapView } from "../../src/components/mindmap/MindMapView";
import { Topic, Note, Resource } from "../../src/types";

let mockTopics: Topic[] = [];
let mockNotes: Note[] = [];
let mockResources: Resource[] = [];
let mockSelectedTopicId: string | null = "topic-root";
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

function createTopic(
  id: string,
  title: string,
  links: Array<{ id: string; targetId: string; linkType: "related" | "prerequisite" | "advanced" | "contradicts"; strength: number }> = []
): Topic {
  return {
    id,
    title,
    slug: id,
    type: "phat-hoc",
    categoryId: "cat-1",
    description: `${title} description`,
    content: `${title} content`,
    tags: [],
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

describe("Mind Map Phase A: Edge-Type Semantic Filter Suite", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
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

    mockOpenTopicDetail = vi.fn();
    mockSelectedTopicId = "topic-root";

    // Setup a graph with:
    // Root -> Child A, Child B, Child C, Child D
    // Cross-links:
    // Child A -> Child B (prerequisite, strength 5)
    // Child A -> Child C (prerequisite, strength 4)
    // Child B -> Child C (related, strength 3)
    // Child C -> Child D (advanced, strength 4)
    // Total 4 cross-links across 3 types: 2 prerequisite, 1 related, 1 advanced
    mockTopics = [
      createTopic("topic-root", "Tứ Diệu Đế", [
        { id: "l-r-a", targetId: "topic-a", linkType: "prerequisite", strength: 5 },
        { id: "l-r-b", targetId: "topic-b", linkType: "prerequisite", strength: 5 },
        { id: "l-r-c", targetId: "topic-c", linkType: "prerequisite", strength: 5 },
        { id: "l-r-d", targetId: "topic-d", linkType: "prerequisite", strength: 5 },
      ]),
      createTopic("topic-a", "Khổ Đế", [
        { id: "cross-a-b", targetId: "topic-b", linkType: "prerequisite", strength: 5 },
        { id: "cross-a-c", targetId: "topic-c", linkType: "prerequisite", strength: 4 },
      ]),
      createTopic("topic-b", "Tập Đế", [
        { id: "cross-b-c", targetId: "topic-c", linkType: "related", strength: 3 },
      ]),
      createTopic("topic-c", "Diệt Đế", [
        { id: "cross-c-d", targetId: "topic-d", linkType: "advanced", strength: 4 },
      ]),
      createTopic("topic-d", "Đạo Đế", []),
    ];

    mockNotes = [];
    mockResources = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("Scenario 1: Filter bar is hidden when showCrossLinks is false, and visible when showCrossLinks is true", () => {
    render(<MindMapView />);

    // By default showCrossLinks is false -> edge filter bar must not exist
    expect(screen.queryByTestId("mindmap-edge-filter-bar")).toBeNull();

    // Toggle cross-links on
    const toggleBtn = screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ");
    fireEvent.click(toggleBtn);

    // Edge filter bar should now be visible
    const filterBar = screen.getByTestId("mindmap-edge-filter-bar");
    expect(filterBar).not.toBeNull();

    // Toggle cross-links off -> filter bar must hide
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId("mindmap-edge-filter-bar")).toBeNull();
  });

  it("Scenario 2: Renders filter pills for All and present edge types with correct counts", () => {
    render(<MindMapView />);

    // Toggle cross-links on
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    const filterAll = screen.getByTestId("edge-filter-pill-all");
    const filterPrereq = screen.getByTestId("edge-filter-pill-prerequisite");
    const filterRelated = screen.getByTestId("edge-filter-pill-related");
    const filterAdvanced = screen.getByTestId("edge-filter-pill-advanced");

    expect(filterAll).not.toBeNull();
    expect(filterPrereq).not.toBeNull();
    expect(filterRelated).not.toBeNull();
    expect(filterAdvanced).not.toBeNull();

    // Check count text
    expect(filterAll.textContent).toContain("4"); // 4 total cross edges
    expect(filterPrereq.textContent).toContain("2"); // 2 prerequisite edges
    expect(filterRelated.textContent).toContain("1"); // 1 related edge
    expect(filterAdvanced.textContent).toContain("1"); // 1 advanced edge

    // "All" is active by default
    expect(filterAll.getAttribute("aria-pressed")).toBe("true");
    expect(filterPrereq.getAttribute("aria-pressed")).toBe("false");
  });

  it("Scenario 3: Clicking 'prerequisite' filter pill renders only prerequisite cross edges on SVG canvas", () => {
    const { container } = render(<MindMapView />);

    // Toggle cross-links on
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    // Click "Tiên quyết" filter pill
    const filterPrereq = screen.getByTestId("edge-filter-pill-prerequisite");
    fireEvent.click(filterPrereq);

    expect(filterPrereq.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("edge-filter-pill-all").getAttribute("aria-pressed")).toBe("false");

    // Check that SVG layer contains only prerequisite cross edges
    const prereqEdge1 = container.querySelector('[data-edge-id="cross-a-b"]');
    const prereqEdge2 = container.querySelector('[data-edge-id="cross-a-c"]');
    const relatedEdge = container.querySelector('[data-edge-id="cross-b-c"]');
    const advancedEdge = container.querySelector('[data-edge-id="cross-c-d"]');

    expect(prereqEdge1).not.toBeNull();
    expect(prereqEdge2).not.toBeNull();
    expect(relatedEdge).toBeNull();
    expect(advancedEdge).toBeNull();
  });

  it("Scenario 4: Clicking 'All' restores all cross edges on SVG canvas", () => {
    const { container } = render(<MindMapView />);

    // Toggle cross-links on
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    // First filter by "related"
    fireEvent.click(screen.getByTestId("edge-filter-pill-related"));
    expect(container.querySelector('[data-edge-id="cross-a-b"]')).toBeNull();
    expect(container.querySelector('[data-edge-id="cross-b-c"]')).not.toBeNull();

    // Now click "All"
    fireEvent.click(screen.getByTestId("edge-filter-pill-all"));
    expect(screen.getByTestId("edge-filter-pill-all").getAttribute("aria-pressed")).toBe("true");

    // All 4 edges must exist in SVG layer
    expect(container.querySelector('[data-edge-id="cross-a-b"]')).not.toBeNull();
    expect(container.querySelector('[data-edge-id="cross-a-c"]')).not.toBeNull();
    expect(container.querySelector('[data-edge-id="cross-b-c"]')).not.toBeNull();
    expect(container.querySelector('[data-edge-id="cross-c-d"]')).not.toBeNull();
  });

  it("Scenario 5: Switching topic dropdown resets edge filter to 'all'", () => {
    render(<MindMapView />);

    // Toggle cross-links on for topic-root
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    // Select "prerequisite" filter
    fireEvent.click(screen.getByTestId("edge-filter-pill-prerequisite"));
    expect(screen.getByTestId("edge-filter-pill-prerequisite").getAttribute("aria-pressed")).toBe("true");

    // Switch topic to topic-a
    const topicSelect = screen.getByLabelText("Chọn chủ đề gốc");
    fireEvent.change(topicSelect, { target: { value: "topic-a" } });

    // For topic-a, turn cross-links on to view filter bar
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    // Edge filter must be reset to "all"
    const filterAll = screen.getByTestId("edge-filter-pill-all");
    expect(filterAll.getAttribute("aria-pressed")).toBe("true");
  });

  it("Scenario 6: Selecting an edge type with 0 cross edges renders empty SVG layer gracefully", () => {
    const { container } = render(<MindMapView />);

    // Toggle cross-links on
    fireEvent.click(screen.getByTitle("Bật/tắt hiển thị liên kết chéo trên sơ đồ"));

    // "contradicts" is not present in graph
    const filterContradicts = screen.queryByTestId("edge-filter-pill-contradicts");
    if (filterContradicts) {
      fireEvent.click(filterContradicts);
      // SVG layer has 0 rendered paths
      expect(container.querySelectorAll("path[data-edge-id]").length).toBe(0);
    }
  });
});
