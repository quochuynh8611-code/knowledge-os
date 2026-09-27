import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.6a — Sync Queue Read-Only Details Popover", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_popover_test";
  let syncQueueService: SyncQueueService;

  const samplePendingNote: SyncMutation = {
    id: "mut-pop-1",
    entityType: "note",
    action: "save",
    entityId: "note-1",
    clientTimestamp: "2026-08-28T10:15:30.000Z",
    retryCount: 0,
    status: "pending",
  };

  const sampleFailedTopic: SyncMutation = {
    id: "mut-pop-2",
    entityType: "topic",
    action: "delete",
    entityId: "topic-2",
    clientTimestamp: "2026-08-28T10:16:02.000Z",
    retryCount: 1,
    status: "failed",
    lastError: "HTTP 500: Internal Server Error",
  };

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Popover Open / Close Toggle ────────────────────────────────────────

  describe("1. Popover Toggle & Visibility", () => {
    it("1.1. clicking SyncStatusBadge toggles the popover open and closed", () => {
      syncQueueService.enqueue(samplePendingNote);
      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      expect(screen.queryByTestId("sync-queue-popover")).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(screen.getByTestId("sync-status-badge"));
      expect(screen.getByTestId("sync-queue-popover")).toBeInTheDocument();

      // Click again to close
      fireEvent.click(screen.getByTestId("sync-status-badge"));
      expect(screen.queryByTestId("sync-queue-popover")).not.toBeInTheDocument();
    });

    it("1.2. pressing Escape closes the popover", () => {
      syncQueueService.enqueue(samplePendingNote);
      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      fireEvent.click(screen.getByTestId("sync-status-badge"));
      expect(screen.getByTestId("sync-queue-popover")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByTestId("sync-queue-popover")).not.toBeInTheDocument();
    });

    it("1.3. clicking outside closes the popover", () => {
      syncQueueService.enqueue(samplePendingNote);
      render(
        <div>
          <div data-testid="outside-area">Outside Area</div>
          <SyncStatusBadge syncQueueService={syncQueueService} />
        </div>
      );

      fireEvent.click(screen.getByTestId("sync-status-badge"));
      expect(screen.getByTestId("sync-queue-popover")).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId("outside-area"));
      expect(screen.queryByTestId("sync-queue-popover")).not.toBeInTheDocument();
    });
  });

  // ─── 2. FIFO Order & Sanitized Content ────────────────────────────────────

  describe("2. FIFO Order & Sanitized Content", () => {
    it("2.1. renders queue items in exact FIFO order with entityType, action, status, and timestamp", () => {
      syncQueueService.enqueue(samplePendingNote);
      syncQueueService.enqueue(sampleFailedTopic);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const popover = screen.getByTestId("sync-queue-popover");
      expect(popover).toBeInTheDocument();

      const items = screen.getAllByTestId("sync-queue-item");
      expect(items).toHaveLength(2);

      // Item 1: Note save (Pending)
      expect(items[0]).toHaveTextContent(/ghi chú/i);
      expect(items[0]).toHaveTextContent(/lưu/i);
      expect(items[0]).toHaveTextContent(/chờ/i);

      // Item 2: Topic delete (Failed)
      expect(items[1]).toHaveTextContent(/chủ đề/i);
      expect(items[1]).toHaveTextContent(/xóa/i);
      expect(items[1]).toHaveTextContent(/chờ thử lại/i);
    });

    it("2.2. failed mutation displays sanitized user-friendly message and masks raw 500 error in default view", () => {
      syncQueueService.enqueue(sampleFailedTopic);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      // Friendly message is rendered
      expect(
        screen.getByText(/máy chủ đang bận xử lý hoặc gặp sự cố tạm thời/i)
      ).toBeInTheDocument();

      // Raw technical error is NOT rendered in default user-facing view
      expect(
        screen.queryByText(/HTTP 500: Internal Server Error/i)
      ).not.toBeInTheDocument();
    });

    it("2.2b. masks raw Prisma errors with gentle conflict message in default view", () => {
      syncQueueService.enqueue({
        id: "mut-prisma-fail",
        entityType: "note",
        action: "save",
        entityId: "note-prisma-1",
        clientTimestamp: "2026-08-28T10:16:02.000Z",
        retryCount: 1,
        status: "failed",
        lastError: "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`id`)",
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      // Friendly conflict message is rendered
      expect(
        screen.getByText(/dữ liệu có thể đã tồn tại hoặc bị xung đột phiên bản/i)
      ).toBeInTheDocument();

      // Raw Prisma error string is NOT rendered in default user-facing view
      expect(
        screen.queryByText(/PrismaClientKnownRequestError/i)
      ).not.toBeInTheDocument();
    });

    it("2.3. strictly confirms there is no discard/delete button for pending mutations", () => {
      syncQueueService.enqueue(samplePendingNote);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      // Ensure no discard/delete button exists for pending items
      const discardBtn = screen.queryByRole("button", {
        name: /hủy|bỏ|xóa mục|discard/i,
      });
      expect(discardBtn).not.toBeInTheDocument();
    });
  });

  // ─── 3. Manual Sync Action & Reassurance ───────────────────────────────────

  describe("3. Manual Sync Action & Reassurance", () => {
    it("3.1. clicking 'Lưu tất cả ngay' in popover triggers flush()", async () => {
      syncQueueService.enqueue(samplePendingNote);
      const flushSpy = vi.spyOn(syncQueueService, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const syncNowBtn = screen.getByRole("button", { name: /lưu tất cả ngay|đồng bộ ngay/i });
      expect(syncNowBtn).toBeInTheDocument();

      fireEvent.click(syncNowBtn);
      expect(flushSpy).toHaveBeenCalledOnce();
    });

    it("3.2. displays reassuring offline message when offline", () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      expect(
        screen.getByText(/đang ngoại tuyến\. mọi thay đổi vẫn an toàn và sẽ tự gửi lại khi có mạng\./i)
      ).toBeInTheDocument();
    });
  });
});
