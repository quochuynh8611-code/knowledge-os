import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  type NavigationRouteState,
} from "../../src/lib/urlRouting";

describe("Phase F6.5 — URL Routing for Card Browser (#/flashcards/browse & #/topics/:topicId/browse)", () => {
  describe("parseLocationHash for Card Browser", () => {
    it("1. parses global card browser URL #/flashcards/browse", () => {
      const state = parseLocationHash("#/flashcards/browse");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBeNull();
      expect(state.subView).toBe("browse");
    });

    it("2. parses topic-scoped card browser URL #/topics/:topicId/browse", () => {
      const state = parseLocationHash("#/topics/topic-dong-y-1/browse");
      expect(state.activeTab).toBe("topics");
      expect(state.selectedTopicId).toBe("topic-dong-y-1");
      expect(state.subView).toBe("browse");
    });

    it("3. parses encoded topicId in #/topics/:topicId/browse correctly", () => {
      const state = parseLocationHash("#/topics/%C4%91%C3%B4ng-y/browse");
      expect(state.activeTab).toBe("topics");
      expect(state.selectedTopicId).toBe("đông-y");
      expect(state.subView).toBe("browse");
    });

    it("4. preserves standard review routes without subView=browse", () => {
      const globalReview = parseLocationHash("#/flashcards");
      expect(globalReview.activeTab).toBe("flashcards");
      expect(globalReview.subView).toBeUndefined();

      const topicReview = parseLocationHash("#/flashcards/topic-123");
      expect(topicReview.activeTab).toBe("flashcards");
      expect(topicReview.selectedTopicId).toBe("topic-123");
      expect(topicReview.subView).toBeUndefined();

      const topicDetail = parseLocationHash("#/topics/topic-123");
      expect(topicDetail.activeTab).toBe("topics");
      expect(topicDetail.selectedTopicId).toBe("topic-123");
      expect(topicDetail.subView).toBeUndefined();
    });
  });

  describe("buildLocationHash for Card Browser", () => {
    it("5. builds global card browser hash #/flashcards/browse when subView is 'browse'", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: null,
        subView: "browse",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/flashcards/browse");
    });

    it("6. builds topic-scoped card browser hash #/topics/:topicId/browse when subView is 'browse'", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "topic-dong-y-1",
        subView: "browse",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe("#/topics/topic-dong-y-1/browse");
    });

    it("7. encodes special characters in topic-scoped browser hash", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "kinh lạc & huyệt vị",
        subView: "browse",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };
      expect(buildLocationHash(state)).toBe(
        "#/topics/kinh%20l%E1%BA%A1c%20%26%20huy%E1%BB%87t%20v%E1%BB%8B/browse"
      );
    });
  });
});
