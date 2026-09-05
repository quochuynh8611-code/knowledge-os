import { describe, it, expect } from "vitest";
// Target module to be implemented in Phase P4.1
import {
  parseObsidianFrontmatterAndOutline,
} from "../../src/lib/obsidianParser";

describe("Phase P4.1: Obsidian Frontmatter & Outline Parser", () => {
  it("extracts YAML frontmatter fields correctly", () => {
    const rawMarkdown = `---
title: "Bát Chánh Đạo Toàn Thư"
tags: ["phat-hoc", "dao-de"]
aliases: ["Eightfold Path"]
author: "Đại Sư"
---
# Bát Chánh Đạo Toàn Thư

Nội dung khảo cứu Phật học...
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.frontmatter).toBeDefined();
    expect(parsed.frontmatter.title).toBe("Bát Chánh Đạo Toàn Thư");
    expect(parsed.frontmatter.tags).toEqual(["phat-hoc", "dao-de"]);
    expect(parsed.frontmatter.aliases).toEqual(["Eightfold Path"]);
  });

  it("handles Markdown without frontmatter gracefully", () => {
    const rawMarkdown = `# Không có Frontmatter

Chỉ có nội dung văn bản thuần...
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.frontmatter).toEqual({});
    expect(parsed.content).toContain("# Không có Frontmatter");
  });

  it("extracts multi-level outline headings (H1, H2, H3)", () => {
    const rawMarkdown = `# Tiêu Đề Cấp 1
## Mục 1.1 Khái Niệm
Đoạn văn...
### Điểm 1.1.1 Chi Tiết
Đoạn văn...
## Mục 1.2 Thực Hành
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.outline).toHaveLength(4);
    expect(parsed.outline[0]).toEqual({
      level: 1,
      text: "Tiêu Đề Cấp 1",
      id: "tieu-de-cap-1",
    });
    expect(parsed.outline[1]).toEqual({
      level: 2,
      text: "Mục 1.1 Khái Niệm",
      id: "muc-1-1-khai-niem",
    });
    expect(parsed.outline[2]).toEqual({
      level: 3,
      text: "Điểm 1.1.1 Chi Tiết",
      id: "diem-1-1-1-chi-tiet",
    });
    expect(parsed.outline[3]).toEqual({
      level: 2,
      text: "Mục 1.2 Thực Hành",
      id: "muc-1-2-thuc-hanh",
    });
  });

  it("ignores headings inside code blocks", () => {
    const rawMarkdown = `# Tiêu Đề Ngoài

\`\`\`markdown
# Đây là heading giả trong code block
## Heading giả cấp 2
\`\`\`

## Tiêu Đề Thực
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.outline).toHaveLength(2);
    expect(parsed.outline[0].text).toBe("Tiêu Đề Ngoài");
    expect(parsed.outline[1].text).toBe("Tiêu Đề Thực");
  });
});
