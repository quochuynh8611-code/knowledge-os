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

    it("converts curly quotes &ldquo;, &rdquo;, &lsquo;, &rsquo; and ellipsis &hellip;", () => {
      expect(sanitizeEpubXhtml("<p>&ldquo;Trích dẫn&rdquo; và &lsquo;đơn&rsquo;&hellip;</p>")).toBe(
        "<p>“Trích dẫn” và ‘đơn’…</p>"
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

    it("escapes bare ampersands in text (e.g. Âm & dương, A & B, Fish & Chips)", () => {
      expect(sanitizeEpubXhtml("<p>Âm & dương</p>")).toBe("<p>Âm &amp; dương</p>");
      expect(sanitizeEpubXhtml("<p>A & B</p>")).toBe("<p>A &amp; B</p>");
      expect(sanitizeEpubXhtml("<p>Fish & Chips</p>")).toBe("<p>Fish &amp; Chips</p>");
      expect(sanitizeEpubXhtml("<p>Điều kiện A & B</p>")).toBe("<p>Điều kiện A &amp; B</p>");
    });

    it("escapes bare ampersands in HTML attributes without breaking tags", () => {
      expect(sanitizeEpubXhtml('<a href="index.html?section=1&chapter=2">Link</a>')).toBe(
        '<a href="index.html?section=1&amp;chapter=2">Link</a>'
      );
    });

    it("does not double escape valid XML predefined entities (&amp;, &lt;, &gt;, &quot;, &apos;)", () => {
      const valid = "<p>A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;</p>";
      expect(sanitizeEpubXhtml(valid)).toBe(valid);
    });

    it("does not corrupt XML comments and CDATA sections", () => {
      const xmlWithComments = "<!-- Author: Âm & Dương &times; -->\n<p>Main & text</p>";
      expect(sanitizeEpubXhtml(xmlWithComments)).toBe(
        "<!-- Author: Âm & Dương &times; -->\n<p>Main &amp; text</p>"
      );

      const xmlWithCdata = "<![CDATA[ Code block: a & b < c ]]>\n<p>After & CDATA</p>";
      expect(sanitizeEpubXhtml(xmlWithCdata)).toBe(
        "<![CDATA[ Code block: a & b < c ]]>\n<p>After &amp; CDATA</p>"
      );
    });

    it("safely escapes unknown/unclosed entities without crashing XML parser", () => {
      expect(sanitizeEpubXhtml("<p>&unknownCustomEntity; text</p>")).toBe(
        "<p>&amp;unknownCustomEntity; text</p>"
      );
    });

    it("does not mutate or double-convert already sanitized text", () => {
      const pass1 = sanitizeEpubXhtml("<p>5 &times; 10 = 50 &amp; &copy; 2026 Âm & dương</p>");
      const pass2 = sanitizeEpubXhtml(pass1);
      expect(pass1).toBe("<p>5 × 10 = 50 &amp; © 2026 Âm &amp; dương</p>");
      expect(pass2).toBe(pass1);
    });

    it("preserves literal __XML_PROTECTED_BLOCK_0__ without collision or corruption", () => {
      const input = "<p>Literal __XML_PROTECTED_BLOCK_0__ and __XML_PROTECTED_BLOCK_1__ in text &amp; Âm & dương</p>";
      const output = sanitizeEpubXhtml(input);
      expect(output).toBe("<p>Literal __XML_PROTECTED_BLOCK_0__ and __XML_PROTECTED_BLOCK_1__ in text &amp; Âm &amp; dương</p>");
      expect(output).not.toContain("__KOS_XML_PROTECTED_");
    });

    it("ensures two independent sanitizer calls do not interfere with each other", () => {
      const input1 = "<!-- c1 -->\n<p>Input 1 & times</p>";
      const input2 = "<![CDATA[ c2 ]]>\n<p>Input 2 & times</p>";

      const out1 = sanitizeEpubXhtml(input1);
      const out2 = sanitizeEpubXhtml(input2);

      expect(out1).toBe("<!-- c1 -->\n<p>Input 1 &amp; times</p>");
      expect(out2).toBe("<![CDATA[ c2 ]]>\n<p>Input 2 &amp; times</p>");
      expect(out1).not.toContain("__KOS_XML_PROTECTED_");
      expect(out2).not.toContain("__KOS_XML_PROTECTED_");
    });
  });

  describe("sanitizeEpubArchive & sanitizeEpubArchiveWithReport", () => {
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

    it("strictly preserves raw bytes for OPF, NCX, SVG, CSS, container.xml and binary assets while sanitizing XHTML", async () => {
      const zip = new JSZip();

      const rawXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>Âm & dương</p>
    <p>5 &times; 10 = 50</p>
  </body>
</html>`;

      const rawOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata><title>Test &amp; Book</title></metadata>
</package>`;

      const rawNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <docTitle><text>Test &amp; Doc</text></docTitle>
</ncx>`;

      const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>`;
      const rawCss = `body { font-family: "Palatino", serif; color: #333; }`;
      const rawContainerXml = `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
      const mockImageBytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x01]);

      zip.file("mimetype", "application/epub+zip");
      zip.file("META-INF/container.xml", rawContainerXml);
      zip.file("OEBPS/content.opf", rawOpf);
      zip.file("OEBPS/toc.ncx", rawNcx);
      zip.file("OEBPS/images/diagram.svg", rawSvg);
      zip.file("OEBPS/styles/main.css", rawCss);
      zip.file("OEBPS/images/cover.png", mockImageBytes);
      zip.file("OEBPS/chapter1.xhtml", rawXhtml);

      const buffer = await zip.generateAsync({ type: "arraybuffer" });
      const { buffer: sanitizedBuffer, sanitizedEntries, skippedEntries } =
        await (await import("../../src/lib/epubXhtmlSanitizer")).sanitizeEpubArchiveWithReport(buffer);

      // Verify reporting structure
      expect(sanitizedEntries).toEqual(["OEBPS/chapter1.xhtml"]);
      expect(skippedEntries).toContain("mimetype");
      expect(skippedEntries).toContain("META-INF/container.xml");
      expect(skippedEntries).toContain("OEBPS/content.opf");
      expect(skippedEntries).toContain("OEBPS/toc.ncx");
      expect(skippedEntries).toContain("OEBPS/images/diagram.svg");
      expect(skippedEntries).toContain("OEBPS/styles/main.css");
      expect(skippedEntries).toContain("OEBPS/images/cover.png");

      // Verify entries in output zip
      const resultZip = await JSZip.loadAsync(sanitizedBuffer);

      // XHTML must be sanitized
      const sanitizedXhtml = await resultZip.file("OEBPS/chapter1.xhtml")?.async("text");
      expect(sanitizedXhtml).toContain("<p>Âm &amp; dương</p>");
      expect(sanitizedXhtml).toContain("<p>5 × 10 = 50</p>");

      const parser = new DOMParser();
      const doc = parser.parseFromString(sanitizedXhtml!, "application/xhtml+xml");
      expect(doc.querySelector("parsererror")).toBeNull();

      // Non-XHTML entries must be 100% identical byte-for-byte / string-for-string
      const outOpf = await resultZip.file("OEBPS/content.opf")?.async("text");
      expect(outOpf).toBe(rawOpf);

      const outNcx = await resultZip.file("OEBPS/toc.ncx")?.async("text");
      expect(outNcx).toBe(rawNcx);

      const outSvg = await resultZip.file("OEBPS/images/diagram.svg")?.async("text");
      expect(outSvg).toBe(rawSvg);

      const outCss = await resultZip.file("OEBPS/styles/main.css")?.async("text");
      expect(outCss).toBe(rawCss);

      const outContainer = await resultZip.file("META-INF/container.xml")?.async("text");
      expect(outContainer).toBe(rawContainerXml);

      const outImageBytes = await resultZip.file("OEBPS/images/cover.png")?.async("uint8array");
      expect(Array.from(outImageBytes!)).toEqual(Array.from(mockImageBytes));
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
