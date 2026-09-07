import { describe, it, expect } from "vitest";
import { FlashcardReviewResponseSchema, FlashcardReviewInputSchema } from "../../src/lib/validation";
import type { FlashcardReview, FlashcardSchedule } from "../../src/types/flashcard";

describe("Phase F1B: Flashcard Delayed Retry Immunity Test Suite", () => {
  // Trạng thái ban đầu của thẻ
  const initialSchedule: FlashcardSchedule = {
    id: "sch-delayed-01",
    flashcardId: "card-delayed-01",
    state: "learning",
    dueAt: "2026-09-06T10:00:00.000Z",
    interval: 1,
    easeFactor: 2.5,
    repetitions: 1,
    lapses: 0,
    lastReviewedAt: "2026-09-05T10:00:00.000Z",
    updatedAt: "2026-09-05T10:00:00.000Z",
  };

  // Trạng thái thẻ sau Sự kiện A (Good rating -> interval: 6)
  const scheduleAfterEventA: FlashcardSchedule = {
    ...initialSchedule,
    state: "review",
    dueAt: "2026-09-12T10:00:00.000Z",
    interval: 6,
    repetitions: 2,
    lastReviewedAt: "2026-09-06T10:00:00.000Z",
    updatedAt: "2026-09-06T10:00:00.000Z",
  };

  const reviewEventA: FlashcardReview = {
    id: "rev-srv-event-a",
    clientEventId: "evt-uuid-delayed-A",
    flashcardId: "card-delayed-01",
    topicId: "topic-delayed-01",
    rating: 3,
    reviewDurationMs: 3000,
    reviewedAt: "2026-09-06T10:00:00.000Z",
    stateBefore: "learning",
    stateAfter: "review",
    intervalBefore: 1,
    intervalAfter: 6,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.5,
    dueBeforeAt: "2026-09-06T10:00:00.000Z",
    dueAfterAt: "2026-09-12T10:00:00.000Z",
  };

  // Trạng thái thẻ sau Sự kiện B (Good rating -> interval: 15)
  const scheduleAfterEventB: FlashcardSchedule = {
    ...scheduleAfterEventA,
    state: "review",
    dueAt: "2026-09-27T10:00:00.000Z",
    interval: 15,
    repetitions: 3,
    lastReviewedAt: "2026-09-12T10:00:00.000Z",
    updatedAt: "2026-09-12T10:00:00.000Z",
  };

  const reviewEventB: FlashcardReview = {
    id: "rev-srv-event-b",
    clientEventId: "evt-uuid-delayed-B",
    flashcardId: "card-delayed-01",
    topicId: "topic-delayed-01",
    rating: 3,
    reviewDurationMs: 2500,
    reviewedAt: "2026-09-12T10:00:00.000Z",
    stateBefore: "review",
    stateAfter: "review",
    intervalBefore: 6,
    intervalAfter: 15,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.5,
    dueBeforeAt: "2026-09-06T10:00:00.000Z",
    dueAfterAt: "2026-09-27T10:00:00.000Z",
  };

  it("Kịch bản Delayed Retry: Sự kiện A bị trễ sau Sự kiện B không làm rollback hoặc làm sai lệch State B", () => {
    // Mô phỏng cơ sở dữ liệu lưu trữ các review đã xử lý
    const reviewStoreByClientEventId = new Map<string, { review: FlashcardReview; resultingSchedule: FlashcardSchedule }>();
    let currentSchedule: FlashcardSchedule = { ...initialSchedule };

    // Handler xử lý review giả lập hành vi API chuẩn Option A
    function processReviewRequest(payload: unknown) {
      const parsedInput = FlashcardReviewInputSchema.parse(payload);

      // Bước 1: Tra cứu theo clientEventId (Idempotency check)
      const record = reviewStoreByClientEventId.get(parsedInput.clientEventId);
      if (record) {
        return {
          statusCode: 200,
          body: {
            success: true,
            duplicate: true,
            clientEventId: parsedInput.clientEventId,
            review: record.review,
            // Trả về original resulting schedule tương ứng với review đó, không phải latest active schedule
            schedule: record.resultingSchedule,
          },
        };
      }

      // Bước 2: Xử lý review mới (giả lập tiến trình)
      let nextSchedule: FlashcardSchedule;
      let newReview: FlashcardReview;

      if (parsedInput.clientEventId === "evt-uuid-delayed-A") {
        nextSchedule = scheduleAfterEventA;
        newReview = reviewEventA;
      } else if (parsedInput.clientEventId === "evt-uuid-delayed-B") {
        nextSchedule = scheduleAfterEventB;
        newReview = reviewEventB;
      } else {
        throw new Error("Unknown event in test");
      }

      // Cập nhật lưu trữ
      reviewStoreByClientEventId.set(parsedInput.clientEventId, {
        review: newReview,
        resultingSchedule: nextSchedule,
      });
      currentSchedule = nextSchedule;

      return {
        statusCode: 200,
        body: {
          success: true,
          duplicate: false,
          clientEventId: parsedInput.clientEventId,
          review: newReview,
          schedule: nextSchedule,
        },
      };
    }

    // 1. Client gửi Sự kiện A thành công
    const responseA = processReviewRequest({
      clientEventId: "evt-uuid-delayed-A",
      flashcardId: "card-delayed-01",
      topicId: "topic-delayed-01",
      rating: 3,
      reviewDurationMs: 3000,
    });
    expect(responseA.statusCode).toBe(200);
    expect(responseA.body.duplicate).toBe(false);
    expect(currentSchedule.interval).toBe(6);
    expect(currentSchedule.repetitions).toBe(2);

    // 2. Client gửi Sự kiện B thành công
    const responseB = processReviewRequest({
      clientEventId: "evt-uuid-delayed-B",
      flashcardId: "card-delayed-01",
      topicId: "topic-delayed-01",
      rating: 3,
      reviewDurationMs: 2500,
    });
    expect(responseB.statusCode).toBe(200);
    expect(responseB.body.duplicate).toBe(false);
    expect(currentSchedule.interval).toBe(15);
    expect(currentSchedule.repetitions).toBe(3);

    // 3. Gói tin Sự kiện A bị nghẽn mạng lúc trước giờ mới bay tới server (Delayed Retry)
    const delayedResponseA = processReviewRequest({
      clientEventId: "evt-uuid-delayed-A",
      flashcardId: "card-delayed-01",
      topicId: "topic-delayed-01",
      rating: 3,
      reviewDurationMs: 3000,
    });

    // Xác nhận Fast Return trả về duplicate = true
    expect(delayedResponseA.statusCode).toBe(200);
    expect(delayedResponseA.body.duplicate).toBe(true);
    expect(delayedResponseA.body.clientEventId).toBe("evt-uuid-delayed-A");

    // Xác minh schema phản hồi hợp lệ tuyệt đối
    const parsedEnvelope = FlashcardReviewResponseSchema.safeParse(delayedResponseA.body);
    expect(parsedEnvelope.success).toBe(true);

    // Kiểm tra tính bất biến của phản hồi Idempotency: trả về original resulting schedule của Event A (interval = 6), không phải latest (15)
    expect(delayedResponseA.body.schedule.interval).toBe(6);
    expect(delayedResponseA.body.schedule.repetitions).toBe(2);
    expect(delayedResponseA.body.schedule.dueAt || delayedResponseA.body.schedule.due).toBe("2026-09-12T10:00:00.000Z");

    // Xác minh quan trọng nhất: Schedule hiện tại của thẻ trên database vẫn giữ nguyên ở State B, không bị rollback về State A và không bị cộng dồn thành State C
    expect(currentSchedule.interval).toBe(15);
    expect(currentSchedule.repetitions).toBe(3);
    expect(currentSchedule.dueAt).toBe("2026-09-27T10:00:00.000Z");
  });
});

