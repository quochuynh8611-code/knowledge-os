/**
 * Integration Tests: Flashcard CSV Export (Session + Full History) (Phase F6.11 Task 5)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardExportModal } from "../../src/components/flashcards/FlashcardExportModal";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import * as csvUtils from "../../src/lib/flashcardReviewSessionUtils";
import { getAllFlashcardReviews } from "../../src/server/services/flashcardService";
import { getAllReviews as controllerGetAllReviews } from "../../src/server/controllers/flashcardController";
import { prisma } from "../../src/lib/prisma";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";
import type { Request, Response } from "express";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

const mockTopics = [
  { id: "topic-1", title: "Phật Pháp Căn Bản" },
  { id: "topic-2", title: "Bát Nhã Tâm Kinh" },
];

vi.mock("../../src/context/DataContext", () => ({
  useData: () => ({
    topics: mockTopics,
    notes: [],
    resources: [],
    dataRepository: {},
  }),
}));

describe("Phase F6.11 Task 5: Export CSV (Session + Full History)", () => {
  const mockCard: Flashcard = {
    id: "card-exp-1",
    topicId: "topic-1",
    type: "basic",
    front: "Bát Chánh Đạo là gì?",
    back: "Chánh kiến, Chánh tư duy, Chánh ngữ, Chánh nghiệp, Chánh mạng, Chánh tinh tấn, Chánh niệm, Chánh định.",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      id: "sch-exp-1",
      flashcardId: "card-exp-1",
      state: "review",
      dueAt: new Date().toISOString(),
      interval: 4,
      easeFactor: 2.5,
      repetitions: 2,
      lapses: 0,
      updatedAt: new Date().toISOString(),
    },
  };

  const sampleReviews: FlashcardReview[] = [
    {
      id: "rev-s1",
      clientEventId: "evt-s1",
      flashcardId: "card-exp-1",
      cardId: "card-exp-1",
      topicId: "topic-1",
      rating: 3,
      stateBefore: "learning",
      stateAfter: "review",
      intervalBefore: 0,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.5,
      reviewDurationMs: 2500,
      reviewedAt: "2026-09-07T08:00:00.000Z",
      dueBeforeAt: "2026-09-07T08:00:00.000Z",
      dueAfterAt: "2026-09-08T08:00:00.000Z",
    },
    {
      id: "rev-s2",
      clientEventId: "evt-s2",
      flashcardId: "card-exp-2",
      cardId: "card-exp-2",
      topicId: "topic-2",
      rating: 1,
      stateBefore: "review",
      stateAfter: "relearning",
      intervalBefore: 4,
      intervalAfter: 0,
      easeFactorBefore: 2.5,
      easeFactorAfter: 2.3,
      reviewDurationMs: 4000,
      reviewedAt: "2026-09-07T09:00:00.000Z",
      dueBeforeAt: "2026-09-07T09:00:00.000Z",
      dueAfterAt: "2026-09-07T09:10:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Server Layer: getAllFlashcardReviews & Controller", () => {
    it("getAllFlashcardReviews() filters by topicId, rating, and date range", async () => {
      const mockDbReviews = [
        {
          id: "rev-db-1",
          clientEventId: "evt-db-1",
          flashcardId: "card-exp-1",
          topicId: "topic-1",
          rating: 4,
          reviewDurationMs: 1500,
          reviewedAt: new Date("2026-09-05T10:00:00Z"),
          stateBefore: "learning",
          stateAfter: "review",
          intervalBefore: 0,
          intervalAfter: 4,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.6,
          dueBeforeAt: new Date("2026-09-05T10:00:00Z"),
          dueAfterAt: new Date("2026-09-09T10:00:00Z"),
        },
      ];

      vi.spyOn(prisma.flashcardReview, "findMany").mockResolvedValueOnce(mockDbReviews as any);

      const res = await getAllFlashcardReviews({
        topicId: "topic-1",
        rating: 4,
        fromDate: "2026-09-01",
        toDate: "2026-09-07",
      });

      expect(prisma.flashcardReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topicId: "topic-1",
            rating: 4,
            reviewedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe("rev-db-1");
    });

    it("controllerGetAllReviews() parses query params correctly", async () => {
      const mockDbReviews = [
        {
          id: "rev-ctrl-1",
          clientEventId: "evt-ctrl-1",
          flashcardId: "card-1",
          topicId: "topic-1",
          rating: 3,
          reviewDurationMs: 1200,
          reviewedAt: new Date(),
          stateBefore: "learning",
          stateAfter: "review",
          intervalBefore: 0,
          intervalAfter: 1,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.5,
          dueBeforeAt: new Date(),
          dueAfterAt: new Date(),
        },
      ];

      vi.spyOn(prisma.flashcardReview, "findMany").mockResolvedValueOnce(mockDbReviews as any);

      const req = {
        query: {
          topicId: "topic-1",
          rating: "3",
          fromDate: "2026-09-01",
          toDate: "2026-09-07",
        },
      } as unknown as Request;

      let jsonResponse: any;
      const res = {
        json: vi.fn().mockImplementation((data) => {
          jsonResponse = data;
        }),
        status: vi.fn().mockReturnThis(),
      } as unknown as Response;

      await controllerGetAllReviews(req, res);

      expect(res.json).toHaveBeenCalled();
      expect(jsonResponse).toHaveLength(1);
      expect(jsonResponse[0].id).toBe("rev-ctrl-1");
    });
  });

  describe("FlashcardExportModal Component", () => {
    it("renders session reviews by default and exports CSV on click", () => {
      const downloadSpy = vi.spyOn(csvUtils, "downloadCSV").mockImplementation(() => {});
      const onCloseMock = vi.fn();
      const onExportSuccessMock = vi.fn();

      render(
        <FlashcardExportModal
          isOpen={true}
          onClose={onCloseMock}
          sessionReviews={sampleReviews}
          onExportSuccess={onExportSuccessMock}
        />
      );

      // Default scope is session with 2 reviews
      expect(screen.getByText("Phiên học hiện tại")).toBeInTheDocument();
      expect(screen.getByTestId("session-reviews-count")).toHaveTextContent("2 lượt");
      expect(screen.getByTestId("filtered-reviews-count")).toHaveTextContent("2 lượt");

      // Click download button
      const downloadBtn = screen.getByTestId("btn-download-csv");
      fireEvent.click(downloadBtn);

      expect(downloadSpy).toHaveBeenCalledWith(
        expect.stringContaining("\uFEFF"), // UTF-8 BOM
        expect.stringMatching(/^flashcard-reviews-session-\d{4}-\d{2}-\d{2}\.csv$/)
      );
      expect(onExportSuccessMock).toHaveBeenCalledWith(2);
    });

    it("filters session reviews by topic and rating", () => {
      render(
        <FlashcardExportModal
          isOpen={true}
          onClose={vi.fn()}
          sessionReviews={sampleReviews}
        />
      );

      // Filter by topic-1
      const topicSelect = screen.getByTestId("filter-topic-select");
      fireEvent.change(topicSelect, { target: { value: "topic-1" } });

      expect(screen.getByTestId("filtered-reviews-count")).toHaveTextContent("1 lượt");

      // Filter by rating 1 (which belongs to topic-2) -> 0 matching
      const ratingSelect = screen.getByTestId("filter-rating-select");
      fireEvent.change(ratingSelect, { target: { value: "1" } });

      expect(screen.getByTestId("filtered-reviews-count")).toHaveTextContent("0 lượt");
      expect(screen.getByTestId("btn-download-csv")).toBeDisabled();
    });

    it("switches to full history mode and fetches from /api/flashcards/reviews", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => sampleReviews,
      });

      render(
        <FlashcardExportModal
          isOpen={true}
          onClose={vi.fn()}
          sessionReviews={[]}
        />
      );

      // When sessionReviews is empty, defaults to full scope
      expect(screen.getByTestId("scope-full-btn")).toBeInTheDocument();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/flashcards/reviews")
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId("filtered-reviews-count")).toHaveTextContent("2 lượt");
      });
    });
  });

  describe("FlashcardReviewStudio Export Integration", () => {
    it("opens export modal from header button and passes session reviews", async () => {
      global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
        if (url.includes("/api/flashcards/due")) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockCard],
          });
        }
        if (opts?.method === "POST" && url.includes("/api/flashcards/review")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              review: sampleReviews[0],
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<FlashcardReviewStudio />);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Bát Chánh Đạo là gì?")).toBeInTheDocument();
      });

      // Header button "Xuất CSV" should be present
      const exportHeaderBtn = screen.getByTestId("btn-open-export-csv");
      expect(exportHeaderBtn).toBeInTheDocument();

      // Flip and rate card to populate session review
      fireEvent.click(screen.getByTestId("flashcard-card"));
      const goodRatingBtn = screen.getByTestId("rating-btn-3");
      fireEvent.click(goodRatingBtn);

      // After last card is rated, completion screen appears
      await waitFor(() => {
        expect(screen.getByTestId("session-completed-view")).toBeInTheDocument();
      });

      // Completed screen has export button
      const exportCompletedBtn = screen.getByTestId("btn-export-completed-session");
      expect(exportCompletedBtn).toBeInTheDocument();

      fireEvent.click(exportCompletedBtn);

      // Modal should be open with 1 review in session
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Xuất dữ liệu ôn tập CSV" })).toBeInTheDocument();
        expect(screen.getByTestId("session-reviews-count")).toHaveTextContent("1 lượt");
      });
    });
  });
});
