import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createStudyProgressRouter } from "../../src/server/routes/studyProgressRoutes";

describe("Study Progress Routes Contract", () => {
  it("1. POST /study-progress tạo mới study progress khi chưa tồn tại", async () => {
    const mockPrisma: any = {
      studyProgress: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async ({ create }) => ({
          id: "sp-top-1",
          ...create,
        })),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createStudyProgressRouter(mockPrisma));

    const response = await request(app)
      .post("/api/study-progress")
      .send({
        topicId: "top-1",
        quality: 4,
      });

    expect(response.status).toBe(200);
    expect(response.body.topicId).toBe("top-1");
    expect(response.body.repetitions).toBe(1);
    expect(response.body.timeSpent).toBe(15);
  });

  it("2. POST /study-progress cộng dồn repetitions và timeSpent khi đã tồn tại", async () => {
    const mockPrisma: any = {
      studyProgress: {
        findUnique: vi.fn().mockResolvedValue({
          id: "sp-top-1",
          topicId: "top-1",
          repetitions: 3,
          timeSpent: 45,
        }),
        upsert: vi.fn().mockImplementation(async ({ update }) => ({
          id: "sp-top-1",
          topicId: "top-1",
          repetitions: update.repetitions,
          timeSpent: update.timeSpent,
        })),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createStudyProgressRouter(mockPrisma));

    const response = await request(app)
      .post("/api/study-progress")
      .send({
        topicId: "top-1",
        quality: 5,
      });

    expect(response.status).toBe(200);
    expect(response.body.repetitions).toBe(4);
    expect(response.body.timeSpent).toBe(60);
  });

  it("3. POST /study-progress trả về 400 khi thiếu topicId", async () => {
    const mockPrisma: any = {};
    const app = express();
    app.use(express.json());
    app.use("/api", createStudyProgressRouter(mockPrisma));

    const response = await request(app)
      .post("/api/study-progress")
      .send({ quality: 4 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });
});
