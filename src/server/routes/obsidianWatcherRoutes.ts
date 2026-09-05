import { Router, Request, Response } from "express";
import { sanitizeObsidianPath } from "../../lib/obsidianPathSanitizer";
import { ObsidianFileWatcher } from "../../lib/obsidianFileWatcher";

/**
 * Creates the Obsidian Vault File Watcher SSE Router
 * Streams live file change events to connected clients
 * @param getVaultRoot Function resolving current approved local vault root directory
 * @param fileWatcher Optional shared or injected file watcher instance
 */
export function createObsidianWatcherRouter(
  getVaultRoot: () => string | null | undefined,
  fileWatcher?: ObsidianFileWatcher | (() => ObsidianFileWatcher)
): Router {
  const router = Router();
  const getWatcher = typeof fileWatcher === "function" ? fileWatcher : () => (fileWatcher || new ObsidianFileWatcher(500));

  // GET /obsidian/vault/watch?path=<relative-path>
  router.get("/obsidian/vault/watch", (req: Request, res: Response) => {
    const watcher = getWatcher();
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

      const sanitizeResult = sanitizeObsidianPath(root, rawPath);
      if (sanitizeResult.ok === false) {
        const errorResult = sanitizeResult as {
          ok: false;
          error: string;
          message: string;
        };
        const status = errorResult.error === "FILE_NOT_FOUND" ? 404 : 403;
        res.status(status).json({
          error: errorResult.error,
          message: errorResult.message,
        });
        return;
      }

      // Establish SSE stream
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      });

      // Send initial connected payload
      res.write(
        `data: ${JSON.stringify({
          type: "connected",
          filePath: sanitizeResult.relativePath,
        })}\n\n`
      );

      // Heartbeat every 25 seconds to prevent timeout on proxies
      const pingInterval = setInterval(() => {
        res.write(": ping\n\n");
      }, 25000);

      // Start watching target file
      const unsubscribe = watcher.watch(
        sanitizeResult.realTarget,
        sanitizeResult.relativePath,
        (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      );

      req.on("close", () => {
        clearInterval(pingInterval);
        unsubscribe();
      });
    } catch (err: any) {
      if (!res.headersSent) {
        res.status(500).json({
          error: "INTERNAL_ERROR",
          message: "Failed to initialize file watcher stream.",
        });
      }
    }
  });

  return router;
}
