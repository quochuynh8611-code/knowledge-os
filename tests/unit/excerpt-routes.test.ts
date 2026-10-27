import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createExcerptRouter } from "../../src/server/routes/excerptRoutes";

describe("Excerpt & Inbox REST API Routes", () => {
  it("1. GET /api/excerpts lấy danh sách trích dẫn và hỗ trợ lọc", async () => {
    const mockPrisma: any = {
      researchExcerpt: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "exc-1",
            archivedDocumentId: "doc-1",
            topicId: "top-1",
            targetNoteId: "note-1",
            selectedText: "Trích dẫn nghiên cứu quan trọng",
            positionSelector: { pageNumber: 12 },
            highlightColor: "#F59E0B",
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]),
      },
    };

    const app = express();
    app.use("/api", createExcerptRouter(mockPrisma));

    const res = await request(app).get("/api/excerpts?topicId=top-1&sourceNoteId=note-1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe("exc-1");
    expect(mockPrisma.researchExcerpt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "top-1",
          targetNoteId: "note-1",
        }),
      })
    );
  });

  it("2. POST /api/excerpts tạo trích dẫn mới với Zod validation", async () => {
    const mockPrisma: any = {
      researchExcerpt: {
        create: vi.fn().mockResolvedValue({
          id: "exc-new",
          archivedDocumentId: "doc-1",
          selectedText: "Văn bản trích dẫn mới",
          positionSelector: { pageNumber: 5 },
          highlightColor: "#F59E0B",
          status: "active",
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createExcerptRouter(mockPrisma));

    // Valid creation
    const res = await request(app)
      .post("/api/excerpts")
      .send({
        archivedDocumentId: "doc-1",
        selectedText: "Văn bản trích dẫn mới",
        positionSelector: { pageNumber: 5 },
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("exc-new");
    expect(mockPrisma.researchExcerpt.create).toHaveBeenCalled();

    // Invalid creation (missing required fields)
    const invalidRes = await request(app)
      .post("/api/excerpts")
      .send({
        archivedDocumentId: "doc-1",
        // missing selectedText and positionSelector
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe("VALIDATION_ERROR");
  });

  it("3. PUT /api/excerpts/:id cập nhật nội dung trích dẫn", async () => {
    const mockPrisma: any = {
      researchExcerpt: {
        update: vi.fn().mockResolvedValue({
          id: "exc-1",
          userNote: "Ghi chú đã cập nhật",
          highlightColor: "#10B981",
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createExcerptRouter(mockPrisma));

    const res = await request(app)
      .put("/api/excerpts/exc-1")
      .send({
        userNote: "Ghi chú đã cập nhật",
        highlightColor: "#10B981",
      });

    expect(res.status).toBe(200);
    expect(res.body.userNote).toBe("Ghi chú đã cập nhật");
    expect(mockPrisma.researchExcerpt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exc-1" },
        data: expect.objectContaining({
          userNote: "Ghi chú đã cập nhật",
          highlightColor: "#10B981",
        }),
      })
    );
  });

  it("4. DELETE /api/excerpts/:id xóa trích dẫn", async () => {
    const mockPrisma: any = {
      researchExcerpt: {
        delete: vi.fn().mockResolvedValue({ id: "exc-1" }),
      },
    };

    const app = express();
    app.use("/api", createExcerptRouter(mockPrisma));

    const res = await request(app).delete("/api/excerpts/exc-1");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.researchExcerpt.delete).toHaveBeenCalledWith({
      where: { id: "exc-1" },
    });
  });

  it("5. Inbox items endpoints: GET, POST, PATCH /process, DELETE", async () => {
    const mockPrisma: any = {
      researchExcerpt: {
        findUnique: vi.fn().mockResolvedValue({ id: "exc-1" }),
      },
      researchInboxItem: {
        findMany: vi.fn().mockResolvedValue([
          { id: "inbox-1", excerptId: "exc-1", isProcessed: false, priority: 1 },
        ]),
        create: vi.fn().mockResolvedValue({
          id: "inbox-2",
          excerptId: "exc-1",
          isProcessed: false,
          priority: 0,
        }),
        update: vi.fn().mockResolvedValue({
          id: "inbox-1",
          isProcessed: true,
        }),
        delete: vi.fn().mockResolvedValue({ id: "inbox-1" }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createExcerptRouter(mockPrisma));

    // GET /excerpts/inbox
    const getRes = await request(app).get("/api/excerpts/inbox");
    expect(getRes.status).toBe(200);
    expect(getRes.body[0].id).toBe("inbox-1");

    // POST /excerpts/inbox
    const postRes = await request(app)
      .post("/api/excerpts/inbox")
      .send({ excerptId: "exc-1", priority: 0 });
    expect(postRes.status).toBe(201);
    expect(postRes.body.id).toBe("inbox-2");

    // PATCH /excerpts/inbox/:id/process
    const patchRes = await request(app)
      .patch("/api/excerpts/inbox/inbox-1/process")
      .send({ isProcessed: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.isProcessed).toBe(true);

    // DELETE /excerpts/inbox/:id
    const delRes = await request(app).delete("/api/excerpts/inbox/inbox-1");
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });
});
