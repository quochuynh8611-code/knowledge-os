import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeObsidianPath, MAX_MARKDOWN_BYTES } from "../../lib/obsidianPathSanitizer";
import { parseObsidianFrontmatterAndOutline } from "../../lib/obsidianParser";
import { ObsidianVaultManager } from "../../lib/vault-manager";
import { VaultError } from "../../lib/vault-manager.errors";

export interface ObsidianVaultStatusResponse {
  configured: boolean;
  vaultName?: string;
  activeVaultId?: string | null;
  label?: string | null;
  accessible: boolean;
}

/**
 * Creates the Obsidian Vault Router wired to an ObsidianVaultManager instance (P4.3B).
 * Supports listing, switching, status checking, and reading notes.
 */
export function createObsidianVaultRoutes(vaultManager: ObsidianVaultManager): Router {
  const router = Router();

  // GET /api/obsidian/vaults - List registered vaults without leaking filesystem paths
  router.get("/obsidian/vaults", (_req: Request, res: Response) => {
    try {
      const activeVaultId = vaultManager.getActiveVaultId();
      const vaults = vaultManager.listVaults();

      res.status(200).json({
        activeVaultId,
        vaults,
      });
    } catch {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to list vaults." });
    }
  });

  // POST /api/obsidian/vault/switch - Safely switch active vault
  router.post("/obsidian/vault/switch", async (req: Request, res: Response) => {
    const rawVaultId = req.body?.vaultId;

    if (rawVaultId === undefined || rawVaultId === null) {
      res.status(400).json({
        error: "MISSING_VAULT_ID",
        message: "Property 'vaultId' is required in request body.",
      });
      return;
    }

    try {
      const result = await vaultManager.switchVault(rawVaultId);
      res.status(200).json(result);
    } catch (err: any) {
      if (err instanceof VaultError) {
        res.status(err.statusCode).json({
          error: err.code,
          message: err.message,
        });
        return;
      }

      res.status(500).json({
        error: "SWITCH_FAILED",
        message: err.message || "Failed to switch vault.",
      });
    }
  });

  // GET /api/obsidian/vault/status - Active vault health and metadata
  router.get("/obsidian/vault/status", (_req: Request, res: Response) => {
    try {
      const status = vaultManager.getStatus();
      const root = vaultManager.getActiveVaultRoot();

      res.status(200).json({
        configured: status.configured,
        activeVaultId: status.activeVaultId,
        label: status.label,
        vaultName: status.label || (root ? path.basename(root) : undefined),
        accessible: status.accessible,
      });
    } catch {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to inspect vault status." });
    }
  });

  // GET /api/obsidian/vault/file?path=... - Read and parse Obsidian note
  router.get("/obsidian/vault/file", (req: Request, res: Response) => {
    try {
      const root = vaultManager.getActiveVaultRoot();
      if (!root || typeof root !== "string" || root.trim().length === 0) {
        res.status(503).json({
          error: "VAULT_NOT_CONFIGURED",
          message: "Obsidian Vault root is not configured on local server.",
        });
        return;
      }

      const rawPath = req.query.path as string | undefined;
      if (!rawPath || typeof rawPath !== "string" || rawPath.trim().length === 0) {
        res.status(400).json({
          error: "MISSING_PATH",
          message: "Query parameter 'path' is required.",
        });
        return;
      }

      const sanitization = sanitizeObsidianPath(root, rawPath);

      if (sanitization.ok === false) {
        const errorResult = sanitization as { ok: false; error: string; message: string; sizeBytes?: number };
        switch (errorResult.error) {
          case "FILE_NOT_FOUND":
            res.status(404).json({ error: errorResult.error, message: errorResult.message });
            return;
          case "FILE_TOO_LARGE":
            res.status(413).json({
              error: errorResult.error,
              message: errorResult.message,
              sizeBytes: errorResult.sizeBytes,
              maxAllowedBytes: MAX_MARKDOWN_BYTES,
            });
            return;
          case "SYMLINK_NOT_ALLOWED":
          case "PATH_TRAVERSAL_DETECTED":
          case "ACCESS_DENIED_SENSITIVE_DIR":
          case "INVALID_FILE_TYPE":
          case "FORBIDDEN_EXTENSION":
          case "PATH_OUTSIDE_VAULT":
          default:
            res.status(403).json({ error: errorResult.error, message: errorResult.message });
            return;
        }
      }

      const rawContent = fs.readFileSync(sanitization.realTarget, "utf8");
      const parsed = parseObsidianFrontmatterAndOutline(rawContent);
      const stat = fs.statSync(sanitization.realTarget);

      res.status(200).json({
        relativePath: sanitization.relativePath,
        fileName: sanitization.fileName,
        frontmatter: parsed.frontmatter,
        outline: parsed.outline,
        content: parsed.content,
        sizeBytes: sanitization.sizeBytes,
        lastModified: stat.mtime.toISOString(),
      });
    } catch {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to read obsidian file." });
    }
  });

  return router;
}

/**
 * Legacy router factory for backward compatibility with P4.1 & P4.2 tests.
 * @param getVaultRoot Function resolving current approved local vault root directory
 */
export function createObsidianVaultRouter(
  getVaultRoot: () => string | null | undefined
): Router {
  const router = Router();

  // GET /api/obsidian/vault/status
  router.get("/obsidian/vault/status", (_req: Request, res: Response) => {
    try {
      const root = getVaultRoot();
      if (!root || typeof root !== "string" || root.trim().length === 0) {
        res.status(200).json({
          configured: false,
          accessible: false,
        });
        return;
      }

      const resolvedRoot = path.resolve(root.trim());
      let accessible = false;
      try {
        fs.accessSync(resolvedRoot, fs.constants.R_OK);
        accessible = true;
      } catch {
        accessible = false;
      }

      res.status(200).json({
        configured: true,
        vaultName: path.basename(resolvedRoot),
        accessible,
      });
    } catch {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to inspect vault status." });
    }
  });

  // GET /api/obsidian/vault/file?path=...
  router.get("/obsidian/vault/file", (req: Request, res: Response) => {
    try {
      const root = getVaultRoot();
      if (!root || typeof root !== "string" || root.trim().length === 0) {
        res.status(503).json({
          error: "VAULT_NOT_CONFIGURED",
          message: "Obsidian Vault root is not configured on local server.",
        });
        return;
      }

      const rawPath = req.query.path as string | undefined;
      if (!rawPath || typeof rawPath !== "string" || rawPath.trim().length === 0) {
        res.status(400).json({
          error: "MISSING_PATH",
          message: "Query parameter 'path' is required.",
        });
        return;
      }

      const sanitization = sanitizeObsidianPath(root, rawPath);

      if (sanitization.ok === false) {
        const errorResult = sanitization as { ok: false; error: string; message: string; sizeBytes?: number };
        switch (errorResult.error) {
          case "FILE_NOT_FOUND":
            res.status(404).json({ error: errorResult.error, message: errorResult.message });
            return;
          case "FILE_TOO_LARGE":
            res.status(413).json({
              error: errorResult.error,
              message: errorResult.message,
              sizeBytes: errorResult.sizeBytes,
              maxAllowedBytes: MAX_MARKDOWN_BYTES,
            });
            return;
          case "SYMLINK_NOT_ALLOWED":
          case "PATH_TRAVERSAL_DETECTED":
          case "ACCESS_DENIED_SENSITIVE_DIR":
          case "INVALID_FILE_TYPE":
          case "FORBIDDEN_EXTENSION":
          case "PATH_OUTSIDE_VAULT":
          default:
            res.status(403).json({ error: errorResult.error, message: errorResult.message });
            return;
        }
      }

      const rawContent = fs.readFileSync(sanitization.realTarget, "utf8");
      const parsed = parseObsidianFrontmatterAndOutline(rawContent);
      const stat = fs.statSync(sanitization.realTarget);

      res.status(200).json({
        relativePath: sanitization.relativePath,
        fileName: sanitization.fileName,
        frontmatter: parsed.frontmatter,
        outline: parsed.outline,
        content: parsed.content,
        sizeBytes: sanitization.sizeBytes,
        lastModified: stat.mtime.toISOString(),
      });
    } catch {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to read obsidian file." });
    }
  });

  return router;
}
