/**
 * Dataset Canonicalization Test Suite — 35 Topics SSOT Integrity
 *
 * ADR: ADR-010 (docs/adr/ADR-dataset-canonicalization-35-topics.md)
 * Gherkin: docs/gherkin/dataset-canonicalization.feature
 * SSOT: src/data/initialData.ts
 *
 * Trạng thái: TẤT CẢ TESTS PHẢI PASS sau khi INITIAL_TOPICS === 35.
 * Nếu thay đổi cardinality hay schema, tests sẽ fail ngay — đây là guardrail.
 *
 * Blocker đã giải quyết: "cat-menh-ly" KHÔNG tồn tại trong SSOT.
 * Đúng ID là "cat-tu-vi-tu-tru" (Name: "Tử Vi & Mệnh Lý").
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
  // ---------------------------------------------------------------------------
  // Scenario 1: Exact seed cardinalities
  // ---------------------------------------------------------------------------
  it("1. Exact seed cardinalities (16 categories, 39 topics, 5 notes, 4 resources, 12 tags)", () => {
    expect(INITIAL_CATEGORIES.length).toBe(16);
    expect(INITIAL_TOPICS.length).toBe(39);
    expect(INITIAL_NOTES.length).toBe(5);
    expect(INITIAL_RESOURCES.length).toBe(4);
    expect(INITIAL_TAGS.length).toBe(12);
  });

  // ---------------------------------------------------------------------------
  // Scenario 2: Unique topic IDs and slugs
  // ---------------------------------------------------------------------------
  it("2. Unique topic IDs and slugs across all topics", () => {
    const topicIds = INITIAL_TOPICS.map((t) => t.id);
    const topicSlugs = INITIAL_TOPICS.map((t) => t.slug);

    const uniqueIds = new Set(topicIds);
    const uniqueSlugs = new Set(topicSlugs);

    expect(uniqueIds.size).toBe(INITIAL_TOPICS.length);
    expect(uniqueSlugs.size).toBe(INITIAL_TOPICS.length);
    expect(uniqueIds.size).toBe(39);
    expect(uniqueSlugs.size).toBe(39);
  });

  // ---------------------------------------------------------------------------
  // Scenario 3: Valid category IDs (all topics reference existing categories)
  // ---------------------------------------------------------------------------
  it("3. All topic categoryIds reference existing INITIAL_CATEGORIES", () => {
    const categoryIds = new Set(INITIAL_CATEGORIES.map((c) => c.id));

    // Confirm the 8 canonical category IDs exist
    const expectedCategoryIds = [
      "cat-tam-tang",
      "cat-abhidharma",
      "cat-thien-dinh",
      "cat-triet-hoc-phat-giao",
      "cat-tam-thuc",
      "cat-dich-hoc",
      "cat-phong-thuy",
      "cat-tu-vi-tu-tru",
    ];
    expectedCategoryIds.forEach((id) => {
      expect(categoryIds.has(id), `Expected category "${id}" to exist`).toBe(
        true,
      );
    });

    // BLOCKER CHECK: cat-menh-ly must NOT exist (spec draft used wrong ID)
    expect(
      categoryIds.has("cat-menh-ly"),
      'ADR-010 BLOCKER: "cat-menh-ly" must NOT exist in INITIAL_CATEGORIES; correct ID is "cat-tu-vi-tu-tru"',
    ).toBe(false);

    // All topics must reference valid categories
    INITIAL_TOPICS.forEach((topic) => {
      expect(
        categoryIds.has(topic.categoryId),
        `Topic "${topic.id}" has invalid categoryId: "${topic.categoryId}"`,
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 4: KnowledgeLink integrity — valid targetIds and correct sourceIds
  // ---------------------------------------------------------------------------
  it("4. All KnowledgeLink targetIds resolve to existing topics and sourceIds match", () => {
    const topicIdSet = new Set(INITIAL_TOPICS.map((t) => t.id));

    INITIAL_TOPICS.forEach((topic) => {
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
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: StudyProgress canonical defaults for every topic
  // ---------------------------------------------------------------------------
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
      expect(progress.totalNotes).toBe(0);
      expect(progress.timeSpent).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 6: Notes and resources foreign-key integrity & legacy preservation
  // ---------------------------------------------------------------------------
  it("6. Notes and resources topic foreign-key integrity and legacy preservation", () => {
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

    // Legacy preservation: all 10 original topic IDs must remain intact
    const allLegacyTopicIds = [
      "topic-abhidharma-tong-quan",
      "topic-phap-tu",
      "topic-vi-tri-patthana",
      "topic-thien-vipassana",
      "topic-bat-nha",
      "topic-ky-mon-don-giap",
      "topic-thai-at-than-kinh",
      "topic-kinh-dich",
      "topic-phong-thuy-ly-khi",
      "topic-tu-vi-dau-so",
    ];
    allLegacyTopicIds.forEach((legacyId) => {
      expect(
        topicIdSet.has(legacyId),
        `Legacy topicId "${legacyId}" is missing from INITIAL_TOPICS`,
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Scenario 7: Canonical topic tags only
  // ---------------------------------------------------------------------------
  it("7. Canonical topic tags only (must belong to 12 INITIAL_TAGS)", () => {
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

  // ---------------------------------------------------------------------------
  // Scenario 8: Topic type matches category type
  // ---------------------------------------------------------------------------
  it("8. Topic type matches category type for all 35 topics", () => {
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

  // ---------------------------------------------------------------------------
  // Scenario 9: No self-link and no duplicate targetId per topic
  // ---------------------------------------------------------------------------
  it("9. No self-link and no duplicate link targetId per topic", () => {
    INITIAL_TOPICS.forEach((topic) => {
      const targetIdsSeen = new Set<string>();

      topic.links.forEach((link) => {
        // No self-links
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

  // ---------------------------------------------------------------------------
  // Scenario 10: TopicSchema.safeParse() succeeds for every topic
  // NOTE: TopicSchema is defined in src/lib/validation.ts.
  // This test ensures runtime shape matches Zod schema definition exactly.
  // ---------------------------------------------------------------------------
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

