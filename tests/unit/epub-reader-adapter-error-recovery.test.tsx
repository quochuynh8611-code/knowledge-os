/**
 * Unit tests: EpubReaderAdapter — Error Recovery Contract
 *
 * Test-first (RED) for Phase R4a — Broken Session Recovery.
 * Verifies that when EpubReaderAdapter encounters HTTP 404 or permanent
 * missing-file error, it exposes recovery actions beyond just "Thử lại".
 *
 * Hermetic guard: All fetch calls are intercepted by vi.fn() mocks.
 * No live HTTP calls are made to localhost:3000.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EpubReaderAdapter } from "../../src/components/reader/adapters/EpubReaderAdapter";

// Mock react-reader (never reached in 404 scenarios)
vi.mock("react-reader", () => ({
  ReactReader: vi.fn(() => <div data-testid="react-reader-mock">ReactReader Mock</div>),
}));

// Mock epubXhtmlSanitizer (never reached in 404 scenarios)
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("EpubReaderAdapter — Error Recovery Contract (RED Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: HTTP 404 must expose "Đóng" and "Gỡ khỏi danh sách đọc" buttons ──

  it("1. When fetch returns HTTP 404, errorFallback renders 'Đóng' and 'Gỡ khỏi danh sách đọc' buttons in addition to 'Thử lại'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <EpubReaderAdapter
        fileUrl="/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fmissing.epub"
        documentId="doc-missing-epub-001"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    // Wait for error fallback to render
    await waitFor(() => {
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument();
    });

    // Contract: "Thử lại" must still be present
    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeInTheDocument();

    // Contract: "Đóng trình đọc" must be present (NEW)
    expect(screen.getByRole("button", { name: /Đóng trình đọc/i })).toBeInTheDocument();

    // Contract: "Gỡ khỏi danh sách đọc" must be present (NEW)
    expect(
      screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i })
    ).toBeInTheDocument();
  });

  // ── Test 2: "Đóng trình đọc" calls onClose without triggering onRemoveBrokenSession ──

  it("2. Clicking 'Đóng trình đọc' calls onClose but NOT onRemoveBrokenSession", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <EpubReaderAdapter
        fileUrl="/api/obsidian/vault/attachment?path=missing.epub"
        documentId="doc-missing-epub-002"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Đóng trình đọc/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRemoveBrokenSession).not.toHaveBeenCalled();
  });

  // ── Test 3: "Gỡ khỏi danh sách đọc" calls onRemoveBrokenSession with documentId ──

  it("3. Clicking 'Gỡ khỏi danh sách đọc' calls onRemoveBrokenSession with the correct documentId", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const onClose = vi.fn();
    const onRemoveBrokenSession = vi.fn();

    render(
      <EpubReaderAdapter
        fileUrl="/api/obsidian/vault/attachment?path=missing.epub"
        documentId="doc-missing-epub-003"
        onClose={onClose}
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i }));

    expect(onRemoveBrokenSession).toHaveBeenCalledTimes(1);
    expect(onRemoveBrokenSession).toHaveBeenCalledWith(
      "doc-missing-epub-003",
      expect.stringContaining("404")
    );
  });

  // ── Test 4: HTML payload error also shows recovery actions (permanent error) ──

  it("4. When fetch returns HTML payload instead of EPUB binary, errorFallback also shows 'Gỡ khỏi danh sách đọc'", async () => {
    const htmlPayload = new TextEncoder().encode(
      "<!DOCTYPE html><html><body>Not Found</body></html>"
    ).buffer;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: { get: (h: string) => (h === "content-type" ? "text/html; charset=utf-8" : null) },
      arrayBuffer: async () => htmlPayload,
    });

    const onRemoveBrokenSession = vi.fn();

    render(
      <EpubReaderAdapter
        fileUrl="/api/docs/raw?path=missing.epub"
        documentId="doc-html-payload-004"
        onRemoveBrokenSession={onRemoveBrokenSession}
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    // Recovery button must appear for HTML payload errors (permanent mismatch)
    expect(
      screen.getByRole("button", { name: /Gỡ khỏi danh sách đọc/i })
    ).toBeInTheDocument();
  });

  // ── Test 5: Transient error (503 / network) still shows "Thử lại" as primary ──

  it("5. For transient HTTP 503, 'Thử lại' is present; recovery buttons are conditional on error type", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    render(
      <EpubReaderAdapter
        fileUrl="/api/docs/raw?path=some-epub.epub"
        documentId="doc-transient-error-005"
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    // "Thử lại" must always be present
    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeInTheDocument();
  });

  // ── Test 6: onClose and onRemoveBrokenSession are optional — no crash without them ──

  it("6. EpubReaderAdapter does not crash when onClose and onRemoveBrokenSession are not provided", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    render(
      <EpubReaderAdapter
        fileUrl="/api/obsidian/vault/attachment?path=missing.epub"
        documentId="doc-no-callbacks-006"
        // No onClose, no onRemoveBrokenSession
      />
    );

    await waitFor(() =>
      expect(screen.getByText(/Không đọc được file EPUB này/i)).toBeInTheDocument()
    );

    // Must not throw when clicking buttons with no callback wired up
    // "Gỡ khỏi danh sách đọc" is only shown if onRemoveBrokenSession is provided
    // but "Thử lại" is always shown
    expect(screen.getByRole("button", { name: /Thử lại/i })).toBeInTheDocument();
  });
});
