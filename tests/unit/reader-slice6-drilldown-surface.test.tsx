import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div data-testid="react-reader-mock" data-location={props.location}>
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("Slice 6: Reading Analytics Local Drill-down Surface (TDD RED Stage)", () => {
  const mockDocsList = {
    total: 3,
    categories: { books: 2, adr: 1 },
    documents: [
      {
        id: "book-1",
        title: "Kinh Thiền Cổ Truyền",
        category: "books",
        relativePath: "books/kinh_thien.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-2",
        title: "Khảo Luận Vi Diệu Pháp",
        category: "books",
        relativePath: "books/vi_dieu_phap.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-21T00:00:00.000Z",
      },
      {
        id: "adr-076",
        title: "ADR-076 Quyết định Kiến Trúc",
        category: "adr",
        relativePath: "adr/ADR-076.md",
        status: "ACCEPTED",
        sizeBytes: 5120,
        lastModified: "2026-09-22T00:00:00.000Z",
      },
    ],
  };

  const mockArchiveWithAnalytics = {
    total: 3,
    documents: [
      {
        id: "book-1",
        fileName: "kinh_thien.epub",
        fileFormat: "epub",
        storageRelPath: "epub/aa/kinh_thien.epub",
        contentHash: "hash-book-1",
        lastPosition: {
          cfi: "epubcfi(/6/8!/4/2:0)",
          percentage: 45,
          totalReadingSeconds: 720, // 12 minutes, in progress
          isCompleted: false,
        },
        lastReadAt: "2026-10-18T10:00:00.000Z",
        readCount: 3,
      },
      {
        id: "book-2",
        fileName: "vi_dieu_phap.epub",
        fileFormat: "epub",
        storageRelPath: "epub/bb/vi_dieu_phap.epub",
        contentHash: "hash-book-2",
        lastPosition: {
          cfi: "epubcfi(/6/12!/4/2:0)",
          percentage: 100,
          totalReadingSeconds: 4320, // completed
          isCompleted: true,
          completedAt: "2026-10-18T12:00:00.000Z",
        },
        lastReadAt: "2026-10-18T11:00:00.000Z",
        readCount: 5,
      },
      {
        id: "adr-076",
        fileName: "ADR-076.md",
        fileFormat: "md",
        storageRelPath: "md/cc/ADR-076.md",
        contentHash: "hash-adr-076",
        lastPosition: {
          headingId: "quyet-dinh",
          percentage: 15,
          totalReadingSeconds: 0,
          isCompleted: false,
        },
        lastReadAt: "2026-10-18T08:00:00.000Z",
        readCount: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveWithAnalytics,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsList,
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
        headers: { get: () => "application/json" },
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6.1: Drill-down Toggle & Active State
  // ──────────────────────────────────────────────────────────────────────────
  describe("6.1: Drill-down Toggle & Active State", () => {
    it("should toggle drill-down panel when clicking completed count badge", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      // Panel should not be open initially
      expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();

      // Click completed count badge
      fireEvent.click(screen.getByTestId("summary-completed-count"));

      await waitFor(() => {
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();
        expect(drilldown.textContent).toMatch(/đã hoàn thành|đã xong/i);
      });

      // Click again should toggle it closed
      fireEvent.click(screen.getByTestId("summary-completed-count"));
      await waitFor(() => {
        expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();
      });
    });

    it("should switch group when clicking in-progress count badge and close via dismiss button", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-in-progress-count")).toBeDefined();
      });

      // Click in-progress count badge
      fireEvent.click(screen.getByTestId("summary-in-progress-count"));

      await waitFor(() => {
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();
        expect(drilldown.textContent).toMatch(/đang đọc/i);
      });

      // Close using close button
      const closeBtn = screen.getByTestId("drilldown-close-btn");
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6.2: Drill-down Content & Document Listing
  // ──────────────────────────────────────────────────────────────────────────
  describe("6.2: Drill-down Content & Document Listing", () => {
    it("should list only completed documents when completed group is active", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-completed-count"));

      await waitFor(() => {
        // book-2 is completed, book-1 is in-progress
        expect(screen.getByTestId("drilldown-item-book-2")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-1")).toBeNull();
      });
    });

    it("should list in-progress documents when in-progress group is active", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-in-progress-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-in-progress-count"));

      await waitFor(() => {
        // book-1 and adr-076 are in-progress
        expect(screen.getByTestId("drilldown-item-book-1")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-2")).toBeNull();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6.3: Direct Action Affordance (Opening Reader)
  // ──────────────────────────────────────────────────────────────────────────
  describe("6.3: Direct Action Affordance", () => {
    it("should trigger document open into reader when clicking a drilldown item", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-completed-count"));

      await waitFor(() => {
        expect(screen.getByTestId("drilldown-item-book-2")).toBeDefined();
      });

      // Click on the drilldown item to open reader
      fireEvent.click(screen.getByTestId("drilldown-item-book-2"));

      await waitFor(() => {
        // Reader container should become active with book-2
        expect(screen.getByTestId("react-reader-mock")).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6.4: Blast Radius & Isolation Guard
  // ──────────────────────────────────────────────────────────────────────────
  describe("6.4: Preservation of Global Explorer Pipeline", () => {
    it("should not alter global directory filtering pipeline when drilldown is opened", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      // Open completed drilldown
      fireEvent.click(screen.getByTestId("summary-completed-count"));

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      // Both books must remain rendered in the directory, unaffected by drilldown panel
      await waitFor(() => {
        expect(screen.getAllByText("Kinh Thiền Cổ Truyền").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Khảo Luận Vi Diệu Pháp").length).toBeGreaterThan(0);
      });
    });
  });
});
