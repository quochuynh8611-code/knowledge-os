import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.7a — Sync Retry Visibility Lite", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_retry_test";
  let syncQueueService: SyncQueueService;

  const failedMutation: SyncMutation = {
    id: "mut-fail-retry-1",
    entityType: "topic",
    action: "delete",
    entityId: "topic-123",
    clientTimestamp: "2026-08-28T10:00:00.000Z",
    retryCount: 3,
    status: "failed",
    lastError: "HTTP 500: Database connection error",
  };

  const pendingMutation: SyncMutation = {
    id: "mut-pending-1",
    entityType: "note",
    action: "save",
    entityId: "note-456",
    clientTimestamp: "2026-08-28T10:05:00.000Z",
    retryCount: 0,
    status: "pending",
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

  // ─── 1. Retry Count Tag & Metadata Display ────────────────────────────────

  describe("1. Retry Count Tag & Metadata Display", () => {
    it("1.1. failed mutation with retryCount > 0 displays retry tag 'Lỗi (3 lần)' and metadata 'Đã thử 3 lần'", () => {
      syncQueueService.enqueue(failedMutation);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toBeInTheDocument();

      // Tag format: Lỗi (3 lần)
      expect(item).toHaveTextContent(/lỗi \(3 lần\)/i);

      // Metadata line: Đã thử 3 lần
      expect(item).toHaveTextContent(/đã thử 3 lần/i);
    });

    it("1.2. pending mutation with retryCount = 0 does not show retry failure tags", () => {
      syncQueueService.enqueue(pendingMutation);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/chờ đồng bộ/i);
      expect(item).not.toHaveTextContent(/đã thử/i);
      expect(item).not.toHaveTextContent(/lần/i);
    });

    it("1.3. continues to render exact lastError message alongside retry count", () => {
      syncQueueService.enqueue(failedMutation);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      expect(
        screen.getByText(/HTTP 500: Database connection error/i)
      ).toBeInTheDocument();
      expect(screen.getByTestId("sync-queue-item")).toHaveTextContent(
        /lỗi \(3 lần\)/i
      );
    });
  });

  // ─── 2. Reactive Retry Count Update on Failed Flush ───────────────────────

  describe("2. Reactive Retry Count Update on Failed Replay", () => {
    it("2.1. updates retry count reactively from 1 to 2 when manual flush fails again", async () => {
      syncQueueService.enqueue({
        ...failedMutation,
        retryCount: 1,
      });

      // Mock fetch to simulate network/server replay failure
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Server offline"));

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const itemBefore = screen.getByTestId("sync-queue-item");
      expect(itemBefore).toHaveTextContent(/lỗi \(1 lần\)/i);
      expect(itemBefore).toHaveTextContent(/đã thử 1 lần/i);

      const syncNowBtn = screen.getByRole("button", { name: /đồng bộ ngay/i });

      await act(async () => {
        fireEvent.click(syncNowBtn);
      });

      // After failed flush, retryCount is incremented in service and UI updates to 2
      const itemAfter = screen.getByTestId("sync-queue-item");
      expect(itemAfter).toHaveTextContent(/lỗi \(2 lần\)/i);
      expect(itemAfter).toHaveTextContent(/đã thử 2 lần/i);
    });
  });

  // ─── 3. Preservation of P2.6b Discard Controls ────────────────────────────

  describe("3. Preservation of P2.6b Discard Controls", () => {
    it("3.1. retains inline confirmation discard control alongside retry insight", () => {
      syncQueueService.enqueue(failedMutation);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const discardBtn = screen.getByRole("button", {
        name: /bỏ qua mục lỗi này/i,
      });
      expect(discardBtn).toBeInTheDocument();

      fireEvent.click(discardBtn);

      expect(
        screen.getByRole("button", { name: /xác nhận bỏ qua/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /hủy/i })).toBeInTheDocument();
    });
  });
});
