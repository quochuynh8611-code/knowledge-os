/**
 * Unit Tests: Core PDF Text-Layer Engine (Phase 4 — Chặng 4A)
 *
 * Covers:
 * 1. filterExcerptsForPdfPage (page-scoped filtering & legacy fallback)
 * 2. applyPdfTextLayerHighlights (DOM mark wrapping, active highlighting, disambiguation, cleanup)
 * 3. extractSelectionWithContextFromContainer (prefix/suffix extraction from Range)
 * 4. extractPdfPageText & extractPdfOutline (LRU cache, mock loader, fail-closed handling)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  filterExcerptsForPdfPage,
  applyPdfTextLayerHighlights,
  extractSelectionWithContextFromContainer,
  extractPdfPageText,
  extractPdfOutline,
  clearPdfTextCache,
  type PdfPageTextContent,
} from "../../src/lib/pdfTextLayerEngine";
import type { ResearchExcerpt } from "../../src/types";

describe("Core PDF Text-Layer Engine (Phase 4A)", () => {
  beforeEach(() => {
    clearPdfTextCache();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  describe("filterExcerptsForPdfPage", () => {
    const mockExcerpts: ResearchExcerpt[] = [
      {
        id: "ex-p1",
        archivedDocumentId: "doc-1",
        status: "active",
        selectedText: "Giới thiệu chung về hệ thống",
        positionSelector: { pageNumber: 1 },
        highlightColor: "#fef08a",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "ex-p2-a",
        archivedDocumentId: "doc-1",
        status: "active",
        selectedText: "Định luật bảo toàn năng lượng",
        contextPrefix: "Trong vật lý học, ",
        contextSuffix: " phát biểu rằng năng lượng không tự sinh ra.",
        positionSelector: { pageNumber: 2 },
        highlightColor: "#bbf7d0",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "ex-p2-legacy",
        archivedDocumentId: "doc-1",
        status: "active",
        selectedText: "Năng lượng cơ học",
        positionSelector: {}, // No pageNumber (legacy)
        highlightColor: "#bae6fd",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "ex-p3",
        archivedDocumentId: "doc-1",
        status: "active",
        selectedText: "Kết luận và tài liệu tham khảo",
        positionSelector: { pageNumber: 3 },
        highlightColor: "#fecdd3",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      },
    ];

    it("filters excerpts strictly belonging to current page", () => {
      const page1Excerpts = filterExcerptsForPdfPage(mockExcerpts, 1);
      expect(page1Excerpts).toHaveLength(1);
      expect(page1Excerpts[0].id).toBe("ex-p1");

      const page3Excerpts = filterExcerptsForPdfPage(mockExcerpts, 3);
      expect(page3Excerpts).toHaveLength(1);
      expect(page3Excerpts[0].id).toBe("ex-p3");
    });

    it("includes legacy excerpts without pageNumber if their text is found on the current page", () => {
      const page2Text = "Trong vật lý học, Định luật bảo toàn năng lượng phát biểu rằng năng lượng không tự sinh ra. Năng lượng cơ học được bảo toàn.";
      const page2Excerpts = filterExcerptsForPdfPage(mockExcerpts, 2, page2Text);

      expect(page2Excerpts).toHaveLength(2);
      expect(page2Excerpts.map((e) => e.id)).toEqual(["ex-p2-a", "ex-p2-legacy"]);
    });

    it("excludes legacy excerpts if their text does not exist on the current page", () => {
      const page2Text = "Chỉ có Định luật bảo toàn năng lượng mà không có đoạn khác.";
      const page2Excerpts = filterExcerptsForPdfPage(mockExcerpts, 2, page2Text);

      expect(page2Excerpts).toHaveLength(1);
      expect(page2Excerpts[0].id).toBe("ex-p2-a");
    });
  });

  describe("applyPdfTextLayerHighlights & Cleanup", () => {
    it("wraps matching text in <mark> elements with metadata and active state", () => {
      const container = document.createElement("div");
      container.className = "pdf-text-layer";
      container.innerHTML = `
        <span class="line-1">Trong vật lý học, </span>
        <span class="line-2">Định luật bảo toàn năng lượng</span>
        <span class="line-3"> phát biểu rằng năng lượng không tự sinh ra.</span>
      `;
      document.body.appendChild(container);

      const excerpts: ResearchExcerpt[] = [
        {
          id: "hl-1",
          archivedDocumentId: "doc-1",
          status: "active",
          selectedText: "Định luật bảo toàn năng lượng",
          contextPrefix: "Trong vật lý học, ",
          contextSuffix: " phát biểu rằng",
          positionSelector: { pageNumber: 2 },
          highlightColor: "#bbf7d0",
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      ];

      const cleanup = applyPdfTextLayerHighlights({
        container,
        excerpts,
        activeExcerptId: "hl-1",
        currentPage: 2,
      });

      const mark = container.querySelector("mark[data-highlight-id='hl-1']");
      expect(mark).not.toBeNull();
      expect(mark?.getAttribute("data-highlight-color")).toBe("#bbf7d0");
      expect(mark?.getAttribute("data-pdf-page")).toBe("2");
      expect(mark?.getAttribute("data-active")).toBe("true");
      expect(mark?.className).toContain("ring-2 ring-amber-500");
      expect(mark?.textContent).toBe("Định luật bảo toàn năng lượng");

      // Verify cleanup cleans DOM marks completely
      cleanup();
      expect(container.querySelectorAll("mark")).toHaveLength(0);
      expect(container.textContent).toContain("Định luật bảo toàn năng lượng");
    });

    it("disambiguates repeated words on the same page using contextPrefix and contextSuffix", () => {
      const container = document.createElement("div");
      container.className = "pdf-text-layer";
      container.innerHTML = `
        <p>Đoạn 1 nhắc đến khái niệm Chánh Kiến trong Bát Chánh Đạo.</p>
        <p>Đoạn 2 nhắc lại Chánh Kiến nhưng trong phần Tứ Diệu Đế.</p>
      `;
      document.body.appendChild(container);

      // Target second instance of "Chánh Kiến"
      const excerpts: ResearchExcerpt[] = [
        {
          id: "hl-second",
          archivedDocumentId: "doc-1",
          status: "active",
          selectedText: "Chánh Kiến",
          contextPrefix: "Đoạn 2 nhắc lại ",
          contextSuffix: " nhưng trong phần Tứ Diệu Đế",
          positionSelector: { pageNumber: 5 },
          highlightColor: "#bae6fd",
          createdAt: "2026-10-01T00:00:00.000Z",
          updatedAt: "2026-10-01T00:00:00.000Z",
        },
      ];

      applyPdfTextLayerHighlights({
        container,
        excerpts,
        currentPage: 5,
      });

      const marks = container.querySelectorAll("mark[data-highlight-id='hl-second']");
      expect(marks).toHaveLength(1);
      // The mark must be inside the second paragraph
      const secondP = container.querySelectorAll("p")[1];
      expect(secondP.querySelector("mark")).not.toBeNull();
      const firstP = container.querySelectorAll("p")[0];
      expect(firstP.querySelector("mark")).toBeNull();
    });
  });

  describe("extractSelectionWithContextFromContainer", () => {
    it("extracts selectedText, contextPrefix, and contextSuffix from window selection within container", () => {
      const container = document.createElement("div");
      container.innerHTML = "<p>Đầu câu mở đầu. Giữa câu là nội dung cần trích đoạn nghiên cứu. Cuối câu kết thúc.</p>";
      document.body.appendChild(container);

      const p = container.querySelector("p")!;
      const textNode = p.firstChild as Text;

      // Select "nội dung cần trích đoạn nghiên cứu"
      const fullStr = textNode.data;
      const targetStr = "nội dung cần trích đoạn nghiên cứu";
      const startIdx = fullStr.indexOf(targetStr);
      const endIdx = startIdx + targetStr.length;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const result = extractSelectionWithContextFromContainer(container, 30);
      expect(result).not.toBeNull();
      expect(result?.selectedText).toBe(targetStr);
      expect(result?.contextPrefix).toContain("Giữa câu là");
      expect(result?.contextSuffix).toContain("Cuối câu");
    });

    it("returns null when selection is collapsed or outside container", () => {
      const container = document.createElement("div");
      container.innerHTML = "<p>Nội dung trong container</p>";
      document.body.appendChild(container);

      const outside = document.createElement("div");
      outside.innerHTML = "<p>Nội dung bên ngoài container</p>";
      document.body.appendChild(outside);

      const textNode = outside.querySelector("p")!.firstChild as Text;
      const range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      const result = extractSelectionWithContextFromContainer(container);
      expect(result).toBeNull();
    });
  });

  describe("extractPdfPageText & extractPdfOutline (Fail-Closed & Loader Integration)", () => {
    it("extracts page text using a loader implementation and caches result", async () => {
      const mockLoader = vi.fn().mockResolvedValue({
        pageNumber: 2,
        fullText: "Trang 2: Kiến trúc phần mềm phân tán.",
        paragraphs: ["Trang 2: Kiến trúc phần mềm phân tán."],
        totalPages: 10,
      } as PdfPageTextContent);

      const res1 = await extractPdfPageText("/docs/test.pdf", 2, mockLoader);
      expect(res1.pageNumber).toBe(2);
      expect(res1.fullText).toBe("Trang 2: Kiến trúc phần mềm phân tán.");
      expect(mockLoader).toHaveBeenCalledTimes(1);

      // Second call must hit LRU cache and not invoke loader again
      const res2 = await extractPdfPageText("/docs/test.pdf", 2, mockLoader);
      expect(res2.fullText).toBe("Trang 2: Kiến trúc phần mềm phân tán.");
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it("fails closed safely without throwing when loader throws an error or url is invalid", async () => {
      const failingLoader = vi.fn().mockRejectedValue(new Error("Network 404 Not Found"));

      const res = await extractPdfPageText("/docs/missing.pdf", 1, failingLoader);
      expect(res.pageNumber).toBe(1);
      expect(res.fullText).toBe("");
      expect(res.paragraphs).toEqual([]);
      expect(res.totalPages).toBe(0);
    });

    it("extracts outline via custom loader or returns empty array on failure", async () => {
      const mockOutlineLoader = vi.fn().mockResolvedValue([
        { id: "toc-1", label: "Chương 1: Mở đầu", title: "Chương 1: Mở đầu", level: 1, page: 1 },
        { id: "toc-2", label: "Chương 2: Kiến trúc", title: "Chương 2: Kiến trúc", level: 1, page: 5 },
      ]);

      const outline = await extractPdfOutline("/docs/test.pdf", mockOutlineLoader);
      expect(outline).toHaveLength(2);
      expect(outline[0].title).toBe("Chương 1: Mở đầu");

      // Failing outline loader returns []
      const failingOutlineLoader = vi.fn().mockRejectedValue(new Error("Corrupted outline"));
      const emptyOutline = await extractPdfOutline("/docs/corrupted.pdf", failingOutlineLoader);
      expect(emptyOutline).toEqual([]);
    });
  });
});
