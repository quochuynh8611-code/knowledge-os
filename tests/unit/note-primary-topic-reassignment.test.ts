import { describe, it, expect } from "vitest";
import { computeNextPrimaryTopic } from "../../src/server/services/noteCascadeService";

describe("Phase 3 Unit: Note Primary Topic Reassignment Algorithm (ADR-079 / PR-3)", () => {
  it("1.1. Selects the first remaining secondary topic when current primary topic is deleted", () => {
    const currentPrimary = "topic-alpha";
    const deletedTopic = "topic-alpha";
    const secondaryTopics = ["topic-beta", "topic-gamma"];

    const nextPrimary = computeNextPrimaryTopic(currentPrimary, deletedTopic, secondaryTopics);

    expect(nextPrimary).toBe("topic-beta");
  });

  it("1.2. Falls back to null when no secondary topics remain after primary topic deletion", () => {
    const currentPrimary = "topic-alpha";
    const deletedTopic = "topic-alpha";
    const secondaryTopics: string[] = [];

    const nextPrimary = computeNextPrimaryTopic(currentPrimary, deletedTopic, secondaryTopics);

    expect(nextPrimary).toBeNull();
  });

  it("1.3. Does not mutate primary topic when an unrelated secondary or foreign topic is deleted", () => {
    const currentPrimary = "topic-alpha";
    const deletedTopic = "topic-beta";
    const secondaryTopics = ["topic-beta", "topic-gamma"];

    const nextPrimary = computeNextPrimaryTopic(currentPrimary, deletedTopic, secondaryTopics);

    expect(nextPrimary).toBe("topic-alpha");
  });

  it("1.4. Preserves null primary topic when an unrelated topic is deleted", () => {
    const currentPrimary = null;
    const deletedTopic = "topic-beta";
    const secondaryTopics: string[] = [];

    const nextPrimary = computeNextPrimaryTopic(currentPrimary, deletedTopic, secondaryTopics);

    expect(nextPrimary).toBeNull();
  });

  it("1.5. Excludes the deleted topic from the remaining list even if it is mistakenly passed in secondary list", () => {
    const currentPrimary = "topic-alpha";
    const deletedTopic = "topic-alpha";
    const secondaryTopics = ["topic-alpha", "topic-gamma"];

    const nextPrimary = computeNextPrimaryTopic(currentPrimary, deletedTopic, secondaryTopics);

    expect(nextPrimary).toBe("topic-gamma");
  });
});
