import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFlashcard,
  updateFlashcard,
  getDueFlashcards,
  getFlashcardProgress,
  suspendDuplicateCard,
} from "../../src/server/services/flashcardService";
import { prisma } from "../../src/lib/prisma";

describe("Phase F6.5 — Card Lifecycle Actions (Suspend / Restore / Archive & Bulk Operations)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("1. updates lifecycleStatus from active to suspended", async () => {
    const card = {
      id: "card-lifecycle-1",
      topicId: "topic-1",
      front: "Câu hỏi 1",
      back: "Trả lời 1",
      type: "basic",
      lifecycleStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        id: "sch-1",
        flashcardId: "card-lifecycle-1",
        state: "review",
        dueAt: new Date(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date(),
      },
    };

    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "suspended",
    } as any);

    const updated = await updateFlashcard("card-lifecycle-1", {
      lifecycleStatus: "suspended",
    });

    expect(updated.lifecycleStatus).toBe("suspended");
    expect(prisma.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-lifecycle-1" },
        data: expect.objectContaining({ lifecycleStatus: "suspended" }),
      })
    );
  });

  it("2. updates lifecycleStatus from suspended back to active (restore)", async () => {
    const card = {
      id: "card-lifecycle-2",
      topicId: "topic-1",
      front: "Câu hỏi 2",
      back: "Trả lời 2",
      type: "basic",
      lifecycleStatus: "suspended",
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        id: "sch-2",
        flashcardId: "card-lifecycle-2",
        state: "review",
        dueAt: new Date(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date(),
      },
    };

    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "active",
    } as any);

    const restored = await updateFlashcard("card-lifecycle-2", {
      lifecycleStatus: "active",
    });

    expect(restored.lifecycleStatus).toBe("active");
  });

  it("3. archives a card by setting lifecycleStatus to archived", async () => {
    const card = {
      id: "card-lifecycle-3",
      topicId: "topic-1",
      front: "Câu hỏi 3",
      back: "Trả lời 3",
      type: "basic",
      lifecycleStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        id: "sch-3",
        flashcardId: "card-lifecycle-3",
        state: "review",
        dueAt: new Date(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date(),
      },
    };

    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "archived",
    } as any);

    const archived = await updateFlashcard("card-lifecycle-3", {
      lifecycleStatus: "archived",
    });

    expect(archived.lifecycleStatus).toBe("archived");
  });

  it("4. excludes suspended and archived cards from getDueFlashcards queue", async () => {
    vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce([]);

    await getDueFlashcards({ topicId: "topic-1" });

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lifecycleStatus: "active",
        }),
      })
    );
  });

  it("5. excludes suspended and archived cards from getFlashcardProgress statistics", async () => {
    vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce([]);
    vi.spyOn(prisma.flashcardReview, "findMany").mockResolvedValueOnce([]);

    await getFlashcardProgress({ topicId: "topic-1" });

    expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lifecycleStatus: "active",
        }),
      })
    );
  });

  it("6. suspendDuplicateCard suspends card when expectedTopicId matches card.topicId", async () => {
    const card = {
      id: "card-dup-6",
      topicId: "topic-a",
      front: "Câu hỏi dup",
      back: "Trả lời dup",
      type: "basic",
      lifecycleStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: {
        id: "sch-6",
        flashcardId: "card-dup-6",
        state: "review",
        dueAt: new Date(),
        interval: 5,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        updatedAt: new Date(),
      },
    };

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "suspended",
    } as any);
    const scheduleUpdateSpy = vi.spyOn(prisma.flashcardSchedule, "update");

    const result = await suspendDuplicateCard("card-dup-6", "topic-a");

    expect(result.lifecycleStatus).toBe("suspended");
    // Verify scope check: findUnique called before update
    expect(prisma.flashcard.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "card-dup-6" } })
    );
    // Verify only lifecycleStatus is updated — schedule fields not touched
    expect(prisma.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-dup-6" },
        data: { lifecycleStatus: "suspended" },
      })
    );
    // Verify no FlashcardSchedule mutations: schedule.update must not have been called
    expect(scheduleUpdateSpy).not.toHaveBeenCalled();
  });

  it("7. suspendDuplicateCard throws TopicScopeMismatchError when expectedTopicId does not match card.topicId", async () => {
    const card = {
      id: "card-dup-7",
      topicId: "topic-b",  // card belongs to topic-b
      front: "Câu hỏi",
      back: "Trả lời",
      type: "basic",
      lifecycleStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      schedule: null,
    };

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    const updateSpy = vi.spyOn(prisma.flashcard, "update");

    // expectedTopicId is topic-a but card belongs to topic-b → should throw
    await expect(
      suspendDuplicateCard("card-dup-7", "topic-a")
    ).rejects.toThrow("topic-context integrity guard");

    // CRITICAL: update must NOT have been called
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
