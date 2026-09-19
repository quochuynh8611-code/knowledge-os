import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";

describe("Vault File Open to Unified Reader (Integration Test)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. selecting .pdf in vault modal opens Unified Research Reader with format pdf and attachment URL", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/docs/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ docs: [] }),
        });
      }
      if (url.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "giao_trinh.pdf",
                type: "file",
                path: "02_PDF_Source/giao_trinh.pdf",
                size: 747175,
                mtime: "2026-09-17T02:03:32.000Z",
                extension: ".pdf",
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    });

    render(<DocsExplorerView mode="epub-only" />);

    // Open vault browser modal
    const openVaultBtn = screen.getAllByRole("button", { name: /Chọn sách từ Vault/i })[0];
    fireEvent.click(openVaultBtn);

    // Wait for modal items to appear
    await waitFor(() => {
      expect(screen.getByText("giao_trinh.pdf")).toBeInTheDocument();
    });

    // Click on PDF file
    fireEvent.click(screen.getByText("giao_trinh.pdf"));

    // UnifiedResearchReader with PDF adapter must mount and render embed
    await waitFor(() => {
      const embed = screen.getByTestId("pdf-embed-element");
      expect(embed).toBeInTheDocument();
      expect(embed).toHaveAttribute(
        "src",
        "/api/obsidian/vault/attachment?path=02_PDF_Source%2Fgiao_trinh.pdf"
      );
    });
  });

  it("2. selecting .md in vault modal opens Unified Research Reader with format md and vault file API", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/docs/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ docs: [] }),
        });
      }
      if (url.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "ghi_chu.md",
                type: "file",
                path: "Notes/ghi_chu.md",
                size: 512,
                mtime: "2026-09-17T02:03:32.000Z",
                extension: ".md",
              },
            ],
          }),
        });
      }
      if (url.includes("/api/obsidian/vault/file")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({
            relativePath: "Notes/ghi_chu.md",
            fileName: "ghi_chu.md",
            frontmatter: {},
            outline: [],
            content: "# Nội dung ghi chú nghiên cứu từ Vault",
          }),
        });
      }
      return Promise.reject(new Error("Unknown URL: " + url));
    });

    render(<DocsExplorerView mode="epub-only" />);

    // Open vault browser modal
    const openVaultBtn = screen.getAllByRole("button", { name: /Chọn sách từ Vault/i })[0];
    fireEvent.click(openVaultBtn);

    // Wait for modal items to appear
    await waitFor(() => {
      expect(screen.getByText("ghi_chu.md")).toBeInTheDocument();
    });

    // Click on Markdown file
    fireEvent.click(screen.getByText("ghi_chu.md"));

    // UnifiedResearchReader in Markdown mode renders content
    await waitFor(() => {
      expect(screen.getByText(/Nội dung ghi chú nghiên cứu từ Vault/i)).toBeInTheDocument();
    });
  });
});
