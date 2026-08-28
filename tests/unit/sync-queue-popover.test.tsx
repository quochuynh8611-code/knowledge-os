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

  // ─── 2. FIFO Order & Read-Only Content ────────────────────────────────────

  describe("2. FIFO Order & Read-Only Content", () => {
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
      expect(items[0]).toHaveTextContent(/note|ghi chú/i);
      expect(items[0]).toHaveTextContent(/save|lưu/i);
      expect(items[0]).toHaveTextContent(/pending|chờ/i);

      // Item 2: Topic delete (Failed)
      expect(items[1]).toHaveTextContent(/topic|chủ đề/i);
      expect(items[1]).toHaveTextContent(/delete|xóa/i);
      expect(items[1]).toHaveTextContent(/failed|lỗi/i);
    });

    it("2.2. failed mutation displays its specific lastError message", () => {
      syncQueueService.enqueue(sampleFailedTopic);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      expect(
        screen.getByText(/HTTP 500: Internal Server Error/i)
      ).toBeInTheDocument();
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

  // ─── 3. Manual Sync Action ────────────────────────────────────────────────

  describe("3. Manual Sync Action", () => {
    it("3.1. clicking 'Đồng bộ ngay' in popover triggers flush()", async () => {
      syncQueueService.enqueue(samplePendingNote);
      const flushSpy = vi.spyOn(syncQueueService, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const syncNowBtn = screen.getByRole("button", { name: /đồng bộ ngay/i });
      expect(syncNowBtn).toBeInTheDocument();

      fireEvent.click(syncNowBtn);
      expect(flushSpy).toHaveBeenCalledOnce();
    });
  });
});
