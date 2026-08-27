import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import {
  createRateLimiter,
  createRateLimitMiddleware,
} from "../../src/lib/security";

describe("Server Middleware Scope & Mount-Order Contracts", () => {
  it("E1: Gemini rate limiter prefix middleware chỉ áp dụng cho /api/gemini và không chặn route khác", async () => {
    const { createCategoryRouter } = await import(
      "../../src/server/routes/categoryRoutes"
    );
    const { createGeminiRouter } = await import(
      "../../src/server/routes/geminiRoutes"
    );

    const mockPrisma: any = {
      category: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const exhaustedGeminiLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 0, // Exhausted
    });

    const app = express();
    app.use(express.json());

    // Scoped prefix middleware matching server.ts behavior
    app.use(
      "/api/gemini",
      createRateLimitMiddleware(
        exhaustedGeminiLimiter,
        "Quá nhiều yêu cầu nghiên cứu AI"
      )
    );

    app.use("/api", createCategoryRouter(mockPrisma));
    app.use("/api", createGeminiRouter(() => null));

    // 1. Request to categories should PASS (not 429)
    const categoryRes = await request(app).get("/api/categories");
    expect(categoryRes.status).toBe(200);

    // 2. Request to gemini should be BLOCKED with 429
    const geminiRes = await request(app)
      .post("/api/gemini/research")
      .send({ prompt: "Khảo cứu" });
    expect(geminiRes.status).toBe(429);
    expect(geminiRes.body.error).toBe("TOO_MANY_REQUESTS");
  });

  it("E2: Restore rate limiter KHÔNG ảnh hưởng tới GET /api/backup/export", async () => {
    const { createBackupRouter } = await import(
      "../../src/server/routes/backupRoutes"
    );

    const mockPrisma: any = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      resource: { findMany: vi.fn().mockResolvedValue([]) },
      tag: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const exhaustedRestoreLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 0, // Exhausted
    });

    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, exhaustedRestoreLimiter));

    // GET export is not subject to restore rate limiter
    const exportRes = await request(app).get("/api/backup/export");
    expect(exportRes.status).toBe(200);
  });

  it("E3: Restore rate limiter chặn POST /api/backup/restore với 429 khi vượt hạn mức", async () => {
    const { createBackupRouter } = await import(
      "../../src/server/routes/backupRoutes"
    );

    const mockPrisma: any = {};
    const exhaustedRestoreLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 0, // Exhausted
    });

    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, exhaustedRestoreLimiter));

    const restoreRes = await request(app)
      .post("/api/backup/restore")
      .send({
        snapshot: { version: "2.0.0" },
        mode: "replace",
      });

    expect(restoreRes.status).toBe(429);
    expect(restoreRes.body.error).toBe("TOO_MANY_REQUESTS");
  });
});
