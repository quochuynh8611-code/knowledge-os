/**
 * Integration Tests: Flashcard Review Queue Priority & Progress Streak (Phase F6.11 Task 2)
 *
 * Tests:
 * 1. flashcardService.getDueFlashcards() with priority: 'due', 'new', 'low_retention'
 * 2. flashcardService.getFlashcardProgress() with streakDays calculation
 * 3. flashcardController.getDueFlashcards() query parameter parsing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDueFlashcards,
  getFlashcardProgress,
} from "../../src/server/services/flashcardService";
import { getDueFlashcards as controllerGetDue } from "../../src/server/controllers/flashcardController";
import * as flashcardService from "../../src/server/services/flashcardService";
import { prisma } from "../../src/lib/prisma";
import type { Request, Response } from "express";

describe("Phase F6.11: Review Queue Priority & Progress API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("flashcardService.getDueFlashcards()", () => {
    const fixedNow = new Date("2026-09-07T12:00:00.000Z");

    it("priority='due' (default) queries active cards with dueAt <= now", async () => {
      const mockCards = [
        {
          id: "c-due-1",
          topicId: "t-1",
          type: "basic",
          front: "Front 1",
          back: "Back 1",
          lifecycleStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          schedule: {
            id: "sch-1",
            flashcardId: "c-due-1",
            state: "review",
            dueAt: new Date("2026-09-07T10:00:00.000Z"),
            interval: 3,
            easeFactor: 2.5,
            repetitions: 2,
            lapses: 0,
            lastReviewedAt: new Date("2026-09-04T10:00:00.000Z"),
            updatedAt: new Date(),
          },
        },
      ];

      vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce(mockCards as any);

      const result = await getDueFlashcards({ now: fixedNow, priority: "due" });

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lifecycleStatus: "active",
            schedule: {
              dueAt: { lte: fixedNow },
            },
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c-due-1");
    });

    it("priority='new' queries active cards with schedule state == 'new'", async () => {
      const mockNewCards = [
        {
          id: "c-new-1",
          topicId: "t-1",
          type: "basic",
          front: "Front New",
          back: "Back New",
          lifecycleStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          schedule: {
            id: "sch-new",
            flashcardId: "c-new-1",
            state: "new",
            dueAt: new Date(),
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            lastReviewedAt: null,
            updatedAt: new Date(),
          },
        },
      ];

      vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce(mockNewCards as any);

      const result = await getDueFlashcards({ priority: "new" });

      expect(prisma.flashcard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lifecycleStatus: "active",
            schedule: { state: "new" },
          }),
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("c-new-1");
    });

    it("priority='low_retention' filters cards using weighted scoring", async () => {
      const mockCards = [
        // 1. Struggling: lapses = 2 (score = 0.4 >= 0.4) -> included
        {
          id: "c-low-1",
          topicId: "t-1",
          type: "basic",
          front: "Struggling card 1",
          back: "Back",
          lifecycleStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          schedule: {
            id: "s-1",
            flashcardId: "c-low-1",
            state: "review",
            dueAt: new Date(),
            interval: 1,
            easeFactor: 2.3,
            repetitions: 1,
            lapses: 2,
            lastReviewedAt: new Date(),
            updatedAt: new Date(),
          },
          reviews: [
            { rating: 1 },
            { rating: 3 },
          ],
        },
        // 2. Healthy: lapses = 0, ease = 2.5, retention = 1.0 (score = 0 < 0.4) -> excluded
        {
          id: "c-healthy",
          topicId: "t-1",
          type: "basic",
          front: "Healthy card",
          back: "Back",
          lifecycleStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          schedule: {
            id: "s-2",
            flashcardId: "c-healthy",
            state: "review",
            dueAt: new Date(),
            interval: 10,
            easeFactor: 2.6,
            repetitions: 5,
            lapses: 0,
            lastReviewedAt: new Date(),
            updatedAt: new Date(),
          },
          reviews: [
            { rating: 4 },
            { rating: 3 },
            { rating: 4 },
          ],
        },
        // 3. Struggling: ease = 1.8 (+0.3) & retention = 0.33 (+0.3) -> score = 0.6 >= 0.4 -> included
        {
          id: "c-low-2",
          topicId: "t-1",
          type: "basic",
          front: "Struggling card 2",
          back: "Back",
          lifecycleStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          schedule: {
            id: "s-3",
            flashcardId: "c-low-2",
            state: "review",
            dueAt: new Date(),
            interval: 1,
            easeFactor: 1.8,
            repetitions: 1,
            lapses: 0,
            lastReviewedAt: new Date(),
            updatedAt: new Date(),
          },
          reviews: [
            { rating: 1 },
            { rating: 2 },
            { rating: 3 },
          ],
        },
      ];

      vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce(mockCards as any);

      const result = await getDueFlashcards({ priority: "low_retention" });

      expect(result).toHaveLength(2);
      const ids = result.map((c) => c.id);
      expect(ids).toContain("c-low-1");
      expect(ids).toContain("c-low-2");
      expect(ids).not.toContain("c-healthy");

      // Sorted by easeFactor ascending (c-low-2 with ease 1.8 comes before c-low-1 with ease 2.3)
      expect(result[0].id).toBe("c-low-2");
      expect(result[1].id).toBe("c-low-1");
    });
  });

  describe("flashcardService.getFlashcardProgress()", () => {
    it("returns progress statistics including calculated streakDays", async () => {
      const mockCards = [
        {
          id: "c-1",
          lifecycleStatus: "active",
          schedule: { state: "new", dueAt: new Date() },
        },
        {
          id: "c-2",
          lifecycleStatus: "active",
          schedule: { state: "review", dueAt: new Date(Date.now() - 10000) },
        },
      ];

      const today = new Date();
      const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2);

      const mockReviews = [
        { rating: 4, reviewedAt: today },
        { rating: 3, reviewedAt: yesterday },
        { rating: 4, reviewedAt: twoDaysAgo },
      ];

      vi.spyOn(prisma.flashcard, "findMany").mockResolvedValueOnce(mockCards as any);
      vi.spyOn(prisma.flashcardReview, "findMany").mockResolvedValueOnce(mockReviews as any);

      const progress = await getFlashcardProgress();

      expect(progress.totalCards).toBe(2);
      expect(progress.newCards).toBe(1);
      expect(progress.reviewCards).toBe(1);
      expect(progress.dueToday).toBe(2);
      expect(progress.retentionRate).toBe(100);
      expect(progress.streakDays).toBe(3);
    });
  });

  describe("flashcardController.getDueFlashcards()", () => {
    it("parses priority query parameter correctly and passes to service", async () => {
      const mockCards = [{ id: "c-1" }];
      const serviceSpy = vi.spyOn(flashcardService, "getDueFlashcards").mockResolvedValueOnce(mockCards as any);

      const req = {
        query: { priority: "low_retention", topicId: "topic-123" },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await controllerGetDue(req, res);

      expect(serviceSpy).toHaveBeenCalledWith({
        topicId: "topic-123",
        priority: "low_retention",
      });
      expect(res.json).toHaveBeenCalledWith(mockCards);
    });

    it("falls back to undefined priority when query param is invalid", async () => {
      const mockCards = [{ id: "c-2" }];
      const serviceSpy = vi.spyOn(flashcardService, "getDueFlashcards").mockResolvedValueOnce(mockCards as any);

      const req = {
        query: { priority: "invalid_filter" },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await controllerGetDue(req, res);

      expect(serviceSpy).toHaveBeenCalledWith({
        topicId: undefined,
        priority: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(mockCards);
    });
  });
});
