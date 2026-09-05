import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ObsidianDocumentViewerModal } from "../../src/components/modals/ObsidianDocumentViewerModal";
import type { Resource } from "../../src/types";

describe("Phase P4.2D: ObsidianDocumentViewerModal Attachment Rendering", () => {
  const mockResource: Resource = {
    id: "res-media-1",
    topicId: "topic-1",
    title: "Tài Liệu Đa Phương Tiện",
    type: "md",
    filePath: "Media/Attachments-Note.md",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders image attachment correctly inside document viewer", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        relativePath: "Media/Attachments-Note.md",
        fileName: "Attachments-Note.md",
        frontmatter: { title: "Tài Liệu Đa Phương Tiện" },
        outline: [],
        content: "# Minh Họa\n\n![Bản đồ tư duy](assets/mindmap.png)",
        sizeBytes: 500,
        lastModified: "2026-09-05T12:00:00Z",
      }),
    } as Response);

    render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Minh Họa")).toBeInTheDocument();
    });

    const img = screen.getByRole("img", { name: "Bản đồ tư duy" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=assets%2Fmindmap.png"
    );
  });

  it("renders embedded PDF and Video transclusions inside document viewer", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        relativePath: "Media/Attachments-Note.md",
        fileName: "Attachments-Note.md",
        frontmatter: { title: "Tài Liệu Đa Phương Tiện" },
        outline: [],
        content:
          "# Đính kèm tài liệu\n\n![[reports/summary.pdf]]\n\n# Video\n\n![[clips/presentation.mp4]]",
        sizeBytes: 800,
        lastModified: "2026-09-05T12:00:00Z",
      }),
    } as Response);

    const { container } = render(
      <ObsidianDocumentViewerModal
        isOpen={true}
        onClose={vi.fn()}
        resource={mockResource}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Đính kèm tài liệu")).toBeInTheDocument();
    });

    const embed = container.querySelector("embed");
    expect(embed).not.toBeNull();
    expect(embed).toHaveAttribute("type", "application/pdf");
    expect(embed).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=reports%2Fsummary.pdf"
    );

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=clips%2Fpresentation.mp4"
    );
  });
});
