import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { ObsidianVaultManager } from "../../src/lib/vault-manager";
import {
  VaultNotFoundError,
  VaultSwitchInProgressError,
  VaultSwitchFailedError,
  InvalidVaultIdError,
} from "../../src/lib/vault-manager.errors";

describe("ObsidianVaultManager Unit Tests (P4.3B)", () => {
  let tempPrimaryDir: string;
  let tempSecondaryDir: string;
  let nonExistentDir: string;

  beforeEach(() => {
    tempPrimaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-primary-"));
    tempSecondaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "vault-secondary-"));
    nonExistentDir = path.join(os.tmpdir(), "vault-non-existent-" + Date.now());

    // Create a sample markdown note in primary
    fs.writeFileSync(path.join(tempPrimaryDir, "Note1.md"), "# Note 1\nContent", "utf8");
    fs.writeFileSync(path.join(tempSecondaryDir, "Note2.md"), "# Note 2\nContent", "utf8");
  });

  afterEach(() => {
    fs.rmSync(tempPrimaryDir, { recursive: true, force: true });
    fs.rmSync(tempSecondaryDir, { recursive: true, force: true });
  });

  it("initializes with explicit managed registry and default active vault", () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
        { vaultId: "secondary", label: "Secondary Vault", rootPath: tempSecondaryDir },
      ],
      defaultVaultId: "primary",
    });

    expect(manager.getActiveVaultId()).toBe("primary");
    expect(manager.getActiveVaultRoot()).toBe(tempPrimaryDir);
    expect(manager.getActiveProfile()?.label).toBe("Primary Vault");
  });

  it("listVaults projects safe DTO without leaking rootPath", () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
        { vaultId: "secondary", label: "Secondary Vault", rootPath: tempSecondaryDir },
      ],
      defaultVaultId: "primary",
    });

    const vaults = manager.listVaults();
    expect(vaults).toHaveLength(2);
    expect(vaults[0]).toEqual({
      vaultId: "primary",
      label: "Primary Vault",
      isCurrent: true,
    });
    expect(vaults[1]).toEqual({
      vaultId: "secondary",
      label: "Secondary Vault",
      isCurrent: false,
    });

    // Ensure rootPath is never exposed
    const serialized = JSON.stringify(vaults);
    expect(serialized).not.toContain(tempPrimaryDir);
    expect(serialized).not.toContain(tempSecondaryDir);
    expect(serialized).not.toContain("rootPath");
  });

  it("successfully switches to a valid candidate vault and updates active references", async () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
        { vaultId: "secondary", label: "Secondary Vault", rootPath: tempSecondaryDir },
      ],
      defaultVaultId: "primary",
    });

    const result = await manager.switchVault("secondary");
    expect(result.success).toBe(true);
    expect(result.activeVaultId).toBe("secondary");
    expect(result.label).toBe("Secondary Vault");

    expect(manager.getActiveVaultId()).toBe("secondary");
    expect(manager.getActiveVaultRoot()).toBe(tempSecondaryDir);

    const status = manager.getStatus();
    expect(status.configured).toBe(true);
    expect(status.activeVaultId).toBe("secondary");
    expect(status.label).toBe("Secondary Vault");
    expect(status.accessible).toBe(true);
  });

  it("rejects unknown vaultId with VaultNotFoundError and preserves active vault", async () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
      ],
      defaultVaultId: "primary",
    });

    await expect(manager.switchVault("non-existent-id")).rejects.toThrow(VaultNotFoundError);
    expect(manager.getActiveVaultId()).toBe("primary");
    expect(manager.getActiveVaultRoot()).toBe(tempPrimaryDir);
  });

  it("rejects malicious or invalid vaultId with InvalidVaultIdError", async () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
      ],
      defaultVaultId: "primary",
    });

    await expect(manager.switchVault("../etc/passwd")).rejects.toThrow(InvalidVaultIdError);
    await expect(manager.switchVault("vault/with/slash")).rejects.toThrow(InvalidVaultIdError);
    await expect(manager.switchVault("")).rejects.toThrow(InvalidVaultIdError);
    expect(manager.getActiveVaultId()).toBe("primary");
  });

  it("handles inaccessible candidate root by preserving previous vault (Rollback Safety)", async () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
        { vaultId: "broken", label: "Broken Target", rootPath: nonExistentDir },
      ],
      defaultVaultId: "primary",
    });

    await expect(manager.switchVault("broken")).rejects.toThrow(VaultSwitchFailedError);
    // Active vault MUST be preserved
    expect(manager.getActiveVaultId()).toBe("primary");
    expect(manager.getActiveVaultRoot()).toBe(tempPrimaryDir);
  });

  it("enforces serialized switch lock and rejects concurrent switch requests with 409", async () => {
    const manager = new ObsidianVaultManager({
      profiles: [
        { vaultId: "primary", label: "Primary Vault", rootPath: tempPrimaryDir },
        { vaultId: "secondary", label: "Secondary Vault", rootPath: tempSecondaryDir },
      ],
      defaultVaultId: "primary",
    });

    // Artificially simulate a switch in progress
    let resolveSlowSwitch: () => void;
    const slowPromise = new Promise<void>((resolve) => {
      resolveSlowSwitch = resolve;
    });

    // Intercept or trigger concurrent calls
    const firstSwitch = manager.switchVault("secondary", {
      beforeCommitHook: async () => {
        await slowPromise;
      },
    });

    // Second switch should immediately fail due to lock
    await expect(manager.switchVault("primary")).rejects.toThrow(VaultSwitchInProgressError);

    // Release first switch
    resolveSlowSwitch!();
    await firstSwitch;
    expect(manager.getActiveVaultId()).toBe("secondary");
  });
});
