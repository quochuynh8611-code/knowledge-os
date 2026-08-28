import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import { useSyncQueue } from "../../src/hooks/useSyncQueue";
import type { SyncMutation } from "../../src/lib/syncQueue";

describe("Phase P2.6b — Failed Mutation Operator Controls & Poison-Pill Mitigation", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_operator_test";
  let syncQueueService: SyncQueueService;

  const mutationA: SyncMutation = {
    id: "mut-A",
    entityType: "note",
    action: "save",
    entityId: "note-A",
    clientTimestamp: "2026-08-28T10:00:00.000Z",
    retryCount: 0,
    status: "pending",
  };

  const mutationB: SyncMutation = {
    id: "mut-B",
    entityType: "topic",
    action: "delete",
    entityId: "topic-B",
    clientTimestamp: "2026-08-28T10:01:00.000Z",
    retryCount: 2,
    status: "failed",
    lastError: "HTTP 500: Poison Pill",
  };

  const mutationC: SyncMutation = {
    id: "mut-C",
    entityType: "resource",
    action: "save",
    entityId: "resource-C",
    clientTimestamp: "2026-08-28T10:02:00.000Z",
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

  // ─── 1. Hook Level: discardFailedMutation Contract ────────────────────────

  describe("1. useSyncQueue Hook Operator Contract", () => {
    it("1.1. allows discarding a failed mutation and returns true", () => {
      syncQueueService.enqueue(mutationA);
      syncQueueService.enqueue(mutationB);

      const { result } = renderHook(() => useSyncQueue(syncQueueService));

      expect(result.current.queue).toHaveLength(2);

      let success = false;
      act(() => {
        success = result.current.discardFailedMutation("mut-B");
      });

      expect(success).toBe(true);
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("mut-A");
    });

    it("1.2. strictly rejects discarding a pending mutation and returns false", () => {
      syncQueueService.enqueue(mutationA);

      const { result } = renderHook(() => useSyncQueue(syncQueueService));

      let success = true;
      act(() => {
        success = result.current.discardFailedMutation("mut-A");
      });

      expect(success).toBe(false);
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe("mut-A"); // Pending mutation is untouched
    });
  });

  // ─── 2. UI Level: Discard Controls & Inline Confirmation ──────────────────

  describe("2. SyncStatusBadge Popover Inline Discard Controls", () => {
    it("2.1. failed mutation displays discard button, pending mutation does not", () => {
      syncQueueService.enqueue(mutationA);
      syncQueueService.enqueue(mutationB);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const items = screen.getAllByTestId("sync-queue-item");
      expect(items).toHaveLength(2);

      // Pending Item A: No discard button
      expect(
        within(items[0]).queryByRole("button", { name: /bỏ qua|discard/i })
      ).not.toBeInTheDocument();

      // Failed Item B: Has discard button
      const discardBtn = within(items[1]).getByRole("button", {
        name: /bỏ qua|discard/i,
      });
      expect(discardBtn).toBeInTheDocument();
    });

    it("2.2. clicking discard shows inline confirmation with 'Xác nhận bỏ qua' and 'Hủy'", () => {
      syncQueueService.enqueue(mutationB);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const discardBtn = screen.getByRole("button", { name: /bỏ qua|discard/i });
      fireEvent.click(discardBtn);

      expect(
        screen.getByRole("button", { name: /xác nhận bỏ qua/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /hủy/i })).toBeInTheDocument();
    });

    it("2.3. clicking 'Hủy' cancels discard without modifying the queue", () => {
      syncQueueService.enqueue(mutationB);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      fireEvent.click(screen.getByRole("button", { name: /bỏ qua|discard/i }));
      fireEvent.click(screen.getByRole("button", { name: /hủy/i }));

      // Mutation B is still present in queue
      expect(syncQueueService.getQueue()).toHaveLength(1);
      expect(syncQueueService.getQueue()[0].id).toBe("mut-B");
    });

    it("2.4. clicking 'Xác nhận bỏ qua' removes failed mutation and preserves exact FIFO order of remaining items", () => {
      syncQueueService.enqueue(mutationA); // Item A (pending)
      syncQueueService.enqueue(mutationB); // Item B (failed)
      syncQueueService.enqueue(mutationC); // Item C (pending)

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);
      fireEvent.click(screen.getByTestId("sync-status-badge"));

      const itemsBefore = screen.getAllByTestId("sync-queue-item");
      expect(itemsBefore).toHaveLength(3);

      // Discard failed Item B
      const discardBtn = within(itemsBefore[1]).getByRole("button", {
        name: /bỏ qua|discard/i,
      });
      fireEvent.click(discardBtn);

      const confirmBtn = screen.getByRole("button", {
        name: /xác nhận bỏ qua/i,
      });
      fireEvent.click(confirmBtn);

      // Remaining items in service and UI
      const remainingQueue = syncQueueService.getQueue();
      expect(remainingQueue).toHaveLength(2);
      expect(remainingQueue[0].id).toBe("mut-A");
      expect(remainingQueue[1].id).toBe("mut-C");
    });
  });
});

// Helper for scoped querying
function within(element: HTMLElement) {
  return {
    getByRole: (role: string, options?: any) => {
      const el = element.querySelector(
        role === "button" ? "button" : role
      ) as HTMLElement;
      if (!el) throw new Error(`Role ${role} not found in element`);
      if (options?.name && !options.name.test(el.textContent || "")) {
        throw new Error(
          `Button with name ${options.name} not found in element`
        );
      }
      return el;
    },
    queryByRole: (role: string, options?: any) => {
      const el = element.querySelector(
        role === "button" ? "button" : role
      ) as HTMLElement;
      if (!el) return null;
      if (options?.name && !options.name.test(el.textContent || "")) {
        return null;
      }
      return el;
    },
  };
}
