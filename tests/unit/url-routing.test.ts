import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  VALID_TABS,
  type NavigationRouteState,
} from "../../src/lib/urlRouting";

describe("Phase P2.1 — URL Routing Pure Functions Contract", () => {
  // ─── 1. Valid Tab Hash Parsing ───────────────────────────────────────────

  describe("1. Valid Tab Hash Parsing", () => {
    it("1.1. parses root / empty / #/ hash as dashboard", () => {
      expect(parseLocationHash("")).toEqual({
        activeTab: "dashboard",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      });

      expect(parseLocationHash("#")).toEqual({
        activeTab: "dashboard",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      });

      expect(parseLocationHash("#/")).toEqual({
        activeTab: "dashboard",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      });
    });

    it("1.2. parses all 11 valid top-level tabs correctly", () => {
      for (const tab of VALID_TABS) {
        const hash = tab === "dashboard" ? "#/" : `#/${tab}`;
        const result = parseLocationHash(hash);
        expect(result.activeTab).toBe(tab);
        expect(result.selectedTopicId).toBeNull();
      }
    });
  });

  // ─── 2. Topic Deep-Link Parsing ──────────────────────────────────────────

  describe("2. Topic Deep-Link Parsing", () => {
    it("2.1. parses #/topics/:topicId into activeTab='topics' and selectedTopicId", () => {
      const result = parseLocationHash("#/topics/topic-abhidharma-tong-quan");
      expect(result.activeTab).toBe("topics");
      expect(result.selectedTopicId).toBe("topic-abhidharma-tong-quan");
    });

    it("2.2. decodes URL-encoded characters in topic ID", () => {
      const result = parseLocationHash("#/topics/topic%20special%26id");
      expect(result.activeTab).toBe("topics");
      expect(result.selectedTopicId).toBe("topic special&id");
    });
  });

  // ─── 3. Query Parameter Parsing ──────────────────────────────────────────

  describe("3. Query Parameter Parsing", () => {
    it("3.1. parses search query from #/search?q=tam+so", () => {
      const result = parseLocationHash("#/search?q=tam+so");
      expect(result.activeTab).toBe("search");
      expect(result.searchQuery).toBe("tam so");
    });

    it("3.2. parses category and tag filters from #/topics?cat=cat-tam-tang&tag=kinh-tang", () => {
      const result = parseLocationHash("#/topics?cat=cat-tam-tang&tag=kinh-tang");
      expect(result.activeTab).toBe("topics");
      expect(result.selectedCategoryFilter).toBe("cat-tam-tang");
      expect(result.selectedTagFilter).toBe("kinh-tang");
    });
  });

  // ─── 4. Invalid Hash Fallback ────────────────────────────────────────────

  describe("4. Invalid Hash Fallback", () => {
    it("4.1. falls back to dashboard when encountering unrecognized tab", () => {
      const result = parseLocationHash("#/unknown-nonexistent-tab");
      expect(result.activeTab).toBe("dashboard");
      expect(result.selectedTopicId).toBeNull();
    });

    it("4.2. handles malformed query string safely", () => {
      const result = parseLocationHash("#/topics?%E0%A4%A");
      expect(result.activeTab).toBe("topics");
    });
  });

  // ─── 5. buildLocationHash ────────────────────────────────────────────────

  describe("5. buildLocationHash", () => {
    it("5.1. builds #/ for dashboard", () => {
      const state: NavigationRouteState = {
        activeTab: "dashboard",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/");
    });

    it("5.2. builds #/topics/:topicId when selectedTopicId is present", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "topic-abhidharma-tong-quan",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/topics/topic-abhidharma-tong-quan");
    });

    it("5.3. builds query string for search tab with searchQuery", () => {
      const state: NavigationRouteState = {
        activeTab: "search",
        selectedTopicId: null,
        searchQuery: "duyên khởi",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      const hash = buildLocationHash(state);
      expect(hash).toContain("#/search?q=");
      expect(parseLocationHash(hash).searchQuery).toBe("duyên khởi");
    });

    it("5.4. builds query string for category and tag filters", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: "cat-1",
        selectedTagFilter: "tag-1",
      };
      const hash = buildLocationHash(state);
      expect(hash).toContain("cat=cat-1");
      expect(hash).toContain("tag=tag-1");
    });
  });

  // ─── 6. Round-Trip Preservation ──────────────────────────────────────────

  describe("6. Round-Trip Preservation", () => {
    it("6.1. preserves semantic meaning across parse -> build -> parse", () => {
      const original: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "topic-cetana-1",
        searchQuery: "khảo sát",
        selectedCategoryFilter: "cat-abhidharma",
        selectedTagFilter: "vi-dieu-phap",
      };

      const hash = buildLocationHash(original);
      const roundTripped = parseLocationHash(hash);

      expect(roundTripped.activeTab).toBe(original.activeTab);
      expect(roundTripped.selectedTopicId).toBe(original.selectedTopicId);
      expect(roundTripped.selectedCategoryFilter).toBe(original.selectedCategoryFilter);
      expect(roundTripped.selectedTagFilter).toBe(original.selectedTagFilter);
    });
  });
});
