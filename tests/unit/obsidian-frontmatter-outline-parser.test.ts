import { describe, it, expect } from "vitest";
// Target module to be implemented in Phase P4.1
import {
  parseObsidianFrontmatterAndOutline,
} from "../../src/lib/obsidianParser";

describe("Phase P4.1: Obsidian Frontmatter & Outline Parser", () => {
  it("extracts YAML frontmatter fields correctly and strips frontmatter from parsed.content", () => {
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
    expect(parsed.frontmatter.author).toBe("Đại Sư");

    // Content MUST NOT contain the frontmatter block
    expect(parsed.content).not.toContain("---");
    expect(parsed.content).not.toContain("aliases:");
    expect(parsed.content.trim()).toBe("# Bát Chánh Đạo Toàn Thư\n\nNội dung khảo cứu Phật học...");
  });

  it("handles multi-line YAML tags, colons in values, and custom fields", () => {
    const rawMarkdown = `---
title: "Khao Cứu Kinh Điển: Tập 1"
nikaya: "Majjhima Nikaya 38"
tags:
  - phat-hoc
  - kinh-dien
  - majjhima
status: completed
type: study-note
version: 1.2
published: true
---
# Luận Giải Chi Tiết
Nội dung bài viết...`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.frontmatter.title).toBe("Khao Cứu Kinh Điển: Tập 1");
    expect(parsed.frontmatter.nikaya).toBe("Majjhima Nikaya 38");
    expect(parsed.frontmatter.tags).toEqual(["phat-hoc", "kinh-dien", "majjhima"]);
    expect(parsed.frontmatter.status).toBe("completed");
    expect(parsed.frontmatter.type).toBe("study-note");
    expect(parsed.frontmatter.version).toBe(1.2);
    expect(parsed.frontmatter.published).toBe(true);

    expect(parsed.content).not.toContain("Majjhima Nikaya 38");
    expect(parsed.content.trim()).toBe("# Luận Giải Chi Tiết\nNội dung bài viết...");
  });

  it("disambiguates duplicate heading IDs deterministically in outline", () => {
    const rawMarkdown = `# Tổng Quan
## Ghi chú
Nội dung 1
## Ghi chú
Nội dung 2
## Ghi chú
Nội dung 3
## Phương pháp
Nội dung 4
## Phương pháp
Nội dung 5
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.outline).toHaveLength(6);
    expect(parsed.outline[0]).toEqual({ level: 1, text: "Tổng Quan", id: "tong-quan" });
    expect(parsed.outline[1]).toEqual({ level: 2, text: "Ghi chú", id: "ghi-chu" });
    expect(parsed.outline[2]).toEqual({ level: 2, text: "Ghi chú", id: "ghi-chu-1" });
    expect(parsed.outline[3]).toEqual({ level: 2, text: "Ghi chú", id: "ghi-chu-2" });
    expect(parsed.outline[4]).toEqual({ level: 2, text: "Phương pháp", id: "phuong-phap" });
    expect(parsed.outline[5]).toEqual({ level: 2, text: "Phương pháp", id: "phuong-phap-1" });
  });

  it("handles Markdown without frontmatter gracefully", () => {
    const rawMarkdown = `# Không có Frontmatter

Chỉ có nội dung văn bản thuần...
`;

    const parsed = parseObsidianFrontmatterAndOutline(rawMarkdown);
    expect(parsed.frontmatter).toEqual({});
    expect(parsed.content).toBe(rawMarkdown);
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
