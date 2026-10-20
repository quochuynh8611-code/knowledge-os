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

const healthyEpubArchiveDoc = {
  id: "arch-healthy-epub-r4a",
  fileName: "healthy_book.epub",
  fileFormat: "epub",
  sourceType: "vault",
  sourcePath: "05_EPUB_Export/healthy_book.epub",
  sourceKey: "vault:05_EPUB_Export/healthy_book.epub",
  storageRelPath: "vault://05_EPUB_Export/healthy_book.epub",
  contentHash: "11223344" + "0".repeat(56),
  lastPosition: {
    cfi: "epubcfi(/6/4!/4/2:50)",
    percentage: 20,
    totalReadingSeconds: 150,
  },
  lastReadAt: "2026-10-20T09:00:00.000Z",
  readCount: 3,
};

const healthyEpubDocItem = {
  id: "vault-doc-healthy",
  title: "Healthy Book",
  category: "books",
  relativePath: "05_EPUB_Export/healthy_book.epub",
  status: "EPUB",
  sizeBytes: 2097152,
  lastModified: "2026-10-20T07:00:00.000Z",
  sourceType: "vault" as const,
  sourcePath: "05_EPUB_Export/healthy_book.epub",
};

const brokenPathEpubDocItem = {
  id: "doc-broken-path-item",
  title: "Broken Path Book",
  category: "books",
  relativePath: "books/broken_path.epub",
  status: "EPUB",
  sizeBytes: 500000,
  lastModified: "2026-10-20T08:00:00.000Z",
  sourceType: "docs" as const,
};

const brokenPathEpubArchiveDoc = {
  id: "arch-broken-path-uuid-9999",
  fileName: "broken_path.epub",
  fileFormat: "epub",
  sourceType: "docs",
  sourcePath: "books/broken_path.epub",
  sourceKey: "archive:books/broken_path.epub",
  storageRelPath: "epub/broken_path.epub",
  contentHash: "99998888" + "0".repeat(56),
  lastPosition: {
    cfi: "epubcfi(/6/8!/4/2:30)",
    percentage: 30,
    totalReadingSeconds: 200,
  },
  lastReadAt: "2026-10-20T10:30:00.000Z",
  readCount: 4,
};

describe("DocsExplorerView — Broken EPUB Recovery Flow", () => {
  let deleteHistoryCalled: boolean;
  let deletedDocIds: Set<string>;
  let vaultFileDeleteCalls: string[];

  let currentArchiveDocs: any[];
  let currentDocItems: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalStore();
    deleteHistoryCalled = false;
    deletedDocIds = new Set();
    vaultFileDeleteCalls = [];
    currentArchiveDocs = [brokenEpubArchiveDoc, healthyEpubArchiveDoc];
    currentDocItems = [brokenEpubDocItem, healthyEpubDocItem];

    global.fetch = vi.fn().mockImplementation(async (url: string, opts?: any) => {
      const urlStr = String(url);

      // Track any physical vault file DELETE calls
      if (urlStr.includes("/api/obsidian/vault/file") && opts?.method === "DELETE") {
        vaultFileDeleteCalls.push(urlStr);
        return { ok: true, json: async () => ({ success: true }) };
      }

      // Broken EPUB raw / attachment → 404
      if (urlStr.includes("missing_book.epub") || urlStr.includes("broken_path.epub")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
        };
      }

      // Vault tree/file list
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return {
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(1024),
          headers: { get: () => "application/epub+zip" },
        };
      }

      // GET /api/archive/document/:id (faithful to archiveRoutes.ts with alias resolution)
      if (urlStr.match(/\/api\/archive\/document\/([^/]+)$/)) {
        const match = urlStr.match(/\/api\/archive\/document\/([^/]+)$/);
        const reqId = match && match[1] ? decodeURIComponent(match[1]) : "";
        const cleanId = reqId.replace(/^vault:\/\//, "").replace(/^vault:/, "").replace(/^archive:\/\//, "").replace(/^archive:/, "").replace(/^\/+/, "");
        const candidateKeys = new Set([reqId, cleanId, `vault:${cleanId}`, `vault://${cleanId}`, `archive:${cleanId}`, `archive://${cleanId}`]);
        const allDocs = [...currentArchiveDocs, brokenPathEpubArchiveDoc];
        const doc = allDocs.find((d) =>
          candidateKeys.has(d.id) ||
          (d.contentHash && candidateKeys.has(d.contentHash)) ||
          (d.sourceKey && candidateKeys.has(d.sourceKey)) ||
          (d.sourcePath && candidateKeys.has(d.sourcePath)) ||
          (d.storageRelPath && candidateKeys.has(d.storageRelPath))
        );
        if (!doc) {
          return { ok: false, status: 404, json: async () => ({ error: "DOCUMENT_NOT_FOUND" }) };
        }
        const isDeleted = deletedDocIds.has(doc.id);
        return {
          ok: true,
          json: async () => ({
            success: true,
            document: isDeleted
              ? { ...doc, lastReadAt: null, lastPosition: null, readCount: 0 }
              : doc,
          }),
          headers: { get: () => "application/json" },
        };
      }

      // Archive list → return documents from DB state
      if (urlStr.includes("/api/archive/list")) {
        const returnDocs = currentArchiveDocs.map((doc) => {
          if (deletedDocIds.has(doc.id)) {
            return {
              ...doc,
              lastReadAt: null,
              lastPosition: null,
              readCount: 0,
            };
          }
          return doc;
        });
        return {
          ok: true,
          json: async () => ({ documents: returnDocs }),
          headers: { get: () => "application/json" },
        };
      }

      // Docs list → return doc items
      if (urlStr.includes("/api/docs") && !urlStr.includes("/api/archive")) {
        return {
          ok: true,
          json: async () => ({
            total: currentDocItems.length,
            documents: currentDocItems,
          }),
          headers: { get: () => "application/json" },
        };
      }

      // DELETE /api/archive/document/:id/history (faithful to archiveRoutes.ts with alias resolution)
      if (
        urlStr.includes("/api/archive/document/") &&
        urlStr.includes("/history") &&
        opts?.method === "DELETE"
      ) {
        deleteHistoryCalled = true;
        const match = urlStr.match(/\/api\/archive\/document\/([^/]+)\/history/);
        const reqId = match && match[1] ? decodeURIComponent(match[1]) : "";
        const cleanId = reqId.replace(/^vault:\/\//, "").replace(/^vault:/, "").replace(/^archive:\/\//, "").replace(/^archive:/, "").replace(/^\/+/, "");
        const candidateKeys = new Set([reqId, cleanId, `vault:${cleanId}`, `vault://${cleanId}`, `archive:${cleanId}`, `archive://${cleanId}`]);

        const matched = currentArchiveDocs.filter((d) =>
          candidateKeys.has(d.id) ||
          (d.contentHash && candidateKeys.has(d.contentHash)) ||
          (d.sourceKey && candidateKeys.has(d.sourceKey)) ||
          (d.sourcePath && candidateKeys.has(d.sourcePath)) ||
          (d.storageRelPath && candidateKeys.has(d.storageRelPath))
        );
        for (const m of matched) {
          deletedDocIds.add(m.id);
        }
        return {
          ok: true,
          json: async () => ({
            success: true,
            message: matched.length > 0 ? "Đã xóa lịch sử đọc thành công." : `Tài liệu '${reqId}' không tồn tại hoặc lịch sử đọc đã được xóa trước đó.`,
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
    expect(inProgressBadge.textContent).toContain("2");

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
    expect(inProgressBadge.textContent).toContain("2");

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

    // In-progress count must drop to 1 (only healthy book remains)
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("1");
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

    // Initially: 2 in-progress documents
    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    await waitFor(() => {
      expect(inProgressBadge.textContent).toContain("2");
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

    // After deletion, in-progress count must drop to 1
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("1");
    });
  });

  // ── Test 8: Comprehensive Scenario — Remove broken EPUB from library list hides from all surfaces ──

  it("8. Scenario: Remove broken EPUB opened via library list/alias hides it from all reading surfaces without affecting healthy book or deleting physical file", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // 1. Initial State: Both books appear in Recent Shelf and In-Progress
    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
      expect(within(shelf).getByText(/Healthy Book/i)).toBeInTheDocument();
    });

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("2");

    // Open in-progress drilldown to confirm both are present initially
    fireEvent.click(inProgressBadge);
    const drilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(drilldown).getByText(/Missing Book/i)).toBeInTheDocument();
    expect(within(drilldown).getByText(/Healthy Book/i)).toBeInTheDocument();

    // Close drilldown before opening reader
    const closeDrilldownBtn = screen.getByTestId("drilldown-close-btn");
    fireEvent.click(closeDrilldownBtn);

    // 2. Open broken book directly from Library List (doc item has id "vault-doc-missing", relativePath "05_EPUB_Export/missing_book.epub")
    const brokenDocItemBtn = await screen.findByTestId("doc-item-vault-doc-missing");
    fireEvent.click(brokenDocItemBtn);

    // 3. Reader enters error state with 404
    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 4. Click "Gỡ khỏi danh sách đọc"
    const removeBtn = screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i });
    fireEvent.click(removeBtn);

    // 5. Verification across all surfaces:
    // Surface A: "Đọc gần đây" shelf must NOT have "Missing Book", but MUST keep "Healthy Book"
    await waitFor(() => {
      expect(within(shelf).queryByText(/Missing Book/i)).toBeNull();
      expect(within(shelf).getByText(/Healthy Book/i)).toBeInTheDocument();
    });

    // Surface B: summary-in-progress-count must drop to 1
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("1");
    });

    // Surface C: drilldown panel must only contain "Healthy Book" and NOT "Missing Book"
    fireEvent.click(screen.getByTestId("summary-in-progress-count"));
    const updatedDrilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(updatedDrilldown).queryByText(/Missing Book/i)).toBeNull();
    expect(within(updatedDrilldown).getByText(/Healthy Book/i)).toBeInTheDocument();

    // Invariant D: Resource record remains intact in library list (NOT deleted)
    expect(screen.getByTestId("doc-item-vault-doc-missing")).toBeInTheDocument();

    // Invariant E: No physical vault file was deleted
    expect(vaultFileDeleteCalls).toHaveLength(0);
  });

  // ── Test 9: BUG REPRODUCTION — Removing by path alias or with un-cleared server cache ──

  it("9. Removing by path alias (relativePath / sourcePath) immediately removes item from in-progress analytics and drilldown", async () => {
    // In this test, we simulate reader opened with documentId as relativePath "05_EPUB_Export/missing_book.epub"
    // (as happens when doc is opened before matchingArch has an id, or from custom open handlers)
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("2");

    // Open drilldown
    fireEvent.click(inProgressBadge);
    const drilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(drilldown).getByText(/Missing Book/i)).toBeInTheDocument();

    // Now click the item from drilldown to open reader
    const drilldownItem = within(drilldown).getByText(/Missing Book/i);
    fireEvent.click(drilldownItem);

    // Reader encounters 404
    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Simulate clicking "Gỡ khỏi danh sách đọc"
    const removeBtn = screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i });
    fireEvent.click(removeBtn);

    // In-progress count must drop to 1
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("1");
    });

    // Drilldown (which was already open) must no longer contain "Missing Book"
    const currentDrilldown = screen.getByTestId("reading-analytics-drilldown");
    expect(within(currentDrilldown).queryByText(/Missing Book/i)).toBeNull();
    expect(within(currentDrilldown).getByText(/Healthy Book/i)).toBeInTheDocument();
  });

  // ── Test 10: FAILING TEST EVIDENCE — deletedHistoryIds must filter readingSummary & drilldownDocs ──

  it("10. FAILING TEST: Removing an item from recent shelf (or by history deletion) must immediately remove it from 'Tài liệu đang đọc' and readingSummary", async () => {
    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
      expect(within(shelf).getByText(/Healthy Book/i)).toBeInTheDocument();
    });

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("2");

    // Click remove (X) button on recent reads shelf for Missing Book
    const removeBtn = within(shelf).getByTestId("remove-recent-read-arch-broken-epub-r4a");
    fireEvent.click(removeBtn);

    // Shelf correctly removes it because recentDocs filters deletedHistoryIds
    await waitFor(() => {
      expect(within(shelf).queryByText(/Missing Book/i)).toBeNull();
    });

    // CRITICAL BUG EVIDENCE:
    // in-progress count MUST drop to 1 and drilldown MUST NOT have "Missing Book".
    // Currently fails because readingSummary and drilldownDocs do not filter deletedHistoryIds!
    await waitFor(() => {
      const badge = screen.getByTestId("summary-in-progress-count");
      expect(badge.textContent).toContain("1");
    });

    fireEvent.click(screen.getByTestId("summary-in-progress-count"));
    const drilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(drilldown).queryByText(/Missing Book/i)).toBeNull();
    expect(within(drilldown).getByText(/Healthy Book/i)).toBeInTheDocument();
  });

  // ── Test 11: FAILING PERSISTENCE / REFRESH TEST ──

  it("11. FAILING TEST: After 'Gỡ khỏi danh sách đọc', unmounting and remounting (simulating F5/refresh) must NOT restore the broken document to reading surfaces", async () => {
    const { unmount } = render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // 1. Initial State: Both books appear on shelf and in-progress count is 2
    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Missing Book/i)).toBeInTheDocument();
      expect(within(shelf).getByText(/Healthy Book/i)).toBeInTheDocument();
    });

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("2");

    // 2. Open broken book from library list
    const brokenDocItemBtn = await screen.findByTestId("doc-item-vault-doc-missing");
    fireEvent.click(brokenDocItemBtn);

    // 3. Reader enters error state with 404
    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // 4. Click "Gỡ khỏi danh sách đọc"
    const removeBtn = screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i });
    fireEvent.click(removeBtn);

    // 5. Verify immediate UI cleanup
    await waitFor(() => {
      expect(within(shelf).queryByText(/Missing Book/i)).toBeNull();
      expect(screen.getByTestId("summary-in-progress-count").textContent).toContain("1");
    });

    // 6. SIMULATE REFRESH / APP RESTART: Unmount component completely, clear RAM store, then remount cleanly
    unmount();
    clearGlobalStore();

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // 7. Post-refresh assertion:
    // Recent shelf MUST NOT restore Missing Book
    const remountedShelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(remountedShelf).getByText(/Healthy Book/i)).toBeInTheDocument();
      expect(within(remountedShelf).queryByText(/Missing Book/i)).toBeNull();
    });

    // In-progress count MUST remain 1 (not restored to 2)
    const remountedBadge = await screen.findByTestId("summary-in-progress-count");
    expect(remountedBadge.textContent).toContain("1");

    // Drilldown MUST NOT contain Missing Book after refresh
    fireEvent.click(remountedBadge);
    const remountedDrilldown = await screen.findByTestId("reading-analytics-drilldown");
    expect(within(remountedDrilldown).queryByText(/Missing Book/i)).toBeNull();
    expect(within(remountedDrilldown).getByText(/Healthy Book/i)).toBeInTheDocument();
  });

  // ── Test 12: FAILING TEST — Path/alias mismatch causes backend to skip delete and rehydrate on refresh ──

  it("12. FAILING TEST: When a broken EPUB is identified by path/alias, deleting history must clear persisted archive record and NOT rehydrate old position after refresh", async () => {
    currentArchiveDocs = [brokenEpubArchiveDoc, healthyEpubArchiveDoc, brokenPathEpubArchiveDoc];
    currentDocItems = [brokenEpubDocItem, healthyEpubDocItem, brokenPathEpubDocItem];

    const { unmount } = render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" initialPath="books/broken_path.epub" />
      </DataProvider>
    );

    // Initial check: Broken Path Book is on shelf and in in-progress (total 3 in-progress)
    const shelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(shelf).getByText(/Broken Path Book/i)).toBeInTheDocument();
    });

    const inProgressBadge = await screen.findByTestId("summary-in-progress-count");
    expect(inProgressBadge.textContent).toContain("3");

    // Reader is open with initialPath="books/broken_path.epub", encounters 404

    // Reader enters error state with 404
    await waitFor(
      () => {
        expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click "Gỡ khỏi danh sách đọc"
    const removeBtn = screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i });
    fireEvent.click(removeBtn);

    // Immediate UI cleanup works due to frontend deletedHistoryIds state
    await waitFor(() => {
      expect(within(shelf).queryByText(/Broken Path Book/i)).toBeNull();
      expect(screen.getByTestId("summary-in-progress-count").textContent).toContain("2");
    });

    // SIMULATE F5 / APP REFRESH: Unmount completely, reset in-memory RAM store, and remount cleanly
    unmount();
    clearGlobalStore();

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // CRITICAL PERSISTENCE ASSERTION:
    // After refresh, the backend MUST NOT have retained the broken position.
    // If backend skipped DELETE because documentId was an alias (not UUID),
    // Broken Path Book will re-appear on the remounted shelf and count will be 3!
    const remountedShelf = await screen.findByTestId("recent-reads-shelf");
    await waitFor(() => {
      expect(within(remountedShelf).queryByText(/Broken Path Book/i)).toBeNull();
    });

    const remountedBadge = await screen.findByTestId("summary-in-progress-count");
    expect(remountedBadge.textContent).toContain("2");
  });
});
