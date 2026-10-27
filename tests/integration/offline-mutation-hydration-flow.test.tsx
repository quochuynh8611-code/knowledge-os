import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DataProvider, useData } from "../../src/context/DataContext";
import { SyncQueueService } from "../../src/services/syncQueue";
import {
  safeSetLocalStorageItem,
  safeGetLocalStorageItem,
  STORAGE_ROOT_KEY,
} from "../../src/lib/storage";
import type { SyncMutation } from "../../src/lib/syncQueue";

const SYNC_QUEUE_STORAGE_KEY = "phat_hoc_huyen_hoc_sync_queue";

function TestConsumer() {
  const { categories, topics, notes, resources } = useData();
  return (
    <div>
      <div data-testid="category-count">{categories.length}</div>
      <ul data-testid="category-list">
        {categories.map((c) => (
          <li key={c.id} data-testid={`cat-${c.id}`}>
            {c.name}
          </li>
        ))}
      </ul>
      <div data-testid="topic-count">{topics.length}</div>
      <ul data-testid="topic-list">
        {topics.map((t) => (
          <li key={t.id} data-testid={`topic-${t.id}`}>
            {t.title}
          </li>
        ))}
      </ul>
      <div data-testid="note-count">{notes.length}</div>
      <ul data-testid="note-list">
        {notes.map((n) => (
          <li key={n.id} data-testid={`note-${n.id}`}>
            {n.title}
          </li>
        ))}
      </ul>
      <div data-testid="resource-count">{resources.length}</div>
      <ul data-testid="resource-list">
        {resources.map((r) => (
          <li key={r.id} data-testid={`res-${r.id}`}>
            {r.title}
          </li>
        ))}
      </ul>
    </div>
  );
}

describe("Phase 2 Integration: Offline Mutation Reconciliation on Hydration (ADR-078)", () => {
  let syncQueueService: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    syncQueueService = new SyncQueueService(SYNC_QUEUE_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── Scenario 1 ──────────────────────────────────────────────────────────

  it("Scenario 1: Offline-created topic remains visible after reload", async () => {
    const serverCategory = {
      id: "cat-1",
      name: "Phật Học Cơ Bản",
      slug: "phat-hoc-co-ban",
      type: "phat-hoc",
      parentId: null,
    };

    const serverTopicT1 = {
      id: "topic-t1",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      categoryId: "cat-1",
      type: "phat-hoc",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t1",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T08:00:00Z",
    };

    const offlineTopicT2 = {
      id: "topic-t2",
      title: "Bát Chánh Đạo",
      slug: "bat-chanh-dao",
      categoryId: "cat-1",
      type: "phat-hoc",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t2",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T09:00:00Z",
      updatedAt: "2026-10-26T09:00:00Z",
    };

    // Client có 1 mutation pending trong queue cho topic T2
    const mutations: SyncMutation[] = [
      {
        id: "mut-t2",
        entityType: "topic",
        action: "save",
        entityId: "topic-t2",
        payload: offlineTopicT2,
        clientTimestamp: "2026-10-26T09:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    // Mock server chỉ có T1 (chưa nhận được T2)
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/topics")) {
        return {
          ok: true,
          status: 200,
          json: async () => [serverTopicT1],
        } as Response;
      }
      if (url.includes("/api/categories")) {
        return {
          ok: true,
          status: 200,
          json: async () => [serverCategory],
        } as Response;
      }
      if (url.includes("/api/notes") || url.includes("/api/resources")) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as Response;
      }
      if (url.includes("/api/sync/hydrate")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Kỳ vọng: sau khi hydration hoàn tất, CẢ T1 VÀ T2 ĐỀU PHẢI HIỂN THỊ TRÊN UI
    await waitFor(() => {
      expect(screen.getByTestId("topic-topic-t1")).toHaveTextContent("Tứ Diệu Đế");
      expect(screen.getByTestId("topic-topic-t2")).toHaveTextContent("Bát Chánh Đạo");
    });

    // Invariant: Mutation T2 vẫn được bảo tồn 100% trong queue
    const queueAfterHydration = syncQueueService.getQueue();
    expect(queueAfterHydration.some((m) => m.entityId === "topic-t2")).toBe(true);
  });

  // ─── Scenario 2 ──────────────────────────────────────────────────────────

  it("Scenario 2: Offline-created note remains visible after reload", async () => {
    const serverCategory = {
      id: "cat-1",
      name: "Phật Học Cơ Bản",
      slug: "phat-hoc-co-ban",
    };
    const serverTopic = {
      id: "topic-t1",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      categoryId: "cat-1",
      type: "general",
    };
    const serverNoteN1 = {
      id: "note-n1",
      topicId: "topic-t1",
      title: "Khổ Đế",
      content: "Nội dung Khổ Đế từ server",
      type: "study",
    };
    const offlineNoteN2 = {
      id: "note-n2",
      topicId: "topic-t1",
      title: "Tập Đế",
      content: "Nội dung Tập Đế tạo offline",
      type: "insight",
    };

    const mutations: SyncMutation[] = [
      {
        id: "mut-n2",
        entityType: "note",
        action: "save",
        entityId: "note-n2",
        payload: offlineNoteN2,
        clientTimestamp: "2026-10-26T09:30:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/topics")) return { ok: true, json: async () => [serverTopic] } as Response;
      if (url.includes("/api/categories")) return { ok: true, json: async () => [serverCategory] } as Response;
      if (url.includes("/api/notes")) return { ok: true, json: async () => [serverNoteN1] } as Response;
      if (url.includes("/api/resources")) return { ok: true, json: async () => [] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("note-note-n1")).toHaveTextContent("Khổ Đế");
      expect(screen.getByTestId("note-note-n2")).toHaveTextContent("Tập Đế");
    });

    expect(syncQueueService.getQueue().some((m) => m.entityId === "note-n2")).toBe(true);
  });

  // ─── Scenario 3 ──────────────────────────────────────────────────────────

  it("Scenario 3: Offline-created topic with offline-created category remains visible", async () => {
    const offlineCategoryC1 = {
      id: "cat-c1",
      name: "Tâm Lý Học Nhận Thức",
      slug: "tam-ly-hoc-nhan-thuc",
    };
    const offlineTopicT2 = {
      id: "topic-t2",
      title: "Thiên Kiến Xác Nhận",
      slug: "thien-kien-xac-nhan",
      categoryId: "cat-c1",
      type: "general",
    };

    // Server chỉ có 1 topic khác, không có C1 hay T2
    const serverTopicExisting = {
      id: "topic-base",
      title: "Chủ Đề Server Có Sẵn",
      slug: "chu-de-server",
      categoryId: "cat-base",
      type: "general",
    };
    const serverCatExisting = {
      id: "cat-base",
      name: "Lĩnh Vực Server Có Sẵn",
      slug: "linh-vuc-server",
    };

    const mutations: SyncMutation[] = [
      {
        id: "mut-c1",
        entityType: "category",
        action: "save",
        entityId: "cat-c1",
        payload: offlineCategoryC1,
        clientTimestamp: "2026-10-26T09:00:00Z",
        retryCount: 0,
        status: "pending",
      },
      {
        id: "mut-t2",
        entityType: "topic",
        action: "save",
        entityId: "topic-t2",
        payload: offlineTopicT2,
        clientTimestamp: "2026-10-26T09:05:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/topics")) return { ok: true, json: async () => [serverTopicExisting] } as Response;
      if (url.includes("/api/categories")) return { ok: true, json: async () => [serverCatExisting] } as Response;
      if (url.includes("/api/notes") || url.includes("/api/resources")) return { ok: true, json: async () => [] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("cat-cat-c1")).toHaveTextContent("Tâm Lý Học Nhận Thức");
      expect(screen.getByTestId("topic-topic-t2")).toHaveTextContent("Thiên Kiến Xác Nhận");
    });

    const queue = syncQueueService.getQueue();
    expect(queue.some((m) => m.entityId === "cat-c1")).toBe(true);
    expect(queue.some((m) => m.entityId === "topic-t2")).toBe(true);
  });

  // ─── Scenario 4 ──────────────────────────────────────────────────────────

  it("Scenario 4: Queue flush does not duplicate an offline-created topic", async () => {
    const offlineTopicT2 = {
      id: "topic-t2",
      title: "Bát Chánh Đạo",
      slug: "bat-chanh-dao",
      categoryId: "cat-1",
      type: "general",
    };

    const mutations: SyncMutation[] = [
      {
        id: "mut-t2",
        entityType: "topic",
        action: "save",
        entityId: "topic-t2",
        payload: offlineTopicT2,
        clientTimestamp: "2026-10-26T09:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    let serverStoredTopics = [
      { id: "topic-t1", title: "Tứ Diệu Đế", slug: "tu-dieu-de", categoryId: "cat-1", type: "general" },
    ];

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/topics") && (!init || init.method === "GET")) {
        return { ok: true, json: async () => serverStoredTopics } as Response;
      }
      if (url.includes("/api/topics") && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        // Idempotent upsert on server
        if (!serverStoredTopics.some((t) => t.id === body.id)) {
          serverStoredTopics.push(body);
        }
        return { ok: true, status: 201, json: async () => body } as Response;
      }
      if (url.includes("/api/categories")) return { ok: true, json: async () => [{ id: "cat-1", name: "Phật Học", slug: "phat-hoc" }] } as Response;
      if (url.includes("/api/notes") || url.includes("/api/resources")) return { ok: true, json: async () => [] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("topic-topic-t2")).toHaveTextContent("Bát Chánh Đạo");
    });

    // Thực hiện flush queue
    await syncQueueService.flushQueue("/api", { bypassBackoff: true });

    // Mutation phải được xóa khỏi queue
    expect(syncQueueService.getQueue()).toHaveLength(0);

    // Không có bản ghi trùng lặp trên server
    const duplicates = serverStoredTopics.filter((t) => t.id === "topic-t2");
    expect(duplicates).toHaveLength(1);
  });

  // ─── Scenario 5 ──────────────────────────────────────────────────────────

  it("Scenario 5: Server entity is not overwritten by an older local mutation", async () => {
    const serverCategory = {
      id: "cat-1",
      name: "Danh Mục Server",
      slug: "danh-muc-server",
    };

    const serverTopicT1 = {
      id: "topic-t1",
      title: "Tiêu Đề Mới Từ Server",
      slug: "tieu-de-moi",
      categoryId: "cat-1",
      type: "general",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t1",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T12:00:00Z",
    };

    const staleLocalMutation = {
      id: "topic-t1",
      title: "Tiêu Đề Cũ Của Local",
      slug: "tieu-de-cu",
      categoryId: "cat-1",
      type: "general",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t1",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T08:00:00Z",
    };

    const mutations: SyncMutation[] = [
      {
        id: "mut-stale-t1",
        entityType: "topic",
        action: "save",
        entityId: "topic-t1",
        payload: staleLocalMutation,
        clientTimestamp: "2026-10-26T08:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/topics")) return { ok: true, json: async () => [serverTopicT1] } as Response;
      if (url.includes("/api/categories")) return { ok: true, json: async () => [serverCategory] } as Response;
      if (url.includes("/api/notes") || url.includes("/api/resources")) return { ok: true, json: async () => [] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Chờ server hydration hoàn tất
    await waitFor(() => {
      expect(screen.getByTestId("cat-cat-1")).toHaveTextContent("Danh Mục Server");
      expect(screen.getByTestId("topic-topic-t1")).toHaveTextContent("Tiêu Đề Mới Từ Server");
    });

    // Server canonical data MUST win: local stale title must not be present
    expect(screen.getByTestId("topic-count")).toHaveTextContent("1");
    expect(screen.queryByText("Tiêu Đề Cũ Của Local")).toBeNull();

    // Mutation vẫn nằm trong queue chờ đồng bộ
    expect(syncQueueService.getQueue().some((m) => m.entityId === "topic-t1")).toBe(true);
  });

  // ─── Scenario 6 ──────────────────────────────────────────────────────────

  it("Scenario 6: Pending delete prevents a server entity from reappearing", async () => {
    const serverCategory = {
      id: "cat-1",
      name: "Danh Mục Server",
      slug: "danh-muc-server",
    };

    const serverTopicT1 = {
      id: "topic-t1",
      title: "Topic Bị Xóa Offline",
      slug: "topic-bi-xoa",
      categoryId: "cat-1",
      type: "general",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t1",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T08:00:00Z",
    };

    const mutations: SyncMutation[] = [
      {
        id: "mut-del-t1",
        entityType: "topic",
        action: "delete",
        entityId: "topic-t1",
        clientTimestamp: "2026-10-26T09:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/topics")) return { ok: true, json: async () => [serverTopicT1] } as Response;
      if (url.includes("/api/categories")) return { ok: true, json: async () => [serverCategory] } as Response;
      if (url.includes("/api/notes") || url.includes("/api/resources")) return { ok: true, json: async () => [] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Chờ server hydration nạp xong Category
    await waitFor(() => {
      expect(screen.getByTestId("cat-cat-1")).toHaveTextContent("Danh Mục Server");
    });

    // Topic T1 bị pending delete nên KHÔNG được hiển thị lên UI dù server trả về
    expect(screen.getByTestId("topic-count")).toHaveTextContent("0");
    expect(screen.queryByTestId("topic-topic-t1")).toBeNull();

    // Mutation delete vẫn còn trong queue
    expect(syncQueueService.getQueue().some((m) => m.entityId === "topic-t1")).toBe(true);
  });

  // ─── Scenario 7 ──────────────────────────────────────────────────────────

  it("Scenario 7: Offline category deletion cascades across related knowledge entities", async () => {
    // Given the server holds category "C1", topic "T1", note "N1" and resource "R1"
    const serverCategoryC1 = {
      id: "cat-1",
      name: "Phật Học Cơ Bản",
      slug: "phat-hoc-co-ban",
      type: "phat-hoc",
      parentId: null,
    };
    const serverTopicT1 = {
      id: "topic-t1",
      title: "Tứ Diệu Đế",
      slug: "tu-dieu-de",
      categoryId: "cat-1",
      type: "phat-hoc",
      tags: [],
      links: [],
      studyProgress: {
        topicId: "topic-t1",
        status: "not_started",
        progress: 0,
      },
      createdAt: "2026-10-26T08:00:00Z",
      updatedAt: "2026-10-26T08:00:00Z",
    };
    const serverNoteN1 = {
      id: "note-n1",
      topicId: "topic-t1",
      title: "Khổ Đế",
      content: "Nội dung Khổ Đế",
      type: "study",
    };
    const serverResourceR1 = {
      id: "res-r1",
      topicId: "topic-t1",
      title: "Kinh Chuyển Pháp Luân",
      type: "book",
      url: "https://example.com/kinh",
    };

    // And the user deletes category "C1" while offline
    // And the category delete mutation is queued
    const mutations: SyncMutation[] = [
      {
        id: "mut-del-c1",
        entityType: "category",
        action: "delete",
        entityId: "cat-1",
        clientTimestamp: "2026-10-26T09:00:00Z",
        retryCount: 0,
        status: "pending",
      },
    ];
    safeSetLocalStorageItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(mutations));

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/categories")) return { ok: true, json: async () => [serverCategoryC1] } as Response;
      if (url.includes("/api/topics")) return { ok: true, json: async () => [serverTopicT1] } as Response;
      if (url.includes("/api/notes")) return { ok: true, json: async () => [serverNoteN1] } as Response;
      if (url.includes("/api/resources")) return { ok: true, json: async () => [serverResourceR1] } as Response;
      return { ok: true, json: async () => ({}) } as Response;
    });

    // When the application reloads before the queue is flushed
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Chờ hydration xử lý
    // Then category "C1" is not visible
    // And topic "T1" is not visible
    // And note "N1" is not visible
    // And resource "R1" is not visible
    await waitFor(() => {
      expect(screen.queryByTestId("cat-cat-1")).toBeNull();
      expect(screen.queryByTestId("topic-topic-t1")).toBeNull();
      expect(screen.queryByTestId("note-note-n1")).toBeNull();
      expect(screen.queryByTestId("res-res-r1")).toBeNull();
    });

    expect(screen.getByTestId("category-count")).toHaveTextContent("0");
    expect(screen.getByTestId("topic-count")).toHaveTextContent("0");
    expect(screen.getByTestId("note-count")).toHaveTextContent("0");
    expect(screen.getByTestId("resource-count")).toHaveTextContent("0");

    // And the delete mutation remains in the sync queue
    const queue = syncQueueService.getQueue();
    expect(queue.some((m) => m.entityId === "cat-1" && m.action === "delete")).toBe(true);
  });
});

