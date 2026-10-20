/**
 * Unit tests: UnifiedResearchReader — Broken Session Auto-Persist Guard
 *
 * Verifies that when EpubReaderAdapter reports a broken session (404/missing):
 * 1. Does NOT fire the openTimer PATCH (lastReadAt) request.
 * 2. Does NOT fire keepalive persist on close.
 * 3. Properly propagates onRemoveBrokenSession up through to parent.
 * 4. Healthy session continues to persist on close as expected.
 *
 * Hermetic guard: All fetch calls are intercepted by vi.fn() mocks.
 * No live HTTP calls to localhost:3000.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
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

describe("UnifiedResearchReader — Broken Session Auto-Persist Guard", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalStore();

    // Default mock: 404 for attachment, 200 for everything else
    fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as any;
    });
  });

  // ── Test 1: openTimer must NOT fire PATCH /position when EPUB fails with 404 ──

  it("1. When EPUB 404 error occurs, open-timer PATCH /position is cancelled and NOT sent", async () => {
    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <UnifiedResearchReader
        documentId="doc-epub-broken-001"
        title="Sách Bị Mất"
        format="epub"
        fileUrl="/api/obsidian/vault/attachment?path=missing.epub"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    // Wait for error state to display (EpubReaderAdapter shows error fallback)
    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    // Wait 300ms to allow any potential openTimer (200ms) to fire if not properly cancelled
    await new Promise((r) => setTimeout(r, 300));

    // Contract: No PATCH /position request must have been made
    const patchCalls = fetchSpy.mock.calls.filter(
      (call) =>
        String(call[0]).includes("/api/archive/document/doc-epub-broken-001/position") &&
        (call[1] as any)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });

  // ── Test 2: Closing from broken state must NOT call persistPosition (no keepalive save) ──

  it("2. Closing reader from broken-EPUB error state does NOT send keepalive PATCH /position", async () => {
    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <UnifiedResearchReader
        documentId="doc-epub-broken-002"
        title="Sách Bị Mất 2"
        format="epub"
        fileUrl="/api/obsidian/vault/attachment?path=also-missing.epub"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    // Wait for error state to render
    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    // Click "Đóng trình đọc" from error fallback
    const closeBtn = screen.getByRole("button", { name: /Đóng trình đọc/i });
    fireEvent.click(closeBtn);

    // Wait a tick for close logic
    await new Promise((r) => setTimeout(r, 50));

    // Contract: onClose must be called
    expect(onClose).toHaveBeenCalledTimes(1);

    // Contract: No PATCH /position request must have been made at all
    const patchCalls = fetchSpy.mock.calls.filter(
      (call) =>
        String(call[0]).includes("/api/archive/document/doc-epub-broken-002/position") &&
        (call[1] as any)?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  });

  // ── Test 3: onRemoveBrokenSession is forwarded from Adapter through Reader to parent ──

  it("3. Clicking 'Gỡ khỏi danh sách đọc' triggers the parent onRemoveBrokenSession callback", async () => {
    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <UnifiedResearchReader
        documentId="doc-epub-broken-003"
        title="Sách Bị Mất 3"
        format="epub"
        fileUrl="/api/obsidian/vault/attachment?path=gone.epub"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i }));

    // Contract: onRemoveBrokenSession must be called with the documentId
    expect(onRemoveBrokenSession).toHaveBeenCalledTimes(1);
    expect(onRemoveBrokenSession).toHaveBeenCalledWith("doc-epub-broken-003");
  });

  // ── Test 4: Normal close from a healthy EPUB session still persists position ──

  it("4. Closing a healthy EPUB reader still triggers keepalive persist PATCH /position", async () => {
    // Override fetch: attachment returns valid EPUB data (not 404)
    fetchSpy.mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return {
          ok: true,
          status: 200,
          headers: { get: (h: string) => (h === "content-type" ? "application/epub+zip" : null) },
          arrayBuffer: async () => new ArrayBuffer(100),
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        headers: { get: () => "application/json" },
      } as any;
    });

    const onClose = vi.fn();

    render(
      <UnifiedResearchReader
        documentId="doc-epub-healthy-004"
        title="Sách Lành Mạnh"
        format="epub"
        fileUrl="/api/obsidian/vault/attachment?path=good.epub"
        onClose={onClose}
      />
    );

    // Wait for reader mock to mount
    await waitFor(() =>
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument()
    );

    // Click the standard close button from the toolbar
    const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
    fireEvent.click(closeBtn);

    // Contract: onClose must be called
    expect(onClose).toHaveBeenCalledTimes(1);

    // Contract: PATCH /position must have been called (normal persist on close)
    await waitFor(() => {
      const patchCalls = fetchSpy.mock.calls.filter(
        (call) =>
          String(call[0]).includes("/api/archive/document/doc-epub-healthy-004/position") &&
          (call[1] as any)?.method === "PATCH"
      );
      expect(patchCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
