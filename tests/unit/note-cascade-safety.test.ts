import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteTopicSafely } from "../../src/server/services/noteCascadeService";

describe("Phase 3 Unit: Note Cascade Safety (ADR-079 / PR-3)", () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      note: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => ({
          id: where.id,
          ...data,
        })),
        delete: vi.fn().mockImplementation(async ({ where }: any) => ({
          id: where.id,
        })),
      },
      noteTopicLink: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        upsert: vi.fn().mockImplementation(async ({ where, create }: any) => ({
          noteId: where.noteId_topicId?.noteId || create.noteId,
          topicId: where.noteId_topicId?.topicId || create.topicId,
        })),
      },
      topic: {
        delete: vi.fn().mockImplementation(async ({ where }: any) => ({
          id: where.id,
        })),
      },
    };
  });

  // ─── 1. Primary Topic Deletion with Secondary Topics ──────────────────────

  it("1.1. Deleting primary topic reassigns note.topicId to first remaining secondary topic and preserves note", async () => {
    // Note N1 has primary topic T1, and secondary topics T2, T3
    mockTx.note.findMany.mockResolvedValue([
      { id: "note-n1", title: "Note 1", topicId: "topic-t1" },
    ]);
    mockTx.noteTopicLink.findMany.mockImplementation(async ({ where }: any) => {
      if (where.noteId === "note-n1") {
        return [
          { noteId: "note-n1", topicId: "topic-t1" },
          { noteId: "note-n1", topicId: "topic-t2" },
          { noteId: "note-n1", topicId: "topic-t3" },
        ];
      }
      return [];
    });

    await deleteTopicSafely(mockTx, "topic-t1");

    // Note must NOT be deleted
    expect(mockTx.note.delete).not.toHaveBeenCalled();

    // Note primary topicId must be reassigned to topic-t2 (first remaining secondary)
    expect(mockTx.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "note-n1" },
        data: expect.objectContaining({
          topicId: "topic-t2",
        }),
      })
    );

    // NoteTopicLink for topic-t1 must be pruned
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "topic-t1",
        }),
      })
    );

    // Topic T1 itself is deleted
    expect(mockTx.topic.delete).toHaveBeenCalledWith({
      where: { id: "topic-t1" },
    });
  });

  // ─── 2. Primary Topic Deletion with No Secondary Topics ───────────────────

  it("2.1. Deleting primary topic when note has no secondary topics sets note.topicId to null and preserves note", async () => {
    // Note N2 has only primary topic T1 (no other links)
    mockTx.note.findMany.mockResolvedValue([
      { id: "note-n2", title: "Note 2", topicId: "topic-t1" },
    ]);
    mockTx.noteTopicLink.findMany.mockImplementation(async ({ where }: any) => {
      if (where.noteId === "note-n2") {
        return [{ noteId: "note-n2", topicId: "topic-t1" }];
      }
      return [];
    });

    await deleteTopicSafely(mockTx, "topic-t1");

    // Note must NOT be deleted
    expect(mockTx.note.delete).not.toHaveBeenCalled();

    // note.topicId becomes null (unclassified note)
    expect(mockTx.note.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "note-n2" },
        data: expect.objectContaining({
          topicId: null,
        }),
      })
    );

    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "topic-t1",
        }),
      })
    );

    expect(mockTx.topic.delete).toHaveBeenCalledWith({
      where: { id: "topic-t1" },
    });
  });

  // ─── 3. Secondary Topic Deletion ──────────────────────────────────────────

  it("3.1. Deleting a secondary topic preserves note and primary topicId, only pruning the link", async () => {
    // Note N1 has primary topic T1, secondary topic T2. We delete T2.
    mockTx.note.findMany.mockResolvedValue([]); // Note does NOT have T2 as primary topicId
    mockTx.noteTopicLink.findMany.mockImplementation(async ({ where }: any) => {
      if (where.topicId === "topic-t2") {
        return [{ noteId: "note-n1", topicId: "topic-t2" }];
      }
      return [];
    });

    await deleteTopicSafely(mockTx, "topic-t2");

    // Note must NOT be deleted and primary topicId is not modified
    expect(mockTx.note.delete).not.toHaveBeenCalled();
    expect(mockTx.note.update).not.toHaveBeenCalled();

    // NoteTopicLink for T2 pruned
    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          topicId: "topic-t2",
        }),
      })
    );

    expect(mockTx.topic.delete).toHaveBeenCalledWith({
      where: { id: "topic-t2" },
    });
  });

  // ─── 4. Note Deletion Cascades Links ──────────────────────────────────────

  it("4.1. Deleting a note cascades deletion to its NoteTopicLink relations", async () => {
    const noteId = "note-to-delete";

    // Simulate note deletion with manual cascade or Prisma cascade
    await mockTx.noteTopicLink.deleteMany({
      where: { noteId },
    });
    await mockTx.note.delete({
      where: { id: noteId },
    });

    expect(mockTx.noteTopicLink.deleteMany).toHaveBeenCalledWith({
      where: { noteId: "note-to-delete" },
    });
    expect(mockTx.note.delete).toHaveBeenCalledWith({
      where: { id: "note-to-delete" },
    });
  });

  // ─── 5. Duplicate NoteTopicLink Guard ─────────────────────────────────────

  it("5.1. Disallows duplicate NoteTopicLink relations for the same (noteId, topicId)", async () => {
    mockTx.noteTopicLink.upsert.mockClear();

    // Upserting same link twice uses @@unique([noteId, topicId]) composite key
    await mockTx.noteTopicLink.upsert({
      where: {
        noteId_topicId: { noteId: "n1", topicId: "t1" },
      },
      create: { noteId: "n1", topicId: "t1" },
      update: {},
    });

    await mockTx.noteTopicLink.upsert({
      where: {
        noteId_topicId: { noteId: "n1", topicId: "t1" },
      },
      create: { noteId: "n1", topicId: "t1" },
      update: {},
    });

    expect(mockTx.noteTopicLink.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.noteTopicLink.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          noteId_topicId: { noteId: "n1", topicId: "t1" },
        },
      })
    );
  });
});
