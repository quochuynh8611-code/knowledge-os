import { describe, it, expect } from "vitest";
import { parseLocationHash, buildLocationHash } from "../../src/lib/urlRouting";

describe("Phase F6.8: Flashcard Analytics URL Routing", () => {
  it("parses global flashcard analytics route: #/flashcards/analytics", () => {
    const route = parseLocationHash("#/flashcards/analytics");
    expect(route.activeTab).toBe("flashcards");
    expect(route.subView).toBe("analytics");
    expect(route.selectedTopicId).toBeNull();
  });

  it("parses topic-scoped flashcard analytics route: #/topics/topic-abhidharma/analytics", () => {
    const route = parseLocationHash("#/topics/topic-abhidharma/analytics");
    expect(route.activeTab).toBe("topics");
    expect(route.subView).toBe("analytics");
    expect(route.selectedTopicId).toBe("topic-abhidharma");
  });

  it("builds hash for global flashcard analytics", () => {
    const hash = buildLocationHash({
      activeTab: "flashcards",
      subView: "analytics",
    });
    expect(hash).toBe("#/flashcards/analytics");
  });

  it("builds hash for topic-scoped flashcard analytics", () => {
    const hash = buildLocationHash({
      activeTab: "topics",
      selectedTopicId: "topic-abhidharma",
      subView: "analytics",
    });
    expect(hash).toBe("#/topics/topic-abhidharma/analytics");
  });
});
