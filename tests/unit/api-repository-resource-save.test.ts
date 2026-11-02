/**
 * RED-B1 Test Suite: ApiDataRepository & SyncQueueService Resource Persistence Contract
 *
 * Checks:
 * 1. ApiDataRepository.saveResource preserves explicit `openTarget: null` in JSON request body.
 * 2. ApiDataRepository.saveResource does NOT inject `null` if `openTarget` is omitted/undefined.
 * 3. ApiDataRepository.saveResource dispatches to `POST /api/resources` with stable resource ID.
 * 4. When network fails or server responds with error, ApiDataRepository enqueues mutation into SyncQueueService with `status: 'pending'` and stable ID.
 * 5. SyncQueueService.flushQueue replays mutation to `POST /api/resources` preserving stable ID and openTarget payload.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiDataRepository, LocalStorageDataRepository } from "../../src/services/dataRepository";
import { SyncQueueService } from "../../src/services/syncQueue";
import type { Resource } from "../../src/types";

describe("Slice 1 RED-B1: ApiDataRepository & SyncQueueService Resource Persistence Contract", () => {
  const QUEUE_STORAGE_KEY = "test_sync_queue_resource_slice1";
  const LOCAL_STORAGE_KEY = "test_local_repo_resource_slice1";

  let syncQueueService: SyncQueueService;
  let localFallback: LocalStorageDataRepository;
  let repository: ApiDataRepository;

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(QUEUE_STORAGE_KEY);
    localFallback = new LocalStorageDataRepository(LOCAL_STORAGE_KEY);
    repository = new ApiDataRepository("/api", localFallback, syncQueueService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. saveResource preserves explicit openTarget: null in the outbound JSON body", async () => {
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return {
        ok: true,
        status: 200,
        json: async () => capturedBody,
      };
    });

    const resourceWithNull: Resource = {
      id: "res-rep-001",
      topicId: "topic-100",
      title: "Tài liệu gỡ liên kết",
      type: "article",
      url: "https://example.com/item",
      openTarget: null,
      createdAt: new Date().toISOString(),
    };

    await repository.saveResource(resourceWithNull);

    expect(capturedBody).toBeDefined();
    expect(capturedBody.id).toBe("res-rep-001");
    // Contract: Trường openTarget: null PHẢI tồn tại trong JSON body được gửi lên server
    expect(capturedBody).toHaveProperty("openTarget");
    expect(capturedBody.openTarget).toBeNull();
  });

  it("2. saveResource does NOT inject null when openTarget is omitted in input resource", async () => {
    let capturedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return {
        ok: true,
        status: 200,
        json: async () => capturedBody,
      };
    });

    const resourceOmitted: Resource = {
      id: "res-rep-002",
      topicId: "topic-100",
      title: "Tài liệu không có openTarget",
      type: "pdf",
      filePath: "02_PDF_Source/test.pdf",
      createdAt: new Date().toISOString(),
    };

    await repository.saveResource(resourceOmitted);

    expect(capturedBody).toBeDefined();
    expect(capturedBody.id).toBe("res-rep-002");
    // Contract: Trường omitted không được tự ý gán giá trị null (tránh vô tình xóa dữ liệu cũ khi update)
    expect(capturedBody.openTarget).toBeUndefined();
  });

  it("3. saveResource dispatches payload to POST /api/resources", async () => {
    let capturedUrl = "";
    let capturedMethod = "";

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method || "GET";
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: "res-rep-003" }),
      };
    });

    const resource: Resource = {
      id: "res-rep-003",
      topicId: "topic-100",
      title: "Tài liệu kiểm tra endpoint",
      type: "article",
      url: "https://example.com/link",
      openTarget: "archive://doc-link",
      createdAt: new Date().toISOString(),
    };

    await repository.saveResource(resource);

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toMatch(/\/resources$/);
  });

  it("4. When network fails, saveResource enqueues mutation into syncQueue with status 'pending' and preserves openTarget", async () => {
    // Giả lập rớt mạng
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    const resource: Resource = {
      id: "res-offline-001",
      topicId: "topic-100",
      title: "Tài liệu tạo offline",
      type: "pdf",
      filePath: "02_PDF_Source/offline.pdf",
      openTarget: "archive://doc-offline-uuid",
      createdAt: new Date().toISOString(),
    };

    const saved = await repository.saveResource(resource);
    expect(saved.id).toBe("res-offline-001");

    const queue = syncQueueService.getQueue();
    expect(queue).toHaveLength(1);
    const mutation = queue[0];

    expect(mutation.entityType).toBe("resource");
    expect(mutation.action).toBe("save");
    expect(mutation.entityId).toBe("res-offline-001");
    expect(mutation.status).toBe("pending");
    expect(mutation.payload.openTarget).toBe("archive://doc-offline-uuid");
  });

  it("5. syncQueue flush replays to POST /api/resources with stable ID and identical openTarget payload", async () => {
    syncQueueService.enqueue({
      id: "mut-res-replay-001",
      entityType: "resource",
      action: "save",
      entityId: "res-replay-001",
      payload: {
        id: "res-replay-001",
        topicId: "topic-100",
        title: "Tài liệu replay từ queue",
        type: "book",
        url: "https://example.com/book",
        openTarget: "obsidian://vault/book",
      },
      clientTimestamp: "2026-11-02T10:00:00.000Z",
      retryCount: 0,
      status: "pending",
    });

    let replayedUrl = "";
    let replayedMethod = "";
    let replayedBody: any = null;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      replayedUrl = url;
      replayedMethod = init?.method || "GET";
      if (init?.body && typeof init.body === "string") {
        replayedBody = JSON.parse(init.body);
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      };
    });

    const result = await syncQueueService.flushQueue("/api");

    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(replayedMethod).toBe("POST");
    expect(replayedUrl).toMatch(/\/resources$/);
    expect(replayedBody.id).toBe("res-replay-001");
    expect(replayedBody.openTarget).toBe("obsidian://vault/book");
    expect(syncQueueService.getQueue()).toHaveLength(0);
  });
});
