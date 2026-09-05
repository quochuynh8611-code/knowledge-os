import { Router, Request, Response } from "express";
import fs from "fs";
import { sanitizeObsidianAttachmentPath } from "../../lib/obsidianPathSanitizer";

/**
 * Creates the Obsidian Vault Attachment Router
 * Streams binary assets (images, PDF, video, audio) with boundary protection
 * @param getVaultRoot Function resolving current approved local vault root directory
 */
export function createObsidianAttachmentRouter(
  getVaultRoot: () => string | null | undefined
): Router {
  const router = Router();

  // GET /obsidian/vault/attachment?path=<relative-path>
  router.get("/obsidian/vault/attachment", (req: Request, res: Response) => {
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
          message: "Query parameter 'path' is required and must not be empty.",
        });
        return;
      }

      const sanitizeResult = sanitizeObsidianAttachmentPath(root, rawPath);
      if (sanitizeResult.ok === false) {
        const errorResult = sanitizeResult as {
          ok: false;
          error: string;
          message: string;
          sizeBytes?: number;
        };
        const statusMap: Record<string, number> = {
          FILE_NOT_FOUND: 404,
          FILE_TOO_LARGE: 413,
          INVALID_FILE_TYPE: 400,
        };
        const status = statusMap[errorResult.error] || 403;
        res.status(status).json({
          error: errorResult.error,
          message: errorResult.message,
        });
        return;
      }

      // Set binary streaming headers
      res.setHeader("Content-Type", sanitizeResult.mimeType);
      res.setHeader("Content-Length", sanitizeResult.sizeBytes);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

      const fileStream = fs.createReadStream(sanitizeResult.realTarget);
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
