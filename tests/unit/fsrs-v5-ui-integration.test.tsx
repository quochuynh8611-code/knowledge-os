/**
 * Unit & Integration Tests: FSRS v5 UI Wiring (Phase 3 — Chặng 3B)
 *
 * Verifies:
 * 1. FlashcardReviewStudio DSR Memory Telemetry bar (S, D, R%)
 * 2. FlashcardReviewStudio FSRS v5 Algorithm & Desired Retention controls
 * 3. Rating interval previews (rating-interval-preview-1..4) on flipped cards
 * 4. Dynamic recalculation when desiredRetention slider changes (tighter intervals for higher retention)
 * 5. RetentionCurveChart rendering of FSRS v5 Power-Law curve alongside Ebbinghaus and comparison summary
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import { RetentionCurveChart } from "../../src/components/flashcards/RetentionCurveChart";
import { getSrsUserConfig, setSrsUserConfig } from "../../src/lib/fsrsEngine";
import type { Flashcard, FlashcardReview } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("FSRS v5 UI Integration Tests (Phase 3B)", () => {
  const mockCardWithSchedule: Flashcard = {
    id: "card-fsrs-001",
    topicId: "topic-science",
    type: "basic",
    front: "Định luật bảo toàn năng lượng là gì?",
    back: "Năng lượng không tự nhiên sinh ra và cũng không tự nhiên mất đi, chỉ chuyển từ dạng này sang dạng khác.",
    lifecycleStatus: "active",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    schedule: {
      id: "sch-fsrs-1",
      flashcardId: "card-fsrs-001",
      state: "review",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      interval: 10,
      easeFactor: 2.5,
      repetitions: 4,
      lapses: 0,
      stability: 10.0,
      difficulty: 4.8,
      retrievability: 0.92,
      lastReviewedAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: "2026-10-01T00:00:00.000Z",
    },
  };

  beforeEach(() => {
    localStorage.clear();
    setSrsUserConfig({ algorithm: "fsrs", desiredRetention: 0.90 });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("FlashcardReviewStudio FSRS v5 Controls & DSR Telemetry", () => {
    it("renders FSRS memory metrics bar (S, D, R%) and default desired retention badge 90%", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/due")) {
          return Promise.resolve({
            ok: true,
            json: async () => [mockCardWithSchedule],
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<FlashcardReviewStudio initialQueue={[mockCardWithSchedule]} />);

      // Verify FSRS memory metrics bar is visible
      const memoryMetrics = await screen.findByTestId("fsrs-memory-metrics");
      expect(memoryMetrics).toBeInTheDocument();
      expect(memoryMetrics.textContent).toMatch(/S\s*=\s*\d+(\.\d+)?d/);
      expect(memoryMetrics.textContent).toMatch(/D\s*=\s*\d+(\.\d+)?\/10/);
      expect(memoryMetrics.textContent).toMatch(/R\s*=\s*\d+%/);

      // Verify desired retention badge starts at 90%
      const badge = screen.getByTestId("badge-desired-retention");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent("90%");

      // Verify algorithm select displays FSRS v5
      const algoSelect = screen.getByTestId("select-srs-algorithm") as HTMLSelectElement;
      expect(algoSelect).toBeInTheDocument();
      expect(algoSelect.value).toBe("fsrs");
    });

    it("displays 4 interval previews (1d, 3d, etc.) when card is flipped", async () => {
      render(<FlashcardReviewStudio initialQueue={[mockCardWithSchedule]} />);

      // Initially front is shown; rating buttons not rendered
      expect(screen.queryByTestId("rating-btn-1")).not.toBeInTheDocument();

      // Flip the card
      const cardFront = await screen.findByText("Định luật bảo toàn năng lượng là gì?");
      fireEvent.click(cardFront);

      // Now 4 rating buttons and their interval previews should appear
      const preview1 = await screen.findByTestId("rating-interval-preview-1");
      const preview2 = screen.getByTestId("rating-interval-preview-2");
      const preview3 = screen.getByTestId("rating-interval-preview-3");
      const preview4 = screen.getByTestId("rating-interval-preview-4");

      expect(preview1).toBeInTheDocument();
      expect(preview2).toBeInTheDocument();
      expect(preview3).toBeInTheDocument();
      expect(preview4).toBeInTheDocument();

      // Preview intervals should follow d/m/y format (e.g., "< 1d", "10d", "25d")
      expect(preview1.textContent).toMatch(/< 1d|1d/);
      expect(preview2.textContent).toMatch(/\d+d/);
      expect(preview3.textContent).toMatch(/\d+d/);
      expect(preview4.textContent).toMatch(/\d+d/);
    });

    it("updates badge, localStorage, and contracts rating intervals when slider moves from 0.90 to 0.95", async () => {
      render(<FlashcardReviewStudio initialQueue={[mockCardWithSchedule]} />);

      // Flip card to reveal rating buttons
      const cardFront = await screen.findByText("Định luật bảo toàn năng lượng là gì?");
      fireEvent.click(cardFront);

      // Capture Good (3) and Easy (4) initial intervals at 90% retention
      const preview3At90 = screen.getByTestId("rating-interval-preview-3").textContent;
      const preview4At90 = screen.getByTestId("rating-interval-preview-4").textContent;

      const daysGood90 = parseInt(preview3At90 || "0", 10);
      const daysEasy90 = parseInt(preview4At90 || "0", 10);

      // Adjust slider to 0.95
      const slider = screen.getByTestId("slider-desired-retention");
      fireEvent.change(slider, { target: { value: "0.95" } });

      // Badge should update to 95%
      const badge = screen.getByTestId("badge-desired-retention");
      expect(badge).toHaveTextContent("95%");

      // LocalStorage should persist 0.95
      expect(getSrsUserConfig().desiredRetention).toBe(0.95);

      // Rating intervals on Good and Easy should become shorter (higher retention = tighter intervals)
      const preview3At95 = screen.getByTestId("rating-interval-preview-3").textContent;
      const preview4At95 = screen.getByTestId("rating-interval-preview-4").textContent;

      const daysGood95 = parseInt(preview3At95 || "0", 10);
      const daysEasy95 = parseInt(preview4At95 || "0", 10);

      expect(daysGood95).toBeLessThanOrEqual(daysGood90);
      expect(daysEasy95).toBeLessThanOrEqual(daysEasy90);
    });

    it("switches algorithm to SM-2 and persists to localStorage", async () => {
      render(<FlashcardReviewStudio initialQueue={[mockCardWithSchedule]} />);

      const algoSelect = screen.getByTestId("select-srs-algorithm") as HTMLSelectElement;
      fireEvent.change(algoSelect, { target: { value: "sm2" } });

      expect(algoSelect.value).toBe("sm2");
      expect(getSrsUserConfig().algorithm).toBe("sm2");
    });
  });

  describe("RetentionCurveChart FSRS v5 Power-Law Comparison", () => {
    it("renders both Ebbinghaus path, FSRS Power-Law path, and FSRS comparison summary", () => {
      const mockReviews: FlashcardReview[] = [
        {
          id: "rev-1",
          clientEventId: "evt-1",
          flashcardId: "card-fsrs-001",
          topicId: "topic-science",
          rating: 3,
          reviewDurationMs: 2200,
          reviewedAt: "2026-10-02T10:00:00.000Z",
          stateBefore: "review",
          stateAfter: "review",
          intervalBefore: 3,
          intervalAfter: 8,
          easeFactorBefore: 2.5,
          easeFactorAfter: 2.5,
          dueBeforeAt: "2026-10-02T00:00:00.000Z",
          dueAfterAt: "2026-10-10T00:00:00.000Z",
        },
      ];

      render(
        <RetentionCurveChart
          cards={[mockCardWithSchedule]}
          reviews={mockReviews}
          onClose={() => {}}
        />
      );

      // Verify Ebbinghaus curve path exists
      const ebbinghausPath = screen.getByTestId("ebbinghaus-path");
      expect(ebbinghausPath).toBeInTheDocument();
      expect(ebbinghausPath.getAttribute("d")).toBeTruthy();

      // Verify FSRS Power-Law curve path exists
      const fsrsPath = screen.getByTestId("fsrs-powerlaw-path");
      expect(fsrsPath).toBeInTheDocument();
      expect(fsrsPath.getAttribute("d")).toBeTruthy();

      // Verify FSRS vs Ebbinghaus comparison summary card is displayed
      const comparisonSummary = screen.getByTestId("fsrs-curve-comparison-summary");
      expect(comparisonSummary).toBeInTheDocument();
      expect(comparisonSummary).toHaveTextContent(/90\.0%/);
      expect(comparisonSummary).toHaveTextContent(/FSRS v5 DSR/i);
    });
  });
});
