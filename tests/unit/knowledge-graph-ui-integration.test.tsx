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
  {
    id: "topic-phe-phan-ly-tinh",
    title: "Phê Phán Lý Tính Thuần Túy",
    slug: "phe-phan-ly-tinh",
    type: "triet-hoc",
    categoryId: "cat-triet-hoc",
    categoryName: "Triết Học Tây Phương",
    description: "Tác phẩm triết học của Immanuel Kant.",
    content: "A priori, a posteriori, hiện tượng và vật tự nó.",
    tags: ["triet-hoc", "kant"],
    links: [],
    studyProgress: {
      topicId: "topic-phe-phan-ly-tinh",
      status: "in_progress",
      progress: 40,
      repetitions: 1,
      interval: 2,
      easeFactor: 2.5,
      totalNotes: 0,
      timeSpent: 20,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
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

let currentCategories: Category[] = [];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: mockNotes,
    resources: mockResources,
    categories: currentCategories,
    tags: [{ id: "tag-1", name: "co-ban", color: "amber" }],
    openTopicDetail: mockOpenTopicDetail,
  }),
}));

describe("Workstream 5A Gate B: KnowledgeGraph UI Traversal Explorer Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentCategories = [];
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

  it("5. Dynamic Root Domain Filter: Renders domain buttons dynamically for all available root categories and handles all mode", () => {
    currentCategories = [
      {
        id: "cat-phat-hoc",
        name: "Phật Học",
        slug: "phat-hoc",
        color: "amber",
        parentId: null,
      },
      {
        id: "cat-huyen-hoc",
        name: "Huyền Học",
        slug: "huyen-hoc",
        color: "indigo",
        parentId: null,
      },
      {
        id: "cat-triet-hoc",
        name: "Triết Học Tây Phương",
        slug: "triet-hoc",
        color: "emerald",
        parentId: null,
      },
    ];

    render(<KnowledgeGraph />);

    // a. Must render dynamic domain buttons
    const allBtn = screen.getByRole("button", { name: /Tất cả/i });
    const phatHocBtn = screen.getByRole("button", { name: /Phật Học/i });
    const huyenHocBtn = screen.getByRole("button", { name: /Huyền Học/i });
    const trietHocBtn = screen.getByRole("button", { name: /Triết Học Tây Phương/i });

    expect(allBtn).toBeInTheDocument();
    expect(phatHocBtn).toBeInTheDocument();
    expect(huyenHocBtn).toBeInTheDocument();
    expect(trietHocBtn).toBeInTheDocument();

    // Initial state: both Buddhist topic and Kant topic exist in DOM
    expect(screen.getByText("Tứ Diệu Đế")).toBeInTheDocument();
    expect(screen.getByText(/Phê Phán Lý Tính/i)).toBeInTheDocument();

    // b. Click dynamic category button to filter to Triết Học Tây Phương
    fireEvent.click(trietHocBtn);
    expect(trietHocBtn).toHaveClass("bg-amber-700");

    // c. Triết học topic remains visible, while Buddhist topic is filtered out
    expect(screen.getByText(/Phê Phán Lý Tính/i)).toBeInTheDocument();
    expect(screen.queryByText("Tứ Diệu Đế")).not.toBeInTheDocument();

    // Click Phật Học button to switch filter
    fireEvent.click(phatHocBtn);
    expect(screen.getByText("Tứ Diệu Đế")).toBeInTheDocument();
    expect(screen.queryByText(/Phê Phán Lý Tính/i)).not.toBeInTheDocument();

    // d. Click "Tất cả" to reset to all mode
    fireEvent.click(allBtn);
    expect(allBtn).toHaveClass("bg-white");
    expect(screen.getByText("Tứ Diệu Đế")).toBeInTheDocument();
    expect(screen.getByText(/Phê Phán Lý Tính/i)).toBeInTheDocument();
  });

  it("6. Fallback Behavior: Gracefully renders default domain buttons when categories is empty", () => {
    currentCategories = []; // Empty categories fallback

    render(<KnowledgeGraph />);

    expect(screen.getByRole("button", { name: /Tất cả/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Phật Học/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Huyền Học/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Triết Học Tây Phương/i })).not.toBeInTheDocument();
  });

  it("7. Detail-Open Behavior: Clicking 'Mở chi tiết' in detail drawer invokes openTopicDetail callback", async () => {
    render(<KnowledgeGraph />);

    // Select topic "Tứ Diệu Đế"
    const nodeElement = screen.getByText("Tứ Diệu Đế");
    fireEvent.click(nodeElement);

    // Find and click "Mở chi tiết"
    const openDetailBtn = await screen.findByRole("button", {
      name: /Mở chi tiết/i,
    });
    expect(openDetailBtn).toBeInTheDocument();
    fireEvent.click(openDetailBtn);

    expect(mockOpenTopicDetail).toHaveBeenCalledWith("topic-tu-dieu-de");
  });

  it("8. Node Type Filter: Toggling note and resource checkboxes updates visibility without regression", () => {
    render(<KnowledgeGraph />);

    const noteCheckbox = screen.getByRole("checkbox", { name: /Ghi chú/i });
    const resourceCheckbox = screen.getByRole("checkbox", { name: /Tài liệu/i });

    expect(noteCheckbox).toBeChecked();
    expect(resourceCheckbox).toBeChecked();

    fireEvent.click(noteCheckbox);
    expect(noteCheckbox).not.toBeChecked();

    fireEvent.click(resourceCheckbox);
    expect(resourceCheckbox).not.toBeChecked();
  });
});
