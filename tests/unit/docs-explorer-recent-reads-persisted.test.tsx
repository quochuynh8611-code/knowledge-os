import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";
import { DataProvider } from "../../src/context/DataContext";
import { globalReadingPositionStore } from "../../src/lib/readingPositionUnified";

// Mock react-reader
vi.mock("react-reader", () => ({
  ReactReader: vi.fn((props: any) => (
    <div data-testid="react-reader-mock" data-location={props.location}>
      ReactReader Mock
    </div>
  )),
}));

// Mock epubXhtmlSanitizer
vi.mock("../../src/lib/epubXhtmlSanitizer", () => ({
  sanitizeEpubArchive: vi.fn(async (buf: ArrayBuffer) => buf),
}));

describe("DocsExplorerView Recent Reads Shelf - Persisted Metadata (Red Stage)", () => {
  const mockDocsList = {
    total: 3,
    categories: { books: 2, adr: 1 },
    documents: [
      {
        id: "book-1",
        title: "Kinh Thiền Cổ Truyền",
        category: "books",
        relativePath: "books/kinh_thien.epub",
        status: "EPUB",
        sizeBytes: 1048576,
        lastModified: "2026-09-20T00:00:00.000Z",
      },
      {
        id: "book-2",
        title: "Khảo Luận Vi Diệu Pháp",
        category: "books",
        relativePath: "books/vi_dieu_phap.epub",
        status: "EPUB",
        sizeBytes: 2048576,
        lastModified: "2026-09-21T00:00:00.000Z",
      },
      {
        id: "adr-076",
        title: "ADR-076 Quyết định Kiến Trúc",
        category: "adr",
        relativePath: "adr/ADR-076.md",
        status: "ACCEPTED",
        sizeBytes: 5120,
        lastModified: "2026-09-22T00:00:00.000Z",
      },
    ],
  };

  const mockArchiveListWithHistory = {
    total: 2,
    documents: [
      {
        id: "book-1",
        fileName: "kinh_thien.epub",
        fileFormat: "epub",
        storageRelPath: "epub/aa/kinh_thien.epub",
        contentHash: "hash-book-1",
        lastPosition: { cfi: "epubcfi(/6/8!/4/2:0)", percentage: 30 },
        lastReadAt: "2026-10-18T10:00:00.000Z",
        readCount: 3,
      },
      {
        id: "adr-076",
        fileName: "ADR-076.md",
        fileFormat: "md",
        storageRelPath: "md/bb/ADR-076.md",
        contentHash: "hash-adr-076",
        lastPosition: { headingId: "quyet-dinh", percentage: 50 },
        lastReadAt: "2026-10-18T08:00:00.000Z",
        readCount: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Wipe RAM singleton to prove tests do not rely on in-memory store
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }
  });

  it("should_render_recent_reads_from_persisted_archive_metadata", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveListWithHistory,
          headers: { get: () => "application/json" },
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
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    // RAM store is empty, but shelf MUST render because persisted archive metadata contains reading history
    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    // Books with persisted lastPosition must appear
    expect(within(shelf).getByText("Kinh Thiền Cổ Truyền")).toBeInTheDocument();
    expect(within(shelf).getByText("ADR-076 Quyết định Kiến Trúc")).toBeInTheDocument();
  });

  it("should_survive_component_remount_without_ram_store", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchiveListWithHistory,
          headers: { get: () => "application/json" },
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

    // Mount 1
    const { unmount } = render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    await screen.findByTestId("recent-reads-shelf");
    unmount();

    // Ensure RAM store is wiped clean between mounts
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }

    // Mount 2 (Remount simulation)
    render(
      <DataProvider>
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    // Shelf must still be present and resilient
    const shelfAfterRemount = await screen.findByTestId("recent-reads-shelf");
    expect(shelfAfterRemount).toBeInTheDocument();
    expect(within(shelfAfterRemount).getByText("Kinh Thiền Cổ Truyền")).toBeInTheDocument();
  });

  it("should_promote_recently_closed_document_to_top_of_shelf", async () => {
    // Ban đầu book-1 đứng trước adr-076. Sau khi adr-076 được mở và đóng, adr-076 được cập nhật lastReadAt mới nhất và lên đầu.
    let currentArchive = {
      total: 2,
      documents: [
        {
          id: "book-1",
          fileName: "kinh_thien.epub",
          fileFormat: "epub",
          storageRelPath: "epub/aa/kinh_thien.epub",
          contentHash: "hash-book-1",
          lastPosition: { cfi: "epubcfi(/6/8!/4/2:0)" },
          lastReadAt: "2026-10-18T10:00:00.000Z",
        },
        {
          id: "book-2",
          fileName: "vi_dieu_phap.epub",
          fileFormat: "epub",
          storageRelPath: "epub/bb/vi_dieu_phap.epub",
          contentHash: "hash-book-2",
          lastPosition: { cfi: "epubcfi(/6/2!/4/1:0)" },
          lastReadAt: "2026-10-18T09:00:00.000Z",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => currentArchive,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs/content")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "adr-076",
            title: "ADR-076 Quyết định Kiến Trúc",
            category: "adr",
            relativePath: "adr/ADR-076.md",
            content: "# ADR-076\nNội dung",
            sizeBytes: 5120,
            lastModified: "2026-09-22T00:00:00.000Z",
          }),
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

    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    // Verify recent reads buttons order: book-1 is first
    const buttons = screen.getAllByRole("button", { name: /Đang đọc/i });
    expect(buttons[0]).toHaveTextContent("Kinh Thiền Cổ Truyền");
  });

  it("should_render_empty_state_in_shelf_when_no_persisted_history_exists", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, documents: [] }),
          headers: { get: () => "application/json" },
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
        <DocsExplorerView mode="full" />
      </DataProvider>
    );

    await waitFor(() => {
      const shelf = screen.getByTestId("recent-reads-shelf");
      expect(shelf).toBeInTheDocument();
      expect(within(shelf).getByText(/Chưa có tài liệu nào được đọc gần đây/i)).toBeInTheDocument();
      expect(within(shelf).queryAllByRole("button", { name: /Đang đọc/i })).toHaveLength(0);
    });
  });

  it("should_preserve_vault_identity_and_path_when_vault_book_shares_filename_with_docs_repo_book", async () => {
    // Scenario replicating the exact bug:
    // 1. Docs repo has a book at "books/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub"
    // 2. ArchivedDocs has a Vault book at "05_EPUB_Export/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub"
    const fetchedUrls: string[] = [];
    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      fetchedUrls.push(urlStr);

      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total: 1,
            documents: [
              {
                id: "vault-uuid-jiddu",
                fileName: "Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub",
                fileFormat: "epub",
                sourceType: "vault",
                sourcePath: "05_EPUB_Export/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub",
                storageRelPath: "vault://05_EPUB_Export/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub",
                sourceKey: "vault:05_EPUB_Export/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub",
                lastPosition: { cfi: "epubcfi(/6/4!/4/26/1:178)" },
                lastReadAt: "2026-10-21T07:36:21.737Z",
                readCount: 6,
              },
            ],
          }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            total: 1,
            categories: { books: 1 },
            documents: [
              {
                id: "books/09_tam_linh/duong_vao_hien_sinh",
                title: "Duong Vao Hien Sinh Jiddu Krishnamurti",
                category: "books",
                relativePath: "books/09_Tam_Linh_Nhan_Qua_Triet_Hoc/Duong_Vao_Hien_Sinh_Jiddu_Krishnamurti.epub",
                status: "EPUB",
                sizeBytes: 160936,
                lastModified: "2026-10-21T00:00:00.000Z",
              },
            ],
          }),
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/obsidian/vault/attachment") || urlStr.includes("/api/docs/raw")) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
          headers: { get: () => "application/epub+zip" },
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

    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    const recentBtn = await screen.findByRole("button", {
      name: /Đang đọc Duong Vao Hien Sinh/i,
    });
    expect(recentBtn).toBeInTheDocument();

    // Click to open in reader
    fireEvent.click(recentBtn);

    // Wait for reader to trigger file fetch
    await waitFor(() => {
      const attachmentCalls = fetchedUrls.filter((u) => u.includes("/attachment"));
      expect(attachmentCalls.length).toBeGreaterThanOrEqual(1);
    });

    // CRITICAL ASSERTION:
    // It must call /api/obsidian/vault/attachment with path=05_EPUB_Export/...
    // It must NEVER call with path=books/...
    const invalidCall = fetchedUrls.find((u) =>
      u.includes("/api/obsidian/vault/attachment?path=books")
    );
    expect(invalidCall).toBeUndefined();

    const validCall = fetchedUrls.find((u) =>
      u.includes("/api/obsidian/vault/attachment?path=05_EPUB_Export")
    );
    expect(validCall).toBeDefined();
  });
});
