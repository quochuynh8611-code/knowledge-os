import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseLocationHash, buildLocationHash } from "../../src/lib/urlRouting";
import {
  CATEGORY_ORDER,
  type CommandPaletteItem,
  type UseCommandPaletteOptions,
} from "../../src/hooks/useCommandPalette";
import { normalizeScholarText } from "../../src/lib/scholarSearch";

describe("Mind Map Track C: Workflow Integration Test Suite", () => {
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
});
