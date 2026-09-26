import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { createObsidianAttachmentRouter } from "../../src/server/routes/obsidianAttachmentRoutes";
import { ObsidianVaultManager } from "../../src/lib/vault-manager";

describe("Multi-Vault Attachment Router Specification", () => {
  let tempBaseDir: string;
  let defaultVaultDir: string;
  let phatHocVaultDir: string;
  let dongYVaultDir: string;
  let vaultManager: ObsidianVaultManager;
  let app: express.Express;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "multivault-attachment-test-"));
    defaultVaultDir = path.join(tempBaseDir, "AI-Obsidian");
    phatHocVaultDir = path.join(tempBaseDir, "Phat-Hoc-Obsidian");
    dongYVaultDir = path.join(tempBaseDir, "Dong-Y-Obsidian");

    fs.mkdirSync(defaultVaultDir, { recursive: true });
    fs.mkdirSync(phatHocVaultDir, { recursive: true });
    fs.mkdirSync(dongYVaultDir, { recursive: true });

    vaultManager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "default", label: "AI-Obsidian", rootPath: defaultVaultDir },
        { vaultId: "phat-hoc", label: "Phat-Hoc-Obsidian", rootPath: phatHocVaultDir },
        { vaultId: "dong-y", label: "Dong-Y-Obsidian", rootPath: dongYVaultDir },
      ],
      defaultVaultId: "default",
    });

    app = express();
    app.use(express.json());
    app.use("/api", createObsidianAttachmentRouter(vaultManager));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    } catch {}
  });

  it("1. Resolves PDF in non-active vault with explicit vaultId", async () => {
    const pdfDir = path.join(phatHocVaultDir, "02_PDF_Source", "03_Kinh_Luan_Dai_Thua");
    fs.mkdirSync(pdfDir, { recursive: true });
    const samplePdf = Buffer.from("%PDF-1.4 Triet Hoc Tanh Khong");
    fs.writeFileSync(path.join(pdfDir, "triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf"), samplePdf);

    const res = await request(app)
      .get(
        "/api/obsidian/vault/attachment?path=02_PDF_Source%2F03_Kinh_Luan_Dai_Thua%2Ftriet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf&vaultId=phat-hoc"
      )
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(Number(res.headers["content-length"])).toBe(samplePdf.length);
  });

  it("2. Resolves PDF in non-active vault via cross-vault fallback when vaultId is omitted", async () => {
    const pdfDir = path.join(phatHocVaultDir, "02_PDF_Source", "03_Kinh_Luan_Dai_Thua");
    fs.mkdirSync(pdfDir, { recursive: true });
    const samplePdf = Buffer.from("%PDF-1.4 Triet Hoc Tanh Khong");
    fs.writeFileSync(path.join(pdfDir, "triet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf"), samplePdf);

    // No vaultId in query -> should fallback to scan registered profiles and find it in phat-hoc
    const res = await request(app)
      .get(
        "/api/obsidian/vault/attachment?path=02_PDF_Source%2F03_Kinh_Luan_Dai_Thua%2Ftriet_hoc_ve_tanh_khong_ht_thich_tue_sy.pdf"
      )
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(Number(res.headers["content-length"])).toBe(samplePdf.length);
  });

  it("3. Resolves bare filename using probe folders (02_PDF_Source) across vaults", async () => {
    const pdfDir = path.join(phatHocVaultDir, "02_PDF_Source");
    fs.mkdirSync(pdfDir, { recursive: true });
    const samplePdf = Buffer.from("%PDF-1.4 Handbook");
    fs.writeFileSync(path.join(pdfDir, "handbook.pdf"), samplePdf);

    const res = await request(app)
      .get("/api/obsidian/vault/attachment?path=handbook.pdf")
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(Number(res.headers["content-length"])).toBe(samplePdf.length);
  });

  it("4. Resolves EPUB in non-active vault using probe folders (05_EPUB_Export)", async () => {
    const epubDir = path.join(dongYVaultDir, "05_EPUB_Export");
    fs.mkdirSync(epubDir, { recursive: true });
    const sampleEpub = Buffer.from("PK\x03\x04EPUB Dong Y");
    fs.writeFileSync(path.join(epubDir, "noi_kinh.epub"), sampleEpub);

    const res = await request(app)
      .get("/api/obsidian/vault/attachment?path=noi_kinh.epub")
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/epub+zip");
    expect(Number(res.headers["content-length"])).toBe(sampleEpub.length);
  });

  it("5. Does not prepend probe folders if path is already canonical relative path", async () => {
    const customDir = path.join(defaultVaultDir, "03_Notes", "SubTopic");
    fs.mkdirSync(customDir, { recursive: true });
    const samplePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fs.writeFileSync(path.join(customDir, "diagram.png"), samplePng);

    const res = await request(app)
      .get("/api/obsidian/vault/attachment?path=03_Notes%2FSubTopic%2Fdiagram.png")
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("6. Rejects path traversal across all vaults", async () => {
    const res = await request(app).get("/api/obsidian/vault/attachment?path=../../etc/passwd");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("PATH_TRAVERSAL_DETECTED");
  });
});
