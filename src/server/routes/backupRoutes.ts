import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  RestoreRequestSchema,
  calculateBackupChecksum,
} from "../../lib/validation";
import {
  buildBackupSnapshotFromDb,
  executeReplaceRestore,
  executeMergeRestore,
} from "../services/backupService";
import {
  createRateLimitMiddleware,
  logStructuredEvent,
  type RateLimiter,
} from "../../lib/security";

export function createBackupRouter(
  prisma: PrismaClient | any,
  restoreRateLimiter: RateLimiter,
): Router {
  const router = Router();

  // ==========================================
  // BACKUP SNAPSHOT EXPORT ENDPOINT (PHASE 2B)
  // ==========================================
  router.get("/backup/export", async (_req, res) => {
    try {
      const snapshot = await buildBackupSnapshotFromDb(prisma);
      res.json(snapshot);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Backup export failed";
      console.error("Backup Export Error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // BACKUP SNAPSHOT RESTORE ENDPOINT (PHASE 2B / PHASE 4)
  // ==========================================
  router.post(
    "/backup/restore",
    createRateLimitMiddleware(
      restoreRateLimiter,
      "Quá nhiều yêu cầu phục hồi dữ liệu (tối đa 5 req/phút). Vui lòng thử lại sau.",
    ),
    async (req, res) => {
      const parsed = RestoreRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        logStructuredEvent("warn", "BACKUP_RESTORE_VALIDATION_ERROR", {
          errors: parsed.error.issues,
        });
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          details: parsed.error.issues,
        });
      }

      const { snapshot, mode } = parsed.data;

      // 1. Verify SHA-256 Checksum Integrity (Fail-Fast)
      const calculatedChecksum = calculateBackupChecksum(snapshot.data);
      if (snapshot.checksum !== calculatedChecksum) {
        logStructuredEvent("warn", "BACKUP_RESTORE_CHECKSUM_MISMATCH", {
          expectedChecksum: snapshot.checksum,
          calculatedChecksum,
        });
        return res.status(400).json({
          error: "CHECKSUM_MISMATCH",
          message:
            "Checksum verification failed: payload has been modified or corrupted",
        });
      }

      try {
        await prisma.$transaction(async (tx: any) => {
          if (mode === "replace") {
            await executeReplaceRestore(tx, snapshot.data);
          } else {
            await executeMergeRestore(tx, snapshot.data);
          }
        });

        logStructuredEvent("info", "BACKUP_RESTORE_SUCCESS", {
          mode,
          restoredCounts: snapshot.counts,
        });

        res.json({
          success: true,
          mode,
          restoredAt: new Date().toISOString(),
          restoredCounts: snapshot.counts,
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Restore transaction failed";
        logStructuredEvent("error", "BACKUP_RESTORE_TRANSACTION_FAILED", {
          error: msg,
          mode,
        });
        res.status(500).json({ error: msg });
      }
    },
  );

  return router;
}
