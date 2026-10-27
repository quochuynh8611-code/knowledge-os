import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";

describe("Phase 3 Unit: Sync Hydrate Links Contract (ADR-079 / PR-1)", () => {
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
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: {
        findMany: vi.fn().mockResolvedValue([
          { id: "top-1", slug: "tu-dieu-de", categoryId: "cat-1" },
          { id: "top-2", slug: "bat-chanh-dao", categoryId: "cat-1" },
        ]),
        upsert: vi.fn().mockImplementation(async ({ create }: any) => ({
          id: create.id || "top-gen",
          slug: create.slug,
        })),
        update: vi.fn().mockResolvedValue({ id: "top-1" }),
      },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
      note: { upsert: vi.fn().mockResolvedValue({}) },
      noteTopicLink: { upsert: vi.fn().mockResolvedValue({}) },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
      knowledgeLink: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: data.id || "klink-1",
          ...data,
        })),
        upsert: vi.fn().mockImplementation(async ({ create }: any) => ({
          id: create.id || "klink-1",
          ...create,
        })),
      },
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

  // ─── 1. POST /api/sync/hydrate processes payload.links ──────────────────

  it("1.1. POST /api/sync/hydrate persists valid knowledge links and increments linksUpserted", async () => {
    const payload = {
      clientSyncId: "session-links-1",
      clientTimestamp: "2026-10-27T10:00:00Z",
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [],
      links: [
        {
          id: "link-1",
          sourceId: "top-1",
          targetId: "top-2",
          linkType: "related",
          strength: 3,
          notes: "Mối tương quan giữa Tứ Diệu Đế và Bát Chánh Đạo",
        },
      ],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Critical assertion: tx.knowledgeLink upsert MUST have been called
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sourceId: "top-1",
          targetId: "top-2",
          linkType: "related",
        }),
      })
    );

    // Summary must count the upserted link
    expect(response.body.summary.linksUpserted).toBe(1);
  });

  // ─── 2. Idempotency ──────────────────────────────────────────────────────

  it("2.1. Replaying the same clientSyncId returns cached summary without re-executing transaction", async () => {
    mockPrisma.syncSession.findUnique.mockResolvedValue({
      clientSyncId: "session-links-cached",
      status: "completed",
      processedAt: new Date("2026-10-27T09:00:00Z"),
      summary: {
        categoriesUpserted: 0,
        topicsUpserted: 0,
        notesUpserted: 0,
        resourcesUpserted: 0,
        tagsUpserted: 0,
        linksUpserted: 1,
        progressMerged: 0,
      },
    });

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send({
        clientSyncId: "session-links-cached",
        clientTimestamp: "2026-10-27T09:00:00Z",
        categories: [],
        tags: [],
        topics: [],
        notes: [],
        resources: [],
        links: [
          {
            id: "link-1",
            sourceId: "top-1",
            targetId: "top-2",
            linkType: "related",
            strength: 3,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary.linksUpserted).toBe(1);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("2.2. Replaying the same link in a subsequent sync session performs idempotent upsert without duplicates", async () => {
    const payload = {
      clientSyncId: "session-links-second-run",
      clientTimestamp: "2026-10-27T10:15:00Z",
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [],
      links: [
        {
          id: "link-1",
          sourceId: "top-1",
          targetId: "top-2",
          linkType: "related",
          strength: 4, // updated strength
        },
      ],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledTimes(1);
    // Should update existing link based on unique constraint (sourceId, targetId, linkType) or id
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        update: expect.objectContaining({
          strength: 4,
        }),
      })
    );
  });

  // ─── 3. Routine Sync vs Force Overwrite ───────────────────────────────────

  it("3.1. Routine sync skips orphan links where sourceId or targetId does not exist on server", async () => {
    const payload = {
      clientSyncId: "session-routine-orphan-link",
      clientTimestamp: "2026-10-27T10:30:00Z",
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [],
      links: [
        {
          id: "link-orphan",
          sourceId: "non-existent-source",
          targetId: "top-2",
          linkType: "related",
          strength: 3,
        },
      ],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Orphan link must be skipped in routine sync
    expect(mockTx.knowledgeLink.upsert).not.toHaveBeenCalled();
    expect(response.body.summary.linksUpserted).toBe(0);
  });

  it("3.2. forceOverwrite sync allows links between newly created topics in the same payload", async () => {
    const newTopic1Id = "top-new-alpha";
    const newTopic2Id = "top-new-beta";

    mockTx.topic.findMany.mockResolvedValue([]); // No existing topics initially

    const payload = {
      clientSyncId: "session-force-overwrite-links",
      forceOverwrite: true,
      clientTimestamp: "2026-10-27T10:45:00Z",
      categories: [
        { id: "cat-1", name: "Triết Học", slug: "triet-hoc", type: "triet-hoc" },
      ],
      tags: [],
      topics: [
        {
          id: newTopic1Id,
          title: "Chủ đề Mới Alpha",
          slug: "chu-de-moi-alpha",
          categoryId: "cat-1",
          type: "triet-hoc",
        },
        {
          id: newTopic2Id,
          title: "Chủ đề Mới Beta",
          slug: "chu-de-moi-beta",
          categoryId: "cat-1",
          type: "triet-hoc",
        },
      ],
      notes: [],
      resources: [],
      links: [
        {
          id: "link-alpha-beta",
          sourceId: newTopic1Id,
          targetId: newTopic2Id,
          linkType: "prerequisite",
          strength: 5,
        },
      ],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledTimes(1);
    expect(mockTx.knowledgeLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          sourceId: newTopic1Id,
          targetId: newTopic2Id,
          linkType: "prerequisite",
        }),
      })
    );
    expect(response.body.summary.linksUpserted).toBe(1);
  });

  // ─── 4. Self-link Guard ──────────────────────────────────────────────────

  it("4.1. POST /api/sync/hydrate rejects or skips self-links where sourceId === targetId", async () => {
    const payload = {
      clientSyncId: "session-self-link-guard",
      clientTimestamp: "2026-10-27T11:00:00Z",
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [],
      links: [
        {
          id: "link-self",
          sourceId: "top-1",
          targetId: "top-1", // Self-link
          linkType: "related",
          strength: 3,
        },
      ],
    };

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send(payload);

    // Self-links must never be persisted into knowledgeLink
    expect(mockTx.knowledgeLink.upsert).not.toHaveBeenCalled();
    if (response.status === 200) {
      expect(response.body.summary.linksUpserted).toBe(0);
    } else {
      expect(response.status).toBe(400);
    }
  });
});
