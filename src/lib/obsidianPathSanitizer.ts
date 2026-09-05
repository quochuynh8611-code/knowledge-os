import fs from "fs";
import path from "path";

export const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024; // 2 MiB (2,097,152 bytes)

export const ALLOWED_EXTENSIONS = new Set([".md", ".markdown"]);

export const FORBIDDEN_SEGMENTS = new Set([
  ".obsidian",
  ".git",
  ".trash",
  "node_modules",
  ".env",
]);

export type PathSanitizationErrorCode =
  | "PATH_TRAVERSAL_DETECTED"
  | "ACCESS_DENIED_SENSITIVE_DIR"
  | "SYMLINK_NOT_ALLOWED"
  | "FILE_NOT_FOUND"
  | "INVALID_FILE_TYPE"
  | "FORBIDDEN_EXTENSION"
  | "FILE_TOO_LARGE"
  | "PATH_OUTSIDE_VAULT";

export type PathSanitizationResult =
  | {
      ok: true;
      relativePath: string;
      fileName: string;
      realTarget: string;
      sizeBytes: number;
    }
  | {
      ok: false;
      error: PathSanitizationErrorCode;
      message: string;
      sizeBytes?: number;
    };

/**
 * 12-Step Security Path Guard for Obsidian Vault Read-Only Access
 * Implements strict deny-by-default, rejects all symlinks, and prevents path traversal/information leakage.
 */
export function sanitizeObsidianPath(
  vaultRoot: string,
  userPath: string
): PathSanitizationResult {
  // Step 1: Reject empty, non-string inputs, null bytes, or absolute paths
  if (!vaultRoot || typeof vaultRoot !== "string") {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Vault root is not configured or invalid.",
    };
  }

  if (!userPath || typeof userPath !== "string" || userPath.trim().length === 0) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Relative path cannot be empty.",
    };
  }

  if (userPath.includes("\0")) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Null byte injection detected.",
    };
  }

  const trimmed = userPath.trim();
  // Reject absolute paths across platforms
  if (path.isAbsolute(trimmed) || trimmed.startsWith("/") || /^[a-zA-Z]:[/\\]/.test(trimmed)) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Absolute paths are strictly forbidden.",
    };
  }

  // Step 2: Normalize platform separators and strip leading/redundant slashes
  const normalizedSeparators = trimmed.replace(/\\/g, "/");
  const cleanedPath = normalizedSeparators.replace(/^\/+/, "").replace(/\/+/g, "/");

  // Step 3: Segment analysis
  const segments = cleanedPath.split("/").map((s) => s.trim()).filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === "." || seg === "..") {
      return {
        ok: false,
        error: "PATH_TRAVERSAL_DETECTED",
        message: "Path traversal segment detected.",
      };
    }
    if (FORBIDDEN_SEGMENTS.has(seg.toLowerCase()) || seg.startsWith(".")) {
      return {
        ok: false,
        error: "ACCESS_DENIED_SENSITIVE_DIR",
        message: "Access to hidden or system directories is denied.",
      };
    }
  }

  // Step 4: Lexical candidate resolution
  const lexicalCandidate = path.resolve(vaultRoot, cleanedPath);

  // Step 5: Lexical relative derivation
  const lexicalRelative = path.relative(vaultRoot, lexicalCandidate);

  // Step 6: Lexical containment check
  if (
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(".." + path.sep) ||
    lexicalRelative.startsWith("../") ||
    path.isAbsolute(lexicalRelative)
  ) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Path traversal out of vault root detected.",
    };
  }

  // Step 7: Lstat candidate & check symlink / file type
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(lexicalCandidate);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return {
        ok: false,
        error: "FILE_NOT_FOUND",
        message: "File does not exist in the Obsidian Vault.",
      };
    }
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Unable to inspect file attributes.",
    };
  }

  // Symlink policy: Reject 100% of symlinks (internal and external)
  if (stat.isSymbolicLink()) {
    return {
      ok: false,
      error: "SYMLINK_NOT_ALLOWED",
      message: "Symbolic links are strictly prohibited in this version.",
    };
  }

  // Must be a regular file
  if (!stat.isFile()) {
    return {
      ok: false,
      error: "INVALID_FILE_TYPE",
      message: "Requested target is not a regular file.",
    };
  }

  // Step 8: Realpath resolution
  let realVaultRoot: string;
  let realTarget: string;
  try {
    realVaultRoot = fs.realpathSync(vaultRoot);
    realTarget = fs.realpathSync(lexicalCandidate);
  } catch {
    return {
      ok: false,
      error: "FILE_NOT_FOUND",
      message: "Target or vault path could not be resolved physically.",
    };
  }

  // Step 9: Real relative containment check
  const realRelative = path.relative(realVaultRoot, realTarget);
  if (
    realRelative === ".." ||
    realRelative.startsWith(".." + path.sep) ||
    realRelative.startsWith("../") ||
    path.isAbsolute(realRelative)
  ) {
    return {
      ok: false,
      error: "PATH_OUTSIDE_VAULT",
      message: "Target file lies outside the physical vault boundary.",
    };
  }

  // Step 10: Defense-in-depth boundary check
  if (!realTarget.startsWith(realVaultRoot + path.sep) && realTarget !== realVaultRoot) {
    return {
      ok: false,
      error: "PATH_OUTSIDE_VAULT",
      message: "Target violates physical vault root boundary.",
    };
  }

  // Step 11: Extension whitelist & size limit
  const ext = path.extname(realTarget).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "FORBIDDEN_EXTENSION",
      message: "Only .md and .markdown files are allowed.",
    };
  }

  if (stat.size > MAX_MARKDOWN_BYTES) {
    return {
      ok: false,
      error: "FILE_TOO_LARGE",
      message: "File exceeds maximum permitted size of 2 MiB.",
      sizeBytes: stat.size,
    };
  }

  // Step 12: Success with masked relative metadata
  return {
    ok: true,
    relativePath: cleanedPath,
    fileName: path.basename(realTarget),
    realTarget,
    sizeBytes: stat.size,
  };
}

export type DirSanitizationResult =
  | {
      ok: true;
      relativePath: string;
      dirName: string;
      realTarget: string;
    }
  | {
      ok: false;
      error: PathSanitizationErrorCode;
      message: string;
    };

/**
 * Security Path Guard for Obsidian Vault Directory Browsing
 * Validates directory paths, rejects symlinks, sensitive folders, and path traversal.
 */
export function sanitizeObsidianDirPath(
  vaultRoot: string,
  userPath?: string
): DirSanitizationResult {
  // Step 1: Reject unconfigured vault root
  if (!vaultRoot || typeof vaultRoot !== "string") {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Vault root is not configured or invalid.",
    };
  }

  // Treat empty, undefined, "/", or "." as root
  const trimmed = (userPath ?? "").trim();
  if (trimmed.includes("\0")) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Null byte injection detected.",
    };
  }

  let cleanedPath = "";
  if (trimmed !== "" && trimmed !== "/" && trimmed !== ".") {
    // Reject absolute paths across platforms (e.g. /etc or C:\)
    if (path.isAbsolute(trimmed) || trimmed.startsWith("/") || /^[a-zA-Z]:[/\\]/.test(trimmed)) {
      return {
        ok: false,
        error: "PATH_TRAVERSAL_DETECTED",
        message: "Absolute paths are strictly forbidden.",
      };
    }

    // Normalize separators and strip redundant slashes
    const normalizedSeparators = trimmed.replace(/\\/g, "/");
    const stripped = normalizedSeparators.replace(/^\/+/, "").replace(/\/+/g, "/").replace(/\/+$/, "");

    // Segment analysis
    const segments = stripped.split("/").map((s) => s.trim()).filter((s) => s.length > 0);
    for (const seg of segments) {
      if (seg === "." || seg === "..") {
        return {
          ok: false,
          error: "PATH_TRAVERSAL_DETECTED",
          message: "Path traversal segment detected.",
        };
      }
      if (FORBIDDEN_SEGMENTS.has(seg.toLowerCase()) || seg.startsWith(".")) {
        return {
          ok: false,
          error: "ACCESS_DENIED_SENSITIVE_DIR",
          message: "Access to hidden or system directories is denied.",
        };
      }
    }
    cleanedPath = segments.join("/");
  }

  // Lexical candidate resolution
  const lexicalCandidate = cleanedPath ? path.resolve(vaultRoot, cleanedPath) : path.resolve(vaultRoot);

  // Lexical containment check
  const lexicalRelative = path.relative(vaultRoot, lexicalCandidate);
  if (
    lexicalRelative === ".." ||
    lexicalRelative.startsWith(".." + path.sep) ||
    lexicalRelative.startsWith("../") ||
    path.isAbsolute(lexicalRelative)
  ) {
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Path traversal out of vault root detected.",
    };
  }

  // Lstat candidate & check symlink / file type
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(lexicalCandidate);
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return {
        ok: false,
        error: "FILE_NOT_FOUND",
        message: "Directory does not exist in the Obsidian Vault.",
      };
    }
    return {
      ok: false,
      error: "PATH_TRAVERSAL_DETECTED",
      message: "Unable to inspect directory attributes.",
    };
  }

  // Reject symlinks
  if (stat.isSymbolicLink()) {
    return {
      ok: false,
      error: "SYMLINK_NOT_ALLOWED",
      message: "Symbolic links are strictly prohibited in this version.",
    };
  }

  // Must be a directory
  if (!stat.isDirectory()) {
    return {
      ok: false,
      error: "INVALID_FILE_TYPE",
      message: "Requested target is not a directory.",
    };
  }

  // Realpath resolution
  let realVaultRoot: string;
  let realTarget: string;
  try {
    realVaultRoot = fs.realpathSync(vaultRoot);
    realTarget = fs.realpathSync(lexicalCandidate);
  } catch {
    return {
      ok: false,
      error: "FILE_NOT_FOUND",
      message: "Target or vault directory could not be resolved physically.",
    };
  }

  // Real containment check
  const realRelative = path.relative(realVaultRoot, realTarget);
  if (
    realRelative === ".." ||
    realRelative.startsWith(".." + path.sep) ||
    realRelative.startsWith("../") ||
    path.isAbsolute(realRelative)
  ) {
    return {
      ok: false,
      error: "PATH_OUTSIDE_VAULT",
      message: "Target directory lies outside the physical vault boundary.",
    };
  }

  if (!realTarget.startsWith(realVaultRoot + path.sep) && realTarget !== realVaultRoot) {
    return {
      ok: false,
      error: "PATH_OUTSIDE_VAULT",
      message: "Target violates physical vault root boundary.",
    };
  }

  return {
    ok: true,
    relativePath: cleanedPath,
    dirName: path.basename(realTarget),
    realTarget,
  };
}
