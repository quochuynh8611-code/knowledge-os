import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DocsExplorerView } from "../../src/components/docs/DocsExplorerView";

describe("Phase P12.3: DocsExplorerView Frontend UI Integration Contract", () => {
  const mockDocsList = {
    total: 3,
    categories: { adr: 2, specs: 1, gherkin: 0 },
    documents: [
      {
        id: "adr-061-multi-facet-filtering-toolbar",
        title: "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon",
        category: "adr",
        relativePath: "adr/ADR-061-multi-facet-filtering-toolbar.md",
        status: "ACCEPTED",
        sizeBytes: 8055,
        lastModified: "2026-08-30T05:13:20.000Z",
      },
      {
        id: "adr-060-tcm-registry-integration",
        title: "ADR-060: Traditional Chinese Medicine Registry Integration",
        category: "adr",
        relativePath: "adr/ADR-060-tcm-registry-integration-and-domain-taxonomy.md",
        status: "ACCEPTED",
        sizeBytes: 9230,
        lastModified: "2026-08-30T04:00:00.000Z",
      },
      {
        id: "p12-2-wave-3-spec",
        title: "Specification: Phase P12.2 Wave 3 — Multi-Facet Filtering Toolbar",
        category: "specs",
        relativePath: "specs/p12-2-wave-3-multi-facet-filtering-toolbar.md",
        status: "SPEC",
        sizeBytes: 7506,
        lastModified: "2026-08-30T05:13:27.000Z",
      },
    ],
  };

  const mockDocContent = {
    id: "adr-061-multi-facet-filtering-toolbar",
    title: "ADR-061: Multi-Facet Filtering Toolbar for Multilingual Lexicon",
    category: "adr",
    status: "ACCEPTED",
    relativePath: "adr/ADR-061-multi-facet-filtering-toolbar.md",
    content: "# ADR-061: Multi-Facet Filtering Toolbar\n\n## Context\nNội dung khảo cứu kiến trúc đa tầng.",
    sizeBytes: 8055,
    lastModified: "2026-08-30T05:13:20.000Z",
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/docs/content")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockDocContent),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockDocsList),
        });
      })
    );
  });

  it("1. Renders Documentation Overview by default without auto-opening specific document", async () => {
    render(<DocsExplorerView />);

    expect(screen.getByText(/Tài Liệu Kiến Trúc & Đặc Tả Hệ Thống/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm kiếm tài liệu/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/ADR-061: Multi-Facet Filtering Toolbar/i)).toBeInTheDocument();
    });
  });

  it("2. Filters document list when clicking Category filter tabs", async () => {
    render(<DocsExplorerView />);

    await waitFor(() => {
      expect(screen.getByText(/ADR-061: Multi-Facet Filtering Toolbar/i)).toBeInTheDocument();
    });

    // Click "Specs" category tab
    const specsTab = screen.getByRole("button", { name: /^Specs$/i });
    fireEvent.click(specsTab);

    // Only Specs should be visible, ADRs hidden
    expect(screen.getByText(/Specification: Phase P12.2 Wave 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/ADR-060: Traditional Chinese Medicine/i)).toBeNull();
  });

  it("3. Loads and displays document content when clicking a document item", async () => {
    render(<DocsExplorerView />);

    await waitFor(() => {
      expect(screen.getByText(/ADR-061: Multi-Facet Filtering Toolbar/i)).toBeInTheDocument();
    });

    const docItem = screen.getByText(/ADR-061: Multi-Facet Filtering Toolbar/i);
    fireEvent.click(docItem);

    await waitFor(() => {
      expect(screen.getByText(/Nội dung khảo cứu kiến trúc đa tầng/i)).toBeInTheDocument();
    });
  });

  it("4. Handles refresh action smoothly", async () => {
    render(<DocsExplorerView />);

    await waitFor(() => {
      expect(screen.getByText(/ADR-061: Multi-Facet Filtering Toolbar/i)).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole("button", { name: /Làm mới/i });
    fireEvent.click(refreshBtn);

    expect(global.fetch).toHaveBeenCalled();
  });
});
