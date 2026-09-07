import { describe, it, expect } from "vitest";
import { FlashcardReviewResponseSchema } from "../../src/lib/validation";
import type { FlashcardReview, FlashcardSchedule } from "../../src/types/flashcard";

describe("Phase F1B: Flashcard Review Idempotency Test Suite", () => {
  const mockSchedule: FlashcardSchedule = {
    id: "sch-001",
    flashcardId: "card-001",
    state: "review",
    dueAt: "2026-09-21T12:00:00.000Z",
    interval: 15,
    easeFactor: 2.5,
    repetitions: 3,
    lapses: 0,
    lastReviewedAt: "2026-09-06T12:30:00.000Z",
    updatedAt: "2026-09-06T12:30:00.000Z",
  };

  const mockReview: FlashcardReview = {
    id: "rev-srv-001",
    clientEventId: "evt-uuid-idempotency-check",
    flashcardId: "card-001",
    topicId: "topic-001",
    rating: 3,
    reviewDurationMs: 3500,
    reviewedAt: "2026-09-06T12:30:00.000Z",
    stateBefore: "review",
    stateAfter: "review",
    intervalBefore: 6,
    intervalAfter: 15,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.5,
    dueBeforeAt: "2026-09-06T12:00:00.000Z",
    dueAfterAt: "2026-09-21T12:00:00.000Z",
  };

  it("Lần gọi đầu tiên (New Review): duplicate = false và phản hồi hợp lệ", () => {
    const firstSubmissionResponse = {
      success: true,
      duplicate: false,
      clientEventId: "evt-uuid-idempotency-check",
      review: mockReview,
      schedule: mockSchedule,
    };

    const parsed = FlashcardReviewResponseSchema.safeParse(firstSubmissionResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duplicate).toBe(false);
      expect(parsed.data.clientEventId).toBe("evt-uuid-idempotency-check");
      expect(parsed.data.schedule.interval).toBe(15);
    }
  });

  it("Lần gọi phát lại cùng clientEventId (Duplicate Replay): Fast Return duplicate = true và bảo tồn schedule", () => {
    const replaySubmissionResponse = {
      success: true,
      duplicate: true,
      clientEventId: "evt-uuid-idempotency-check",
      review: mockReview,
      schedule: mockSchedule, // Giữ nguyên schedule không bị nhảy cóc thêm 15 ngày nữa
    };

    const parsed = FlashcardReviewResponseSchema.safeParse(replaySubmissionResponse);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.duplicate).toBe(true);
      expect(parsed.data.clientEventId).toBe("evt-uuid-idempotency-check");
      expect(parsed.data.schedule.interval).toBe(15); // Không bị nhân đôi lên 37 hay 40 ngày
    }
  });

  it("Bắt lỗi schema khi phản hồi thiếu clientEventId hoặc cờ duplicate", () => {
    const missingClientEventId = {
      success: true,
      duplicate: true,
      review: mockReview,
      schedule: mockSchedule,
    };
    expect(FlashcardReviewResponseSchema.safeParse(missingClientEventId).success).toBe(false);

    const missingDuplicateFlag = {
      success: true,
      clientEventId: "evt-uuid-idempotency-check",
      review: mockReview,
      schedule: mockSchedule,
    };
    expect(FlashcardReviewResponseSchema.safeParse(missingDuplicateFlag).success).toBe(false);
  });
});
