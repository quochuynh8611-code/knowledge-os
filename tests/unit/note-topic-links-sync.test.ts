import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";

describe("Phase P1.4 — Note Topic Links & SourcePath Sync Contract", () => {
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      note: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "note-1",
            topicId: "top-1",
            title: "Ghi chú phân tích",
            content: "Nội dung...",
            sourcePath: "/Vault/Notes/phan-tich.md",
            type: "insight",
            isPrivate: false,
            tags: ["Triết Học"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            additionalTopics: [
              { id: "link-1", noteId: "note-1", topicId: "top-1" },
              { id: "link-2", noteId: "note-1", topicId: "top-2" },
            ],
          },
        ]),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          ...data,
          id: data.id || "note-new-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        update: vi.fn().mockImplementation(async ({ where, data }) => ({
          id: where.id,
          ...data,
          updatedAt: new Date().toISOString(),
        })),
        delete: vi.fn().mockResolvedValue({ id: "note-1" }),
      },
      noteTopicLink: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockImplementation(async ({ where, create }) => ({
          id: `link-${create.noteId}-${create.topicId}`,
          noteId: create.noteId,
          topicId: create.topicId,
        })),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createNoteRouter(mockPrisma));
  });

  // ─── 1. Note Creation with topicIds & sourcePath ─────────────────────────

  describe("1. Note Creation with Multi-Topic and sourcePath", () => {
    it("1.1. POST /notes persists sourcePath and dual-writes NoteTopicLink records in a $transaction", async () => {
      const response = await request(app)
        .post("/api/notes")
        .send({
          title: "Tâm Sở Biến Hành",
          content: "7 tâm sở biến hành...",
          topicId: "top-1",
          topicIds: ["top-1", "top-2", "top-3"],
          sourcePath: "/Vault/Notes/tam-so-bien-hanh.md",
          type: "insight",
          isPrivate: false,
          tags: ["Abhidharma"],
        });

      expect(response.status).toBe(201);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Tâm Sở Biến Hành",
            topicId: "top-1",
            sourcePath: "/Vault/Notes/tam-so-bien-hanh.md",
          }),
        })
      );
      // Verify NoteTopicLink upserts for all 3 topics
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledTimes(3);
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId_topicId: { noteId: expect.any(String), topicId: "top-1" } },
        })
      );
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId_topicId: { noteId: expect.any(String), topicId: "top-2" } },
        })
      );
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId_topicId: { noteId: expect.any(String), topicId: "top-3" } },
        })
      );
      // Returned note should include sourcePath and topicIds
      expect(response.body.sourcePath).toBe("/Vault/Notes/tam-so-bien-hanh.md");
      expect(response.body.topicIds).toEqual(["top-1", "top-2", "top-3"]);
    });

    it("1.2. POST /notes without topicIds falls back to primary topicId link (backward compat)", async () => {
      const response = await request(app)
        .post("/api/notes")
        .send({
          title: "Ghi chú đơn",
          content: "Nội dung...",
          topicId: "top-single",
          type: "study",
        });

      expect(response.status).toBe(201);
      expect(mockPrisma.note.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            topicId: "top-single",
          }),
        })
      );
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId_topicId: { noteId: expect.any(String), topicId: "top-single" } },
        })
      );
    });
  });

  // ─── 2. Note Update Dual-Write & Link Pruning ────────────────────────────

  describe("2. Note Update Multi-Topic & Link Pruning", () => {
    it("2.1. PUT /notes/:id updates sourcePath and prunes obsolete NoteTopicLink records in $transaction", async () => {
      // Mock existing links: note-1 currently linked to top-1 and top-2
      mockPrisma.noteTopicLink.findMany.mockResolvedValue([
        { noteId: "note-1", topicId: "top-1" },
        { noteId: "note-1", topicId: "top-2" },
      ]);

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({
          title: "Ghi chú cập nhật",
          topicIds: ["top-1", "top-3"], // top-2 removed, top-3 added
          sourcePath: "/Vault/Notes/updated-path.md",
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(mockPrisma.note.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "note-1" },
          data: expect.objectContaining({
            topicId: "top-1",
            sourcePath: "/Vault/Notes/updated-path.md",
          }),
        })
      );
      // Prune top-2
      expect(mockPrisma.noteTopicLink.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId: "note-1", topicId: { in: ["top-2"] } },
        })
      );
      // Upsert top-3
      expect(mockPrisma.noteTopicLink.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { noteId_topicId: { noteId: "note-1", topicId: "top-3" } },
        })
      );
    });
  });

  // ─── 3. GET /notes Hydration of topicIds ─────────────────────────────────

  describe("3. GET /notes Hydration", () => {
    it("3.1. GET /notes includes additionalTopics and hydrates topicIds array on response items", async () => {
      const response = await request(app).get("/api/notes");

      expect(response.status).toBe(200);
      expect(mockPrisma.note.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { additionalTopics: true },
        })
      );
      expect(response.body).toHaveLength(1);
      expect(response.body[0].topicIds).toEqual(["top-1", "top-2"]);
      expect(response.body[0].sourcePath).toBe("/Vault/Notes/phan-tich.md");
    });
  });

  // ─── 4. Transaction Rollback ─────────────────────────────────────────────

  describe("4. Transaction Rollback", () => {
    it("4.1. Rolls back and returns 500 when NoteTopicLink sync fails", async () => {
      mockPrisma.noteTopicLink.upsert.mockRejectedValue(
        new Error("Foreign key constraint violation on Topic table")
      );

      const response = await request(app)
        .post("/api/notes")
        .send({
          title: "Note Fail Test",
          topicId: "top-invalid",
          topicIds: ["top-invalid"],
          content: "Nội dung",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Foreign key constraint violation");
    });
  });
});
