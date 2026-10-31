import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { DataProvider, useData } from "../../src/context/DataContext";
import { STORAGE_ROOT_KEY, STORAGE_VERSION_KEY } from "../../src/lib/storage";
import type { Topic, Note, Resource, Category, Tag } from "../../src/types";

describe("Ca kiểm chứng số 1 — Restore / Empty Rehydration Contract", () => {
  const STORAGE_KEY = STORAGE_ROOT_KEY;

  // 1. Dữ liệu seed ban đầu trong LocalStorage
  const seedCategory: Category = {
    id: "cat-seed",
    name: "Khoa Học Tự Nhiên",
    slug: "khoa-hoc-tu-nhien",
    type: "general",
    parentId: null,
  };

  const seedTopic: Topic = {
    id: "topic-seed",
    title: "Chủ Đề Seed Ban Đầu",
    slug: "chu-de-seed-ban-dau",
    categoryId: "cat-seed",
    type: "general",
    description: "Mô tả seed",
    content: "Nội dung seed",
    tags: ["tag-seed"],
    links: [],
    studyProgress: {
      topicId: "topic-seed",
      status: "not_started",
      progress: 0,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      totalNotes: 1,
      timeSpent: 0,
    },
    visibility: "active",
    createdAt: "2026-10-17T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  };

  const seedNote: Note = {
    id: "note-seed",
    topicId: "topic-seed",
    title: "Ghi chú Seed",
    content: "Nội dung ghi chú seed",
    type: "insight",
    isPrivate: false,
    tags: ["tag-seed"],
    createdAt: "2026-10-17T00:00:00.000Z",
    updatedAt: "2026-10-17T00:00:00.000Z",
  };

  const seedResource: Resource = {
    id: "res-seed",
    topicId: "topic-seed",
    title: "Tài liệu Seed",
    type: "book",
    createdAt: "2026-10-17T00:00:00.000Z",
  };

  const seedTag: Tag = {
    id: "tag-seed",
    name: "tag-seed",
    slug: "tag-seed",
    color: "#3b82f6",
    count: 1,
  };

  // 2. Dữ liệu Server Canonical nạp qua Bootstrap
  const bootstrapCategory: Category = {
    id: "cat-bootstrap-canonical",
    name: "Khoa Học Máy Tính",
    slug: "khoa-hoc-may-tinh",
    type: "general",
    parentId: null,
  };

  const bootstrapTopic: Topic = {
    id: "topic-bootstrap-canonical",
    title: "Cấu Trúc Dữ Liệu & Giải Thuật",
    slug: "cau-truc-du-lieu-va-giai-thuat",
    categoryId: "cat-bootstrap-canonical",
    type: "general",
    description: "Canonical server topic",
    content: "Canonical server content",
    tags: ["canonical-algo"],
    links: [],
    studyProgress: {
      topicId: "topic-bootstrap-canonical",
      status: "in_progress",
      progress: 50,
      interval: 2,
      easeFactor: 2.5,
      repetitions: 1,
      totalNotes: 1,
      timeSpent: 30,
    },
    visibility: "active",
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };

  const bootstrapNote: Note = {
    id: "note-bootstrap-canonical",
    topicId: "topic-bootstrap-canonical",
    title: "Ghi chú Cây Nhị Phân",
    content: "Độ phức tạp tìm kiếm O(log N)",
    type: "study",
    isPrivate: false,
    tags: ["canonical-algo"],
    createdAt: "2026-10-20T00:00:00.000Z",
    updatedAt: "2026-10-20T00:00:00.000Z",
  };

  const bootstrapResource: Resource = {
    id: "res-bootstrap-canonical",
    topicId: "topic-bootstrap-canonical",
    title: "Introduction to Algorithms (CLRS)",
    type: "book",
    createdAt: "2026-10-20T00:00:00.000Z",
  };

  // Dữ liệu Reload mặc định hợp lệ KHÁC bootstrap để kiểm chứng cache preservation & partial update
  const defaultReloadCategory: Category = {
    id: "cat-reload-valid",
    name: "Toán Ứng Dụng",
    slug: "toan-ung-dung",
    type: "general",
    parentId: null,
  };

  const defaultReloadTopic: Topic = {
    ...bootstrapTopic,
    id: "topic-reload-valid",
    title: "Đại Số Tuyến Tính",
    slug: "dai-so-tuyen-tinh",
    categoryId: "cat-reload-valid",
  };

  const defaultReloadNote: Note = {
    ...bootstrapNote,
    id: "note-reload-valid",
    topicId: "topic-reload-valid",
    title: "Ghi chú Ma Trận",
    content: "Nội dung ma trận hợp lệ",
  };

  const defaultReloadResource: Resource = {
    ...bootstrapResource,
    id: "res-reload-valid",
    topicId: "topic-reload-valid",
    title: "Linear Algebra Done Right",
  };

  // 3. Request Journal & Quản lý Phase
  type ExecutionPhase = "bootstrap" | "reload" | "user-mutation";
  interface JournalEntry {
    phase: ExecutionPhase;
    method: string;
    pathname: string;
    fullUrl: string;
    body?: unknown;
    status: number;
    isAllowlisted: boolean;
  }

  type MockResponseDescriptor =
    | { status: number; body: unknown }
    | { status: number; rejectJsonSyntaxError: boolean };

  let currentPhase: ExecutionPhase = "bootstrap";
  let requestJournal: JournalEntry[] = [];
  let unexpectedJournal: JournalEntry[] = [];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_VERSION_KEY, "4");
    // Seed localStorage với state phân biệt
    localStorage.setItem(`${STORAGE_KEY}_categories`, JSON.stringify([seedCategory]));
    localStorage.setItem(`${STORAGE_KEY}_topics`, JSON.stringify([seedTopic]));
    localStorage.setItem(`${STORAGE_KEY}_notes`, JSON.stringify([seedNote]));
    localStorage.setItem(`${STORAGE_KEY}_resources`, JSON.stringify([seedResource]));
    localStorage.setItem(`${STORAGE_KEY}_tags`, JSON.stringify([seedTag]));

    currentPhase = "bootstrap";
    requestJournal = [];
    unexpectedJournal = [];
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DataProvider>{children}</DataProvider>
  );

  /**
   * Router Dispatcher có Request Journal và Allowlist nghiêm ngặt theo Phase + Method + Pathname.
   * Hỗ trợ rejectJsonSyntaxError: true để mô phỏng response.json() reject SyntaxError trực tiếp.
   */
  const setupPhaseRouter = (routes: {
    bootstrap?: Record<string, (req: { method: string; body: unknown }) => MockResponseDescriptor>;
    reload?: Record<string, (req: { method: string; body: unknown }) => MockResponseDescriptor>;
    "user-mutation"?: Record<string, (req: { method: string; body: unknown }) => MockResponseDescriptor>;
  }) => {
    // Default bootstrap routes trả về snapshot canonical phân biệt với seed
    const defaultBootstrapRoutes: Record<string, (req: { method: string; body: unknown }) => MockResponseDescriptor> = {
      "GET /api/topics": () => ({ status: 200, body: [bootstrapTopic] }),
      "GET /api/categories": () => ({ status: 200, body: [bootstrapCategory] }),
      "GET /api/notes": () => ({ status: 200, body: [bootstrapNote] }),
      "GET /api/resources": () => ({ status: 200, body: [bootstrapResource] }),
      "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
    };

    const activeBootstrapRoutes = { ...defaultBootstrapRoutes, ...(routes.bootstrap || {}) };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const fullUrl = String(input);
      let pathname = fullUrl;
      try {
        const parsed = new URL(fullUrl, "http://localhost:3000");
        pathname = parsed.pathname;
      } catch {
        // raw fallback
      }

      const method = (init?.method || "GET").toUpperCase();
      let body: unknown = undefined;
      if (init?.body && typeof init.body === "string") {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      }

      const routeKey = `${method} ${pathname}`;
      let handler: ((req: { method: string; body: unknown }) => MockResponseDescriptor) | undefined = undefined;

      if (currentPhase === "bootstrap") {
        handler = activeBootstrapRoutes[routeKey];
      } else if (currentPhase === "reload") {
        handler = routes.reload?.[routeKey];
      } else if (currentPhase === "user-mutation") {
        handler = routes["user-mutation"]?.[routeKey];
      }

      if (handler) {
        const responseData = handler({ method, body });
        const entry: JournalEntry = {
          phase: currentPhase,
          method,
          pathname,
          fullUrl,
          body,
          status: responseData.status,
          isAllowlisted: true,
        };
        requestJournal.push(entry);

        if ("rejectJsonSyntaxError" in responseData && responseData.rejectJsonSyntaxError) {
          return {
            ok: responseData.status >= 200 && responseData.status < 300,
            status: responseData.status,
            json: async () => {
              throw new SyntaxError("Unexpected token < in JSON at position 0");
            },
            text: async () => "<!DOCTYPE html><html><body>Error</body></html>",
          } as unknown as Response;
        }

        const successBody = "body" in responseData ? responseData.body : undefined;
        return {
          ok: responseData.status >= 200 && responseData.status < 300,
          status: responseData.status,
          json: async () => successBody,
          text: async () => (typeof successBody === "string" ? successBody : JSON.stringify(successBody)),
        } as unknown as Response;
      }

      // Unexpected Request: Ghi nhận và từ chối rõ ràng bằng 404 (KHÔNG ok:true)
      const badEntry: JournalEntry = {
        phase: currentPhase,
        method,
        pathname,
        fullUrl,
        body,
        status: 404,
        isAllowlisted: false,
      };
      requestJournal.push(badEntry);
      unexpectedJournal.push(badEntry);

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: `Unexpected request rejected: ${routeKey} in phase ${currentPhase}` }),
        text: async () => `Unexpected request rejected: ${routeKey}`,
      } as Response;
    });
  };

  /**
   * Helper chờ Bootstrap hoàn tất dựa trên waitFor các canonical markers, không dùng sleep.
   */
  const waitForBootstrapCompletion = async (result: { current: ReturnType<typeof useData> }) => {
    await waitFor(() => {
      expect(result.current.topics[0]?.id).toBe("topic-bootstrap-canonical");
      expect(result.current.categories[0]?.id).toBe("cat-bootstrap-canonical");
      expect(result.current.notes[0]?.id).toBe("note-bootstrap-canonical");
      expect(result.current.resources[0]?.id).toBe("res-bootstrap-canonical");
    });
  };

  // =========================================================================
  // NHÓM 1: EMPTY REHYDRATION & SELECTIVE EMPTY CONTRACTS
  // =========================================================================

  it("1.1 (RED): reloadAllData chấp nhận [] cho toàn bộ collections khi restore clean-slate", async () => {
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [] }),
        "GET /api/categories": () => ({ status: 200, body: [] }),
        "GET /api/notes": () => ({ status: 200, body: [] }),
        "GET /api/resources": () => ({ status: 200, body: [] }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    // Chuyển sang phase reload
    currentPhase = "reload";
    let reloadSuccess = false;
    await act(async () => {
      reloadSuccess = await result.current.reloadAllData();
    });

    // MONG ĐỢI: reloadAllData return true, state và cache rỗng sạch sẽ, không fallback stale
    expect(reloadSuccess).toBe(true);
    expect(result.current.topics).toEqual([]);
    expect(result.current.categories).toEqual([]);
    expect(result.current.notes).toEqual([]);
    expect(result.current.resources).toEqual([]);

    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}_topics`) || "null")).toEqual([]);
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}_categories`) || "null")).toEqual([]);
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}_notes`) || "null")).toEqual([]);
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}_resources`) || "null")).toEqual([]);
    expect(unexpectedJournal).toEqual([]);
  });

  it("1.2 (RED): reloadAllData làm rỗng notes và resources khi server trả về [], không giữ state cũ", async () => {
    const freshTopic: Topic = {
      ...bootstrapTopic,
      id: "topic-fresh-after-reload",
      title: "Chủ Đề Mới",
      slug: "chu-de-moi",
    };

    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [freshTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [] }),
        "GET /api/notes": () => ({ status: 200, body: [] }),
        "GET /api/resources": () => ({ status: 200, body: [] }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    let reloadSuccess = false;
    await act(async () => {
      reloadSuccess = await result.current.reloadAllData();
    });

    expect(reloadSuccess).toBe(true);
    expect(result.current.topics.length).toBe(1);
    expect(result.current.topics[0].id).toBe("topic-fresh-after-reload");
    expect(result.current.categories).toEqual([]);
    expect(result.current.notes).toEqual([]);
    expect(result.current.resources).toEqual([]);
    expect(unexpectedJournal).toEqual([]);
  });

  // =========================================================================
  // NHÓM 2: READ-ONLY RELOAD CONTRACT & ZERO WRITEBACK MUTATION
  // =========================================================================

  it("2.1 (RED): reloadAllData là read-only refresh và KHÔNG ĐƯỢC phát sinh HTTP mutation do reload gây ra", async () => {
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [bootstrapTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [bootstrapCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [] }),
        "GET /api/resources": () => ({ status: 200, body: [] }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    // Đánh dấu mốc journal trước khi gọi reload
    const journalMarkerBeforeReload = requestJournal.length;

    currentPhase = "reload";
    await act(async () => {
      await result.current.reloadAllData();
    });

    // Lọc tất cả request phát sinh trong phase reload
    const reloadPhaseRequests = requestJournal.slice(journalMarkerBeforeReload);
    const reloadMutations = reloadPhaseRequests.filter((r) =>
      ["POST", "PUT", "PATCH", "DELETE"].includes(r.method)
    );

    // MONG ĐỢI: Trong phase reload, KHÔNG ĐƯỢC có bất kỳ HTTP mutation nào!
    // THỰC TẾ (RED): Baseline gọi dataRepository.syncHydrate phát sinh POST /api/sync/hydrate
    expect(reloadMutations).toEqual([]);
    expect(unexpectedJournal).toEqual([]);
  });

  // =========================================================================
  // NHÓM 3: USER MUTATION VẪN HOẠT ĐỘNG BÌNH THƯỜNG SAU RELOAD (WITH AUTO-SYNC ASSERTIONS)
  // =========================================================================

  it("3.1 (REGRESSION GUARD): Sau reload thành công, user mutation hợp lệ vẫn persist và sync bình thường", async () => {
    const updatedCategory: Category = {
      ...bootstrapCategory,
      id: "cat-after-reload",
      name: "Tên Category Sau Reload",
      slug: "ten-category-sau-reload",
    };

    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [bootstrapTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [updatedCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [bootstrapNote] }),
        "GET /api/resources": () => ({ status: 200, body: [bootstrapResource] }),
      },
      "user-mutation": {
        "POST /api/categories": (req) => ({ status: 200, body: req.body }),
        "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    await act(async () => {
      await result.current.reloadAllData();
    });

    // Người dùng thực hiện mutation: Thêm category mới thông qua public context action
    currentPhase = "user-mutation";
    const mutationJournalMarker = requestJournal.length;

    let createdId = "";
    await act(async () => {
      createdId = result.current.addCategory({
        name: "Lĩnh Vực Người Dùng Tạo",
        slug: "linh-vuc-nguoi-dung-tao",
        type: "general",
      });
    });

    expect(createdId).toBeTruthy();
    expect(result.current.categories.some((c) => c.name === "Lĩnh Vực Người Dùng Tạo")).toBe(true);

    const userRequests = requestJournal.slice(mutationJournalMarker);
    const directCategoryPost = userRequests.find((r) => r.method === "POST" && r.pathname === "/api/categories");
    expect(directCategoryPost).toBeDefined();
    expect((directCategoryPost?.body as { name?: string } | undefined)?.name).toBe("Lĩnh Vực Người Dùng Tạo");

    // Bổ sung Assertion riêng: Có POST /api/sync/hydrate ở phase user-mutation với entity vừa tạo
    await waitFor(() => {
      const syncHydratePost = requestJournal
        .slice(mutationJournalMarker)
        .find((r) => r.phase === "user-mutation" && r.method === "POST" && r.pathname === "/api/sync/hydrate");
      expect(syncHydratePost).toBeDefined();

      const syncBody = syncHydratePost?.body as { categories?: Category[] } | undefined;
      expect(syncBody?.categories).toBeDefined();
      const createdInSync = syncBody?.categories?.find((c) => c.id === createdId);
      expect(createdInSync).toBeDefined();
      expect(createdInSync?.name).toBe("Lĩnh Vực Người Dùng Tạo");
      expect(createdInSync?.slug).toBe("linh-vuc-nguoi-dung-tao");
    });

    expect(unexpectedJournal).toEqual([]);
  });

  it("3.2 (REGRESSION GUARD): Snapshot reload cùng nội dung rồi user mutation: không mất lần sync của người dùng", async () => {
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [bootstrapTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [bootstrapCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [bootstrapNote] }),
        "GET /api/resources": () => ({ status: 200, body: [bootstrapResource] }),
      },
      "user-mutation": {
        "POST /api/topics": (req) => ({ status: 200, body: req.body }),
        "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    await act(async () => {
      await result.current.reloadAllData();
    });

    // Sau khi reload snapshot y hệt, người dùng thêm topic mới
    currentPhase = "user-mutation";
    const userMutationMarker = requestJournal.length;

    let newTopicId = "";
    await act(async () => {
      newTopicId = result.current.addTopic({
        title: "Topic Mới Của User",
        slug: "topic-moi-cua-user",
        categoryId: bootstrapCategory.id,
        type: "general",
        description: "Mô tả",
        content: "Nội dung",
        tags: ["user-tag"],
      });
    });

    expect(newTopicId).toBeTruthy();
    expect(result.current.topics.some((t) => t.id === newTopicId)).toBe(true);

    const userRequests = requestJournal.slice(userMutationMarker);
    const directTopicPost = userRequests.find((r) => r.method === "POST" && r.pathname === "/api/topics");
    expect(directTopicPost).toBeDefined();

    // Bổ sung Assertion riêng: Có POST /api/sync/hydrate ở phase user-mutation với topic vừa tạo
    await waitFor(() => {
      const syncHydratePost = requestJournal
        .slice(userMutationMarker)
        .find((r) => r.phase === "user-mutation" && r.method === "POST" && r.pathname === "/api/sync/hydrate");
      expect(syncHydratePost).toBeDefined();

      const syncBody = syncHydratePost?.body as { topics?: Topic[] } | undefined;
      expect(syncBody?.topics).toBeDefined();
      const topicInSync = syncBody?.topics?.find((t) => t.id === newTopicId);
      expect(topicInSync).toBeDefined();
      expect(topicInSync?.title).toBe("Topic Mới Của User");
      expect(topicInSync?.slug).toBe("topic-moi-cua-user");
    });

    expect(unexpectedJournal).toEqual([]);
  });

  it("3.3 (REGRESSION GUARD): Reload thất bại rồi user mutation: không bị chặn sync", async () => {
    // Reload gặp lỗi HTTP 500
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 500, body: { error: "Database offline" } }),
      },
      "user-mutation": {
        "POST /api/categories": (req) => ({ status: 200, body: req.body }),
        "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    let reloadResult = true;
    await act(async () => {
      reloadResult = await result.current.reloadAllData();
    });
    expect(reloadResult).toBe(false);

    // User mutation sau reload thất bại
    currentPhase = "user-mutation";
    const userMutationMarker = requestJournal.length;

    let createdId = "";
    await act(async () => {
      createdId = result.current.addCategory({
        name: "Lĩnh Vực Sau Fail",
        slug: "linh-vuc-sau-fail",
        type: "general",
      });
    });

    expect(result.current.categories.some((c) => c.name === "Lĩnh Vực Sau Fail")).toBe(true);
    const userRequests = requestJournal.slice(userMutationMarker);
    expect(userRequests.some((r) => r.method === "POST" && r.pathname === "/api/categories")).toBe(true);

    // Bổ sung Assertion riêng: Có POST /api/sync/hydrate ở phase user-mutation mang category mới
    await waitFor(() => {
      const syncHydratePost = requestJournal
        .slice(userMutationMarker)
        .find((r) => r.phase === "user-mutation" && r.method === "POST" && r.pathname === "/api/sync/hydrate");
      expect(syncHydratePost).toBeDefined();

      const syncBody = syncHydratePost?.body as { categories?: Category[] } | undefined;
      expect(syncBody?.categories).toBeDefined();
      const createdInSync = syncBody?.categories?.find((c) => c.id === createdId);
      expect(createdInSync).toBeDefined();
      expect(createdInSync?.name).toBe("Lĩnh Vực Sau Fail");
      expect(createdInSync?.slug).toBe("linh-vuc-sau-fail");
    });

    expect(unexpectedJournal).toEqual([]);
  });

  it("3.4 (FIELD-ONLY GUARD): Resource chỉ đổi url/notes giữ nguyên id/title/type/topicId: auto-sync vẫn phát sinh và mang URL mới", async () => {
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [bootstrapTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [bootstrapCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [bootstrapNote] }),
        "GET /api/resources": () => ({ status: 200, body: [bootstrapResource] }),
      },
      "user-mutation": {
        "POST /api/resources": (req) => ({ status: 200, body: req.body }),
        "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    await act(async () => {
      await result.current.reloadAllData();
    });

    // Sau khi reload, user chỉ update url và notes của resource (id, title, type, topicId không đổi)
    currentPhase = "user-mutation";
    const userMutationMarker = requestJournal.length;

    await act(async () => {
      result.current.updateResource(bootstrapResource.id, {
        url: "https://example.com/algorithms-new-url",
        notes: "Ghi chú tài liệu mới cập nhật",
      });
    });

    const updatedResource = result.current.resources.find((r) => r.id === bootstrapResource.id);
    expect(updatedResource?.url).toBe("https://example.com/algorithms-new-url");
    expect(updatedResource?.notes).toBe("Ghi chú tài liệu mới cập nhật");

    // Direct persistence: saveResource
    const userRequests = requestJournal.slice(userMutationMarker);
    const directResPost = userRequests.find((r) => r.method === "POST" && r.pathname === "/api/resources");
    expect(directResPost).toBeDefined();

    // Auto-sync payload PHẢI chứa URL và notes mới (không bị snapshot guard coi là bằng nhau do chỉ check id/title/type/topicId)
    await waitFor(() => {
      const syncHydratePost = requestJournal
        .slice(userMutationMarker)
        .find((r) => r.phase === "user-mutation" && r.method === "POST" && r.pathname === "/api/sync/hydrate");
      expect(syncHydratePost).toBeDefined();

      const syncBody = syncHydratePost?.body as { resources?: Resource[] } | undefined;
      expect(syncBody?.resources).toBeDefined();
      const resInSync = syncBody?.resources?.find((r) => r.id === bootstrapResource.id);
      expect(resInSync).toBeDefined();
      expect(resInSync?.url).toBe("https://example.com/algorithms-new-url");
      expect(resInSync?.notes).toBe("Ghi chú tài liệu mới cập nhật");
    });

    expect(unexpectedJournal).toEqual([]);
  });

  // =========================================================================
  // NHÓM 4: PARAMETERIZED VALIDATION MATRIX VỚI CACHE PRESERVATION, SYNTAXERROR & VALID-FIRST/INVALID-SECOND
  // =========================================================================

  const validationTestCases: Array<{
    targetCollection: string;
    label: string;
    overrideRoute: Record<string, () => MockResponseDescriptor>;
  }> = [
    // 4.1 Lỗi HTTP Status hoặc Non-Array
    {
      targetCollection: "topics",
      label: "Topics endpoint HTTP 500",
      overrideRoute: { "GET /api/topics": () => ({ status: 500, body: { error: "Server Error" } }) },
    },
    {
      targetCollection: "topics",
      label: "Topics endpoint trả về non-array",
      overrideRoute: { "GET /api/topics": () => ({ status: 200, body: { notAnArray: true } }) },
    },
    {
      targetCollection: "categories",
      label: "Categories endpoint trả về non-array",
      overrideRoute: { "GET /api/categories": () => ({ status: 200, body: "MALFORMED_STRING_NOT_ARRAY" }) },
    },
    {
      targetCollection: "notes",
      label: "Notes endpoint trả về non-array",
      overrideRoute: { "GET /api/notes": () => ({ status: 200, body: { notAnArrayNote: true } }) },
    },
    {
      targetCollection: "resources",
      label: "Resources endpoint trả về non-array",
      overrideRoute: { "GET /api/resources": () => ({ status: 200, body: 12345 }) },
    },

    // 4.2 Lỗi JSON SyntaxError khi json() reject
    {
      targetCollection: "topics",
      label: "Topics endpoint JSON SyntaxError",
      overrideRoute: { "GET /api/topics": () => ({ status: 200, rejectJsonSyntaxError: true }) },
    },
    {
      targetCollection: "categories",
      label: "Categories endpoint JSON SyntaxError",
      overrideRoute: { "GET /api/categories": () => ({ status: 200, rejectJsonSyntaxError: true }) },
    },
    {
      targetCollection: "notes",
      label: "Notes endpoint JSON SyntaxError",
      overrideRoute: { "GET /api/notes": () => ({ status: 200, rejectJsonSyntaxError: true }) },
    },
    {
      targetCollection: "resources",
      label: "Resources endpoint JSON SyntaxError",
      overrideRoute: { "GET /api/resources": () => ({ status: 200, rejectJsonSyntaxError: true }) },
    },

    // 4.3 Lỗi Single Malformed Item
    {
      targetCollection: "categories",
      label: "Categories chứa item sai shape (thiếu slug và name)",
      overrideRoute: { "GET /api/categories": () => ({ status: 200, body: [{ id: "bad-cat", broken: true }] }) },
    },
    {
      targetCollection: "notes",
      label: "Notes chứa item sai shape (thiếu content và topicId)",
      overrideRoute: { "GET /api/notes": () => ({ status: 200, body: [{ id: "bad-note", invalidField: 123 }] }) },
    },
    {
      targetCollection: "resources",
      label: "Resources chứa item có type không hợp lệ",
      overrideRoute: { "GET /api/resources": () => ({ status: 200, body: [{ id: "bad-res", type: "unsupported_unknown_type" }] }) },
    },

    // 4.4 Lỗi Valid-First / Invalid-Second (Phần tử đầu hợp lệ, phần tử sau hỏng)
    {
      targetCollection: "categories",
      label: "Categories valid-first / invalid-second",
      overrideRoute: {
        "GET /api/categories": () => ({
          status: 200,
          body: [
            defaultReloadCategory,
            { id: "bad-cat-2", brokenShapeWithoutName: true },
          ],
        }),
      },
    },
    {
      targetCollection: "notes",
      label: "Notes valid-first / invalid-second",
      overrideRoute: {
        "GET /api/notes": () => ({
          status: 200,
          body: [
            defaultReloadNote,
            { id: "bad-note-2", missingContentAndTopicId: true },
          ],
        }),
      },
    },
    {
      targetCollection: "resources",
      label: "Resources valid-first / invalid-second",
      overrideRoute: {
        "GET /api/resources": () => ({
          status: 200,
          body: [
            defaultReloadResource,
            { id: "bad-res-2", title: "Broken Book", type: "not_a_valid_resource_type" },
          ],
        }),
      },
    },
    {
      targetCollection: "topics",
      label: "Topics valid-first / invalid-second",
      overrideRoute: {
        "GET /api/topics": () => ({
          status: 200,
          body: [
            defaultReloadTopic,
            { id: "bad-topic-2", missingTitleAndCategory: true },
          ],
        }),
      },
    },
  ];

  validationTestCases.forEach(({ label, overrideRoute }) => {
    it(`4.x Validation Guard (PASS/RED): ${label} - return false, bảo toàn 100% snapshot state & raw cache`, async () => {
      // Default valid reload routes mang dữ liệu MỚI (defaultReload*) KHÁC bootstrap
      const defaultValidReloadRoutes: Record<string, () => MockResponseDescriptor> = {
        "GET /api/topics": () => ({ status: 200, body: [defaultReloadTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [defaultReloadCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [defaultReloadNote] }),
        "GET /api/resources": () => ({ status: 200, body: [defaultReloadResource] }),
      };

      const reloadRoutes = {
        ...defaultValidReloadRoutes,
        ...overrideRoute,
      };

      setupPhaseRouter({
        reload: reloadRoutes,
      });

      const { result } = renderHook(() => useData(), { wrapper });
      await waitForBootstrapCompletion(result);

      // Chụp snapshot in-memory state sau bootstrap
      const prevTopicsSnapshot = result.current.topics;
      const prevCategoriesSnapshot = result.current.categories;
      const prevNotesSnapshot = result.current.notes;
      const prevResourcesSnapshot = result.current.resources;

      // Chụp raw string của 4 cache keys trong localStorage sau bootstrap
      const rawCategoriesBefore = localStorage.getItem(`${STORAGE_KEY}_categories`);
      const rawTopicsBefore = localStorage.getItem(`${STORAGE_KEY}_topics`);
      const rawNotesBefore = localStorage.getItem(`${STORAGE_KEY}_notes`);
      const rawResourcesBefore = localStorage.getItem(`${STORAGE_KEY}_resources`);

      expect(rawCategoriesBefore).not.toBeNull();
      expect(rawTopicsBefore).not.toBeNull();
      expect(rawNotesBefore).not.toBeNull();
      expect(rawResourcesBefore).not.toBeNull();

      currentPhase = "reload";
      let outcome = true;
      await act(async () => {
        outcome = await result.current.reloadAllData();
      });

      // MONG ĐỢI: Khi bất kỳ endpoint hoặc item nào thất bại, reloadAllData return false
      // Không được cập nhật từng phần (atomic rollback/preservation)
      expect(outcome).toBe(false);

      // 1. In-memory state giữ nguyên 100%
      expect(result.current.topics).toEqual(prevTopicsSnapshot);
      expect(result.current.categories).toEqual(prevCategoriesSnapshot);
      expect(result.current.notes).toEqual(prevNotesSnapshot);
      expect(result.current.resources).toEqual(prevResourcesSnapshot);

      // 2. Toàn bộ 4 raw cache keys trong localStorage giữ nguyên 100%
      expect(localStorage.getItem(`${STORAGE_KEY}_categories`)).toBe(rawCategoriesBefore);
      expect(localStorage.getItem(`${STORAGE_KEY}_topics`)).toBe(rawTopicsBefore);
      expect(localStorage.getItem(`${STORAGE_KEY}_notes`)).toBe(rawNotesBefore);
      expect(localStorage.getItem(`${STORAGE_KEY}_resources`)).toBe(rawResourcesBefore);

      expect(unexpectedJournal).toEqual([]);
    });
  });

  // =========================================================================
  // NHÓM 5: NON-EMPTY SNAPSHOT & MODAL PROVIDER CONTRACT
  // =========================================================================

  it("5.1 (PASS): reloadAllData cập nhật đầy đủ snapshot mới khi server trả về dữ liệu khác biệt", async () => {
    const brandNewCategory: Category = {
      id: "cat-triet-hoc",
      name: "Triết Học Hiện Sinh",
      slug: "triet-hoc-hien-sinh",
      type: "general",
      parentId: null,
    };

    const brandNewTopic: Topic = {
      ...bootstrapTopic,
      id: "topic-triet-hoc",
      title: "Hiện Sinh Là Một Chủ Nghĩa Nhân Bản",
      slug: "hien-sinh-la-mot-chu-nghia-nhan-ban",
      categoryId: "cat-triet-hoc",
      tags: ["triet-hoc"],
    };

    const brandNewNote: Note = {
      id: "note-triet-hoc",
      topicId: "topic-triet-hoc",
      title: "Luận điểm Sartre",
      content: "Tồn tại có trước bản chất",
      type: "insight",
      isPrivate: false,
      tags: ["triet-hoc"],
      createdAt: "2026-10-31T00:00:00.000Z",
      updatedAt: "2026-10-31T00:00:00.000Z",
    };

    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [brandNewTopic] }),
        "GET /api/categories": () => ({ status: 200, body: [brandNewCategory] }),
        "GET /api/notes": () => ({ status: 200, body: [brandNewNote] }),
        "GET /api/resources": () => ({ status: 200, body: [] }),
        "POST /api/sync/hydrate": () => ({ status: 200, body: { success: true } }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    let outcome = false;
    await act(async () => {
      outcome = await result.current.reloadAllData();
    });

    expect(outcome).toBe(true);
    expect(result.current.categories[0].id).toBe("cat-triet-hoc");
    expect(result.current.topics[0].id).toBe("topic-triet-hoc");
    expect(result.current.notes[0].id).toBe("note-triet-hoc");
    expect(result.current.resources).toEqual([]);
    expect(unexpectedJournal).toEqual([]);
  });

  it("5.2 (RED): Provider contract - reloadAllData trả về true khi restore clean slate để caller hoàn tất thành công", async () => {
    setupPhaseRouter({
      reload: {
        "GET /api/topics": () => ({ status: 200, body: [] }),
        "GET /api/categories": () => ({ status: 200, body: [] }),
        "GET /api/notes": () => ({ status: 200, body: [] }),
        "GET /api/resources": () => ({ status: 200, body: [] }),
      },
    });

    const { result } = renderHook(() => useData(), { wrapper });
    await waitForBootstrapCompletion(result);

    currentPhase = "reload";
    let rehydrated = false;
    await act(async () => {
      rehydrated = await result.current.reloadAllData();
    });

    // MONG ĐỢI: ExportImportModal nhận rehydrated === true
    // THỰC TẾ (RED): Baseline trả về false do topicsData.length === 0
    expect(rehydrated).toBe(true);
    expect(unexpectedJournal).toEqual([]);
  });
});
