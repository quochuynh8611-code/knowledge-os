import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";

describe("Server Router Wiring & Endpoint Registration Smoke Tests", () => {
  it("Đăng ký đầy đủ các route modules mà không gây xung đột 404", async () => {
    const { createHealthRouter } = await import(
      "../../src/server/routes/healthRoutes"
    );
    const { createCategoryRouter } = await import(
      "../../src/server/routes/categoryRoutes"
    );
    const { createTopicRouter } = await import(
      "../../src/server/routes/topicRoutes"
    );
    const { createNoteRouter } = await import(
      "../../src/server/routes/noteRoutes"
    );
    const { createResourceRouter } = await import(
      "../../src/server/routes/resourceRoutes"
    );
    const { createStudyProgressRouter } = await import(
      "../../src/server/routes/studyProgressRoutes"
    );
    const { createSyncRouter } = await import(
      "../../src/server/routes/syncRoutes"
    );
    const { createBackupRouter } = await import(
      "../../src/server/routes/backupRoutes"
    );
    const { createGeminiRouter } = await import(
      "../../src/server/routes/geminiRoutes"
    );

    const mockPrisma: any = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      resource: { findMany: vi.fn().mockResolvedValue([]) },
      tag: { findMany: vi.fn().mockResolvedValue([]) },
      syncSession: { findUnique: vi.fn().mockResolvedValue(null) },
    };

    const mockLimiter: any = {
      check: vi.fn().mockReturnValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 }),
      reset: vi.fn(),
    };

    const app = express();
    app.use(express.json());

    app.use("/api", createHealthRouter(mockPrisma));
    app.use("/api", createCategoryRouter(mockPrisma));
    app.use("/api", createTopicRouter(mockPrisma));
    app.use("/api", createNoteRouter(mockPrisma));
    app.use("/api", createResourceRouter(mockPrisma));
    app.use("/api", createStudyProgressRouter(mockPrisma));
    app.use("/api", createSyncRouter(mockPrisma));
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));
    app.use("/api", createGeminiRouter(() => null));

    // Smoke test endpoints for non-404 status
    const healthRes = await request(app).get("/api/health");
    expect(healthRes.status).toBe(200);

    const categoriesRes = await request(app).get("/api/categories");
    expect(categoriesRes.status).toBe(200);

    const topicsRes = await request(app).get("/api/topics");
    expect(topicsRes.status).toBe(200);

    const notesRes = await request(app).get("/api/notes");
    expect(notesRes.status).toBe(200);

    const resourcesRes = await request(app).get("/api/resources");
    expect(resourcesRes.status).toBe(200);

    const backupExportRes = await request(app).get("/api/backup/export");
    expect(backupExportRes.status).toBe(200);
  });
});
