import { describe, it, expect } from "vitest";
import {
  TopicCreateSchema,
  TopicUpdateSchema,
  NoteCreateSchema,
  ResourceCreateSchema,
  SM2ReviewInputSchema,
  ImportExportPayloadSchema,
} from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";

describe("Phase 2: Zod Schema Validation & Data Migration Contracts", () => {
  describe("1. Topic Validation Schemas", () => {
    it("Xác thực thành công payload tạo chủ đề hợp lệ", () => {
      const validPayload = {
        title: "Khảo Cứu Bát Nhã Ba La Mật Đa Tâm Kinh",
        slug: "bat-nha-tam-kinh",
        categoryId: "cat-tam-tang",
        categoryName: "Tam Tạng",
        type: "phat-hoc" as const,
        description: "Luận giải về Tánh Không (Śūnyatā)",
        content: "Bản dịch Huyền Trang đối chiếu Phạn bản...",
        tags: ["Bát Nhã", "Tánh Không"],
      };

      const result = TopicCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validPayload.title);
        expect(result.data.type).toBe("phat-hoc");
        expect(result.data.tags).toHaveLength(2);
      }
    });

    it("Bắt lỗi khi tiêu đề bị trống hoặc sai định dạng lĩnh vực (type)", () => {
      const invalidPayload = {
        title: "",
        categoryId: "cat-tam-tang",
        type: "khoa-hoc-hien-dai", // Sai enum
      };

      const result = TopicCreateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || [];
        const errorMessages = issues.map((e) => e.message);
        expect(
          errorMessages.some((msg) =>
            msg.includes("Tiêu đề không được để trống"),
          ),
        ).toBe(true);
        expect(
          errorMessages.some((msg) =>
            msg.includes("Lĩnh vực phải là phat-hoc hoặc huyen-hoc"),
          ),
        ).toBe(true);
      }
    });

    it("Hỗ trợ cập nhật từng phần (Partial Update) cho Topic", () => {
      const partialUpdate = {
        description: "Mô tả đã được bổ sung phần đối chiếu Pali",
      };

      const result = TopicUpdateSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });
  });

  describe("2. Spaced Repetition (SM-2) Input Validation", () => {
    it("Chấp nhận điểm đánh giá ôn tập trong khoảng 0 đến 5", () => {
      const validReview = {
        topicId: "topic-abhidharma-01",
        quality: 4,
      };

      const result = SM2ReviewInputSchema.safeParse(validReview);
      expect(result.success).toBe(true);
    });

    it("Từ chối điểm đánh giá ngoài khoảng 0-5", () => {
      const invalidReviews = [
        { topicId: "topic-01", quality: -1 },
        { topicId: "topic-01", quality: 6 },
        { topicId: "topic-01", quality: 3.5 }, // Non-integer
      ];

      invalidReviews.forEach((review) => {
        const result = SM2ReviewInputSchema.safeParse(review);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("3. Note & Resource Validation", () => {
    it("Xác thực thành công khi tạo ghi chú mới", () => {
      const validNote = {
        topicId: "topic-01",
        title: "Nhận định về 121 Tâm",
        content: "Tâm siêu thế (Lokuttara citta) gồm 8 hoặc 40 tâm...",
        type: "insight" as const,
        tags: ["Abhidhamma", "Tâm"],
      };

      const result = NoteCreateSchema.safeParse(validNote);
      expect(result.success).toBe(true);
    });

    it("Từ chối ghi chú thiếu nội dung", () => {
      const invalidNote = {
        topicId: "topic-01",
        title: "Ghi chú trống",
        content: "",
      };

      const result = NoteCreateSchema.safeParse(invalidNote);
      expect(result.success).toBe(false);
    });

    it("Xác thực tài liệu tham khảo với URL hợp lệ hoặc chuỗi rỗng", () => {
      const validResource = {
        topicId: "topic-01",
        title: "Bộ Pháp Tụ (Dhammasaṅgaṇī)",
        type: "book" as const,
        author: "Trưởng lão Narada dịch",
        url: "https://tipitaka.org",
      };

      const result = ResourceCreateSchema.safeParse(validResource);
      expect(result.success).toBe(true);
    });
  });

  describe("4. Full Snapshot & Zero-Loss Hydration Migration Validation", () => {
    it("Dữ liệu ban đầu (INITIAL_DATA) phải vượt qua 100% hợp chuẩn của ImportExportPayloadSchema", () => {
      const fullPayload = {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        categories: INITIAL_CATEGORIES,
        topics: INITIAL_TOPICS,
        notes: INITIAL_NOTES,
        resources: INITIAL_RESOURCES,
        tags: INITIAL_TAGS,
      };

      const result = ImportExportPayloadSchema.safeParse(fullPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.categories.length).toBe(INITIAL_CATEGORIES.length);
        expect(result.data.topics.length).toBe(INITIAL_TOPICS.length);
        expect(result.data.notes.length).toBe(INITIAL_NOTES.length);
      }
    });

    it("Mô phỏng Hydration: Chuyển đổi payload localStorage sang cấu trúc quan hệ Database không làm mất dữ liệu", () => {
      const mockLocalStorageState = {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        categories: INITIAL_CATEGORIES,
        topics: INITIAL_TOPICS,
        notes: [
          ...INITIAL_NOTES,
          {
            id: "custom-note-user-1",
            topicId: INITIAL_TOPICS[0].id,
            topicTitle: INITIAL_TOPICS[0].title,
            title: "Chiêm nghiệm sâu sắc của người dùng",
            content: "Ghi chép quý giá không được phép bị mất khi migration",
            type: "insight" as const,
            isPrivate: false,
            tags: ["Chiêm Nghiệm"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        resources: INITIAL_RESOURCES,
        tags: INITIAL_TAGS,
      };

      // 1. Client parse và validate
      const parsed = ImportExportPayloadSchema.safeParse(mockLocalStorageState);
      expect(parsed.success).toBe(true);

      if (parsed.success) {
        // 2. Server hydration simulation
        const customNote = parsed.data.notes.find(
          (n) => n.id === "custom-note-user-1",
        );
        expect(customNote).toBeDefined();
        expect(customNote?.title).toBe("Chiêm nghiệm sâu sắc của người dùng");

        // Kiểm tra tính toàn vẹn của Foreign Key
        const targetTopic = parsed.data.topics.find(
          (t) => t.id === customNote?.topicId,
        );
        expect(targetTopic).toBeDefined();
      }
    });
  });
});
