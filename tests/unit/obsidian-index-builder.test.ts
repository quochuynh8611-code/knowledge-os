import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { buildObsidianVaultIndex, ObsidianVaultIndex } from "../../src/lib/obsidianIndexBuilder";

describe("Phase P4.2B: Obsidian Index Builder", () => {
  let tempVaultDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-index-"));

    // Structure
    fs.mkdirSync(path.join(tempVaultDir, "Study", "Buddhism"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, ".git"), { recursive: true });

    // Files
    fs.writeFileSync(
      path.join(tempVaultDir, "Study", "Buddhism", "Bat-Chanh-Dao.md"),
      `---
title: "Bát Chánh Đạo"
tags: ["phat-hoc", "dao-de"]
---
# Bát Chánh Đạo
Con đường tám nhánh dẫn đến giải thoát và chấm dứt khổ đau.`,
      "utf8"
    );

    fs.writeFileSync(
      path.join(tempVaultDir, "Study", "Tu-Niem-Xu.md"),
      `# Tứ Niệm Xứ
Bốn đối tượng quán chiếu: thân, thọ, tâm, pháp.`,
      "utf8"
    );

    fs.writeFileSync(
      path.join(tempVaultDir, "README.md"),
      `# Kho Tri Thức Obsidian
Tài liệu tổng quan về hệ thống ghi chép cá nhân.`,
      "utf8"
    );

    // Hidden and non-md files
    fs.writeFileSync(path.join(tempVaultDir, ".obsidian", "config.json"), "{}", "utf8");
    fs.writeFileSync(path.join(tempVaultDir, "Study", "image.png"), "fake image", "utf8");
  });

  afterEach(() => {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  });

  it("builds index correctly for markdown files and ignores sensitive directories", async () => {
    const docs = await buildObsidianVaultIndex(tempVaultDir);

    // Should index 3 valid markdown files
    expect(docs).toHaveLength(3);

    const paths = docs.map((d) => d.filePath);
    expect(paths).toContain("Study/Buddhism/Bat-Chanh-Dao.md");
    expect(paths).toContain("Study/Tu-Niem-Xu.md");
    expect(paths).toContain("README.md");

    // Sensitive files must not be indexed
    expect(paths).not.toContain(".obsidian/config.json");
    expect(paths).not.toContain("Study/image.png");

    // Title resolution
    const batChanhDao = docs.find((d) => d.filePath === "Study/Buddhism/Bat-Chanh-Dao.md");
    expect(batChanhDao?.title).toBe("Bát Chánh Đạo");
    expect(batChanhDao?.tags).toEqual(["phat-hoc", "dao-de"]);
    expect(batChanhDao?.content).toContain("Con đường tám nhánh");

    // Fallback title from filename when frontmatter is missing
    const tuNiemXu = docs.find((d) => d.filePath === "Study/Tu-Niem-Xu.md");
    expect(tuNiemXu?.title).toBe("Tu-Niem-Xu");
  });

  it("returns empty array for empty vault directory", async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-empty-"));
    try {
      const docs = await buildObsidianVaultIndex(emptyDir);
      expect(docs).toEqual([]);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("skips files larger than 2 MiB", async () => {
    const largeFile = path.join(tempVaultDir, "Study", "LargeFile.md");
    // Create file > 2 MiB
    const largeContent = Buffer.alloc(2 * 1024 * 1024 + 10, "a");
    fs.writeFileSync(largeFile, largeContent);

    const docs = await buildObsidianVaultIndex(tempVaultDir);
    const paths = docs.map((d) => d.filePath);
    expect(paths).not.toContain("Study/LargeFile.md");
  });

  it("searches in-memory index with relevance and extracts snippets", async () => {
    const index = new ObsidianVaultIndex();
    await index.build(tempVaultDir);

    expect(index.getDocCount()).toBe(3);

    // Search query matching content
    const results = index.search("giải thoát");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe("Bát Chánh Đạo");
    expect(results[0].path).toBe("Study/Buddhism/Bat-Chanh-Dao.md");
    expect(results[0].snippet).toContain("giải thoát");
    expect(results[0].score).toBeGreaterThan(0);
  });
});
