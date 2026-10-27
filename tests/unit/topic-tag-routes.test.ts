import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";

describe("Phase 3 Unit: Topic Tag Routes Pruning & Sync Contract (ADR-079 / PR-2)", () => {
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      category: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cat-1",
          name: "Triết Học",
          slug: "triet-hoc",
          type: "triet-hoc",
        }),
      },
      topic: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === "top-1" || where.slug === "topic-1") {
            return {
              id: "top-1",
              title: "Topic 1",
              slug: "topic-1",
              categoryId: "cat-1",
              tags: ["Alpha", "Beta"],
            };
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: data.id || "top-new",
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
          updatedAt: new Date().toISOString(),
        })),
        delete: vi.fn().mockResolvedValue({ id: "top-1" }),
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
    };

    app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));
  });

  // ─── 1. POST /api/topics with tags: [] must prune TopicTag ───────────────

  it("1.1. POST /api/topics with tags: [] on an existing topic prunes ALL old TopicTag relations", async () => {
    // Existing topic top-1 has tags ["Alpha", "Beta"] in database
    const response = await request(app)
      .post("/api/topics")
      .send({
        id: "top-1",
        title: "Topic 1 Updated",
        slug: "topic-1",
        categoryId: "cat-1",
        tags: [], // Cleared tags
      });

    expect(response.status).toBe(200);

    // Critical assertion: deleteMany MUST be called to prune tag-alpha and tag-beta
    expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalled();
    expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
        }),
      })
    );

    // Response topic tags must be empty
    expect(response.body.tags).toEqual([]);
  });

  // ─── 2. PUT /api/topics/:id replaces tags and prunes removed ones ────────

  it("2.1. PUT /api/topics/:id prunes removed tags and keeps retained ones in TopicTag", async () => {
    // top-1 currently has ["Alpha", "Beta"]. Client updates to ["Alpha", "Gamma"]
    const response = await request(app)
      .put("/api/topics/top-1")
      .send({
        tags: ["Alpha", "Gamma"], // Beta is removed, Gamma is added
      });

    expect(response.status).toBe(200);

    // Beta must be pruned
    expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
          tagId: { in: ["tag-beta"] },
        }),
      })
    );

    // Gamma must be upserted
    expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "gamma" },
      })
    );

    // Response must reflect updated tags
    expect(response.body.tags).toEqual(["Alpha", "Gamma"]);
  });

  it("2.2. PUT /api/topics/:id with tags: [] prunes all TopicTag relations and updates Topic.tags projection", async () => {
    const response = await request(app)
      .put("/api/topics/top-1")
      .send({
        tags: [],
      });

    expect(response.status).toBe(200);
    expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
        }),
      })
    );
    expect(response.body.tags).toEqual([]);
  });

  // ─── 3. Response Projection Synchronization ──────────────────────────────

  it("3.1. Topic.tags response projection strictly matches canonical TopicTag relations after mutation", async () => {
    const response = await request(app)
      .put("/api/topics/top-1")
      .send({
        title: "Updated Title",
        tags: ["  Frontend  ", "Backend"],
      });

    expect(response.status).toBe(200);
    expect(response.body.tags).toEqual(["Frontend", "Backend"]);
  });

  // ─── 4. Tag Count & Deletion Consistency ──────────────────────────────────

  it("4.1. Deleting a topic deletes the topic and preserves tag count consistency", async () => {
    const response = await request(app).delete("/api/topics/top-1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.topic.delete).toHaveBeenCalledWith({
      where: { id: "top-1" },
    });
  });
});

