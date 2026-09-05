import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ObsidianVaultBrowserModal } from "../../src/components/modals/ObsidianVaultBrowserModal";

describe("Phase P4.2B: Obsidian Vault Search Box in Browser Modal", () => {
  const mockOnClose = vi.fn();
  const mockOnSelectFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not trigger vault search API when query is empty, displays tree", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        path: "",
        items: [
          { name: "01-Study", type: "directory", path: "01-Study", size: 0, mtime: "2026-09-04T12:00:00Z" },
        ],
      }),
    } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("01-Study")).toBeInTheDocument();
    });

    // Should only have called /tree, not /search
    expect(fetchSpy).toHaveBeenCalledWith("/api/obsidian/vault/tree");
  });

  it("triggers search API with debounced query and renders search results with snippets", async () => {
    // Initial root tree fetch
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          path: "",
          items: [],
        }),
      } as Response)
      // Search API response
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          query: "Chánh Đạo",
          count: 1,
          results: [
            {
              title: "Bát Chánh Đạo",
              path: "Study/Bat-Chanh-Dao.md",
              snippet: "...con đường tám nhánh đưa đến giải thoát...",
              score: 95,
            },
          ],
        }),
      } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm hoặc lọc ghi chú trong Vault/i);
    fireEvent.change(searchInput, { target: { value: "Chánh Đạo" } });

    await waitFor(() => {
      expect(screen.getByText("Bát Chánh Đạo")).toBeInTheDocument();
      expect(screen.getByText(/Study\/Bat-Chanh-Dao\.md/i)).toBeInTheDocument();
      expect(screen.getByText(/tám nhánh đưa đến giải thoát/i)).toBeInTheDocument();
    });
  });

  it("calls onSelectFile when clicking on a search result", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ path: "", items: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          query: "Tu-Niem-Xu",
          count: 1,
          results: [
            {
              title: "Tứ Niệm Xứ",
              path: "Study/Tu-Niem-Xu.md",
              snippet: "...quán thân trên thân...",
              score: 80,
            },
          ],
        }),
      } as Response);

    render(
      <ObsidianVaultBrowserModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectFile={mockOnSelectFile}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm hoặc lọc ghi chú trong Vault/i);
    fireEvent.change(searchInput, { target: { value: "Tu-Niem-Xu" } });

    await waitFor(() => {
      expect(screen.getByText("Tứ Niệm Xứ")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Tứ Niệm Xứ"));
    expect(mockOnSelectFile).toHaveBeenCalledWith("Study/Tu-Niem-Xu.md");
  });
});
