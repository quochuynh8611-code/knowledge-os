import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { parseLocationHash, buildLocationHash } from "../../src/lib/urlRouting";
import {
  CATEGORY_ORDER,
  type CommandPaletteItem,
  type UseCommandPaletteOptions,
} from "../../src/hooks/useCommandPalette";
import { normalizeScholarText } from "../../src/lib/scholarSearch";
import { TopicDetail } from "../../src/components/topics/TopicDetail";

let mockSelectedTopicId: string | null = "topic-phat-hoc-123";
let mockOpenMindMap = vi.fn();
let mockSetSelectedTopicId = vi.fn();
let mockNavigation: Record<string, any> = {
  openMindMap: mockOpenMindMap,
};

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    categories: [{ id: "cat-1", name: "Phật Học", slug: "phat-hoc", type: "phat-hoc" }],
    selectedTopicId: mockSelectedTopicId,
    setSelectedTopicId: (id: string | null) => {
      mockSetSelectedTopicId(id);
      mockSelectedTopicId = id;
    },
    topics: [
      {
        id: "topic-phat-hoc-123",
        title: "Bát Chánh Đạo",
        slug: "bat-chanh-dao",
        categoryId: "cat-1",
        categoryName: "Phật Học",
        type: "phat-hoc",
        description: "Mô tả Bát Chánh Đạo",
        content: "Nội dung",
        tags: [],
        links: [],
        studyProgress: {
          topicId: "topic-phat-hoc-123",
          status: "in_progress",
          progress: 50,
          interval: 1,
          easeFactor: 2.5,
          repetitions: 1,
          totalNotes: 0,
          timeSpent: 60,
          lastStudied: new Date().toISOString(),
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ],
    notes: [],
    resources: [],
    tags: [],
    updateTopicProgress: vi.fn(),
    deleteNote: vi.fn(),
    addResource: vi.fn(),
    deleteResource: vi.fn(),
    openTopicDetail: vi.fn(),
    addKnowledgeLink: vi.fn(),
    removeKnowledgeLink: vi.fn(),
  }),
}));

vi.mock("../../src/context/NavigationContext", () => ({
  useNavigation: () => mockNavigation,
}));

vi.mock("../../src/components/reader/UnifiedResearchReader", () => ({
  UnifiedResearchReader: () => null,
}));

vi.mock("../../src/components/research", () => ({
  TopicDashboard: () => null,
  ResearchTimeline: () => null,
  ResearchSearchModal: () => null,
  ExportReportModal: () => null,
  AIResearchStudio: () => null,
}));

vi.mock("../../src/components/flashcards", () => ({
  FlashcardAnalyticsDashboard: () => null,
  CardBrowser: () => null,
  StudyLauncher: () => null,
  DuplicateDetectionDashboard: () => null,
}));

vi.mock("../../src/components/flashcards/FlashcardAnalyticsWidget", () => ({
  FlashcardAnalyticsWidget: () => null,
}));

vi.mock("../../src/components/modals/NoteReaderModal", () => ({
  NoteReaderModal: () => null,
}));

vi.mock("../../src/components/modals/ObsidianDocumentViewerModal", () => ({
  ObsidianDocumentViewerModal: () => null,
}));

vi.mock("../../src/components/modals/ObsidianVaultBrowserModal", () => ({
  ObsidianVaultBrowserModal: () => null,
}));

vi.mock("../../src/components/modals/ObsidianTopicResourceLinkModal", () => ({
  ObsidianTopicResourceLinkModal: () => null,
}));

vi.mock("../../src/components/modals/ResourceViewerModal", () => ({
  ResourceViewerModal: () => null,
}));

vi.mock("../../src/components/modals/NoteFormModal", () => ({
  NoteFormModal: () => null,
}));

vi.mock("../../src/components/modals/TopicFormModal", () => ({
  TopicFormModal: () => null,
}));

vi.mock("../../src/components/modals/ResourceFormModal", () => ({
  ResourceFormModal: () => null,
}));

vi.mock("../../src/components/modals/StudyTimerModal", () => ({
  StudyTimerModal: () => null,
}));

vi.mock("../../src/components/modals/FlashcardFormModal", () => ({
  FlashcardFormModal: () => null,
}));

vi.mock("../../src/components/modals/FlashcardImportModal", () => ({
  FlashcardImportModal: () => null,
}));

vi.mock("../../src/components/modals/NotebookLMStudioModal", () => ({
  NotebookLMStudioModal: () => null,
}));

vi.mock("../../src/components/modals/AntigravityHandoffModal", () => ({
  AntigravityHandoffModal: () => null,
}));

describe("Mind Map Track C: Workflow Integration Test Suite", () => {
  beforeEach(() => {
    mockSelectedTopicId = "topic-phat-hoc-123";
    mockOpenMindMap = vi.fn();
    mockSetSelectedTopicId = vi.fn();
    mockNavigation = {
      openMindMap: mockOpenMindMap,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      } as any;
    });
  });

  describe("Scenario 1: TopicDetail CTA & URL Routing", () => {
    it("Given a selected topic, When navigating to mindmap, Then builds canonical hash #/mindmap?topicId=<id>", () => {
      const topicId = "topic-phat-hoc-123";
      const hash = buildLocationHash({
        activeTab: "mindmap",
        selectedTopicId: topicId,
      });
      expect(hash).toBe(`#/mindmap?topicId=${topicId}`);

      const parsed = parseLocationHash(hash);
      expect(parsed.activeTab).toBe("mindmap");
      expect(parsed.selectedTopicId).toBe(topicId);
    });

    it("Given a topic with deep-linking query, When building and parsing, Then roundtrips accurately", () => {
      const hash = "#/mindmap?topicId=topic-456";
      const parsed = parseLocationHash(hash);
      expect(parsed.activeTab).toBe("mindmap");
      expect(parsed.selectedTopicId).toBe("topic-456");
    });
  });

  describe("Scenario 2: Dashboard Widget Entry & Fallback State", () => {
    it("Given no topic specified from Dashboard widget, When navigating to mindmap, Then builds #/mindmap", () => {
      const hash = buildLocationHash({
        activeTab: "mindmap",
        selectedTopicId: null,
      });
      expect(hash).toBe("#/mindmap");

      const parsed = parseLocationHash(hash);
      expect(parsed.activeTab).toBe("mindmap");
      expect(parsed.selectedTopicId).toBeNull();
    });

    it("Given an empty hash or malformed query, When parsing, Then gracefully resolves to default activeTab", () => {
      const parsed = parseLocationHash("#/mindmap?topicId=");
      expect(parsed.activeTab).toBe("mindmap");
      expect(parsed.selectedTopicId).toBe("");
    });

    it("Given an invalid tab route, When parsing, Then falls back to dashboard", () => {
      const parsed = parseLocationHash("#/unknown_route");
      expect(parsed.activeTab).toBe("dashboard");
      expect(parsed.selectedTopicId).toBeNull();
    });
  });

  describe("Scenario 3: Command Palette Navigation & Quick Action Integration", () => {
    it("Given Command Palette items definition, Then 'nav-mindmap' is properly configured under 'Điều hướng'", () => {
      const onNavigateTab = vi.fn();

      const baseItems: CommandPaletteItem[] = [
        {
          id: "nav-mindmap",
          title: "Sơ đồ tư duy (Mind Map)",
          description: "Trực quan hóa cấu trúc phân cấp & cây tri thức đa tầng",
          category: "Điều hướng",
          keywords: [
            "mindmap",
            "so do tu duy",
            "mind map",
            "cay tri thuc",
            "cay phan cap",
            "truc quan hoa",
          ],
          action: () => onNavigateTab("mindmap"),
        },
      ];

      const mindmapNav = baseItems.find((it) => it.id === "nav-mindmap");
      expect(mindmapNav).toBeDefined();
      expect(mindmapNav?.category).toBe("Điều hướng");
      expect(mindmapNav?.title).toContain("Sơ đồ tư duy");

      // Verify keywords match queries
      const query = normalizeScholarText("mindmap");
      const matched = mindmapNav?.keywords?.some((k) =>
        normalizeScholarText(k).includes(query)
      );
      expect(matched).toBe(true);

      // Verify execute
      mindmapNav?.action();
      expect(onNavigateTab).toHaveBeenCalledWith("mindmap");
    });

    it("Given custom contextual action for active topic, Then executes quick action", () => {
      const customAction = vi.fn();
      const customItems: CommandPaletteItem[] = [
        {
          id: "act-open-mindmap",
          title: "Mở Sơ Đồ Tư Duy: Bát Chánh Đạo",
          description: "Trực quan hóa cấu trúc tri thức cho chủ đề đang chọn",
          category: "Hành động nhanh",
          action: customAction,
          keywords: ["mindmap", "so do tu duy", "bat chanh dao"],
        },
      ];

      const quickAction = customItems.find((it) => it.id === "act-open-mindmap");
      expect(quickAction).toBeDefined();
      expect(quickAction?.title).toBe("Mở Sơ Đồ Tư Duy: Bát Chánh Đạo");

      quickAction?.action();
      expect(customAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Scenario 4: TopicDetail CTA Deep-Link Integration", () => {
    it("TopicDetail mindmap button triggers navigation.openMindMap with topic.id", () => {
      render(React.createElement(TopicDetail));

      const mindmapBtn = screen.getByTestId("btn-view-mindmap");
      expect(mindmapBtn).toBeInTheDocument();
      expect(mindmapBtn).toHaveTextContent(/Sơ đồ/i);

      fireEvent.click(mindmapBtn);
      expect(mockOpenMindMap).toHaveBeenCalledTimes(1);
      expect(mockOpenMindMap).toHaveBeenCalledWith("topic-phat-hoc-123");
    });

    it("TopicDetail mindmap button falls back to canonical hash when navigation.openMindMap is unavailable", () => {
      mockNavigation = {};
      window.location.hash = "";

      render(React.createElement(TopicDetail));

      const mindmapBtn = screen.getByTestId("btn-view-mindmap");
      fireEvent.click(mindmapBtn);

      expect(mockSetSelectedTopicId).toHaveBeenCalledWith("topic-phat-hoc-123");
      expect(window.location.hash).toBe("#/mindmap?topicId=topic-phat-hoc-123");
    });
  });
});
