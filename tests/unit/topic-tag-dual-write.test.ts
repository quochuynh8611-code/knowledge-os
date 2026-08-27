import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";
import { normalizeTopicTags, generateTagSlug } from "../../src/lib/researchStorageHelpers";

describe("Phase P1.2 — Topic Tag Dual-Write Sync Contract", () => {
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
        return callback(mockPrisma);
      }),
      category: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cat-phat-hoc",
          name: "Phật Học",
          slug: "phat-hoc",
          type: "phat-hoc",
        }),
      },
      topic: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: data.id || "top-new-1",
          ...data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        update: vi.fn().mockImplementation(async ({ where, data }) => ({
          id: where.id,
          ...data,
          updatedAt: new Date().toISOString(),
        })),
        delete: vi.fn().mockResolvedValue({ id: "top-1" }),
      },
      tag: {
        upsert: vi.fn().mockImplementation(async ({ where, create, update }) => ({
          id: `tag-${where.slug}`,
          slug: where.slug,
          name: create?.name || update?.name || "Tag",
          color: "#D97706",
          count: 1,
        })),
        findMany: vi.fn().mockResolvedValue([]),
      },
      topicTag: {
        upsert: vi.fn().mockImplementation(async ({ where, create }) => ({
          topicId: where.topicId_tagId?.topicId || create.topicId,
          tagId: where.topicId_tagId?.tagId || create.tagId,
        })),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));
  });

  // ─── Helper Tests ─────────────────────────────────────────────────────────

  describe("Tag Helpers (generateTagSlug & normalizeTopicTags)", () => {
    it("1.1. generateTagSlug creates clean lowercase slugs for Vietnamese & English tags", () => {
      expect(generateTagSlug("Phật Học")).toBe("phật-học");
      expect(generateTagSlug("Vi Diệu Pháp (Abhidharma)")).toBe("vi-diệu-pháp-abhidharma");
      expect(generateTagSlug("   Thiền Định   ")).toBe("thiền-định");
      expect(generateTagSlug("")).toBe("tag");
    });

    it("1.2. normalizeTopicTags sanitizes whitespace, removes blanks, and deduplicates", () => {
      const input = ["  Phật Học  ", "", "   ", "Phật Học", "Tứ Diệu Đế"];
      const output = normalizeTopicTags(input);
      expect(output).toEqual(["Phật Học", "Tứ Diệu Đế"]);
    });
  });

  // ─── Topic Creation Dual-Write ───────────────────────────────────────────

  describe("Topic Creation Dual-Write", () => {
    it("2.1. POST /topics creates Topic and dual-writes to Tag and TopicTag in a $transaction", async () => {
      const response = await request(app)
        .post("/api/topics")
        .send({
          title: "Bát Chánh Đạo Toàn Thư",
          categoryId: "cat-phat-hoc",
          tags: ["Phật Học", "Đạo Đế"],
        });

      expect(response.status).toBe(201);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(mockPrisma.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Bát Chánh Đạo Toàn Thư",
            tags: ["Phật Học", "Đạo Đế"],
          }),
        })
      );
      // Verify Tag upserts for both tags
      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "phật-học" },
          create: expect.objectContaining({ name: "Phật Học", slug: "phật-học" }),
        })
      );
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "đạo-đế" },
          create: expect.objectContaining({ name: "Đạo Đế", slug: "đạo-đế" }),
        })
      );
      // Verify TopicTag upserts linking topic with both tags
      expect(mockPrisma.topicTag.upsert).toHaveBeenCalledTimes(2);
    });

    it("2.2. POST /topics sanitizes dirty tags before creating Topic, Tag, and TopicTag", async () => {
      const response = await request(app)
        .post("/api/topics")
        .send({
          title: "Kinh Đại Niệm Xứ",
          categoryId: "cat-phat-hoc",
          tags: ["  Thiền Định  ", "Thiền Định", "", "   ", "Tứ Niệm Xứ"],
        });

      expect(response.status).toBe(201);
      expect(mockPrisma.topic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: ["Thiền Định", "Tứ Niệm Xứ"],
          }),
        })
      );
      expect(mockPrisma.tag.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.topicTag.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Topic Update Dual-Write & Pruning ────────────────────────────────────

  describe("Topic Update Dual-Write & Pruning", () => {
    it("3.1. PUT /topics/:id updates Topic.tags and prunes obsolete TopicTag links in a $transaction", async () => {
      // Mock existing tag lookup for topic
      mockPrisma.topicTag.findMany.mockResolvedValue([
        { topicId: "top-1", tagId: "tag-phật-học", tag: { slug: "phật-học", name: "Phật Học" } },
        { topicId: "top-1", tagId: "tag-đạo-đế", tag: { slug: "đạo-đế", name: "Đạo Đế" } },
      ]);

      const response = await request(app)
        .put("/api/topics/top-1")
        .send({
          title: "Bát Chánh Đạo (Mới)",
          tags: ["Phật Học", "Tứ Diệu Đế"], // "Đạo Đế" removed, "Tứ Diệu Đế" added
        });

      expect(response.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
      expect(mockPrisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "top-1" },
          data: expect.objectContaining({
            tags: ["Phật Học", "Tứ Diệu Đế"],
          }),
        })
      );
      // Obsolete tag "Đạo Đế" link pruned
      expect(mockPrisma.topicTag.deleteMany).toHaveBeenCalled();
      // New tag "Tứ Diệu Đế" upserted
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: "tứ-diệu-đế" },
        })
      );
    });
  });

  // ─── Transaction Rollback on Failure ─────────────────────────────────────

  describe("Transaction Integrity & Rollback", () => {
    it("4.1. Rolls back and returns 500 when Tag/TopicTag sync fails inside $transaction", async () => {
      mockPrisma.tag.upsert.mockRejectedValue(new Error("Database deadlock on Tag table"));

      const response = await request(app)
        .post("/api/topics")
        .send({
          title: "Topic Fail Test",
          categoryId: "cat-phat-hoc",
          tags: ["Tag Loi"],
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain("Database deadlock on Tag table");
    });
  });
});
