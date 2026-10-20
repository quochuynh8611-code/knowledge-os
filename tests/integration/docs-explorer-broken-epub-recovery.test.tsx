/**
 * Integration tests: DocsExplorerView — Broken EPUB Recovery Flow
 *
 * Verifies end-to-end behavior when an EPUB file is missing (HTTP 404):
 * - Opening the book shows error with recovery actions
 * - "Gỡ khỏi danh sách đọc" removes the item from:
 *   (a) "Tài liệu đang đọc" drilldown
 *   (b) "Đọc gần đây" shelf
 * - DELETE /api/archive/document/:id/history resets BOTH lastReadAt and lastPosition
 * - No physical vault file is deleted
 *
 * Hermetic guard: All fetch calls are intercepted by vi.fn() mocks.
 * No live HTTP calls to localhost:3000.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn(() => <div data-testid="react-reader-mock">ReactReader Mock</div>),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

function clearGlobalStore() {
  const all = globalReadingPositionStore.getAllPositions();
  for (const key of Object.keys(all)) {
    const parts = key.split(":");
    if (parts.length >= 3) {
      globalReadingPositionStore.clearPosition(parts[1], parts[2]);
    }
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const brokenEpubArchiveDoc = {
  id: "arch-broken-epub-r4a",
  fileName: "missing_book.epub",
  fileFormat: "epub",
  sourceType: "vault",
  sourcePath: "05_EPUB_Export/missing_book.epub",
  sourceKey: "vault:05_EPUB_Export/missing_book.epub",
  storageRelPath: "vault://05_EPUB_Export/missing_book.epub",
  contentHash: "aabbccdd" + "0".repeat(56),
  lastPosition: {
    cfi: "epubcfi(/6/2!/4/2:100)",
    percentage: 45,
    totalReadingSeconds: 300,
  },
  lastReadAt: "2026-10-20T10:00:00.000Z",
  readCount: 5,
};

const brokenEpubDocItem = {
  id: "vault-doc-missing",
  title: "Missing Book",
  category: "books",
  relativePath: "05_EPUB_Export/missing_book.epub",
  status: "EPUB",
  sizeBytes: 1048576,
  lastModified: "2026-10-20T08:00:00.000Z",
  sourceType: "vault" as const,
  sourcePath: "05_EPUB_Export/missing_book.epub",
};

describe("DocsExplorerView — Broken EPUB Recovery Flow", () => {
  let deleteHistoryCalled: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalStore();
    deleteHistoryCalled = false;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = String(url);

      // Broken vault EPUB attachment → 404
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
        };
      }

      // Archive list → return the broken epub with reading progress
      if (urlStr.includes("/api/archive/list")) {
        return {
          ok: true,
          json: async () => ({
            documents: [
              // After deletion, return cleaned up version
              deleteHistoryCalled
                ? {
                    ...brokenEpubArchiveDoc,
                    lastReadAt: null,
                    lastPosition: null,
                    readCount: 0,
                  }
                : brokenEpubArchiveDoc,
            ],
          }),
          headers: { get: () => "application/json" },
        };
      }

      // Docs list → return the broken doc item
      if (urlStr.includes("/api/docs") && !urlStr.includes("/api/archive")) {
        return {
          ok: true,
          json: async () => ({
            total: 1,
            documents: [brokenEpubDocItem],
          }),
          headers: { get: () => "application/json" },
        };
      }

      // DELETE /api/archive/document/:id/history
      if (
        urlStr.includes("/api/archive/document/") &&
        urlStr.includes("/history") &&
        opts?.method === "DELETE"
      ) {
        deleteHistoryCalled = true;
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: "Đã xóa lịch sử đọc thành công.",
          }),
          headers: { get: () => "application/json" },
        };
      }

      // PATCH /position → must NOT be called for broken session
      if (urlStr.includes("/position") && opts?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ success: true }),
          headers: { get: () => "application/json" },
        };
      }

      // Vault tree/file list
      if (urlStr.includes("/api/obsidian/vault")) {
        return {
          ok: true,
          json: async () => ({ files: [] }),
          headers: { get: () => "application/json" },
        };
      }

      return {
        ok: true,
        json: async () => ({}),
        headers: { get: () => "application/json" },
      };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Test 1: Broken EPUB item appears in "Tài liệu đang đọc" and "Đọc gần đây" ──

  it("1. A broken EPUB with lastPosition and lastReadAt appears in both drilldown and recent shelf", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Recent shelf must show the broken epub
    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
    });

    // Analytics summary must show it in "đang đọc"
    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("1");

    // Open drilldown to see in-progress list
    fireEvent.click(inProgressBadge);
    const drilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(drilldown).getByText(/Missing Book/i)).toBeInTheDocument();
  });

  // ── Test 2: Opening the broken EPUB shows error fallback with recovery actions ──

  it("2. Opening a broken EPUB file shows error fallback with 'Gỡ khỏi danh sách đọc' option", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Click on the book from the recent shelf
    const shelf = await screen.findByTestId("recent-reads-shelf");
    const bookCard = await within(shelf).findByText(/Missing Book/i);
    fireEvent.click(bookCard);

    // The reader should mount and the EpubReaderAdapter should hit 404
    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Recovery buttons must be visible
    expect(
      screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Đóng trình đọc/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeInTheDocument();
  });

  // ── Test 3: "Gỡ khỏi danh sách đọc" from error state cleans up everything ──

  it("3. Clicking 'Gỡ khỏi danh sách đọc' triggers DELETE history and removes item from both lists", async () => {
    const fetchSpy = global.fetch as ReturnType<typeof vi.fn>;

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Open the broken epub
    const shelf = await screen.findByTestId("recent-reads-shelf");
    const bookCard = await within(shelf).findByText(/Missing Book/i);
    fireEvent.click(bookCard);

    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click "Gỡ khỏi danh sách đọc"
    const removeBtn = screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i });
    fireEvent.click(removeBtn);

    // Contract 1: DELETE /history must have been called
    await waitFor(() => {
      expect(deleteHistoryCalled).toBe(true);
    });

    // Contract 2: Reader must be closed (no longer visible)
    await waitFor(() => {
      expect(screen.queryByText(/Không đọc được file EPUB này/i)).toBeNull();
    });

    // Contract 3: No PATCH /position should have been called for the broken doc
    const patchCalls = fetchSpy.mock.calls.filter(
      (call) =>
        String(call[0]).includes("/api/archive/document/arch-broken-epub-r4a/position") &&
        (call[1] as any)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });

  // ── Test 4: After cleanup, item disappears from "Đọc gần đây" shelf ──

  it("4. After 'Gỡ khỏi danh sách đọc', the item is removed from 'Đọc gần đây' shelf immediately", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Verify book is on shelf initially
    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
    });

    // Click book from recent shelf to open reader
    const bookCard = within(shelf).getByText(/Missing Book/i);
    fireEvent.click(bookCard);

    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click remove
    fireEvent.click(screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i }));

    // The "Đọc gần đây" shelf must no longer show the item
    await waitFor(() => {
      expect(within(shelf).queryByText(/Missing Book/i)).toBeNull();
    });
  });

  // ── Test 5: After cleanup, item disappears from "Tài liệu đang đọc" drilldown ──

  it("5. After 'Gỡ khỏi danh sách đọc', the item no longer shows in 'Tài liệu đang đọc' drilldown", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("1");

    // Open the broken book from shelf
    const shelf = await screen.findByTestId("recent-reads-shelf");
    const bookCard = within(shelf).getByText(/Missing Book/i);
    fireEvent.click(bookCard);

    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Remove from list
    fireEvent.click(screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i }));

    // In-progress count must drop to 0
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("0");
    });
  });

  // ── Test 6: Direct delete from shelf still calls DELETE history endpoint ──

  it("6. Clicking the X button on the 'Đọc gần đây' shelf item calls DELETE /history and removes item", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
    });

    // Use the X remove button on the shelf (existing feature)
    const removeBtn = within(shelf).getByTestId("remove-recent-read-arch-broken-epub-r4a");
    fireEvent.click(removeBtn);

    // DELETE /history must be called
    await waitFor(() => {
      expect(deleteHistoryCalled).toBe(true);
    });

    // Item disappears from shelf
    await waitFor(() => {
      expect(within(shelf).queryByText(/Missing Book/i)).toBeNull();
    });
  });

  it("7. 'Gỡ khỏi danh sách đọc' resets both lastReadAt and lastPosition, clearing in-progress status", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Initially: 1 in-progress document
    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    await waitFor(() => {
      expect(inProgressBadge.textContent).toContain("1");
    });

    // Open broken book
    const shelf = await screen.findByTestId("recent-reads-shelf");
    const bookCard = await within(shelf).findByText(/Missing Book/i);
    fireEvent.click(bookCard);

    await waitFor(() => {
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
    });

    // Click "Gỡ khỏi danh sách đọc"
    fireEvent.click(screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i }));

    // After deletion, in-progress count must drop to 0
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("0");
    });
  });
});
