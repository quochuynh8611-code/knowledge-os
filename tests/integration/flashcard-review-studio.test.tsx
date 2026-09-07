/**
 * Integration Tests: FlashcardReviewStudio Component (Phase F5)
 *
 * Feature: Flashcard Review Studio — Interactive Session Flow
 *
 * Scenarios 1 to 10 matching Gherkin specifications:
 * - Scenario 1: User opens review studio and sees due cards
 * - Scenario 2: User flips card to see back (mouse click)
 * - Scenario 3: User flips card with keyboard shortcut (Space)
 * - Scenario 4: User rates card "Good" (3) and proceeds
 * - Scenario 5: User rates card "Again" (1) — idempotency check
 * - Scenario 6: Cloze card renders deletion hints correctly
 * - Scenario 7: User completes session (all cards reviewed)
 * - Scenario 8: Empty state — no due cards
 * - Scenario 9: Keyboard shortcuts disabled when card front visible
 * - Scenario 10: Session timeout / inactivity warning
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { FlashcardReviewStudio } from "../../src/components/flashcards/FlashcardReviewStudio";
import type { Flashcard, FlashcardReviewResponse } from "../../src/types/flashcard";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("FlashcardReviewStudio Integration Tests (Gherkin Scenarios 1-10)", () => {
  const mockDueCards: Flashcard[] = [
    {
      id: "card-001",
      topicId: "topic-1",
      type: "basic",
      front: "Tứ Niệm Xứ gồm những gì?",
      back: "Thân, Thọ, Tâm, Pháp.",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-1",
        flashcardId: "card-001",
        state: "new",
        dueAt: new Date().toISOString(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: "card-002",
      topicId: "topic-1",
      type: "cloze",
      front: "Bát Chánh Đạo chi phần đầu tiên là {{c1::Chánh Kiến::Sammā-diṭṭhi}}.",
      back: "Chánh Kiến là thấy rõ thực tại vô thường, khổ, vô ngã.",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schedule: {
        id: "sch-2",
        flashcardId: "card-002",
        state: "learning",
        dueAt: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("Scenario 1: Người dùng mở studio và thấy các thẻ đến hạn", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);

    // Kiểm tra gọi GET /api/flashcards/due
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/due")
      );
    });

    // Thấy thẻ đầu tiên ở mặt trước
    expect(await screen.findByText("Tứ Niệm Xứ gồm những gì?")).toBeInTheDocument();

    // Thanh tiến độ hiển thị "1 / 2" hoặc "1/2"
    expect(screen.getByTestId("queue-progress")).toHaveTextContent(/1\s*\/\s*2/);

    // Đồng hồ đếm thời gian bắt đầu
    expect(screen.getByTestId("session-timer")).toBeInTheDocument();
  });

  it("Scenario 2: Lật thẻ để xem mặt sau bằng click chuột", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDueCards,
    });

    render(<FlashcardReviewStudio />);
    const frontText = await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Click vào thẻ
    const cardEl = screen.getByTestId("flashcard-card");
    fireEvent.click(cardEl);

    // Thấy nội dung mặt sau
    expect(await screen.findByText("Thân, Thọ, Tâm, Pháp.")).toBeInTheDocument();
    expect(cardEl).toHaveAttribute("data-flipped", "true");
  });

  it("Scenario 3: Lật thẻ bằng phím tắt Space", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDueCards,
    });

    render(<FlashcardReviewStudio />);
    await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Nhấn phím Space
    fireEvent.keyDown(window, { code: "Space", key: " " });

    // Thẻ lật sang mặt sau
    expect(await screen.findByText("Thân, Thọ, Tâm, Pháp.")).toBeInTheDocument();
  });

  it("Scenario 4: Chấm điểm Good (3) và chuyển sang thẻ tiếp theo", async () => {
    const mockReviewResponse: FlashcardReviewResponse = {
      success: true,
      duplicate: false,
      clientEventId: "evt-test-123",
      review: {
        id: "rev-1",
        clientEventId: "evt-test-123",
        flashcardId: "card-001",
        topicId: "topic-1",
        rating: 3,
        reviewDurationMs: 1500,
        reviewedAt: new Date().toISOString(),
        stateBefore: "new",
        stateAfter: "review",
        intervalBefore: 0,
        intervalAfter: 1,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        dueBeforeAt: new Date().toISOString(),
        dueAfterAt: new Date().toISOString(),
      },
      schedule: {
        id: "sch-1",
        flashcardId: "card-001",
        state: "review",
        dueAt: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 1,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
    };

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      if (url.includes("/api/flashcards/review") && opts?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReviewResponse,
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);
    await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Lật thẻ trước
    fireEvent.keyDown(window, { code: "Space", key: " " });
    await screen.findByText("Thân, Thọ, Tâm, Pháp.");

    // Bấm nút Good (3) hoặc phím "3"
    const goodBtn = screen.getByTestId("rating-btn-3");
    fireEvent.click(goodBtn);

    // Xác nhận gọi POST /api/flashcards/review
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/review"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"rating":3'),
        })
      );
    });

    // Chuyển sang thẻ thứ 2
    expect(await screen.findByText(/Bát Chánh Đạo/)).toBeInTheDocument();
    expect(screen.getByTestId("queue-progress")).toHaveTextContent(/2\s*\/\s*2/);
  });

  it("Scenario 5: Chấm điểm Again (1) gửi clientEventId bảo đảm Option A Idempotency", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockDueCards[0]],
        });
      }
      if (url.includes("/api/flashcards/review")) {
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            duplicate: callCount > 1,
            clientEventId: "idemp-evt-1",
            review: {},
            schedule: {},
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);
    await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Lật thẻ
    fireEvent.keyDown(window, { code: "Space", key: " " });
    await screen.findByText("Thân, Thọ, Tâm, Pháp.");

    // Bấm Again (rating 1)
    const againBtn = screen.getByTestId("rating-btn-1");
    fireEvent.click(againBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards/review"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"clientEventId":'),
        })
      );
    });
  });

  it("Scenario 6: Thẻ cloze hiển thị gợi ý và chỗ trống chính xác", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockDueCards[1]], // thẻ cloze
    });

    render(<FlashcardReviewStudio />);

    // Kiểm tra render thẻ cloze ở mặt trước
    expect(await screen.findByTestId("cloze-deletion")).toBeInTheDocument();
    expect(screen.getByText(/Sammā-diṭṭhi/i)).toBeInTheDocument();
  });

  it("Scenario 7: Người dùng hoàn thành toàn bộ thẻ trong phiên (Celebration)", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => [mockDueCards[0]],
        });
      }
      if (url.includes("/api/flashcards/review")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, duplicate: false }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);
    await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Lật và chấm điểm
    fireEvent.keyDown(window, { code: "Space", key: " " });
    await screen.findByText("Thân, Thọ, Tâm, Pháp.");
    fireEvent.click(screen.getByTestId("rating-btn-3"));

    // Hiển thị màn hình hoàn thành
    expect(await screen.findByTestId("session-completed-view")).toBeInTheDocument();
    expect(screen.getByText(/Hoàn thành phiên ôn tập!/i)).toBeInTheDocument();
    expect(screen.getByTestId("btn-review-again")).toBeInTheDocument();
  });

  it("Scenario 8: Trạng thái hàng đợi rỗng (không có thẻ cần ôn)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<FlashcardReviewStudio />);

    // Hiển thị empty state
    expect(await screen.findByTestId("empty-queue-state")).toBeInTheDocument();
    expect(screen.getByText(/Không có thẻ cần ôn hôm nay/i)).toBeInTheDocument();
  });

  it("Scenario 9: Không kích hoạt phím tắt rating 1-4 khi thẻ đang ở mặt trước", async () => {
    const reviewFetchSpy = vi.fn();
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url.includes("/api/flashcards/due")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDueCards,
        });
      }
      if (url.includes("/api/flashcards/review")) {
        reviewFetchSpy();
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<FlashcardReviewStudio />);
    await screen.findByText("Tứ Niệm Xứ gồm những gì?");

    // Khi chưa lật thẻ, nhấn phím 1, 2, 3, 4
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "3" });

    // Review không được phép gọi
    expect(reviewFetchSpy).not.toHaveBeenCalled();
  });

  it("Scenario 10: Cảnh báo không hoạt động (inactivity warning) sau thời gian chờ", async () => {
    vi.useFakeTimers();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDueCards,
    });

    render(<FlashcardReviewStudio />);
    await act(async () => {
      await Promise.resolve();
    });

    // Tua thời gian 5 phút (300,000 ms) không tương tác
    act(() => {
      vi.advanceTimersByTime(300000);
    });

    // Kiểm tra toast / modal cảnh báo không hoạt động
    expect(screen.getByTestId("inactivity-warning")).toBeInTheDocument();
  });
});
