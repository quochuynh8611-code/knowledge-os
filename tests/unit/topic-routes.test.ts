import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createTopicRouter } from "../../src/server/routes/topicRoutes";

describe("Topic Routes Contract", () => {
  it("1. GET /topics trả về danh sách topics bao gồm đầy đủ relations", async () => {
    const mockPrisma: any = {
      topic: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "top-1",
            title: "Tứ Diệu Đế",
            slug: "tu-dieu-de",
            category: { id: "cat-1", name: "Phật Học" },
            notes: [],
            resources: [],
            studyProgress: null,
            sourceLinks: [],
            targetLinks: [],
          },
        ]),
      },
    };

    const app = express();
    app.use("/api", createTopicRouter(mockPrisma));

    const res = await request(app).get("/api/topics");
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("Tứ Diệu Đế");
    expect(mockPrisma.topic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          category: true,
          notes: true,
          resources: true,
          studyProgress: true,
          sourceLinks: true,
          targetLinks: true,
        },
        orderBy: { updatedAt: "desc" },
      })
    );
  });

  it("2. POST /topics kế thừa category type khi type = general", async () => {
    const mockPrisma: any = {
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
          id: "new-top-1",
          ...data,
        })),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));

    const response = await request(app)
      .post("/api/topics")
      .send({
        title: "Bát Chánh Đạo",
        categoryId: "cat-phat-hoc",
        type: "general",
        description: "Mô tả cơ bản",
        content: "Nội dung học...",
        tags: ["PhatHoc"],
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
      where: { id: "cat-phat-hoc" },
    });
    expect(mockPrisma.topic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "phat-hoc",
        }),
      })
    );
  });

  it("3. PUT /topics/:id cập nhật topic thành công", async () => {
    const mockPrisma: any = {
      topic: {
        update: vi.fn().mockResolvedValue({
          id: "top-1",
          title: "Bát Chánh Đạo (Đã sửa)",
          description: "Mô tả mới",
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));

    const response = await request(app)
      .put("/api/topics/top-1")
      .send({
        title: "Bát Chánh Đạo (Đã sửa)",
        description: "Mô tả mới",
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe("Bát Chánh Đạo (Đã sửa)");
  });

  it("4. DELETE /topics/:id xóa topic thành công", async () => {
    const mockPrisma: any = {
      topic: {
        delete: vi.fn().mockResolvedValue({ id: "top-1" }),
      },
    };

    const app = express();
    app.use("/api", createTopicRouter(mockPrisma));

    const response = await request(app).delete("/api/topics/top-1");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, id: "top-1" });
  });

  it("5. POST /topics tự động tìm và gán Category ID khi user truyền category slug", async () => {
    const mockPrisma: any = {
      category: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null) // by id -> null
          .mockResolvedValueOnce({
            id: "cat-uuid-phathoc",
            slug: "phat-hoc",
            type: "phat-hoc",
          }), // by slug -> found
      },
      topic: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: "new-top-slug",
          ...data,
        })),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createTopicRouter(mockPrisma));

    const response = await request(app)
      .post("/api/topics")
      .send({
        title: "Tứ Niệm Xứ",
        categoryId: "phat-hoc", // Dùng slug
        type: "phat-hoc",
        description: "Khảo cứu thực hành",
        content: "Nội dung",
      });

    expect(response.status).toBe(201);
    expect(mockPrisma.topic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          categoryId: "cat-uuid-phathoc",
        }),
      })
    );
  });
});
