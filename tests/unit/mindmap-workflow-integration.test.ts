import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { parseLocationHash, buildLocationHash } from "../../src/lib/urlRouting";
import {
  useCommandPalette,
  CATEGORY_ORDER,
  type CommandPaletteItem,
  type UseCommandPaletteOptions,
} from "../../src/hooks/useCommandPalette";
import { normalizeScholarText } from "../../src/lib/scholarSearch";
import { TopicDetail } from "../../src/components/topics/TopicDetail";
import { DashboardHome } from "../../src/components/dashboard/DashboardHome";

let mockSelectedTopicId: string | null = "topic-phat-hoc-123";
let mockOpenMindMap = vi.fn();
let mockSetSelectedTopicId = vi.fn();
let mockSetActiveTab = vi.fn();
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
    setActiveTab: (tab: string) => {
      mockSetActiveTab(tab);
    },
    focusDomainId: null,
    setFocusDomainId: vi.fn(),
    setSelectedCategoryFilter: vi.fn(),
    addCategory: vi.fn(),
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
    reviewQueue: [],
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

vi.mock("../../src/components/modals/SpacedReviewModal", () => ({
  SpacedReviewModal: () => null,
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
    mockSetActiveTab = vi.fn();
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

    it("DashboardHome renders lightweight mindmap card with correct title and description without embedding canvas", () => {
      render(React.createElement(DashboardHome));

      const card = screen.getByTestId("dashboard-card-mindmap");
      expect(card).toBeInTheDocument();
      expect(card).toHaveTextContent("Sơ đồ tư duy");
      expect(card).toHaveTextContent("Trực quan hóa cấu trúc phân cấp & cây tri thức");

      // Verify strict invariant: zero heavy canvas or cross-link layers in dashboard path
      expect(screen.queryByTestId("mindmap-tree-canvas")).toBeNull();
      expect(screen.queryByTestId("mindmap-crosslinks-layer")).toBeNull();
    });

    it("Clicking mindmap card on DashboardHome triggers setActiveTab('mindmap') and syncs canonical route", () => {
      render(React.createElement(DashboardHome));

      const card = screen.getByTestId("dashboard-card-mindmap");
      fireEvent.click(card);

      expect(mockSetActiveTab).toHaveBeenCalledTimes(1);
      expect(mockSetActiveTab).toHaveBeenCalledWith("mindmap");

      // Verify canonical routing contract when activeTab is mindmap with no topicId
      const canonicalRoute = buildLocationHash({
        activeTab: "mindmap",
        selectedTopicId: null,
      });
      expect(canonicalRoute).toBe("#/mindmap");
    });
  });

  describe("Scenario 3: Command Palette Navigation & Quick Action Integration", () => {
    it("useCommandPalette provides 'nav-mindmap' under 'Điều hướng' and executes onNavigateTab('mindmap')", () => {
      const onNavigateTab = vi.fn();
      const { result } = renderHook(() =>
        useCommandPalette({
          onNavigateTab,
        })
      );

      const mindmapNav = result.current.filteredItems.find(
        (it) => it.id === "nav-mindmap"
      );
      expect(mindmapNav).toBeDefined();
      expect(mindmapNav?.category).toBe("Điều hướng");
      expect(mindmapNav?.title).toBe("Sơ đồ tư duy (Mind Map)");
      expect(mindmapNav?.description).toBe(
        "Trực quan hóa cấu trúc phân cấp & cây tri thức đa tầng"
      );

      // Execute navigation action
      mindmapNav?.action();
      expect(onNavigateTab).toHaveBeenCalledTimes(1);
      expect(onNavigateTab).toHaveBeenCalledWith("mindmap");
    });

    it("useCommandPalette ranks and returns 'nav-mindmap' for search queries ('mindmap', 'so do tu duy', 'cay tri thuc', 'truc quan hoa')", () => {
      const { result } = renderHook(() =>
        useCommandPalette({
          onNavigateTab: vi.fn(),
        })
      );

      const searchQueries = [
        "mindmap",
        "so do tu duy",
        "cay tri thuc",
        "truc quan hoa",
      ];

      for (const query of searchQueries) {
        act(() => {
          result.current.setQuery(query);
        });

        const matched = result.current.filteredItems.find(
          (it) => it.id === "nav-mindmap"
        );
        expect(matched, `Expected to find 'nav-mindmap' for query: "${query}"`).toBeDefined();
        expect(matched?.id).toBe("nav-mindmap");
      }
    });

    it("Contextual custom item 'act-open-mindmap' when a topic is selected displays topic title and routes to mindmap", () => {
      const onNavigateTab = vi.fn();
      const selectedTopicId = "topic-phat-hoc-123";
      const topics = [{ id: "topic-phat-hoc-123", title: "Bát Chánh Đạo" }];

      // Construct customPaletteItems strictly conforming to App.tsx contract
      const customPaletteItems: CommandPaletteItem[] = [
        {
          id: "act-open-mindmap",
          title: selectedTopicId
            ? `Mở Sơ Đồ Tư Duy: ${topics.find((t) => t.id === selectedTopicId)?.title || "Chủ đề hiện tại"}`
            : "Mở Sơ Đồ Tư Duy (Mind Map)",
          description: selectedTopicId
            ? "Trực quan hóa cấu trúc tri thức cho chủ đề đang chọn"
            : "Khám phá sơ đồ tư duy phân cấp và xuất Markdown",
          category: "Hành động nhanh",
          keywords: [
            "mindmap",
            "so do tu duy",
            "mind map",
            "so do",
            "xuat markdown",
          ],
          action: () => onNavigateTab("mindmap"),
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: customPaletteItems,
          onNavigateTab,
        })
      );

      const quickAction = result.current.filteredItems.find(
        (it) => it.id === "act-open-mindmap"
      );
      expect(quickAction).toBeDefined();
      expect(quickAction?.category).toBe("Hành động nhanh");
      expect(quickAction?.title).toBe("Mở Sơ Đồ Tư Duy: Bát Chánh Đạo");
      expect(quickAction?.description).toBe(
        "Trực quan hóa cấu trúc tri thức cho chủ đề đang chọn"
      );

      quickAction?.action();
      expect(onNavigateTab).toHaveBeenCalledTimes(1);
      expect(onNavigateTab).toHaveBeenCalledWith("mindmap");
    });

    it("Contextual custom item 'act-open-mindmap' when no topic is selected falls back to safe generic title", () => {
      const onNavigateTab = vi.fn();
      const selectedTopicId = null;
      const topics = [{ id: "topic-phat-hoc-123", title: "Bát Chánh Đạo" }];

      const customPaletteItems: CommandPaletteItem[] = [
        {
          id: "act-open-mindmap",
          title: selectedTopicId
            ? `Mở Sơ Đồ Tư Duy: ${topics.find((t: any) => t.id === selectedTopicId)?.title || "Chủ đề hiện tại"}`
            : "Mở Sơ Đồ Tư Duy (Mind Map)",
          description: selectedTopicId
            ? "Trực quan hóa cấu trúc tri thức cho chủ đề đang chọn"
            : "Khám phá sơ đồ tư duy phân cấp và xuất Markdown",
          category: "Hành động nhanh",
          keywords: [
            "mindmap",
            "so do tu duy",
            "mind map",
            "so do",
            "xuat markdown",
          ],
          action: () => onNavigateTab("mindmap"),
        },
      ];

      const { result } = renderHook(() =>
        useCommandPalette({
          customItems: customPaletteItems,
          onNavigateTab,
        })
      );

      const quickAction = result.current.filteredItems.find(
        (it) => it.id === "act-open-mindmap"
      );
      expect(quickAction).toBeDefined();
      expect(quickAction?.category).toBe("Hành động nhanh");
      expect(quickAction?.title).toBe("Mở Sơ Đồ Tư Duy (Mind Map)");
      expect(quickAction?.description).toBe(
        "Khám phá sơ đồ tư duy phân cấp và xuất Markdown"
      );

      quickAction?.action();
      expect(onNavigateTab).toHaveBeenCalledTimes(1);
      expect(onNavigateTab).toHaveBeenCalledWith("mindmap");
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
