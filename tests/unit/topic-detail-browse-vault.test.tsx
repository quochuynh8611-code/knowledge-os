import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TopicDetail } from "../../src/components/topics/TopicDetail";
import type { Topic, Category, Note, Resource, Tag } from "../../src/types";

const mockCategories: Category[] = [
  {
    id: "cat-1",
    name: "Triết Học Phật Giáo",
    slug: "triet-hoc-phat-giao",
    type: "phat-hoc",
  },
];

let mockTopics: Topic[] = [
  {
    id: "topic-1",
    title: "Tứ Diệu Đế",
    slug: "tu-dieu-de",
    categoryId: "cat-1",
    categoryName: "Triết Học Phật Giáo",
    type: "phat-hoc",
    description: "Khảo sát Tứ Diệu Đế",
    content: "Khổ, Tập, Diệt, Đạo",
    tags: ["Buddhism"],
    links: [],
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

let mockResources: Resource[] = [];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    categories: mockCategories,
    selectedTopicId: "topic-1",
    setSelectedTopicId: vi.fn(),
    topics: mockTopics,
    notes: [] as Note[],
    resources: mockResources,
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

describe("Phase P4.2A: TopicDetail Browse Vault Wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Browse Vault' button in Resources tab and opens ObsidianVaultBrowserModal on click", async () => {
    render(<TopicDetail />);

    // Switch to Resources tab
    const resourcesTab = screen.getByRole("button", { name: /Tài liệu/i });
    fireEvent.click(resourcesTab);

    // Browse Vault button should be present
    const browseVaultBtn = screen.getByRole("button", { name: /Browse Vault/i });
    expect(browseVaultBtn).toBeInTheDocument();

    // Mock API fetch for browsing vault
    vi.spyOn(global, "fetch").mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/obsidian/vaults")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ activeVaultId: "default", vaults: [] }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          path: "",
          items: [
            { name: "Bat-Chanh-Dao.md", type: "file", path: "Bat-Chanh-Dao.md", size: 500, mtime: "2026-09-04T12:00:00Z", extension: ".md" },
          ],
        }),
      } as Response;
    });

    // Click Browse Vault button
    fireEvent.click(browseVaultBtn);

    // Modal title should appear
    expect(screen.getByText(/Duyệt Obsidian Vault/i)).toBeInTheDocument();

    // The file should be loaded in the tree
    await waitFor(() => {
      expect(screen.getByText("Bat-Chanh-Dao.md")).toBeInTheDocument();
    });
  });

  it("opens ObsidianDocumentViewerModal when selecting a markdown file from the browser modal", async () => {
    render(<TopicDetail />);

    // Switch to Resources tab
    const resourcesTab = screen.getByRole("button", { name: /Tài liệu/i });
    fireEvent.click(resourcesTab);

    // Mock fetch for vault tree and file
    vi.spyOn(global, "fetch").mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes("/api/obsidian/vaults")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ activeVaultId: "default", vaults: [] }),
        } as Response;
      }
      if (url.includes("/api/obsidian/vault/file")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            relativePath: "Tu-Niem-Xu.md",
            fileName: "Tu-Niem-Xu.md",
            frontmatter: { title: "Tứ Niệm Xứ Toàn Thư" },
            outline: [],
            content: "# Tứ Niệm Xứ\nNội dung quán thân trên thân...",
            sizeBytes: 800,
            lastModified: "2026-09-04T12:00:00Z",
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          path: "",
          items: [
            { name: "Tu-Niem-Xu.md", type: "file", path: "Tu-Niem-Xu.md", size: 800, mtime: "2026-09-04T12:00:00Z", extension: ".md" },
          ],
        }),
      } as Response;
    });

    const browseVaultBtn = screen.getByRole("button", { name: /Browse Vault/i });
    fireEvent.click(browseVaultBtn);

    await waitFor(() => {
      expect(screen.getByText("Tu-Niem-Xu.md")).toBeInTheDocument();
    });

    // Click on the markdown file
    fireEvent.click(screen.getByText("Tu-Niem-Xu.md"));

    // Document viewer modal should now be open
    await waitFor(() => {
      expect(screen.getByText(/Tứ Niệm Xứ Toàn Thư/i)).toBeInTheDocument();
    });
  });
});
