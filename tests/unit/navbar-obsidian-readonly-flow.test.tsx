import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DataProvider } from "../../src/context/DataContext";
import { Navbar } from "../../src/components/layout/Navbar";

describe("P4.2G — Navbar Obsidian Entry with Read-Only Vault Browser", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === "string" && url.includes("/api/obsidian/vault/tree")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            path: "",
            items: [
              {
                name: "Knowledge Architecture.md",
                type: "file",
                path: "Knowledge Architecture.md",
                size: 1024,
                mtime: "2026-09-05T00:00:00.000Z",
                extension: ".md",
              },
            ],
          }),
        } as Response;
      }

      if (typeof url === "string" && url.includes("/api/obsidian/vault/file")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            path: "Knowledge Architecture.md",
            frontmatter: { title: "Knowledge Architecture" },
            outline: [{ level: 1, text: "Knowledge Architecture" }],
            content: "# Knowledge Architecture\n\nContent for Knowledge OS.",
            sizeBytes: 1024,
            lastModified: "2026-09-05T00:00:00.000Z",
          }),
        } as Response;
      }

      if (typeof url === "string" && url.includes("/api/obsidian/vault/search")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [],
          }),
        } as Response;
      }

      // Default mock response for other API calls (like sync)
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      } as Response;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("1. renders Navbar with read-only Obsidian vault browser trigger (no two-way sync claims)", () => {
    render(
      <DataProvider>
        <Navbar />
      </DataProvider>
    );

    // Navbar button has clean title without false two-way sync claims
    const obsidianBtn = screen.getByTitle(/Duyệt Obsidian Vault/i);
    expect(obsidianBtn).toBeInTheDocument();
    expect(screen.queryByTitle(/Đồng bộ hai chiều/i)).toBeNull();
  });

  it("2. opens ObsidianVaultBrowserModal on click and transitions to ObsidianDocumentViewerModal upon file selection", async () => {
    render(
      <DataProvider>
        <Navbar />
      </DataProvider>
    );

    const obsidianBtn = screen.getByTitle(/Duyệt Obsidian Vault/i);
    fireEvent.click(obsidianBtn);

    // Modal title from ObsidianVaultBrowserModal
    const browserTitle = await screen.findByText("Duyệt Obsidian Vault");
    expect(browserTitle).toBeInTheDocument();
    expect(screen.getByText("Khám phá cấu trúc tệp và tìm kiếm ghi chú toàn văn")).toBeInTheDocument();

    // Verify vault item is loaded
    const fileItem = await screen.findByText("Knowledge Architecture.md");
    expect(fileItem).toBeInTheDocument();

    // Click file to view document
    fireEvent.click(fileItem);

    // Browser modal closes and DocumentViewer modal opens
    await waitFor(() => {
      expect(screen.queryByText("Khám phá cấu trúc tệp và tìm kiếm ghi chú toàn văn")).toBeNull();
    });

    // DocumentViewer modal displays document title & content
    const docTitle = await screen.findByText("Knowledge Architecture.md");
    expect(docTitle).toBeInTheDocument();

    // Close DocumentViewer modal
    const closeBtn = screen.getByRole("button", { name: /Đóng/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("Knowledge Architecture.md")).toBeNull();
    });
  });
});
