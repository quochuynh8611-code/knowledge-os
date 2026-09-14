import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  sanitizeEpubXhtml,
  sanitizeEpubArchive,
  HTML_ENTITY_MAP,
} from "../../src/lib/epubXhtmlSanitizer";

describe("epubXhtmlSanitizer", () => {
  describe("sanitizeEpubXhtml", () => {
    it("converts &times; to ×", () => {
      expect(sanitizeEpubXhtml("<p>5 &times; 10 = 50</p>")).toBe("<p>5 × 10 = 50</p>");
    });

    it("converts &nbsp; to non-breaking space", () => {
      expect(sanitizeEpubXhtml("<p>Xin&nbsp;chào</p>")).toBe("<p>Xin\u00A0chào</p>");
    });

    it("converts &copy; to ©", () => {
      expect(sanitizeEpubXhtml("<p>&copy; 2026 An Yên Stone</p>")).toBe("<p>© 2026 An Yên Stone</p>");
    });

    it("converts &mdash; and &ndash; to dashes", () => {
      expect(sanitizeEpubXhtml("<p>A &mdash; B &ndash; C</p>")).toBe("<p>A — B – C</p>");
    });

    it("converts curly quotes &ldquo;, &rdquo;, &lsquo;, &rsquo;", () => {
      expect(sanitizeEpubXhtml("<p>&ldquo;Trích dẫn&rdquo; và &lsquo;đơn&rsquo;</p>")).toBe(
        "<p>“Trích dẫn” và ‘đơn’</p>"
      );
    });

    it("preserves standard XML entities &amp;, &lt;, &gt;, &quot;, &apos;", () => {
      const xml = '<div id="1" title="&quot;test&apos;s&quot;">&lt;tag&gt; &amp; more</div>';
      expect(sanitizeEpubXhtml(xml)).toBe(xml);
    });

    it("preserves numeric decimal and hex entities", () => {
      const numeric = "<p>&#123; and &#x1F600; and &#160;</p>";
      expect(sanitizeEpubXhtml(numeric)).toBe(numeric);
    });

    it("does not corrupt URLs, CSS, HTML attributes and Vietnamese text", () => {
      const complex = `
        <html xmlns="http://www.w3.org/1999/xhtml">
          <head>
            <style>body { font-family: "Segoe UI", sans-serif; }</style>
          </head>
          <body>
            <a href="https://example.com/search?page=1&amp;limit=10" class="btn">Đại Niệm Xứ &mdash; Thiền Sư U Silananda</a>
            <p>Khổ &times; Tập &times; Diệt &times; Đạo</p>
          </body>
        </html>
      `;
      const result = sanitizeEpubXhtml(complex);
      expect(result).toContain("https://example.com/search?page=1&amp;limit=10");
      expect(result).toContain("Đại Niệm Xứ — Thiền Sư U Silananda");
      expect(result).toContain("Khổ × Tập × Diệt × Đạo");
    });

    it("handles unknown entities safely without crashing", () => {
      expect(sanitizeEpubXhtml("<p>&unknownCustomEntity; text</p>")).toBe(
        "<p>&unknownCustomEntity; text</p>"
      );
    });

    it("does not mutate or double-convert already sanitized text", () => {
      const pass1 = sanitizeEpubXhtml("<p>5 &times; 10 = 50 &amp; &copy; 2026</p>");
      const pass2 = sanitizeEpubXhtml(pass1);
      expect(pass1).toBe("<p>5 × 10 = 50 &amp; © 2026</p>");
      expect(pass2).toBe(pass1);
    });
  });

  describe("sanitizeEpubArchive", () => {
    it("sanitizes XHTML entries inside a zip archive and fixes XML parser errors", async () => {
      const zip = new JSZip();
      const invalidXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>Chương 1</title></head>
  <body>
    <h1>So Sánh Kinh 66 &times; 12 Nhân Duyên</h1>
    <p>Bản quyền &copy; &mdash; &ldquo;Giác Khang&rdquo;</p>
  </body>
</html>`;

      zip.file("mimetype", "application/epub+zip");
      zip.file("OEBPS/content.opf", "<package></package>");
      zip.file("OEBPS/chapter1.xhtml", invalidXhtml);

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const sanitizedBuffer = await sanitizeEpubArchive(buffer);

      const resultZip = await JSZip.loadAsync(sanitizedBuffer);
      const sanitizedContent = await resultZip.file("OEBPS/chapter1.xhtml")?.async("text");

      expect(sanitizedContent).toBeDefined();
      expect(sanitizedContent).toContain("So Sánh Kinh 66 × 12 Nhân Duyên");
      expect(sanitizedContent).toContain("Bản quyền © — “Giác Khang”");
      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedContent!, "application/xhtml+xml");
      const parserError = doc.querySelector("parsererror");
      expect(parserError).toBeNull();
    });

    it("sanitizes the standalone synthetic fixture invalid-named-entity.epub from disk", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const fixturePath = path.resolve(process.cwd(), "tests/fixtures/invalid-named-entity.epub");

      expect(fs.existsSync(fixturePath)).toBe(true);
      const rawBuffer = fs.readFileSync(fixturePath);
      const sanitizedBuffer = await sanitizeEpubArchive(rawBuffer);

      const resultZip = await JSZip.loadAsync(sanitizedBuffer);
      const sanitizedContent = await resultZip.file("OEBPS/chapter1.xhtml")?.async("text");

      expect(sanitizedContent).toBeDefined();
      expect(sanitizedContent).toContain("EPUB entity regression × chapter");
      expect(sanitizedContent).toContain("5 × 10 = 50");
      expect(sanitizedContent).toContain("© 2026 Test Suite — All rights reserved.");
      expect(sanitizedContent).not.toContain("&times;");
      expect(sanitizedContent).not.toContain("&copy;");
      expect(sanitizedContent).not.toContain("&mdash;");

      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedContent!, "application/xhtml+xml");
      const parserError = doc.querySelector("parsererror");
      expect(parserError).toBeNull();
    });
  });
});
