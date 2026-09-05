import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
// Route handler to be implemented in Phase P4.1
import { createObsidianVaultRouter } from "../../src/server/routes/obsidianVaultRoutes";

describe("Phase P4.1: Obsidian Vault Express Route Endpoints", () => {
  let app: express.Express;
  let tempVaultDir: string;
  let externalDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-routes-"));
    externalDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-external-"));

    // Populate test files
    fs.mkdirSync(path.join(tempVaultDir, "Phat-Hoc"), { recursive: true });
    fs.writeFileSync(
      path.join(tempVaultDir, "Phat-Hoc", "Bat-Chanh-Dao.md"),
      `---
title: "Bát Chánh Đạo"
tags: ["phat-hoc"]
---
# Bát Chánh Đạo Toàn Thư
## 1. Chánh Kiến
Nội dung bài viết...`,
      "utf8"
    );

    // Express app setup with the router
    app = express();
    app.use(express.json());
    app.use("/api", createObsidianVaultRouter(() => tempVaultDir));
  });

  afterEach(() => {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  describe("GET /api/obsidian/vault/status", () => {
    it("returns configured = true when vault exists and is accessible", async () => {
      const res = await request(app).get("/api/obsidian/vault/status");
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.accessible).toBe(true);
      expect(res.body.vaultName).toBeDefined();
    });

    it("returns configured = false when vault root is not configured", async () => {
      const unconfiguredApp = express();
      unconfiguredApp.use("/api", createObsidianVaultRouter(() => null));

      const res = await request(unconfiguredApp).get("/api/obsidian/vault/status");
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(false);
      expect(res.body.accessible).toBe(false);
    });
  });

  describe("GET /api/obsidian/vault/file", () => {
    it("returns 400 MISSING_PATH when path query parameter is omitted", async () => {
      const res = await request(app).get("/api/obsidian/vault/file");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MISSING_PATH");
    });

    it("returns 200 with parsed frontmatter, outline and content for valid note", async () => {
      const res = await request(app).get("/api/obsidian/vault/file?path=Phat-Hoc/Bat-Chanh-Dao.md");
      expect(res.status).toBe(200);
      expect(res.body.relativePath).toBe("Phat-Hoc/Bat-Chanh-Dao.md");
      expect(res.body.fileName).toBe("Bat-Chanh-Dao.md");
      expect(res.body.frontmatter.title).toBe("Bát Chánh Đạo");
      expect(res.body.outline).toHaveLength(2);
      expect(res.body.content).toContain("# Bát Chánh Đạo Toàn Thư");
      // Must not leak the system temp directory path
      expect(JSON.stringify(res.body)).not.toContain(tempVaultDir);
    });

    it("returns 403 SYMLINK_NOT_ALLOWED when attempting to read a symlink", async () => {
      const symlinkPath = path.join(tempVaultDir, "Phat-Hoc", "link.md");
      fs.symlinkSync(path.join(tempVaultDir, "Phat-Hoc", "Bat-Chanh-Dao.md"), symlinkPath);

      const res = await request(app).get("/api/obsidian/vault/file?path=Phat-Hoc/link.md");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("SYMLINK_NOT_ALLOWED");
    });

    it("returns 403 PATH_TRAVERSAL_DETECTED when traversal sequence is supplied", async () => {
      const res = await request(app).get("/api/obsidian/vault/file?path=../../etc/passwd");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("returns 404 FILE_NOT_FOUND when file does not exist", async () => {
      const res = await request(app).get("/api/obsidian/vault/file?path=Phat-Hoc/NonExistent.md");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("FILE_NOT_FOUND");
    });

    it("returns 413 FILE_TOO_LARGE when file size exceeds MAX_MARKDOWN_BYTES", async () => {
      const largeFile = path.join(tempVaultDir, "Phat-Hoc", "Large.md");
      fs.writeFileSync(largeFile, Buffer.alloc(2 * 1024 * 1024 + 100, "b"));

      const res = await request(app).get("/api/obsidian/vault/file?path=Phat-Hoc/Large.md");
      expect(res.status).toBe(413);
      expect(res.body.error).toBe("FILE_TOO_LARGE");
    });
  });
});
