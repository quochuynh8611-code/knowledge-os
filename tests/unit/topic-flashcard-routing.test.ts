import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  type NavigationRouteState,
} from "../../src/lib/urlRouting";

describe("Phase F6.4 — Deep-link URL Routing for Topic-Scoped Flashcards", () => {
  describe("parseLocationHash", () => {
    it("1. parses global flashcards URL #/flashcards without topicId", () => {
      const state = parseLocationHash("#/flashcards");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBeNull();
    });

    it("2. parses topic-scoped flashcards URL #/flashcards/:topicId", () => {
      const state = parseLocationHash("#/flashcards/topic-dong-y-123");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBe("topic-dong-y-123");
    });

    it("3. parses topic-scoped flashcards URL with query string #/flashcards?topicId=topic-phat-hoc", () => {
      const state = parseLocationHash("#/flashcards?topicId=topic-phat-hoc");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBe("topic-phat-hoc");
    });

    it("4. parses encoded topicId in #/flashcards/:topicId correctly", () => {
      const state = parseLocationHash("#/flashcards/ch%C3%A1nh-ni%E1%BB%87m");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBe("chánh-niệm");
    });

    it("5. continues to parse #/topics/:topicId without breaking existing routing", () => {
      const state = parseLocationHash("#/topics/topic-dong-y-123");
      expect(state.activeTab).toBe("topics");
      expect(state.selectedTopicId).toBe("topic-dong-y-123");
    });
  });

  describe("buildLocationHash", () => {
    it("6. builds global flashcards hash #/flashcards when selectedTopicId is null", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: null,
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/flashcards");
    });

    it("7. builds topic-scoped flashcards hash #/flashcards/:topicId when selectedTopicId is present", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: "topic-dong-y-123",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/flashcards/topic-dong-y-123");
    });

    it("8. encodes special characters when building topic-scoped flashcard hash", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: "chánh niệm",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/flashcards/ch%C3%A1nh%20ni%E1%BB%87m");
    });

    it("9. continues to build #/topics/:topicId without breaking existing routing", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "topic-dong-y-123",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/topics/topic-dong-y-123");
    });
  });
});
