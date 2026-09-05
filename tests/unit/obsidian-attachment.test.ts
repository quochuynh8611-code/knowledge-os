import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { createObsidianAttachmentRouter } from "../../src/server/routes/obsidianAttachmentRoutes";
import { sanitizeObsidianAttachmentPath } from "../../src/lib/obsidianPathSanitizer";

describe("Phase P4.2D: Obsidian Vault Attachment Endpoint & Sanitizer", () => {
  let tempVaultDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "obsidian-attachment-test-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempVaultDir)) {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    }
  });

  describe("sanitizeObsidianAttachmentPath", () => {
    it("allows valid image files (.png, .jpg, .svg) under 10 MiB", () => {
      const imgPath = path.join(tempVaultDir, "avatar.png");
      fs.writeFileSync(imgPath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header

      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "avatar.png");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.fileName).toBe("avatar.png");
        expect(res.mimeType).toBe("image/png");
        expect(res.sizeBytes).toBe(4);
      }
    });

    it("allows valid PDF and video files (.pdf, .mp4) under 50 MiB", () => {
      const pdfPath = path.join(tempVaultDir, "document.pdf");
      fs.writeFileSync(pdfPath, "%PDF-1.5 test content");

      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "document.pdf");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.fileName).toBe("document.pdf");
        expect(res.mimeType).toBe("application/pdf");
      }
    });

    it("rejects image files exceeding 10 MiB with FILE_TOO_LARGE", () => {
      const bigImgPath = path.join(tempVaultDir, "huge.png");
      const fd = fs.openSync(bigImgPath, "w");
      fs.closeSync(fd);
      fs.truncateSync(bigImgPath, 10 * 1024 * 1024 + 10);

      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "huge.png");
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect((res as any).error).toBe("FILE_TOO_LARGE");
      }
    });

    it("rejects path traversal attempts", () => {
      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "../outside.png");
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect((res as any).error).toBe("PATH_TRAVERSAL_DETECTED");
      }
    });

    it("rejects symbolic links targeting attachments", () => {
      const realTarget = path.join(tempVaultDir, "real.png");
      fs.writeFileSync(realTarget, "content");
      const symlinkTarget = path.join(tempVaultDir, "symlink.png");
      try {
        fs.symlinkSync(realTarget, symlinkTarget);
      } catch {
        return; // Skip on systems without symlink privilege
      }

      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "symlink.png");
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect((res as any).error).toBe("SYMLINK_NOT_ALLOWED");
      }
    });

    it("rejects forbidden file extensions like .exe, .sh, .ts, .md", () => {
      const scriptPath = path.join(tempVaultDir, "script.sh");
      fs.writeFileSync(scriptPath, "#!/bin/sh");

      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "script.sh");
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect((res as any).error).toBe("FORBIDDEN_EXTENSION");
      }
    });

    it("rejects non-existent files with FILE_NOT_FOUND", () => {
      const res = sanitizeObsidianAttachmentPath(tempVaultDir, "missing.png");
      expect(res.ok).toBe(false);
      if (res.ok === false) {
        expect((res as any).error).toBe("FILE_NOT_FOUND");
      }
    });
  });

  describe("GET /api/obsidian/vault/attachment Router Contract", () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use("/api", createObsidianAttachmentRouter(() => tempVaultDir));
    });

    it("returns 503 if vault root is unconfigured", async () => {
      const unconfiguredApp = express();
      unconfiguredApp.use("/api", createObsidianAttachmentRouter(() => undefined));

      const res = await request(unconfiguredApp).get("/api/obsidian/vault/attachment?path=test.png");
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("VAULT_NOT_CONFIGURED");
    });

    it("returns 400 if path query parameter is missing", async () => {
      const res = await request(app).get("/api/obsidian/vault/attachment");
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MISSING_PATH");
    });

    it("streams binary image file with correct Content-Type and Cache-Control headers", async () => {
      const samplePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      fs.writeFileSync(path.join(tempVaultDir, "photo.png"), samplePng);

      const res = await request(app)
        .get("/api/obsidian/vault/attachment?path=photo.png")
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["cache-control"]).toContain("public");
      expect(res.headers["cache-control"]).toContain("max-age=31536000");
      expect(Number(res.headers["content-length"])).toBe(samplePng.length);
    });

    it("streams PDF file with application/pdf Content-Type", async () => {
      const samplePdf = Buffer.from("%PDF-1.4 test data");
      fs.writeFileSync(path.join(tempVaultDir, "handbook.pdf"), samplePdf);

      const res = await request(app)
        .get("/api/obsidian/vault/attachment?path=handbook.pdf")
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(Number(res.headers["content-length"])).toBe(samplePdf.length);
    });

    it("returns 404 for missing attachment", async () => {
      const res = await request(app).get("/api/obsidian/vault/attachment?path=notfound.jpg");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("FILE_NOT_FOUND");
    });

    it("returns 403 for path traversal or forbidden extension", async () => {
      const res = await request(app).get("/api/obsidian/vault/attachment?path=../../secret.key");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("PATH_TRAVERSAL_DETECTED");
    });
  });
});
