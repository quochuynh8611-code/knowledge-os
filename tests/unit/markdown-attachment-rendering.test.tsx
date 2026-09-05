import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MarkdownReadabilityRenderer } from "../../src/lib/markdownReadability";

describe("Phase P4.2D: Markdown Attachment & Embed Rendering", () => {
  it("renders standard markdown image ![alt](image.png) with attachment API src", () => {
    const md = "Hình minh họa: ![Sơ đồ hệ thống](assets/architecture.png)";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.getByRole("img", { name: "Sơ đồ hệ thống" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=assets%2Farchitecture.png"
    );
  });

  it("renders Obsidian transclusion ![[photo.jpg]] as <img>", () => {
    const md = "Xem ảnh sau:\n\n![[gallery/buddha-statue.jpg]]";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=gallery%2Fbuddha-statue.jpg"
    );
  });

  it("handles Obsidian size syntax ![[image.png|300x200]]", () => {
    const md = "![[diagram.png|300x200]]";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveStyle({ width: "300px", height: "200px" });
  });

  it("handles Obsidian width-only syntax ![[image.png|400]]", () => {
    const md = "![[chart.png|400]]";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveStyle({ width: "400px" });
  });

  it("renders PDF embed for ![[manual.pdf]]", () => {
    const md = "Tài liệu đính kèm:\n\n![[books/Abhidhamma-Guide.pdf]]";
    const { container } = render(<MarkdownReadabilityRenderer content={md} />);

    const embed = container.querySelector("embed");
    expect(embed).not.toBeNull();
    expect(embed).toHaveAttribute("type", "application/pdf");
    expect(embed).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=books%2FAbhidhamma-Guide.pdf"
    );
  });

  it("renders Video player for ![[video.mp4]]", () => {
    const md = "Xem video bài giảng:\n\n![[lectures/dhamma-talk.mp4]]";
    const { container } = render(<MarkdownReadabilityRenderer content={md} />);

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute(
      "src",
      "/api/obsidian/vault/attachment?path=lectures%2Fdhamma-talk.mp4"
    );
  });

  it("renders external https:// images safely", () => {
    const md = "![Web Logo](https://example.com/logo.png)";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.getByRole("img", { name: "Web Logo" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("neutralizes dangerous javascript: scheme in image src", () => {
    const md = "![Malicious](javascript:alert(1))";
    render(<MarkdownReadabilityRenderer content={md} />);

    const img = screen.queryByRole("img");
    expect(img).toBeNull();
  });
});
