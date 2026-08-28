import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.7c — Sync Backoff Indicator UI", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_backoff_ui_test";
  let service: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    service = new SyncQueueService(STORAGE_KEY);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Backoff State Rendering ───────────────────────────────────────────

  describe("1. Static Backoff State Rendering", () => {
    it("1.1. displays 'Thử lại sau 10s' for failed mutation with nextRetryAt 10s in future", () => {
      const now = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const failedItem: SyncMutation = {
        id: "mut-cooldown-1",
        entityType: "topic",
        action: "save",
        entityId: "topic-101",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 2,
        status: "failed",
        lastError: "HTTP 503 Service Unavailable",
        lastAttemptAt: "2026-08-28T11:59:50.000Z",
        backoffDelayMs: 10000,
        nextRetryAt: "2026-08-28T12:00:10.000Z", // 10s in future
      };
      service.enqueue(failedItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/thử lại sau 10s/i);
    });

    it("1.2. displays 'Thử lại sau 1 phút' when remaining cooldown >= 60s", () => {
      const now = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const failedItem: SyncMutation = {
        id: "mut-cooldown-2",
        entityType: "note",
        action: "save",
        entityId: "note-202",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 7,
        status: "failed",
        lastError: "HTTP 500 Server Error",
        lastAttemptAt: "2026-08-28T12:00:00.000Z",
        backoffDelayMs: 60000,
        nextRetryAt: "2026-08-28T12:01:00.000Z", // 60s in future
      };
      service.enqueue(failedItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/thử lại sau 1 phút/i);
    });

    it("1.3. displays 'Sẵn sàng thử lại' when nextRetryAt has already elapsed", () => {
      const now = new Date("2026-08-28T12:00:10.000Z").getTime();
      vi.spyOn(Date, "now").mockReturnValue(now);

      const failedItem: SyncMutation = {
        id: "mut-ready-1",
        entityType: "topic",
        action: "delete",
        entityId: "topic-303",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 1,
        status: "failed",
        lastError: "HTTP 408 Timeout",
        lastAttemptAt: "2026-08-28T12:00:00.000Z",
        backoffDelayMs: 2000,
        nextRetryAt: "2026-08-28T12:00:02.000Z", // 8s in the past
      };
      service.enqueue(failedItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/sẵn sàng thử lại/i);
      expect(item).not.toHaveTextContent(/thử lại sau/i);
    });

    it("1.4. pending mutation does not display cooldown or ready indicators", () => {
      const pendingItem: SyncMutation = {
        id: "mut-p-1",
        entityType: "category",
        action: "save",
        entityId: "cat-1",
        clientTimestamp: "2026-08-28T12:00:00.000Z",
        retryCount: 0,
        status: "pending",
      };
      service.enqueue(pendingItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/chờ đồng bộ/i);
      expect(item).not.toHaveTextContent(/thử lại sau/i);
      expect(item).not.toHaveTextContent(/sẵn sàng thử lại/i);
    });
  });

  // ─── 2. Scoped Live Ticker Lifecycle ──────────────────────────────────────

  describe("2. Scoped Live Ticker Lifecycle", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("2.1. countdown ticks every second when popover is open and transitions to ready state", () => {
      const baseTime = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.setSystemTime(baseTime);

      const failedItem: SyncMutation = {
        id: "mut-tick-1",
        entityType: "topic",
        action: "save",
        entityId: "topic-tick",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 1,
        status: "failed",
        lastError: "Network failure",
        nextRetryAt: new Date(baseTime + 3000).toISOString(), // 3s in future
      };
      service.enqueue(failedItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const item = screen.getByTestId("sync-queue-item");
      expect(item).toHaveTextContent(/thử lại sau 3s/i);

      // Advance 1s
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(item).toHaveTextContent(/thử lại sau 2s/i);

      // Advance 1s
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(item).toHaveTextContent(/thử lại sau 1s/i);

      // Advance 1s -> should now be ready
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(item).toHaveTextContent(/sẵn sàng thử lại/i);
    });

    it("2.2. cleans up interval when popover is closed", () => {
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
      const baseTime = new Date("2026-08-28T12:00:00.000Z").getTime();
      vi.setSystemTime(baseTime);

      const failedItem: SyncMutation = {
        id: "mut-close-1",
        entityType: "topic",
        action: "save",
        entityId: "topic-close",
        clientTimestamp: "2026-08-28T11:59:00.000Z",
        retryCount: 1,
        status: "failed",
        lastError: "Network failure",
        nextRetryAt: new Date(baseTime + 10000).toISOString(),
      };
      service.enqueue(failedItem);

      render(<SyncStatusBadge syncQueueService={service} />);

      // Open popover
      fireEvent.click(screen.getByTestId("sync-status-badge"));
      expect(screen.getByTestId("sync-queue-popover")).toBeInTheDocument();

      // Close popover via Escape
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByTestId("sync-queue-popover")).not.toBeInTheDocument();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it("2.3. does not create active interval if no mutation is in cooldown", () => {
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");

      const pendingItem: SyncMutation = {
        id: "mut-no-ticker",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: "2026-08-28T12:00:00.000Z",
        retryCount: 0,
        status: "pending",
      };
      service.enqueue(pendingItem);

      render(<SyncStatusBadge syncQueueService={service} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      // setInterval for ticker should not be called when all items are pending / ready
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });
});
