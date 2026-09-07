/**
 * Integration Tests: FlashcardAnalyticsWidget Component (Phase F5)
 *
 * Feature: Flashcard Analytics & Retention Metrics Display
 *
 * Scenario 1: Display overall flashcard counts by state
 *   Given GET /api/flashcards/progress returns:
 *     totalCards=50, newCards=15, learningCards=10, reviewCards=25, dueToday=8, retentionRate=88
 *   When FlashcardAnalyticsWidget mounts
 *   Then it displays Total Cards: 50
 *   And New Cards: 15, Learning: 10, Review: 25
 *   And Due Today badge: 8
 *
 * Scenario 2: Display retention rate percentage and trend badge
 *   Given retentionRate=88%
 *   When widget renders
 *   Then it shows "88%" retention metric
 *   And an indicator for high memory retention
 *
 * Scenario 3: Filter analytics by topicId
 *   Given topicId="topic-abhidharma"
 *   When widget fetches data
 *   Then it queries /api/flashcards/progress?topicId=topic-abhidharma
 *   And renders topic-scoped progress stats
 *
 * Scenario 4: Gracefully handle API error state
 *   Given server returns 500
 *   When widget mounts
 *   Then it displays friendly fallback / error message
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FlashcardAnalyticsWidget } from "../../src/components/flashcards/FlashcardAnalyticsWidget";
import type { FlashcardProgressStats } from "../../src/server/services/flashcardService";

describe("FlashcardAnalyticsWidget Integration Tests", () => {
  const mockStats: FlashcardProgressStats = {
    totalCards: 50,
    newCards: 15,
    learningCards: 10,
    reviewCards: 25,
    dueToday: 8,
    retentionRate: 88,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Scenario 1: Hiển thị đầy đủ số lượng thẻ theo các trạng thái SM-2", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(<FlashcardAnalyticsWidget />);

    await waitFor(() => {
      expect(screen.getByTestId("stat-total-cards")).toHaveTextContent("50");
    });

    expect(screen.getByTestId("stat-new-cards")).toHaveTextContent("15");
    expect(screen.getByTestId("stat-learning-cards")).toHaveTextContent("10");
    expect(screen.getByTestId("stat-review-cards")).toHaveTextContent("25");
    expect(screen.getByTestId("stat-due-today")).toHaveTextContent("8");
  });

  it("Scenario 2: Hiển thị tỷ lệ duy trì kiến thức (Retention Rate %)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(<FlashcardAnalyticsWidget />);

    await waitFor(() => {
      expect(screen.getByTestId("stat-retention-rate")).toHaveTextContent("88%");
    });
  });

  it("Scenario 3: Lọc thống kê theo topicId khi được cung cấp", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...mockStats, totalCards: 12 }),
    });
    global.fetch = fetchSpy;

    render(<FlashcardAnalyticsWidget topicId="topic-abhidharma" />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("topicId=topic-abhidharma")
      );
    });
  });

  it("Scenario 4: Xử lý trạng thái lỗi tải dữ liệu mà không làm sập giao diện", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    });

    render(<FlashcardAnalyticsWidget />);

    await waitFor(() => {
      expect(screen.getByTestId("analytics-error-state")).toBeInTheDocument();
    });
  });
});
