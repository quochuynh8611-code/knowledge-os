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

describe("Slice 9: Drill-down Keyboard & Accessibility Polish (TDD RED Stage)", () => {
  const mockDocsList = {
    total: 3,
    categories: { books: 3 },
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
    ],
  };

  const mockArchive = {
    total: 3,
    documents: [
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
  // 9.1: Auto-focus on Open
  // ──────────────────────────────────────────────────────────────────────────
  describe("9.1: Auto-focus search input on panel open", () => {
    it("should automatically focus drilldown-search-input when panel opens", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      const completedBadge = screen.getByTestId("summary-completed-count");
      fireEvent.click(completedBadge);

      await waitFor(() => {
        const searchInput = screen.getByTestId("drilldown-search-input");
        expect(searchInput).toBeDefined();
        expect(document.activeElement).toBe(searchInput);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9.2: Escape Key Closes and Restores Trigger Focus
  // ──────────────────────────────────────────────────────────────────────────
  describe("9.2: Escape key closes and restores trigger focus", () => {
    it("should close panel on Escape and restore focus to completed badge", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-completed-count")).toBeDefined();
      });

      const completedBadge = screen.getByTestId("summary-completed-count");
      completedBadge.focus();
      fireEvent.click(completedBadge);

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      // Press Escape inside drilldown panel
      const panel = screen.getByTestId("reading-analytics-drilldown");
      fireEvent.keyDown(panel, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();
        expect(document.activeElement).toBe(completedBadge);
      });
    });

    it("should close panel on Escape and restore focus to in-progress badge", async () => {
      render(
        <DataProvider>
          <DocsExplorerView mode="epub-only" />
        </DataProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("summary-in-progress-count")).toBeDefined();
      });

      const inProgressBadge = screen.getByTestId("summary-in-progress-count");
      inProgressBadge.focus();
      fireEvent.click(inProgressBadge);

      await waitFor(() => {
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      // Press Escape inside drilldown search input
      const searchInput = screen.getByTestId("drilldown-search-input");
      fireEvent.keyDown(searchInput, { key: "Escape", code: "Escape" });

      await waitFor(() => {
        expect(screen.queryByTestId("reading-analytics-drilldown")).toBeNull();
        expect(document.activeElement).toBe(inProgressBadge);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9.3: Search Input Semantics
  // ──────────────────────────────────────────────────────────────────────────
  describe("9.3: Search input semantics", () => {
    it("should expose accessible name for drilldown-search-input", async () => {
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
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
        expect(screen.getByTestId("drilldown-search-input")).toBeDefined();
      });

      const panel = screen.getByTestId("reading-analytics-drilldown");
      // Must be retrievable as a textbox with an accessible name (not just placeholder)
      const accessibleSearchInput = within(panel).getByRole("textbox", {
        name: /lọc trong nhóm|lọc tài liệu|tìm kiếm/i,
      });
      expect(accessibleSearchInput).toBeDefined();
      expect(accessibleSearchInput).toBe(screen.getByTestId("drilldown-search-input"));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9.4: Panel & Dialog Semantics
  // ──────────────────────────────────────────────────────────────────────────
  describe("9.4: Panel and dialog semantics", () => {
    it("should have role=dialog and aria-labelledby on drilldown panel", async () => {
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
        expect(screen.getByTestId("reading-analytics-drilldown")).toBeDefined();
      });

      const panel = screen.getByTestId("reading-analytics-drilldown");
      expect(panel.getAttribute("role")).toBe("dialog");
      expect(panel.getAttribute("aria-modal")).toBe("false");

      const labelledBy = panel.getAttribute("aria-labelledby");
      expect(labelledBy).toBeTruthy();

      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).not.toBeNull();
      expect(titleElement?.textContent).toMatch(/tài liệu đã hoàn thành/i);
    });

    it("should have descriptive accessible name on close button", async () => {
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
        expect(screen.getByTestId("drilldown-close-btn")).toBeDefined();
      });

      const panel = screen.getByTestId("reading-analytics-drilldown");
      const closeBtn = within(panel).getByRole("button", {
        name: /đóng chi tiết nhóm đọc|đóng bảng chi tiết/i,
      });
      expect(closeBtn).toBeDefined();
      expect(closeBtn).toBe(screen.getByTestId("drilldown-close-btn"));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 9.5: Preservation of Existing Behavior
  // ──────────────────────────────────────────────────────────────────────────
  describe("9.5: Preservation of existing behavior", () => {
    it("should preserve ordering, local search, and global directory pipeline", async () => {
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
        expect(screen.getByTestId("drilldown-group-duration")).toBeDefined();
        expect(screen.getByTestId("drilldown-search-input")).toBeDefined();
      });

      // Verify recency ordering: book-comp-2 (lastReadAt: Oct 19) before book-comp-1 (lastReadAt: Oct 18)
      const items = screen.getAllByTestId(/^drilldown-item-/);
      expect(items[0].getAttribute("data-testid")).toBe("drilldown-item-book-comp-2");
      expect(items[1].getAttribute("data-testid")).toBe("drilldown-item-book-comp-1");

      // Verify local search filtering
      const searchInput = screen.getByTestId("drilldown-search-input");
      fireEvent.change(searchInput, { target: { value: "đại niệm" } });

      await waitFor(() => {
        expect(screen.getByTestId("drilldown-item-book-comp-2")).toBeDefined();
        expect(screen.queryByTestId("drilldown-item-book-comp-1")).toBeNull();
      });

      // Verify global directory list remains unaffected
      expect(screen.getAllByText(/Khảo Luận Vi Diệu Pháp/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Đại Niệm Xứ Thiền Định/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Kinh Thiền Cổ Truyền/i).length).toBeGreaterThan(0);
    });
  });
});
