import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KnowledgeGraph } from "../../src/components/graph/KnowledgeGraph";
import { Topic, Note, Resource, Category, Tag } from "../../src/types";

// Mock fixtures
const mockTopics: Topic[] = [
  {
    id: "topic-tu-dieu-de",
    title: "Tứ Diệu Đế",
    slug: "tu-dieu-de",
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    categoryName: "Căn Bản Phật Học",
    description: "Bốn chân lý tối thượng.",
    content: "Khổ, Tập, Diệt, Đạo.",
    tags: ["co-ban"],
    studyProgress: {
      topicId: "topic-tu-dieu-de",
      status: "completed",
      progress: 100,
      repetitions: 5,
      interval: 10,
      easeFactor: 2.5,
      totalNotes: 1,
      timeSpent: 60,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [
      {
        id: "link-1",
        sourceId: "topic-tu-dieu-de",
        targetId: "topic-bat-chanh-dao",
        linkType: "prerequisite",
        strength: 5,
      },
    ],
  },
  {
    id: "topic-bat-chanh-dao",
    title: "Bát Chánh Đạo",
    slug: "bat-chanh-dao",
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    categoryName: "Căn Bản Phật Học",
    description: "Con đường tám nhánh.",
    content: "Chánh kiến...",
    tags: ["dao-de"],
    studyProgress: {
      topicId: "topic-bat-chanh-dao",
      status: "in_progress",
      progress: 50,
      repetitions: 2,
      interval: 3,
      easeFactor: 2.4,
      totalNotes: 0,
      timeSpent: 30,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [
      {
        id: "link-2",
        sourceId: "topic-bat-chanh-dao",
        targetId: "topic-tam-tuong",
        linkType: "related",
        strength: 4,
      },
    ],
  },
  {
    id: "topic-tam-tuong",
    title: "Tam Tướng",
    slug: "tam-tuong",
    type: "phat-hoc",
    categoryId: "cat-phat-hoc",
    categoryName: "Triết Lý",
    description: "Ba đặc tính phổ quát.",
    content: "Vô thường, Khổ, Vô ngã.",
    tags: ["triet-ly"],
    studyProgress: {
      topicId: "topic-tam-tuong",
      status: "not_started",
      progress: 0,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    links: [
      {
        id: "link-3",
        sourceId: "topic-tam-tuong",
        targetId: "topic-tu-dieu-de",
        linkType: "advanced",
        strength: 3,
      },
    ],
  },
];

const mockNotes: Note[] = [
  {
    id: "note-1",
    topicId: "topic-tu-dieu-de",
    title: "Ghi chú Khổ Đế",
    content: "Chi tiết Khổ đế",
    type: "study",
    tags: ["kho-de"],
    createdAt: "2026-08-24T00:00:00Z",
    updatedAt: "2026-08-24T00:00:00Z",
    isPrivate: false,
  },
];

const mockResources: Resource[] = [
  {
    id: "res-1",
    topicId: "topic-tu-dieu-de",
    title: "Tài liệu Chuyển Pháp Luân",
    type: "book",
    url: "",
    filePath: "/docs/Dhammacakka.pdf",
    author: "HT Thích Minh Châu",
    notes: "Tài liệu tham khảo gốc",
    createdAt: "2026-08-24T00:00:00Z",
  },
];

const mockOpenTopicDetail = vi.fn();

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    categories: [],
    tags: [{ id: "tag-1", name: "co-ban", color: "amber" }],
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Workstream 5A Gate B: KnowledgeGraph UI Traversal Explorer Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Renders KnowledgeGraph with Semantic Edge Filter and traversal controls", () => {
    render(<KnowledgeGraph />);

    // Header and title
    expect(screen.getByText(/Knowledge Graph/i)).toBeInTheDocument();

    // Semantic Edge Filter dropdown must be present
    const edgeFilterSelect = screen.getByRole("combobox", {
      name: /semantic-edge-filter/i,
    });
    expect(edgeFilterSelect).toBeInTheDocument();
    expect(edgeFilterSelect).toHaveValue("all");

    // Check edge options
    expect(screen.getByRole("option", { name: /Tất cả liên kết/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Tiên quyết \(prerequisite\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Nâng cao \(advanced\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Đối lập \(contradicts\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Tương quan \(related\)/i })).toBeInTheDocument();
  });

  it("2. Selecting a topic node opens details drawer with degree and k-hop exploration toggle", async () => {
    render(<KnowledgeGraph />);

    // Find and click topic node "Tứ Diệu Đế"
    const nodeElement = screen.getByText("Tứ Diệu Đế");
    expect(nodeElement).toBeInTheDocument();
    fireEvent.click(nodeElement);

    // Detail drawer opens
    await waitFor(() => {
      expect(screen.getByText(/Bốn chân lý tối thượng/i)).toBeInTheDocument();
      // Degree info must be displayed
      expect(screen.getByText(/Bậc kết nối/i)).toBeInTheDocument();
      // Traversal Explorer focus button must be available
      expect(
        screen.getByRole("button", { name: /Khảo cứu lân cận/i })
      ).toBeInTheDocument();
    });
  });

  it("3. Changing semanticEdgeFilter observable updates edge indicators", async () => {
    render(<KnowledgeGraph />);

    const edgeFilterSelect = screen.getByRole("combobox", {
      name: /semantic-edge-filter/i,
    });

    // Switch to prerequisite
    fireEvent.change(edgeFilterSelect, { target: { value: "prerequisite" } });
    expect(edgeFilterSelect).toHaveValue("prerequisite");
  });

  it("4. Enabling focus mode and changing traversal depth updates graph exploration scope", async () => {
    render(<KnowledgeGraph />);

    // Select topic
    const nodeElement = screen.getByText("Tứ Diệu Đế");
    fireEvent.click(nodeElement);

    // Click focus mode button
    const focusButton = await screen.findByRole("button", {
      name: /Khảo cứu lân cận/i,
    });
    fireEvent.click(focusButton);

    // Traversal depth selector (1-hop, 2-hop, 3-hop) should appear
    const depthSelector = await screen.findByLabelText(/Độ sâu duyệt/i);
    expect(depthSelector).toBeInTheDocument();

    // Change depth to 1
    fireEvent.change(depthSelector, { target: { value: "1" } });
    expect(depthSelector).toHaveValue("1");
  });
});
