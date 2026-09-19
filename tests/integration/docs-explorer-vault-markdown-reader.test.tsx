import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";

describe("Integration: DocsExplorerView Obsidian Vault Markdown Open Flow", () => {
  const mockDocsList = {
    total: 0,
    categories: {},
    documents: [],
  };

  const mockVaultTreeRoot = {
    path: "",
    items: [
      {
        name: "Research-Notes.md",
        type: "file",
        path: "Research-Notes.md",
        size: 1024,
        mtime: new Date().toISOString(),
        extension: ".md",
      },
    ],
  };

  const mockVaultFileContent = {
    relativePath: "Research-Notes.md",
    fileName: "Research-Notes.md",
    frontmatter: { title: "Research Notes" },
    outline: [{ level: 1, text: "Ghi Chú Nghiên Cứu Vault", id: "ghi-chu-nghien-cuu-vault" }],
    content: "# Ghi Chú Nghiên Cứu Vault\n\nNội dung tài liệu markdown từ Obsidian Vault đã được tải thành công.",
    sizeBytes: 1024,
    lastModified: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens Obsidian Vault markdown note in UnifiedResearchReader with correct vault API endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/docs/content")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ error: "FILE_NOT_FOUND", message: "Not in docs directory" }),
        } as any);
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockDocsList,
        } as any);
      }
      if (urlStr.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockVaultTreeRoot,
        } as any);
      }
      if (urlStr.includes("/api/obsidian/vault/file")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => mockVaultFileContent,
          text: async () => JSON.stringify(mockVaultFileContent),
        } as any);
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    });

    render(<DocsExplorerView mode="epub-only" />);

    // 1. Click button to open Obsidian Vault Browser
    const openVaultBtns = await screen.findAllByRole("button", { name: /(chọn|duyệt) sách từ vault/i });
    fireEvent.click(openVaultBtns[0]);

    // 2. Select markdown file inside Obsidian Vault Browser Modal
    const vaultFileItem = await screen.findByText("Research-Notes.md");
    fireEvent.click(vaultFileItem);

    // 3. Verify UnifiedResearchReader opens and renders vault markdown content
    await waitFor(() => {
      expect(screen.getByText("Ghi Chú Nghiên Cứu Vault")).toBeInTheDocument();
    });
    expect(screen.getByText(/Nội dung tài liệu markdown từ Obsidian Vault đã được tải thành công/i)).toBeInTheDocument();

    // 4. Verify fetch called the vault file endpoint and did NOT call /api/docs/content for the vault file
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/obsidian/vault/file?path=Research-Notes.md")
    );
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/docs/content?path=Research-Notes.md")
    );
  });
});
