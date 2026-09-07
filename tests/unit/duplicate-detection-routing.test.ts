import { describe, it, expect } from "vitest";
import { parseLocationHash, buildLocationHash } from "../../src/lib/urlRouting";

describe("Phase F6.9: Duplicate Detection URL Routing", () => {
  it("parses global duplicate detection route: #/flashcards/duplicates", () => {
    const route = parseLocationHash("#/flashcards/duplicates");
    expect(route.activeTab).toBe("flashcards");
    expect(route.subView).toBe("duplicates");
    expect(route.selectedTopicId).toBeNull();
  });

  it("parses topic-scoped duplicate detection route: #/topics/topic-abhidharma/duplicates", () => {
    const route = parseLocationHash("#/topics/topic-abhidharma/duplicates");
    expect(route.activeTab).toBe("topics");
    expect(route.subView).toBe("duplicates");
    expect(route.selectedTopicId).toBe("topic-abhidharma");
  });

  it("builds hash for global duplicate detection view", () => {
    const hash = buildLocationHash({
      activeTab: "flashcards",
      subView: "duplicates",
    });
    expect(hash).toBe("#/flashcards/duplicates");
  });

  it("builds hash for topic-scoped duplicate detection view", () => {
    const hash = buildLocationHash({
      activeTab: "topics",
      selectedTopicId: "topic-abhidharma",
      subView: "duplicates",
    });
    expect(hash).toBe("#/topics/topic-abhidharma/duplicates");
  });
});
