import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { FlashcardReview } from "../../src/types/flashcard";
import {
  getMondayBasedDayIndex,
  analyzeStudyPatterns,
} from "../../src/lib/studyPatternEngine";
import { StudyPatternsHeatmap } from "../../src/components/research/StudyPatternsHeatmap";

describe("Study Pattern Engine & Heatmap (Phase F7.1)", () => {
  describe("getMondayBasedDayIndex", () => {
    it("converts Sunday to index 6 and Monday to index 0", () => {
      // 2026-09-06 was Sunday
      const sunday = new Date("2026-09-06T10:00:00Z");
      expect(getMondayBasedDayIndex(sunday)).toBe(6);

      // 2026-09-07 is Monday
      const monday = new Date("2026-09-07T10:00:00Z");
      expect(getMondayBasedDayIndex(monday)).toBe(0);

      // 2026-09-08 is Tuesday
      const tuesday = new Date("2026-09-08T10:00:00Z");
      expect(getMondayBasedDayIndex(tuesday)).toBe(1);
    });
  });

  describe("analyzeStudyPatterns", () => {
    it("handles empty review list gracefully", () => {
      const result = analyzeStudyPatterns([]);
      expect(result.totalReviews).toBe(0);
      expect(result.baselineRetentionRate).toBe(0);
      expect(result.matrix).toHaveLength(7);
      expect(result.matrix[0]).toHaveLength(24);
      expect(result.cells).toHaveLength(7 * 24);
      expect(result.hasSufficientData).toBe(false);
      expect(result.peakHour).toBeNull();
    });

    it("aggregates review events into corresponding hour and weekday slots", () => {
      // Create 12 reviews: 6 at 09:00 on Monday (all rating 4), 6 at 14:00 on Monday (rating 1)
      const reviews: FlashcardReview[] = [];

      // Monday 09:00: High retention (100%)
      for (let i = 0; i < 6; i++) {
        reviews.push({
          id: `r-am-${i}`,
          clientEventId: `e-am-${i}`,
          flashcardId: `c-${i}`,
          topicId: "top-1",
          rating: 4,
          reviewDurationMs: 4000,
          reviewedAt: `2026-09-07T09:15:00.000Z`,
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 3,
          intervalAfter: 7,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.6,
          dueBeforeAt: "2026-09-07T00:00:00Z",
          dueAfterAt: "2026-09-14T00:00:00Z",
        });
      }

      // Monday 14:00: Low retention (0%)
      for (let i = 0; i < 6; i++) {
        reviews.push({
          id: `r-pm-${i}`,
          clientEventId: `e-pm-${i}`,
          flashcardId: `c-${i}`,
          topicId: "top-1",
          rating: 1,
          reviewDurationMs: 8000,
          reviewedAt: `2026-09-07T14:30:00.000Z`,
          stateBefore: "review",
          stateAfter: "relearning",
          intervalBefore: 7,
          intervalAfter: 1,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.3,
          dueBeforeAt: "2026-09-07T00:00:00Z",
          dueAfterAt: "2026-09-08T00:00:00Z",
        });
      }

      const result = analyzeStudyPatterns(reviews, 5);

      expect(result.totalReviews).toBe(12);
      expect(result.hasSufficientData).toBe(true);
      expect(result.baselineRetentionRate).toBe(0.5); // 6 out of 12 correct
      expect(result.avgReviewDurationMs).toBe(6000);

      // Peak hour should be selected as 9 AM (100% retention)
      expect(result.peakHour).not.toBeNull();
      expect(result.peakHour?.retentionRate).toBe(1.0);
      expect(result.peakHour?.deltaFromBaseline).toBe(0.5); // +50% above baseline
      expect(result.bestStudyTimeMessage).toContain("Khung giờ vàng");
    });
  });

  describe("StudyPatternsHeatmap Component", () => {
    it("renders empty state notice when reviews count < 10", () => {
      render(<StudyPatternsHeatmap reviews={[]} />);

      expect(screen.getByTestId("study-patterns-heatmap")).toBeInTheDocument();
      expect(screen.getByTestId("insufficient-data-notice")).toBeInTheDocument();
      expect(screen.getByTestId("insufficient-data-notice")).toHaveTextContent(/ít nhất 10 lượt ôn tập/i);
    });

    it("renders SVG matrix cells and shows peak hour badge with sufficient data", () => {
      const reviews: FlashcardReview[] = [];
      // 2026-09-07 was a Monday. Local hour 8:00
      const localDate = new Date(2026, 8, 7, 8, 30, 0);

      for (let i = 0; i < 15; i++) {
        reviews.push({
          id: `r-${i}`,
          clientEventId: `e-${i}`,
          flashcardId: `c-${i}`,
          topicId: "top-1",
          rating: 4,
          reviewDurationMs: 5000,
          reviewedAt: localDate.toISOString(),
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 3,
          intervalAfter: 7,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.6,
          dueBeforeAt: "2026-09-07T00:00:00Z",
          dueAfterAt: "2026-09-14T00:00:00Z",
        });
      }

      render(<StudyPatternsHeatmap reviews={reviews} />);

      expect(screen.getByTestId("peak-study-time-badge")).toBeInTheDocument();
      expect(screen.queryByTestId("insufficient-data-notice")).not.toBeInTheDocument();

      // Check existence of matrix cells for Monday (0), local hour
      const targetHour = localDate.getHours();
      const sampleCell = screen.getByTestId(`heatmap-cell-0-${targetHour}`);
      expect(sampleCell).toBeInTheDocument();

      // Hover cell
      fireEvent.mouseEnter(sampleCell);
      expect(screen.getByTestId("heatmap-tooltip")).toBeInTheDocument();
      expect(screen.getByTestId("heatmap-tooltip")).toHaveTextContent(/Lượt ôn: 15 thẻ/i);

      // Mouse leave
      fireEvent.mouseLeave(sampleCell);
      expect(screen.queryByTestId("heatmap-tooltip")).not.toBeInTheDocument();
    });
  });
});
