/**
 * Test Suite: Phase D1 — Dashboard Daily Due Review Widget
 *
 * Gherkin Acceptance Criteria Tested:
 *
 * Feature: Daily Due Flashcard Review Habit Widget on DashboardHome
 *
 *   Scenario 1: Hiển thị số lượng thẻ đến hạn và nút CTA khi dueToday > 0
 *     Given người dùng ở DashboardHome và có 8 thẻ đến hạn ôn tập (dueToday = 8)
 *     When DailyDueReviewWidget nạp dữ liệu xong
 *     Then hiển thị số "8"
 *     And hiển thị badge "Cần ôn hôm nay"
 *     And hiển thị ước tính thời gian "~5 phút"
 *     And hiển thị nút CTA "Ôn tập ngay 5 phút" (data-testid="btn-daily-due-review")
 *
 *   Scenario 2: Nút 1-click CTA kích hoạt trực tiếp openFlashcardReview(null, "review")
 *     Given DailyDueReviewWidget đang hiển thị với 8 thẻ đến hạn
 *     When người dùng click nút "Ôn tập ngay 5 phút"
 *     Then hàm openFlashcardReview(null, "review") được gọi chính xác 1 lần
 *
 *   Scenario 3: Hiển thị trạng thái All-Caught-Up khi dueToday === 0
 *     Given hệ thống không có thẻ nào đến hạn hôm nay (dueToday = 0)
 *     When DailyDueReviewWidget nạp dữ liệu xong
 *     Then hiển thị trạng thái hoàn thành "Đã hoàn tất mục tiêu hôm nay" hoặc "Không có thẻ đến hạn"
 *     And không hiển thị nút thúc giục quá hạn
 *
 *   Scenario 4: Phục hồi an toàn khi nạp API thất bại (Error Resilience)
 *     Given endpoint /api/flashcards/progress trả về HTTP 500
 *     When DailyDueReviewWidget nạp dữ liệu
 *     Then hiển thị fallback an toàn (data-testid="daily-due-error-state") với nút "Thử lại"
 *     And không làm sập DashboardHome; các phần khác vẫn hoạt động bình thường
 *
 *   Scenario 5: Wiring và vị trí widget trên DashboardHome tách biệt khỏi FlashcardAnalyticsWidget
 *     Given màn hình DashboardHome được render
 *     Then DailyDueReviewWidget xuất hiện tại khối Spaced Repetition (data-testid="daily-due-review-widget")
 *     And tách biệt rõ ràng khỏi FlashcardAnalyticsWidget
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DashboardHome } from "../../src/components/dashboard/DashboardHome";
import * as DataContextModule from "../../src/context/DataContext";

import { DailyDueReviewWidget } from "../../src/components/dashboard/DailyDueReviewWidget";

describe("Phase D1: Dashboard Daily Due Review Widget (Test-First)", () => {
  const mockOpenFlashcardReview = vi.fn();
  const mockOpenTopicDetail = vi.fn();
  const mockSetActiveTab = vi.fn();
  const mockSetSelectedCategoryFilter = vi.fn();
  const mockAddCategory = vi.fn();
  const mockSetFocusDomainId = vi.fn();

  const mockDataContextValue = {
    topics: [
      {
        id: "topic-1",
        title: "Bát Chánh Đạo Thực Hành",
        slug: "bat-chanh-dao",
        categoryId: "cat-root-1",
        description: "Khảo sát bát chánh đạo",
        tags: ["phat-hoc"],
        notesCount: 3,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-10T00:00:00.000Z",
        studyProgress: {
          progress: 60,
          lastStudied: "2026-10-10T00:00:00.000Z",
          timesStudied: 4,
        },
      },
    ],
    categories: [
      {
        id: "cat-root-1",
        name: "Phật Học Nguyên Thủy",
        slug: "phat-hoc-nguyen-thuy",
        parentId: null,
        color: "#b45309",
      },
    ],
    notes: [],
    resources: [],
    reviewQueue: [],
    focusDomainId: null,
    setFocusDomainId: mockSetFocusDomainId,
    openTopicDetail: mockOpenTopicDetail,
    setActiveTab: mockSetActiveTab,
    setSelectedCategoryFilter: mockSetSelectedCategoryFilter,
    addCategory: mockAddCategory,
    openFlashcardReview: mockOpenFlashcardReview,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock useData from DataContext
    vi.spyOn(DataContextModule, "useData").mockReturnValue(
      mockDataContextValue as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // SUITE 1: DailyDueReviewWidget Isolated Contract Tests
  // =========================================================================
  describe("1. DailyDueReviewWidget Isolated Component Contract", () => {
    it("1.1. Khi dueToday > 0, hiển thị số thẻ đến hạn và nút CTA 'Ôn tập ngay 5 phút'", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalCards: 50,
              newCards: 10,
              learningCards: 5,
              reviewCards: 35,
              dueToday: 8,
              retentionRate: 92,
              streakDays: 5,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DailyDueReviewWidget />);

      await waitFor(() => {
        expect(screen.getByTestId("daily-due-review-widget")).toBeInTheDocument();
      });

      // Kiểm tra hiển thị số thẻ đến hạn 8 và nhãn ước tính thời gian
      expect(screen.getByTestId("daily-due-count")).toHaveTextContent("8");
      expect(screen.getByTestId("daily-due-estimate")).toHaveTextContent(/5 phút/i);

      // Kiểm tra nút CTA chính
      const ctaBtn = screen.getByTestId("btn-daily-due-review");
      expect(ctaBtn).toBeInTheDocument();
      expect(ctaBtn).toHaveTextContent(/Ôn tập ngay 5 phút/i);
    });

    it("1.2. Nhấp vào nút CTA 'Ôn tập ngay 5 phút' gọi openFlashcardReview(null, 'review')", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalCards: 50,
              newCards: 10,
              learningCards: 5,
              reviewCards: 35,
              dueToday: 8,
              retentionRate: 92,
              streakDays: 5,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DailyDueReviewWidget />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-daily-due-review")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("btn-daily-due-review"));

      expect(mockOpenFlashcardReview).toHaveBeenCalledTimes(1);
      expect(mockOpenFlashcardReview).toHaveBeenCalledWith(null, "review");
    });

    it("1.3. Khi dueToday === 0, hiển thị trạng thái all-caught-up tích cực", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalCards: 50,
              newCards: 0,
              learningCards: 0,
              reviewCards: 50,
              dueToday: 0,
              retentionRate: 98,
              streakDays: 6,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DailyDueReviewWidget />);

      await waitFor(() => {
        expect(screen.getByTestId("daily-due-all-caught-up")).toBeInTheDocument();
      });

      expect(screen.getByTestId("daily-due-all-caught-up")).toHaveTextContent(
        /Đã hoàn tất|Không có thẻ đến hạn/i
      );
      // Không hiển thị nút báo quá hạn
      expect(screen.queryByTestId("btn-daily-due-review")).not.toBeInTheDocument();
    });

    it("1.4. Khi API thất bại, hiển thị fallback an toàn với nút thử lại", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: "Internal Server Error" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DailyDueReviewWidget />);

      await waitFor(() => {
        expect(screen.getByTestId("daily-due-error-state")).toBeInTheDocument();
      });

      expect(screen.getByTestId("btn-daily-due-retry")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // SUITE 2: DashboardHome Integration & Wiring Tests
  // =========================================================================
  describe("2. DashboardHome Integration & Wiring", () => {
    it("2.1. DashboardHome render DailyDueReviewWidget tại khối Spaced Repetition", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalCards: 40,
              newCards: 5,
              learningCards: 5,
              reviewCards: 30,
              dueToday: 12,
              retentionRate: 90,
              streakDays: 3,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DashboardHome />);

      // Widget phải xuất hiện trên DashboardHome
      await waitFor(() => {
        expect(
          screen.getByTestId("daily-due-review-widget"),
          "DashboardHome phải render DailyDueReviewWidget với data-testid='daily-due-review-widget'"
        ).toBeInTheDocument();
      });

      // Nút CTA 1-click cũng phải có mặt trên DashboardHome
      expect(screen.getByTestId("btn-daily-due-review")).toBeInTheDocument();
      expect(screen.getByTestId("daily-due-count")).toHaveTextContent("12");
    });

    it("2.2. Nhấp CTA 'Ôn tập ngay 5 phút' từ DashboardHome kích hoạt openFlashcardReview(null, 'review')", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              totalCards: 40,
              newCards: 5,
              learningCards: 5,
              reviewCards: 30,
              dueToday: 12,
              retentionRate: 90,
              streakDays: 3,
            }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DashboardHome />);

      await waitFor(() => {
        expect(screen.getByTestId("btn-daily-due-review")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("btn-daily-due-review"));

      expect(mockOpenFlashcardReview).toHaveBeenCalledTimes(1);
      expect(mockOpenFlashcardReview).toHaveBeenCalledWith(null, "review");
    });

    it("2.3. Lỗi nạp flashcard progress không làm sập DashboardHome; các phần khác vẫn hoạt động", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/flashcards/progress")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: "Database offline" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(<DashboardHome />);

      // Các section cốt lõi của DashboardHome không được sập
      await waitFor(() => {
        expect(screen.getByText("Tổng Quan Nghiên Cứu")).toBeInTheDocument();
      });

      expect(screen.getByTestId("today-learning-hero")).toBeInTheDocument();
      expect(screen.getByText(/Lĩnh vực học tập/i)).toBeInTheDocument();

      // DailyDueReviewWidget hiển thị fallback lỗi nhẹ nhàng mà không throw
      expect(screen.getByTestId("daily-due-error-state")).toBeInTheDocument();
    });
  });
});
