import { Router, Request, Response } from "express";
import { ObsidianVaultIndex, ObsidianSearchResult } from "../../lib/obsidianIndexBuilder";

export interface ObsidianSearchResponse {
  query: string;
  count: number;
  results: ObsidianSearchResult[];
}

/**
 * Creates the Obsidian Vault Search Router
 * @param getVaultRoot Function resolving approved local vault root directory, optionally accepting a vaultId
 * @param searchIndex Optional shared or injected search index instance
 */
export function createObsidianSearchRouter(
  getVaultRoot: (vaultId?: string) => string | null | undefined,
  searchIndex?: ObsidianVaultIndex | (() => ObsidianVaultIndex)
): Router {
  const router = Router();
  const getIndex = typeof searchIndex === "function" ? searchIndex : () => (searchIndex || new ObsidianVaultIndex());

  // GET /obsidian/vault/search?q=<query>&vaultId=<vaultId>&all=<true|false>
  router.get("/obsidian/vault/search", async (req: Request, res: Response) => {
    try {
      const rawVaultId = req.query.vaultId as string | undefined;
      const vaultId =
        rawVaultId && typeof rawVaultId === "string" && rawVaultId.trim().length > 0
          ? rawVaultId.trim()
          : undefined;

      const root = typeof getVaultRoot === "function" ? getVaultRoot(vaultId) : getVaultRoot;
      if (!root || typeof root !== "string" || root.trim().length === 0) {
        res.status(503).json({
          error: "VAULT_NOT_CONFIGURED",
          message: "Obsidian Vault root is not configured on local server.",
        });
        return;
      }

      const rawQuery = req.query.q as string | undefined;
      const isAll = req.query.all === "true" || rawQuery === "*";

      if (!isAll && (!rawQuery || typeof rawQuery !== "string" || rawQuery.trim().length === 0)) {
        res.status(400).json({
          error: "MISSING_QUERY",
          message: "Query parameter 'q' is required and must not be empty.",
        });
        return;
      }

      let targetIndex: ObsidianVaultIndex;
      if (vaultId) {
        // Build dedicated index for the specified scoped vault profile
        targetIndex = new ObsidianVaultIndex();
        await targetIndex.build(root);
      } else {
        targetIndex = getIndex();
        if (!targetIndex.isReady()) {
          await targetIndex.build(root);
        }
      }

      if (isAll) {
        const allDocs = targetIndex.getAllDocs();
        const results: ObsidianSearchResult[] = allDocs.map((doc) => ({
          title: doc.title,
          path: doc.filePath,
          snippet: "",
          score: 100,
        }));
        res.status(200).json({
          query: "*",
          count: results.length,
          results,
        });
        return;
      }

      const query = rawQuery!.trim().slice(0, 100);
      const results = targetIndex.search(query, 50);

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
