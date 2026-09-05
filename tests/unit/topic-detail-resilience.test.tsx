import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicDetail } from "../../src/components/topics/TopicDetail";
import type { Topic, Category, Tag, Note, Resource } from "../../src/types";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Vi Diệu Pháp",
    slug: "vi-dieu-phap",
    type: "phat-hoc",
  },
];

let mockTopics: Topic[] = [];
let mockSelectedTopicId: string | null = "topic-1";

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    categories: mockCategories,
    selectedTopicId: mockSelectedTopicId,
    setSelectedTopicId: (id: string | null) => {
      mockSelectedTopicId = id;
    },
    topics: mockTopics,
    notes: [] as Note[],
    resources: [] as Resource[],
    tags: [] as Tag[],
    updateTopicProgress: vi.fn(),
    deleteNote: vi.fn(),
    addResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
    addKnowledgeLink: vi.fn(),
    removeKnowledgeLink: vi.fn(),
  }),
}));

describe("TopicDetail Resilience & Safe Collection Rendering", () => {
  beforeEach(() => {
    mockSelectedTopicId = "topic-1";
  });

  it("1. reproduces runtime TypeError when topic.links is undefined", () => {
    // Topic with links missing/undefined (simulating legacy or incomplete storage object)
    mockTopics = [
      {
        id: "topic-1",
        title: "Khảo Sát Tâm Sở Biến Hành",
        slug: "khao-sat-tam-so-bien-hanh",
        categoryId: "cat-1",
        categoryName: "Vi Diệu Pháp",
        type: "phat-hoc",
        description: "Khảo sát 7 Tâm Sở Biến Hành",
        content: "Nội dung chi tiết về Xúc, Tác ý, Thọ, Tưởng, Tư, Nhất tâm, Mạng căn",
        tags: ["Abhidharma"],
        links: undefined as unknown as any,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        studyProgress: {
          topicId: "topic-1",
          progress: 50,
          totalNotes: 0,
          timeSpent: 60,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          status: "in_progress",
        },
      },
    ];

    expect(() => render(<TopicDetail />)).not.toThrow();
    expect(
      screen.getByRole("heading", { name: "Khảo Sát Tâm Sở Biến Hành" }),
    ).toBeInTheDocument();
  });

  it("2. reproduces runtime TypeError when topic.tags is undefined", () => {
    // Topic with tags missing/undefined
    mockTopics = [
      {
        id: "topic-1",
        title: "Khảo Sát Tâm Vương",
        slug: "khao-sat-tam-vuong",
        categoryId: "cat-1",
        categoryName: "Vi Diệu Pháp",
        type: "phat-hoc",
        description: "Mô tả Tâm Vương",
        content: "Nội dung Tâm Vương",
        tags: undefined as unknown as any,
        links: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        studyProgress: {
          topicId: "topic-1",
          progress: 0,
          totalNotes: 0,
          timeSpent: 0,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          status: "not_started",
        },
      },
    ];

    expect(() => render(<TopicDetail />)).not.toThrow();
    expect(
      screen.getByRole("heading", { name: "Khảo Sát Tâm Vương" }),
    ).toBeInTheDocument();
  });

  it("3. renders normally when topic.links and topic.tags are valid arrays", () => {
    mockTopics = [
      {
        id: "topic-1",
        title: "Khảo Sát 24 Duyên Hệ",
        slug: "khao-sat-24-duyen-he",
        categoryId: "cat-1",
        categoryName: "Vi Diệu Pháp",
        type: "phat-hoc",
        description: "Khảo sát Patthana",
        content: "Nội dung 24 Duyên",
        tags: ["DuyenHe", "Patthana"],
        links: [
          {
            id: "link-1",
            sourceId: "topic-1",
            targetId: "topic-2",
            targetTitle: "Tâm Sở",
            linkType: "related",
            strength: 4,
          },
        ],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        studyProgress: {
          topicId: "topic-1",
          progress: 80,
          totalNotes: 2,
          timeSpent: 180,
          interval: 6,
          easeFactor: 2.6,
          repetitions: 3,
          status: "completed",
        },
      },
      {
        id: "topic-2",
        title: "Tâm Sở",
        slug: "tam-so",
        categoryId: "cat-1",
        type: "phat-hoc",
        description: "52 Tâm Sở",
        content: "Nội dung",
        tags: [],
        links: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        studyProgress: {
          topicId: "topic-2",
          progress: 100,
          totalNotes: 0,
          timeSpent: 60,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          status: "completed",
        },
      },
    ];

    render(<TopicDetail />);

    // Tags are displayed
    expect(screen.getByText(/#DuyenHe/i)).toBeInTheDocument();
    expect(screen.getByText(/#Patthana/i)).toBeInTheDocument();

    // Switch to links tab
    const linksTabBtn = screen.getByRole("button", { name: /Liên Kết Tri Thức/i });
    fireEvent.click(linksTabBtn);

    // Linked target is displayed
    expect(screen.getByText("Tâm Sở")).toBeInTheDocument();
  });

  it("4. renders 'Liên kết ghi chú Obsidian' button in resources tab and opens modal", () => {
    mockTopics = [
      {
        id: "topic-1",
        title: "Khảo Sát 24 Duyên Hệ",
        slug: "khao-sat-24-duyen-he",
        categoryId: "cat-1",
        type: "phat-hoc",
        description: "Khảo sát Patthana",
        content: "Nội dung 24 Duyên",
        tags: [],
        links: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        studyProgress: {
          topicId: "topic-1",
          progress: 80,
          totalNotes: 2,
          timeSpent: 180,
          interval: 6,
          easeFactor: 2.6,
          repetitions: 3,
          status: "completed",
        },
      },
    ];

    render(<TopicDetail />);

    // Switch to resources tab
    const resourcesTab = screen.getByRole("button", { name: /Tài liệu/i });
    fireEvent.click(resourcesTab);

    // Obsidian CTA exists with accessible name
    const ctaBtn = screen.getByRole("button", {
      name: /Liên kết ghi chú Obsidian/i,
    });
    expect(ctaBtn).toBeInTheDocument();

    // Clicking CTA opens ObsidianTopicResourceLinkModal
    fireEvent.click(ctaBtn);
    expect(
      screen.getByLabelText(/Đường dẫn tương đối trong Vault/i)
    ).toBeInTheDocument();
  });
});
