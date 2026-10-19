import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { Navbar } from "../../src/components/layout/Navbar";
import { UnifiedResearchReader } from "../../src/components/reader/UnifiedResearchReader";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div
      data-testid="react-reader-mock"
      data-location={props.location}
      data-url={typeof props.url === "string" ? props.url : "buffer"}
    >
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

function clearGlobalReadingStore() {
  const all = globalReadingPositionStore.getAllPositions();
  for (const key of Object.keys(all)) {
    const parts = key.split(":");
    if (parts.length >= 3) {
      globalReadingPositionStore.clearPosition(parts[1], parts[2]);
    }
  }
}

describe("Phase A: Vault Reader History & Recent Shelf Flow (Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGlobalReadingStore();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Nhóm B: Unified reader hydration for Vault ──────────────────────────────

  it("should_open_vault_document_using_registered_archived_document_id", async () => {
    const mockVaultRegisterResponse = {
      success: true,
      document: {
        id: "arch-vault-uuid-001",
        fileName: "thien_dinh.epub",
        fileFormat: "epub",
        sourceType: "vault",
        sourcePath: "05_EPUB_Export/thien_dinh.epub",
        sourceKey: "vault:05_EPUB_Export/thien_dinh.epub",
        storageRelPath: "vault://05_EPUB_Export/thien_dinh.epub",
        contentHash: "synthetic-deterministic-hash-001",
        lastPosition: null,
        lastReadAt: null,
        readCount: 0,
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string, opts?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/vault/register")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockVaultRegisterResponse,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        });
      }
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/tree")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            path: "",
            items: [
              {
                name: "thien_dinh.epub",
                type: "file",
                path: "05_EPUB_Export/thien_dinh.epub",
                size: 1048576,
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
    global.fetch = fetchMock;

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Click open vault modal
    const openVaultBtn = screen.getAllByRole("button", { name: /Chọn sách từ Vault/i })[0];
    fireEvent.click(openVaultBtn);

    const fileItem = await screen.findByText("thien_dinh.epub");
    fireEvent.click(fileItem);

    // Contract: Must call /api/archive/vault/register BEFORE opening reader
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/archive/vault/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("05_EPUB_Export/thien_dinh.epub"),
        })
      );
    });

    // Contract: Reader viewport must receive real UUID, NOT pseudo 'vault:...' string
    await waitFor(() => {
      const closeBtn = screen.getByTitle("Đóng trình đọc (Esc)");
      expect(closeBtn).toBeInTheDocument();
    });

    // Check that hydration fetch called the real registered UUID endpoint
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/archive/document/arch-vault-uuid-001")
    );
  });

  it("should_hydrate_persisted_position_for_vault_markdown", async () => {
    const mockDocument = {
      id: "arch-vault-md-999",
      fileName: "Kien-truc.md",
      fileFormat: "md",
      sourceType: "vault",
      sourcePath: "Notes/Kien-truc.md",
      lastPosition: {
        headingId: "muc-2-kien-truc-sach",
        updatedAt: "2026-10-18T10:00:00.000Z",
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/archive/document/arch-vault-md-999")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ document: mockDocument }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = fetchMock;

    render(
      <UnifiedResearchReader
        documentId="arch-vault-md-999"
        title="Kiến Trúc Vault"
        format="md"
        content="# Tiêu Đề\n## Mục 2: Kiến Trúc Sạch\nNội dung chi tiết."
        onClose={vi.fn()}
      />
    );

    // Contract: Hydrates headingId into reading position
    await waitFor(() => {
      const pos = globalReadingPositionStore.getPosition("arch-vault-md-999", "md");
      expect(pos).toBe("muc-2-kien-truc-sach");
    });
  });

  it("should_hydrate_persisted_position_for_vault_epub", async () => {
    const mockDocument = {
      id: "arch-vault-epub-888",
      fileName: "kinh_kim_cang.epub",
      fileFormat: "epub",
      sourceType: "vault",
      sourcePath: "05_EPUB_Export/kinh_kim_cang.epub",
      lastPosition: {
        cfi: "epubcfi(/6/12[chap5]!/4/2/8)",
        updatedAt: "2026-10-18T10:00:00.000Z",
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/archive/document/arch-vault-epub-888")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ document: mockDocument }),
        });
      }
      if (String(url).includes("/api/obsidian/vault/attachment")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = fetchMock;

    render(
      <UnifiedResearchReader
        documentId="arch-vault-epub-888"
        title="Kinh Kim Cang Vault"
        format="epub"
        fileUrl="/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fkinh_kim_cang.epub"
        onClose={vi.fn()}
      />
    );

    // Contract: Hydrates CFI into reading position and passes to reader
    await waitFor(() => {
      const pos = globalReadingPositionStore.getPosition("arch-vault-epub-888", "epub");
      expect(pos).toBe("epubcfi(/6/12[chap5]!/4/2/8)");
    });
  });

  // ── Nhóm D: Recent shelf for Vault ──────────────────────────────────────────

  it("should_include_registered_vault_documents_in_recent_reads_and_sort_by_lastReadAt", async () => {
    // Backend returns list in arbitrary order (Doc A before Doc B)
    const mockArchivedList = [
      {
        id: "arch-vault-older",
        fileName: "kinh_kim_cang.epub",
        fileFormat: "epub",
        sourceType: "vault",
        sourcePath: "05_EPUB_Export/kinh_kim_cang.epub",
        storageRelPath: "vault://05_EPUB_Export/kinh_kim_cang.epub",
        lastPosition: { cfi: "epubcfi(/6/2)" },
        lastReadAt: "2026-10-18T08:00:00.000Z", // Older read
      },
      {
        id: "arch-vault-newer",
        fileName: "thien_dinh.epub",
        fileFormat: "epub",
        sourceType: "vault",
        sourcePath: "05_EPUB_Export/thien_dinh.epub",
        storageRelPath: "vault://05_EPUB_Export/thien_dinh.epub",
        lastPosition: { cfi: "epubcfi(/6/8)" },
        lastReadAt: "2026-10-18T12:00:00.000Z", // Newer read (must be first)
      },
    ];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: mockArchivedList }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = fetchMock;

    render(
      <DataProvider>
        <DocsExplorerView mode="epub-only" />
      </DataProvider>
    );

    // Verify Recent Shelf rendered with Vault items
    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    // Ràng buộc ordering: Phải assert thứ tự UI dựa trên sort lastReadAt desc
    const recentButtons = within(shelf).getAllByRole("button", { name: /Đang đọc/i });
    expect(recentButtons.length).toBe(2);
    // Newer item ("thien dinh") must be first in list
    expect(recentButtons[0]).toHaveAttribute("aria-label", "Đang đọc thien dinh");
    // Older item ("kinh kim cang") must be second in list
    expect(recentButtons[1]).toHaveAttribute("aria-label", "Đang đọc kinh kim cang");

    // Clicking recent vault epub card must open with vault attachment URL
    fireEvent.click(recentButtons[0]);
    await waitFor(() => {
      expect(screen.getByTestId("react-reader-mock")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/obsidian/vault/attachment?path=05_EPUB_Export%2Fthien_dinh.epub")
      );
    });
  });

  it("should_survive_remount_for_vault_recent_reads_without_ram_store", async () => {
    // RAM store is explicitly empty
    clearGlobalReadingStore();

    const mockArchivedList = [
      {
        id: "arch-vault-remount-1",
        fileName: "so_tay_nghien_cuu.md",
        fileFormat: "md",
        sourceType: "vault",
        sourcePath: "01_Notes/so_tay_nghien_cuu.md",
        storageRelPath: "vault://01_Notes/so_tay_nghien_cuu.md",
        lastPosition: { headingId: "chuong-1" },
        lastReadAt: "2026-10-18T11:00:00.000Z",
      },
    ];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: mockArchivedList }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/file")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            content: "# Sổ Tay Nghiên Cứu\n## Chương 1\nNội dung chương 1",
            path: "01_Notes/so_tay_nghien_cuu.md",
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = fetchMock;

    const { unmount } = render(
      <DataProvider>
        <DocsExplorerView />
      </DataProvider>
    );

    expect(await screen.findByTestId("recent-reads-shelf")).toBeInTheDocument();
    unmount();

    // Re-mount without RAM store: must reconstruct shelf from persisted archive metadata
    render(
      <DataProvider>
        <DocsExplorerView />
      </DataProvider>
    );

    const remountedShelf = await screen.findByTestId("recent-reads-shelf");
    const itemBtn = within(remountedShelf).getByRole("button", { name: /Đang đọc so tay nghien cuu/i });
    expect(itemBtn).toBeInTheDocument();

    // Reopening from recent shelf must route to obsidian vault file endpoint, not /api/docs/raw
    fireEvent.click(itemBtn);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/obsidian/vault/file?path=01_Notes%2Fso_tay_nghien_cuu.md")
      );
    });
  });

  // ── Nhóm E: Regression protection ──────────────────────────────────────────

  it("should_not_break_existing_archive_document_flow", async () => {
    const regularArchiveDoc = {
      id: "regular-archive-001",
      fileName: "tai_lieu_khoa_hoc.pdf",
      fileFormat: "pdf",
      sourceType: "archive",
      storageRelPath: "pdf/aa/tai_lieu_khoa_hoc.pdf",
      lastPosition: { pageNumber: 5 },
      lastReadAt: "2026-10-18T10:00:00.000Z",
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [regularArchiveDoc] }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ documents: [] }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <DataProvider>
        <DocsExplorerView />
      </DataProvider>
    );

    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(within(shelf).getByText(/tai lieu khoa hoc/i)).toBeInTheDocument();
  });

  it("should_register_vault_document_when_selected_from_navbar_modal", async () => {
    const mockVaultRegisterResponse = {
      success: true,
      document: {
        id: "arch-vault-navbar-001",
        fileName: "bat_nha_tam_kinh.epub",
        fileFormat: "epub",
        sourceType: "vault",
        sourcePath: "05_EPUB_Export/bat_nha_tam_kinh.epub",
        sourceKey: "vault:05_EPUB_Export/bat_nha_tam_kinh.epub",
        storageRelPath: "vault://05_EPUB_Export/bat_nha_tam_kinh.epub",
        contentHash: "hash-navbar-001",
      },
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/vault/register")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockVaultRegisterResponse,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/attachment")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(50),
          headers: { get: () => "application/epub+zip" },
        });
      }
      if (urlStr.includes("/api/obsidian/vaults")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ vaults: [], activeVaultId: null }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/tree")) {
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
                extension: ".epub",
              },
            ],
          }),
          headers: { get: () => "application/json" },
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = fetchMock;

    render(
      <DataProvider>
        <Navbar />
      </DataProvider>
    );

    const openVaultBtn = screen.getByTitle("Duyệt Obsidian Vault");
    fireEvent.click(openVaultBtn);

    const fileItem = await screen.findByText("bat_nha_tam_kinh.epub");
    fireEvent.click(fileItem);

    // Contract: Navbar must register vault document with backend before opening reader
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/archive/vault/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("05_EPUB_Export/bat_nha_tam_kinh.epub"),
        })
      );
    });

    // Contract: Reader opens with the registered UUID
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/archive/document/arch-vault-navbar-001")
      );
    });
  });
});
