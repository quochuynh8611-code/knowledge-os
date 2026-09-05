import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeObsidianPath, MAX_MARKDOWN_BYTES } from "../../lib/obsidianPathSanitizer";
import { parseObsidianFrontmatterAndOutline } from "../../lib/obsidianParser";

export interface ObsidianVaultStatusResponse {
  configured: boolean;
  vaultName?: string;
  accessible: boolean;
}

/**
 * Creates the Obsidian Vault Read-Only Router
 * @param getVaultRoot Function resolving current approved local vault root directory
 */
export function createObsidianVaultRouter(
  getVaultRoot: () => string | null | undefined
): Router {
  const router = Router();

  // GET /api/obsidian/vault/status - Health & configuration check
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
      // Check read accessibility without walking full directory
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
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to inspect vault status." });
    }
  });

  // GET /api/obsidian/vault/file?path=... - Read and parse Obsidian note
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

      // Read UTF-8 content directly from the resolved regular file
      const rawContent = fs.readFileSync(sanitization.realTarget, "utf8");
      const parsed = parseObsidianFrontmatterAndOutline(rawContent);

      const stat = fs.statSync(sanitization.realTarget);

      // Return strictly masked response (no absolute filesystem paths)
      res.status(200).json({
        relativePath: sanitization.relativePath,
        fileName: sanitization.fileName,
        frontmatter: parsed.frontmatter,
        outline: parsed.outline,
        content: parsed.content,
        sizeBytes: sanitization.sizeBytes,
        lastModified: stat.mtime.toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to read obsidian file." });
    }
  });

  return router;
}
