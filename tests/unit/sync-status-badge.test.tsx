import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SyncQueueService } from "../../src/services/syncQueue";
import { SyncStatusBadge } from "../../src/components/ui/SyncStatusBadge";
import { Navbar } from "../../src/components/layout/Navbar";
import { DataProvider } from "../../src/context/DataContext";
import { NavigationProvider } from "../../src/context/NavigationContext";

describe("Phase P2.5 — Sync Status Badge & Navbar UI Integration", () => {
  const STORAGE_KEY = "phat_hoc_huyen_hoc_sync_badge_test";
  let syncQueueService: SyncQueueService;

  beforeEach(() => {
    localStorage.clear();
    syncQueueService = new SyncQueueService(STORAGE_KEY);
    // Default to online
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. SyncStatusBadge Standalone States ──────────────────────────────────

  describe("1. SyncStatusBadge Standalone States", () => {
    it("1.1. shows synced state when online and no pending/failed mutations", () => {
      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      const badge = screen.getByTestId("sync-status-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/đã đồng bộ/i);
    });

    it("1.2. shows offline state with pending count when offline", () => {
      Object.defineProperty(navigator, "onLine", {
        configurable: true,
        value: false,
      });

      syncQueueService.enqueue({
        id: "mut-1",
        entityType: "note",
        action: "save",
        entityId: "note-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      syncQueueService.enqueue({
        id: "mut-2",
        entityType: "topic",
        action: "save",
        entityId: "topic-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      const badge = screen.getByTestId("sync-status-badge");
      expect(badge).toHaveTextContent(/ngoại tuyến/i);
      expect(badge).toHaveTextContent("2");
    });

    it("1.3. shows flushing state with spinner when isFlushing is true", () => {
      // Mock flushQueue to keep isFlushing true or spy on isFlushing
      vi.spyOn(syncQueueService, "getIsFlushing").mockReturnValue(true);

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      const badge = screen.getByTestId("sync-status-badge");
      expect(badge).toHaveTextContent(/đang đồng bộ/i);
    });

    it("1.4. shows retry button when failedCount > 0 and calls flush on click", async () => {
      syncQueueService.enqueue({
        id: "mut-fail-1",
        entityType: "resource",
        action: "save",
        entityId: "res-1",
        clientTimestamp: new Date().toISOString(),
        retryCount: 1,
        status: "failed",
        lastError: "Network timeout",
      });

      const flushSpy = vi.spyOn(syncQueueService, "flushQueue").mockResolvedValue({
        syncedCount: 1,
        failedCount: 0,
      });

      render(<SyncStatusBadge syncQueueService={syncQueueService} />);

      const retryBtn = screen.getByRole("button", { name: /thử lại/i });
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(flushSpy).toHaveBeenCalledOnce();
    });
  });

  // ─── 2. Navbar Integration ────────────────────────────────────────────────

  describe("2. Navbar Integration", () => {
    it("2.1. renders SyncStatusBadge inside Navbar component", () => {
      render(
        <NavigationProvider>
          <DataProvider>
            <Navbar />
          </DataProvider>
        </NavigationProvider>
      );

      const badge = screen.getByTestId("sync-status-badge");
      expect(badge).toBeInTheDocument();
    });
  });
});
