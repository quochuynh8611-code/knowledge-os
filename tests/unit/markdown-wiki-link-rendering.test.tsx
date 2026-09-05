import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  renderInlineMarkdownWithWikiLinks,
  MarkdownReadabilityRenderer,
} from "../../src/lib/markdownReadability";
import { ObsidianWikiLinkResolver } from "../../src/lib/obsidianWikiLinkResolver";

describe("Phase P4.2C: Markdown Wiki-Link Rendering Integration", () => {
  const mockResolver = new ObsidianWikiLinkResolver([
    { title: "Bát Chánh Đạo Toàn Thư", filePath: "Study/Buddhism/Bat-Chanh-Dao.md" },
    { title: "Tu-Niem-Xu", filePath: "Study/Tu-Niem-Xu.md" },
  ]);

  it("renders a clickable link when wiki-link resolves to a vault note", () => {
    const onOpenVaultLink = vi.fn();
    render(
      <div>
        {renderInlineMarkdownWithWikiLinks(
          "Xem thêm tại [[Bát Chánh Đạo Toàn Thư]].",
          [],
          undefined,
          mockResolver,
          onOpenVaultLink
        )}
      </div>
    );

    const link = screen.getByRole("link", { name: "Bát Chánh Đạo Toàn Thư" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-filepath", "Study/Buddhism/Bat-Chanh-Dao.md");

    fireEvent.click(link);
    expect(onOpenVaultLink).toHaveBeenCalledWith("Study/Buddhism/Bat-Chanh-Dao.md", undefined);
  });

  it("renders custom alias text when wiki-link contains a pipe", () => {
    render(
      <div>
        {renderInlineMarkdownWithWikiLinks(
          "Khảo sát [[Tu-Niem-Xu|Bốn Lĩnh Vực Quán Chiếu]] ngay.",
          [],
          undefined,
          mockResolver
        )}
      </div>
    );

    const link = screen.getByRole("link", { name: "Bốn Lĩnh Vực Quán Chiếu" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-filepath", "Study/Tu-Niem-Xu.md");
  });

  it("renders plain span text when wiki-link does not resolve to any note or topic", () => {
    render(
      <div>
        {renderInlineMarkdownWithWikiLinks(
          "Tham khảo [[Ghi-Chú-Không-Tồn-Tại]].",
          [],
          undefined,
          mockResolver
        )}
      </div>
    );

    expect(screen.queryByRole("link", { name: "Ghi-Chú-Không-Tồn-Tại" })).toBeNull();
    expect(screen.getByText("Ghi-Chú-Không-Tồn-Tại")).toBeInTheDocument();
  });

  it("handles wiki-link with heading anchor", () => {
    const onOpenVaultLink = vi.fn();
    render(
      <div>
        {renderInlineMarkdownWithWikiLinks(
          "Đọc [[Bát Chánh Đạo Toàn Thư#Chánh Kiến|1. Chánh Kiến]].",
          [],
          undefined,
          mockResolver,
          onOpenVaultLink
        )}
      </div>
    );

    const link = screen.getByRole("link", { name: "1. Chánh Kiến" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-filepath", "Study/Buddhism/Bat-Chanh-Dao.md");
    expect(link).toHaveAttribute("data-heading", "Chánh Kiến");

    fireEvent.click(link);
    expect(onOpenVaultLink).toHaveBeenCalledWith(
      "Study/Buddhism/Bat-Chanh-Dao.md",
      "Chánh Kiến"
    );
  });

  it("safely escapes potential XSS injection inside wiki-links", () => {
    render(
      <div>
        {renderInlineMarkdownWithWikiLinks(
          "Thử [[<script>alert(1)</script>]]",
          [],
          undefined,
          mockResolver
        )}
      </div>
    );

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("supports vaultResolver inside MarkdownReadabilityRenderer component", () => {
    const onOpenVaultLink = vi.fn();
    render(
      <MarkdownReadabilityRenderer
        content="Nội dung gồm có [[Tu-Niem-Xu]] được dẫn nguồn."
        vaultResolver={mockResolver}
        onOpenVaultLink={onOpenVaultLink}
      />
    );

    const link = screen.getByRole("link", { name: "Tu-Niem-Xu" });
    expect(link).toBeInTheDocument();
  });
});
