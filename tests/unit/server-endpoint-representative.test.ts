import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";

describe("Server Representative Endpoint Contracts", () => {
  it("D1: POST /api/topics resolve category type khi type = general", async () => {
    const { createTopicRouter } = await import(
      "../../src/server/routes/topicRoutes"
    );

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

  it("D2: POST /api/sync/hydrate trả về summary có sẵn khi session đã completed (Idempotency)", async () => {
    const { createSyncRouter } = await import(
      "../../src/server/routes/syncRoutes"
    );

    const existingSummary = {
      categoriesUpserted: 8,
      topicsUpserted: 35,
      notesUpserted: 5,
      resourcesUpserted: 4,
      tagsUpserted: 12,
      linksUpserted: 0,
      progressMerged: 0,
    };

    const mockPrisma: any = {
      syncSession: {
        findUnique: vi.fn().mockResolvedValue({
          clientSyncId: "sync-session-001",
          status: "completed",
          processedAt: new Date("2026-06-01T00:00:00Z"),
          summary: existingSummary,
        }),
      },
      $transaction: vi.fn(),
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));

    const response = await request(app)
      .post("/api/sync/hydrate")
      .send({
        clientSyncId: "sync-session-001",
        version: "2.0.0",
        clientTimestamp: new Date().toISOString(),
        categories: [],
        topics: [],
        notes: [],
        resources: [],
        tags: [],
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.summary).toEqual(existingSummary);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("D3: POST /api/backup/restore ngắt ngay với CHECKSUM_MISMATCH khi payload bị sai lệch", async () => {
    const { createBackupRouter } = await import(
      "../../src/server/routes/backupRoutes"
    );

    const mockPrisma: any = {
      $transaction: vi.fn(),
    };
    const mockLimiter: any = {
      check: vi.fn().mockReturnValue({ allowed: true, remaining: 5, retryAfterSeconds: 0 }),
      reset: vi.fn(),
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const response = await request(app)
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

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("CHECKSUM_MISMATCH");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("D4: GET /api/obsidian/vault/status và /file contract khi chưa cấu hình vault", async () => {
    const { createObsidianVaultRouter } = await import(
      "../../src/server/routes/obsidianVaultRoutes"
    );

    const app = express();
    app.use(express.json());
    app.use("/api", createObsidianVaultRouter(() => undefined));

    const statusRes = await request(app).get("/api/obsidian/vault/status");
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.configured).toBe(false);
    expect(statusRes.body.accessible).toBe(false);

    const fileRes = await request(app).get("/api/obsidian/vault/file?path=Phat-Hoc/Test.md");
    expect(fileRes.status).toBe(503);
    expect(fileRes.body.error).toBe("VAULT_NOT_CONFIGURED");
  });
});
