import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  ManagedVaultProfile,
  VaultSummaryDto,
  VaultSwitchResult,
  VaultManagerStatus,
  SwitchVaultOptions,
  ObsidianVaultManagerOptions,
} from "./vault-manager.types";
import {
  InvalidVaultIdError,
  VaultNotFoundError,
  VaultSwitchInProgressError,
  VaultSwitchFailedError,
} from "./vault-manager.errors";
import { ObsidianVaultIndex } from "./obsidianIndexBuilder";
import { ObsidianFileWatcher } from "./obsidianFileWatcher";
import { logStructuredEvent } from "./security";

/**
 * ObsidianVaultManager manages multi-vault registries, candidate preparation,
 * atomic transitions, and runtime search/watcher lifecycle for Obsidian vaults.
 */
export class ObsidianVaultManager {
  private registry = new Map<string, ManagedVaultProfile>();
  private activeVaultId: string | null = null;
  private activeProfile: ManagedVaultProfile | null = null;
  private activeIndex: ObsidianVaultIndex;
  private activeWatcher: ObsidianFileWatcher;
  private isSwitching = false;

  constructor(options: ObsidianVaultManagerOptions) {
    for (const p of options.profiles) {
      if (p.vaultId && p.rootPath) {
        this.registry.set(p.vaultId, {
          vaultId: p.vaultId,
          label: p.label || p.vaultId,
          rootPath: p.rootPath,
        });
      }
    }

    this.activeIndex = new ObsidianVaultIndex();
    this.activeWatcher = new ObsidianFileWatcher(500);

    const initialId =
      options.defaultVaultId && this.registry.has(options.defaultVaultId)
        ? options.defaultVaultId
        : options.profiles[0]?.vaultId || null;

    if (initialId && this.registry.has(initialId)) {
      this.activeVaultId = initialId;
      this.activeProfile = this.registry.get(initialId)!;
      // Background non-fatal index build
      if (this.activeProfile.rootPath && fs.existsSync(this.activeProfile.rootPath)) {
        this.activeIndex.build(this.activeProfile.rootPath).catch(() => {});
      }
    }
  }

  listVaults(): VaultSummaryDto[] {
    const list: VaultSummaryDto[] = [];
    for (const profile of this.registry.values()) {
      list.push({
        vaultId: profile.vaultId,
        label: profile.label,
        isCurrent: profile.vaultId === this.activeVaultId,
      });
    }
    return list;
  }

  getActiveVaultId(): string | null {
    return this.activeVaultId;
  }

  getActiveVaultRoot(): string | null {
    return this.activeProfile?.rootPath || null;
  }

  getActiveProfile(): ManagedVaultProfile | null {
    return this.activeProfile ? { ...this.activeProfile } : null;
  }

  getActiveIndex(): ObsidianVaultIndex {
    return this.activeIndex;
  }

  getActiveWatcher(): ObsidianFileWatcher {
    return this.activeWatcher;
  }

  getStatus(): VaultManagerStatus {
    if (!this.activeProfile || !this.activeVaultId) {
      return {
        configured: false,
        activeVaultId: null,
        label: null,
        accessible: false,
      };
    }

    let accessible = false;
    try {
      const resolved = path.resolve(this.activeProfile.rootPath);
      fs.accessSync(resolved, fs.constants.R_OK);
      accessible = true;
    } catch {
      accessible = false;
    }

    return {
      configured: true,
      activeVaultId: this.activeVaultId,
      label: this.activeProfile.label,
      accessible,
    };
  }

  async switchVault(
    targetVaultId: string,
    options?: SwitchVaultOptions
  ): Promise<VaultSwitchResult> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    // 1. Validate targetVaultId parameter
    if (!targetVaultId || typeof targetVaultId !== "string" || targetVaultId.trim().length === 0) {
      throw new InvalidVaultIdError("Vault ID must be a non-empty string.");
    }

    const cleanId = targetVaultId.trim();
    if (
      cleanId.includes("..") ||
      cleanId.includes("/") ||
      cleanId.includes("\\") ||
      cleanId.includes("\0")
    ) {
      throw new InvalidVaultIdError("Vault ID contains prohibited path traversal sequences.");
    }

    // 2. Serialized switch lock
    if (this.isSwitching) {
      throw new VaultSwitchInProgressError();
    }
    this.isSwitching = true;

    try {
      // 3. Registry lookup
      const candidateProfile = this.registry.get(cleanId);
      if (!candidateProfile) {
        throw new VaultNotFoundError(cleanId);
      }

      // 4. Candidate directory & access validation
      const candidateRoot = path.resolve(candidateProfile.rootPath);
      let lstat: fs.Stats;
      try {
        lstat = fs.lstatSync(candidateRoot);
      } catch (err: any) {
        throw new VaultSwitchFailedError(
          `Target vault directory is not accessible: ${err.message || "Not found"}`
        );
      }

      if (lstat.isSymbolicLink()) {
        throw new VaultSwitchFailedError("Target vault root cannot be a symbolic link.");
      }

      if (!lstat.isDirectory()) {
        throw new VaultSwitchFailedError("Target vault root is not a directory.");
      }

      try {
        fs.accessSync(candidateRoot, fs.constants.R_OK);
      } catch (err: any) {
        throw new VaultSwitchFailedError("Target vault directory does not have read permissions.");
      }

      // 5. Candidate resource preparation
      const candidateIndex = new ObsidianVaultIndex();
      try {
        await candidateIndex.build(candidateRoot);
      } catch (err: any) {
        throw new VaultSwitchFailedError(`Failed to build index for target vault: ${err.message}`);
      }

      const candidateWatcher = new ObsidianFileWatcher(500);

      // Testing hook for race condition verification
      if (options?.beforeCommitHook) {
        await options.beforeCommitHook();
      }

      // 6. Atomic publication of candidate state
      const priorWatcher = this.activeWatcher;
      this.activeProfile = candidateProfile;
      this.activeVaultId = candidateProfile.vaultId;
      this.activeIndex = candidateIndex;
      this.activeWatcher = candidateWatcher;

      // 7. Retirement of prior resources
      priorWatcher.closeAll().catch(() => {});

      const durationMs = Date.now() - startTime;
      logStructuredEvent("info", "OBSIDIAN_VAULT_SWITCH_SUCCESS", {
        correlationId,
        activeVaultId: candidateProfile.vaultId,
        durationMs,
      });

      return {
        success: true,
        activeVaultId: candidateProfile.vaultId,
        label: candidateProfile.label,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logStructuredEvent("warn", "OBSIDIAN_VAULT_SWITCH_FAILED", {
        correlationId,
        targetVaultId: cleanId,
        error: err.code || err.message,
        durationMs,
      });
      throw err;
    } finally {
      this.isSwitching = false;
    }
  }

  async dispose(): Promise<void> {
    await this.activeWatcher.closeAll().catch(() => {});
  }
}
