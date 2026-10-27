import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

import { createLinkRouter } from "../../src/server/routes/linkRoutes";

describe("Phase 3 Unit: Knowledge Link Routes Contract (ADR-079 / PR-1)", () => {
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      topic: {
        findUnique: vi.fn().mockImplementation(async ({ where }: any) => {
          if (where.id === "top-1" || where.id === "top-2") {
            return { id: where.id, title: `Topic ${where.id}` };
          }
          return null;
        }),
      },
      knowledgeLink: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({
          id: data.id || "link-generated-1",
          ...data,
          createdAt: new Date().toISOString(),
        })),
        upsert: vi.fn().mockImplementation(async ({ create }: any) => ({
          id: create.id || "link-generated-1",
          ...create,
          createdAt: new Date().toISOString(),
        })),
        delete: vi.fn().mockResolvedValue({ id: "link-1" }),
      },
    };

    app = express();
    app.use(express.json());
    const router = createLinkRouter(mockPrisma);
    app.use("/api", router);
  });

  // ─── 1. Link Creation ────────────────────────────────────────────────────

  it("1.1. POST /api/links creates a new KnowledgeLink and returns HTTP 201", async () => {
    const response = await request(app)
      .post("/api/links")
      .send({
        sourceId: "top-1",
        targetId: "top-2",
        linkType: "related",
        strength: 3,
        notes: "Mối liên hệ tương quan giữa hai chủ đề",
      });

    expect(response.status).toBe(201);
    expect(response.body.sourceId).toBe("top-1");
    expect(response.body.targetId).toBe("top-2");
    expect(response.body.linkType).toBe("related");
    expect(mockPrisma.knowledgeLink.create).toHaveBeenCalled();
  });

  // ─── 2. Self-link Rejection ──────────────────────────────────────────────

  it("2.1. POST /api/links rejects self-links where sourceId === targetId with HTTP 400", async () => {
    const response = await request(app)
      .post("/api/links")
      .send({
        sourceId: "top-1",
        targetId: "top-1",
        linkType: "related",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/self|trùng|tự trỏ/i);
    expect(mockPrisma.knowledgeLink.create).not.toHaveBeenCalled();
  });

  // ─── 3. Validation Guard ─────────────────────────────────────────────────

  it("3.1. POST /api/links rejects missing required fields with HTTP 400", async () => {
    const response = await request(app)
      .post("/api/links")
      .send({
        sourceId: "top-1",
        // missing targetId and linkType
      });

    expect(response.status).toBe(400);
    expect(mockPrisma.knowledgeLink.create).not.toHaveBeenCalled();
  });

  it("3.2. POST /api/links returns HTTP 400 when source or target topic does not exist", async () => {
    const response = await request(app)
      .post("/api/links")
      .send({
        sourceId: "top-non-existent",
        targetId: "top-2",
        linkType: "related",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/topic|không tồn tại/i);
    expect(mockPrisma.knowledgeLink.create).not.toHaveBeenCalled();
  });

  // ─── 4. Duplicate Guard ──────────────────────────────────────────────────

  it("4.1. POST /api/links returns conflict or idempotent update when duplicate link exists", async () => {
    // Existing link with same sourceId + targetId + linkType
    mockPrisma.knowledgeLink.findFirst.mockResolvedValue({
      id: "link-existing-1",
      sourceId: "top-1",
      targetId: "top-2",
      linkType: "related",
      strength: 3,
    });

    const response = await request(app)
      .post("/api/links")
      .send({
        sourceId: "top-1",
        targetId: "top-2",
        linkType: "related",
        strength: 4,
      });

    // Idempotent upsert returns 200 with existing/updated id, or 409 conflict
    expect([200, 409]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.id).toBe("link-existing-1");
    }
  });

  // ─── 5. Link Deletion ────────────────────────────────────────────────────

  it("5.1. DELETE /api/links/:id removes the link with HTTP 200", async () => {
    const response = await request(app).delete("/api/links/link-1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.id).toBe("link-1");
    expect(mockPrisma.knowledgeLink.delete).toHaveBeenCalledWith({
      where: { id: "link-1" },
    });
  });

  it("5.2. DELETE /api/links/:id returns HTTP 200 idempotent when link was already deleted (P2025)", async () => {
    const p2025Error: any = new Error("Record to delete does not exist.");
    p2025Error.code = "P2025";
    mockPrisma.knowledgeLink.delete.mockRejectedValue(p2025Error);

    const response = await request(app).delete("/api/links/link-already-deleted");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.alreadyDeleted).toBe(true);
  });

  // ─── 6. Link Listing & Filtering ─────────────────────────────────────────

  it("6.1. GET /api/links?topicId=:id returns links where topic is either source or target", async () => {
    mockPrisma.knowledgeLink.findMany.mockResolvedValue([
      {
        id: "link-1",
        sourceId: "top-1",
        targetId: "top-2",
        linkType: "related",
        strength: 3,
        source: { id: "top-1", title: "Topic 1" },
        target: { id: "top-2", title: "Topic 2" },
      },
      {
        id: "link-2",
        sourceId: "top-3",
        targetId: "top-1",
        linkType: "prerequisite",
        strength: 4,
        source: { id: "top-3", title: "Topic 3" },
        target: { id: "top-1", title: "Topic 1" },
      },
    ]);

    const response = await request(app).get("/api/links?topicId=top-1");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(mockPrisma.knowledgeLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ sourceId: "top-1" }, { targetId: "top-1" }],
        },
      })
    );
  });
});
