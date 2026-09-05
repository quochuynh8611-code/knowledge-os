import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { createObsidianSearchRouter } from "../../src/server/routes/obsidianSearchRoutes";
import { ObsidianVaultIndex } from "../../src/lib/obsidianIndexBuilder";

describe("Phase P4.2B: Obsidian Search Route Endpoints", () => {
  let app: express.Express;
  let tempVaultDir: string;
  let vaultIndex: ObsidianVaultIndex;

  beforeEach(async () => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-search-"));

    // Populate notes
    fs.mkdirSync(path.join(tempVaultDir, "Triet-Hoc"), { recursive: true });
    fs.writeFileSync(
      path.join(tempVaultDir, "Triet-Hoc", "Bat-Chanh-Dao.md"),
      `---
title: "Bát Chánh Đạo Toàn Thư"
tags: ["dao-de", "giai-thoat"]
---
# Bát Chánh Đạo
Con đường tám nhánh đưa đến chấm dứt khổ não.`,
      "utf8"
    );

    fs.writeFileSync(
      path.join(tempVaultDir, "Tu-Niem-Xu.md"),
      `# Tứ Niệm Xứ
Thực hành chánh niệm trên bốn lĩnh vực thân, thọ, tâm, pháp.`,
      "utf8"
    );

    vaultIndex = new ObsidianVaultIndex();
    await vaultIndex.build(tempVaultDir);

    app = express();
    app.use(express.json());
    app.use("/api", createObsidianSearchRouter(() => tempVaultDir, vaultIndex));
  });

  afterEach(() => {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
  });

  describe("GET /api/obsidian/vault/search", () => {
    it("returns 400 MISSING_QUERY when query param 'q' is missing or empty", async () => {
      const res1 = await request(app).get("/api/obsidian/vault/search");
      expect(res1.status).toBe(400);
      expect(res1.body.error).toBe("MISSING_QUERY");

      const res2 = await request(app).get("/api/obsidian/vault/search?q=  ");
      expect(res2.status).toBe(400);
      expect(res2.body.error).toBe("MISSING_QUERY");
    });

    it("returns 503 VAULT_NOT_CONFIGURED when vault root is not configured", async () => {
      const unconfiguredApp = express();
      unconfiguredApp.use("/api", createObsidianSearchRouter(() => null, vaultIndex));

      const res = await request(unconfiguredApp).get("/api/obsidian/vault/search?q=test");
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("VAULT_NOT_CONFIGURED");
    });

    it("returns matching results by title with high score", async () => {
      const res = await request(app).get("/api/obsidian/vault/search?q=Bát Chánh Đạo");
      expect(res.status).toBe(200);
      expect(res.body.query).toBe("Bát Chánh Đạo");
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1);

      const topResult = res.body.results[0];
      expect(topResult.title).toBe("Bát Chánh Đạo Toàn Thư");
      expect(topResult.path).toBe("Triet-Hoc/Bat-Chanh-Dao.md");
      expect(topResult.score).toBeGreaterThan(0);
      expect(topResult.snippet).toBeDefined();
    });

    it("returns matching results by content and generates a snippet", async () => {
      const res = await request(app).get("/api/obsidian/vault/search?q=chánh niệm");
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1);

      const tuNiemXuResult = res.body.results.find((r: any) => r.path === "Tu-Niem-Xu.md");
      expect(tuNiemXuResult).toBeDefined();
      expect(tuNiemXuResult.snippet).toContain("chánh niệm");
    });

    it("returns empty results array when nothing matches", async () => {
      const res = await request(app).get("/api/obsidian/vault/search?q=KhôngTìmThấyGìCả12345");
      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([]);
    });

    it("handles special characters, HTML tags, and traversal inputs safely without leaking paths", async () => {
      const res1 = await request(app).get("/api/obsidian/vault/search?q=<script>alert(1)</script>");
      expect(res1.status).toBe(200);
      expect(res1.body.results).toEqual([]);

      const res2 = await request(app).get("/api/obsidian/vault/search?q=../../etc/passwd");
      expect(res2.status).toBe(200);
      expect(JSON.stringify(res2.body)).not.toContain(tempVaultDir);
    });
  });
});
