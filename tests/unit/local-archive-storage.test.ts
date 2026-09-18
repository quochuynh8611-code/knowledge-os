import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalArchiveStorage } from "../../src/lib/localArchiveStorage";

describe("Phase 18A Wave 1: Local Archive Storage Engine Unit Tests", () => {
  let tempArchiveDir: string;
  let storage: LocalArchiveStorage;

  beforeEach(() => {
    tempArchiveDir = fs.mkdtempSync(path.join(os.tmpdir(), "archive-storage-test-"));
    storage = new LocalArchiveStorage({ archiveRoot: tempArchiveDir });
  });

  afterEach(() => {
    if (fs.existsSync(tempArchiveDir)) {
      fs.rmSync(tempArchiveDir, { recursive: true, force: true });
    }
  });

  it("1. stores a binary buffer and returns deterministic SHA-256 hash and relative path", async () => {
    const fileContent = Buffer.from("Dữ liệu thử nghiệm lưu trữ tài liệu Phật Học.");
    const result = await storage.saveFile({
      buffer: fileContent,
      originalName: "Kinh-Phap-Cu.md",
      fileFormat: "md",
    });

    expect(result.contentHash).toBeDefined();
    expect(result.contentHash).toHaveLength(64);
    expect(result.fileSize).toBe(fileContent.byteLength);
    expect(result.storageRelPath).toContain("md");
    expect(result.isDuplicate).toBe(false);

    // Verify physical file exists at resolved location
    const fullSavedPath = path.join(tempArchiveDir, result.storageRelPath);
    expect(fs.existsSync(fullSavedPath)).toBe(true);
    expect(fs.readFileSync(fullSavedPath)).toEqual(fileContent);
  });

  it("2. deduplicates identical binary content without creating a second file copy", async () => {
    const fileContent = Buffer.from("Tài liệu trùng lặp cần được deduplicate.");

    const firstSave = await storage.saveFile({
      buffer: fileContent,
      originalName: "Doc-Version-1.pdf",
      fileFormat: "pdf",
    });

    const secondSave = await storage.saveFile({
      buffer: fileContent,
      originalName: "Doc-Version-2-Duplicate.pdf",
      fileFormat: "pdf",
    });

    expect(secondSave.contentHash).toBe(firstSave.contentHash);
    expect(secondSave.storageRelPath).toBe(firstSave.storageRelPath);
    expect(secondSave.isDuplicate).toBe(true);
  });

  it("3. reads saved file by storage relative path and matches original content", async () => {
    const fileContent = Buffer.from("Nội dung Luận Vi Diệu Pháp Toàn Tập.");
    const saveResult = await storage.saveFile({
      buffer: fileContent,
      originalName: "Abhidhamma.epub",
      fileFormat: "epub",
    });

    const readBuffer = await storage.readFile(saveResult.storageRelPath);
    expect(readBuffer).toEqual(fileContent);
  });

  it("4. rejects path traversal attempts when reading files", async () => {
    await expect(storage.readFile("../../../etc/passwd")).rejects.toThrow(/PATH_TRAVERSAL_DETECTED|Access denied/i);
    await expect(storage.readFile("/absolute/system/file")).rejects.toThrow(/PATH_TRAVERSAL_DETECTED|Access denied/i);
  });

  it("5. throws error when file does not exist", async () => {
    await expect(storage.readFile("pdf/00/non-existent-file.pdf")).rejects.toThrow(/FILE_NOT_FOUND|not found/i);
  });

  it("6. gets absolute path safely ensuring containment in archive root", () => {
    const safeRelPath = "pdf/ab/test-doc.pdf";
    const resolvedPath = storage.getSafeAbsolutePath(safeRelPath);

    expect(resolvedPath.startsWith(path.resolve(tempArchiveDir))).toBe(true);
    expect(() => storage.getSafeAbsolutePath("../../secret.txt")).toThrow(/PATH_TRAVERSAL_DETECTED|Access denied/i);
  });
});
