import { Router, Request, Response } from "express";
import fs from "fs";
import { sanitizeObsidianAttachmentPath, AttachmentSanitizationResult } from "../../lib/obsidianPathSanitizer";
import { ObsidianVaultManager } from "../../lib/vault-manager";
import { logStructuredEvent } from "../../lib/security";

export type VaultRootResolver =
  | ObsidianVaultManager
  | (() => ObsidianVaultManager | null | undefined)
  | ((vaultId?: string) => string | null | undefined)
  | (() => string | null | undefined);

const STANDARD_ATTACHMENT_FOLDERS = [
  "attachments",
  "assets",
  "images",
  "_resources",
  "media",
  "02_PDF_Source",
  "05_EPUB_Export",
  "01_Books",
  "03_Notes",
];

/**
 * Creates the Obsidian Vault Attachment Router
 * Streams binary assets (images, PDF, video, audio) with boundary protection and multi-vault support
 * @param vaultResolver ObsidianVaultManager or function resolving vault root directory
 */
export function createObsidianAttachmentRouter(
  vaultResolver: VaultRootResolver
): Router {
  const router = Router();

  // GET /obsidian/vault/attachment?path=<relative-path>&vaultId=<vaultId>
  router.get("/obsidian/vault/attachment", (req: Request, res: Response) => {
    try {
      const rawPath = req.query.path as string | undefined;
      if (!rawPath || typeof rawPath !== "string" || rawPath.trim().length === 0) {
        res.status(400).json({
          error: "MISSING_PATH",
          message: "Query parameter 'path' is required and must not be empty.",
        });
        return;
      }

      const rawVaultId = req.query.vaultId as string | undefined;
      const explicitVaultId =
        rawVaultId && typeof rawVaultId === "string" && rawVaultId.trim().length > 0
          ? rawVaultId.trim()
          : undefined;

      // Extract vault manager if provided
      let vaultManager: ObsidianVaultManager | null = null;
      let getVaultRootFn: ((vaultId?: string) => string | null | undefined) | null = null;

      if (vaultResolver instanceof ObsidianVaultManager) {
        vaultManager = vaultResolver;
      } else if (typeof vaultResolver === "function") {
        try {
          const probe = vaultResolver(explicitVaultId);
          if (probe instanceof ObsidianVaultManager) {
            vaultManager = probe;
          } else if (typeof probe === "string" || probe === null || probe === undefined) {
            getVaultRootFn = vaultResolver as (vaultId?: string) => string | null | undefined;
          }
        } catch {
          getVaultRootFn = vaultResolver as (vaultId?: string) => string | null | undefined;
        }
      }

      // Determine candidate vault roots
      interface VaultCandidate {
        vaultId?: string;
        root: string;
      }

      const candidates: VaultCandidate[] = [];

      if (explicitVaultId) {
        if (vaultManager) {
          const profile = vaultManager.getVaultProfile(explicitVaultId);
          if (!profile || !profile.rootPath) {
            res.status(404).json({
              error: "VAULT_NOT_FOUND",
              message: `Vault profile '${explicitVaultId}' is not configured.`,
            });
            return;
          }
          candidates.push({ vaultId: explicitVaultId, root: profile.rootPath });
        } else if (getVaultRootFn) {
          const root = getVaultRootFn(explicitVaultId);
          if (!root) {
            res.status(404).json({
              error: "VAULT_NOT_FOUND",
              message: `Vault profile '${explicitVaultId}' is not configured.`,
            });
            return;
          }
          candidates.push({ vaultId: explicitVaultId, root });
        }
      } else {
        // No explicit vaultId:
        // First candidate: active vault
        if (vaultManager) {
          const activeRoot = vaultManager.getActiveVaultRoot();
          const activeId = vaultManager.getActiveVaultId();
          if (activeRoot) {
            candidates.push({ vaultId: activeId || "active", root: activeRoot });
          }
          // Fallback candidates: all other registered vaults
          for (const summary of vaultManager.listVaults()) {
            if (summary.vaultId !== activeId) {
              const profile = vaultManager.getVaultProfile(summary.vaultId);
              if (profile?.rootPath) {
                candidates.push({ vaultId: summary.vaultId, root: profile.rootPath });
              }
            }
          }
        } else if (getVaultRootFn) {
          const root = getVaultRootFn();
          if (root) {
            candidates.push({ root });
          }
        }
      }

      if (candidates.length === 0) {
        res.status(503).json({
          error: "VAULT_NOT_CONFIGURED",
          message: "Obsidian Vault root is not configured on local server.",
        });
        return;
      }

      let matchedResult: AttachmentSanitizationResult | null = null;
      let matchedCandidate: VaultCandidate | null = null;
      let lastErrorResult: { ok: false; error: string; message: string } | null = null;

      const isBareFilename = !rawPath.replace(/^\.\//, "").replace(/^\/+/, "").includes("/");

      for (const cand of candidates) {
        let sanitizeResult = sanitizeObsidianAttachmentPath(cand.root, rawPath);

        // If path traversal or security violation -> fail immediately without continuing
        if (sanitizeResult.ok === false && sanitizeResult.error === "PATH_TRAVERSAL_DETECTED") {
          lastErrorResult = sanitizeResult;
          break;
        }

        // Only probe standard folders if it's a bare filename (not already a canonical relative path)
        if (sanitizeResult.ok === false && sanitizeResult.error === "FILE_NOT_FOUND" && isBareFilename) {
          const cleanBase = rawPath.replace(/^\.\//, "").replace(/^\/+/, "");
          for (const folder of STANDARD_ATTACHMENT_FOLDERS) {
            const candidatePath = `${folder}/${cleanBase}`;
            const fallbackResult = sanitizeObsidianAttachmentPath(cand.root, candidatePath);
            if (fallbackResult.ok) {
              sanitizeResult = fallbackResult;
              break;
            }
          }
        }

        if (sanitizeResult.ok) {
          matchedResult = sanitizeResult;
          matchedCandidate = cand;
          break;
        } else {
          lastErrorResult = sanitizeResult as { ok: false; error: string; message: string };
        }
      }

      if (!matchedResult || matchedResult.ok === false) {
        const errorResult = lastErrorResult || {
          ok: false,
          error: "FILE_NOT_FOUND",
          message: "File does not exist in the Obsidian Vault.",
        };
        const statusMap: Record<string, number> = {
          FILE_NOT_FOUND: 404,
          FILE_TOO_LARGE: 413,
          INVALID_FILE_TYPE: 400,
          PATH_TRAVERSAL_DETECTED: 403,
          ACCESS_DENIED_SENSITIVE_DIR: 403,
          FORBIDDEN_EXTENSION: 403,
        };
        const status = statusMap[errorResult.error] || 403;
        res.status(status).json({
          error: errorResult.error,
          message: errorResult.message,
        });
        return;
      }

      if (matchedCandidate?.vaultId) {
        logStructuredEvent("info", "OBSIDIAN_ATTACHMENT_RESOLVED", {
          vaultId: matchedCandidate.vaultId,
          relativePath: matchedResult.relativePath,
          sizeBytes: matchedResult.sizeBytes,
        });
      }

      // Set binary streaming headers
      res.setHeader("Content-Type", matchedResult.mimeType);
      res.setHeader("Content-Length", matchedResult.sizeBytes);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const fileStream = fs.createReadStream(matchedResult.realTarget);
      fileStream.on("error", () => {
        if (!res.headersSent) {
          res.status(500).json({
            error: "STREAM_ERROR",
            message: "Failed to read attachment stream from disk.",
          });
        }
      });

      fileStream.pipe(res);
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Failed to process attachment request.",
        });
      }
    }
  });

  return router;
}
