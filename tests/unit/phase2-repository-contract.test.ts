import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalStorageDataRepository,
  IDataRepository,
} from "../../src/services/dataRepository";
import {
  HydratePayloadSchema,
  HydrateResponseSchema,
  ValidatedHydrateInput,
} from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";

describe("Phase 2A: Repository Layer & Idempotent Hydration Contract Tests", () => {
  let repository: IDataRepository;
  const TEST_STORAGE_KEY = "test_phat_hoc_persistence";

  beforeEach(() => {
    localStorage.clear();
    repository = new LocalStorageDataRepository(TEST_STORAGE_KEY);
  });

  describe("1. IDataRepository Contract & Fallback Behavior", () => {
    it("Khởi tạo với cấu trúc rỗng an toàn khi chưa có dữ liệu trong LocalStorage", async () => {
      const data = await repository.loadInitialData();
      expect(data.topics).toEqual([]);
      expect(data.notes).toEqual([]);
      expect(data.categories).toEqual([]);
    });

    it("Lưu và nạp lại dữ liệu thành công qua repository interface", async () => {
      const mockPayload: ValidatedHydrateInput = {
        clientSyncId: "test-uuid-001",
        version: "2.0.0",
        clientTimestamp: new Date().toISOString(),
        categories: INITIAL_CATEGORIES,
        topics: INITIAL_TOPICS,
        notes: INITIAL_NOTES,
        resources: INITIAL_RESOURCES,
        tags: INITIAL_TAGS,
      };

      const response = await repository.syncHydrate(mockPayload);
      expect(response.success).toBe(true);
      expect(response.clientSyncId).toBe("test-uuid-001");
      expect(response.summary.topicsUpserted).toBe(INITIAL_TOPICS.length);

      const loaded = await repository.loadInitialData();
      expect(loaded.topics.length).toBe(INITIAL_TOPICS.length);
      expect(loaded.notes.length).toBe(INITIAL_NOTES.length);
    });
  });

  describe("2. Idempotent Hydration Contract (Retry Safety)", () => {
    it("Thực thi syncHydrate nhiều lần với cùng clientSyncId cho kết quả bất biến", async () => {
      const syncId = "idempotent-sync-uuid-999";
      const payload: ValidatedHydrateInput = {
        clientSyncId: syncId,
        version: "2.0.0",
        clientTimestamp: new Date().toISOString(),
        categories: INITIAL_CATEGORIES.slice(0, 2),
        topics: INITIAL_TOPICS.slice(0, 2),
        notes: INITIAL_NOTES.slice(0, 2),
        resources: INITIAL_RESOURCES.slice(0, 2),
        tags: INITIAL_TAGS.slice(0, 2),
      };

      // Lần 1: Gọi sync
      const res1 = await repository.syncHydrate(payload);
      expect(res1.success).toBe(true);
      expect(res1.clientSyncId).toBe(syncId);

      // Lần 2: Retry gửi lại cùng payload
      const res2 = await repository.syncHydrate(payload);
      expect(res2.success).toBe(true);
      expect(res2.clientSyncId).toBe(syncId);
      expect(res2.summary.topicsUpserted).toBe(res1.summary.topicsUpserted);

      // Kiểm tra trong database/storage không bị nhân đôi số lượng bản ghi
      const loaded = await repository.loadInitialData();
      expect(loaded.topics.length).toBe(2);
      expect(loaded.notes.length).toBe(2);
    });

    it("Xác thực định dạng phản hồi HydrateResponse tuân thủ HydrateResponseSchema", async () => {
      const payload: ValidatedHydrateInput = {
        clientSyncId: "uuid-response-test",
        version: "2.0.0",
        clientTimestamp: new Date().toISOString(),
        categories: [],
        topics: [],
        notes: [],
        resources: [],
        tags: [],
      };

      const response = await repository.syncHydrate(payload);
      const parseResult = HydrateResponseSchema.safeParse(response);
      expect(parseResult.success).toBe(true);
    });
  });

  describe("3. Last-Write-Wins (LWW) Conflict Resolution Simulation", () => {
    it("Ưu tiên bản ghi có updatedAt mới hơn khi đồng bộ", () => {
      const serverNote = {
        id: "note-01",
        topicId: "topic-01",
        title: "Bản cũ trên server",
        content: "Nội dung cũ",
        updatedAt: "2026-08-20T10:00:00Z",
      };

      const clientNoteNewer = {
        id: "note-01",
        topicId: "topic-01",
        title: "Bản mới từ client",
        content: "Nội dung mới",
        updatedAt: "2026-08-23T15:00:00Z",
      };

      // Thuật toán LWW logic test
      const resolveLWW = <T extends { updatedAt: string }>(
        serverItem: T,
        clientItem: T,
      ): T => {
        return new Date(clientItem.updatedAt).getTime() >=
          new Date(serverItem.updatedAt).getTime()
          ? clientItem
          : serverItem;
      };

      const resolved = resolveLWW(serverNote, clientNoteNewer);
      expect(resolved).toEqual(clientNoteNewer);
      expect(resolved.title).toBe("Bản mới từ client");
    });
  });
});
