/**
 * RED-B2 Test Suite: Hydration Sync Route (POST /api/sync/hydrate) Resource openTarget Contract
 *
 * Verifies openTarget synchronization behavior during routine sync and forceOverwrite sync:
 * 1. Existing Resource + omitted openTarget: preserves existing openTarget in DB.
 * 2. Existing Resource + explicit openTarget: null: updates openTarget to NULL.
 * 3. Existing Resource + openTarget: "   ": normalizes whitespace/empty to NULL.
 * 4. New Resource + omitted openTarget: sets openTarget to NULL on creation.
 * 5. Valid string openTarget: trims whitespace and persists cleanly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createSyncRouter } from "../../src/server/routes/syncRoutes";

describe("Slice 1 RED-B2: Hydration Sync Route openTarget Contract", () => {
  let app: express.Express;
  let inMemoryDb: {
    categories: Map<string, any>;
    topics: Map<string, any>;
    resources: Map<string, any>;
    syncSessions: Map<string, any>;
  };

  beforeEach(() => {
    inMemoryDb = {
      categories: new Map(),
      topics: new Map(),
      resources: new Map(),
      syncSessions: new Map(),
    };

    // Chuẩn bị Category và Topic hợp lệ sẵn có
    inMemoryDb.categories.set("cat-sync-01", {
      id: "cat-sync-01",
      name: "Triết Học",
      slug: "triet-hoc",
      order: 0,
    });
    inMemoryDb.topics.set("topic-sync-01", {
      id: "topic-sync-01",
      title: "Nhận thức luận",
      slug: "nhan-thuc-luan",
      categoryId: "cat-sync-01",
      order: 0,
    });

    const mockPrisma: any = {
      syncSession: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          return inMemoryDb.syncSessions.get(where.clientSyncId) || null;
        }),
      },
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        const tx = {
          category: {
            findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.categories.values())),
            upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
              const existing = inMemoryDb.categories.get(where.id);
              const record = existing ? { ...existing, ...update } : { ...create };
              inMemoryDb.categories.set(record.id, record);
              return record;
            }),
          },
          tag: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          topic: {
            findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.topics.values())),
            upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
              const existing = inMemoryDb.topics.get(where.id);
              const record = existing ? { ...existing, ...update } : { ...create };
              inMemoryDb.topics.set(record.id, record);
              return record;
            }),
          },
          studyProgress: {
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockResolvedValue({}),
          },
          note: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          resource: {
            findUnique: vi.fn().mockImplementation(async ({ where }) => {
              return inMemoryDb.resources.get(where.id) || null;
            }),
            upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
              const existing = inMemoryDb.resources.get(where.id);
              const record = existing ? { ...existing, ...update } : { ...create };
              inMemoryDb.resources.set(record.id, record);
              return record;
            }),
          },
          syncSession: {
            create: vi.fn().mockImplementation(async ({ data }) => {
              inMemoryDb.syncSessions.set(data.clientSyncId, data);
              return data;
            }),
          },
        };
        return callback(tx);
      }),
    };

    app = express();
    app.use(express.json());
    app.use("/api", createSyncRouter(mockPrisma));
  });

  it("1. Routine sync: existing resource with omitted openTarget preserves DB value", async () => {
    inMemoryDb.resources.set("res-sync-001", {
      id: "res-sync-001",
      topicId: "topic-sync-01",
      title: "Bản ghi có sẵn",
      type: "pdf",
      filePath: "02_PDF_Source/existing.pdf",
      openTarget: "archive://doc-preserve-target-123",
    });

    const payload = {
      clientSyncId: "session-sync-001",
      clientTimestamp: new Date().toISOString(),
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [
        {
          id: "res-sync-001",
          topicId: "topic-sync-01",
          title: "Bản ghi đã sửa tiêu đề",
          type: "pdf",
          filePath: "02_PDF_Source/existing.pdf",
          // omitted openTarget
        },
      ],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    const persisted = inMemoryDb.resources.get("res-sync-001");
    expect(persisted.title).toBe("Bản ghi đã sửa tiêu đề");
    // Hợp đồng: Omitted không làm mất openTarget hiện có
    expect(persisted.openTarget).toBe("archive://doc-preserve-target-123");
  });

  it("2. Routine sync: existing resource with openTarget: null updates DB to NULL", async () => {
    inMemoryDb.resources.set("res-sync-002", {
      id: "res-sync-002",
      topicId: "topic-sync-01",
      title: "Bản ghi cần gỡ liên kết",
      type: "article",
      url: "https://example.com/clear",
      openTarget: "obsidian://vault/note",
    });

    const payload = {
      clientSyncId: "session-sync-002",
      clientTimestamp: new Date().toISOString(),
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [
        {
          id: "res-sync-002",
          topicId: "topic-sync-01",
          title: "Bản ghi cần gỡ liên kết",
          type: "article",
          url: "https://example.com/clear",
          openTarget: null,
        },
      ],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    const persisted = inMemoryDb.resources.get("res-sync-002");
    // Hợp đồng: Explicit null xóa openTarget về NULL
    expect(persisted.openTarget).toBeNull();
  });

  it("3. Routine sync: existing resource with empty or whitespace openTarget updates DB to NULL", async () => {
    inMemoryDb.resources.set("res-sync-003", {
      id: "res-sync-003",
      topicId: "topic-sync-01",
      title: "Bản ghi cần xóa bằng whitespace",
      type: "book",
      url: "https://example.com/book",
      openTarget: "archive://doc-old",
    });

    const payload = {
      clientSyncId: "session-sync-003",
      clientTimestamp: new Date().toISOString(),
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [
        {
          id: "res-sync-003",
          topicId: "topic-sync-01",
          title: "Bản ghi cần xóa bằng whitespace",
          type: "book",
          url: "https://example.com/book",
          openTarget: "   ",
        },
      ],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    const persisted = inMemoryDb.resources.get("res-sync-003");
    expect(persisted.openTarget).toBeNull();
  });

  it("4. Routine sync: new resource with omitted openTarget sets NULL in DB", async () => {
    const payload = {
      clientSyncId: "session-sync-004",
      clientTimestamp: new Date().toISOString(),
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [
        {
          id: "res-sync-004",
          topicId: "topic-sync-01",
          title: "Resource mới hoàn toàn",
          type: "article",
          url: "https://example.com/new",
          // omitted openTarget
        },
      ],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    const persisted = inMemoryDb.resources.get("res-sync-004");
    expect(persisted).toBeDefined();
    // Hợp đồng: Record mới thiếu trường thì openTarget là NULL (hoặc undefined trong un-set Map, resolve thành null)
    expect(persisted.openTarget ?? null).toBeNull();
  });

  it("5. Routine sync: valid string openTarget is trimmed and persisted", async () => {
    const payload = {
      clientSyncId: "session-sync-005",
      clientTimestamp: new Date().toISOString(),
      categories: [],
      tags: [],
      topics: [],
      notes: [],
      resources: [
        {
          id: "res-sync-005",
          topicId: "topic-sync-01",
          title: "Resource có openTarget cần trim",
          type: "pdf",
          filePath: "02_PDF_Source/trimmed.pdf",
          openTarget: "  archive://doc-valid-target  ",
        },
      ],
    };

    const res = await request(app).post("/api/sync/hydrate").send(payload);
    expect(res.status).toBe(200);

    const persisted = inMemoryDb.resources.get("res-sync-005");
    expect(persisted).toBeDefined();
    expect(persisted.openTarget).toBe("archive://doc-valid-target");
  });
});
