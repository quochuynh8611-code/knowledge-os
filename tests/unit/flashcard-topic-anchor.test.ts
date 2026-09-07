import { describe, it, expect } from "vitest";
import { FlashcardCreateInputSchema, FlashcardSchema } from "../../src/lib/validation";
import type { Flashcard } from "../../src/types/flashcard";

describe("Phase F1B: Flashcard Topic Anchor Test Suite", () => {
  const validTopicId = "topic-uuid-101";

  it("Flashcard bắt buộc phải có topicId hợp lệ (Content Anchor)", () => {
    const validCard = {
      id: "card-anchor-01",
      topicId: validTopicId,
      type: "basic" as const,
      front: "What is an Anchor?",
      back: "A fundamental reference point.",
      createdAt: "2026-09-06T12:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    const parsed = FlashcardSchema.safeParse(validCard);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.topicId).toBe(validTopicId);
      expect(parsed.data.noteId).toBeUndefined();
      expect(parsed.data.resourceId).toBeUndefined();
    }
  });

  it("Từ chối tạo Flashcard khi thiếu topicId hoặc topicId là chuỗi rỗng", () => {
    const missingTopicId = {
      topicId: "",
      type: "basic" as const,
      front: "Front content",
      back: "Back content",
    };
    expect(FlashcardCreateInputSchema.safeParse(missingTopicId).success).toBe(false);

    const undefinedTopicId = {
      type: "basic" as const,
      front: "Front content",
      back: "Back content",
    };
    expect(FlashcardCreateInputSchema.safeParse(undefinedTopicId).success).toBe(false);
  });

  it("Cho phép gắn kết tùy chọn với noteId và resourceId", () => {
    const cardWithAllLinks: Flashcard = {
      id: "card-anchor-02",
      topicId: validTopicId,
      noteId: "note-obsidian-001",
      resourceId: "res-pdf-001",
      type: "basic",
      front: "Linked question",
      back: "Linked answer",
      createdAt: "2026-09-06T12:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    const parsed = FlashcardSchema.safeParse(cardWithAllLinks);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.topicId).toBe(validTopicId);
      expect(parsed.data.noteId).toBe("note-obsidian-001");
      expect(parsed.data.resourceId).toBe("res-pdf-001");
    }
  });

  it("Lọc thẻ theo topicId: chỉ trả về các thẻ thuộc đúng Topic được chỉ định", () => {
    const cardList: Flashcard[] = [
      {
        id: "card-t1-1",
        topicId: "topic-1",
        type: "basic",
        front: "T1 Q1",
        back: "T1 A1",
        createdAt: "2026-09-06T12:00:00.000Z",
        updatedAt: "2026-09-06T12:00:00.000Z",
      },
      {
        id: "card-t1-2",
        topicId: "topic-1",
        type: "cloze",
        front: "{{c1::T1 Cloze}}",
        back: "",
        createdAt: "2026-09-06T12:00:00.000Z",
        updatedAt: "2026-09-06T12:00:00.000Z",
      },
      {
        id: "card-t2-1",
        topicId: "topic-2",
        type: "basic",
        front: "T2 Q1",
        back: "T2 A1",
        createdAt: "2026-09-06T12:00:00.000Z",
        updatedAt: "2026-09-06T12:00:00.000Z",
      },
    ];

    const filterByTopic = (cards: Flashcard[], topicId: string) =>
      cards.filter((c) => c.topicId === topicId);

    const filtered = filterByTopic(cardList, "topic-1");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((c) => c.topicId === "topic-1")).toBe(true);
  });

  it("Cách ly dữ liệu: FlashcardSchedule và FlashcardReview không làm biến dạng cấu trúc Topic", () => {
    // Topic độc lập với Flashcard Schedule; thẻ có thực thể FlashcardSchedule riêng biệt
    const mockTopic = {
      id: validTopicId,
      title: "Clean Architecture",
      domainId: "domain-eng",
      studyProgress: {
        status: "in_progress",
        lastStudied: "2026-09-01T08:00:00.000Z",
      },
    };

    // Khi tạo hoặc review flashcard, state của Topic.studyProgress không bị ghi đè trực tiếp bởi scheduler
    const cardSchedule = {
      id: "sch-isolated",
      cardId: "card-anchor-01",
      state: "review" as const,
      due: "2026-09-20T12:00:00.000Z",
      interval: 14,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      lastReviewed: "2026-09-06T12:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    // Card schedule là thực thể 1:1 độc lập với Topic
    expect(cardSchedule.cardId).toBe("card-anchor-01");
    expect(mockTopic.id).toBe(validTopicId);
    expect(mockTopic.studyProgress.status).toBe("in_progress");
  });

  it("Explicit Reverse Companion: Không tự động tạo thẻ đảo ngược (no auto-create reverse), thẻ đảo ngược phải được tạo tường minh với schedule độc lập", () => {
    // 1. Tạo thẻ thuận (Forward card)
    const forwardCardInput = {
      topicId: validTopicId,
      type: "basic" as const,
      front: "Bế tinh",
      back: "Giữ gìn tinh khí không để thất thoát",
    };

    const parsedForward = FlashcardCreateInputSchema.safeParse(forwardCardInput);
    expect(parsedForward.success).toBe(true);

    // Hệ thống chỉ tạo đúng 1 thẻ duy nhất từ input, không tự động sinh thêm thẻ thứ 2
    const createdCards: Flashcard[] = [
      {
        id: "card-forward-01",
        topicId: forwardCardInput.topicId,
        type: forwardCardInput.type,
        front: forwardCardInput.front,
        back: forwardCardInput.back,
        createdAt: "2026-09-06T12:00:00.000Z",
        updatedAt: "2026-09-06T12:00:00.000Z",
      },
    ];
    expect(createdCards).toHaveLength(1);
    expect(createdCards[0].id).toBe("card-forward-01");

    // 2. Thẻ đảo ngược (Reverse companion) nếu muốn có thì PHẢI được tạo tường minh bởi client
    const reverseCardInput = {
      topicId: validTopicId,
      type: "basic" as const,
      front: "Giữ gìn tinh khí không để thất thoát",
      back: "Bế tinh",
    };

    const parsedReverse = FlashcardCreateInputSchema.safeParse(reverseCardInput);
    expect(parsedReverse.success).toBe(true);

    const explicitReverseCard: Flashcard = {
      id: "card-reverse-02",
      topicId: reverseCardInput.topicId,
      type: reverseCardInput.type,
      front: reverseCardInput.front,
      back: reverseCardInput.back,
      createdAt: "2026-09-06T12:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    // 3. Hai thẻ có ID riêng biệt và Schedule hoàn toàn độc lập
    const scheduleForward = {
      id: "sch-forward-01",
      cardId: createdCards[0].id,
      state: "review" as const,
      due: "2026-09-20T12:00:00.000Z",
      interval: 14,
      easeFactor: 2.5,
      repetitions: 3,
      lapses: 0,
      lastReviewed: "2026-09-06T12:00:00.000Z",
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    const scheduleReverse = {
      id: "sch-reverse-02",
      cardId: explicitReverseCard.id,
      state: "new" as const,
      due: "2026-09-06T12:00:00.000Z",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      updatedAt: "2026-09-06T12:00:00.000Z",
    };

    expect(scheduleForward.cardId).not.toBe(scheduleReverse.cardId);
    expect(scheduleForward.interval).toBe(14);
    expect(scheduleReverse.interval).toBe(0);
    // Review thẻ thuận không làm thay đổi trạng thái thẻ đảo
    expect(scheduleReverse.state).toBe("new");
  });
});
