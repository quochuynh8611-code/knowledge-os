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

describe("Slice 8: Drill-down Local Search & Empty Match State (TDD RED Stage)", () => {
  const mockDocsList = {
    total: 4,
    categories: { books: 4 },
    documents: [
      {
        id: "book-comp-1",
        title: "Khảo Luận Vi Diệu Pháp",
        category: "books",
        relativePath: "books/vi_dieu_phap.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-21T00:00:00.000Z",
      },
      {
        id: "book-comp-2",
        title: "Đại Niệm Xứ Thiền Định",
        category: "books",
        relativePath: "books/dai_niem_xu.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-22T00:00:00.000Z",
      },
      {
        id: "book-prog-1",
        title: "Kinh Thiền Cổ Truyền",
        category: "books",
        relativePath: "books/kinh_thien.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-prog-2",
        title: "Thiền Sư Pháp Trí",
        category: "books",
        relativePath: "books/thien_su.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-23T00:00:00.000Z",
      },
    ],
  };

  const mockArchive = {
    total: 4,
    documents: [
      // Completed group
      {
        id: "book-comp-1",
        fileName: "vi_dieu_phap.epub",
        fileFormat: "epub",
        storageRelPath: "epub/aa/vi_dieu_phap.epub",
        contentHash: "hash-comp-1",
        lastPosition: {
          cfi: "epubcfi(/6/2)",
          percentage: 100,
          totalReadingSeconds: 3600,
          isCompleted: true,
        },
        lastReadAt: "2026-10-18T10:00:00.000Z",
        readCount: 3,
      },
      {
        id: "book-comp-2",
        fileName: "dai_niem_xu.epub",
        fileFormat: "epub",
        storageRelPath: "epub/bb/dai_niem_xu.epub",
        contentHash: "hash-comp-2",
        lastPosition: {
          cfi: "epubcfi(/6/4)",
          percentage: 100,
          totalReadingSeconds: 1800,
          isCompleted: true,
        },
        lastReadAt: "2026-10-19T10:00:00.000Z",
        readCount: 2,
      },
      // In-progress group
      {
        id: "book-prog-1",
        fileName: "kinh_thien.epub",
        fileFormat: "epub",
        storageRelPath: "epub/cc/kinh_thien.epub",
        contentHash: "hash-prog-1",
        lastPosition: {
          cfi: "epubcfi(/6/6)",
          percentage: 45,
          totalReadingSeconds: 720,
          isCompleted: false,
        },
        lastReadAt: "2026-10-18T12:00:00.000Z",
        readCount: 1,
      },
      {
        id: "book-prog-2",
        fileName: "thien_su.epub",
        fileFormat: "epub",
        storageRelPath: "epub/dd/thien_su.epub",
        contentHash: "hash-prog-2",
        lastPosition: {
          cfi: "epubcfi(/6/8)",
          percentage: 30,
          totalReadingSeconds: 900,
          isCompleted: false,
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
          json: async () => mockArchive,
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
  // 8.1: Local Search Filtering
  // ──────────────────────────────────────────────────────────────────────────
  describe("8.1: Local search filtering", () => {
    it("should filter drilldown items by title case-insensitively within active group", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      // Open completed drilldown (2 items: Khảo Luận Vi Diệu Pháp, Đại Niệm Xứ Thiền Định)
      fireEvent.click(screen.getByTestId("summary-completed-count"));

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
        expect(screen.getByTestId("drilldown-item-book-comp-1")).toBeDefined();
        expect(screen.getByTestId("drilldown-item-book-comp-2")).toBeDefined();
      });

      // Local search input must exist
      const searchInput = screen.getByTestId("drilldown-search-input");
      expect(searchInput).toBeDefined();

      // Search for "vi diệu" -> should only match book-comp-1
      fireEvent.change(searchInput, { target: { value: "vi diệu" } });

      await waitFor(() => {
        expect(screen.getByTestId("drilldown-item-book-comp-1")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-comp-2")).toBeNull();
      });
    });

    it("should display all matching items when query matches multiple documents", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-in-progress-count")).toBeDefined();
      });

      // Open in-progress drilldown (2 items: Kinh Thiền Cổ Truyền, Thiền Sư Pháp Trí)
      fireEvent.click(screen.getByTestId("summary-in-progress-count"));

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      const searchInput = screen.getByTestId("drilldown-search-input");
      // Search for "thiền" -> matches both "Kinh Thiền Cổ Truyền" and "Thiền Sư Pháp Trí"
      fireEvent.change(searchInput, { target: { value: "THIỀN" } });

      await waitFor(() => {
        expect(screen.getByTestId("drilldown-item-book-prog-1")).toBeDefined();
        expect(screen.getByTestId("drilldown-item-book-prog-2")).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8.2: Search Reset Semantics
  // ──────────────────────────────────────────────────────────────────────────
  describe("8.2: Search reset semantics", () => {
    it("should reset local search input when switching groups", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      // Open completed and enter search
      fireEvent.click(screen.getByTestId("summary-completed-count"));
      const searchInput = await screen.findByTestId("drilldown-search-input");
      fireEvent.change(searchInput, { target: { value: "khảo luận" } });
      expect((searchInput as HTMLInputElement).value).toBe("khảo luận");

      // Switch to in-progress group
      fireEvent.click(screen.getByTestId("summary-in-progress-count"));

      await waitFor(() => {
        const nextInput = screen.getByTestId("drilldown-search-input") as HTMLInputElement;
        expect(nextInput.value).toBe("");
        // Both in-progress items should be visible
        expect(screen.getByTestId("drilldown-item-book-prog-1")).toBeDefined();
        expect(screen.getByTestId("drilldown-item-book-prog-2")).toBeDefined();
      });
    });

    it("should reset local search input when closing and reopening panel", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-completed-count"));
      const searchInput = await screen.findByTestId("drilldown-search-input");
      fireEvent.change(searchInput, { target: { value: "khảo luận" } });

      // Close panel
      fireEvent.click(screen.getByTestId("drilldown-close-btn"));
      await waitFor(() => {
        expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();
      });

      // Reopen panel
      fireEvent.click(screen.getByTestId("summary-completed-count"));
      await waitFor(() => {
        const reopenedInput = screen.getByTestId("drilldown-search-input") as HTMLInputElement;
        expect(reopenedInput.value).toBe("");
        expect(screen.getByTestId("drilldown-item-book-comp-1")).toBeDefined();
        expect(screen.getByTestId("drilldown-item-book-comp-2")).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8.3: Empty Match State
  // ──────────────────────────────────────────────────────────────────────────
  describe("8.3: Empty match state", () => {
    it("should render drilldown-search-empty-state when query yields 0 matches in non-empty group", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-completed-count"));
      const searchInput = await screen.findByTestId("drilldown-search-input");

      // Query that does not match any book
      fireEvent.change(searchInput, { target: { value: "từ khóa không tồn tại" } });

      await waitFor(() => {
        expect(screen.getByTestId("drilldown-search-empty-state")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-comp-1")).toBeNull();
        expect(screen.queryByTestId("drilldown-item-book-comp-2")).toBeNull();

        // Header must still be rendered
        expect(screen.getByTestId("drilldown-group-duration")).toBeDefined();
        expect(screen.getByTestId("drilldown-close-btn")).toBeDefined();
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8.4: Pipeline Isolation
  // ──────────────────────────────────────────────────────────────────────────
  describe("8.4: Pipeline isolation", () => {
    it("should preserve global directory list and not affect global searchTerm", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("summary-completed-count"));
      const drilldownInput = await screen.findByTestId("drilldown-search-input");

      // Type in local drilldown search
      fireEvent.change(drilldownInput, { target: { value: "vi diệu" } });

      await waitFor(() => {
        // Drilldown panel is filtered
        expect(screen.getByTestId("drilldown-item-book-comp-1")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-comp-2")).toBeNull();

        // Global directory list must still have ALL documents rendered
        expect(screen.getAllByText(/Khảo Luận Vi Diệu Pháp/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Đại Niệm Xứ Thiền Định/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Kinh Thiền Cổ Truyền/i).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Thiền Sư Pháp Trí/i).length).toBeGreaterThan(0);
      });
    });
  });
});
