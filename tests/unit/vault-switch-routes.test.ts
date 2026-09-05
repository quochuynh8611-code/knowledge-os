import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { ObsidianVaultManager } from "../../src/lib/vault-manager";
import { createObsidianVaultRoutes } from "../../src/server/routes/obsidianVaultRoutes";

describe("Phase P4.3B: Obsidian Vault Switching API Routes", () => {
  let app: express.Express;
  let tempPrimaryDir: string;
  let tempSecondaryDir: string;
  let tempBrokenDir: string;
  let manager: ObsidianVaultManager;

  beforeEach(() => {
    tempPrimaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-vault-primary-"));
    tempSecondaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-vault-secondary-"));
    tempBrokenDir = path.join(os.tmpdir(), "api-vault-broken-" + Date.now());

    fs.writeFileSync(path.join(tempPrimaryDir, "Doc1.md"), "# Doc 1", "utf8");
    fs.writeFileSync(path.join(tempSecondaryDir, "Doc2.md"), "# Doc 2", "utf8");

    manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary-vault", label: "Primary Research", rootPath: tempPrimaryDir },
        { vaultId: "secondary-vault", label: "Secondary Research", rootPath: tempSecondaryDir },
        { vaultId: "damaged-vault", label: "Inaccessible Target", rootPath: tempBrokenDir },
      ],
      defaultVaultId: "primary-vault",
    });

    app = express();
    app.use(express.json());
    app.use("/api", createObsidianVaultRoutes(manager));
  });

  afterEach(() => {
    fs.rmSync(tempPrimaryDir, { recursive: true, force: true });
    fs.rmSync(tempSecondaryDir, { recursive: true, force: true });
  });

  describe("GET /api/obsidian/vaults", () => {
    it("returns list of registered vaults and current active vault without leaking rootPath", async () => {
      const res = await request(app).get("/api/obsidian/vaults");
      expect(res.status).toBe(200);
      expect(res.body.activeVaultId).toBe("primary-vault");
      expect(res.body.vaults).toHaveLength(3);

      expect(res.body.vaults[0]).toEqual({
        vaultId: "primary-vault",
        label: "Primary Research",
        isCurrent: true,
      });

      // Crucial security invariant: raw filesystem paths must be completely absent
      const rawText = JSON.stringify(res.body);
      expect(rawText).not.toContain(tempPrimaryDir);
      expect(rawText).not.toContain(tempSecondaryDir);
      expect(rawText).not.toContain("rootPath");
    });
  });

  describe("POST /api/obsidian/vault/switch", () => {
    it("returns 400 MISSING_VAULT_ID when vaultId is omitted", async () => {
      const res = await request(app).post("/api/obsidian/vault/switch").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("MISSING_VAULT_ID");
    });

    it("returns 400 INVALID_VAULT_ID when vaultId contains invalid characters", async () => {
      const res = await request(app).post("/api/obsidian/vault/switch").send({ vaultId: "../bad/path" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("INVALID_VAULT_ID");
    });

    it("returns 404 VAULT_NOT_FOUND when vaultId is not registered in allowlist", async () => {
      const res = await request(app).post("/api/obsidian/vault/switch").send({ vaultId: "unknown-vault" });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("VAULT_NOT_FOUND");
    });

    it("returns 500 SWITCH_FAILED and preserves prior active vault when candidate target is inaccessible", async () => {
      const res = await request(app).post("/api/obsidian/vault/switch").send({ vaultId: "damaged-vault" });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("SWITCH_FAILED");

      // Verify prior vault is intact
      expect(manager.getActiveVaultId()).toBe("primary-vault");
    });

    it("returns 200 OK and successfully switches active vault when target is valid", async () => {
      const res = await request(app).post("/api/obsidian/vault/switch").send({ vaultId: "secondary-vault" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activeVaultId).toBe("secondary-vault");
      expect(res.body.label).toBe("Secondary Research");

      // Verify manager internal state
      expect(manager.getActiveVaultId()).toBe("secondary-vault");
    });
  });

  describe("GET /api/obsidian/vault/status", () => {
    it("returns configured status, activeVaultId, label, and accessible flag", async () => {
      const res = await request(app).get("/api/obsidian/vault/status");
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.activeVaultId).toBe("primary-vault");
      expect(res.body.label).toBe("Primary Research");
      expect(res.body.accessible).toBe(true);
    });
  });
});
