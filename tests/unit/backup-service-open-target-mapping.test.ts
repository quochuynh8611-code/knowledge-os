/**
 * RED-B3 Test Suite: Backup & Restore Service Resource openTarget Mapping Contract
 *
 * Checks:
 * 1. buildBackupSnapshotFromDb maps Resource.openTarget into JSON snapshot data.
 * 2. executeMergeRestore: existing record + omitted openTarget preserves DB value.
 * 3. executeMergeRestore: existing record + explicit null/empty clears openTarget to NULL.
 * 4. executeMergeRestore: new record + omitted openTarget sets openTarget to NULL.
 * 5. executeReplaceRestore: legacy snapshot lacking openTarget creates records with NULL.
 * 6. Sibling fields (id, topicId, title, type, url, filePath, notes) remain completely intact.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildBackupSnapshotFromDb,
  executeMergeRestore,
  executeReplaceRestore,
} from "../../src/server/services/backupService";
import type { ValidatedBackupSnapshot } from "../../src/lib/validation";

describe("Slice 1 RED-B3: Backup & Restore Resource openTarget Mapping Contract", () => {
  let inMemoryDb: {
    categories: Map<string, any>;
    topics: Map<string, any>;
    notes: Map<string, any>;
    resources: Map<string, any>;
    tags: Map<string, any>;
    flashcards: Map<string, any>;
    archivedDocuments: Map<string, any>;
    noteTopicLinks: Map<string, any>;
  };

  beforeEach(() => {
    inMemoryDb = {
      categories: new Map(),
      topics: new Map(),
      notes: new Map(),
      resources: new Map(),
      tags: new Map(),
      flashcards: new Map(),
      archivedDocuments: new Map(),
      noteTopicLinks: new Map(),
    };
  });

  const createMockDb = () => ({
    category: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.categories.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.categories.clear()),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
        const existing = inMemoryDb.categories.get(where.id);
        const record = existing ? { ...existing, ...update } : { ...create };
        inMemoryDb.categories.set(record.id, record);
        return record;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        inMemoryDb.categories.set(data.id, data);
        return data;
      }),
    },
    topic: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.topics.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.topics.clear()),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
        const existing = inMemoryDb.topics.get(where.id);
        const record = existing ? { ...existing, ...update } : { ...create };
        inMemoryDb.topics.set(record.id, record);
        return record;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        inMemoryDb.topics.set(data.id, data);
        return data;
      }),
    },
    note: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.notes.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.notes.clear()),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
        const existing = inMemoryDb.notes.get(where.id);
        const record = existing ? { ...existing, ...update } : { ...create };
        inMemoryDb.notes.set(record.id, record);
        return record;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        inMemoryDb.notes.set(data.id, data);
        return data;
      }),
    },
    resource: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.resources.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.resources.clear()),
      findUnique: vi.fn().mockImplementation(async ({ where }) => inMemoryDb.resources.get(where.id) || null),
      upsert: vi.fn().mockImplementation(async ({ where, create, update }) => {
        const existing = inMemoryDb.resources.get(where.id);
        const record = existing ? { ...existing, ...update } : { ...create };
        inMemoryDb.resources.set(record.id, record);
        return record;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        inMemoryDb.resources.set(data.id, data);
        return data;
      }),
    },
    tag: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.tags.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.tags.clear()),
      upsert: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    flashcard: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.flashcards.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.flashcards.clear()),
      create: vi.fn().mockResolvedValue({}),
    },
    archivedDocument: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.archivedDocuments.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.archivedDocuments.clear()),
      create: vi.fn().mockResolvedValue({}),
    },
    noteTopicLink: {
      findMany: vi.fn().mockImplementation(async () => Array.from(inMemoryDb.noteTopicLinks.values())),
      deleteMany: vi.fn().mockImplementation(async () => inMemoryDb.noteTopicLinks.clear()),
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    syncSession: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  });

  it("1. buildBackupSnapshotFromDb exports Resource.openTarget into JSON snapshot data", async () => {
    inMemoryDb.resources.set("res-bk-001", {
      id: "res-bk-001",
      topicId: "top-bk-01",
      title: "Tài liệu sao lưu có target",
      type: "pdf",
      filePath: "02_PDF_Source/test.pdf",
      openTarget: "archive://doc-export-target-456",
      createdAt: new Date("2026-11-01T10:00:00.000Z"),
      updatedAt: new Date("2026-11-01T10:00:00.000Z"),
    });

    const mockDb = createMockDb();
    const snapshot = await buildBackupSnapshotFromDb(mockDb);

    expect(snapshot.data.resources).toHaveLength(1);
    const exportedResource = snapshot.data.resources[0];
    expect(exportedResource.id).toBe("res-bk-001");
    // Contract: Snapshot export phải giữ nguyên trường openTarget của Resource
    expect((exportedResource as any).openTarget).toBe("archive://doc-export-target-456");
  });

  it("2. executeMergeRestore: existing record + omitted openTarget preserves DB value", async () => {
    inMemoryDb.resources.set("res-mr-001", {
      id: "res-mr-001",
      topicId: "top-mr-01",
      title: "Tài liệu trước merge",
      type: "article",
      url: "https://example.com/art",
      openTarget: "obsidian://vault/current-link",
      createdAt: new Date("2026-11-01T10:00:00.000Z"),
    });

    const mockTx = createMockDb();
    const mergeData: ValidatedBackupSnapshot["data"] = {
      categories: [],
      topics: [],
      notes: [],
      tags: [],
      resources: [
        {
          id: "res-mr-001",
          topicId: "top-mr-01",
          title: "Tài liệu sau merge (đổi tên)",
          type: "article",
          url: "https://example.com/art",
          // omitted openTarget
        } as any,
      ],
    };

    await executeMergeRestore(mockTx, mergeData);

    const persisted = inMemoryDb.resources.get("res-mr-001");
    expect(persisted.title).toBe("Tài liệu sau merge (đổi tên)");
    // Contract: Merge restore với snapshot thiếu trường openTarget phải giữ nguyên giá trị DB
    expect(persisted.openTarget).toBe("obsidian://vault/current-link");
  });

  it("3. executeMergeRestore: existing record + explicit null/empty clears openTarget to NULL", async () => {
    inMemoryDb.resources.set("res-mr-002", {
      id: "res-mr-002",
      topicId: "top-mr-01",
      title: "Tài liệu cần gỡ target",
      type: "book",
      url: "https://example.com/book",
      openTarget: "archive://doc-to-clear",
      createdAt: new Date("2026-11-01T10:00:00.000Z"),
    });

    const mockTx = createMockDb();
    const mergeData: ValidatedBackupSnapshot["data"] = {
      categories: [],
      topics: [],
      notes: [],
      tags: [],
      resources: [
        {
          id: "res-mr-002",
          topicId: "top-mr-01",
          title: "Tài liệu cần gỡ target",
          type: "book",
          url: "https://example.com/book",
          openTarget: null as any,
          createdAt: new Date("2026-11-01T10:00:00.000Z").toISOString(),
        },
      ],
    };

    await executeMergeRestore(mockTx, mergeData);

    const persisted = inMemoryDb.resources.get("res-mr-002");
    // Contract: Merge restore có null phải cập nhật NULL trong DB
    expect(persisted.openTarget).toBeNull();
  });

  it("4. executeMergeRestore: new record + omitted openTarget sets openTarget to NULL", async () => {
    const mockTx = createMockDb();
    const mergeData: ValidatedBackupSnapshot["data"] = {
      categories: [],
      topics: [],
      notes: [],
      tags: [],
      resources: [
        {
          id: "res-mr-003",
          topicId: "top-mr-01",
          title: "Tài liệu mới hoàn toàn qua merge",
          type: "pdf",
          filePath: "02_PDF_Source/new_merge.pdf",
          // omitted openTarget
        } as any,
      ],
    };

    await executeMergeRestore(mockTx, mergeData);

    const persisted = inMemoryDb.resources.get("res-mr-003");
    expect(persisted).toBeDefined();
    // Contract: Record mới trong merge restore nếu thiếu openTarget phải nhận NULL
    expect(persisted.openTarget ?? null).toBeNull();
  });

  it("5. executeReplaceRestore: legacy snapshot lacking openTarget creates records with NULL", async () => {
    // DB trước khi replace có sẵn dữ liệu cũ
    inMemoryDb.resources.set("res-old", {
      id: "res-old",
      topicId: "top-old",
      title: "Dữ liệu cũ sắp bị xóa",
      type: "article",
    });

    const mockTx = createMockDb();
    const legacySnapshotData: ValidatedBackupSnapshot["data"] = {
      categories: [],
      topics: [],
      notes: [],
      tags: [],
      resources: [
        {
          id: "res-rep-001",
          topicId: "top-rep-01",
          title: "Resource từ bản sao lưu cũ",
          type: "pdf",
          filePath: "02_PDF_Source/legacy.pdf",
          notes: "Ghi chú không đổi",
          // hoàn toàn không có openTarget trong file snapshot cũ
        } as any,
      ],
    };

    await executeReplaceRestore(mockTx, legacySnapshotData);

    // Bảng bị xóa trắng và nạp lại từ snapshot
    expect(inMemoryDb.resources.has("res-old")).toBe(false);
    const restored = inMemoryDb.resources.get("res-rep-001");
    expect(restored).toBeDefined();
    // Sibling fields an toàn
    expect(restored.title).toBe("Resource từ bản sao lưu cũ");
    expect(restored.filePath).toBe("02_PDF_Source/legacy.pdf");
    expect(restored.notes).toBe("Ghi chú không đổi");
    // Contract: Replace restore từ bản snapshot cũ phải có openTarget là NULL (hoặc undefined un-set map resolve thành null)
    expect(restored.openTarget ?? null).toBeNull();
  });
});
