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

describe("DocsExplorerView Recent Reads Shelf - Analytics & Completion Badges (Slice 5B Red Stage)", () => {
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
          totalReadingSeconds: 720, // 12 minutes
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
          totalReadingSeconds: 4320, // 1 hour 12 minutes
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
          percentage: 10,
          // no totalReadingSeconds, not completed
        },
        lastReadAt: "2026-10-18T08:00:00.000Z",
        readCount: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Wipe RAM singleton
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }

    // Default hermetic fetch mock
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveWithAnalytics,
        });
      }
      if (urlStr.includes("/api/docs/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsList,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  it("5B.1: should render reading duration badge on recent reads shelf when totalReadingSeconds > 0", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-reads-shelf")).toBeDefined();
    });

    // book-1 has totalReadingSeconds: 720 (12m -> "12 phút")
    await waitFor(() => {
      const durationBadge = screen.getByTestId("recent-read-duration-book-1");
      expect(durationBadge).toBeDefined();
      expect(durationBadge.textContent).toMatch(/12\s*phút/i);
    });
  });

  it("5B.2: should render completion badge on recent reads shelf when isCompleted is true", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-reads-shelf")).toBeDefined();
    });

    // book-2 has isCompleted: true
    await waitFor(() => {
      const completionBadge = screen.getByTestId("recent-read-completion-book-2");
      expect(completionBadge).toBeDefined();
    });
  });

  it("5B.3: should render both duration and completion badges when document has reading time and is completed", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-reads-shelf")).toBeDefined();
    });

    // book-2 has both totalReadingSeconds: 4320 (1g 12p) and isCompleted: true
    await waitFor(() => {
      const durationBadge = screen.getByTestId("recent-read-duration-book-2");
      const completionBadge = screen.getByTestId("recent-read-completion-book-2");
      expect(durationBadge).toBeDefined();
      expect(durationBadge.textContent).toMatch(/1g\s*12p/i);
      expect(completionBadge).toBeDefined();
    });
  });

  it("5B.4: should gracefully omit badges when document has no reading duration and is not completed", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-reads-shelf")).toBeDefined();
    });

    // adr-076 has no totalReadingSeconds and isCompleted is undefined
    await waitFor(() => {
      // Find within shelf to ensure adr-076 is either rendered or checked
      const shelf = screen.getByTestId("recent-reads-shelf");
      expect(within(shelf).queryByTestId("recent-read-duration-adr-076")).toBeNull();
      expect(within(shelf).queryByTestId("recent-read-completion-adr-076")).toBeNull();
    });
  });

  it("5B.5: should preserve card click and remove interactions with analytics badges rendered", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-reads-shelf")).toBeDefined();
    });

    // Verify remove button exists and functions
    const removeBtn = await screen.findByTestId("remove-recent-read-book-1");
    expect(removeBtn).toBeDefined();

    // Verify clicking remove removes the book from shelf
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("remove-recent-read-book-1")).toBeNull();
    });
  });
});
