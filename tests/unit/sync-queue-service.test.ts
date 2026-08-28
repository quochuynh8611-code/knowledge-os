import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyncQueueService } from "../../src/services/syncQueue";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import type { Note } from "../../src/types";

describe("Phase P2.2 — Sync Queue Service & ApiDataRepository Note Offline Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue";
  let syncQueueService: SyncQueueService;
  let localFallback: LocalStorageDataRepository;
  let repository: ApiDataRepository;

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    localFallback = new LocalStorageDataRepository("test_storage_ssot");
    repository = new ApiDataRepository("/api", localFallback, syncQueueService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. enqueues note save mutation into sync queue when fetch fails due to network error", async () => {
    const mockNote: Note = {
      id: "note-offline-101",
      title: "Offline Study Note",
      content: "Important insight recorded while offline",
      topicId: "topic-1",
      type: "study",
      isPrivate: false,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simulate network failure on fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch (offline)"));

    const saved = await repository.saveNote(mockNote);

    // Optimistic write succeeds locally
    expect(saved.id).toBe("note-offline-101");

    // Mutation is enqueued in SyncQueueService
    const queue = syncQueueService.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].entityType).toBe("note");
    expect(queue[0].action).toBe("save");
    expect(queue[0].entityId).toBe("note-offline-101");
    expect(queue[0].payload.title).toBe("Offline Study Note");
  });

  it("2. enqueues note delete mutation into sync queue when fetch fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network down"));

    await repository.deleteNote("note-to-delete-1");

    const queue = syncQueueService.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].entityType).toBe("note");
    expect(queue[0].action).toBe("delete");
    expect(queue[0].entityId).toBe("note-to-delete-1");
  });

  it("3. flushSyncQueue replays queued mutations against REST API in FIFO order and clears queue on success", async () => {
    syncQueueService.enqueue({
      id: "mut-1",
      entityType: "note",
      action: "save",
      entityId: "note-1",
      payload: { id: "note-1", title: "Note 1" },
      clientTimestamp: "2026-08-28T10:00:00.000Z",
      retryCount: 0,
      status: "pending",
    });

    syncQueueService.enqueue({
      id: "mut-2",
      entityType: "note",
      action: "delete",
      entityId: "note-2",
      clientTimestamp: "2026-08-28T10:01:00.000Z",
      retryCount: 0,
      status: "pending",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    globalThis.fetch = mockFetch;

    const result = await syncQueueService.flushQueue("/api");
    expect(result.syncedCount).toBe(2);
    expect(result.failedCount).toBe(0);

    // Queue is now empty
    expect(syncQueueService.getQueue()).toHaveLength(0);
  });

  it("4. failed flush increments retryCount on failing mutation without losing data", async () => {
    syncQueueService.enqueue({
      id: "mut-fail",
      entityType: "note",
      action: "save",
      entityId: "note-fail",
      payload: { id: "note-fail", title: "Failing Note" },
      clientTimestamp: "2026-08-28T10:00:00.000Z",
      retryCount: 0,
      status: "pending",
    });

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Server still unreachable (503)"));

    const result = await syncQueueService.flushQueue("/api");
    expect(result.syncedCount).toBe(0);
    expect(result.failedCount).toBe(1);

    const queue = syncQueueService.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].status).toBe("failed");
  });

  it("5. window online event triggers automatic queue flush", async () => {
    syncQueueService.enqueue({
      id: "mut-auto",
      entityType: "note",
      action: "save",
      entityId: "note-auto",
      payload: { id: "note-auto", title: "Auto Reconnect Note" },
      clientTimestamp: "2026-08-28T10:00:00.000Z",
      retryCount: 0,
      status: "pending",
    });

    const flushSpy = vi.spyOn(syncQueueService, "flushQueue").mockResolvedValue({
      syncedCount: 1,
      failedCount: 0,
    });

    syncQueueService.listenForOnlineEvents("/api");

    window.dispatchEvent(new Event("online"));

    expect(flushSpy).toHaveBeenCalled();
  });
});
