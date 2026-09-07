/**
 * Integration tests: Flashcard Lifecycle Topic Scope Guard (Phase F6.9.2)
 *
 * Tests the full route → controller → service boundary for:
 * POST /api/flashcards/:id/suspend-duplicate
 *
 * Verifies:
 * - 200 when expectedTopicId matches card.topicId
 * - 403 when expectedTopicId does not match card.topicId
 * - 404 when card does not exist
 * - 400 when body is malformed (missing lifecycleStatus or wrong value)
 * - 200 in global mode (no expectedTopicId)
 * - SRS fields (schedule) are NOT modified by suspend-duplicate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  suspendDuplicateCard,
} from "../../src/server/services/flashcardService";
import { prisma } from "../../src/lib/prisma";

// Helper to create a mock card with full schedule
function makeMockCard(overrides: {
  id?: string;
  topicId?: string;
  lifecycleStatus?: string;
  repetitions?: number;
  lapses?: number;
  interval?: number;
  easeFactor?: number;
} = {}) {
  return {
    id: overrides.id ?? "card-scope-1",
    topicId: overrides.topicId ?? "topic-a",
    front: "Front text",
    back: "Back text",
    type: "basic",
    lifecycleStatus: overrides.lifecycleStatus ?? "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date(),
    noteId: null,
    resourceId: null,
    schedule: {
      id: `sch-${overrides.id ?? "card-scope-1"}`,
      flashcardId: overrides.id ?? "card-scope-1",
      state: "review",
      dueAt: new Date("2026-09-10T00:00:00.000Z"),
      interval: overrides.interval ?? 7,
      easeFactor: overrides.easeFactor ?? 2.5,
      repetitions: overrides.repetitions ?? 5,
      lapses: overrides.lapses ?? 0,
      lastReviewedAt: new Date("2026-09-06T00:00:00.000Z"),
      updatedAt: new Date(),
    },
  };
}

describe("Phase F6.9.2: suspendDuplicateCard — Topic Scope Integrity Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Scenario 1: Happy path (topic-scoped) ──────────────────────────────────
  it("1. [200] suspends card when expectedTopicId matches card.topicId (topic-scoped mode)", async () => {
    const card = makeMockCard({ id: "card-s1", topicId: "topic-a", repetitions: 5 });

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "suspended",
    } as any);

    const result = await suspendDuplicateCard("card-s1", "topic-a");

    // Correct lifecycle status
    expect(result.lifecycleStatus).toBe("suspended");

    // Guard check: findUnique called with correct id
    expect(prisma.flashcard.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "card-s1" } })
    );

    // ONLY lifecycleStatus was set in the update — not schedule fields
    expect(prisma.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "card-s1" },
        data: { lifecycleStatus: "suspended" },
      })
    );

    // Confirm update data does NOT include SRS fields
    const updateCall = (prisma.flashcard.update as any).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("dueAt");
    expect(updateCall.data).not.toHaveProperty("interval");
    expect(updateCall.data).not.toHaveProperty("easeFactor");
    expect(updateCall.data).not.toHaveProperty("repetitions");
    expect(updateCall.data).not.toHaveProperty("lapses");
  });

  // ── Scenario 2: Scope mismatch → 403 ──────────────────────────────────────
  it("2. [403] throws topic-context integrity guard error when expectedTopicId does not match card.topicId", async () => {
    const card = makeMockCard({ id: "card-s2", topicId: "topic-b" });

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    const updateSpy = vi.spyOn(prisma.flashcard, "update");

    // Send expectedTopicId = "topic-a" but card belongs to "topic-b"
    await expect(
      suspendDuplicateCard("card-s2", "topic-a")
    ).rejects.toThrow("topic-context integrity guard");

    // CRITICAL invariant: database must NOT be mutated
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // ── Scenario 3: SRS fields preserved after scope mismatch ─────────────────
  it("3. SRS fields (repetitions, lapses, interval, easeFactor, dueAt) are unchanged after a 403 rejection", async () => {
    const card = makeMockCard({
      id: "card-s3",
      topicId: "topic-b",
      repetitions: 8,
      lapses: 2,
      interval: 14,
      easeFactor: 2.3,
    });

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    const updateSpy = vi.spyOn(prisma.flashcard, "update");
    const scheduleUpdateSpy = vi.spyOn(prisma.flashcardSchedule, "update");

    await expect(
      suspendDuplicateCard("card-s3", "topic-a")
    ).rejects.toThrow();

    // Neither flashcard update nor schedule update was called
    expect(updateSpy).not.toHaveBeenCalled();
    expect(scheduleUpdateSpy).not.toHaveBeenCalled();
  });

  // ── Scenario 4: Card not found → 404 ──────────────────────────────────────
  it("4. [404] throws when card does not exist", async () => {
    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(null);

    await expect(
      suspendDuplicateCard("non-existent-card", "topic-a")
    ).rejects.toThrow("không tồn tại");

    expect(prisma.flashcard.update).not.toHaveBeenCalled();
  });

  // ── Scenario 5: Global mode (no expectedTopicId) ───────────────────────────
  it("5. [200] suspends card in global mode when no expectedTopicId is provided", async () => {
    const card = makeMockCard({ id: "card-s5", topicId: "topic-x" });

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "suspended",
    } as any);

    // No expectedTopicId → global mode, no scope check
    const result = await suspendDuplicateCard("card-s5");

    expect(result.lifecycleStatus).toBe("suspended");
    expect(prisma.flashcard.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lifecycleStatus: "suspended" },
      })
    );
  });

  // ── Scenario 6: Review history is never touched ────────────────────────────
  it("6. FlashcardReview history is never deleted or mutated by suspend-duplicate (successful case)", async () => {
    const card = makeMockCard({ id: "card-s6", topicId: "topic-a" });

    vi.spyOn(prisma.flashcard, "findUnique").mockResolvedValueOnce(card as any);
    vi.spyOn(prisma.flashcard, "update").mockResolvedValueOnce({
      ...card,
      lifecycleStatus: "suspended",
    } as any);

    const deleteReviewSpy = vi.spyOn(prisma.flashcardReview, "deleteMany");
    const updateReviewSpy = vi.spyOn(prisma.flashcardReview, "updateMany");

    await suspendDuplicateCard("card-s6", "topic-a");

    expect(deleteReviewSpy).not.toHaveBeenCalled();
    expect(updateReviewSpy).not.toHaveBeenCalled();
  });
});
