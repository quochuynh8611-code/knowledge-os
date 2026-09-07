/**
 * Unit Tests: Study Launcher Routing & Deep-Linking (Phase F6.6)
 *
 * Validates:
 * - parseLocationHash with #/flashcards/launch
 * - parseLocationHash with #/topics/:topicId/launch
 * - parseLocationHash with query param ?sessionType=...
 * - buildLocationHash with subView === "launch"
 * - buildLocationHash with sessionType
 */

import { describe, it, expect } from "vitest";
import {
  parseLocationHash,
  buildLocationHash,
  type NavigationRouteState,
} from "../../src/lib/urlRouting";

describe("Study Launcher URL Routing & Deep-Linking (Phase F6.6)", () => {
  describe("parseLocationHash", () => {
    it("parses '#/flashcards/launch' as global study launcher view", () => {
      const state = parseLocationHash("#/flashcards/launch");
      expect(state.activeTab).toBe("flashcards");
      expect(state.subView).toBe("launch");
      expect(state.selectedTopicId).toBeNull();
    });

    it("parses '#/topics/dong-y-1/launch' as topic-scoped study launcher view", () => {
      const state = parseLocationHash("#/topics/dong-y-1/launch");
      expect(state.activeTab).toBe("topics");
      expect(state.subView).toBe("launch");
      expect(state.selectedTopicId).toBe("dong-y-1");
    });

    it("parses sessionType query param '?sessionType=cram'", () => {
      const state = parseLocationHash("#/flashcards?sessionType=cram");
      expect(state.activeTab).toBe("flashcards");
      expect(state.sessionType).toBe("cram");
    });

    it("parses sessionType query param '?sessionType=weak' on topic route", () => {
      const state = parseLocationHash("#/flashcards/topic-pali?sessionType=weak");
      expect(state.activeTab).toBe("flashcards");
      expect(state.selectedTopicId).toBe("topic-pali");
      expect(state.sessionType).toBe("weak");
    });
  });

  describe("buildLocationHash", () => {
    it("builds '#/flashcards/launch' when subView is 'launch'", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: null,
        subView: "launch",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };

      const hash = buildLocationHash(state);
      expect(hash).toBe("#/flashcards/launch");
    });

    it("builds '#/topics/:topicId/launch' when subView is 'launch' on topic", () => {
      const state: NavigationRouteState = {
        activeTab: "topics",
        selectedTopicId: "topic-abhidharma",
        subView: "launch",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };

      const hash = buildLocationHash(state);
      expect(hash).toBe("#/topics/topic-abhidharma/launch");
    });

    it("appends ?sessionType query parameter when sessionType is present", () => {
      const state: NavigationRouteState = {
        activeTab: "flashcards",
        selectedTopicId: "topic-1",
        subView: "review",
        sessionType: "new",
        searchQuery: "",
        selectedCategoryFilter: null,
        selectedTagFilter: null,
      };

      const hash = buildLocationHash(state);
      expect(hash).toContain("sessionType=new");
      expect(hash).toContain("#/flashcards/topic-1");
    });
  });
});
