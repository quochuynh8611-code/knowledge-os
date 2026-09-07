import { describe, it, expect, vi } from "vitest";
import {
  executeBatchCreation,
  type ParsedCard,
  type BatchCreationResult,
} from "../../src/lib/noteBatchCardParser";

describe("Phase F6.10: US3 — Note-to-Card Batch Creation Integration Tests", () => {
  it("executeBatchCreation() calls repository.createFlashcard sequentially, reporting progress (1/N, 2/N) and handling errors safely", async () => {
    const cards: ParsedCard[] = [
      { front: "Card 1", back: "Ans 1", type: "basic" },
      { front: "Card 2", back: "Ans 2", type: "basic" },
      { front: "Card 3", back: "Ans 3", type: "basic" },
    ];

    const callOrder: number[] = [];
    const mockCreateFlashcard = vi
      .fn()
      .mockImplementation(async (input: any) => {
        if (input.front === "Card 1") {
          callOrder.push(1);
          return { id: "c1", ...input };
        }
        if (input.front === "Card 2") {
          callOrder.push(2);
          throw new Error("Lỗi mạng/DB tại Card 2");
        }
        if (input.front === "Card 3") {
          callOrder.push(3);
          return { id: "c3", ...input };
        }
      });

    const mockRepo = {
      createFlashcard: mockCreateFlashcard,
    };

    const progressReports: Array<{ current: number; total: number }> = [];
    const onProgress = vi.fn((prog: { current: number; total: number }) => {
      progressReports.push({ current: prog.current, total: prog.total });
    });

    const result: BatchCreationResult = await executeBatchCreation({
      cards,
      topicId: "topic-123",
      noteId: "note-456",
      repository: mockRepo,
      onProgress,
    });

    // 1. Must be called sequentially in order
    expect(callOrder).toEqual([1, 2, 3]);
    expect(mockCreateFlashcard).toHaveBeenCalledTimes(3);

    // 2. Each call receives topicId and noteId
    expect(mockCreateFlashcard).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "topic-123",
        noteId: "note-456",
        front: "Card 1",
      })
    );

    // 3. onProgress must be reported
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(progressReports).toEqual([
      { current: 1, total: 3 },
      { current: 2, total: 3 },
      { current: 3, total: 3 },
    ]);

    // 4. Error in card 2 does not abort card 3; results track each card
    expect(result.total).toBe(3);
    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toContain("Lỗi mạng/DB tại Card 2");
    expect(result.results[2].success).toBe(true);
  });
});
