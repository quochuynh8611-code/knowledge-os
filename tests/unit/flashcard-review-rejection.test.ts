import { describe, it, expect } from "vitest";
import { FlashcardReviewCreateSchema } from "../../src/lib/validation";

describe("Phase F1B: Flashcard Review Rejection Test Suite", () => {
  const validBasePayload = {
    clientEventId: "evt-valid-uuid-001",
    cardId: "card-uuid-001",
    topicId: "topic-uuid-001",
    rating: 3,
    reviewDurationMs: 3200,
    reviewedAt: new Date().toISOString(),
    stateBefore: "review",
    stateAfter: "review",
    intervalBefore: 6,
    intervalAfter: 15,
    easeFactorBefore: 2.5,
    easeFactorAfter: 2.5,
    dueBefore: new Date().toISOString(),
    dueAfter: new Date().toISOString(),
  };

  describe("1. Invalid Rating Rejections", () => {
    it("Từ chối rating = 0", () => {
      const result = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        rating: 0,
      });
      expect(result.success).toBe(false);
    });

    it("Từ chối rating = 5 (chuẩn Flashcard chỉ chấp nhận 1-4)", () => {
      const result = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        rating: 5,
      });
      expect(result.success).toBe(false);
    });

    it("Từ chối rating số âm hoặc số thực", () => {
      const resultNeg = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        rating: -1,
      });
      expect(resultNeg.success).toBe(false);

      const resultFloat = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        rating: 2.5,
      });
      expect(resultFloat.success).toBe(false);
    });
  });

  describe("2. Missing Mandatory Fields Rejections", () => {
    it("Từ chối khi thiếu clientEventId (Option A requirement)", () => {
      const { clientEventId, ...payloadWithoutEventId } = validBasePayload;
      const result = FlashcardReviewCreateSchema.safeParse(payloadWithoutEventId);
      expect(result.success).toBe(false);
    });

    it("Từ chối khi clientEventId là chuỗi rỗng", () => {
      const result = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        clientEventId: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("Từ chối khi thiếu cardId hoặc topicId", () => {
      const { cardId, ...noCardId } = validBasePayload;
      expect(FlashcardReviewCreateSchema.safeParse(noCardId).success).toBe(false);

      const { topicId, ...noTopicId } = validBasePayload;
      expect(FlashcardReviewCreateSchema.safeParse(noTopicId).success).toBe(false);
    });
  });

  describe("3. Telemetry & State Bounds Rejections", () => {
    it("Từ chối khi reviewDurationMs là số âm", () => {
      const result = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        reviewDurationMs: -100,
      });
      expect(result.success).toBe(false);
    });

    it("Từ chối khi stateBefore hoặc stateAfter không hợp lệ", () => {
      const resultInvalidState = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        stateBefore: "invalid_state",
      });
      expect(resultInvalidState.success).toBe(false);
    });

    it("Từ chối khi intervalAfter là số âm", () => {
      const resultNegInterval = FlashcardReviewCreateSchema.safeParse({
        ...validBasePayload,
        intervalAfter: -1,
      });
      expect(resultNegInterval.success).toBe(false);
    });
  });
});
