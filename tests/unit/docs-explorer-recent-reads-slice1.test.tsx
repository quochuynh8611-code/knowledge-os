import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

describe("Slice 1: Reading History & Recent Reads Display (TDD Red Stage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Wipe RAM store to ensure isolation
    const all = globalReadingPositionStore.getAllPositions();
    for (const key of Object.keys(all)) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        globalReadingPositionStore.clearPosition(parts[1], parts[2]);
      }
    }
  });

  it("Scenario 1: displays newly registered ArchivedDocument in Recent Reads shelf even when lastPosition and lastReadAt are null", async () => {
    const mockArchivedList = {
      total: 1,
      documents: [
        {
          id: "arch-doc-newly-registered",
          fileName: "kinh_kim_cang.epub",
          fileFormat: "epub",
          sourceType: "vault",
          sourcePath: "05_EPUB_Export/kinh_kim_cang.epub",
          sourceKey: "vault:05_EPUB_Export/kinh_kim_cang.epub",
          storageRelPath: "vault://05_EPUB_Export/kinh_kim_cang.epub",
          contentHash: "hash-kim-cang",
          lastPosition: null, // Chưa có vị trí đọc
          lastReadAt: null,   // Chưa có thời gian đọc
          createdAt: "2026-10-19T06:00:00.000Z",
          updatedAt: "2026-10-19T06:00:00.000Z",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchivedList,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, documents: [] }),
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

    // The shelf must render and NOT filter out this registered document
    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    // The newly registered document must appear in recent reads
    expect(within(shelf).getByText(/kinh kim cang/i)).toBeInTheDocument();
  });

  it("Scenario 2: displays clean empty state with 'Chưa có tài liệu nào được đọc gần đây' when database has 0 records", async () => {
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
          json: async () => ({ total: 0, documents: [] }),
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

    // Recent reads shelf must display clean empty state message and no fake cards
    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();
    expect(within(shelf).getByText(/Chưa có tài liệu nào được đọc gần đây/i)).toBeInTheDocument();
    expect(within(shelf).queryAllByRole("button", { name: /Đang đọc/i })).toHaveLength(0);
  });

  it("Scenario 3: stably orders multiple registered documents by recency (lastReadAt || updatedAt || createdAt)", async () => {
    const mockArchivedList = {
      total: 3,
      documents: [
        {
          id: "doc-older-registered",
          fileName: "bai_viet_cu.md",
          fileFormat: "md",
          sourceType: "vault",
          sourcePath: "docs/bai_viet_cu.md",
          sourceKey: "vault:docs/bai_viet_cu.md",
          lastPosition: null,
          lastReadAt: null,
          createdAt: "2026-10-18T01:00:00.000Z",
          updatedAt: "2026-10-18T01:00:00.000Z",
        },
        {
          id: "doc-read-yesterday",
          fileName: "sach_doc_hom_qua.epub",
          fileFormat: "epub",
          sourceType: "vault",
          sourcePath: "05_EPUB_Export/sach_doc_hom_qua.epub",
          sourceKey: "vault:05_EPUB_Export/sach_doc_hom_qua.epub",
          lastPosition: { cfi: "epubcfi(/6/2)" },
          lastReadAt: "2026-10-18T10:00:00.000Z",
          createdAt: "2026-10-17T00:00:00.000Z",
          updatedAt: "2026-10-18T10:00:00.000Z",
        },
        {
          id: "doc-just-registered-today",
          fileName: "tai_lieu_moi_hom_nay.pdf",
          fileFormat: "pdf",
          sourceType: "vault",
          sourcePath: "docs/tai_lieu_moi_hom_nay.pdf",
          sourceKey: "vault:docs/tai_lieu_moi_hom_nay.pdf",
          lastPosition: null,
          lastReadAt: null,
          createdAt: "2026-10-19T05:00:00.000Z", // Mới nhất hôm nay
          updatedAt: "2026-10-19T05:00:00.000Z",
        },
      ],
    };

    global.fetch = vi.fn().mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("/api/archive/list")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockArchivedList,
          headers: { get: () => "application/json" },
        });
      }
      if (urlStr.includes("/api/docs")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ total: 0, documents: [] }),
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

    const shelf = await screen.findByTestId("recent-reads-shelf");
    expect(shelf).toBeInTheDocument();

    const buttons = within(shelf).getAllByRole("button", { name: /Đang đọc/i });
    expect(buttons.length).toBe(3);

    // 1st: tai_lieu_moi_hom_nay (2026-10-19T05:00)
    expect(buttons[0]).toHaveTextContent(/tai lieu moi hom nay/i);
    // 2nd: sach_doc_hom_qua (2026-10-18T10:00)
    expect(buttons[1]).toHaveTextContent(/sach doc hom qua/i);
    // 3rd: bai_viet_cu (2026-10-18T01:00)
    expect(buttons[2]).toHaveTextContent(/bai viet cu/i);
  });
});
