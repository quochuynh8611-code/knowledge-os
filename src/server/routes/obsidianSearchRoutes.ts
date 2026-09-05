import { Router, Request, Response } from "express";
import { ObsidianVaultIndex, ObsidianSearchResult } from "../../lib/obsidianIndexBuilder";

export interface ObsidianSearchResponse {
  query: string;
  count: number;
  results: ObsidianSearchResult[];
}

/**
 * Creates the Obsidian Vault Search Router
 * @param getVaultRoot Function resolving current approved local vault root directory
 * @param searchIndex Optional shared or injected search index instance
 */
export function createObsidianSearchRouter(
  getVaultRoot: () => string | null | undefined,
  searchIndex?: ObsidianVaultIndex
): Router {
  const router = Router();
  const index = searchIndex || new ObsidianVaultIndex();

  // GET /obsidian/vault/search?q=<query>
  router.get("/obsidian/vault/search", async (req: Request, res: Response) => {
    try {
      const root = getVaultRoot();
      if (!root || typeof root !== "string" || root.trim().length === 0) {
        res.status(503).json({
          error: "VAULT_NOT_CONFIGURED",
          message: "Obsidian Vault root is not configured on local server.",
        });
        return;
      }

      const rawQuery = req.query.q as string | undefined;
      if (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
        res.status(400).json({
          error: "MISSING_QUERY",
          message: "Query parameter 'q' is required and must not be empty.",
        });
        return;
      }

      const query = rawQuery.trim().slice(0, 100);

      // Ensure index is built for current vault root
      if (!index.isReady()) {
        await index.build(root);
      }

      const results = index.search(query, 50);

      res.status(200).json({
        query,
        count: results.length,
        results,
      });
    } catch (err: any) {
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to perform search across Obsidian Vault.",
      });
    }
  });

  return router;
}
