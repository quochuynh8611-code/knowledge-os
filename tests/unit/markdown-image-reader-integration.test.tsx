import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import path from "path";
import { sanitizeDocsPath } from "../../src/lib/docsSanitizer";
import { sanitizeObsidianAttachmentPath } from "../../src/lib/obsidianPathSanitizer";
import {
  resolveAttachmentUrl,
  MarkdownReadabilityRenderer,
} from "../../src/lib/markdownReadability";
import { MarkdownReaderAdapter } from "../../src/components/reader/adapters/MarkdownReaderAdapter";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";

describe("Markdown Image Rendering & Library Folder Breadth Integration", () => {
  const docsRoot = path.resolve(process.cwd(), "docs");

  describe("P1.A: docsSanitizer allows valid images", () => {
    it("accepts valid image extensions (.png, .jpg, .webp, .svg, .gif, .bmp, .ico)", () => {
      const allowedExts = [
        "assets/screenshots/ss-01.png",
        "assets/screenshots/ss-02.jpg",
        "assets/img.webp",
        "assets/diagram.svg",
        "assets/anim.gif",
      ];
      for (const rel of allowedExts) {
        const sanitized = sanitizeDocsPath(docsRoot, rel);
        expect(sanitized).toBe(path.resolve(docsRoot, rel));
      }
    });

    it("still blocks dangerous traversal sequences in image paths", () => {
      expect(sanitizeDocsPath(docsRoot, "../outside/img.png")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "assets/../../secret.png")).toBeNull();
      expect(sanitizeDocsPath(docsRoot, "img.png\0.exe")).toBeNull();
    });
  });

  describe("P1.B: resolveAttachmentUrl resolves paths accurately", () => {
    it("routes relative images in docs to /api/docs/raw with correct path", () => {
      const url = resolveAttachmentUrl("assets/screenshots/ss-01.png", "user-guide.md", "docs");
      expect(url).toBe("/api/docs/raw?path=assets%2Fscreenshots%2Fss-01.png");
    });

    it("resolves nested relative images against parent folder in docs", () => {
      const url = resolveAttachmentUrl("./screenshots/ss-01.png", "guides/getting-started.md", "docs");
      expect(url).toBe("/api/docs/raw?path=guides%2Fscreenshots%2Fss-01.png");
    });

    it("routes vault images to /api/obsidian/vault/attachment", () => {
      const url = resolveAttachmentUrl("./assets/photo.png", "01_Notes/Topic/Note.md", "vault");
      expect(url).toBe("/api/obsidian/vault/attachment?path=01_Notes%2FTopic%2Fassets%2Fphoto.png");
    });

    it("preserves external https URLs untouched", () => {
      const external = "https://images.unsplash.com/photo-12345?w=800";
      const url = resolveAttachmentUrl(external, "Note.md", "vault");
      expect(url).toBe(external);
    });
  });

  describe("P1.C: MarkdownReadabilityRenderer renders <img> tags cleanly", () => {
    it("renders Markdown image ![Alt Text](path.png) as <img> with resolved docs URL", () => {
      const markdown = "Dưới đây là ảnh:\n\n![Sơ đồ kiến trúc](assets/diagram.png)\n\nKết thúc.";
      render(
        <MarkdownReadabilityRenderer
          content={markdown}
          docPath="user-guide.md"
          sourceType="docs"
        />
      );

      const img = screen.getByAltText("Sơ đồ kiến trúc");
      expect(img).toBeDefined();
      expect(img.tagName.toLowerCase()).toBe("img");
      expect(img.getAttribute("src")).toBe("/api/docs/raw?path=assets%2Fdiagram.png");
    });

    it("renders Obsidian embed ![[image.png|300x200]] as <img> with dimensions and vault URL", () => {
      const markdown = "Ảnh nhúng:\n\n![[assets/flow.png|400x300]]";
      render(
        <MarkdownReadabilityRenderer
          content={markdown}
          docPath="01_Projects/Architecture.md"
          sourceType="vault"
        />
      );

      const img = screen.getByAltText("assets/flow.png");
      expect(img).toBeDefined();
      expect(img.getAttribute("src")).toBe(
        "/api/obsidian/vault/attachment?path=01_Projects%2Fassets%2Fflow.png"
      );
      expect(img.style.width).toBe("400px");
      expect(img.style.height).toBe("300px");
    });
  });

  describe("P1.D: MarkdownReaderAdapter handles docs root markdown files", () => {
    it("resolves image URL to /api/docs/raw when reading CAM_NANG_SOP_KNOWLEDGE_OS.md with explicit sourceType docs", () => {
      const content =
        "# Hướng dẫn SOP\n\n![Dashboard Overview](assets/screenshots/ss-01-dashboard-overview.png)";

      render(
        <MarkdownReaderAdapter
          content={content}
          documentId="CAM_NANG_SOP_KNOWLEDGE_OS.md"
          sourceType="docs"
        />
      );

      const img = screen.getByRole("img", { name: "Dashboard Overview" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "/api/docs/raw?path=assets%2Fscreenshots%2Fss-01-dashboard-overview.png"
      );
    });

    it("resolves image URL to /api/docs/raw via UnifiedResearchReader when sourceType docs is passed", () => {
      const content =
        "# Hướng dẫn SOP\n\n![Dashboard Overview](assets/screenshots/ss-01-dashboard-overview.png)";

      render(
        <UnifiedResearchReader
          content={content}
          documentId="CAM_NANG_SOP_KNOWLEDGE_OS.md"
          title="SOP Knowledge OS"
          format="md"
          sourceType="docs"
          fileUrl="/api/docs/raw?path=CAM_NANG_SOP_KNOWLEDGE_OS.md"
          onClose={() => {}}
        />
      );

      const img = screen.getByRole("img", { name: "Dashboard Overview" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "/api/docs/raw?path=assets%2Fscreenshots%2Fss-01-dashboard-overview.png"
      );
    });
  });

  describe("P1.E: DocsExplorerView renders formatted markdown with images and launches Unified Reader", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string) => {
          if (url.includes("/api/docs/content")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  id: "sop-doc",
                  title: "SOP Knowledge OS",
                  category: "sop",
                  status: "SOP",
                  relativePath: "CAM_NANG_SOP_KNOWLEDGE_OS.md",
                  content: "# Hướng dẫn SOP\n\n![Dashboard Overview](assets/screenshots/ss-01-dashboard-overview.png)",
                  sizeBytes: 1200,
                  lastModified: new Date().toISOString(),
                }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                total: 1,
                categories: { sop: 1 },
                documents: [
                  {
                    id: "sop-doc",
                    title: "SOP Knowledge OS",
                    category: "sop",
                    relativePath: "CAM_NANG_SOP_KNOWLEDGE_OS.md",
                    status: "SOP",
                    sizeBytes: 1200,
                    lastModified: new Date().toISOString(),
                  },
                ],
              }),
          });
        })
      );
    });

    it("renders <img> element in preview pane instead of raw markdown text", async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText("SOP Knowledge OS")).toBeInTheDocument();
      });

      // Click the document to view content
      const docItem = screen.getByText("SOP Knowledge OS");
      docItem.click();

      const img = await screen.findByRole("img", { name: "Dashboard Overview" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/api/docs/raw?path=assets%2Fscreenshots%2Fss-01-dashboard-overview.png");
    });

    it("opens Unified Research Reader with proper docs source routing when clicking reader button", async () => {
      render(<DocsExplorerView mode="full" />);

      await waitFor(() => {
        expect(screen.getByText("SOP Knowledge OS")).toBeInTheDocument();
      });

      // Click the document to view content
      const docItem = screen.getByText("SOP Knowledge OS");
      docItem.click();

      // Click "Đọc trong Unified Reader"
      const readBtn = await screen.findByTitle("Mở khung đọc nghiên cứu với công cụ trích dẫn và mục lục");
      readBtn.click();

      // Ensure Unified Reader rendered the image using docs raw API
      const readerImgs = await screen.findAllByRole("img", { name: "Dashboard Overview" });
      expect(readerImgs.length).toBeGreaterThan(0);
      const readerImg = readerImgs[readerImgs.length - 1];
      expect(readerImg).toHaveAttribute("src", "/api/docs/raw?path=assets%2Fscreenshots%2Fss-01-dashboard-overview.png");
    });
  });

  describe("P1.F: Runtime Vault Markdown Image Resolution Contract (Failing bug reproduction)", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("1. resolveAttachmentUrl does not misidentify vault document as docs when sourceType is undefined and docPath has no vault: prefix", () => {
      // Direct unit contract: when docPath is a vault relative path (e.g. "000-Dashboard/CAM_NANG_SOP_KNOWLEDGE_OS.md")
      // and sourceType is omitted/undefined, it should resolve to vault attachment endpoint instead of /api/docs/raw
      const url = resolveAttachmentUrl("./images/architecture.png", "000-Dashboard/CAM_NANG_SOP_KNOWLEDGE_OS.md", undefined);
      expect(url).toBe("/api/obsidian/vault/attachment?path=000-Dashboard%2Fimages%2Farchitecture.png");
      expect(url).not.toContain("/api/docs/raw");
    });

    it("2. UnifiedResearchReader end-to-end resolves vault relative images when opened with runtime object (dropped sourceType, fetched markdown)", async () => {
      const mockVaultContent =
        "# Cẩm nang SOP Knowledge OS\n\n![Kiến trúc hệ thống](./images/architecture.png)\n\n![Sơ đồ luồng](../assets/flow.png)";

      vi.spyOn(globalThis, "fetch").mockImplementation((url: any) => {
        const urlStr = String(url);
        if (urlStr.includes("/api/obsidian/vault/file")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
            json: async () => ({
              relativePath: "000-Dashboard/CAM_NANG_SOP_KNOWLEDGE_OS.md",
              fileName: "CAM_NANG_SOP_KNOWLEDGE_OS.md",
              content: mockVaultContent,
            }),
            text: async () =>
              JSON.stringify({
                relativePath: "000-Dashboard/CAM_NANG_SOP_KNOWLEDGE_OS.md",
                fileName: "CAM_NANG_SOP_KNOWLEDGE_OS.md",
                content: mockVaultContent,
              }),
          } as any);
        }
        return Promise.reject(new Error(`Unhandled fetch url: ${urlStr}`));
      });

      // Exact runtime object structure from user Navbar / Vault modal when sourceType is dropped
      render(
        <UnifiedResearchReader
          documentId="vault:000-Dashboard/CAM_NANG_SOP_KNOWLEDGE_OS.md"
          title="CAM_NANG_SOP_KNOWLEDGE_OS"
          format="md"
          fileUrl="/api/obsidian/vault/file?path=000-Dashboard%2FCAM_NANG_SOP_KNOWLEDGE_OS.md"
          onClose={() => {}}
        />
      );

      // Wait for content and images to render
      const archImg = await screen.findByRole("img", { name: "Kiến trúc hệ thống" });
      expect(archImg).toBeInTheDocument();
      expect(archImg).toHaveAttribute(
        "src",
        "/api/obsidian/vault/attachment?path=000-Dashboard%2Fimages%2Farchitecture.png"
      );
      expect(archImg.getAttribute("src")).not.toContain("/api/docs/raw");

      const flowImg = await screen.findByRole("img", { name: "Sơ đồ luồng" });
      expect(flowImg).toBeInTheDocument();
      expect(flowImg).toHaveAttribute(
        "src",
        "/api/obsidian/vault/attachment?path=assets%2Fflow.png"
      );
      expect(flowImg.getAttribute("src")).not.toContain("/api/docs/raw");
    });
  });

  describe("P1.G: Docs Markdown Image Regression Guard", () => {
    it("preserves /api/docs/raw routing for docs markdown images", () => {
      const markdown = "# Hướng Dẫn\n\n![Hướng dẫn](assets/screenshots/guide.png)";
      render(
        <UnifiedResearchReader
          documentId="docs/user-guide.md"
          title="User Guide"
          format="md"
          sourceType="docs"
          fileUrl="/api/docs/raw?path=user-guide.md"
          content={markdown}
          onClose={() => {}}
        />
      );

      const img = screen.getByRole("img", { name: "Hướng dẫn" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "/api/docs/raw?path=assets%2Fscreenshots%2Fguide.png");
      expect(img.getAttribute("src")).not.toContain("/api/obsidian/vault/attachment");
    });
  });
});
