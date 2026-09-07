import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DuplicateDetectionDashboard } from "../../src/components/flashcards/DuplicateDetectionDashboard";
import type { Flashcard } from "../../src/types/flashcard";

describe("Phase F6.9: DuplicateDetectionDashboard Component", () => {
  const mockCards: Flashcard[] = [
    {
      id: "c1",
      topicId: "topic-1",
      type: "basic",
      front: "Thái Cực sinh Lưỡng Nghi",
      back: "Âm và Dương",
      lifecycleStatus: "active",
      schedule: {
        id: "s1",
        flashcardId: "c1",
        state: "review",
        dueAt: new Date().toISOString(),
        interval: 10,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: "c2",
      topicId: "topic-1",
      type: "basic",
      front: "thái cực sinh lưỡng nghi",
      back: "âm và dương",
      lifecycleStatus: "active",
      schedule: {
        id: "s2",
        flashcardId: "c2",
        state: "new",
        dueAt: new Date().toISOString(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        updatedAt: new Date().toISOString(),
      },
      createdAt: "2026-09-05T00:00:00.000Z",
      updatedAt: "2026-09-05T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default fetch mock returning cards
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/flashcards/lifecycle")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCards),
      });
    });
  });

  it("renders loading state then duplicate groups successfully", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    expect(screen.getByText(/Đang quét và phân tích các thẻ trùng lặp/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/1 nhóm thẻ trùng lặp/i)).toBeInTheDocument();
    expect(screen.getByText(/100% Trùng khớp/i)).toBeInTheDocument();
    expect(screen.getByText("Thái Cực sinh Lưỡng Nghi")).toBeInTheDocument();
    expect(screen.getByText("thái cực sinh lưỡng nghi")).toBeInTheDocument();
  });

  it("allows swapping primary card between items in a candidate group", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    // Currently c1 is primary (has 3 reps), c2 is duplicate
    const swapButtons = screen.getAllByRole("button", { name: /Chọn làm thẻ gốc/i });
    expect(swapButtons.length).toBeGreaterThan(0);

    fireEvent.click(swapButtons[0]);

    // Now c2 should become primary
    expect(screen.getByText(/Đã chọn thẻ này làm thẻ gốc của nhóm/i)).toBeInTheDocument();
  });

  it("opens confirmation modal and suspends duplicate card", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    const suspendBtn = screen.getByRole("button", { name: /Tạm ngưng thẻ này/i });
    fireEvent.click(suspendBtn);

    // Modal opens
    expect(screen.getByText(/Xác Nhận Tạm Ngưng Thẻ Trùng/i)).toBeInTheDocument();
    expect(screen.getByText(/Thẻ trùng sẽ được chuyển sang trạng thái/i)).toBeInTheDocument();

    // Confirm action
    const confirmBtn = screen.getByTestId("btn-confirm-suspend-action");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/Đã tạm ngưng thẻ trùng lặp thành công/i)).toBeInTheDocument();
    });

    // F6.9.2: API must now use POST /suspend-duplicate with expectedTopicId from dashboard topicId prop
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/flashcards/c2/suspend-duplicate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ lifecycleStatus: "suspended", expectedTopicId: "topic-1" }),
      })
    );
  });

  it("allows skipping a duplicate group", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    // F6.9.2: Skip label updated to "Bỏ qua trong phiên này"
    const skipBtn = screen.getByRole("button", { name: /Bỏ qua trong phiên này/i });
    fireEvent.click(skipBtn);

    // Group is skipped, showing empty state
    await waitFor(() => {
      expect(screen.getByText(/Không Tìm Thấy Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });
  });

  it("opens and displays audit logs modal", async () => {
    const logEntry = {
      id: "log-1",
      topicId: "topic-1",
      primaryCardId: "c1",
      duplicateCardId: "c2",
      action: "suspend_duplicate",
      resolvedAt: new Date().toISOString(),
    };
    (window.localStorage.getItem as any).mockReturnValue(JSON.stringify([logEntry]));

    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    const auditBtn = screen.getByTestId("btn-view-audit-logs");
    fireEvent.click(auditBtn);

    // F6.9.2: Updated title
    expect(screen.getByText(/Nhật ký hoạt động trên thiết bị/i)).toBeInTheDocument();
    expect(screen.getByText(/Tạm ngưng thẻ trùng/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Đóng/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Nhật ký hoạt động trên thiết bị/i)).not.toBeInTheDocument();
  });


  // --- F6.9.2 Regression Tests ---

  it("A. topic-scoped suspend sends POST to /suspend-duplicate with expectedTopicId from dashboard context", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    const suspendBtn = screen.getByRole("button", { name: /Tạm ngưng thẻ này/i });
    fireEvent.click(suspendBtn);

    const confirmBtn = screen.getByTestId("btn-confirm-suspend-action");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Must use the new scoped route, not the generic PATCH
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/flashcards/c2/suspend-duplicate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            lifecycleStatus: "suspended",
            expectedTopicId: "topic-1",  // from dashboard topicId prop, NOT cardToSuspend.topicId
          }),
        })
      );
    });

    // Must NOT call the generic PATCH route
    const fetchCalls = (global.fetch as any).mock.calls as [string, any][];
    const patchCalls = fetchCalls.filter(
      ([url, opts]) => url.includes("/api/flashcards/c2") && opts?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });

  it("B. skip button shows 'Bỏ qua trong phiên này' and session-only disclaimer", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    // New label
    expect(screen.getByRole("button", { name: /Bỏ qua trong phiên này/i })).toBeInTheDocument();
    // Session-only disclaimer text
    expect(screen.getByText(/sẽ xuất hiện lại khi tải lại trang/i)).toBeInTheDocument();
  });

  it("C. audit modal shows 'Nhật ký hoạt động trên thiết bị' and browser-local disclosure", async () => {
    render(<DuplicateDetectionDashboard topicId="topic-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Phát Hiện & Xử Lý Thẻ Trùng Lặp/i)).toBeInTheDocument();
    });

    // Header button new label
    expect(screen.getByTestId("btn-view-audit-logs")).toHaveTextContent(/Nhật ký thiết bị/i);

    fireEvent.click(screen.getByTestId("btn-view-audit-logs"));

    // Modal title changed
    expect(screen.getByText(/Nhật ký hoạt động trên thiết bị/i)).toBeInTheDocument();
    // Disclosure about client-side storage
    expect(screen.getByText(/lưu cục bộ trên trình duyệt/i)).toBeInTheDocument();
  });
});
