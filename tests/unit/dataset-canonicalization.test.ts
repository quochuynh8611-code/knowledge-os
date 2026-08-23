import { describe, it, expect } from "vitest";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";
import { TopicSchema } from "../../src/lib/validation";

describe("Dataset Canonicalization Test Suite - 35 Topics SSOT Integrity", () => {
  // Scenario 1: Exact seed cardinalities
  it("1. Exact seed cardinalities (8 categories, 35 topics, 5 notes, 4 resources, 12 tags)", () => {
    expect(INITIAL_CATEGORIES.length).toBe(8);
    expect(INITIAL_TOPICS.length).toBe(35);
    expect(INITIAL_NOTES.length).toBe(5);
    expect(INITIAL_RESOURCES.length).toBe(4);
    expect(INITIAL_TAGS.length).toBe(12);
  });

  // Scenario 2: Unique topic IDs and slugs
  it("2. Unique topic IDs and slugs across all topics", () => {
    const topicIds = INITIAL_TOPICS.map((t) => t.id);
    const topicSlugs = INITIAL_TOPICS.map((t) => t.slug);

    const uniqueIds = new Set(topicIds);
    const uniqueSlugs = new Set(topicSlugs);

    expect(uniqueIds.size).toBe(INITIAL_TOPICS.length);
    expect(uniqueSlugs.size).toBe(INITIAL_TOPICS.length);
    expect(uniqueIds.size).toBe(35);
  });

  // Scenario 3: Valid category IDs and matching topic/category types
  it("3. Valid category IDs and matching topic/category types", () => {
    const categoryMap = new Map(INITIAL_CATEGORIES.map((c) => [c.id, c]));

    INITIAL_TOPICS.forEach((topic) => {
      const category = categoryMap.get(topic.categoryId);
      expect(
        category,
        `Topic "${topic.id}" has invalid categoryId: "${topic.categoryId}"`,
      ).toBeDefined();

      if (category) {
        expect(
          topic.type,
          `Topic "${topic.id}" type (${topic.type}) does not match category type (${category.type})`,
        ).toBe(category.type);
      }
    });
  });

  // Scenario 4: Valid knowledge links, correct source IDs, no self-links, no duplicate targets
  it("4. Valid knowledge links, correct source IDs, no self-links and no duplicates per topic", () => {
    const topicIdSet = new Set(INITIAL_TOPICS.map((t) => t.id));

    INITIAL_TOPICS.forEach((topic) => {
      const targetIdsSeen = new Set<string>();

      topic.links.forEach((link) => {
        // Link target must exist in topics
        expect(
          topicIdSet.has(link.targetId),
          `Topic "${topic.id}" has link pointing to non-existent targetId: "${link.targetId}"`,
        ).toBe(true);

        // Link sourceId must match parent topic.id
        expect(
          link.sourceId,
          `Link sourceId "${link.sourceId}" does not match topic.id "${topic.id}"`,
        ).toBe(topic.id);

        // No self links
        expect(
          link.targetId,
          `Topic "${topic.id}" contains a self-link to itself`,
        ).not.toBe(topic.id);

        // No duplicate targets in the same topic
        expect(
          targetIdsSeen.has(link.targetId),
          `Topic "${topic.id}" contains duplicate link to targetId: "${link.targetId}"`,
        ).toBe(false);
        targetIdsSeen.add(link.targetId);
      });
    });
  });

  // Scenario 5: Canonical topic tags only
  it("5. Canonical topic tags only (must belong to 12 INITIAL_TAGS)", () => {
    const validTagNames = new Set(INITIAL_TAGS.map((tag) => tag.name));

    INITIAL_TOPICS.forEach((topic) => {
      topic.tags.forEach((tagName) => {
        expect(
          validTagNames.has(tagName),
          `Topic "${topic.id}" uses non-canonical tag: "${tagName}"`,
        ).toBe(true);
      });
    });
  });

  // Scenario 6: StudyProgress canonical defaults for every topic
  it("6. StudyProgress canonical defaults for every topic", () => {
    INITIAL_TOPICS.forEach((topic) => {
      const progress = topic.studyProgress;
      expect(
        progress,
        `Topic "${topic.id}" is missing studyProgress`,
      ).toBeDefined();

      expect(progress.topicId).toBe(topic.id);
      expect(progress.status).toBe("not_started");
      expect(progress.progress).toBe(0);
      expect(progress.interval).toBe(0);
      expect(progress.easeFactor).toBe(2.5);
      expect(progress.repetitions).toBe(0);
      expect(progress.totalNotes).toBe(0);
      expect(progress.timeSpent).toBe(0);
    });
  });

  // Scenario 7: Notes and resources foreign-key integrity & legacy preservation
  it("7. Notes and resources topic foreign-key integrity and legacy preservation", () => {
    const topicIdSet = new Set(INITIAL_TOPICS.map((t) => t.id));

    // Check all Notes
    INITIAL_NOTES.forEach((note) => {
      expect(
        topicIdSet.has(note.topicId),
        `Note "${note.id}" references non-existent topicId: "${note.topicId}"`,
      ).toBe(true);
    });

    // Check all Resources
    INITIAL_RESOURCES.forEach((resource) => {
      expect(
        topicIdSet.has(resource.topicId),
        `Resource "${resource.id}" references non-existent topicId: "${resource.topicId}"`,
      ).toBe(true);
    });

    // Legacy preservation: ensure known legacy topic IDs exist
    const legacyTopicIds = [
      "topic-abhidharma-tong-quan",
      "topic-thien-vipassana",
      "topic-ky-mon-don-giap",
      "topic-bat-nha",
      "topic-kinh-dich",
    ];
    legacyTopicIds.forEach((legacyId) => {
      expect(
        topicIdSet.has(legacyId),
        `Legacy topicId "${legacyId}" is missing from INITIAL_TOPICS`,
      ).toBe(true);
    });
  });

  // Scenario 8: TopicSchema.safeParse() succeeds for every topic
  it("8. TopicSchema.safeParse() succeeds for every topic", () => {
    INITIAL_TOPICS.forEach((topic) => {
      const parseResult = TopicSchema.safeParse(topic);
      expect(
        parseResult.success,
        `Topic "${topic.id}" failed TopicSchema validation: ${JSON.stringify(parseResult.error?.format?.() || {})}`,
      ).toBe(true);
    });
  });
});
