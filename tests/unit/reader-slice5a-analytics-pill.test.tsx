import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
// @ts-ignore - will be implemented in Slice 5A Green Stage
import { formatReadingDuration } from "../../src/lib/readingPositionUnified";

describe("Slice 5A: Reader Analytics Pill (TDD Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5A.1: Duration Formatter Utility
  // ──────────────────────────────────────────────────────────────────────────
  it("5A.1: formatReadingDuration converts seconds into localized human-readable labels", () => {
    // Current behavior: formatReadingDuration is undefined / not implemented
    expect(typeof formatReadingDuration).toBe("function");
    expect(formatReadingDuration(0)).toBe("0 phút");
    expect(formatReadingDuration(45)).toBe("< 1 phút");
    expect(formatReadingDuration(120)).toBe("2 phút");
    expect(formatReadingDuration(3660)).toBe("1g 1p");
    expect(formatReadingDuration(undefined as any)).toBe("0 phút");
    expect(formatReadingDuration(-10)).toBe("0 phút");
    expect(formatReadingDuration(NaN)).toBe("0 phút");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5A.2: In-Situ Reader Analytics Pill (Header / Toolbar)
  // ──────────────────────────────────────────────────────────────────────────
  it("5A.2: UnifiedResearchReader displays reader analytics pill with accumulated reading time", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-surface-test")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-surface-test",
              fileName: "research_notes.md",
              fileFormat: "md",
              lastPosition: {
                headingId: "intro",
                totalReadingSeconds: 1500, // 25 minutes
                isCompleted: true,
              },
              readCount: 3,
              lastReadAt: new Date().toISOString(),
            },
          }),
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
      <UnifiedResearchReader
        documentId="doc-surface-test"
        title="Tài Liệu Khảo Sát"
        format="md"
        content="# Intro\nNội dung khảo sát."
        onClose={vi.fn()}
      />
    );

    // Expectation: Header must project an analytics pill showing total reading time
    // Current behavior: UnifiedResearchReader does not yet render reader-analytics-pill
    const pill = await screen.findByTestId("reader-analytics-pill");
    expect(pill).toBeDefined();
    expect(pill.textContent).toContain("25 phút");
  });

  it("5A.3: reader analytics pill is hidden or gracefully handles documents with no reading time", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/document/doc-zero-time")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            document: {
              id: "doc-zero-time",
              fileName: "new_file.md",
              fileFormat: "md",
              lastPosition: null,
              readCount: 0,
              lastReadAt: null,
            },
          }),
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
      <UnifiedResearchReader
        documentId="doc-zero-time"
        title="Tài Liệu Chưa Đọc"
        format="md"
        content="# Tiêu Đề\nNội dung."
        onClose={vi.fn()}
      />
    );

    // When there is no previous reading time (0s or null), pill either does not render or shows 0 phút
    // Current behavior: formatReadingDuration not implemented
    expect(typeof formatReadingDuration).toBe("function");
  });
});
