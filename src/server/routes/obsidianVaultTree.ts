import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { sanitizeObsidianDirPath, FORBIDDEN_SEGMENTS } from "../../lib/obsidianPathSanitizer";

export interface VaultTreeItem {
  name: string;
  type: "file" | "directory";
  path: string;
  size: number;
  mtime: string;
  extension?: string;
}

export interface VaultTreeResponse {
  path: string;
  items: VaultTreeItem[];
}

export const MAX_TREE_ITEMS_PER_DIR = 100;

/**
 * Creates the Obsidian Vault Tree Router
 * @param getVaultRoot Function resolving current approved local vault root directory
 */
export function createObsidianVaultTreeRouter(
  getVaultRoot: () => string | null | undefined
): Router {
  const router = Router();

  // GET /obsidian/vault/tree?path=<relative-path>
  router.get("/obsidian/vault/tree", (req: Request, res: Response) => {
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
      const sanitization = sanitizeObsidianDirPath(root, rawPath);

      if (sanitization.ok === false) {
        const errorResult = sanitization;
        switch (errorResult.error) {
          case "FILE_NOT_FOUND":
            res.status(404).json({ error: errorResult.error, message: errorResult.message });
            return;
          case "SYMLINK_NOT_ALLOWED":
          case "PATH_TRAVERSAL_DETECTED":
          case "ACCESS_DENIED_SENSITIVE_DIR":
          case "INVALID_FILE_TYPE":
          case "PATH_OUTSIDE_VAULT":
          default:
            res.status(403).json({ error: errorResult.error, message: errorResult.message });
            return;
        }
      }

      const entries = fs.readdirSync(sanitization.realTarget, { withFileTypes: true });
      const items: VaultTreeItem[] = [];

      for (const ent of entries) {
        // Skip hidden files/directories and sensitive entries
        if (ent.name.startsWith(".") || FORBIDDEN_SEGMENTS.has(ent.name.toLowerCase())) {
          continue;
        }

        const itemRelativePath = sanitization.relativePath
          ? `${sanitization.relativePath}/${ent.name}`
          : ent.name;
        const itemFullPath = path.join(sanitization.realTarget, ent.name);

        try {
          const lstat = fs.lstatSync(itemFullPath);
          // Reject symlinks
          if (lstat.isSymbolicLink()) {
            continue;
          }

          if (lstat.isDirectory()) {
            items.push({
              name: ent.name,
              type: "directory",
              path: itemRelativePath,
              size: 0,
              mtime: lstat.mtime.toISOString(),
            });
          } else if (lstat.isFile()) {
            const ext = path.extname(ent.name).toLowerCase();
            items.push({
              name: ent.name,
              type: "file",
              path: itemRelativePath,
              size: lstat.size,
              mtime: lstat.mtime.toISOString(),
              extension: ext,
            });
          }
        } catch {
          // Ignore unreadable or transient files
          continue;
        }
      }

      // Sort: directories first, then alphabetical natural order
      items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      });

      const limitedItems = items.slice(0, MAX_TREE_ITEMS_PER_DIR);

      res.status(200).json({
        path: sanitization.relativePath,
        items: limitedItems,
      });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to browse vault tree." });
    }
  });

  return router;
}
