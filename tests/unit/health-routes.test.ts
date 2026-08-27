import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHealthRouter } from "../../src/server/routes/healthRoutes";

describe("Health Routes Contract", () => {
  it("GET /health trả về status ok và boolean hasApiKey", async () => {
    const mockPrisma: any = {};
    const app = express();
    app.use("/api", createHealthRouter(mockPrisma));

    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(typeof response.body.hasApiKey).toBe("boolean");
    expect(typeof response.body.timestamp).toBe("string");
  });

  it("GET /health/db gọi checkDbHealth và trả về thông tin kết nối DB", async () => {
    const mockPrisma: any = {
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    };

    const app = express();
    app.use("/api", createHealthRouter(mockPrisma));

    const response = await request(app).get("/api/health/db");
    expect(response.status).toBe(200);
    expect(response.body.database).toBe("postgresql");
    expect(response.body.connected).toBe(true);
    expect(response.body.status).toBe("healthy");
  });
});
