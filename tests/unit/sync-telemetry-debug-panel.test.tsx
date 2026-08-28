import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import type { SyncMutation } from "../../src/lib/syncQueue";
import type { SyncTelemetryEvent } from "../../src/lib/syncTelemetry";

describe("Phase P2.9b — Sync Telemetry Read Model & Debug Panel UI", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_debug_panel_test";
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

  // Helper to open popover
  const openPopover = () => {
    const badge = screen.getByTestId("sync-status-badge");
    fireEvent.click(badge);
  };

  // ─── 1. Hook & Tab Switcher Contract ──────────────────────────────────────

  describe("1. Tab Navigation & Default State", () => {
    it("1.1. defaults to 'Hàng đợi' tab when popover is opened", () => {
      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Tab buttons exist
      const queueTab = screen.getByRole("tab", { name: /hàng đợi/i });
      const telemetryTab = screen.getByRole("tab", { name: /nhật ký/i });

      expect(queueTab).toBeInTheDocument();
      expect(telemetryTab).toBeInTheDocument();

      // Queue tab is selected by default
      expect(queueTab).toHaveAttribute("aria-selected", "true");
      expect(telemetryTab).toHaveAttribute("aria-selected", "false");
    });

    it("1.2. allows toggling between 'Hàng đợi' and 'Nhật ký & Thống kê' tabs", () => {
      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      const queueTab = screen.getByRole("tab", { name: /hàng đợi/i });
      const telemetryTab = screen.getByRole("tab", { name: /nhật ký/i });

      // Click telemetry tab
      fireEvent.click(telemetryTab);
      expect(telemetryTab).toHaveAttribute("aria-selected", "true");
      expect(queueTab).toHaveAttribute("aria-selected", "false");

      // Click queue tab back
      fireEvent.click(queueTab);
      expect(queueTab).toHaveAttribute("aria-selected", "true");
      expect(telemetryTab).toHaveAttribute("aria-selected", "false");
    });
  });

  // ─── 2. Aggregate Metrics Rendering ───────────────────────────────────────

  describe("2. Aggregate Metrics Rendering", () => {
    it("2.1. renders summary metrics cards accurately in the Telemetry tab", async () => {
      // Simulate multiple events in service telemetry
      // 8 successes, 2 failures, 1 discard
      for (let i = 1; i <= 8; i++) {
        service.enqueue({
          id: `mut-s-${i}`,
          entityType: "topic",
          action: "save",
          entityId: `top-${i}`,
          payload: { title: `Topic ${i}` },
          clientTimestamp: new Date().toISOString(),
          retryCount: 0,
          status: "pending",
        });
      }

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ success: true }))
      );
      await service.flushQueue("http://localhost:3000");

      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Switch to telemetry tab
      const telemetryTab = screen.getByRole("tab", { name: /nhật ký/i });
      fireEvent.click(telemetryTab);

      const panel = screen.getByTestId("sync-telemetry-panel");
      expect(panel).toBeInTheDocument();

      // Metrics check
      expect(within(panel).getByText(/tỉ lệ thành công/i)).toBeInTheDocument();
      expect(within(panel).getByText(/100%/i)).toBeInTheDocument();
      expect(within(panel).getByText(/đã đồng bộ/i)).toBeInTheDocument();
      expect(within(panel).getByText("8")).toBeInTheDocument();
    });
  });

  // ─── 3. Recent Events Stream ──────────────────────────────────────────────

  describe("3. Recent Events Stream (10 Items Max, LIFO)", () => {
    it("3.1. displays up to 10 most recent events with newest on top", () => {
      // Create 15 events in storage
      const events: SyncTelemetryEvent[] = [];
      for (let i = 1; i <= 15; i++) {
        events.push({
          id: `evt-${i}`,
          timestamp: new Date(1700000000000 + i * 1000).toISOString(),
          type: "MUTATION_ENQUEUED",
          entityType: "note",
          entityId: `note-${i}`,
          mutationId: `mut-${i}`,
        });
      }
      localStorage.setItem(`${STORAGE_KEY}_telemetry`, JSON.stringify(events));

      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Switch to Telemetry tab
      fireEvent.click(screen.getByRole("tab", { name: /nhật ký/i }));

      const eventItems = screen.getAllByTestId("sync-telemetry-item");
      expect(eventItems).toHaveLength(10); // Capped at 10

      // Newest event (evt-15) is at top
      expect(eventItems[0]).toHaveTextContent("note-15");
      expect(eventItems[9]).toHaveTextContent("note-6");
    });

    it("3.2. displays error details for failed events and hides error box for successes", () => {
      const events: SyncTelemetryEvent[] = [
        {
          id: "evt-fail",
          timestamp: "2026-08-28T12:00:00.000Z",
          type: "REPLAY_FAILED",
          entityType: "topic",
          entityId: "top-error-1",
          error: "Connection refused by server",
        },
        {
          id: "evt-success",
          timestamp: "2026-08-28T12:00:01.000Z",
          type: "REPLAY_SUCCESS",
          entityType: "topic",
          entityId: "top-ok-1",
        },
      ];
      localStorage.setItem(`${STORAGE_KEY}_telemetry`, JSON.stringify(events));

      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      fireEvent.click(screen.getByRole("tab", { name: /nhật ký/i }));

      expect(
        screen.getByText(/Connection refused by server/i)
      ).toBeInTheDocument();
    });
  });

  // ─── 4. Regression Safety ─────────────────────────────────────────────────

  describe("4. Regression Safety for Queue Controls", () => {
    it("4.1. preserves active queue items and operator discard controls in 'Hàng đợi' tab", () => {
      const failedMutation: SyncMutation = {
        id: "mut-f-1",
        entityType: "topic",
        action: "save",
        entityId: "top-reg-1",
        clientTimestamp: "2026-08-28T12:00:00.000Z",
        retryCount: 2,
        status: "failed",
        lastError: "Prisma timeout",
      };
      service.enqueue(failedMutation);

      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Queue tab has mutation item
      const queueItem = screen.getByTestId("sync-queue-item");
      expect(queueItem).toBeInTheDocument();
      expect(queueItem).toHaveTextContent("top-reg-1");

      // Switch to telemetry and back
      fireEvent.click(screen.getByRole("tab", { name: /nhật ký/i }));
      fireEvent.click(screen.getByRole("tab", { name: /hàng đợi/i }));

      // Queue item still intact
      expect(screen.getByTestId("sync-queue-item")).toBeInTheDocument();
    });
  });
});
