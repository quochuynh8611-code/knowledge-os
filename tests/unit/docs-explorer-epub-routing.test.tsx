import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { Navbar } from "../../src/components/layout/Navbar";
import { DataProvider } from "../../src/context/DataContext";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div data-testid="react-reader-mock" data-url={typeof props.url === "string" ? props.url : "buffer"}>
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("EPUB Reader Routing Contract (Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. clicking an EPUB book item in DocsExplorerView opens UnifiedResearchReader, not FileViewer", async () => {
    const mockDocsList = {
      total: 1,
      categories: { books: 1 },
      documents: [
        {
          id: "doc-epub-1",
          title: "Sách Thiền Định Cổ Truyền",
          category: "books",
          relativePath: "books/thien_dinh.epub",
          status: "EPUB",
          sizeBytes: 1048576,
          lastModified: "2026-09-20T00:00:00.000Z",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/docs/raw") || urlStr.includes("/attachment")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: { get: () => "application/epub+zip" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockDocsList,
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Wait for book card to appear and click it
    const bookCard = await screen.findByTestId("doc-item-doc-epub-1");
    expect(bookCard).toBeInTheDocument();
    fireEvent.click(bookCard);

    // Contract: Must mount UnifiedResearchReader dialog with title, not legacy FileViewer
    await waitFor(() => {
      const readerDialog = screen.getByRole("dialog", { name: /Sách Thiền Định Cổ Truyền/i });
      expect(readerDialog).toBeInTheDocument();
      // Verify EPUB format badge is present in UnifiedResearchReader header
      expect(within(readerDialog).getByText("EPUB")).toBeInTheDocument();
    });

    // Verify legacy FileViewer is NOT rendered
    expect(screen.queryByTestId("legacy-file-viewer")).toBeNull();
  });

  it("2. selecting an EPUB file from Vault Modal in DocsExplorerView opens UnifiedResearchReader with attachment URL", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/obsidian/vault/attachment") || urlStr.includes("/api/docs/raw")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: { get: () => "application/epub+zip" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      if (url.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "kinh_kim_cang.epub",
                type: "file",
                path: "05_EPUB_Export/kinh_kim_cang.epub",
                size: 2048576,
                mtime: "2026-09-20T00:00:00.000Z",
                extension: ".epub",
              },
            ],
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
        headers: { get: () => "application/json" },
      });
    });

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Open vault browser modal
    const openVaultBtn = screen.getAllByRole("button", { name: /Chọn sách từ Vault/i })[0];
    fireEvent.click(openVaultBtn);

    // Wait for vault item
    const fileItem = await screen.findByText("kinh_kim_cang.epub");
    expect(fileItem).toBeInTheDocument();

    // Click on EPUB file item
    fireEvent.click(fileItem);

    // Contract: Opens UnifiedResearchReader in EPUB mode
    await waitFor(() => {
      const readerDialog = screen.getByRole("dialog", { name: /kinh_kim_cang/i });
      expect(readerDialog).toBeInTheDocument();
      expect(within(readerDialog).getByText("EPUB")).toBeInTheDocument();
    });
  });

  it("3. selecting an EPUB file from Vault Modal in Navbar opens UnifiedResearchReader", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "bat_nha_tam_kinh.epub",
                type: "file",
                path: "05_EPUB_Export/bat_nha_tam_kinh.epub",
                size: 1548576,
                mtime: "2026-09-20T00:00:00.000Z",
                extension: ".epub",
              },
            ],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    render(
      <DataProvider>
        <Navbar />
      </DataProvider>
    );

    // Open Obsidian Vault browser modal from Navbar
    const openVaultBtn = screen.getByTitle("Duyệt Obsidian Vault");
    fireEvent.click(openVaultBtn);

    // Wait for vault item
    await waitFor(() => {
      expect(screen.getByText("bat_nha_tam_kinh.epub")).toBeInTheDocument();
    });

    // Click on EPUB file
    fireEvent.click(screen.getByText("bat_nha_tam_kinh.epub"));

    // Contract: Opens UnifiedResearchReader
    await waitFor(() => {
      const readerDialog = screen.getByRole("dialog", { name: /bat_nha_tam_kinh/i });
      expect(readerDialog).toBeInTheDocument();
      expect(screen.getByText("EPUB")).toBeInTheDocument();
    });
  });
});
