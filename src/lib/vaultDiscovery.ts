import fs from "fs";
import path from "path";
import os from "os";
import { ManagedVaultProfile } from "./vault-manager.types";

export interface VaultDiscoveryOptions {
  explicitProfiles?: ManagedVaultProfile[];
  primaryVaultRoot?: string;
  obsidianJsonPath?: string;
  scanParentDir?: boolean;
}

export interface VaultDiscoveryResult {
  profiles: ManagedVaultProfile[];
  sources: {
    explicitCount: number;
    obsidianJsonCount: number;
    scannedCount: number;
  };
}

/**
 * Derives a readable label from a folder name (e.g. "Phat-Hoc-Obsidian" -> "Phat Hoc Obsidian")
 */
export function deriveVaultLabel(folderName: string): string {
  const clean = folderName.replace(/[-_]+/g, " ").trim();
  // Capitalize words nicely
  return clean
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Creates a safe, URL-friendly vault ID from a label/name
 */
export function deriveVaultId(name: string): string {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "vault";
}

/**
 * Checks whether a directory qualifies as a valid Obsidian vault
 */
export function isValidVaultDirectory(dirPath: string): boolean {
  try {
    const resolved = path.resolve(dirPath);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return false;

    // 1. Check for .obsidian configuration folder
    const dotObsidian = path.join(resolved, ".obsidian");
    if (fs.existsSync(dotObsidian)) {
      return true;
    }

    // 2. Or check for at least one .md file directly in the directory or shallow subfolders
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".markdown"))) {
        return true;
      }
      if (entry.isDirectory()) {
        try {
          const subEntries = fs.readdirSync(path.join(resolved, entry.name), { withFileTypes: true });
          if (subEntries.some((s) => s.isFile() && (s.name.endsWith(".md") || s.name.endsWith(".markdown")))) {
            return true;
          }
        } catch {
          // ignore subfolder read errors
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Gets default path to obsidian.json on the current OS
 */
export function getDefaultObsidianJsonPath(): string {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "obsidian", "obsidian.json");
  } else if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "obsidian", "obsidian.json");
  } else {
    // Linux / XDG
    const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
    return path.join(configHome, "obsidian", "obsidian.json");
  }
}

/**
 * Reads and parses vaults registered in obsidian.json
 */
export function loadObsidianJsonVaults(filePath?: string): Array<{ path: string; label?: string }> {
  const jsonPath = filePath || getDefaultObsidianJsonPath();
  if (!fs.existsSync(jsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(jsonPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.vaults || typeof parsed.vaults !== "object") {
      return [];
    }

    const results: Array<{ path: string; label?: string }> = [];
    for (const key of Object.keys(parsed.vaults)) {
      const v = parsed.vaults[key];
      if (v && typeof v.path === "string" && v.path.trim().length > 0) {
        const vPath = path.resolve(v.path.trim());
        if (fs.existsSync(vPath)) {
          results.push({
            path: vPath,
            label: deriveVaultLabel(path.basename(vPath)),
          });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Scans parent directory of a vault root to find sibling vaults
 */
export function scanSiblingVaults(vaultRoot: string): Array<{ path: string; label: string }> {
  try {
    const resolvedRoot = path.resolve(vaultRoot);
    const parentDir = path.dirname(resolvedRoot);
    if (!fs.existsSync(parentDir)) {
      return [];
    }

    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    const discovered: Array<{ path: string; label: string }> = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(parentDir, entry.name);

      if (isValidVaultDirectory(fullPath)) {
        discovered.push({
          path: fullPath,
          label: deriveVaultLabel(entry.name),
        });
      }
    }

    return discovered;
  } catch {
    return [];
  }
}

/**
 * Discovers and merges vault profiles from:
 * 1. Explicit configuration (highest priority)
 * 2. Primary root environment variable
 * 3. obsidian.json system registry
 * 4. Sibling directory scan
 */
export function discoverAndMergeVaultProfiles(options: VaultDiscoveryOptions = {}): VaultDiscoveryResult {
  const merged: ManagedVaultProfile[] = [];
  const seenPaths = new Set<string>();
  const seenIds = new Set<string>();

  let explicitCount = 0;
  let obsidianJsonCount = 0;
  let scannedCount = 0;

  function registerProfile(vaultId: string, label: string, rootPath: string, source: "explicit" | "obsidianJson" | "scanned") {
    const resolvedPath = path.resolve(rootPath);
    const pathKey = resolvedPath.toLowerCase();

    if (seenPaths.has(pathKey)) {
      return; // Already registered with higher priority
    }

    // Ensure unique ID
    let finalId = vaultId;
    let counter = 2;
    while (seenIds.has(finalId)) {
      finalId = `${vaultId}-${counter}`;
      counter++;
    }

    seenPaths.add(pathKey);
    seenIds.add(finalId);
    merged.push({
      vaultId: finalId,
      label,
      rootPath: resolvedPath,
    });

    if (source === "explicit") explicitCount++;
    else if (source === "obsidianJson") obsidianJsonCount++;
    else if (source === "scanned") scannedCount++;
  }

  // 1. Explicit profiles
  if (options.explicitProfiles && Array.isArray(options.explicitProfiles)) {
    for (const p of options.explicitProfiles) {
      if (p.vaultId && p.rootPath && fs.existsSync(p.rootPath)) {
        registerProfile(p.vaultId, p.label || deriveVaultLabel(p.vaultId), p.rootPath, "explicit");
      }
    }
  }

  // 2. Primary root fallback
  if (options.primaryVaultRoot && fs.existsSync(options.primaryVaultRoot)) {
    const baseName = path.basename(path.resolve(options.primaryVaultRoot));
    registerProfile("default", deriveVaultLabel(baseName) || "Default Vault", options.primaryVaultRoot, "explicit");
  }

  // 3. obsidian.json system registry
  const systemVaults = loadObsidianJsonVaults(options.obsidianJsonPath);
  for (const sv of systemVaults) {
    const id = deriveVaultId(path.basename(sv.path));
    registerProfile(id, sv.label || deriveVaultLabel(path.basename(sv.path)), sv.path, "obsidianJson");
  }

  // 4. Directory scan of sibling vaults
  if (options.scanParentDir !== false) {
    const scanRoot = options.primaryVaultRoot || (merged[0]?.rootPath);
    if (scanRoot && fs.existsSync(scanRoot)) {
      const scanned = scanSiblingVaults(scanRoot);
      for (const sc of scanned) {
        const id = deriveVaultId(path.basename(sc.path));
        registerProfile(id, sc.label, sc.path, "scanned");
      }
    }
  }

  return {
    profiles: merged,
    sources: {
      explicitCount,
      obsidianJsonCount,
      scannedCount,
    },
  };
}
