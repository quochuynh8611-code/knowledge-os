import { describe, it, expect, vi } from "vitest";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";
import { calculateBackupChecksum } from "../../src/lib/validation";

describe("Backup Service Pure Function & Transaction Contracts", () => {
  const canonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };

  it("1. buildBackupSnapshotFromDb xuất snapshot chuẩn với checksum SHA-256 chính xác", async () => {
    const { buildBackupSnapshotFromDb } = await import(
      "../../src/server/services/backupService"
    );

    const mockDb: any = {
      category: {
        findMany: vi.fn().mockResolvedValue(INITIAL_CATEGORIES),
      },
      topic: {
        findMany: vi.fn().mockResolvedValue(
          INITIAL_TOPICS.map((t) => ({
            ...t,
            createdAt: new Date(),
            updatedAt: new Date(),
            studyProgress: null,
            sourceLinks: [],
          }))
        ),
      },
      note: {
        findMany: vi.fn().mockResolvedValue(
          INITIAL_NOTES.map((n) => ({
            ...n,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        ),
      },
      resource: {
        findMany: vi.fn().mockResolvedValue(
          INITIAL_RESOURCES.map((r) => ({
            ...r,
            createdAt: new Date(),
          }))
        ),
      },
      tag: {
        findMany: vi.fn().mockResolvedValue(INITIAL_TAGS),
      },
    };

    const snapshot = await buildBackupSnapshotFromDb(mockDb);
    expect(snapshot.version).toBe("2.0.0");
    expect(snapshot.counts.categories).toBe(INITIAL_CATEGORIES.length);
    expect(snapshot.counts.topics).toBe(INITIAL_TOPICS.length);
    expect(snapshot.checksum).toBe(calculateBackupChecksum(snapshot.data));
  });

  it("2. executeReplaceRestore thực hiện xóa dữ liệu theo đúng thứ tự Reverse FK Order", async () => {
    const { executeReplaceRestore } = await import(
      "../../src/server/services/backupService"
    );

    const deleteOrder: string[] = [];
    const mockTx: any = {
      resource: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("resource");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      note: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("note");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      knowledgeLink: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("knowledgeLink");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      studyProgress: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("studyProgress");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      topic: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("topic");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      tag: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("tag");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      category: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("category");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
    };

    await executeReplaceRestore(mockTx, canonicalData as any);

    expect(deleteOrder).toEqual([
      "resource",
      "note",
      "knowledgeLink",
      "studyProgress",
      "topic",
      "tag",
      "category",
    ]);
  });

  it("3. executeMergeRestore áp dụng Last-Write-Wins (LWW) chính xác cho topic cập nhật", async () => {
    const { executeMergeRestore } = await import(
      "../../src/server/services/backupService"
    );

    const updatedDate = new Date("2026-06-01T00:00:00.000Z").toISOString();
    const olderDate = new Date("2026-01-01T00:00:00.000Z");

    const mockTx: any = {
      category: { upsert: vi.fn().mockResolvedValue({}) },
      tag: { upsert: vi.fn().mockResolvedValue({}) },
      topic: {
        findUnique: vi.fn().mockResolvedValue({
          id: "top-1",
          slug: "tu-dieu-de",
          updatedAt: olderDate,
          studyProgress: null,
        }),
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      knowledgeLink: { upsert: vi.fn().mockResolvedValue({}) },
      studyProgress: {
        update: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
      },
      note: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      resource: { upsert: vi.fn().mockResolvedValue({}) },
    };

    const singleTopicData = {
      categories: [],
      tags: [],
      topics: [
        {
          id: "top-1",
          title: "Tứ Diệu Đế (Cập nhật)",
          slug: "tu-dieu-de",
          categoryId: "cat-phat-hoc",
          type: "phat-hoc",
          description: "Mô tả mới",
          content: "Nội dung mới",
          tags: ["PhatHoc"],
          updatedAt: updatedDate,
          links: [],
        },
      ],
      notes: [],
      resources: [],
    };

    await executeMergeRestore(mockTx, singleTopicData as any);

    expect(mockTx.topic.update).toHaveBeenCalledTimes(1);
    expect(mockTx.topic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "tu-dieu-de" },
      })
    );
  });
});
