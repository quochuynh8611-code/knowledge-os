import { describe, it, expect } from "vitest";
import type { Category, Topic, Note, Resource } from "../../src/types";
import type { SyncMutation } from "../../src/lib/syncQueue";
import { reconcileSnapshotWithQueue } from "../../src/lib/syncQueue";

describe("Phase 2 Unit: Offline Mutation Reconciliation (ADR-078)", () => {
  const baseCategory: Category = {
    id: "cat-1",
    name: "Triết Học",
    slug: "triet-hoc",
    type: "general",
  };

  const baseTopic: Topic = {
    id: "top-1",
    title: "Nhận Thức Luận",
    slug: "nhan-thuc-luan",
    categoryId: "cat-1",
    type: "general",
    description: "Mô tả cơ bản",
    content: "Nội dung server",
    tags: ["triet-hoc"],
    links: [],
    studyProgress: {
      topicId: "top-1",
      status: "not_started",
      progress: 0,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      totalNotes: 0,
      timeSpent: 0,
    },
    createdAt: "2026-10-26T10:00:00Z",
    updatedAt: "2026-10-26T10:00:00Z",
  };

  const baseNote: Note = {
    id: "note-1",
    topicId: "top-1",
    title: "Ghi chú từ server",
    content: "Nội dung ghi chú server",
    type: "study",
    isPrivate: false,
    tags: ["triet-hoc"],
    createdAt: "2026-10-26T10:00:00Z",
    updatedAt: "2026-10-26T10:00:00Z",
  };

  const baseResource: Resource = {
    id: "res-1",
    topicId: "top-1",
    title: "Sách giáo trình",
    type: "book",
    url: "https://example.com/book",
    createdAt: "2026-10-26T10:00:00Z",
  };

  const initialSnapshot = {
    categories: [baseCategory],
    topics: [baseTopic],
    notes: [baseNote],
    resources: [baseResource],
    tags: [],
  };

  // ─── 1. Save Create ────────────────────────────────────────────────────────

  it("1. Áp dụng pending save cho entity chưa tồn tại trên server (Save Create)", () => {
    const offlineTopic: Topic = {
      ...baseTopic,
      id: "top-2",
      title: "Đạo Đức Học",
      slug: "dao-duc-hoc",
      categoryId: "cat-1",
    };

    const queue: SyncMutation[] = [
      {
        id: "mut-1",
        entityType: "topic",
        action: "save",
        entityId: "top-2",
        payload: offlineTopic,
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const result = reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(result.topics).toHaveLength(2);
    expect(result.topics.map((t) => t.id)).toEqual(["top-1", "top-2"]);
    expect(result.topics.find((t) => t.id === "top-2")?.title).toBe("Đạo Đức Học");
  });

  // ─── 2. Save Conflict ──────────────────────────────────────────────────────

  it("2. Khi entity ĐÃ TỒN TẠI trên server, server version luôn thắng (Server Canonical Winner)", () => {
    const conflictingLocalTopic: Topic = {
      ...baseTopic,
      title: "Tiêu đề sửa đổi offline chưa đồng bộ",
      content: "Nội dung offline mới hơn nhưng chưa được server chấp nhận",
      updatedAt: "2026-10-26T12:00:00Z",
    };

    const queue: SyncMutation[] = [
      {
        id: "mut-conflict-1",
        entityType: "topic",
        action: "save",
        entityId: "top-1",
        payload: conflictingLocalTopic,
        clientTimestamp: "2026-10-26T12:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const result = reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(result.topics).toHaveLength(1);
    // Server canonical title must win unconditionally
    expect(result.topics[0].title).toBe("Nhận Thức Luận");
    expect(result.topics[0].content).toBe("Nội dung server");
  });

  // ─── 3. Delete Mutation ────────────────────────────────────────────────────

  it("3. Loại bỏ entity khỏi UI state khi có pending delete mutation (No Resurrected Ghosts)", () => {
    const queue: SyncMutation[] = [
      {
        id: "mut-del-1",
        entityType: "topic",
        action: "delete",
        entityId: "top-1",
        clientTimestamp: "2026-10-26T11:30:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const result = reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(result.topics.some((t) => t.id === "top-1")).toBe(false);
    expect(result.topics).toHaveLength(0);
  });

  // ─── 4. Orphan Guard ───────────────────────────────────────────────────────

  it("4. Chặn topic/note/resource mồ côi nếu category hoặc topic cha không tồn tại (Orphan Guard)", () => {
    const orphanTopic: Topic = {
      ...baseTopic,
      id: "top-orphan",
      title: "Topic Mồ Côi",
      slug: "topic-mo-coi",
      categoryId: "cat-non-existent",
    };

    const orphanNote: Note = {
      ...baseNote,
      id: "note-orphan",
      topicId: "top-non-existent",
      title: "Note Mồ Côi",
    };

    const orphanResource: Resource = {
      ...baseResource,
      id: "res-orphan",
      topicId: "top-non-existent",
      title: "Resource Mồ Côi",
    };

    const queue: SyncMutation[] = [
      {
        id: "mut-top-orphan",
        entityType: "topic",
        action: "save",
        entityId: "top-orphan",
        payload: orphanTopic,
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
      {
        id: "mut-note-orphan",
        entityType: "note",
        action: "save",
        entityId: "note-orphan",
        payload: orphanNote,
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
      {
        id: "mut-res-orphan",
        entityType: "resource",
        action: "save",
        entityId: "res-orphan",
        payload: orphanResource,
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const result = reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(result.topics.some((t) => t.id === "top-orphan")).toBe(false);
    expect(result.notes.some((n) => n.id === "note-orphan")).toBe(false);
    expect(result.resources.some((r) => r.id === "res-orphan")).toBe(false);
  });

  // ─── 5. Dependency Order ───────────────────────────────────────────────────

  it("5. Xử lý dependency order: offline category cho phép offline topic, và offline topic cho phép offline note", () => {
    const offlineCategory: Category = {
      id: "cat-2",
      name: "Tâm Lý Học",
      slug: "tam-ly-hoc",
      type: "general",
    };

    const offlineTopic: Topic = {
      ...baseTopic,
      id: "top-2",
      title: "Tâm Lý Học Nhận Thức",
      slug: "tam-ly-hoc-nhan-thuc",
      categoryId: "cat-2", // Phụ thuộc vào offline category cat-2
    };

    const offlineNote: Note = {
      ...baseNote,
      id: "note-2",
      topicId: "top-2", // Phụ thuộc vào offline topic top-2
      title: "Ghi chú tâm lý học",
    };

    // Đưa vào queue lộn xộn để kiểm tra thứ tự xử lý độc lập
    const queue: SyncMutation[] = [
      {
        id: "mut-note-2",
        entityType: "note",
        action: "save",
        entityId: "note-2",
        payload: offlineNote,
        clientTimestamp: "2026-10-26T11:05:00Z",
        retryCount: 0,
        status: "pending",
      },
      {
        id: "mut-top-2",
        entityType: "topic",
        action: "save",
        entityId: "top-2",
        payload: offlineTopic,
        clientTimestamp: "2026-10-26T11:02:00Z",
        retryCount: 0,
        status: "pending",
      },
      {
        id: "mut-cat-2",
        entityType: "category",
        action: "save",
        entityId: "cat-2",
        payload: offlineCategory,
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const result = reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(result.categories.some((c) => c.id === "cat-2")).toBe(true);
    expect(result.topics.some((t) => t.id === "top-2")).toBe(true);
    expect(result.notes.some((n) => n.id === "note-2")).toBe(true);
  });

  // ─── 6. Queue Immutability ─────────────────────────────────────────────────

  it("6. Queue không bị thay đổi, không bị dequeue và không bị đổi status trong quá trình reconciliation", () => {
    const queue: SyncMutation[] = [
      {
        id: "mut-immutable-1",
        entityType: "topic",
        action: "save",
        entityId: "top-2",
        payload: { ...baseTopic, id: "top-2", categoryId: "cat-1" },
        clientTimestamp: "2026-10-26T11:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];

    const originalQueueLength = queue.length;
    const originalStatus = queue[0].status;

    reconcileSnapshotWithQueue(initialSnapshot, queue);

    expect(queue).toHaveLength(originalQueueLength);
    expect(queue[0].status).toBe(originalStatus);
    expect(queue[0].id).toBe("mut-immutable-1");
  });
});
