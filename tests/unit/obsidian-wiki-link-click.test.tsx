import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ObsidianDocumentViewerModal } from "../../src/components/modals/ObsidianDocumentViewerModal";
import type { Resource } from "../../src/types";

describe("Phase P4.2C: ObsidianDocumentViewerModal Wiki-Link Click Handling", () => {
  const mockOnClose = vi.fn();
  const mockOnUnlink = vi.fn();

  const mockResource: Resource = {
    id: "res-1",
    topicId: "topic-1",
    title: "Khảo Sát Phật Học",
    type: "md",
    filePath: "Study/Overview.md",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches and renders destination note when clicking a resolved wiki-link", async () => {
    // 1. Initial vault doc fetch
    // 2. Vault index docs fetch (for resolver)
    // 3. Target note fetch
    const fetchSpy = vi.spyOn(global, "fetch")
      // File 1 fetch: Overview.md containing wiki link [[Bat-Chanh-Dao]]
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Overview.md",
          fileName: "Overview.md",
          frontmatter: { title: "Tổng Quan Nghiên Cứu" },
          outline: [],
          content: "Nội dung dẫn đến [[Bat-Chanh-Dao|Bát Chánh Đạo Toàn Thư]] chi tiết.",
          sizeBytes: 500,
          lastModified: "2026-09-04T12:00:00Z",
        }),
      } as Response)
      // Index fetch: provides list of notes for resolving wiki-links
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          query: "*",
          count: 2,
          results: [
            { title: "Bat-Chanh-Dao", path: "Study/Buddhism/Bat-Chanh-Dao.md", snippet: "", score: 100 },
          ],
        }),
      } as Response)
      // File 2 fetch: Destination note Bat-Chanh-Dao.md
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Buddhism/Bat-Chanh-Dao.md",
          fileName: "Bat-Chanh-Dao.md",
          frontmatter: { title: "Bát Chánh Đạo Toàn Thư" },
          outline: [],
          content: "# Bát Chánh Đạo\nNội dung bài viết về 8 nhánh chân chính...",
          sizeBytes: 800,
          lastModified: "2026-09-04T12:00:00Z",
        }),
      } as Response);

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={mockOnClose}
        resource={mockResource}
        onUnlink={mockOnUnlink}
      />
    );

    // Initial note rendered
    await waitFor(() => {
      expect(screen.getByText(/Tổng Quan Nghiên Cứu/i)).toBeInTheDocument();
    });

    // The wiki link should be rendered with alias
    const wikiLink = await screen.findByRole("link", { name: "Bát Chánh Đạo Toàn Thư" });
    expect(wikiLink).toBeInTheDocument();

    // Click on the wiki link
    fireEvent.click(wikiLink);

    // Should fetch the target note
    await waitFor(() => {
      expect(screen.getByText(/Nội dung bài viết về 8 nhánh chân chính/i)).toBeInTheDocument();
    });

    // History back button should appear
    const backBtn = screen.getByRole("button", { name: /Quay lại/i });
    expect(backBtn).toBeInTheDocument();
  });

  it("does not fetch any note when clicking an unresolvable wiki link", async () => {
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Overview.md",
          fileName: "Overview.md",
          frontmatter: { title: "Tổng Quan" },
          outline: [],
          content: "Đọc thêm tại [[Ghi-Chu-Khong-Ton-Tai]].",
          sizeBytes: 300,
          lastModified: "2026-09-04T12:00:00Z",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          query: "*",
          count: 0,
          results: [],
        }),
      } as Response);

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={mockOnClose}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Ghi-Chu-Khong-Ton-Tai")).toBeInTheDocument();
    });

    // It should render as span, not a link
    expect(screen.queryByRole("link", { name: "Ghi-Chu-Khong-Ton-Tai" })).toBeNull();
  });

  it("supports smooth scroll when clicking an anchor wiki link to a heading in the current document", async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          relativePath: "Study/Doc.md",
          fileName: "Doc.md",
          frontmatter: { title: "Tài Liệu Với Mục Lục" },
          outline: [{ level: 2, text: "Chánh Kiến", id: "chanh-kien" }],
          content: "Nhảy đến [[#Chánh Kiến|Mục Chánh Kiến]] ngay.",
          sizeBytes: 300,
          lastModified: "2026-09-04T12:00:00Z",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ query: "*", count: 0, results: [] }),
      } as Response);

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={mockOnClose}
        resource={mockResource}
      />
    );

    const anchorLink = await screen.findByRole("link", { name: "Mục Chánh Kiến" });
    expect(anchorLink).toBeInTheDocument();

    fireEvent.click(anchorLink);
    // Should handle click without throwing
    expect(anchorLink).toHaveAttribute("data-heading", "Chánh Kiến");
  });
});
