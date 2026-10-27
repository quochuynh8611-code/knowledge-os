import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";

describe("Phase 3 Unit: Note Topic Link Sync & Pruning (ADR-079 / PR-3)", () => {
  let mockTx: any;
  let mockPrisma: any;
  let noteApp: express.Express;
  let syncApp: express.Express;

  beforeEach(() => {
    mockTx = {
      note: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === "note-1") {
            return {
              id: "note-1",
              title: "Note 1",
              topicId: "top-1",
              content: "Content",
              tags: [],
            };
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: data.id || "note-new",
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
          updatedAt: new Date().toISOString(),
        })),
        upsert: vi.fn().mockImplementation(async ({ where, create, update }: any) => ({
          id: where.id || create.id,
          ...(create || update),
        })),
      },
      noteTopicLink: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.noteId === "note-1") {
            return [
              { noteId: "note-1", topicId: "top-1" },
              { noteId: "note-1", topicId: "top-2" },
            ];
          }
          return [];
        }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => ({
          noteId: where.noteId_topicId?.noteId || create.noteId,
          topicId: where.noteId_topicId?.topicId || create.topicId,
        })),
      },
      topic: {
        findMany: vi.fn().mockResolvedValue([
          { id: "top-1", slug: "top-1", title: "Topic 1" },
          { id: "top-2", slug: "top-2", title: "Topic 2" },
        ]),
        upsert: vi.fn().mockImplementation(async ({ create }: any) => ({
          id: create.id || "top-gen",
          slug: create.slug,
        })),
        update: vi.fn().mockResolvedValue({}),
      },
      category: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      tag: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      topicTag: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        upsert: vi.fn().mockResolvedValue({}),
      },
      studyProgress: { upsert: vi.fn().mockResolvedValue({}) },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
      knowledgeLink: { upsert: vi.fn().mockResolvedValue({}) },
      syncSession: { create: vi.fn().mockResolvedValue({}) },
    };

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockTx);
      }),
      syncSession: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      note: mockTx.note,
      noteTopicLink: mockTx.noteTopicLink,
      topic: mockTx.topic,
    };

    noteApp = express();
    noteApp.use(express.json());
    noteApp.use("/api", createNoteRouter(mockPrisma));

    syncApp = express();
    syncApp.use(express.json());
    syncApp.use("/api", createSyncRouter(mockPrisma));
  });

  // ─── 1. POST /api/notes creates NoteTopicLink for all topicIds ────────────

  it("1.1. POST /api/notes creates NoteTopicLink for all topicIds in payload", async () => {
    const response = await request(noteApp)
      .post("/api/notes")
      .send({
        id: "note-multi-1",
        title: "Multi Topic Note",
        content: "Content",
        topicId: "top-1",
        topicIds: ["top-1", "top-2", "top-3"],
      });

    expect(response.status).toBe(201);
    expect(mockTx.noteTopicLink.upsert).toHaveBeenCalledTimes(3);
    expect(mockTx.noteTopicLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          noteId_topicId: {
            noteId: "note-multi-1",
            topicId: "top-1",
          },
        },
      })
    );
    expect(mockTx.noteTopicLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          noteId_topicId: {
            noteId: "note-multi-1",
            topicId: "top-2",
          },
        },
      })
    );
    expect(mockTx.noteTopicLink.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          noteId_topicId: {
            noteId: "note-multi-1",
            topicId: "top-3",
          },
        },
      })
    );
  });

  // ─── 2. PUT /api/notes/:id prunes removed topic relations ─────────────────

  it("2.1. PUT /api/notes/:id prunes NoteTopicLink for removed topics", async () => {
    // Note 1 currently has top-1 and top-2. Client updates to only top-1 (top-2 removed).
    const response = await request(noteApp)
      .put("/api/notes/note-1")
      .send({
        title: "Updated Note",
        topicIds: ["top-1"],
      });

    expect(response.status).toBe(200);
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          noteId: "note-1",
          topicId: { in: ["top-2"] },
        }),
      })
    );
  });

  // ─── 3. POST /api/sync/hydrate prunes removed NoteTopicLink ───────────────

  it("3.1. Routine sync prunes NoteTopicLink relations removed by client", async () => {
    // Note 1 has top-1 and top-2 on server. Client sends note with only top-1.
    const payload = {
      clientSyncId: "session-note-prune-1",
      clientTimestamp: "2026-10-27T10:00:00Z",
      categories: [],
      tags: [],
      topics: [
        { id: "top-1", title: "Topic 1", slug: "top-1", categoryId: "cat-1", type: "general" },
        { id: "top-2", title: "Topic 2", slug: "top-2", categoryId: "cat-1", type: "general" },
      ],
      notes: [
        {
          id: "note-1",
          title: "Note 1",
          topicId: "top-1",
          topicIds: ["top-1"], // top-2 removed
          content: "Content",
        },
      ],
      resources: [],
      links: [],
    };

    const response = await request(syncApp)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    // Critical assertion: syncRoutes must prune removed top-2 from NoteTopicLink
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalled();
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          noteId: "note-1",
          topicId: { in: ["top-2"] },
        }),
      })
    );
  });

  it("3.2. forceOverwrite sync prunes and synchronizes NoteTopicLink", async () => {
    const payload = {
      clientSyncId: "session-note-force-1",
      forceOverwrite: true,
      clientTimestamp: "2026-10-27T10:05:00Z",
      categories: [],
      tags: [],
      topics: [
        { id: "top-1", title: "Topic 1", slug: "top-1", categoryId: "cat-1", type: "general" },
      ],
      notes: [
        {
          id: "note-1",
          title: "Note 1",
          topicId: "top-1",
          topicIds: ["top-1"], // top-2 pruned
          content: "Content",
        },
      ],
      resources: [],
      links: [],
    };

    const response = await request(syncApp)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalled();
  });

  // ─── 4. Replay Idempotency & Orphan Guard ─────────────────────────────────

  it("4.1. Replay of same hydration payload does not duplicate NoteTopicLink relations", async () => {
    const payload = {
      clientSyncId: "session-note-replay-1",
      clientTimestamp: "2026-10-27T10:10:00Z",
      categories: [],
      tags: [],
      topics: [
        { id: "top-1", title: "Topic 1", slug: "top-1", categoryId: "cat-1", type: "general" },
      ],
      notes: [
        {
          id: "note-1",
          title: "Note 1",
          topicId: "top-1",
          topicIds: ["top-1"],
          content: "Content",
        },
      ],
      resources: [],
      links: [],
    };

    // First hydration
    await request(syncApp).post("/api/sync/hydrate").send(payload);

    mockTx.noteTopicLink.deleteMany.mockClear();
    // Simulate link already exists
    mockTx.noteTopicLink.findMany.mockResolvedValue([
      { noteId: "note-1", topicId: "top-1" },
    ]);

    // Replay
    const res2 = await request(syncApp).post("/api/sync/hydrate").send({
      ...payload,
      clientSyncId: "session-note-replay-2",
    });

    expect(res2.status).toBe(200);
    // Idempotent: no obsolete links to delete
    expect(mockTx.noteTopicLink.deleteMany).not.toHaveBeenCalled();
  });

  it("4.2. Routine sync ignores orphan topic links for topics that do not exist", async () => {
    mockTx.noteTopicLink.upsert.mockClear();

    const payload = {
      clientSyncId: "session-note-orphan-1",
      clientTimestamp: "2026-10-27T10:15:00Z",
      categories: [],
      tags: [],
      topics: [
        { id: "top-1", title: "Topic 1", slug: "top-1", categoryId: "cat-1", type: "general" },
      ],
      notes: [
        {
          id: "note-1",
          title: "Note 1",
          topicId: "top-1",
          topicIds: ["top-1", "non-existent-topic"],
          content: "Content",
        },
      ],
      resources: [],
      links: [],
    };

    const response = await request(syncApp)
      .post("/api/sync/hydrate")
      .send(payload);

    expect(response.status).toBe(200);
    // Non-existent topic must NOT be upserted into NoteTopicLink
    expect(mockTx.noteTopicLink.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          noteId_topicId: {
            noteId: "note-1",
            topicId: "non-existent-topic",
          },
        },
      })
    );
  });
});
