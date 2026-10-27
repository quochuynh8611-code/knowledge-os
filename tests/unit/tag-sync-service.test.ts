import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncTopicTags } from "../../src/server/services/tagSyncService";

describe("Phase 3 Unit: Shared Tag Sync Service (ADR-079 / PR-2)", () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      tag: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => ({
          id: `tag-${where.slug}`,
          slug: where.slug,
          name: create?.name || update?.name || "Tag",
          color: create?.color || "#D97706",
          count: create?.count ?? 0,
        })),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      topicTag: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => ({
          topicId: where.topicId_tagId?.topicId || create.topicId,
          tagId: where.topicId_tagId?.tagId || create.tagId,
        })),
      },
      topic: {
        update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
      },
    };
  });

  // ─── 1. Adding New Tags ───────────────────────────────────────────────────

  it("1.1. Adds new tags, upserts Tag records, creates TopicTag relations, and updates Topic.tags projection", async () => {
    mockTx.topicTag.findMany.mockResolvedValue([]);

    const result = await syncTopicTags(mockTx, "top-1", ["Alpha", "Beta"]);

    expect(mockTx.tag.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "alpha" },
        create: expect.objectContaining({ name: "Alpha", slug: "alpha" }),
      })
    );
    expect(mockTx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "beta" },
        create: expect.objectContaining({ name: "Beta", slug: "beta" }),
      })
    );

    // TopicTag relations created
    expect(mockTx.topicTag.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.topicTag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          topicId_tagId: {
            topicId: "top-1",
            tagId: "tag-alpha",
          },
        },
      })
    );

    // Topic.tags projection updated
    expect(mockTx.topic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "top-1" },
        data: expect.objectContaining({
          tags: ["Alpha", "Beta"],
        }),
      })
    );

    expect(result).toEqual(["Alpha", "Beta"]);
  });

  // ─── 2. Removing / Pruning Obsolete Tags ──────────────────────────────────

  it("2.1. Prunes obsolete TopicTag relations when tags are removed", async () => {
    // Topic originally has tag-alpha and tag-beta
    mockTx.topicTag.findMany.mockResolvedValue([
      { topicId: "top-1", tagId: "tag-alpha", tag: { id: "tag-alpha", name: "Alpha", slug: "alpha" } },
      { topicId: "top-1", tagId: "tag-beta", tag: { id: "tag-beta", name: "Beta", slug: "beta" } },
    ]);

    // Update with only tag-alpha (tag-beta removed)
    const result = await syncTopicTags(mockTx, "top-1", ["Alpha"]);

    expect(mockTx.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          topicId: "top-1",
          tagId: { in: ["tag-beta"] },
        },
      })
    );

    expect(mockTx.topic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "top-1" },
        data: expect.objectContaining({
          tags: ["Alpha"],
        }),
      })
    );

    expect(result).toEqual(["Alpha"]);
  });

  // ─── 3. Empty Tag List Prunes All Relations ──────────────────────────────

  it("3.1. Passing empty tags array prunes ALL existing TopicTag relations for the topic", async () => {
    mockTx.topicTag.findMany.mockResolvedValue([
      { topicId: "top-1", tagId: "tag-alpha", tag: { id: "tag-alpha", name: "Alpha", slug: "alpha" } },
      { topicId: "top-1", tagId: "tag-gamma", tag: { id: "tag-gamma", name: "Gamma", slug: "gamma" } },
    ]);

    const result = await syncTopicTags(mockTx, "top-1", []);

    expect(mockTx.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          topicId: "top-1",
          tagId: { in: ["tag-alpha", "tag-gamma"] },
        },
      })
    );

    // Topic.tags projection updated to empty array
    expect(mockTx.topic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "top-1" },
        data: expect.objectContaining({
          tags: [],
        }),
      })
    );

    expect(result).toEqual([]);
  });

  // ─── 4. Idempotency ──────────────────────────────────────────────────────

  it("4.1. Calling syncTopicTags with identical tags is idempotent and avoids redundant deletions", async () => {
    mockTx.topicTag.findMany.mockResolvedValue([
      { topicId: "top-1", tagId: "tag-alpha", tag: { id: "tag-alpha", name: "Alpha", slug: "alpha" } },
    ]);

    await syncTopicTags(mockTx, "top-1", ["Alpha"]);

    // No obsolete tags to delete
    expect(mockTx.topicTag.deleteMany).not.toHaveBeenCalled();
    // Existing relation is kept
    expect(mockTx.topicTag.upsert).not.toHaveBeenCalled();
  });

  // ─── 5. Tag Normalization & Deduplication ────────────────────────────────

  it("5.1. Sanitizes whitespace, strips empty entries, and deduplicates tags", async () => {
    mockTx.topicTag.findMany.mockResolvedValue([]);

    const result = await syncTopicTags(mockTx, "top-1", [
      "  Architecture  ",
      "",
      "   ",
      "Architecture",
      "Testing",
    ]);

    expect(result).toEqual(["Architecture", "Testing"]);
    expect(mockTx.tag.upsert).toHaveBeenCalledTimes(2);
  });
});
