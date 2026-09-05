import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ObsidianVaultBrowserModal } from "../../src/components/modals/ObsidianVaultBrowserModal";

describe("Phase P4.2A: ObsidianVaultBrowserModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSelectFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when isOpen is false", () => {
    render(
      <ObsidianVaultBrowserModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );
    expect(screen.queryByText(/Duyệt Obsidian Vault/i)).toBeNull();
  });

  it("renders root directory items on initial fetch", async () => {
    const mockRootResponse = {
      path: "",
      items: [
        { name: "01-Study", type: "directory", path: "01-Study", size: 0, mtime: "2026-09-04T12:00:00Z" },
        { name: "README.md", type: "file", path: "README.md", size: 1024, mtime: "2026-09-04T12:00:00Z", extension: ".md" },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockRootResponse,
    } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    expect(screen.getByText(/Duyệt Obsidian Vault/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("01-Study")).toBeDefined();
      expect(screen.getByText("README.md")).toBeDefined();
    });
  });

  it("calls onSelectFile when clicking a markdown file", async () => {
    const mockRootResponse = {
      path: "",
      items: [
        { name: "Notes.md", type: "file", path: "Notes.md", size: 500, mtime: "2026-09-04T12:00:00Z", extension: ".md" },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockRootResponse,
    } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Notes.md")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Notes.md"));
    expect(mockOnSelectFile).toHaveBeenCalledWith("Notes.md");
  });

  it("expands folder and fetches child items when folder is clicked", async () => {
    const mockRootResponse = {
      path: "",
      items: [
        { name: "FolderA", type: "directory", path: "FolderA", size: 0, mtime: "2026-09-04T12:00:00Z" },
      ],
    };
    const mockChildResponse = {
      path: "FolderA",
      items: [
        { name: "ChildDoc.md", type: "file", path: "FolderA/ChildDoc.md", size: 300, mtime: "2026-09-04T12:00:00Z", extension: ".md" },
      ],
    };

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRootResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockChildResponse,
      } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("FolderA")).toBeDefined();
    });

    fireEvent.click(screen.getByText("FolderA"));

    await waitFor(() => {
      expect(screen.getByText("ChildDoc.md")).toBeDefined();
    });
  });

  it("displays error message when API responds with error", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "ACCESS_DENIED_SENSITIVE_DIR", message: "Truy cập bị từ chối." }),
    } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Truy cập bị từ chối/i)).toBeDefined();
    });
  });
});
