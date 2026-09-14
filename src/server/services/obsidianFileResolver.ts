import fs from "fs";
import { ObsidianVaultManager } from "../../lib/vault-manager";
import { sanitizeObsidianPath, PathSanitizationErrorCode } from "../../lib/obsidianPathSanitizer";
import { parseSimpleYamlFrontmatter } from "../../lib/obsidianParser";
import { logStructuredEvent } from "../../lib/security";

export interface ObsidianSelectedSourceRef {
  vaultProfileId: string;
  relativePath: string;
}

export interface ResolvedObsidianSource {
  vaultProfileId: string;
  relativePath: string;
  fileName: string;
  title: string;
  cleanContent: string;
  tags: string[];
  sizeBytes: number;
}

export type ResolveObsidianErrorCode =
  | PathSanitizationErrorCode
  | "VAULT_NOT_FOUND"
  | "VAULT_MANAGER_NOT_AVAILABLE"
  | "READ_FAILED";

export type ResolveObsidianResult =
  | {
      ok: true;
      source: ResolvedObsidianSource;
    }
  | {
      ok: false;
      error: ResolveObsidianErrorCode;
      message: string;
      relativePath: string;
    };

export interface BatchResolveObsidianResult {
  vaultProfileId: string | null;
  vaultLabel?: string;
  resolved: ResolvedObsidianSource[];
  missing: Array<{ relativePath: string; message: string }>;
  excluded: Array<{ relativePath: string; reason: string }>;
  error?: string;
}

/**
 * Parses markdown content, strips YAML frontmatter, and extracts title & tags.
 */
export function extractCleanMarkdown(rawMarkdown: string, defaultTitle: string): {
  cleanContent: string;
  title: string;
  tags: string[];
} {
  let content = rawMarkdown;
  let title = defaultTitle;
  const tags: string[] = [];

  // Parse YAML Frontmatter
  const frontmatterMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (frontmatterMatch) {
    const yamlString = frontmatterMatch[1];
    const parsedFm = parseSimpleYamlFrontmatter(yamlString);
    if (parsedFm.title && typeof parsedFm.title === "string") {
      title = parsedFm.title.trim();
    }
    if (Array.isArray(parsedFm.tags)) {
      for (const t of parsedFm.tags) {
        if (typeof t === "string" && t.trim()) {
          tags.push(t.trim());
        }
      }
    } else if (typeof parsedFm.tags === "string") {
      tags.push(parsedFm.tags.trim());
    }
    content = rawMarkdown.slice(frontmatterMatch[0].length);
  }

  // If title was not in frontmatter, try finding the first H1 header: # Title
  if (title === defaultTitle) {
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match && h1Match[1].trim()) {
      title = h1Match[1].trim();
    }
  }

  return {
    cleanContent: content.trim(),
    title,
    tags,
  };
}

/**
 * Resolves a single Obsidian file using scoped read from the target vaultProfileId.
 * Guarantees zero global active vault mutation and strict 12-step path sanitization.
 */
export async function resolveScopedObsidianFile(
  vaultManager: ObsidianVaultManager | null | undefined,
  ref: ObsidianSelectedSourceRef
): Promise<ResolveObsidianResult> {
  if (!vaultManager) {
    return {
      ok: false,
      error: "VAULT_MANAGER_NOT_AVAILABLE",
      message: "Obsidian Vault Manager is not initialized on the server.",
      relativePath: ref?.relativePath || "",
    };
  }

  if (!ref || !ref.vaultProfileId || !ref.relativePath) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Invalid or empty vault source reference.",
      relativePath: ref?.relativePath || "",
    };
  }

  // Pure profile lookup - does NOT mutate active vault state
  const profile = vaultManager.getVaultProfile(ref.vaultProfileId);
  if (!profile || !profile.rootPath) {
    return {
      ok: false,
      error: "VAULT_NOT_FOUND",
      message: `Vault profile '${ref.vaultProfileId}' is not configured.`,
      relativePath: ref.relativePath,
    };
  }

  // Strict 12-step Path Sanitizer
  const sanitization = sanitizeObsidianPath(profile.rootPath, ref.relativePath);
  if (sanitization.ok === false) {
    return {
      ok: false,
      error: sanitization.error,
      message: sanitization.message,
      relativePath: ref.relativePath,
    };
  }

  try {
    const rawContent = await fs.promises.readFile(sanitization.realTarget, "utf-8");
    const defaultTitle = sanitization.fileName.replace(/\.md$/i, "");
    const { cleanContent, title, tags } = extractCleanMarkdown(rawContent, defaultTitle);

    return {
      ok: true,
      source: {
        vaultProfileId: profile.vaultId,
        relativePath: sanitization.relativePath,
        fileName: sanitization.fileName,
        title,
        cleanContent,
        tags,
        sizeBytes: sanitization.sizeBytes,
      },
    };
  } catch (err: any) {
    logStructuredEvent("warn", "OBSIDIAN_RESOLVE_READ_ERROR", {
      vaultProfileId: ref.vaultProfileId,
      relativePath: ref.relativePath,
      error: err?.message,
    });
    return {
      ok: false,
      error: "READ_FAILED",
      message: "Failed to read file from disk.",
      relativePath: ref.relativePath,
    };
  }
}

/**
 * Resolves multiple scoped Obsidian references for a single research request.
 * Classifies items into resolved, missing, and excluded deterministically.
 */
export async function resolveMultipleScopedObsidianFiles(
  vaultManager: ObsidianVaultManager | null | undefined,
  refs: ObsidianSelectedSourceRef[]
): Promise<BatchResolveObsidianResult> {
  if (!refs || refs.length === 0) {
    return {
      vaultProfileId: null,
      resolved: [],
      missing: [],
      excluded: [],
    };
  }

  const vaultProfileId = refs[0].vaultProfileId;
  const profile = vaultManager?.getVaultProfile(vaultProfileId);
  const vaultLabel = profile?.label || vaultProfileId;

  const resolved: ResolvedObsidianSource[] = [];
  const missing: Array<{ relativePath: string; message: string }> = [];
  const excluded: Array<{ relativePath: string; reason: string }> = [];

  for (const ref of refs) {
    const result = await resolveScopedObsidianFile(vaultManager, ref);
    if (result.ok === true) {
      resolved.push(result.source);
    } else {
      if (result.error === "FILE_NOT_FOUND") {
        missing.push({
          relativePath: result.relativePath,
          message: result.message,
        });
      } else {
        excluded.push({
          relativePath: result.relativePath,
          reason: result.message,
        });
      }
    }
  }

  return {
    vaultProfileId,
    vaultLabel,
    resolved,
    missing,
    excluded,
  };
}
