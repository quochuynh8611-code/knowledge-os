import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeLegacyEconomyCleanup,
  TARGET_ROOT_CATEGORY_IDS,
  type CleanupDbClient,
  type CleanupResultSummary,
} from "../../scripts/maintenance/cleanupLegacyEconomyCore";

describe("cleanupLegacyEconomyCore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Dry-run discovers fixed roots, descendants and topics but invokes no write methods", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      { id: "cat-root-kinh-te", parentId: null },
      { id: "cat-descendant-1", parentId: "cat-root-kinh-te" },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-econ-1", categoryId: "cat-root-kinh-te" },
      { id: "topic-econ-2", categoryId: "cat-descendant-1" },
    ]);
    const mockNoteFindMany = vi.fn().mockResolvedValue([]);
    const mockNoteTopicLinkFindMany = vi.fn().mockResolvedValue([]);

    const mockCategoryDeleteMany = vi.fn();
    const mockTopicDeleteMany = vi.fn();
    const mockNoteDeleteMany = vi.fn();
    const mockNoteUpdate = vi.fn();
    const mockNoteTopicLinkDeleteMany = vi.fn();

    const mockDb: CleanupDbClient = {
      category: {
        findMany: mockCategoryFindMany,
        deleteMany: mockCategoryDeleteMany,
      },
      topic: {
        findMany: mockTopicFindMany,
        deleteMany: mockTopicDeleteMany,
      },
      note: {
        findMany: mockNoteFindMany,
        update: mockNoteUpdate,
        deleteMany: mockNoteDeleteMany,
      },
      noteTopicLink: {
        findMany: mockNoteTopicLinkFindMany,
        deleteMany: mockNoteTopicLinkDeleteMany,
      },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.mode).toBe("dry-run");
    expect(result.success).toBe(true);
    expect(result.alreadyClean).toBe(false);
    expect(result.targets.rootCategoryIds).toEqual([
      "cat-root-kinh-te",
      "cat-root-kinh-te-hoc",
    ]);
    expect(result.targets.deletedCategoryIds).toEqual([
      "cat-root-kinh-te",
      "cat-descendant-1",
    ]);
    expect(result.targets.deletedTopicIds).toEqual([
      "topic-econ-1",
      "topic-econ-2",
    ]);
    expect(result.counts.categoriesDeleted).toBe(2);
    expect(result.counts.topicsDeleted).toBe(2);

    // Verify zero write calls
    expect(mockCategoryDeleteMany).not.toHaveBeenCalled();
    expect(mockTopicDeleteMany).not.toHaveBeenCalled();
    expect(mockNoteDeleteMany).not.toHaveBeenCalled();
    expect(mockNoteUpdate).not.toHaveBeenCalled();
    expect(mockNoteTopicLinkDeleteMany).not.toHaveBeenCalled();
  });

  it("2. Dry-run does not invoke transaction mutation flow", async () => {
    const mockTransaction = vi.fn();
    const mockDb: CleanupDbClient = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: mockTransaction,
    };

    await executeLegacyEconomyCleanup(mockDb, { dryRun: true });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("3. Exact target whitelist is immutable; no arbitrary IDs accepted", () => {
    expect(TARGET_ROOT_CATEGORY_IDS).toEqual([
      "cat-root-kinh-te",
      "cat-root-kinh-te-hoc",
    ]);
    expect(Object.isFrozen(TARGET_ROOT_CATEGORY_IDS)).toBe(true);
  });

  it("4. Shared note: affected link removed, primary topic FK repaired only where required, note preserved", async () => {
    // Note 1: primary FK is topic-econ-1, but also linked to topic-buddhism-1
    // Note 2: primary FK is topic-buddhism-1, but also linked to topic-econ-1
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      { id: "cat-root-kinh-te", parentId: null },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-econ-1", categoryId: "cat-root-kinh-te" },
    ]);
    const mockNoteFindMany = vi.fn().mockResolvedValue([
      { id: "note-shared-1", topicId: "topic-econ-1" },
      { id: "note-shared-2", topicId: "topic-buddhism-1" },
    ]);
    const mockNoteTopicLinkFindMany = vi.fn().mockResolvedValue([
      { noteId: "note-shared-1", topicId: "topic-econ-1" },
      { noteId: "note-shared-1", topicId: "topic-buddhism-1" },
      { noteId: "note-shared-2", topicId: "topic-buddhism-1" },
      { noteId: "note-shared-2", topicId: "topic-econ-1" },
    ]);

    const txNoteUpdate = vi.fn().mockResolvedValue({ id: "note-shared-1" });
    const txNoteTopicLinkDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const txNoteDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const txCategoryDeleteMany = vi.fn().mockResolvedValue({ count: 1 });

    const txMock: CleanupDbClient = {
      category: {
        findMany: mockCategoryFindMany,
        deleteMany: txCategoryDeleteMany,
      },
      topic: {
        findMany: mockTopicFindMany,
      },
      note: {
        findMany: mockNoteFindMany,
        update: txNoteUpdate,
        deleteMany: txNoteDeleteMany,
      },
      noteTopicLink: {
        findMany: mockNoteTopicLinkFindMany,
        deleteMany: txNoteTopicLinkDeleteMany,
      },
    };

    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: mockTopicFindMany },
      note: { findMany: mockNoteFindMany },
      noteTopicLink: { findMany: mockNoteTopicLinkFindMany },
      $transaction: vi.fn(async (cb: (tx: CleanupDbClient) => Promise<CleanupResultSummary>) => cb(txMock)),
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: false });

    expect(result.mode).toBe("execute");
    expect(result.counts.sharedNotesPreserved).toBe(2);
    expect(result.counts.sharedNoteLinksRemoved).toBe(2);
    expect(result.counts.primaryTopicReferencesRepaired).toBe(1);
    expect(result.counts.exclusiveNotesDeleted).toBe(0);

    // Primary topic FK repaired for note-shared-1 to topic-buddhism-1
    expect(txNoteUpdate).toHaveBeenCalledWith({
      where: { id: "note-shared-1" },
      data: { topicId: "topic-buddhism-1" },
    });
    // Note-shared-2 does NOT need FK update because its primary topicId is already topic-buddhism-1
    expect(txNoteUpdate).toHaveBeenCalledTimes(1);

    // Links to deleted topics removed
    expect(txNoteTopicLinkDeleteMany).toHaveBeenCalledWith({
      where: {
        topicId: { in: ["topic-econ-1"] },
      },
    });
  });

  it("5. Exclusive note is deleted safely", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      { id: "cat-root-kinh-te", parentId: null },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-econ-1", categoryId: "cat-root-kinh-te" },
    ]);
    const mockNoteFindMany = vi.fn().mockResolvedValue([
      { id: "note-exclusive-1", topicId: "topic-econ-1" },
    ]);
    const mockNoteTopicLinkFindMany = vi.fn().mockResolvedValue([
      { noteId: "note-exclusive-1", topicId: "topic-econ-1" },
    ]);

    const txNoteDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const txCategoryDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const txNoteTopicLinkDeleteMany = vi.fn().mockResolvedValue({ count: 1 });

    const txMock: CleanupDbClient = {
      category: {
        findMany: mockCategoryFindMany,
        deleteMany: txCategoryDeleteMany,
      },
      topic: {
        findMany: mockTopicFindMany,
      },
      note: {
        findMany: mockNoteFindMany,
        update: vi.fn(),
        deleteMany: txNoteDeleteMany,
      },
      noteTopicLink: {
        findMany: mockNoteTopicLinkFindMany,
        deleteMany: txNoteTopicLinkDeleteMany,
      },
    };

    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: mockTopicFindMany },
      note: { findMany: mockNoteFindMany },
      noteTopicLink: { findMany: mockNoteTopicLinkFindMany },
      $transaction: vi.fn(async (cb: (tx: CleanupDbClient) => Promise<CleanupResultSummary>) => cb(txMock)),
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: false });

    expect(result.counts.exclusiveNotesDeleted).toBe(1);
    expect(result.counts.sharedNotesPreserved).toBe(0);
    expect(txNoteDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["note-exclusive-1"] } },
    });
  });

  it("6. Descendant categories and affected topics are correctly identified across multi-level tree", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      { id: "cat-root-kinh-te", parentId: null },
      { id: "cat-sub-1", parentId: "cat-root-kinh-te" },
      { id: "cat-sub-sub-1", parentId: "cat-sub-1" },
      { id: "cat-unrelated", parentId: "cat-phat-hoc" },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-sub-1", categoryId: "cat-sub-sub-1" },
      { id: "topic-unrelated", categoryId: "cat-unrelated" },
    ]);

    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: mockTopicFindMany },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.targets.deletedCategoryIds).toEqual([
      "cat-root-kinh-te",
      "cat-sub-1",
      "cat-sub-sub-1",
    ]);
    expect(result.targets.deletedTopicIds).toEqual(["topic-sub-1"]);
  });

  it("7. Execute recomputes plan within transaction", async () => {
    const txCategoryFindMany = vi.fn().mockResolvedValue([
      { id: "cat-root-kinh-te", parentId: null },
    ]);
    const txTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-tx-1", categoryId: "cat-root-kinh-te" },
    ]);

    const txMock: CleanupDbClient = {
      category: {
        findMany: txCategoryFindMany,
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      topic: { findMany: txTopicFindMany },
      note: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      noteTopicLink: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const mockDb: CleanupDbClient = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (cb: (tx: CleanupDbClient) => Promise<CleanupResultSummary>) => cb(txMock)),
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: false });

    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(txCategoryFindMany).toHaveBeenCalled();
    expect(txTopicFindMany).toHaveBeenCalled();
    expect(result.targets.deletedTopicIds).toEqual(["topic-tx-1"]);
  });

  it("8. Transaction failure rolls all operations back according to mocked transaction behavior", async () => {
    const mockDb: CleanupDbClient = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn().mockRejectedValue(new Error("DB transaction failed")),
    };

    await expect(
      executeLegacyEconomyCleanup(mockDb, { dryRun: false })
    ).rejects.toThrow("DB transaction failed");
  });

  it("9. Already-clean state succeeds with zero counts", async () => {
    const mockCleanDb: CleanupDbClient = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (cb: (tx: CleanupDbClient) => Promise<CleanupResultSummary>) =>
        cb({
          category: {
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          topic: { findMany: vi.fn().mockResolvedValue([]) },
          note: {
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          noteTopicLink: {
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        })
      ),
    };

    const dryResult = await executeLegacyEconomyCleanup(mockCleanDb, { dryRun: true });
    expect(dryResult.alreadyClean).toBe(true);
    expect(dryResult.counts.categoriesDeleted).toBe(0);
    expect(dryResult.counts.topicsDeleted).toBe(0);

    const execResult = await executeLegacyEconomyCleanup(mockCleanDb, { dryRun: false });
    expect(execResult.alreadyClean).toBe(true);
    expect(execResult.counts.categoriesDeleted).toBe(0);
    expect(execResult.counts.topicsDeleted).toBe(0);
  });

  it("10. Result includes canonical category/topic ID lists and only permitted summary fields", async () => {
    const mockDb: CleanupDbClient = {
      category: { findMany: vi.fn().mockResolvedValue([]) },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    const expectedKeys = ["mode", "success", "alreadyClean", "database", "timestamp", "targets", "counts"];
    expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());

    const expectedTargetKeys = ["rootCategoryIds", "deletedCategoryIds", "deletedTopicIds"];
    expect(Object.keys(result.targets).sort()).toEqual(expectedTargetKeys.sort());

    const expectedCountKeys = [
      "categoriesDeleted",
      "topicsDeleted",
      "exclusiveNotesDeleted",
      "sharedNotesPreserved",
      "sharedNoteLinksRemoved",
      "primaryTopicReferencesRepaired",
    ];
    expect(Object.keys(result.counts).sort()).toEqual(expectedCountKeys.sort());
  });
});
