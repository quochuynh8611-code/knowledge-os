import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ObsidianVaultBrowserModal } from "../../src/components/modals/ObsidianVaultBrowserModal";

describe("ObsidianVaultBrowserModal - PDF and Markdown File Selection (Unit Test)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders .pdf files as selectable items and calls onSelectFile when clicked", async () => {
    const onSelectFile = vi.fn();
    const onClose = vi.fn();

    // Mock /api/obsidian/vault/tree to return .md, .epub, and .pdf files
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "cam_nang_nghien_cuu.pdf",
                type: "file",
                path: "02_PDF_Source/cam_nang_nghien_cuu.pdf",
                size: 747175,
                mtime: "2026-09-17T02:03:32.000Z",
                extension: ".pdf",
              },
              {
                name: "huong_dan.md",
                type: "file",
                path: "huong_dan.md",
                size: 1024,
                mtime: "2026-09-17T02:03:32.000Z",
                extension: ".md",
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={onClose}
        onSelectFile={onSelectFile}
      />
    );

    // Wait for items to be loaded
    await waitFor(() => {
      expect(screen.getByText("cam_nang_nghien_cuu.pdf")).toBeInTheDocument();
      expect(screen.getByText("huong_dan.md")).toBeInTheDocument();
    });

    const pdfItem = screen.getByText("cam_nang_nghien_cuu.pdf").closest("div");
    expect(pdfItem).not.toBeNull();

    // Click on PDF file item
    fireEvent.click(pdfItem!);

    // Must trigger onSelectFile with the relative path
    expect(onSelectFile).toHaveBeenCalledWith("02_PDF_Source/cam_nang_nghien_cuu.pdf");
  });
});
