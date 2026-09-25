import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import request from "supertest";
import {
  discoverAndMergeVaultProfiles,
  loadObsidianJsonVaults,
  scanSiblingVaults,
  deriveVaultId,
  deriveVaultLabel,
  isValidVaultDirectory,
} from "../../src/lib/vaultDiscovery";
import { ObsidianVaultManager } from "../../src/lib/vault-manager";
import { createObsidianVaultRoutes } from "../../src/server/routes/obsidianVaultRoutes";
import express from "express";

describe("Vault Auto-Discovery & Merging (P1)", () => {
  let tempBaseDir: string;
  let vaultA: string;
  let vaultB: string;
  let vaultC: string;
  let vaultD: string;
  let mockObsidianJson: string;

  beforeEach(() => {
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-discovery-test-"));
    vaultA = path.join(tempBaseDir, "AI-Obsidian");
    vaultB = path.join(tempBaseDir, "Phat-Hoc-Obsidian");
    vaultC = path.join(tempBaseDir, "Huyen-Hoc-Obsidian");
    vaultD = path.join(tempBaseDir, "Dong-Y-Obsidian");

    fs.mkdirSync(path.join(vaultA, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(vaultB, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(vaultC, "subfolder"), { recursive: true });
    fs.writeFileSync(path.join(vaultC, "subfolder", "sample.md"), "# Huyen Hoc", "utf8");
    fs.mkdirSync(path.join(vaultD, ".obsidian"), { recursive: true });

    mockObsidianJson = path.join(tempBaseDir, "mock-obsidian.json");
    fs.writeFileSync(
      mockObsidianJson,
      JSON.stringify({
        vaults: {
          id1: { path: vaultA, ts: 1000 },
          id2: { path: vaultB, ts: 2000 },
          id3: { path: vaultC, ts: 3000 },
        },
      }),
      "utf8"
    );
  });

  afterEach(() => {
    fs.rmSync(tempBaseDir, { recursive: true, force: true });
  });

  it("identifies valid vault directories with .obsidian or markdown files", () => {
    expect(isValidVaultDirectory(vaultA)).toBe(true);
    expect(isValidVaultDirectory(vaultB)).toBe(true);
    expect(isValidVaultDirectory(vaultC)).toBe(true);
    expect(isValidVaultDirectory(tempBaseDir)).toBe(false);
  });

  it("parses vaults from obsidian.json properly", () => {
    const vaults = loadObsidianJsonVaults(mockObsidianJson);
    expect(vaults).toHaveLength(3);
    expect(vaults.map((v) => v.path)).toContain(path.resolve(vaultA));
  });

  it("handles missing obsidian.json gracefully without crashing", () => {
    const vaults = loadObsidianJsonVaults(path.join(tempBaseDir, "non-existent.json"));
    expect(vaults).toEqual([]);
  });

  it("scans sibling vaults in the parent directory", () => {
    const siblings = scanSiblingVaults(vaultA);
    expect(siblings.length).toBeGreaterThanOrEqual(4);
    const paths = siblings.map((s) => s.path);
    expect(paths).toContain(path.resolve(vaultA));
    expect(paths).toContain(path.resolve(vaultB));
    expect(paths).toContain(path.resolve(vaultC));
    expect(paths).toContain(path.resolve(vaultD));
  });

  it("merges explicit config + obsidian.json + directory scan without duplicates", () => {
    const explicit = [
      { vaultId: "custom-ai", label: "Custom AI Label", rootPath: vaultA },
    ];

    const result = discoverAndMergeVaultProfiles({
      explicitProfiles: explicit,
      primaryVaultRoot: vaultA,
      obsidianJsonPath: mockObsidianJson,
      scanParentDir: true,
    });

    // Total unique directories: vaultA, vaultB, vaultC, vaultD = 4 vaults
    expect(result.profiles.length).toBe(4);

    // Explicit profile should maintain custom ID and Label
    const aiProfile = result.profiles.find((p) => path.resolve(p.rootPath) === path.resolve(vaultA));
    expect(aiProfile).toBeDefined();
    expect(aiProfile?.vaultId).toBe("custom-ai");
    expect(aiProfile?.label).toBe("Custom AI Label");

    // Other vaults should be discovered and given readable labels
    const phatHoc = result.profiles.find((p) => path.resolve(p.rootPath) === path.resolve(vaultB));
    expect(phatHoc).toBeDefined();
    expect(phatHoc?.label).toBe("Phat Hoc Obsidian");

    const dongY = result.profiles.find((p) => path.resolve(p.rootPath) === path.resolve(vaultD));
    expect(dongY).toBeDefined();
    expect(dongY?.label).toBe("Dong Y Obsidian");
  });

  it("serves all merged vaults via GET /api/obsidian/vaults without 4-vault limit", async () => {
    // Add extra 3 dummy vaults to guarantee > 4 vaults in total
    const extraVault1 = path.join(tempBaseDir, "Extra-Vault-1");
    const extraVault2 = path.join(tempBaseDir, "Extra-Vault-2");
    const extraVault3 = path.join(tempBaseDir, "Extra-Vault-3");
    fs.mkdirSync(path.join(extraVault1, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(extraVault2, ".obsidian"), { recursive: true });
    fs.mkdirSync(path.join(extraVault3, ".obsidian"), { recursive: true });

    const discovery = discoverAndMergeVaultProfiles({
      primaryVaultRoot: vaultA,
      obsidianJsonPath: mockObsidianJson,
      scanParentDir: true,
    });

    expect(discovery.profiles.length).toBeGreaterThanOrEqual(7);

    const manager = new ObsidianVaultManager({
      profiles: discovery.profiles,
      defaultVaultId: discovery.profiles[0]?.vaultId,
    });

    const app = express();
    app.use(express.json());
    app.use("/api", createObsidianVaultRoutes(manager));

    const res = await request(app).get("/api/obsidian/vaults");
    expect(res.status).toBe(200);
    expect(res.body.vaults.length).toBeGreaterThanOrEqual(7);
    expect(res.body.vaults.length).not.toBe(4);
  });

  it("createServerApp integrates discovery and serves all active system vaults", async () => {
    const { createServerApp } = await import("../../server");
    const serverApp = createServerApp();
    const res = await request(serverApp).get("/api/obsidian/vaults");
    expect(res.status).toBe(200);
    // User system has 10 valid markdown/obsidian vaults in /Users/mr.chem/Documents/Obsidian
    expect(res.body.vaults.length).toBeGreaterThanOrEqual(10);
  });
});
