import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
// Target module to be implemented in Phase P4.1 (will fail initially)
import {
  sanitizeObsidianPath,
  MAX_MARKDOWN_BYTES,
  type PathSanitizationResult,
} from "../../src/lib/obsidianPathSanitizer";

describe("Phase P4.1: Obsidian Path Sanitizer & Sandbox Security", () => {
  let tempVaultDir: string;
  let externalDir: string;

  beforeEach(() => {
    // Create temporary isolated directories for test fixtures
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-vault-"));
    externalDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-external-"));

    // Populate valid markdown structure
    fs.mkdirSync(path.join(tempVaultDir, "Phat-Hoc"), { recursive: true });
    fs.writeFileSync(
      path.join(tempVaultDir, "Phat-Hoc", "ValidNote.md"),
      "# Valid Note\nContent here",
      "utf8"
    );

    // Create a subfolder with hidden config directory
    fs.mkdirSync(path.join(tempVaultDir, ".obsidian"), { recursive: true });
    fs.writeFileSync(
      path.join(tempVaultDir, ".obsidian", "config.json"),
      "{}",
      "utf8"
    );

    // Create external secret file
    fs.writeFileSync(
      path.join(externalDir, "secret.env"),
      "SECRET_KEY=12345",
      "utf8"
    );
  });

  afterEach(() => {
    // Clean up temporary test fixtures
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  describe("Rule 1: Input Validation & Lexical Segment Checks", () => {
    it("rejects empty or non-string inputs", () => {
      expect(sanitizeObsidianPath(tempVaultDir, "" as any).ok).toBe(false);
      expect(sanitizeObsidianPath(tempVaultDir, null as any).ok).toBe(false);
      expect(sanitizeObsidianPath(tempVaultDir, undefined as any).ok).toBe(false);
    });

    it("rejects paths containing null byte injection", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/ValidNote.md\0.jpg");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("rejects absolute paths", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "/etc/passwd");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("rejects directory traversal sequences (..)", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "../outside.md");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("rejects access to sensitive directories like .obsidian, .git, .env", () => {
      const result = sanitizeObsidianPath(tempVaultDir, ".obsidian/config.json");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("ACCESS_DENIED_SENSITIVE_DIR");
    });
  });

  describe("Rule 2: Symlink Rejection Policy (SYMLINK_NOT_ALLOWED)", () => {
    it("rejects external symlink pointing outside the vault with SYMLINK_NOT_ALLOWED", () => {
      const symlinkPath = path.join(tempVaultDir, "Phat-Hoc", "external-link.md");
      fs.symlinkSync(path.join(externalDir, "secret.env"), symlinkPath);

      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/external-link.md");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("SYMLINK_NOT_ALLOWED");
    });

    it("rejects internal symlink pointing inside the vault with SYMLINK_NOT_ALLOWED", () => {
      const symlinkPath = path.join(tempVaultDir, "Phat-Hoc", "internal-alias.md");
      fs.symlinkSync(path.join(tempVaultDir, "Phat-Hoc", "ValidNote.md"), symlinkPath);

      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/internal-alias.md");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("SYMLINK_NOT_ALLOWED");
    });
  });

  describe("Rule 3: Regular File Types, Extensions & File Existence", () => {
    it("returns FILE_NOT_FOUND when file does not exist", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/NonExistent.md");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("FILE_NOT_FOUND");
    });

    it("rejects directories as invalid file types", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("INVALID_FILE_TYPE");
    });

    it("rejects non-markdown file extensions", () => {
      fs.writeFileSync(path.join(tempVaultDir, "Phat-Hoc", "image.png"), "binary", "utf8");
      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/image.png");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("FORBIDDEN_EXTENSION");
    });
  });

  describe("Rule 4: Operational Bounds (MAX_MARKDOWN_BYTES = 2 MiB)", () => {
    it("rejects files exceeding MAX_MARKDOWN_BYTES with FILE_TOO_LARGE", () => {
      const largeFilePath = path.join(tempVaultDir, "Phat-Hoc", "LargeFile.md");
      // Create a sparse file or buffer larger than 2 MiB
      const largeBuffer = Buffer.alloc(MAX_MARKDOWN_BYTES + 1024, "a");
      fs.writeFileSync(largeFilePath, largeBuffer);

      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/LargeFile.md");
      expect(result.ok).toBe(false);
      expect((result as any).error).toBe("FILE_TOO_LARGE");
      expect((result as any).sizeBytes).toBeGreaterThan(MAX_MARKDOWN_BYTES);
    });
  });

  describe("Rule 5: Valid Regular Markdown File & Absolute Path Masking", () => {
    it("accepts a valid regular markdown file within vault root", () => {
      const result = sanitizeObsidianPath(tempVaultDir, "Phat-Hoc/ValidNote.md");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.relativePath).toBe("Phat-Hoc/ValidNote.md");
        expect(result.fileName).toBe("ValidNote.md");
        expect(result.realTarget).toBeDefined();
        // Result must NOT leak the root in client-facing relativePath
        expect(result.relativePath).not.toContain(tempVaultDir);
      }
    });
  });
});
