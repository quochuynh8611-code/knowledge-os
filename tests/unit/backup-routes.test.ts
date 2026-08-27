import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createBackupRouter } from "../../src/server/routes/backupRoutes";
import { calculateBackupChecksum } from "../../src/lib/validation";
import { createRateLimiter } from "../../src/lib/security";

describe("Backup Routes Contract", () => {
  it("1. GET /backup/export xuất dữ liệu snapshot đầy đủ", async () => {
    const mockPrisma: any = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          { id: "cat-1", name: "Phật Học", slug: "phat-hoc", type: "phat-hoc" },
        ]),
      },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      resource: { findMany: vi.fn().mockResolvedValue([]) },
      tag: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const mockLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    const app = express();
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app).get("/api/backup/export");
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("2.0.0");
    expect(res.body.counts.categories).toBe(1);
    expect(res.body.checksum).toBeDefined();
  });

  it("2. POST /backup/restore từ chối với CHECKSUM_MISMATCH khi checksum không khớp", async () => {
    const mockPrisma: any = {
      $transaction: vi.fn(),
    };

    const mockLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/backup/restore")
      .send({
        snapshot: {
          version: "2.0.0",
          exportedAt: new Date().toISOString(),
          checksum: "0000000000000000000000000000000000000000000000000000000000000000",
          counts: { categories: 0, topics: 0, notes: 0, resources: 0, tags: 0 },
          data: {
            categories: [],
            topics: [],
            notes: [],
            resources: [],
            tags: [],
          },
        },
        mode: "merge",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("CHECKSUM_MISMATCH");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("3. POST /backup/restore thực hiện restore thành công khi checksum hợp lệ", async () => {
    const rawData = {
      categories: [{ id: "cat-1", name: "Phật Học", slug: "phat-hoc", type: "phat-hoc", description: "", parentId: null, icon: "", color: "", order: 0 }],
      topics: [],
      notes: [],
      resources: [],
      tags: [],
    };
    const validChecksum = calculateBackupChecksum(rawData);

    const mockTx: any = {
      category: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      topic: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      note: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      resource: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      tag: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      studyProgress: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      knowledgeLink: {
        deleteMany: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    const mockPrisma: any = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    const mockLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/backup/restore")
      .send({
        snapshot: {
          version: "2.0.0",
          exportedAt: new Date().toISOString(),
          checksum: validChecksum,
          counts: { categories: 1, topics: 0, notes: 0, resources: 0, tags: 0 },
          data: rawData,
        },
        mode: "replace",
        confirmReplace: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe("replace");
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("4. POST /backup/restore bị chặn 429 khi limiter hết hạn mức", async () => {
    const mockPrisma: any = {};
    const exhaustedLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 0 });
    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, exhaustedLimiter));

    const res = await request(app)
      .post("/api/backup/restore")
      .send({
        snapshot: { version: "2.0.0" },
        mode: "replace",
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe("TOO_MANY_REQUESTS");
  });
});
