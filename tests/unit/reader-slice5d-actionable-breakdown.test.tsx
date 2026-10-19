import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import {
  globalReadingPositionStore,
  calculateReadingAnalyticsBreakdown,
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

describe("Slice 5D — Reading Analytics Breakdown & Completion Rate (Reduced Scope RED Stage)", () => {
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

  describe("5D.1: Pure Helper calculateReadingAnalyticsBreakdown", () => {
    it("should calculate completionRate percentage and categorize document IDs", () => {
      expect(typeof calculateReadingAnalyticsBreakdown).toBe("function");
      const breakdown = calculateReadingAnalyticsBreakdown(mockArchiveWithAnalytics.documents);
      // 1 completed out of 3 total read docs = 33%
      expect(breakdown.completionRate).toBe(33);
      expect(breakdown.completedDocIds).toEqual(["book-2"]);
      expect(breakdown.inProgressDocIds).toEqual(["book-1", "adr-076"]);
      expect(breakdown.completedCount).toBe(1);
      expect(breakdown.inProgressCount).toBe(2);
      expect(breakdown.totalReadingSeconds).toBe(5040);
    });

    it("should return zero completionRate and empty arrays for empty or null input", () => {
      expect(typeof calculateReadingAnalyticsBreakdown).toBe("function");
      const breakdown = calculateReadingAnalyticsBreakdown([]);
      expect(breakdown.completionRate).toBe(0);
      expect(breakdown.completedDocIds).toEqual([]);
      expect(breakdown.inProgressDocIds).toEqual([]);
      expect(breakdown.totalReadingSeconds).toBe(0);
    });

    it("should sanitize negative, NaN, or malformed data gracefully", () => {
      expect(typeof calculateReadingAnalyticsBreakdown).toBe("function");
      const malformed = [
        { id: "bad-1", lastPosition: { totalReadingSeconds: -500, isCompleted: false } },
        { id: "bad-2", lastPosition: { totalReadingSeconds: NaN, isCompleted: true } },
        { id: "bad-3", lastPosition: null },
      ];
      const breakdown = calculateReadingAnalyticsBreakdown(malformed);
      expect(breakdown.completionRate).toBe(100); // 1 completed out of 1 valid read doc
      expect(breakdown.completedDocIds).toEqual(["bad-2"]);
      expect(breakdown.inProgressDocIds).toEqual([]);
    });
  });

  describe("5D.2: Completion Rate Surface UI Badge (Passive Breakdown)", () => {
    it("should render summary-completion-rate with formatted percentage", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        const rateBadge = screen.getByTestId("summary-completion-rate");
        expect(rateBadge).toBeDefined();
        expect(rateBadge.textContent).toMatch(/33%/i);
      });
    });

    it("should display 0% completion rate when no reading history exists", async () => {
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
        const rateBadge = screen.getByTestId("summary-completion-rate");
        expect(rateBadge).toBeDefined();
        expect(rateBadge.textContent).toMatch(/0%/i);
      });
    });
  });

  describe("5D.3: Preservation of Docs Explorer Global Pipeline", () => {
    it("should keep all library documents visible without altering global filtering pipeline", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-summary")).toBeDefined();
      });

      // Both books must remain rendered in directory, unaffected by summary analytics
      await waitFor(() => {
        expect(screen.getAllByText("Kinh Thiền Cổ Truyền").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Khảo Luận Vi Diệu Pháp").length).toBeGreaterThan(0);
      });
    });
  });
});
