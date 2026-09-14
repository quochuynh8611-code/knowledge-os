import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeLegacyEconomyCleanup,
  IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST,
  PROTECTED_CATEGORY_IDENTIFIERS,
  type CleanupDbClient,
  type CleanupResultSummary,
} from "../../scripts/maintenance/cleanupLegacyEconomyCore";

describe("cleanupLegacyEconomyCore Target Selection & Execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Dynamic-ID root category with exact name, slug and type is selected with exact-name-and-slug", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-1789297489195",
        name: "Kinh Tế",
        slug: "kinh-te",
        type: "kinh-te",
        parentId: null,
      },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-1789355890188", categoryId: "cat-1789297489195" },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: mockTopicFindMany },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.mode).toBe("dry-run");
    expect(result.success).toBe(true);
    expect(result.matchedRoots).toEqual([
      {
        id: "cat-1789297489195",
        name: "Kinh Tế",
        slug: "kinh-te",
        matchReason: "exact-name-and-slug",
      },
    ]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.targets.rootCategoryIds).toEqual(["cat-1789297489195"]);
    expect(result.targets.deletedCategoryIds).toEqual(["cat-1789297489195"]);
    expect(result.targets.deletedTopicIds).toEqual(["topic-1789355890188"]);
    expect(result.counts.categoriesDeleted).toBe(1);
    expect(result.counts.topicsDeleted).toBe(1);
  });

  it("2. Canonical cat-root-kinh-te-hoc with consistent metadata is selected with canonical-id", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-root-kinh-te-hoc",
        name: "Kinh Tế Học",
        slug: "kinh-te-hoc",
        type: "kinh-te-hoc",
        parentId: null,
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.matchedRoots).toEqual([
      {
        id: "cat-root-kinh-te-hoc",
        name: "Kinh Tế Học",
        slug: "kinh-te-hoc",
        matchReason: "canonical-id",
      },
    ]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.targets.rootCategoryIds).toEqual(["cat-root-kinh-te-hoc"]);
  });

  it("3. Canonical ID with absent/empty legacy metadata is selected with canonical-id", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-root-kinh-te",
        name: "",
        slug: "",
        type: null,
        parentId: null,
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.matchedRoots).toEqual([
      {
        id: "cat-root-kinh-te",
        name: "Kinh Tế",
        slug: "kinh-te",
        matchReason: "canonical-id",
      },
    ]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.targets.rootCategoryIds).toEqual(["cat-root-kinh-te"]);
  });

  it("4. Canonical ID with conflicting populated metadata is marked ambiguous and blocks execute with zero transaction/write calls", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-root-kinh-te",
        name: "Phật Học",
        slug: "phat-hoc",
        type: "phat-hoc",
        parentId: null,
      },
    ]);
    const mockTransaction = vi.fn();
    const mockCategoryDeleteMany = vi.fn();
    const mockDb: CleanupDbClient = {
      category: {
        findMany: mockCategoryFindMany,
        deleteMany: mockCategoryDeleteMany,
      },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: mockTransaction,
    };

    // Dry-run exposes ambiguity
    const dryRunResult = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });
    expect(dryRunResult.matchedRoots).toEqual([]);
    expect(dryRunResult.ambiguousRoots.length).toBe(1);
    expect(dryRunResult.ambiguousRoots[0].id).toBe("cat-root-kinh-te");
    expect(dryRunResult.ambiguousRoots[0].reason).toContain("contradictory metadata");

    // Execute must throw and block before transaction
    await expect(
      executeLegacyEconomyCleanup(mockDb, { dryRun: false })
    ).rejects.toThrow(/Ambiguous root categories detected/i);

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockCategoryDeleteMany).not.toHaveBeenCalled();
  });

  it("5. Kinh Tế & Tài Chính (both known protected IDs and exact protected name/slug) is never selected or touched", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-1772360000100",
        name: "Kinh Tế & Tài Chính",
        slug: "kinh-te-tai-chinh",
        type: "kinh-te-tai-chinh",
        parentId: null,
      },
      {
        id: "cat-root-kinh-te-tai-chinh",
        name: "Kinh Tế & Tài Chính",
        slug: "kinh-te-tai-chinh",
        type: "kinh-te-tai-chinh",
        parentId: null,
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.matchedRoots).toEqual([]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.targets.rootCategoryIds).toEqual([]);
    expect(result.alreadyClean).toBe(true);
  });

  it("6. Fuzzy and look-alike categories are rejected without selection", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-fuzzy-1",
        name: "Kinh Tế Quốc Tế",
        slug: "kinh-te-quoc-te",
        type: "kinh-te-quoc-te",
        parentId: null,
      },
      {
        id: "cat-fuzzy-2",
        name: "Kinh Tế Học Ứng Dụng",
        slug: "kinh-te-hoc-ung-dung",
        type: "kinh-te-hoc-ung-dung",
        parentId: null,
      },
      {
        id: "cat-fuzzy-3",
        name: "Kinh tế & Tài chính cá nhân",
        slug: "kinh-te-tai-chinh-ca-nhan",
        type: "kinh-te-tai-chinh-ca-nhan",
        parentId: null,
      },
      {
        id: "cat-dich-hoc",
        name: "Dịch Học (Kinh Dịch)",
        slug: "dich-hoc",
        type: "huyen-hoc",
        parentId: "cat-root-huyen-hoc",
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.matchedRoots).toEqual([]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.alreadyClean).toBe(true);
  });

  it("7. Child category matching target name/slug is never selected as root", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-child-kinh-te",
        name: "Kinh Tế",
        slug: "kinh-te",
        type: "kinh-te",
        parentId: "cat-root-other",
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const result = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });

    expect(result.matchedRoots).toEqual([]);
    expect(result.ambiguousRoots).toEqual([]);
    expect(result.alreadyClean).toBe(true);
  });

  it("8. Name/slug mismatch is flagged as ambiguous and blocks execute", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-mismatch-1",
        name: "Kinh Tế",
        slug: "kinh-te-khac",
        type: "kinh-te",
        parentId: null,
      },
      {
        id: "cat-mismatch-2",
        name: "Kinh Tế Biến Thể",
        slug: "kinh-te",
        type: "kinh-te",
        parentId: null,
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const dryResult = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });
    expect(dryResult.matchedRoots).toEqual([]);
    expect(dryResult.ambiguousRoots.length).toBe(2);
    expect(dryResult.ambiguousRoots[0].id).toBe("cat-mismatch-1");
    expect(dryResult.ambiguousRoots[1].id).toBe("cat-mismatch-2");

    await expect(
      executeLegacyEconomyCleanup(mockDb, { dryRun: false })
    ).rejects.toThrow(/Ambiguous root categories detected/i);
  });

  it("9. Incompatible populated type is flagged as ambiguous", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-type-mismatch",
        name: "Kinh Tế",
        slug: "kinh-te",
        type: "dong-y",
        parentId: null,
      },
    ]);
    const mockDb: CleanupDbClient = {
      category: { findMany: mockCategoryFindMany },
      topic: { findMany: vi.fn().mockResolvedValue([]) },
      note: { findMany: vi.fn().mockResolvedValue([]) },
      noteTopicLink: { findMany: vi.fn().mockResolvedValue([]) },
    };

    const dryResult = await executeLegacyEconomyCleanup(mockDb, { dryRun: true });
    expect(dryResult.matchedRoots).toEqual([]);
    expect(dryResult.ambiguousRoots.length).toBe(1);
    expect(dryResult.ambiguousRoots[0].reason).toContain("incompatible type");
  });

  it("10. Immutable identity allowlist and protected specifications are strictly frozen", () => {
    expect(IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST).toHaveLength(2);
    expect(IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST[0]).toEqual({
      canonicalId: "cat-root-kinh-te",
      name: "Kinh Tế",
      slug: "kinh-te",
      expectedType: "kinh-te",
    });
    expect(IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST[1]).toEqual({
      canonicalId: "cat-root-kinh-te-hoc",
      name: "Kinh Tế Học",
      slug: "kinh-te-hoc",
      expectedType: "kinh-te-hoc",
    });
    expect(Object.isFrozen(IMMUTABLE_LEGACY_ECONOMY_ALLOWLIST)).toBe(true);

    expect(PROTECTED_CATEGORY_IDENTIFIERS.ids).toContain("cat-1772360000100");
    expect(PROTECTED_CATEGORY_IDENTIFIERS.names).toContain("Kinh Tế & Tài Chính");
    expect(PROTECTED_CATEGORY_IDENTIFIERS.slugs).toContain("kinh-te-tai-chinh");
  });

  it("11. Shared note: affected link removed, primary topic FK repaired, note preserved with dynamic root", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-1789297489195",
        name: "Kinh Tế",
        slug: "kinh-te",
        type: "kinh-te",
        parentId: null,
      },
    ]);
    const mockTopicFindMany = vi.fn().mockResolvedValue([
      { id: "topic-1789355890188", categoryId: "cat-1789297489195" },
    ]);
    const mockNoteFindMany = vi.fn().mockResolvedValue([
      { id: "note-shared-1", topicId: "topic-1789355890188" },
      { id: "note-shared-2", topicId: "topic-buddhism-1" },
    ]);
    const mockNoteTopicLinkFindMany = vi.fn().mockResolvedValue([
      { noteId: "note-shared-1", topicId: "topic-1789355890188" },
      { noteId: "note-shared-1", topicId: "topic-buddhism-1" },
      { noteId: "note-shared-2", topicId: "topic-buddhism-1" },
      { noteId: "note-shared-2", topicId: "topic-1789355890188" },
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
    expect(result.targets.rootCategoryIds).toEqual(["cat-1789297489195"]);
    expect(result.counts.sharedNotesPreserved).toBe(2);
    expect(result.counts.sharedNoteLinksRemoved).toBe(2);
    expect(result.counts.primaryTopicReferencesRepaired).toBe(1);
    expect(result.counts.exclusiveNotesDeleted).toBe(0);

    expect(txNoteUpdate).toHaveBeenCalledWith({
      where: { id: "note-shared-1" },
      data: { topicId: "topic-buddhism-1" },
    });
    expect(txNoteTopicLinkDeleteMany).toHaveBeenCalledWith({
      where: {
        topicId: { in: ["topic-1789355890188"] },
      },
    });
  });

  it("12. Descendant categories and affected topics under dynamic root are identified across multi-level tree", async () => {
    const mockCategoryFindMany = vi.fn().mockResolvedValue([
      {
        id: "cat-1789297489195",
        name: "Kinh Tế",
        slug: "kinh-te",
        type: "kinh-te",
        parentId: null,
      },
      { id: "cat-sub-1", parentId: "cat-1789297489195" },
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
      "cat-1789297489195",
      "cat-sub-1",
      "cat-sub-sub-1",
    ]);
    expect(result.targets.deletedTopicIds).toEqual(["topic-sub-1"]);
  });
});
