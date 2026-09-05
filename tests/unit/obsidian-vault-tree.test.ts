import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { createObsidianVaultTreeRouter } from "../../src/server/routes/obsidianVaultTree";

describe("Phase P4.2A: Obsidian Vault Tree Route Endpoints", () => {
  let app: express.Express;
  let tempVaultDir: string;
  let externalDir: string;

  beforeEach(() => {
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-tree-"));
    externalDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-external-"));

    // Populate vault folder structure
    fs.mkdirSync(path.join(tempVaultDir, "01-Study", "Buddhism"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, "02-Notes"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, "EmptyFolder"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(tempVaultDir, ".git"), { recursive: true });

    // Populate files
    fs.writeFileSync(path.join(tempVaultDir, "README.md"), "# Vault Readme\n", "utf8");
    fs.writeFileSync(path.join(tempVaultDir, "01-Study", "Overview.md"), "# Study Overview\n", "utf8");
    fs.writeFileSync(
      path.join(tempVaultDir, "01-Study", "Buddhism", "Bat-Chanh-Dao.md"),
      "# Bát Chánh Đạo\n",
      "utf8"
    );
    fs.writeFileSync(path.join(tempVaultDir, ".obsidian", "app.json"), "{}", "utf8");
    fs.writeFileSync(path.join(tempVaultDir, ".DS_Store"), "dummy", "utf8");

    // Express app setup with the tree router
    app = express();
    app.use(express.json());
    app.use("/api", createObsidianVaultTreeRouter(() => tempVaultDir));
  });

  afterEach(() => {
    fs.rmSync(tempVaultDir, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  });

  describe("GET /api/obsidian/vault/tree", () => {
    it("returns 503 VAULT_NOT_CONFIGURED when vault root is not configured", async () => {
      const unconfiguredApp = express();
      unconfiguredApp.use("/api", createObsidianVaultTreeRouter(() => null));

      const res = await request(unconfiguredApp).get("/api/obsidian/vault/tree");
      expect(res.status).toBe(503);
      expect(res.body.error).toBe("VAULT_NOT_CONFIGURED");
    });

    it("returns root tree listing with directories first, files second, hidden entries excluded", async () => {
      const res = await request(app).get("/api/obsidian/vault/tree");
      expect(res.status).toBe(200);
      expect(res.body.path).toBe("");
      expect(Array.isArray(res.body.items)).toBe(true);

      const names = res.body.items.map((i: any) => i.name);
      // Hidden items (.obsidian, .git, .DS_Store) must be excluded
      expect(names).not.toContain(".obsidian");
      expect(names).not.toContain(".git");
      expect(names).not.toContain(".DS_Store");

      // Visible directories and files
      expect(names).toContain("01-Study");
      expect(names).toContain("02-Notes");
      expect(names).toContain("EmptyFolder");
      expect(names).toContain("README.md");

      // Directories must precede files
      const firstFileIndex = res.body.items.findIndex((i: any) => i.type === "file");
      const lastDirIndex = res.body.items.reduce(
        (lastIdx: number, item: any, idx: number) => (item.type === "directory" ? idx : lastIdx),
        -1
      );
      if (firstFileIndex !== -1 && lastDirIndex !== -1) {
        expect(lastDirIndex).toBeLessThan(firstFileIndex);
      }

      // Must not leak physical host path
      expect(JSON.stringify(res.body)).not.toContain(tempVaultDir);
    });

    it("returns empty items array for an empty directory", async () => {
      const res = await request(app).get("/api/obsidian/vault/tree?path=EmptyFolder");
      expect(res.status).toBe(200);
      expect(res.body.path).toBe("EmptyFolder");
      expect(res.body.items).toEqual([]);
    });

    it("returns sub-directory items correctly", async () => {
      const res = await request(app).get("/api/obsidian/vault/tree?path=01-Study");
      expect(res.status).toBe(200);
      expect(res.body.path).toBe("01-Study");

      const items = res.body.items;
      const dirItem = items.find((i: any) => i.name === "Buddhism");
      const fileItem = items.find((i: any) => i.name === "Overview.md");

      expect(dirItem).toBeDefined();
      expect(dirItem.type).toBe("directory");
      expect(dirItem.path).toBe("01-Study/Buddhism");

      expect(fileItem).toBeDefined();
      expect(fileItem.type).toBe("file");
      expect(fileItem.path).toBe("01-Study/Overview.md");
      expect(fileItem.size).toBeGreaterThan(0);
      expect(fileItem.mtime).toBeDefined();
    });

    it("returns 403 ACCESS_DENIED_SENSITIVE_DIR when trying to browse sensitive folders", async () => {
      const res1 = await request(app).get("/api/obsidian/vault/tree?path=.obsidian");
      expect(res1.status).toBe(403);
      expect(res1.body.error).toBe("ACCESS_DENIED_SENSITIVE_DIR");

      const res2 = await request(app).get("/api/obsidian/vault/tree?path=.git");
      expect(res2.status).toBe(403);
      expect(res2.body.error).toBe("ACCESS_DENIED_SENSITIVE_DIR");
    });

    it("returns 403 PATH_TRAVERSAL_DETECTED when path traversal is attempted", async () => {
      const res = await request(app).get("/api/obsidian/vault/tree?path=../");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("PATH_TRAVERSAL_DETECTED");
    });

    it("returns 403 SYMLINK_NOT_ALLOWED when attempting to browse a symlinked directory", async () => {
      const symlinkTarget = path.join(externalDir, "SecretExternal");
      fs.mkdirSync(symlinkTarget, { recursive: true });
      const symlinkPath = path.join(tempVaultDir, "SymlinkedFolder");
      fs.symlinkSync(symlinkTarget, symlinkPath);

      const res = await request(app).get("/api/obsidian/vault/tree?path=SymlinkedFolder");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("SYMLINK_NOT_ALLOWED");
    });

    it("returns 404 FILE_NOT_FOUND when directory does not exist", async () => {
      const res = await request(app).get("/api/obsidian/vault/tree?path=NonExistentFolder");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("FILE_NOT_FOUND");
    });
  });
});
