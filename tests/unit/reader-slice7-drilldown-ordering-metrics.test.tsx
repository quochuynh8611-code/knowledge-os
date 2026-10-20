import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

describe("Slice 7: Drill-down Deterministic Ordering & Group Metrics Header (TDD RED Stage)", () => {
  const mockDocsList = {
    total: 5,
    categories: { books: 5 },
    documents: [
      {
        id: "book-prog-oldest",
        title: "Kinh Cổ Xưa (Đọc Ngày 17)",
        category: "books",
        relativePath: "books/kinh_co.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-prog-newest",
        title: "Kinh Mới Nhất (Đọc Ngày 19)",
        category: "books",
        relativePath: "books/kinh_moi.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-prog-middle",
        title: "Kinh Giữa Kỳ (Đọc Ngày 18)",
        category: "books",
        relativePath: "books/kinh_giua.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-comp-1",
        title: "Khảo Luận Đã Xong 1",
        category: "books",
        relativePath: "books/khao_luan_1.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-21T00:00:00.000Z",
      },
      {
        id: "book-comp-2",
        title: "Khảo Luận Đã Xong 2",
        category: "books",
        relativePath: "books/khao_luan_2.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-21T00:00:00.000Z",
      },
    ],
  };

  const mockArchiveWithOrdering = {
    total: 5,
    documents: [
      // Deliberately unsorted in raw array: oldest first, newest second, middle third
      {
        id: "book-prog-oldest",
        fileName: "kinh_co.epub",
        fileFormat: "epub",
        storageRelPath: "epub/aa/kinh_co.epub",
        contentHash: "hash-oldest",
        lastPosition: {
          cfi: "epubcfi(/6/2)",
          percentage: 20,
          totalReadingSeconds: 600, // 10 minutes
          isCompleted: false,
        },
        lastReadAt: "2026-10-17T10:00:00.000Z",
        readCount: 1,
      },
      {
        id: "book-prog-newest",
        fileName: "kinh_moi.epub",
        fileFormat: "epub",
        storageRelPath: "epub/bb/kinh_moi.epub",
        contentHash: "hash-newest",
        lastPosition: {
          cfi: "epubcfi(/6/4)",
          percentage: 60,
          totalReadingSeconds: 1200, // 20 minutes
          isCompleted: false,
        },
        lastReadAt: "2026-10-19T10:00:00.000Z",
        readCount: 3,
      },
      {
        id: "book-prog-middle",
        fileName: "kinh_giua.epub",
        fileFormat: "epub",
        storageRelPath: "epub/cc/kinh_giua.epub",
        contentHash: "hash-middle",
        lastPosition: {
          cfi: "epubcfi(/6/6)",
          percentage: 40,
          totalReadingSeconds: 300, // 5 minutes
          isCompleted: false,
        },
        lastReadAt: "2026-10-18T10:00:00.000Z",
        readCount: 2,
      },
      // Completed documents
      {
        id: "book-comp-1",
        fileName: "khao_luan_1.epub",
        fileFormat: "epub",
        storageRelPath: "epub/dd/khao_luan_1.epub",
        contentHash: "hash-comp-1",
        lastPosition: {
          cfi: "epubcfi(/6/8)",
          percentage: 100,
          totalReadingSeconds: 3600, // 60 minutes
          isCompleted: true,
        },
        lastReadAt: "2026-10-18T12:00:00.000Z",
        readCount: 4,
      },
      {
        id: "book-comp-2",
        fileName: "khao_luan_2.epub",
        fileFormat: "epub",
        storageRelPath: "epub/ee/khao_luan_2.epub",
        contentHash: "hash-comp-2",
        lastPosition: {
          cfi: "epubcfi(/6/10)",
          percentage: 100,
          totalReadingSeconds: 720, // 12 minutes
          isCompleted: true,
        },
        lastReadAt: "2026-10-19T12:00:00.000Z",
        readCount: 2,
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
          json: async () => mockArchiveWithOrdering,
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
  // 7.1: Deterministic Recency Ordering
  // ──────────────────────────────────────────────────────────────────────────
  describe("7.1: Deterministic Recency Ordering", () => {
    it("should stably sort in-progress documents by recency (lastReadAt descending)", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-in-progress-count")).toBeDefined();
      });

      // Open in-progress drilldown
      fireEvent.click(screen.getByTestId("summary-in-progress-count"));

      await waitFor(() => {
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();

        // Query all drilldown items inside panel
        const items = within(drilldown).getAllByTestId(/^drilldown-item-/);
        expect(items.length).toBe(3);

        // Expected recency order:
        // 1st: book-prog-newest (2026-10-19)
        // 2nd: book-prog-middle (2026-10-18)
        // 3rd: book-prog-oldest (2026-10-17)
        expect(items[0]).toHaveAttribute("data-testid", "drilldown-item-book-prog-newest");
        expect(items[1]).toHaveAttribute("data-testid", "drilldown-item-book-prog-middle");
        expect(items[2]).toHaveAttribute("data-testid", "drilldown-item-book-prog-oldest");
      });
    });

    it("should stably sort completed documents by recency (lastReadAt descending)", async () => {
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
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();

        const items = within(drilldown).getAllByTestId(/^drilldown-item-/);
        expect(items.length).toBe(2);

        // 1st: book-comp-2 (2026-10-19)
        // 2nd: book-comp-1 (2026-10-18)
        expect(items[0]).toHaveAttribute("data-testid", "drilldown-item-book-comp-2");
        expect(items[1]).toHaveAttribute("data-testid", "drilldown-item-book-comp-1");
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7.2: Group Aggregate Metric Header
  // ──────────────────────────────────────────────────────────────────────────
  describe("7.2: Group Aggregate Metric Header", () => {
    it("should render total reading duration of active in-progress group on panel header", async () => {
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
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();

        // In-progress total seconds: 600 + 1200 + 300 = 2100s -> 35 phút
        const groupDuration = within(drilldown).getByTestId("drilldown-group-duration");
        expect(groupDuration).toBeDefined();
        expect(groupDuration.textContent).toMatch(/35\s*phút/i);
      });
    });

    it("should render total reading duration of active completed group on panel header", async () => {
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
        const drilldown = screen.getByTestId("reading-analytics-drilldown");
        expect(drilldown).toBeDefined();

        // Completed total seconds: 3600 + 720 = 4320s -> 1g 12p
        const groupDuration = within(drilldown).getByTestId("drilldown-group-duration");
        expect(groupDuration).toBeDefined();
        expect(groupDuration.textContent).toMatch(/1g\s*12p/i);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7.3: Pipeline Isolation & Preservation
  // ──────────────────────────────────────────────────────────────────────────
  describe("7.3: Pipeline Isolation & Preservation", () => {
    it("should not affect directory list items count or ordering", async () => {
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
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      // Verify all 5 books remain in explorer directory
      await waitFor(() => {
        expect(screen.getAllByText(/Kinh Cổ Xưa/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kinh Mới Nhất/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kinh Giữa Kỳ/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Khảo Luận Đã Xong 1/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Khảo Luận Đã Xong 2/i).length).toBeGreaterThan(0);
      });
    });
  });
});
