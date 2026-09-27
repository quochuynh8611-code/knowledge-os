import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import type { SyncMutation } from "../../src/lib/syncQueue";
import type { SyncTelemetryEvent } from "../../src/lib/syncTelemetry";

describe("Phase P2.9b — Sync Diagnostics Disclosure & Telemetry Panel UI", () => {
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

  // Helper to open diagnostics disclosure
  const openDiagnostics = () => {
    const toggle = screen.getByTestId("sync-diagnostics-toggle");
    fireEvent.click(toggle);
  };

  // ─── 1. Diagnostics Disclosure Toggle ──────────────────────────────────────

  describe("1. Diagnostics Disclosure & Default Hidden State", () => {
    it("1.1. diagnostics panel is hidden by default in user-facing view", () => {
      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Diagnostics toggle button exists
      const toggle = screen.getByTestId("sync-diagnostics-toggle");
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveTextContent(/xem chi tiết kỹ thuật/i);

      // Telemetry panel is hidden
      expect(screen.queryByTestId("sync-telemetry-panel")).not.toBeInTheDocument();
    });

    it("1.2. allows toggling diagnostics disclosure open and closed", () => {
      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();

      // Open diagnostics
      openDiagnostics();
      expect(screen.getByTestId("sync-telemetry-panel")).toBeInTheDocument();

      // Close diagnostics
      openDiagnostics();
      expect(screen.queryByTestId("sync-telemetry-panel")).not.toBeInTheDocument();
    });
  });

  // ─── 2. Aggregate Metrics Rendering ───────────────────────────────────────

  describe("2. Aggregate Metrics Rendering in Diagnostics View", () => {
    it("2.1. renders summary metrics cards accurately when diagnostics is opened", async () => {
      // Simulate 8 successes
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
      openDiagnostics();

      const panel = screen.getByTestId("sync-telemetry-panel");
      expect(panel).toBeInTheDocument();

      // Metrics check
      expect(within(panel).getByText(/tỉ lệ thành công/i)).toBeInTheDocument();
      expect(within(panel).getAllByText(/100%/i).length).toBeGreaterThanOrEqual(1);
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
      openDiagnostics();

      const eventItems = screen.getAllByTestId("sync-telemetry-item");
      expect(eventItems).toHaveLength(10); // Capped at 10

      // Newest event (evt-15) is at top
      expect(eventItems[0]).toHaveTextContent("note-15");
      expect(eventItems[9]).toHaveTextContent("note-6");
    });

    it("3.2. displays raw error details in diagnostics view for debugging", () => {
      const events: SyncTelemetryEvent[] = [
        {
          id: "evt-fail",
          timestamp: "2026-08-28T12:00:00.000Z",
          type: "REPLAY_FAILED",
          entityType: "topic",
          entityId: "top-error-1",
          error: "PrismaClientKnownRequestError: Connection refused by server",
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
      openDiagnostics();

      expect(
        screen.getByText(/PrismaClientKnownRequestError: Connection refused by server/i)
      ).toBeInTheDocument();
    });
  });

  // ─── 4. Regression Safety ─────────────────────────────────────────────────

  describe("4. Regression Safety for Queue Controls", () => {
    it("4.1. preserves active queue items and operator discard controls", () => {
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

      // Queue item exists in user view
      const queueItem = screen.getByTestId("sync-queue-item");
      expect(queueItem).toBeInTheDocument();
      expect(queueItem).toHaveTextContent(/chủ đề/i);

      // Open diagnostics and close
      openDiagnostics();
      expect(screen.getByTestId("sync-telemetry-panel")).toBeInTheDocument();
      openDiagnostics();

      // Queue item still intact
      expect(screen.getByTestId("sync-queue-item")).toBeInTheDocument();
    });
  });

  // ─── 5. Sync Health Status Banner in Diagnostics View ─────────────────────

  describe("5. Sync Health Status Banner in Diagnostics View", () => {
    it("5.1. renders unknown health banner when queue is empty and no telemetry exists", () => {
      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();
      openDiagnostics();

      const banner = screen.getByTestId("sync-health-banner");
      expect(banner).toBeInTheDocument();
      expect(within(banner).getByText(/chưa có dữ liệu/i)).toBeInTheDocument();
    });

    it("5.2. renders degraded health banner when queue contains failed items", () => {
      service.enqueue({
        id: "mut-f-health",
        entityType: "note",
        action: "save",
        entityId: "note-h-1",
        payload: { title: "Note" },
        clientTimestamp: "2026-08-28T12:00:00.000Z",
        retryCount: 1,
        status: "failed",
      });

      render(<SyncStatusBadge syncQueueService={service} />);
      openPopover();
      openDiagnostics();

      const banner = screen.getByTestId("sync-health-banner");
      expect(banner).toBeInTheDocument();
      expect(within(banner).getByText(/gián đoạn nhẹ/i)).toBeInTheDocument();
      expect(within(banner).getByText(/1 lỗi chờ thử lại/i)).toBeInTheDocument();
    });
  });
});
