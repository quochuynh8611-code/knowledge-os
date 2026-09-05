import { describe, it, expect, beforeEach } from "vitest";
import {
  ObsidianWikiLinkResolver,
  parseWikiLinkSyntax,
} from "../../src/lib/obsidianWikiLinkResolver";

describe("Phase P4.2C: Obsidian Wiki-Link Resolver", () => {
  const mockDocuments = [
    { title: "Bát Chánh Đạo Toàn Thư", filePath: "Study/Buddhism/Bat-Chanh-Dao.md" },
    { title: "Tu-Niem-Xu", filePath: "Study/Tu-Niem-Xu.md" },
    { title: "Special Note (Draft)", filePath: "Drafts/special-note.md" },
  ];

  let resolver: ObsidianWikiLinkResolver;

  beforeEach(() => {
    resolver = new ObsidianWikiLinkResolver(mockDocuments);
  });

  describe("parseWikiLinkSyntax", () => {
    it("parses simple wiki link [[Note Name]]", () => {
      const parsed = parseWikiLinkSyntax("[[Bát Chánh Đạo]]");
      expect(parsed).toEqual({
        targetTitle: "Bát Chánh Đạo",
        heading: undefined,
        alias: "Bát Chánh Đạo",
      });
    });

    it("parses wiki link with alias [[Note Name|Display Text]]", () => {
      const parsed = parseWikiLinkSyntax("[[Bát Chánh Đạo|Con Đường Tám Nhánh]]");
      expect(parsed).toEqual({
        targetTitle: "Bát Chánh Đạo",
        heading: undefined,
        alias: "Con Đường Tám Nhánh",
      });
    });

    it("parses wiki link with heading [[Note Name#Chánh Kiến]]", () => {
      const parsed = parseWikiLinkSyntax("[[Bát Chánh Đạo#Chánh Kiến]]");
      expect(parsed).toEqual({
        targetTitle: "Bát Chánh Đạo",
        heading: "Chánh Kiến",
        alias: "Bát Chánh Đạo#Chánh Kiến",
      });
    });

    it("parses wiki link with heading and alias [[Note Name#Chánh Kiến|1. Chánh Kiến]]", () => {
      const parsed = parseWikiLinkSyntax("[[Bát Chánh Đạo#Chánh Kiến|1. Chánh Kiến]]");
      expect(parsed).toEqual({
        targetTitle: "Bát Chánh Đạo",
        heading: "Chánh Kiến",
        alias: "1. Chánh Kiến",
      });
    });

    it("handles anchor to current note [[#Chánh Định|Mục 8]]", () => {
      const parsed = parseWikiLinkSyntax("[[#Chánh Định|Mục 8]]");
      expect(parsed).toEqual({
        targetTitle: "",
        heading: "Chánh Định",
        alias: "Mục 8",
      });
    });
  });

  describe("resolve", () => {
    it("resolves target matching frontmatter title (case-insensitive)", () => {
      const result = resolver.resolve("[[bát chánh đạo toàn thư]]");
      expect(result.filePath).toBe("Study/Buddhism/Bat-Chanh-Dao.md");
      expect(result.alias).toBe("bát chánh đạo toàn thư");
    });

    it("resolves target matching filename when title not matched", () => {
      const result = resolver.resolve("[[Tu-Niem-Xu]]");
      expect(result.filePath).toBe("Study/Tu-Niem-Xu.md");
    });

    it("resolves target with heading and preserves heading attribute", () => {
      const result = resolver.resolve("[[Bát Chánh Đạo Toàn Thư#Chánh Kiến|Đọc thêm]]");
      expect(result.filePath).toBe("Study/Buddhism/Bat-Chanh-Dao.md");
      expect(result.heading).toBe("Chánh Kiến");
      expect(result.alias).toBe("Đọc thêm");
    });

    it("returns null filePath for non-existent notes", () => {
      const result = resolver.resolve("[[Khong-Ton-Tai]]");
      expect(result.filePath).toBeNull();
      expect(result.alias).toBe("Khong-Ton-Tai");
    });

    it("uses cache on repeated resolutions", () => {
      const res1 = resolver.resolve("[[Tu-Niem-Xu]]");
      const res2 = resolver.resolve("[[Tu-Niem-Xu]]");
      expect(res1.filePath).toBe("Study/Tu-Niem-Xu.md");
      expect(res2.filePath).toBe("Study/Tu-Niem-Xu.md");
    });
  });
});
