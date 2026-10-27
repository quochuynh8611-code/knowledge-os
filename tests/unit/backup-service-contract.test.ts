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
      noteTopicLink: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("noteTopicLink");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      topicTag: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("topicTag");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
      knowledgeProgressSnapshot: {
        deleteMany: vi.fn().mockImplementation(async () => {
          deleteOrder.push("knowledgeProgressSnapshot");
        }),
        create: vi.fn().mockResolvedValue({}),
      },
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
      "noteTopicLink",
      "topicTag",
      "knowledgeProgressSnapshot",
      "knowledgeLink",
      "studyProgress",
      "resource",
      "note",
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

  it("4. buildBackupSnapshotFromDb và executeReplaceRestore bảo toàn toàn diện Flashcards, Schedules, Reviews, ArchivedDocuments, NoteTopicLinks", async () => {
    const { buildBackupSnapshotFromDb, executeReplaceRestore } = await import(
      "../../src/server/services/backupService"
    );

    const mockDb: any = {
      category: { findMany: vi.fn().mockResolvedValue([{ id: "cat-1", name: "Triết Học", slug: "triet-hoc", order: 0 }]) },
      topic: { findMany: vi.fn().mockResolvedValue([{ id: "top-1", title: "Hiện Tượng Học", slug: "hien-tuong-hoc", categoryId: "cat-1", type: "general", description: "Mô tả", content: "Nội dung", tags: [], createdAt: new Date(), updatedAt: new Date(), studyProgress: null, sourceLinks: [] }]) },
      note: { findMany: vi.fn().mockResolvedValue([{ id: "note-1", topicId: "top-1", title: "Ghi chú 1", content: "Nội dung note", type: "study", isPrivate: false, tags: [], createdAt: new Date(), updatedAt: new Date() }]) },
      resource: { findMany: vi.fn().mockResolvedValue([{ id: "res-1", topicId: "top-1", title: "Tài liệu 1", type: "pdf", createdAt: new Date() }]) },
      tag: { findMany: vi.fn().mockResolvedValue([{ id: "tag-1", name: "Philosophy", slug: "philosophy", count: 1 }]) },
      flashcard: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "card-1",
            topicId: "top-1",
            noteId: "note-1",
            type: "basic",
            front: "Ý thức là gì?",
            back: "Ý thức luôn là ý thức về một cái gì đó",
            lifecycleStatus: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
            schedule: {
              id: "sch-1",
              flashcardId: "card-1",
              state: "learning",
              dueAt: new Date(),
              interval: 1,
              easeFactor: 2.5,
              repetitions: 1,
              lapses: 0,
              updatedAt: new Date(),
            },
            reviews: [
              {
                id: "rev-1",
                clientEventId: "evt-1",
                flashcardId: "card-1",
                topicId: "top-1",
                rating: 3,
                reviewDurationMs: 5000,
                reviewedAt: new Date(),
                stateBefore: "new",
                stateAfter: "learning",
                intervalBefore: 0,
                intervalAfter: 1,
                easeFactorBefore: 2.5,
                easeFactorAfter: 2.5,
                dueBeforeAt: new Date(),
                dueAfterAt: new Date(),
              },
            ],
          },
        ]),
      },
      archivedDocument: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "doc-1",
            resourceId: "res-1",
            fileName: "husserl.pdf",
            fileSize: 1024,
            mimeType: "application/pdf",
            fileFormat: "pdf",
            contentHash: "a".repeat(64),
            storageRelPath: "pdf/aa/husserl.pdf",
            lastPosition: { pageNumber: 5 },
            lastReadAt: new Date(),
            readCount: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      },
      noteTopicLink: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "ntl-1",
            noteId: "note-1",
            topicId: "top-1",
          },
        ]),
      },
    };

    const snapshot = await buildBackupSnapshotFromDb(mockDb);
    expect(snapshot.counts.flashcards).toBe(1);
    expect(snapshot.counts.archivedDocuments).toBe(1);
    expect(snapshot.counts.noteTopicLinks).toBe(1);
    expect(snapshot.data.flashcards?.[0].schedule?.state).toBe("learning");
    expect(snapshot.data.flashcards?.[0].reviews?.[0].clientEventId).toBe("evt-1");
    expect(snapshot.data.archivedDocuments?.[0].contentHash).toBe("a".repeat(64));
    expect(snapshot.data.noteTopicLinks?.[0].id).toBe("ntl-1");
    expect(snapshot.checksum).toBe(calculateBackupChecksum(snapshot.data));

    // Test restore into mock transaction
    const restoredItems: string[] = [];
    const mockTx: any = {
      category: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("category")) },
      tag: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("tag")) },
      topic: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("topic")) },
      studyProgress: { deleteMany: vi.fn(), create: vi.fn() },
      knowledgeLink: { deleteMany: vi.fn(), create: vi.fn() },
      note: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("note")) },
      resource: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("resource")) },
      noteTopicLink: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("noteTopicLink")) },
      flashcard: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("flashcard")) },
      flashcardSchedule: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("flashcardSchedule")) },
      flashcardReview: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("flashcardReview")) },
      archivedDocument: { deleteMany: vi.fn(), create: vi.fn(() => restoredItems.push("archivedDocument")) },
    };

    await executeReplaceRestore(mockTx, snapshot.data);
    expect(mockTx.flashcard.create).toHaveBeenCalledTimes(1);
    expect(mockTx.flashcardSchedule.create).toHaveBeenCalledTimes(1);
    expect(mockTx.flashcardReview.create).toHaveBeenCalledTimes(1);
    expect(mockTx.archivedDocument.create).toHaveBeenCalledTimes(1);
    expect(mockTx.noteTopicLink.create).toHaveBeenCalledTimes(1);

    // Verify correct foreign key dependency insertion sequence
    const flashcardIdx = restoredItems.indexOf("flashcard");
    const scheduleIdx = restoredItems.indexOf("flashcardSchedule");
    const reviewIdx = restoredItems.indexOf("flashcardReview");
    const docIdx = restoredItems.indexOf("archivedDocument");
    const noteTopicLinkIdx = restoredItems.indexOf("noteTopicLink");
    const noteIdx = restoredItems.indexOf("note");
    const topicIdx = restoredItems.indexOf("topic");

    expect(topicIdx).toBeLessThan(noteTopicLinkIdx);
    expect(noteIdx).toBeLessThan(noteTopicLinkIdx);
    expect(flashcardIdx).toBeLessThan(scheduleIdx);
    expect(flashcardIdx).toBeLessThan(reviewIdx);
    expect(docIdx).toBeGreaterThan(topicIdx);
  });
});
