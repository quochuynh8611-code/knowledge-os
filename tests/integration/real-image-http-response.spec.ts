import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { createDocsRouter } from "../../src/server/routes/docsRoutes";
import { createObsidianAttachmentRouter } from "../../src/server/routes/obsidianAttachmentRoutes";

describe("Real Binary Image HTTP Response Integration (P3)", () => {
  let tempDocsDir: string;
  let tempVaultDir: string;
  let app: express.Express;

  // Minimal 1x1 valid PNG image buffer
  const samplePngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );

  beforeEach(() => {
    tempDocsDir = fs.mkdtempSync(path.join(os.tmpdir(), "http-docs-test-"));
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "http-vault-test-"));

    // Populate docs directory with a sample markdown doc and real PNG image
    fs.mkdirSync(path.join(tempDocsDir, "assets", "screenshots"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDocsDir, "assets", "screenshots", "test-image.png"),
      samplePngBuffer
    );
    fs.writeFileSync(
      path.join(tempDocsDir, "sample-doc.md"),
      "# Sample Doc\n\n![Test Image](assets/screenshots/test-image.png)",
      "utf8"
    );

    // Populate vault directory with attachments and note
    fs.mkdirSync(path.join(tempVaultDir, "biology", "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(tempVaultDir, "biology", "assets", "cell-structure.png"),
      samplePngBuffer
    );

    app = express();
    app.use(express.json());
    app.use("/api", createDocsRouter(tempDocsDir));
    app.use("/api", createObsidianAttachmentRouter(() => tempVaultDir));
  });

  afterEach(() => {
    fs.rmSync(tempDocsDir, { recursive: true, force: true });
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  });

  describe("GET /api/docs/raw?path=...", () => {
    it("returns HTTP 200 with Content-Type image/png and non-empty binary body", async () => {
      const res = await request(app)
        .get("/api/docs/raw?path=assets%2Fscreenshots%2Ftest-image.png")
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["content-length"]).toBe(String(samplePngBuffer.length));
      expect(res.body).toBeDefined();
      expect(Buffer.from(res.body).length).toBe(samplePngBuffer.length);
    });

    it("returns HTTP 404 when image does not exist", async () => {
      const res = await request(app).get("/api/docs/raw?path=assets%2Fnon-existent.png");
      expect(res.status).toBe(404);
      expect(res.body.error).toContain("not found");
    });
  });

  describe("GET /api/obsidian/vault/attachment?path=...", () => {
    it("returns HTTP 200 with Content-Type image/png and non-empty binary body for vault attachment", async () => {
      const res = await request(app)
        .get("/api/obsidian/vault/attachment?path=biology%2Fassets%2Fcell-structure.png")
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["content-length"]).toBe(String(samplePngBuffer.length));
      expect(res.body).toBeDefined();
      expect(Buffer.from(res.body).length).toBe(samplePngBuffer.length);
    });

    it("falls back to attachment folders if flat image path is queried", async () => {
      // Put image into fallback assets folder at root
      fs.mkdirSync(path.join(tempVaultDir, "assets"), { recursive: true });
      fs.writeFileSync(
        path.join(tempVaultDir, "assets", "global-logo.png"),
        samplePngBuffer
      );

      const res = await request(app)
        .get("/api/obsidian/vault/attachment?path=global-logo.png")
        .responseType("blob");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(Buffer.from(res.body).length).toBe(samplePngBuffer.length);
    });
  });
});
