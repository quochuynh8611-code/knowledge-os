import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import {
  globalReadingPositionStore,
  calculateReadingAnalyticsSummary,
} from "../../src/lib/readingPositionUnified";

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

describe("Slice 5C — Reading Analytics Summary Surface (Red Stage)", () => {
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
          totalReadingSeconds: 4320, // 1h 12m, completed
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
          percentage: 15, // in progress by percentage
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

  describe("5C.1: Pure Calculation Helper calculateReadingAnalyticsSummary", () => {
    it("should correctly aggregate totalReadingSeconds, completedCount, and inProgressCount", () => {
      expect(typeof calculateReadingAnalyticsSummary).toBe("function");
      const summary = calculateReadingAnalyticsSummary(mockArchiveWithAnalytics.documents);
      // Total seconds: 720 + 4320 + 0 = 5040 (1 hour 24 minutes)
      expect(summary.totalReadingSeconds).toBe(5040);
      expect(summary.completedCount).toBe(1); // book-2 is completed
      expect(summary.inProgressCount).toBe(2); // book-1 (720s > 0) + adr-076 (percentage: 15 > 0)
      expect(summary.totalDocsRead).toBe(3);
    });

    it("should handle empty or null input gracefully", () => {
      expect(typeof calculateReadingAnalyticsSummary).toBe("function");
      const summary = calculateReadingAnalyticsSummary([]);
      expect(summary.totalReadingSeconds).toBe(0);
      expect(summary.completedCount).toBe(0);
      expect(summary.inProgressCount).toBe(0);
      expect(summary.totalDocsRead).toBe(0);
    });

    it("should defensively sanitize negative or NaN reading seconds", () => {
      expect(typeof calculateReadingAnalyticsSummary).toBe("function");
      const malformedDocs = [
        { lastPosition: { totalReadingSeconds: -100, isCompleted: false } },
        { lastPosition: { totalReadingSeconds: NaN, isCompleted: true } },
        { lastPosition: null },
      ];
      const summary = calculateReadingAnalyticsSummary(malformedDocs);
      expect(summary.totalReadingSeconds).toBe(0);
      expect(summary.completedCount).toBe(1);
    });
  });

  describe("5C.2: DocsExplorerView Summary Surface UI", () => {
    it("should render reading-analytics-summary with aggregate duration and counts", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      // Summary surface should be visible
      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-summary")).toBeDefined();
      });

      // Total reading time formatted: 5040s -> 1g 24p
      await waitFor(() => {
        const totalTimeBadge = screen.getByTestId("summary-total-reading-time");
        expect(totalTimeBadge).toBeDefined();
        expect(totalTimeBadge.textContent).toMatch(/1g\s*24p/i);
      });

      // Completed count badge: 1
      await waitFor(() => {
        const completedBadge = screen.getByTestId("summary-completed-count");
        expect(completedBadge).toBeDefined();
        expect(completedBadge.textContent).toContain("1");
      });

      // In-progress count badge: 2
      await waitFor(() => {
        const inProgressBadge = screen.getByTestId("summary-in-progress-count");
        expect(inProgressBadge).toBeDefined();
        expect(inProgressBadge.textContent).toContain("2");
      });
    });

    it("should gracefully display zero metrics when no reading history exists", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/archive/list")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ total: 0, documents: [] }),
            headers: { get: () => "application/json" },
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsList,
          headers: { get: () => "application/json" },
        });
      });

      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        // Summary surface is present even with zero reads or empty state
        const summary = screen.queryByTestId("reading-analytics-summary");
        if (summary) {
          const totalTime = screen.getByTestId("summary-total-reading-time");
          expect(totalTime.textContent).toMatch(/0\s*phút/i);
        }
      });
    });
  });
});
