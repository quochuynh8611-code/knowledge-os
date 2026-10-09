import { describe, it, expect } from "vitest";
import {
  parseMindMapMarkdownOutline,
  validateImportTree,
} from "../../src/lib/mindmapImportParser";

describe("Phase I1: Pure Mind Map Markdown Outline Parser & Validator", () => {
  it("Scenario 1: Parse standard 2-space indented Markdown outline", () => {
    const markdown = `# 🗺️ Sơ Đồ Tư Duy: Bát Chánh Đạo
> Nguồn: Knowledge OS • Xuất bản lúc: 2026-10-09T00:00:00.000Z

- 📚 **[Chánh Kiến](#/topics/topic-chanh-kien)**
  - [tiên quyết] 📚 **[Chánh Tư Duy](#/topics/topic-chanh-tu-duy)**
    - [nâng cao] 📚 **[Chánh Ngữ](#/topics/topic-chanh-ngu)**
  - [liên quan] 📚 **[Chánh Nghiệp](#/topics/topic-chanh-nghiep)**
`;

    const result = parseMindMapMarkdownOutline(markdown);

    expect(result.status).toBe("SUCCESS");
    expect(result.totalNodeCount).toBe(5); // 1 heading root + 4 bullet nodes
    expect(result.maxDepth).toBe(3);
    expect(result.root).not.toBeNull();
    expect(result.root?.title).toBe("Bát Chánh Đạo");
    expect(result.root?.children.length).toBe(1);

    const chanhKien = result.root?.children[0];
    expect(chanhKien?.title).toBe("Chánh Kiến");
    expect(chanhKien?.sourceIdReference).toBe("topic-chanh-kien");
    expect(chanhKien?.children.length).toBe(2);

    const chanhTuDuy = chanhKien?.children[0];
    expect(chanhTuDuy?.title).toBe("Chánh Tư Duy");
    expect(chanhTuDuy?.edgeTypeToParent).toBe("prerequisite");
    expect(chanhTuDuy?.children[0]?.title).toBe("Chánh Ngữ");
    expect(chanhTuDuy?.children[0]?.edgeTypeToParent).toBe("advanced");

    const chanhNghiep = chanhKien?.children[1];
    expect(chanhNghiep?.title).toBe("Chánh Nghiệp");
    expect(chanhNghiep?.edgeTypeToParent).toBe("related");
  });

  it("Scenario 2: Parse mixed indentation with automatic normalization", () => {
    const markdown = `- Root Node
\t- Child via Tab
\t  - Grandchild via Tab plus 2 Spaces
\t\t\t- Great-grandchild via 3 Tabs
`;

    const result = parseMindMapMarkdownOutline(markdown, { tabSize: 2 });

    expect(result.status).toBe("WARNING");
    expect(result.warnings.some((w) => w.code === "MIXED_INDENTATION")).toBe(true);
    expect(result.totalNodeCount).toBe(4);
    expect(result.maxDepth).toBe(3);
    expect(result.root?.title).toBe("Root Node");
    expect(result.root?.children[0]?.title).toBe("Child via Tab");
    expect(result.root?.children[0]?.children[0]?.title).toBe("Grandchild via Tab plus 2 Spaces");
    expect(result.root?.children[0]?.children[0]?.children[0]?.title).toBe("Great-grandchild via 3 Tabs");
  });

  it("Scenario 3: Extract all semantic badges accurately", () => {
    const markdown = `- Root
  - [tiên quyết] Node 1
  - [nâng cao] Node 2
  - [liên quan] Node 3
  - [đối chiếu] Node 4
  - [ghi chú] Node 5
  - [tài liệu] Node 6
`;

    const result = parseMindMapMarkdownOutline(markdown);
    expect(result.status).toBe("SUCCESS");
    const children = result.root?.children || [];
    expect(children[0].edgeTypeToParent).toBe("prerequisite");
    expect(children[1].edgeTypeToParent).toBe("advanced");
    expect(children[2].edgeTypeToParent).toBe("related");
    expect(children[3].edgeTypeToParent).toBe("contradicts");
    expect(children[4].edgeTypeToParent).toBe("has_note");
    expect(children[5].edgeTypeToParent).toBe("has_resource");
  });

  it("Scenario 4: Extract markdown links + sourceIdReference and strip formatting", () => {
    const markdown = `- **[Tứ Diệu Đế](#/topics/tu-dieu-de)**
  - *Khổ Đế*
  - [Tập Đế](/topics/tap-dieu-de)
  - **Diệt Đế**
`;

    const result = parseMindMapMarkdownOutline(markdown);
    expect(result.status).toBe("SUCCESS");
    expect(result.root?.title).toBe("Tứ Diệu Đế");
    expect(result.root?.sourceIdReference).toBe("tu-dieu-de");

    const children = result.root?.children || [];
    expect(children[0].title).toBe("Khổ Đế");
    expect(children[1].title).toBe("Tập Đế");
    expect(children[1].sourceIdReference).toBe("tap-dieu-de");
    expect(children[2].title).toBe("Diệt Đế");
  });

  it("Scenario 5: Detect jump indentation warning and clamp gracefully", () => {
    const markdown = `- Root Level 0
        - Jump Node Level 4 without intermediate parent
`;

    const result = parseMindMapMarkdownOutline(markdown, { tabSize: 2 });
    expect(result.status).toBe("WARNING");
    expect(result.warnings.some((w) => w.code === "JUMP_INDENTATION")).toBe(true);
    expect(result.totalNodeCount).toBe(2);
    // Clamped from level 4 to level 1 under Root
    expect(result.root?.children[0]?.title).toBe("Jump Node Level 4 without intermediate parent");
    expect(result.root?.children[0]?.depth).toBe(1);
  });

  it("Scenario 6: Handle empty, whitespace-only, and non-bullet plain text without crashing", () => {
    const emptyResult = parseMindMapMarkdownOutline("");
    expect(emptyResult.status).toBe("EMPTY_OR_INVALID");
    expect(emptyResult.errors.length).toBeGreaterThan(0);
    expect(emptyResult.root).toBeNull();

    const whitespaceResult = parseMindMapMarkdownOutline("   \n\n\t  \n");
    expect(whitespaceResult.status).toBe("EMPTY_OR_INVALID");
    expect(whitespaceResult.root).toBeNull();

    const plainTextResult = parseMindMapMarkdownOutline("This is a paragraph without any bullet points or headings.");
    expect(plainTextResult.status).toBe("EMPTY_OR_INVALID");
    expect(plainTextResult.root).toBeNull();
  });

  it("Scenario 7: Mixed node icons topic, note, resource detection", () => {
    const markdown = `- 📚 Chủ đề Kiến thức
  - 📝 Ghi chú về Bản chất \`[Tiến độ: 80%]\`
  - 🔗 Tài liệu tham khảo PDF
`;

    const result = parseMindMapMarkdownOutline(markdown);
    expect(result.status).toBe("SUCCESS");
    expect(result.root?.nodeType).toBe("topic");
    expect(result.root?.title).toBe("Chủ đề Kiến thức");

    const noteChild = result.root?.children[0];
    expect(noteChild?.nodeType).toBe("note");
    expect(noteChild?.title).toBe("Ghi chú về Bản chất");
    expect(noteChild?.edgeTypeToParent).toBe("has_note");
    expect(noteChild?.progressPercent).toBe(80);
    expect(noteChild?.studyStatusText).toBe("Tiến độ: 80%");

    const resChild = result.root?.children[1];
    expect(resChild?.nodeType).toBe("resource");
    expect(resChild?.title).toBe("Tài liệu tham khảo PDF");
    expect(resChild?.edgeTypeToParent).toBe("has_resource");
  });

  it("Scenario 8: Deterministic output shape for identical inputs", () => {
    const markdown = `- Root
  - A
  - B
    - C
`;

    const run1 = parseMindMapMarkdownOutline(markdown);
    const run2 = parseMindMapMarkdownOutline(markdown);

    expect(JSON.stringify(run1)).toEqual(JSON.stringify(run2));
  });

  it("Scenario 9: Validate import tree rules (maxDepth, maxNodes, multiple roots)", () => {
    const multiRootMarkdown = `- Root A
  - Child A1
- Root B
  - Child B1
`;

    const parsed = parseMindMapMarkdownOutline(multiRootMarkdown);
    expect(parsed.forest.length).toBe(2);

    const validationValid = validateImportTree(parsed);
    expect(validationValid.isValid).toBe(true);

    const validationStrict = validateImportTree(parsed, {
      disallowMultipleRoots: true,
      maxDepthLimit: 1,
      maxNodesLimit: 2,
    });
    expect(validationStrict.isValid).toBe(false);
    expect(validationStrict.issues.length).toBe(2); // multiple roots + max nodes limit exceeded
  });
});
