import { describe, it, expect } from "vitest";
import {
  FlashcardTypeEnum,
  FlashcardStateEnum,
  ReviewRatingEnum,
  FlashcardScheduleSchema,
  FlashcardCreateSchema,
  FlashcardSchema,
  FlashcardReviewCreateSchema,
  FlashcardReviewSchema,
  FlashcardReviewResponseSchema,
  // Existing schemas for backward compatibility check
  TopicSchema,
  StudyProgressSchema,
  NoteSchema,
  ResourceSchema,
  BackupSnapshotSchema,
} from "../../src/lib/validation";

describe("Phase F1B: Flashcard Schema Validation & Contract Harness", () => {
  // ===========================================================================
  // NHÓM 1: KIỂM THỬ HỢP ĐỒNG FLASHCARD & FLASHCARDCREATESCHEMA
  // ===========================================================================
  describe("1. Flashcard & FlashcardCreateSchema", () => {
    it("Xác thực thành công payload tạo thẻ basic hợp lệ", () => {
      const payload = {
        topicId: "topic-kinh-huyet-001",
        type: "basic",
        front: "Huyệt Hợp Cốc nằm ở vị trí nào và thuộc kinh nào?",
        back: "Nằm ở bờ ngoài trung điểm xương bàn ngón trỏ, thuộc Thủ Dương Minh Đại Trường Kinh.",
      };

      const result = FlashcardCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topicId).toBe(payload.topicId);
        expect(result.data.type).toBe("basic");
        expect(result.data.front).toBe(payload.front);
        expect(result.data.back).toBe(payload.back);
        expect(result.data.noteId).toBeUndefined();
        expect(result.data.resourceId).toBeUndefined();
      }
    });

    it("Xác thực thành công thẻ có liên kết tùy chọn noteId và resourceId", () => {
      const payload = {
        topicId: "topic-kinh-huyet-001",
        noteId: "note-hop-coc-ghi-chep",
        resourceId: "res-giap-at-kinh-pdf",
        type: "basic",
        front: "Công năng chủ trị của Huyệt Hợp Cốc?",
        back: "Thanh nhiệt giải biểu, trấn thống thông lạc.",
      };

      const result = FlashcardCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.noteId).toBe("note-hop-coc-ghi-chep");
        expect(result.data.resourceId).toBe("res-giap-at-kinh-pdf");
      }
    });

    it("Xác thực thành công thẻ cloze hợp lệ", () => {
      const payload = {
        topicId: "topic-kinh-huyet-001",
        type: "cloze",
        front: "Huyệt {{c1::Hợp Cốc}} là nguyên huyệt của kinh {{c2::Đại Trường}}.",
        back: "Huyệt vị trọng yếu vùng đầu mặt.",
      };

      const result = FlashcardCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("cloze");
      }
    });

    it("Bắt lỗi khi thiếu trường bắt buộc: topicId, front, hoặc back", () => {
      const missingTopic = {
        type: "basic",
        front: "Câu hỏi",
        back: "Câu trả lời",
      };
      const resultTopic = FlashcardCreateSchema.safeParse(missingTopic);
      expect(resultTopic.success).toBe(false);

      const missingFront = {
        topicId: "topic-001",
        type: "basic",
        back: "Câu trả lời",
      };
      const resultFront = FlashcardCreateSchema.safeParse(missingFront);
      expect(resultFront.success).toBe(false);

      const missingBack = {
        topicId: "topic-001",
        type: "basic",
        front: "Câu hỏi",
      };
      const resultBack = FlashcardCreateSchema.safeParse(missingBack);
      expect(resultBack.success).toBe(false);
    });

    it("Từ chối các loại thẻ không nằm trong MVP enum ['basic', 'cloze']", () => {
      const invalidConcept = {
        topicId: "topic-001",
        type: "concept", // Out-of-scope in MVP
        front: "Khái niệm",
        back: "Định nghĩa",
      };
      const resultConcept = FlashcardCreateSchema.safeParse(invalidConcept);
      expect(resultConcept.success).toBe(false);

      const invalidChoice = {
        topicId: "topic-001",
        type: "multiple_choice", // Out-of-scope in MVP
        front: "Trắc nghiệm",
        back: "Đáp án",
      };
      const resultChoice = FlashcardCreateSchema.safeParse(invalidChoice);
      expect(resultChoice.success).toBe(false);
    });
  });

  // ===========================================================================
  // NHÓM 2: KIỂM THỬ HỢP ĐỒNG FLASHCARDSCHEDULE & FLASHCARDSCHEDULESCHEMA
  // ===========================================================================
  describe("2. FlashcardSchedule & FlashcardScheduleSchema", () => {
    it("Khởi tạo schedule hợp lệ với các giá trị mặc định chuẩn", () => {
      const schedulePayload = {
        id: "sch-uuid-001",
        cardId: "card-uuid-001",
        state: "new",
        due: "2026-09-06T12:00:00.000Z",
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: "2026-09-06T12:00:00.000Z",
      };

      const result = FlashcardScheduleSchema.safeParse(schedulePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.state).toBe("new");
        expect(result.data.interval).toBe(0);
        expect(result.data.easeFactor).toBe(2.5);
        expect(result.data.repetitions).toBe(0);
        expect(result.data.lapses).toBe(0);
      }
    });

    it("Xác thực thành công cả 4 trạng thái SRS: new, learning, review, relearning", () => {
      const states = ["new", "learning", "review", "relearning"] as const;

      for (const state of states) {
        const payload = {
          id: `sch-${state}`,
          cardId: `card-${state}`,
          state,
          due: new Date().toISOString(),
          interval: 5,
          easeFactor: 2.5,
          repetitions: 2,
          lapses: 1,
          updatedAt: new Date().toISOString(),
        };
        const result = FlashcardScheduleSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it("Bắt lỗi khi easeFactor < 1.3 (ngưỡng sàn của thuật toán SM-2)", () => {
      const invalidEase = {
        id: "sch-invalid-ease",
        cardId: "card-001",
        state: "review",
        due: new Date().toISOString(),
        interval: 1,
        easeFactor: 1.2, // Dưới ngưỡng sàn 1.3
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      };

      const result = FlashcardScheduleSchema.safeParse(invalidEase);
      expect(result.success).toBe(false);
    });

    it("Bắt lỗi khi interval hoặc repetitions âm", () => {
      const negativeInterval = {
        id: "sch-neg-interval",
        cardId: "card-001",
        state: "review",
        due: new Date().toISOString(),
        interval: -1,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      };
      const resultInterval = FlashcardScheduleSchema.safeParse(negativeInterval);
      expect(resultInterval.success).toBe(false);

      const negativeReps = {
        id: "sch-neg-reps",
        cardId: "card-001",
        state: "review",
        due: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: -5,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      };
      const resultReps = FlashcardScheduleSchema.safeParse(negativeReps);
      expect(resultReps.success).toBe(false);
    });
  });

  // ===========================================================================
  // NHÓM 3: KIỂM THỬ HỢP ĐỒNG FLASHCARDREVIEW (OPTION A CLIENTEVENTID)
  // ===========================================================================
  describe("3. FlashcardReview & Option A Two-Tier Event-ID", () => {
    it("Xác thực bản ghi review hợp lệ với đầy đủ id (server PK) và clientEventId", () => {
      const reviewPayload = {
        id: "rev-srv-001",
        clientEventId: "evt-uuid-client-12345",
        cardId: "card-uuid-001",
        topicId: "topic-kinh-huyet-001",
        rating: 3, // Good
        reviewDurationMs: 3800,
        reviewedAt: "2026-09-06T12:30:00.000Z",
        stateBefore: "review",
        stateAfter: "review",
        intervalBefore: 6,
        intervalAfter: 15,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        dueBefore: "2026-09-06T12:00:00.000Z",
        dueAfter: "2026-09-21T12:00:00.000Z",
      };

      const result = FlashcardReviewSchema.safeParse(reviewPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("rev-srv-001");
        expect(result.data.clientEventId).toBe("evt-uuid-client-12345");
        expect(result.data.rating).toBe(3);
        expect(result.data.reviewDurationMs).toBe(3800);
      }
    });

    it("Xác thực các mức đánh giá hợp lệ: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)", () => {
      const ratings = [1, 2, 3, 4] as const;

      for (const rating of ratings) {
        const payload = {
          clientEventId: `evt-${rating}`,
          cardId: "card-001",
          topicId: "topic-001",
          rating,
          reviewDurationMs: 2500,
          reviewedAt: new Date().toISOString(),
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 1,
          intervalAfter: 3,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.5,
          dueBefore: new Date().toISOString(),
          dueAfter: new Date().toISOString(),
        };

        const result = FlashcardReviewCreateSchema.safeParse(payload);
        expect(result.success).toBe(true);
      }
    });

    it("Bắt lỗi khi rating nằm ngoài khoảng 1-4 (từ chối 0 hoặc 5)", () => {
      const basePayload = {
        clientEventId: "evt-test-invalid",
        cardId: "card-001",
        topicId: "topic-001",
        reviewDurationMs: 1000,
        reviewedAt: new Date().toISOString(),
        stateBefore: "new",
        stateAfter: "learning",
        intervalBefore: 0,
        intervalAfter: 1,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        dueBefore: new Date().toISOString(),
        dueAfter: new Date().toISOString(),
      };

      const resultZero = FlashcardReviewCreateSchema.safeParse({
        ...basePayload,
        rating: 0,
      });
      expect(resultZero.success).toBe(false);

      const resultFive = FlashcardReviewCreateSchema.safeParse({
        ...basePayload,
        rating: 5,
      });
      expect(resultFive.success).toBe(false);
    });

    it("Bắt lỗi khi thiếu clientEventId bắt buộc của Option A", () => {
      const missingClientEventId = {
        cardId: "card-001",
        topicId: "topic-001",
        rating: 3,
        reviewDurationMs: 1500,
        reviewedAt: new Date().toISOString(),
        stateBefore: "new",
        stateAfter: "review",
        intervalBefore: 0,
        intervalAfter: 1,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        dueBefore: new Date().toISOString(),
        dueAfter: new Date().toISOString(),
      };

      const result = FlashcardReviewCreateSchema.safeParse(missingClientEventId);
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // NHÓM 4: KIỂM THỬ HỢP ĐỒNG PHẢN HỒI LŨY ĐẲNG FLASHCARDREVIEWRESPONSE
  // ===========================================================================
  describe("4. FlashcardReviewResponse & Duplicate Fast Return Semantics", () => {
    const mockSchedule = {
      id: "sch-001",
      cardId: "card-001",
      state: "review" as const,
      due: "2026-09-21T12:00:00.000Z",
      interval: 15,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      lastReviewed: "2026-09-06T12:30:00.000Z",
      updatedAt: "2026-09-06T12:30:00.000Z",
    };

    const mockReview = {
      id: "rev-001",
      clientEventId: "evt-uuid-duplicate-test",
      cardId: "card-001",
      topicId: "topic-001",
      rating: 3 as const,
      reviewDurationMs: 4000,
      reviewedAt: "2026-09-06T12:30:00.000Z",
      stateBefore: "review" as const,
      stateAfter: "review" as const,
      intervalBefore: 6,
      intervalAfter: 15,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      dueBefore: "2026-09-06T12:00:00.000Z",
      dueAfter: "2026-09-21T12:00:00.000Z",
    };

    it("Xác thực phản hồi khi review mới: duplicate = false", () => {
      const responsePayload = {
        success: true,
        duplicate: false,
        clientEventId: "evt-uuid-duplicate-test",
        review: mockReview,
        schedule: mockSchedule,
      };

      const result = FlashcardReviewResponseSchema.safeParse(responsePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.duplicate).toBe(false);
        expect(result.data.clientEventId).toBe("evt-uuid-duplicate-test");
      }
    });

    it("Xác thực phản hồi khi phát hiện review trùng lặp: duplicate = true (Fast Return)", () => {
      const duplicateResponsePayload = {
        success: true,
        duplicate: true,
        clientEventId: "evt-uuid-duplicate-test",
        review: mockReview,
        schedule: mockSchedule,
      };

      const result = FlashcardReviewResponseSchema.safeParse(duplicateResponsePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.duplicate).toBe(true);
        expect(result.data.schedule.interval).toBe(15);
      }
    });

    it("Bắt lỗi khi thiếu cờ duplicate hoặc clientEventId", () => {
      const missingDuplicate = {
        success: true,
        clientEventId: "evt-uuid-test",
        review: mockReview,
        schedule: mockSchedule,
      };
      const resultDuplicate = FlashcardReviewResponseSchema.safeParse(missingDuplicate);
      expect(resultDuplicate.success).toBe(false);

      const missingClientEventId = {
        success: true,
        duplicate: false,
        review: mockReview,
        schedule: mockSchedule,
      };
      const resultEventId = FlashcardReviewResponseSchema.safeParse(missingClientEventId);
      expect(resultEventId.success).toBe(false);
    });
  });

  // ===========================================================================
  // NHÓM 5: KIỂM CHỨNG TƯƠNG THÍCH NGƯỢC TUYỆT ĐỐI (BACKWARD COMPATIBILITY)
  // ===========================================================================
  describe("5. Backward Compatibility Invariant Suite", () => {
    it("Bảo toàn tính hợp lệ của TopicSchema và StudyProgressSchema hiện hữu", () => {
      const validTopic = {
        id: "topic-existing-001",
        title: "Bát Nhã Ba La Mật Đa Tâm Kinh",
        slug: "bat-nha-tam-kinh",
        categoryId: "cat-phat-hoc",
        type: "phat-hoc",
        description: "Khảo cứu kinh văn",
        content: "Nội dung kinh...",
        tags: ["Bát Nhã", "Tâm Kinh"],
      };
      expect(TopicSchema.safeParse(validTopic).success).toBe(true);

      const validStudyProgress = {
        topicId: "topic-existing-001",
        status: "in_progress",
        progress: 60,
        interval: 6,
        easeFactor: 2.5,
        repetitions: 2,
        totalNotes: 5,
        timeSpent: 90,
      };
      expect(StudyProgressSchema.safeParse(validStudyProgress).success).toBe(true);
    });

    it("Bảo toàn tính hợp lệ của NoteSchema và ResourceSchema", () => {
      const validNote = {
        id: "note-001",
        topicId: "topic-001",
        title: "Ghi chú quán chiếu",
        content: "Nội dung ghi chép...",
        type: "insight",
        isPrivate: false,
        tags: ["quán chiếu"],
      };
      expect(NoteSchema.safeParse(validNote).success).toBe(true);

      const validResource = {
        id: "res-001",
        topicId: "topic-001",
        title: "Châm cứu Giáp Ất Kinh",
        type: "book",
      };
      expect(ResourceSchema.safeParse(validResource).success).toBe(true);
    });

    it("Bảo toàn tính hợp lệ của BackupSnapshotSchema cho các snapshot 5 collections hiện tại", () => {
      const legacySnapshot = {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        checksum: "a".repeat(64),
        counts: {
          categories: 1,
          topics: 1,
          notes: 0,
          resources: 0,
          tags: 0,
        },
        data: {
          categories: [
            {
              id: "cat-001",
              name: "Đông Y",
              slug: "dong-y",
            },
          ],
          topics: [
            {
              id: "top-001",
              title: "Kinh Lạc",
              slug: "kinh-lac",
              categoryId: "cat-001",
              type: "dong-y",
            },
          ],
          notes: [],
          resources: [],
          tags: [],
        },
      };

      const result = BackupSnapshotSchema.safeParse(legacySnapshot);
      expect(result.success).toBe(true);
    });
  });
});
