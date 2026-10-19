import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MarkdownReaderAdapter } from "../../src/components/reader/adapters/MarkdownReaderAdapter";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";
import express from "express";
import request from "supertest";
import { createArchiveRouter } from "../../src/server/routes/archiveRoutes";

describe("Slice 4: Advanced History, Exact Resume & Analytics (TDD Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4A: Exact Markdown Resume (Scroll Tracking & Normalized Position)
  // ──────────────────────────────────────────────────────────────────────────
  it("4A.1: MarkdownReaderAdapter emits onPositionChange with normalized scroll percentage on scroll", async () => {
    const onPositionChangeSpy = vi.fn();

    const markdownContent = `
# Chương 1: Cơ Sở Kiến Trúc
Đoạn văn mở đầu rất dài dòng một...
Đoạn văn mở đầu rất dài dòng hai...

## Mục 1.1: Nguyên Lý Thiết Kế
Nguyên lý một chi tiết...
Nguyên lý hai chi tiết...

## Mục 1.2: Triển Khai
Chi tiết triển khai...
`;

    render(
      <MarkdownReaderAdapter
        documentId="doc-scroll-track"
        content={markdownContent}
        onPositionChange={onPositionChangeSpy}
      />
    );

    const viewport = screen.getByTestId("markdown-selectable-area");

    // Mock scroll metrics on the viewport element
    Object.defineProperty(viewport, "scrollTop", { value: 350, writable: true });
    Object.defineProperty(viewport, "scrollHeight", { value: 1000, writable: true });
    Object.defineProperty(viewport, "clientHeight", { value: 300, writable: true });

    // Trigger scroll event
    fireEvent.scroll(viewport);

    // Expectation: onPositionChange must be called with semantic anchor AND normalized position details
    // Current behavior: MarkdownReaderAdapter has no scroll listener, so onPositionChange is NEVER called on scroll.
    await waitFor(() => {
      expect(onPositionChangeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/muc-1-1-nguyen-ly-thiet-ke/)
      );
    }, { timeout: 800 });
  });

  it("4A.2: Exact resume restores both heading anchor and fine scroll offset", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    // Persisted position contains both semantic anchor and scroll percentage
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-exact-resume",
            fileFormat: "md",
            lastPosition: {
              headingId: "muc-1-1-nguyen-ly-thiet-ke",
              scrollPercentage: 45,
            },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="doc-exact-resume"
        title="Tài Liệu Chi Tiết"
        format="md"
        content={`# Chương 1\n\n## Mục 1.1: Nguyên Lý Thiết Kế\nNội dung dài...\n\n## Mục 1.2: Triển Khai\nNội dung tiếp...`}
        onClose={vi.fn()}
      />
    );

    // Expectation: Viewport container should be scrolled to fine offset or percentage
    // Current behavior: UnifiedResearchReader only restores headingId without fine scrollTo offset.
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: expect.any(Number) })
      );
    }, { timeout: 1000 });
  });

  it("4A.3: Heading renamed or deleted falls back safely to fine scroll percentage", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    // Persisted position points to a heading that no longer exists in current markdown
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-fallback-resume",
            fileFormat: "md",
            lastPosition: {
              headingId: "muc-da-bi-xoa",
              scrollPercentage: 65,
            },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="doc-fallback-resume"
        title="Tài Liệu Đã Đổi Tên Mục"
        format="md"
        content={`# Chương Khác\n\n## Mục Mới Được Đổi Tên\nNội dung hoàn toàn mới...`}
        onClose={vi.fn()}
      />
    );

    // Viewport must fall back to fine scroll offset without throwing any error
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: expect.any(Number) })
      );
    }, { timeout: 1000 });
  });

  it("4A.4: Content length changes or viewport resizes safely clamps scroll percentage within 0-100", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    // Position contains an out-of-bound percentage e.g. 150%
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-clamped-resume",
            fileFormat: "md",
            lastPosition: {
              scrollPercentage: 150,
            },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="doc-clamped-resume"
        title="Tài Liệu Thay Đổi Kích Thước"
        format="md"
        content={`# Nội Dung Ngắn\nChỉ có một đoạn văn.`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: expect.any(Number) })
      );
    }, { timeout: 1000 });
  });

  it("4A.5: No valid position provided safely defaults to document top without infinite retries", async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-clean-slate",
            fileFormat: "md",
            lastPosition: null,
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    render(
      <UnifiedResearchReader
        documentId="doc-clean-slate"
        title="Tài Liệu Mới"
        format="md"
        content={`# Khởi Đầu\nKhông có vị trí đã lưu.`}
        onClose={vi.fn()}
      />
    );

    // Verify it renders safely without errors
    expect(await screen.findByText(/Khởi Đầu/)).toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4A Hardening Review: Parser, Clamping, Precedence (4A.H1 - 4A.H7)
  // ──────────────────────────────────────────────────────────────────────────
  it("4A.H1: JSON position with only headingId restores heading without fake scroll percentage or loops", async () => {
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    const initialPos = JSON.stringify({ headingId: "chapter-2" });

    render(
      <UnifiedResearchReader
        documentId="doc-h1-only-heading"
        title="Chỉ Có Heading"
        format="md"
        initialPosition={initialPos}
        content={`# Chapter 1\nNội dung 1\n\n## Chapter 2\nNội dung 2`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Must NOT scroll to an arbitrary fine scroll offset
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it("4A.H2: JSON position with only scrollPercentage restores fine percentage clamped to 0-100", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    const initialPos = JSON.stringify({ scrollPercentage: 60 });

    render(
      <UnifiedResearchReader
        documentId="doc-h2-only-pct"
        title="Chỉ Có Percentage"
        format="md"
        initialPosition={initialPos}
        content={`# Chương 1\n${"Đoạn văn dài...\n".repeat(50)}`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: expect.any(Number) })
      );
    }, { timeout: 1000 });
  });

  it("4A.H3: Legacy percentage field is parsed compatibly as scrollPercentage", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    const initialPos = JSON.stringify({ headingId: "chapter-2", percentage: 60 });

    render(
      <UnifiedResearchReader
        documentId="doc-h3-legacy-pct"
        title="Legacy Percentage"
        format="md"
        initialPosition={initialPos}
        content={`# Chapter 1\n\n## Chapter 2\n${"Đoạn văn dài...\n".repeat(30)}`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
      expect(scrollSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("4A.H4: Invalid percentage (-10, 150, NaN, null, string '60') does not crash and clamps or falls back safely", async () => {
    const testCases = [
      { scrollPercentage: -10 },
      { scrollPercentage: 150 },
      { scrollPercentage: NaN },
      { scrollPercentage: null },
      { scrollPercentage: "60" as any },
    ];

    for (const [idx, tc] of testCases.entries()) {
      const scrollSpy = vi.fn();
      window.HTMLElement.prototype.scrollTo = scrollSpy;

      const initialPos = JSON.stringify(tc);

      const { unmount } = render(
        <UnifiedResearchReader
          documentId={`doc-h4-invalid-${idx}`}
          title="Invalid Pct"
          format="md"
          initialPosition={initialPos}
          content={`# Nội Dung\n${"Dòng văn bản...\n".repeat(20)}`}
          onClose={vi.fn()}
        />
      );

      // Verify no exceptions and render completes
      expect(await screen.findByText(/Nội Dung/)).toBeInTheDocument();

      // If scrollTo was called, top must be >= 0 and finite (never NaN, never negative)
      if (scrollSpy.mock.calls.length > 0) {
        for (const call of scrollSpy.mock.calls) {
          const arg = call[0];
          if (typeof arg === "object" && typeof arg.top === "number") {
            expect(Number.isFinite(arg.top)).toBe(true);
            expect(arg.top).toBeGreaterThanOrEqual(0);
          }
        }
      }

      unmount();
    }

    // Verify out-of-bound scrollPercentage (150) is clamped to 100 when persisted on close
    const fetchSpy = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      })
    );
    global.fetch = fetchSpy;

    const { unmount: unmountClampTest } = render(
      <UnifiedResearchReader
        documentId="doc-h4-persist-clamp"
        title="Persist Clamp Test"
        format="md"
        initialPosition={JSON.stringify({ scrollPercentage: 150 })}
        content="# Test Content"
        onClose={vi.fn()}
      />
    );

    const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find((call) =>
        String(call[0]).includes("/api/archive/document/doc-h4-persist-clamp/position")
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse(patchCall![1]?.body as string);
      expect(body.lastPosition?.scrollPercentage).toBe(100);
    });

    unmountClampTest();
  });

  it("4A.H5: Missing heading with valid percentage falls back safely to fine scroll percentage", async () => {
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    const initialPos = JSON.stringify({
      headingId: "missing-heading",
      scrollPercentage: 60,
    });

    render(
      <UnifiedResearchReader
        documentId="doc-h5-missing-heading"
        title="Mục Bị Thiếu"
        format="md"
        initialPosition={initialPos}
        content={`# Tiêu Đề Thực Tế\n${"Đoạn văn bản...\n".repeat(30)}`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledWith(
        expect.objectContaining({ top: expect.any(Number) })
      );
    }, { timeout: 1000 });
  });

  it("4A.H6: Precedence strictly respects initialPosition > RAM store > persisted DB > top", async () => {
    const scrollIntoViewSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewSpy;

    // Case A: initialPosition prop takes top precedence even if RAM and DB exist
    globalReadingPositionStore.setPosition("doc-h6-prec", "md", "heading-in-ram");
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-h6-prec",
            fileFormat: "md",
            lastPosition: { headingId: "heading-in-db" },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    const { unmount: unmountA } = render(
      <UnifiedResearchReader
        documentId="doc-h6-prec"
        title="Precedence Test"
        format="md"
        initialPosition="heading-from-prop"
        content={`# Mục Khác\n\n## Heading From Prop\nNội dung A\n\n## Heading In Ram\nNội dung B\n\n## Heading In Db\nNội dung C`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
    unmountA();

    // Case B: RAM store takes precedence if initialPosition prop is absent
    scrollIntoViewSpy.mockClear();
    globalReadingPositionStore.setPosition("doc-h6-prec-b", "md", "heading-in-ram");
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-h6-prec-b",
            fileFormat: "md",
            lastPosition: { headingId: "heading-in-db" },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    const { unmount: unmountB } = render(
      <UnifiedResearchReader
        documentId="doc-h6-prec-b"
        title="Precedence Test B"
        format="md"
        content={`# Mục Khác\n\n## Heading In Ram\nNội dung B\n\n## Heading In Db\nNội dung C`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
    unmountB();

    // Case C: Persisted DB takes precedence when both initialPosition and RAM store are empty
    scrollIntoViewSpy.mockClear();
    globalReadingPositionStore.clearPosition("doc-h6-prec-c", "md");
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          document: {
            id: "doc-h6-prec-c",
            fileFormat: "md",
            lastPosition: { headingId: "heading-in-db" },
          },
        }),
        headers: { get: () => "application/json" },
      })
    );

    const { unmount: unmountC } = render(
      <UnifiedResearchReader
        documentId="doc-h6-prec-c"
        title="Precedence Test C"
        format="md"
        content={`# Mục Khác\n\n## Heading In Db\nNội dung C`}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
    unmountC();
  });

  it("4A.H7: Late persisted response does not overwrite newer in-memory RAM position", async () => {
    let resolveLateFetch: (value: any) => void;
    const lateFetchPromise = new Promise((resolve) => {
      resolveLateFetch = resolve;
    });

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-late-h7")) {
        return lateFetchPromise;
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    // Initial state: RAM is empty
    globalReadingPositionStore.clearPosition("doc-late-h7", "md");

    render(
      <UnifiedResearchReader
        documentId="doc-late-h7"
        title="Tài Liệu Đọc Late Fetch"
        format="md"
        content="# Tiêu Đề\n\n## Phần Mới Nhất\nNội dung mới.\n\n## Phần Cũ Trong Db\nNội dung cũ."
        onClose={vi.fn()}
      />
    );

    // User navigates / scrolls to newer position while DB fetch is still in flight
    globalReadingPositionStore.setPosition("doc-late-h7", "md", "phan-moi-nhat");

    // DB fetch returns older position
    resolveLateFetch!({
      ok: true,
      json: async () => ({
        document: {
          id: "doc-late-h7",
          fileFormat: "md",
          lastPosition: { headingId: "phan-cu-trong-db", scrollPercentage: 10 },
        },
      }),
      headers: { get: () => "application/json" },
    });

    await new Promise((r) => setTimeout(r, 50));

    // RAM position must NOT be overwritten by the stale DB response
    expect(globalReadingPositionStore.getPosition("doc-late-h7", "md")).toBe("phan-moi-nhat");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4B: History Management (Delete Single Entry & Clear All) - Pending Slice 4B Approval
  // ──────────────────────────────────────────────────────────────────────────
  it("4B.1: recent-reads-shelf provides a delete button for single entries that removes it from history", async () => {
    const mockArchivedList = {
      total: 1,
      documents: [
        {
          id: "arch-entry-to-delete",
          fileName: "kinh_kim_cang.epub",
          fileFormat: "epub",
          sourceType: "vault",
          sourcePath: "05_EPUB_Export/kinh_kim_cang.epub",
          sourceKey: "vault:05_EPUB_Export/kinh_kim_cang.epub",
          lastPosition: { cfi: "epubcfi(/6/2)" },
          lastReadAt: "2026-10-19T10:00:00.000Z",
        },
      ],
    };

    let deleteCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => (deleteCalled ? { total: 0, documents: [] } : mockArchivedList),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/archive/document/arch-entry-to-delete/history") && options?.method === "DELETE") {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, message: "Reading history cleared" }),
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

    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(within(shelf).getByText(/kinh kim cang/i)).toBeInTheDocument();

    // Look for delete/remove button on the card
    const removeBtn = within(shelf).getByTestId("remove-recent-read-arch-entry-to-delete");
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
      expect(within(shelf).queryByText(/kinh kim cang/i)).toBeNull();
    });
  });

  it("4B.2: recent-reads-shelf provides a 'Clear All History' action with confirmation that resets recent reads list", async () => {
    const mockArchivedList = {
      total: 2,
      documents: [
        {
          id: "arch-1",
          fileName: "doc1.pdf",
          fileFormat: "pdf",
          lastReadAt: "2026-10-19T10:00:00.000Z",
        },
        {
          id: "arch-2",
          fileName: "doc2.pdf",
          fileFormat: "pdf",
          lastReadAt: "2026-10-19T09:00:00.000Z",
        },
      ],
    };

    let clearAllCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => (clearAllCalled ? { total: 0, documents: [] } : mockArchivedList),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/archive/history") && options?.method === "DELETE") {
        clearAllCalled = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, count: 2 }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      });
    });

    // Mock window.confirm to accept
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const shelf = await screen.findByTestId("recent-reads-shelf");
    const clearAllBtn = within(shelf).getByTestId("clear-recent-reads-btn");
    fireEvent.click(clearAllBtn);

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() => {
      expect(clearAllCalled).toBe(true);
      expect(screen.getByTestId("recent-reads-empty")).toBeInTheDocument();
    });
  });

  it("4B.3: cancelling clear-all confirmation aborts deletion and preserves history list", async () => {
    const mockArchivedList = {
      total: 1,
      documents: [
        {
          id: "arch-keep",
          fileName: "doc_keep.pdf",
          fileFormat: "pdf",
          lastReadAt: "2026-10-19T10:00:00.000Z",
        },
      ],
    };

    let clearAllCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchivedList,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/archive/history") && options?.method === "DELETE") {
        clearAllCalled = true;
        return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    });

    // Mock window.confirm to cancel
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    const shelf = await screen.findByTestId("recent-reads-shelf");
    const clearAllBtn = within(shelf).getByTestId("clear-recent-reads-btn");
    fireEvent.click(clearAllBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(clearAllCalled).toBe(false);
    expect(within(shelf).getByText(/doc keep/i)).toBeInTheDocument();
  });

  it("4B.4: deleting history preserves persisted lastPosition when document is reopened", async () => {
    // Document has history cleared (lastReadAt: null) but lastPosition preserved
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-preserved-pos")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-preserved-pos",
              fileFormat: "md",
              lastReadAt: null, // History cleared
              lastPosition: {
                headingId: "muc-da-luu",
                scrollPercentage: 40,
              },
            },
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    });

    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollTo = scrollSpy;

    render(
      <UnifiedResearchReader
        documentId="doc-preserved-pos"
        title="Tài Liệu Bảo Toàn Vị Trí"
        format="md"
        content="# Tiêu Đề\n\n## Mục Đã Lưu\nNội dung chi tiết..."
        onClose={vi.fn()}
      />
    );

    // Reader must successfully restore the fine scroll percentage from persisted lastPosition
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it("4B.5: recent-reads-shelf displays retryable error state on API failure without crashing", async () => {
    let failCount = 1;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        if (failCount > 0) {
          failCount--;
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ error: "INTERNAL_ERROR", message: "Server error" }),
            headers: { get: () => "application/json" },
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total: 1,
            documents: [
              {
                id: "doc-recovered",
                fileName: "recovered.md",
                fileFormat: "md",
                lastReadAt: "2026-10-19T10:00:00.000Z",
              },
            ],
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ total: 0, documents: [] }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    // Expect error state to be rendered
    const errorEl = await screen.findByTestId("recent-reads-error");
    expect(errorEl).toBeInTheDocument();

    // Click retry
    const retryBtn = screen.getByTestId("recent-reads-retry-btn");
    fireEvent.click(retryBtn);

    // Recovers successfully
    await waitFor(() => {
      expect(screen.getByText(/recovered/i)).toBeInTheDocument();
    });
  });

  it("4B.6: archiveRoutes DELETE /archive/document/:id/history clears lastReadAt and readCount without deleting record or lastPosition", async () => {
    const inMemoryDocs: Record<string, any> = {
      "doc-to-clear": {
        id: "doc-to-clear",
        fileName: "sample.pdf",
        storageRelPath: "pdf/sample.pdf",
        lastPosition: { pageNumber: 5 },
        lastReadAt: new Date("2026-10-19T10:00:00Z"),
        readCount: 3,
      },
    };

    const mockPrisma: any = {
      archivedDocument: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => inMemoryDocs[where.id] || null),
        findFirst: vi.fn().mockImplementation(async ({ where }) => inMemoryDocs[where.id] || null),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          inMemoryDocs[where.id] = { ...inMemoryDocs[where.id], ...data };
          return inMemoryDocs[where.id];
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));

    const res = await request(app).delete("/api/archive/document/doc-to-clear/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB record still exists, lastPosition intact, but lastReadAt cleared
    expect(inMemoryDocs["doc-to-clear"]).toBeDefined();
    expect(inMemoryDocs["doc-to-clear"].lastPosition).toEqual({ pageNumber: 5 });
    expect(inMemoryDocs["doc-to-clear"].lastReadAt).toBeNull();
    expect(inMemoryDocs["doc-to-clear"].readCount).toBe(0);
  });

  it("4B.7: archiveRoutes DELETE /archive/document/:id/history is idempotent when document is not found", async () => {
    const mockPrisma: any = {
      archivedDocument: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));

    const res = await request(app).delete("/api/archive/document/non-existent-id/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("4B.8: archiveRoutes DELETE /archive/history resets lastReadAt for all documents", async () => {
    const mockPrisma: any = {
      archivedDocument: {
        updateMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));

    const res = await request(app).delete("/api/archive/history");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(5);
    expect(mockPrisma.archivedDocument.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { lastReadAt: null, readCount: 0 },
      })
    );
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4C: Reading Completion State (RED Stage)
  // ──────────────────────────────────────────────────────────────────────────
  it("4C.1: reader identifies completion when user clicks 'mark-completed-btn' and persists completed status", async () => {
    let recordedPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        recordedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-complete-check"
        title="Đọc Hết Sách"
        format="md"
        content={`# Chương Cuối\nĐoạn văn kết thúc cuốn sách.`}
        onClose={vi.fn()}
      />
    );

    const completeTrigger = screen.getByTestId("mark-completed-btn");
    fireEvent.click(completeTrigger);

    await waitFor(() => {
      expect(recordedPayload).toMatchObject({
        completed: true,
        completedAt: expect.any(String),
      });
    });
  });

  it("4C.2: reaching 100% scroll in Markdown reader auto-triggers completion status", async () => {
    let recordedPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        recordedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-complete-scroll"
        title="Đọc Cuộn Hết"
        format="md"
        content={`# Chương 1\n${"Đoạn văn dài...\n".repeat(40)}`}
        onClose={vi.fn()}
      />
    );

    const scrollContainer = screen.getByTestId("markdown-selectable-area");
    Object.defineProperty(scrollContainer, "scrollTop", { value: 1000, writable: true });
    Object.defineProperty(scrollContainer, "scrollHeight", { value: 1500, writable: true });
    Object.defineProperty(scrollContainer, "clientHeight", { value: 500, writable: true });

    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(recordedPayload).toMatchObject({
        completed: true,
        completedAt: expect.any(String),
      });
    });
  });

  it("4C.3: toggling completion button when already completed reverts completed state", async () => {
    let recordedPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        recordedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/archive/document/doc-already-complete")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-already-complete",
              fileFormat: "md",
              lastPosition: {
                isCompleted: true,
                completedAt: "2026-10-19T08:00:00.000Z",
              },
            },
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-already-complete"
        title="Đã Hoàn Thành"
        format="md"
        content="# Tiêu Đề\nNội dung."
        onClose={vi.fn()}
      />
    );

    const completeTrigger = await screen.findByTestId("mark-completed-btn");
    expect(completeTrigger).toHaveAttribute("data-completed", "true");

    // Click again to toggle back
    fireEvent.click(completeTrigger);

    await waitFor(() => {
      expect(recordedPayload).toMatchObject({
        completed: false,
        completedAt: null,
      });
    });
  });

  it("4C.4: archiveRoutes PATCH /archive/document/:id/position safely accepts and persists completion in lastPosition", async () => {
    const updatedDocs: Record<string, any> = {};
    const mockPrisma: any = {
      archivedDocument: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === "doc-persist-completion") {
            return Promise.resolve({
              id: "doc-persist-completion",
              lastPosition: { headingId: "chapter-1" },
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(({ where, data }) => {
          updatedDocs[where.id] = data;
          return Promise.resolve({
            id: where.id,
            ...data,
          });
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));

    const res = await request(app)
      .patch("/api/archive/document/doc-persist-completion/position")
      .send({
        completed: true,
        completedAt: "2026-10-19T10:00:00.000Z",
        lastPosition: { headingId: "chapter-1" },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(updatedDocs["doc-persist-completion"]?.lastPosition).toMatchObject({
      isCompleted: true,
      completedAt: "2026-10-19T10:00:00.000Z",
    });
  });

  it("4C.5: completed state is safely hydrated from database when document is re-opened", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-hydrated-completed")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-hydrated-completed",
              fileFormat: "md",
              lastPosition: {
                headingId: "muc-cuoi",
                isCompleted: true,
                completedAt: "2026-10-19T09:00:00.000Z",
              },
            },
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <UnifiedResearchReader
        documentId="doc-hydrated-completed"
        title="Tài Liệu Đã Đọc Xong"
        format="md"
        content="# Tiêu Đề\n\n## Mục Cuối\nNội dung đã đọc xong."
        onClose={vi.fn()}
      />
    );

    const completeBtn = await screen.findByTestId("mark-completed-btn");
    expect(completeBtn).toHaveAttribute("data-completed", "true");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4D: Reading Analytics & Tab Visibility Protection (RED Stage)
  // ──────────────────────────────────────────────────────────────────────────
  it("4D.1: reader tracks active reading duration and suspends timer when tab is hidden", async () => {
    let finalPersistPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        finalPersistPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    const { unmount } = render(
      <UnifiedResearchReader
        documentId="doc-analytics-timer"
        title="Đo Thời Gian Đọc"
        format="md"
        content="# Tiêu Đề\nNội dung."
        onClose={vi.fn()}
      />
    );

    // User switches tab to background after 200ms
    Object.defineProperty(document, "visibilityState", { value: "hidden", writable: true });
    fireEvent(document, new Event("visibilitychange"));

    // Wait while tab is in background (should NOT count toward active duration)
    await new Promise((r) => setTimeout(r, 200));

    // User returns to tab
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });
    fireEvent(document, new Event("visibilitychange"));

    // Close reader to persist final session stats
    unmount();

    // Expectation: Payload sent to server must include activeReadingSeconds
    // Current behavior: UnifiedResearchReader does not track activeReadingSeconds.
    expect(finalPersistPayload).toHaveProperty("activeReadingSeconds");
  });

  it("4D.2: flushing duration resets active session timer to prevent double counting", async () => {
    const payloads: any[] = [];

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        payloads.push(JSON.parse(options.body));
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    const { unmount } = render(
      <UnifiedResearchReader
        documentId="doc-double-count-check"
        title="Chống Đếm Trùng"
        format="md"
        content="# Tiêu Đề\nNội dung bài viết."
        onClose={vi.fn()}
      />
    );

    // Wait 100ms
    await new Promise((r) => setTimeout(r, 100));

    // Trigger position change / manual save
    const completeBtn = await screen.findByTestId("mark-completed-btn");
    fireEvent.click(completeBtn);

    // Unmount shortly after
    unmount();

    expect(payloads.length).toBeGreaterThanOrEqual(1);
    const lastPayload = payloads[payloads.length - 1];
    expect(lastPayload).toHaveProperty("activeReadingSeconds");
    expect(typeof lastPayload.activeReadingSeconds).toBe("number");
  });

  it("4D.3: archiveRoutes PATCH /archive/document/:id/position aggregates activeReadingSeconds into lastPosition without schema migration", async () => {
    const updatedDocs: Record<string, any> = {};
    const mockPrisma: any = {
      archivedDocument: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === "doc-analytics-db") {
            return Promise.resolve({
              id: "doc-analytics-db",
              lastPosition: {
                headingId: "chapter-1",
                totalReadingSeconds: 60,
              },
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockImplementation(({ where, data }) => {
          updatedDocs[where.id] = data;
          return Promise.resolve({
            id: where.id,
            ...data,
          });
        }),
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));

    const res = await request(app)
      .patch("/api/archive/document/doc-analytics-db/position")
      .send({
        activeReadingSeconds: 30,
        lastPosition: { headingId: "chapter-1" },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Expect totalReadingSeconds to be aggregated to 60 + 30 = 90
    expect(updatedDocs["doc-analytics-db"]?.lastPosition).toMatchObject({
      totalReadingSeconds: 90,
      lastSessionSeconds: 30,
    });
  });

  it("4D.4: quick close does not record negative duration or NaN", async () => {
    let finalPayload: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/position") && options?.method === "PATCH") {
        finalPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ document: null }),
        headers: { get: () => "application/json" },
      });
    });

    const { unmount } = render(
      <UnifiedResearchReader
        documentId="doc-quick-close"
        title="Đóng Nhanh"
        format="md"
        content="# Tiêu Đề\nNội dung."
        onClose={vi.fn()}
      />
    );

    // Immediately unmount
    unmount();

    expect(finalPayload).toBeDefined();
    expect(finalPayload?.activeReadingSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(finalPayload?.activeReadingSeconds)).toBe(true);
  });
});
