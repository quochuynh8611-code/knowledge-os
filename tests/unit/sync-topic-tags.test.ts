import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";

describe("Phase 3 Unit: Sync Hydrate Topic Tag Pruning & Sync Contract (ADR-079 / PR-2)", () => {
  let mockTx: any;
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    mockTx = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", slug: "triet-hoc", name: "Triết Học" },
        ]),
        upsert: vi.fn().mockResolvedValue({ id: "cat-1", slug: "triet-hoc" }),
        update: vi.fn().mockResolvedValue({ id: "cat-1", slug: "triet-hoc" }),
      },
      tag: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => ({
          id: `tag-${where.slug}`,
          slug: where.slug,
          name: create?.name || update?.name || "Tag",
          color: "#D97706",
          count: 1,
        })),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      topic: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "top-1",
            slug: "chu-de-1",
            title: "Chủ đề 1",
            categoryId: "cat-1",
            tags: ["Alpha", "Beta"],
          },
        ]),
        upsert: vi.fn().mockImplementation(async ({ create }: any) => ({
          id: create.id || "top-gen",
          slug: create.slug,
          tags: create.tags || [],
        })),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
      },
      topicTag: {
        findMany: vi.fn().mockResolvedValue([
          { topicId: "top-1", tagId: "tag-alpha", tag: { id: "tag-alpha", name: "Alpha", slug: "alpha" } },
          { topicId: "top-1", tagId: "tag-beta", tag: { id: "tag-beta", name: "Beta", slug: "beta" } },
        ]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => ({
          topicId: where.topicId_tagId?.topicId || create.topicId,
          tagId: where.topicId_tagId?.tagId || create.tagId,
        })),
      },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
      note: { upsert: vi.fn().mockResolvedValue({}) },
      noteTopicLink: { upsert: vi.fn().mockResolvedValue({}) },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
      knowledgeLink: { upsert: vi.fn().mockResolvedValue({}) },
      syncSession: { create: vi.fn().mockResolvedValue({}) },
    };

    mockPrisma = {
      syncSession: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTx);
      }),
    };

    app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));
  });

  // ─── 1. Routine Sync Pruning ──────────────────────────────────────────────

  it("1.1. Routine sync prunes TopicTag relations removed by client", async () => {
    // Topic originally has tags ["Alpha", "Beta"] in database.
    // Client sends update with only ["Alpha"] (Beta removed)
    const payload = {
      clientSyncId: "session-tag-prune-1",
      clientTimestamp: "2026-10-27T10:00:00Z",
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-1",
          title: "Chủ đề 1",
          slug: "chu-de-1",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: ["Alpha"], // Beta removed
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Critical assertion: topicTag.deleteMany MUST be called to prune tag-beta
    expect(mockTx.topicTag.deleteMany).toHaveBeenCalled();
    expect(mockTx.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
          tagId: { in: ["tag-beta"] },
        }),
      })
    );
  });

  it("1.2. Routine sync prunes ALL TopicTag relations when client clears tags: []", async () => {
    const payload = {
      clientSyncId: "session-tag-prune-empty-1",
      clientTimestamp: "2026-10-27T10:05:00Z",
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-1",
          title: "Chủ đề 1",
          slug: "chu-de-1",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: [], // Cleared
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // All TopicTag relations must be pruned
    expect(mockTx.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
        }),
      })
    );
  });

  // ─── 2. Force Overwrite Sync ──────────────────────────────────────────────

  it("2.1. forceOverwrite sync prunes and synchronizes TopicTag relations", async () => {
    const payload = {
      clientSyncId: "session-tag-force-1",
      forceOverwrite: true,
      clientTimestamp: "2026-10-27T10:10:00Z",
      categories: [
        { id: "cat-1", name: "Triết Học", slug: "triet-hoc", type: "triet-hoc" },
      ],
      tags: [],
      topics: [
        {
          id: "top-1",
          title: "Chủ đề 1",
          slug: "chu-de-1",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: ["Gamma"],
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockTx.topicTag.deleteMany).toHaveBeenCalled();
    expect(mockTx.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "gamma" },
      })
    );
  });

  // ─── 3. Idempotency & Replay ─────────────────────────────────────────────

  it("3.1. Hydration replay with identical tags is idempotent and creates no duplicates", async () => {
    const payload = {
      clientSyncId: "session-replay-1",
      clientTimestamp: "2026-10-27T10:12:00Z",
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-1",
          title: "Chủ đề 1",
          slug: "chu-de-1",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: ["Alpha", "Beta"],
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    // First hydration
    const res1 = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res1.status).toBe(200);

    // Simulated already existing TopicTag in DB
    mockTx.topicTag.findMany.mockResolvedValue([
      { topicId: "top-1", tagId: "tag-alpha", tag: { id: "tag-alpha", name: "Alpha", slug: "alpha" } },
      { topicId: "top-1", tagId: "tag-beta", tag: { id: "tag-beta", name: "Beta", slug: "beta" } },
    ]);
    mockTx.topicTag.upsert.mockClear();
    mockTx.topicTag.deleteMany.mockClear();

    // Replay identical hydration payload
    const res2 = await request(app).post("/api/sync/hydrate").send({
      ...payload,
      clientSyncId: "session-replay-2",
    });
    expect(res2.status).toBe(200);

    // No obsolete relations to delete on replay
    expect(mockTx.topicTag.deleteMany).not.toHaveBeenCalled();
  });

  // ─── 4. Orphan Guard ─────────────────────────────────────────────────────

  it("4.1. Routine sync ignores tags for unknown topics that do not exist on server", async () => {
    mockTx.topicTag.findMany.mockClear();
    mockTx.topicTag.upsert.mockClear();

    const payload = {
      clientSyncId: "session-tag-orphan-1",
      clientTimestamp: "2026-10-27T10:15:00Z",
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-unknown-orphan",
          title: "Chủ đề không tồn tại",
          slug: "chu-de-khong-ton-tai",
          categoryId: "cat-1",
          type: "triet-hoc",
          tags: ["TagVoNghia"],
        },
      ],
      notes: [],
      resources: [],
      links: [],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    // Unknown topic in routine sync must NOT have TopicTag created
    expect(mockTx.topicTag.upsert).not.toHaveBeenCalled();
  });
});
