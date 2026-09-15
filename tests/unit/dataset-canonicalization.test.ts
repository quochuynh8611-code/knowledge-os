/**
 * Dataset Canonicalization Test Suite — Commercial Reset SSOT Integrity
 *
 * SSOT: src/data/initialData.ts
 */

import { describe, it, expect } from "vitest";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";
import { TopicSchema } from "../../src/lib/validation";

describe("Dataset Canonicalization Test Suite - SSOT Integrity", () => {
  it("1. Commercial seed cardinalities", () => {
    expect(INITIAL_CATEGORIES.length).toBeGreaterThanOrEqual(1);
    expect(INITIAL_TOPICS.length).toBeGreaterThanOrEqual(1);
    expect(INITIAL_NOTES.length).toBeGreaterThanOrEqual(1);
    expect(INITIAL_TAGS.length).toBeGreaterThanOrEqual(1);
  });

  it("2. Unique topic IDs and slugs across all topics", () => {
    const topicIds = INITIAL_TOPICS.map((t) => t.id);
    const topicSlugs = INITIAL_TOPICS.map((t) => t.slug);

    const uniqueIds = new Set(topicIds);
    const uniqueSlugs = new Set(topicSlugs);

    expect(uniqueIds.size).toBe(INITIAL_TOPICS.length);
    expect(uniqueSlugs.size).toBe(INITIAL_TOPICS.length);
  });

  it("3. All topic categoryIds reference existing INITIAL_CATEGORIES", () => {
    const categoryIds = new Set(INITIAL_CATEGORIES.map((c) => c.id));

    INITIAL_TOPICS.forEach((topic) => {
      expect(
        categoryIds.has(topic.categoryId),
        `Topic "${topic.id}" has invalid categoryId: "${topic.categoryId}"`,
      ).toBe(true);
    });
  });

  it("4. All KnowledgeLink targetIds resolve to existing topics and sourceIds match", () => {
    const topicIdSet = new Set(INITIAL_TOPICS.map((t) => t.id));

    INITIAL_TOPICS.forEach((topic) => {
      topic.links.forEach((link) => {
        expect(
          topicIdSet.has(link.targetId),
          `Topic "${topic.id}" has link pointing to non-existent targetId: "${link.targetId}"`,
        ).toBe(true);

        expect(
          link.sourceId,
          `Link sourceId "${link.sourceId}" does not match topic.id "${topic.id}"`,
        ).toBe(topic.id);
      });
    });
  });

  it("5. StudyProgress canonical defaults for every topic", () => {
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
      expect(progress.timeSpent).toBe(0);
    });
  });

  it("6. Notes and resources topic foreign-key integrity", () => {
    const topicIdSet = new Set(INITIAL_TOPICS.map((t) => t.id));

    INITIAL_NOTES.forEach((note) => {
      expect(
        topicIdSet.has(note.topicId),
        `Note "${note.id}" references non-existent topicId: "${note.topicId}"`,
      ).toBe(true);
    });

    INITIAL_RESOURCES.forEach((resource) => {
      expect(
        topicIdSet.has(resource.topicId),
        `Resource "${resource.id}" references non-existent topicId: "${resource.topicId}"`,
      ).toBe(true);
    });
  });

  it("7. Canonical topic tags only", () => {
    const validTags = new Set(INITIAL_TAGS.flatMap((tag) => [tag.name, tag.slug]));

    INITIAL_TOPICS.forEach((topic) => {
      topic.tags.forEach((tagItem) => {
        expect(
          validTags.has(tagItem),
          `Topic "${topic.id}" uses non-canonical tag: "${tagItem}"`,
        ).toBe(true);
      });
    });
  });

  it("8. Topic type matches category type for all topics", () => {
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

  it("9. No self-link and no duplicate link targetId per topic", () => {
    INITIAL_TOPICS.forEach((topic) => {
      const targetIdsSeen = new Set<string>();

      topic.links.forEach((link) => {
        expect(
          link.targetId,
          `Topic "${topic.id}" contains a self-link to itself`,
        ).not.toBe(topic.id);

        expect(
          targetIdsSeen.has(link.targetId),
          `Topic "${topic.id}" contains duplicate link to targetId: "${link.targetId}"`,
        ).toBe(false);
        targetIdsSeen.add(link.targetId);
      });
    });
  });

  it("10. TopicSchema.safeParse() succeeds for every topic", () => {
    INITIAL_TOPICS.forEach((topic) => {
      const parseResult = TopicSchema.safeParse(topic);
      expect(
        parseResult.success,
        `Topic "${topic.id}" failed TopicSchema validation: ${JSON.stringify(parseResult.error?.format?.() || {})}`,
      ).toBe(true);
    });
  });
});
