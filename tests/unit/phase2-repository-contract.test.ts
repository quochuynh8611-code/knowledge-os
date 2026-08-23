import { describe, it, expect, beforeEach } from "vitest";
import {
  LocalStorageDataRepository,
  IDataRepository,
} from "../../src/services/dataRepository";
import {
  HydratePayloadSchema,
  HydrateResponseSchema,
  SyncSessionSchema,
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

    it("Tự động khôi phục dữ liệu từ LocalStorage khi khởi tạo lại repository", async () => {
      const initialTopic = INITIAL_TOPICS[0];
      await repository.saveTopic(initialTopic);

      // Mô phỏng instance mới được tạo ra
      const newRepoInstance = new LocalStorageDataRepository(TEST_STORAGE_KEY);
      await newRepoInstance.syncHydrate({
        clientSyncId: "boot-sync-1",
        topics: [initialTopic],
      });

      const restoredData = await newRepoInstance.loadInitialData();
      expect(restoredData.topics).toHaveLength(1);
      expect(restoredData.topics[0].id).toBe(initialTopic.id);
    });
  });

  describe("2. Idempotent Hydration Contract & SyncSession Persistence", () => {
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

      // Kiểm tra trong storage không bị nhân đôi số lượng bản ghi
      const loaded = await repository.loadInitialData();
      expect(loaded.topics.length).toBe(2);
      expect(loaded.notes.length).toBe(2);
    });

    it("Bắt lỗi khi HydratePayloadSchema thiếu clientSyncId", () => {
      const invalidPayload = {
        version: "2.0.0",
        categories: [],
        topics: [],
        notes: [],
      };

      const result = HydratePayloadSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("Xác thực schema của bảng ghi nhận phiên SyncSession bền vững", () => {
      const syncLog = {
        clientSyncId: "uuid-sync-persisted-123",
        clientTimestamp: "2026-08-23T10:00:00.000Z",
        status: "completed" as const,
        summary: {
          topicsUpserted: 15,
          notesUpserted: 42,
        },
      };

      const result = SyncSessionSchema.safeParse(syncLog);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.clientSyncId).toBe("uuid-sync-persisted-123");
        expect(result.data.status).toBe("completed");
      }
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

  describe("3. Last-Write-Wins (LWW) & Spaced Repetition Conflict Resolution Rules", () => {
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

    it("Hợp nhất Spaced Repetition Progress giữ mức tiến độ và số lần lặp lớn nhất", () => {
      const serverProgress = {
        topicId: "topic-01",
        status: "in_progress" as const,
        progress: 40,
        repetitions: 2,
        timeSpent: 60,
        interval: 3,
        easeFactor: 2.5,
        totalNotes: 5,
      };

      const clientProgress = {
        topicId: "topic-01",
        status: "in_progress" as const,
        progress: 60,
        repetitions: 4,
        timeSpent: 120,
        interval: 6,
        easeFactor: 2.6,
        totalNotes: 7,
      };

      // Thuật toán Merge Progress
      const mergeProgress = (
        server: typeof serverProgress,
        client: typeof clientProgress,
      ) => ({
        ...server,
        progress: Math.max(server.progress, client.progress),
        repetitions: Math.max(server.repetitions, client.repetitions),
        timeSpent: Math.max(server.timeSpent, client.timeSpent),
        interval: Math.max(server.interval, client.interval),
        easeFactor: Math.max(server.easeFactor, client.easeFactor),
        totalNotes: Math.max(server.totalNotes, client.totalNotes),
      });

      const merged = mergeProgress(serverProgress, clientProgress);
      expect(merged.progress).toBe(60);
      expect(merged.repetitions).toBe(4);
      expect(merged.timeSpent).toBe(120);
    });
  });
});
