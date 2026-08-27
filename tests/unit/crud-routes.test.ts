import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createCategoryRouter } from "../../src/server/routes/categoryRoutes";
import { createNoteRouter } from "../../src/server/routes/noteRoutes";
import { createResourceRouter } from "../../src/server/routes/resourceRoutes";

describe("CRUD Routes Contract (Categories, Notes, Resources)", () => {
  describe("Categories CRUD", () => {
    it("GET /categories trả về danh sách categories", async () => {
      const mockPrisma: any = {
        category: {
          findMany: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Phật Học", slug: "phat-hoc" }]),
        },
      };
      const app = express();
      app.use("/api", createCategoryRouter(mockPrisma));

      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "cat-1", name: "Phật Học", slug: "phat-hoc" }]);
    });

    it("POST /categories tạo category mới với 201 Created", async () => {
      const mockPrisma: any = {
        category: {
          create: vi.fn().mockResolvedValue({ id: "cat-new", name: "Đạo Học", slug: "dao-hoc" }),
        },
      };
      const app = express();
      app.use(express.json());
      app.use("/api", createCategoryRouter(mockPrisma));

      const res = await request(app)
        .post("/api/categories")
        .send({ name: "Đạo Học", slug: "dao-hoc" });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe("dao-hoc");
    });
  });

  describe("Notes CRUD", () => {
    it("GET /notes trả về danh sách notes", async () => {
      const mockPrisma: any = {
        note: {
          findMany: vi.fn().mockResolvedValue([{ id: "n-1", title: "Ghi chú 1" }]),
        },
      };
      const app = express();
      app.use("/api", createNoteRouter(mockPrisma));

      const res = await request(app).get("/api/notes");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "n-1", title: "Ghi chú 1" }]);
    });

    it("DELETE /notes/:id xóa note thành công", async () => {
      const mockPrisma: any = {
        note: {
          delete: vi.fn().mockResolvedValue({ id: "n-1" }),
        },
      };
      const app = express();
      app.use("/api", createNoteRouter(mockPrisma));

      const res = await request(app).delete("/api/notes/n-1");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, id: "n-1" });
    });
  });

  describe("Resources CRUD", () => {
    it("GET /resources trả về danh sách resources", async () => {
      const mockPrisma: any = {
        resource: {
          findMany: vi.fn().mockResolvedValue([{ id: "r-1", title: "Tài liệu 1" }]),
        },
      };
      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).get("/api/resources");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: "r-1", title: "Tài liệu 1" }]);
    });

    it("DELETE /resources/:id xóa resource thành công", async () => {
      const mockPrisma: any = {
        resource: {
          delete: vi.fn().mockResolvedValue({ id: "r-1" }),
        },
      };
      const app = express();
      app.use("/api", createResourceRouter(mockPrisma));

      const res = await request(app).delete("/api/resources/r-1");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, id: "r-1" });
    });
  });
});
