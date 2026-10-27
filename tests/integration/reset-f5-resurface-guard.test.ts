import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiDataRepository } from "../../src/services/dataRepository";
import { LocalStorageDataRepository } from "../../src/services/dataRepository";
import { SyncQueueService } from "../../src/services/syncQueue";

/**
 * Permanent Anti-Regression Guard: Chốt chặn chống hồi sinh dữ liệu cũ sau khi Reset & F5 (ADR-076 / ADR-077)
 *
 * Yêu cầu cốt lõi:
 * 1. Khi người dùng bấm "Đặt Lại Dữ Liệu Mẫu", hệ thống PHẢI gọi reset database trên backend thành công.
 * 2. Khi người dùng bấm F5 reload (gọi loadInitialData()), dữ liệu cũ TUYỆT ĐỐI KHÔNG được hồi sinh.
 * 3. Mọi danh mục, chủ đề, ghi chú phải là mảng rỗng [] (Zero-Default Clean Slate).
 */
describe("Permanent Anti-Regression Guard: Reset Database & F5 Resurface Prevention", () => {
  let serverDb: {
    categories: Array<{ id: string; name: string }>;
    topics: Array<{ id: string; title: string; categoryId: string }>;
    notes: Array<{ id: string; title: string; topicId: string }>;
    resources: Array<any>;
  };
  let mockFetch: any;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // 1. Giả lập cơ sở dữ liệu server ban đầu đang chứa dữ liệu người dùng
    serverDb = {
      categories: [{ id: "cat-math", name: "Toán Học Cao Cấp" }],
      topics: [{ id: "topic-calculus", title: "Giải Tích Vi Tích Phân", categoryId: "cat-math" }],
      notes: [{ id: "note-euler", title: "Công Thức Euler", topicId: "topic-calculus" }],
      resources: [],
    };

    // Mock fetch interceptor kết nối với serverDb
    mockFetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = url.toString();

      // Endpoint: POST /api/data/reset
      if (urlStr.includes("/api/data/reset") && options?.method === "POST") {
        const resetHeader = options?.headers?.["X-Reset-Confirmation"];
        if (resetHeader !== "knowledge-os-secure-local-reset-secret-2026") {
          return {
            ok: false,
            status: 403,
            json: async () => ({ error: "INVALID_CONFIRMATION_TOKEN" }),
          };
        }

        // Xóa sạch cơ sở dữ liệu trên máy chủ (Zero-Default Clean Slate)
        serverDb.categories = [];
        serverDb.topics = [];
        serverDb.notes = [];
        serverDb.resources = [];

        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            message: "Database has been reset to a zero-default clean slate.",
            resetAt: new Date().toISOString(),
          }),
        };
      }

      // Endpoint: GET /api/topics
      if (urlStr.includes("/api/topics") && (!options || options.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => serverDb.topics,
        };
      }

      // Endpoint: GET /api/categories
      if (urlStr.includes("/api/categories") && (!options || options.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => serverDb.categories,
        };
      }

      // Endpoint: GET /api/notes
      if (urlStr.includes("/api/notes") && (!options || options.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => serverDb.notes,
        };
      }

      // Endpoint: GET /api/resources
      if (urlStr.includes("/api/resources") && (!options || options.method === "GET")) {
        return {
          ok: true,
          status: 200,
          json: async () => serverDb.resources,
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
      };
    });

    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Khẳng định: Sau khi resetAllData(), thao tác F5 (loadInitialData) bắt buộc trả về mảng rỗng categories: [], topics: [], notes: []", async () => {
    const localFallback = new LocalStorageDataRepository();
    const syncQueue = new SyncQueueService();
    const repo = new ApiDataRepository("/api", localFallback, syncQueue);

    // Bước 1: Kiểm tra trước khi reset, dữ liệu trên server vẫn còn nguyên
    const preResetData = await repo.loadInitialData();
    expect(preResetData.categories.length).toBe(1);
    expect(preResetData.topics.length).toBe(1);
    expect(preResetData.notes.length).toBe(1);
    expect(preResetData.topics[0].title).toBe("Giải Tích Vi Tích Phân");

    // Bước 2: Thực thi Reset dữ liệu
    const resetSuccess = await repo.resetAllData();
    expect(resetSuccess).toBe(true);

    // Xác nhận đã gửi request POST /api/data/reset với đúng token xác nhận
    const resetCall = mockFetch.mock.calls.find((call: any[]) =>
      call[0].includes("/api/data/reset")
    );
    expect(resetCall).toBeDefined();
    expect(resetCall[1].headers["X-Reset-Confirmation"]).toBe(
      "knowledge-os-secure-local-reset-secret-2026"
    );

    // Xác nhận database trên server đã được xóa sạch
    expect(serverDb.categories).toEqual([]);
    expect(serverDb.topics).toEqual([]);
    expect(serverDb.notes).toEqual([]);

    // Bước 3: Mô phỏng F5 reload trình duyệt (gọi loadInitialData trên repository mới)
    const newSessionRepo = new ApiDataRepository("/api", new LocalStorageDataRepository(), new SyncQueueService());
    const postF5Data = await newSessionRepo.loadInitialData();

    // Bước 4: Khẳng định tuyệt đối kết quả F5 không được hồi sinh dữ liệu cũ
    expect(postF5Data.categories).toEqual([]);
    expect(postF5Data.topics).toEqual([]);
    expect(postF5Data.notes).toEqual([]);
    expect(postF5Data.resources).toEqual([]);
  });

  it("Khẳng định: Nếu backend từ chối reset (403/503), dataRepository.resetAllData PHẢI ném lỗi để ngăn xóa giả vờ ở client", async () => {
    // Giả lập server từ chối reset
    mockFetch.mockImplementationOnce(async (url: string) => {
      if (url.toString().includes("/api/data/reset")) {
        return {
          ok: false,
          status: 503,
          json: async () => ({ error: "RESET_DISABLED_UNCONFIGURED" }),
        };
      }
      return { ok: true, json: async () => [] };
    });

    const repo = new ApiDataRepository("/api");

    // Bắt buộc phải throw Error
    await expect(repo.resetAllData()).rejects.toThrow(/Backend resetAllData failed/);
  });
});
