import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div
      data-testid="react-reader-mock"
      data-location={props.location}
      data-url={typeof props.url === "string" ? props.url : "buffer"}
    >
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("Slice 3: Resume Experience (TDD Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wipe RAM store to guarantee test isolation
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Scenario 1: Reopen EPUB resumes exact CFI from persisted DB ──
  it("Scenario 1: reopen EPUB resumes exact cfi from persisted DB position", async () => {
    const savedCfi = "epubcfi(/6/14[chap07]!/4/2/10:48)";

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/book-resume-epub")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "book-resume-epub",
              fileName: "thien_dinh.epub",
              fileFormat: "epub",
              lastPosition: { cfi: savedCfi, percentage: 65 },
              lastReadAt: "2026-10-19T08:00:00.000Z",
            },
          }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs/raw")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="book-resume-epub"
        title="Thiền Định Căn Bản"
        format="epub"
        fileUrl="/api/docs/raw?path=thien_dinh.epub"
        onClose={vi.fn()}
      />
    );

    // Wait for hydration from DB to apply to ReactReader
    await waitFor(() => {
      const mockReader = screen.getByTestId("react-reader-mock");
      expect(mockReader).toHaveAttribute("data-location", savedCfi);
    });
  });

  // ── Scenario 2: Reopen PDF resumes exact page from raw numeric in-memory locator ──
  it("Scenario 2: reopen PDF resumes exact page number when locator in RAM is numeric string '42'", async () => {
    // Seed in-memory store with raw page string "42" (as set by onPageChanged in active session)
    globalReadingPositionStore.setPosition("doc-pdf-resume", "pdf", "42");

    // DB does not have position yet (offline or active unsaved session)
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-pdf-resume",
            fileName: "khoa_hoc_khong_gian.pdf",
            fileFormat: "pdf",
            lastPosition: null,
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="doc-pdf-resume"
        title="Khoa Học Không Gian"
        format="pdf"
        fileUrl="/api/docs/raw?path=khoa_hoc_khong_gian.pdf"
        onClose={vi.fn()}
      />
    );

    // Assert that the page input displays page 42, not default page 1
    const pageInput = screen.getByTestId("pdf-page-input") as HTMLInputElement;
    expect(pageInput.value).toBe("42");
  });

  // ── Scenario 3: Reopen Markdown resumes nearest heading anchor via scrollIntoView ──
  it("Scenario 3: reopen Markdown resumes nearest available heading anchor from in-memory state", async () => {
    const savedHeading = "kien-truc-tong-the";
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    // Seed in-memory store with heading locator from earlier read in current session
    globalReadingPositionStore.setPosition("doc-md-resume", "md", savedHeading);

    render(
      <UnifiedResearchReader
        documentId="doc-md-resume"
        title="ADR-076 Kiến Trúc"
        format="md"
        content={`# Tài Liệu\n\n## Giới Thiệu\nNội dung đầu.\n\n## Kiến Trúc Tổng Thể\nNội dung kiến trúc.`}
        onClose={vi.fn()}
      />
    );

    // Reader must pass initialHeadingId and trigger scrollIntoView on target heading element
    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  // ── Scenario 4: If no saved position exists, open from document start ──
  it("Scenario 4: if no saved position exists in DB or RAM, opens from document start", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "fresh-doc",
            fileName: "fresh_doc.pdf",
            fileFormat: "pdf",
            lastPosition: null,
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="fresh-doc"
        title="Tài Liệu Mới"
        format="pdf"
        fileUrl="/api/docs/raw?path=fresh_doc.pdf"
        onClose={vi.fn()}
      />
    );

    const pageInput = screen.getByTestId("pdf-page-input") as HTMLInputElement;
    expect(pageInput.value).toBe("1");
  });

  // ── Scenario 5: No cross-format locator leakage ──
  it("Scenario 5: avoids cross-format locator leakage when DB returns mismatched position selector", async () => {
    // A PDF document mistakenly has an EPUB CFI in lastPosition
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "pdf-with-leaked-cfi",
            fileName: "bao_cao.pdf",
            fileFormat: "pdf",
            lastPosition: { cfi: "epubcfi(/6/4[chap01]!/4/2)" }, // Leaked CFI into PDF
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="pdf-with-leaked-cfi"
        title="Báo Cáo Kỹ Thuật"
        format="pdf"
        fileUrl="/api/docs/raw?path=bao_cao.pdf"
        onClose={vi.fn()}
      />
    );

    // PDF reader must safely ignore the CFI and stay at page 1
    const pageInput = screen.getByTestId("pdf-page-input") as HTMLInputElement;
    expect(pageInput.value).toBe("1");
  });

  // ── Scenario 6: Recent read click opens same document and restores correct saved location ──
  it("Scenario 6: clicking Markdown card on recent-reads-shelf restores saved location in the opened reader", async () => {
    const savedHeading = "kien-truc-tong-the";
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    const mockArchivedList = {
      total: 1,
      documents: [
        {
          id: "arch-recent-card-md-001",
          fileName: "ADR-076.md",
          fileFormat: "md",
          sourceType: "docs",
          sourcePath: "docs/ADR-076.md",
          sourceKey: "archive:docs/ADR-076.md",
          storageRelPath: "docs/ADR-076.md",
          lastPosition: { headingId: savedHeading },
          lastReadAt: "2026-10-19T10:00:00.000Z",
          createdAt: "2026-10-18T00:00:00.000Z",
          updatedAt: "2026-10-19T10:00:00.000Z",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchivedList,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/archive/document/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ document: mockArchivedList.documents[0] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs/content")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "arch-recent-card-md-001",
            title: "ADR-076",
            relativePath: "docs/ADR-076.md",
            content: "# Tài Liệu\n\n## Kiến Trúc Tổng Thể\nNội dung chi tiết.",
          }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    // 1. Shelf displays recent document
    const shelf = await screen.findByTestId("recent-reads-shelf");
    const bookBtn = within(shelf).getByRole("button", { name: /Đang đọc ADR-076/i });
    expect(bookBtn).toBeInTheDocument();

    // 2. Click the recent reads button to reopen the reader
    fireEvent.click(bookBtn);

    // 3. Reader must open and restore the saved heading via scrollIntoView
    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1500 });
  });

  // ── Scenario 7: Late DB response does not overwrite newer in-memory RAM position ──
  it("Scenario 7: late DB response does not overwrite newer in-memory RAM position", async () => {
    let resolveLateFetch: (value: any) => void;
    const lateFetchPromise = new Promise((resolve) => {
      resolveLateFetch = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-late-db")) {
        return lateFetchPromise;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-late-db"
        title="Tài Liệu Đang Đọc"
        format="md"
        content="# Tiêu Đề\n\n## Phần Một\nNội dung."
        onClose={vi.fn()}
      />
    );

    // User navigates to a new heading while DB fetch is in-flight
    globalReadingPositionStore.setPosition("doc-late-db", "md", "phan-moi-nhat");

    // DB finally responds with stale position
    resolveLateFetch!({
      ok: true,
      json: async () => ({
        document: {
          id: "doc-late-db",
          lastPosition: { headingId: "phan-cu-trong-db" },
        },
      }),
      headers: { get: () => "application/json" },
    });

    // Wait a tick for async resolution
    await new Promise((r) => setTimeout(r, 50));

    // In-memory store must maintain the newer user navigation position
    expect(globalReadingPositionStore.getPosition("doc-late-db", "md")).toBe("phan-moi-nhat");
  });

  // ── Scenario 8: Reopening markdown twice in same session keeps newest heading ──
  it("Scenario 8: reopening markdown twice in same session keeps newest heading", async () => {
    // 1. First read session: user navigates to heading-step-1
    globalReadingPositionStore.setPosition("doc-multi-read", "md", "heading-step-1");

    // 2. User navigates further to heading-step-2
    globalReadingPositionStore.setPosition("doc-multi-read", "md", "heading-step-2");

    // 3. User reopens document
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    const { unmount } = render(
      <UnifiedResearchReader
        documentId="doc-multi-read"
        title="Tài Liệu Multi Session"
        format="md"
        content={`# A\n\n## Heading Step 1\n\n## Heading Step 2\n\nNội dung.`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    });

    // 4. User navigates to heading-step-3 in current reader and closes
    globalReadingPositionStore.setPosition("doc-multi-read", "md", "heading-step-3");
    unmount();

    // 5. User opens for the second time
    const secondScrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = secondScrollSpy;

    render(
      <UnifiedResearchReader
        documentId="doc-multi-read"
        title="Tài Liệu Multi Session"
        format="md"
        content={`# A\n\n## Heading Step 1\n\n## Heading Step 2\n\n## Heading Step 3\n\nNội dung.`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(secondScrollSpy).toHaveBeenCalled();
    });

    expect(globalReadingPositionStore.getPosition("doc-multi-read", "md")).toBe("heading-step-3");
  });

  // ── Scenario 9: Missing headingId in DOM falls back safely without unhandled error or infinite retries ──
  it("Scenario 9: missing headingId in DOM falls back safely without infinite loops or errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Saved position points to a deleted or non-existent heading anchor
    globalReadingPositionStore.setPosition("doc-missing-heading", "md", "non-existent-anchor-404");

    render(
      <UnifiedResearchReader
        documentId="doc-missing-heading"
        title="Tài Liệu Thiếu Anchor"
        format="md"
        content={`# Tiêu Đề Chính\n\n## Mục Thực Tế\n\nNội dung có thực.`}
        onClose={vi.fn()}
      />
    );

    // Viewport should render gracefully without crashing
    const selectableArea = await screen.findByTestId("markdown-selectable-area");
    expect(selectableArea).toBeInTheDocument();
    expect(screen.getByText("Mục Thực Tế")).toBeInTheDocument();

    // No React rendering errors
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
