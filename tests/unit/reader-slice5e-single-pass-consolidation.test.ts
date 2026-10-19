import { describe, it, expect, vi } from "vitest";
import {
  calculateReadingAnalyticsSummary,
  calculateReadingAnalyticsBreakdown,
  ReadingAnalyticsSummary,
  ReadingAnalyticsBreakdown,
} from "../../src/lib/readingPositionUnified";

describe("Slice 5E: Single-Pass Reading Analytics Helper Consolidation (TDD RED Stage)", () => {
  const sampleDocs = [
    {
      id: "doc-1",
      fileName: "intro.epub",
      lastPosition: {
        totalReadingSeconds: 300,
        percentage: 25,
        isCompleted: false,
      },
    },
    {
      id: "doc-2",
      fileName: "guide.epub",
      lastPosition: {
        totalReadingSeconds: 1200,
        percentage: 100,
        isCompleted: true,
      },
    },
    {
      id: "doc-3",
      fileName: "reference.md",
      lastPosition: {
        totalReadingSeconds: 0,
        percentage: 50,
        isCompleted: false,
        headingId: "sec-1",
      },
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // 5E.1: Single-Pass Execution Invariant (RED on un-refactored O(2N) code)
  // ──────────────────────────────────────────────────────────────────────────
  describe("5E.1: Single-Pass Execution Invariant", () => {
    it("should iterate through documents exactly once in a single pass without duplicate property inspection", () => {
      let lastPositionAccessCount = 0;

      // Wrap documents in proxies to count property access
      const trackedDocs = sampleDocs.map((doc) => {
        return new Proxy(doc, {
          get(target, prop, receiver) {
            if (prop === "lastPosition") {
              lastPositionAccessCount++;
            }
            return Reflect.get(target, prop, receiver);
          },
        });
      });

      const breakdown = calculateReadingAnalyticsBreakdown(trackedDocs);

      expect(breakdown.totalDocsRead).toBe(3);
      expect(breakdown.completedCount).toBe(1);
      expect(breakdown.inProgressCount).toBe(2);

      // On current O(2N) implementation, lastPosition is accessed twice per doc (once by calculateReadingAnalyticsSummary, once by breakdown loop)
      // On consolidated single-pass implementation, it MUST be accessed exactly once per doc.
      expect(lastPositionAccessCount).toBe(trackedDocs.length);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5E.2: Full Contract & Structural Parity
  // ──────────────────────────────────────────────────────────────────────────
  describe("5E.2: Contract & Structural Parity between Summary and Breakdown", () => {
    it("should produce perfectly identical core summary metrics between calculateReadingAnalyticsSummary and calculateReadingAnalyticsBreakdown", () => {
      const summary: ReadingAnalyticsSummary = calculateReadingAnalyticsSummary(sampleDocs);
      const breakdown: ReadingAnalyticsBreakdown = calculateReadingAnalyticsBreakdown(sampleDocs);

      expect(summary.totalReadingSeconds).toBe(breakdown.totalReadingSeconds);
      expect(summary.completedCount).toBe(breakdown.completedCount);
      expect(summary.inProgressCount).toBe(breakdown.inProgressCount);
      expect(summary.totalDocsRead).toBe(breakdown.totalDocsRead);

      expect(breakdown.totalReadingSeconds).toBe(1500);
      expect(breakdown.completedCount).toBe(1);
      expect(breakdown.inProgressCount).toBe(2);
      expect(breakdown.totalDocsRead).toBe(3);
      expect(breakdown.completionRate).toBe(33);
      expect(breakdown.completedDocIds).toEqual(["doc-2"]);
      expect(breakdown.inProgressDocIds).toEqual(["doc-1", "doc-3"]);
    });

    it("should preserve input document order in completedDocIds and inProgressDocIds", () => {
      const orderedDocs = [
        { id: "alpha", lastPosition: { isCompleted: true } },
        { id: "beta", lastPosition: { percentage: 10, isCompleted: false } },
        { id: "gamma", lastPosition: { isCompleted: true } },
        { id: "delta", lastPosition: { totalReadingSeconds: 60, isCompleted: false } },
      ];

      const breakdown = calculateReadingAnalyticsBreakdown(orderedDocs);
      expect(breakdown.completedDocIds).toEqual(["alpha", "gamma"]);
      expect(breakdown.inProgressDocIds).toEqual(["beta", "delta"]);
    });

    it("should evaluate ID fallback precedence consistently: id > sourceKey > storageRelPath > fileName > sourcePath", () => {
      const docsWithFallbackIds = [
        { sourceKey: "sk-1", lastPosition: { isCompleted: true } },
        { storageRelPath: "path/doc.epub", lastPosition: { totalReadingSeconds: 10, isCompleted: false } },
        { fileName: "file.md", lastPosition: { isCompleted: true } },
        { sourcePath: "vault/note.md", lastPosition: { percentage: 20, isCompleted: false } },
      ];

      const breakdown = calculateReadingAnalyticsBreakdown(docsWithFallbackIds);
      expect(breakdown.completedDocIds).toEqual(["sk-1", "file.md"]);
      expect(breakdown.inProgressDocIds).toEqual(["path/doc.epub", "vault/note.md"]);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5E.3: Edge Cases, Nullability & Zero-Default Resilience
  // ──────────────────────────────────────────────────────────────────────────
  describe("5E.3: Zero-Default & Edge Cases", () => {
    it("should return zeroed objects for undefined, null, or empty array", () => {
      const emptySummary = calculateReadingAnalyticsSummary(undefined);
      const emptyBreakdown = calculateReadingAnalyticsBreakdown(undefined);

      expect(emptySummary).toEqual({
        totalReadingSeconds: 0,
        completedCount: 0,
        inProgressCount: 0,
        totalDocsRead: 0,
      });

      expect(emptyBreakdown).toEqual({
        totalReadingSeconds: 0,
        completedCount: 0,
        inProgressCount: 0,
        totalDocsRead: 0,
        completionRate: 0,
        completedDocIds: [],
        inProgressDocIds: [],
      });
    });

    it("should sanitize negative, NaN, null positions and ignore documents without valid IDs", () => {
      const malformedDocs = [
        { id: "valid-1", lastPosition: { totalReadingSeconds: -999, isCompleted: true } },
        { id: "valid-2", lastPosition: { totalReadingSeconds: NaN, percentage: 50, isCompleted: false } },
        { id: "valid-3", lastPosition: null },
        { lastPosition: { isCompleted: true } }, // missing ID
      ];

      const summary = calculateReadingAnalyticsSummary(malformedDocs);
      const breakdown = calculateReadingAnalyticsBreakdown(malformedDocs);

      expect(summary.completedCount).toBe(breakdown.completedCount);
      expect(summary.inProgressCount).toBe(breakdown.inProgressCount);
      expect(summary.totalDocsRead).toBe(breakdown.totalDocsRead);

      expect(breakdown.completedDocIds).toEqual(["valid-1"]);
      expect(breakdown.inProgressDocIds).toEqual(["valid-2"]);
      expect(breakdown.totalReadingSeconds).toBe(0);
    });
  });
});
