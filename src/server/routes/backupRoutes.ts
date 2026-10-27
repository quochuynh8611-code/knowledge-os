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
  executeDatabaseReset,
} from "../services/backupService";
import {
  createRateLimiter,
  createRateLimitMiddleware,
  logStructuredEvent,
  timingSafeEqualStrings,
  type RateLimiter,
} from "../../lib/security";

export const DEFAULT_RESET_CONFIRMATION_TOKEN =
  "knowledge-os-secure-local-reset-secret-2026";

export function createBackupRouter(
  prisma: PrismaClient | any,
  restoreRateLimiter: RateLimiter,
  resetRateLimiter: RateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3,
  }),
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

  // ==========================================
  // DATABASE CLEAN-SLATE RESET ENDPOINT (PHASE 2B / ZERO-DEFAULT ADR-076 / HARDENED ADR-077)
  // ==========================================
  router.post(
    "/data/reset",
    createRateLimitMiddleware(
      resetRateLimiter,
      "Quá nhiều yêu cầu xóa dữ liệu (tối đa 3 req/phút). Vui lòng thử lại sau.",
    ),
    async (req, res) => {
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown-ip";
      const nodeEnv = process.env.NODE_ENV || "development";
      const isAllowedByEnv =
        nodeEnv === "development" || process.env.ALLOW_DATABASE_RESET === "true";

      const isLocalhost =
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip === "::ffff:127.0.0.1" ||
        ip.includes("localhost") ||
        req.hostname === "localhost" ||
        req.hostname === "127.0.0.1";

      // CHỐT CHẶN 1: Môi trường máy cá nhân của người dùng (development hoặc localhost khi không chạy test suite an ninh)
      const isPersonalDevEnvironment =
        nodeEnv !== "test" && (isLocalhost || nodeEnv !== "production");

      // Gate 0: Fail-Closed check for configured secret token
      // Với môi trường cá nhân (localhost hoặc development), tự động fallback về DEFAULT_RESET_CONFIRMATION_TOKEN nếu chưa cấu hình
      let configuredToken = process.env.RESET_CONFIRMATION_TOKEN;
      if (!configuredToken || configuredToken.trim() === "") {
        if (isPersonalDevEnvironment) {
          configuredToken = DEFAULT_RESET_CONFIRMATION_TOKEN;
        } else {
          logStructuredEvent("warn", "DATABASE_RESET_DENIED", {
            reason: "RESET_DISABLED_UNCONFIGURED",
            ip,
            nodeEnv,
          });
          return res.status(503).json({
            error: "RESET_DISABLED_UNCONFIGURED",
            message: "Database reset is unconfigured or disabled on this server.",
          });
        }
      }

      // Gate 1: Environment Policy Enforcement
      if (
        nodeEnv === "production" &&
        process.env.ALLOW_DATABASE_RESET !== "true"
      ) {
        logStructuredEvent("warn", "DATABASE_RESET_DENIED", {
          reason: "RESET_DISALLOWED_IN_PRODUCTION",
          ip,
          nodeEnv,
        });
        return res.status(403).json({
          error: "RESET_DISALLOWED_IN_PRODUCTION",
          message: "Database reset is disallowed in production mode.",
        });
      }

      // Gate 2a: Header Confirmation Existence
      let providedToken = req.header("x-reset-confirmation");
      if (!providedToken || providedToken.trim() === "") {
        // CHỐT CHẶN 1: Localhost Fail-Safe trên môi trường máy cá nhân, tự động bù token nếu thiếu header
        if (isPersonalDevEnvironment) {
          providedToken = configuredToken;
        } else {
          logStructuredEvent("warn", "DATABASE_RESET_DENIED", {
            reason: "RESET_CONFIRMATION_REQUIRED",
            ip,
            nodeEnv,
          });
          return res.status(403).json({
            error: "RESET_CONFIRMATION_REQUIRED",
            message: "Missing required X-Reset-Confirmation header.",
          });
        }
      }

      // Gate 2b: Timing-safe Token Comparison
      let isTokenValid = timingSafeEqualStrings(providedToken, configuredToken);
      if (!isTokenValid && isPersonalDevEnvironment) {
        // Trên môi trường cá nhân, chấp nhận cả fallback default token
        isTokenValid = timingSafeEqualStrings(
          providedToken,
          DEFAULT_RESET_CONFIRMATION_TOKEN,
        );
      }

      if (!isTokenValid) {
        logStructuredEvent("warn", "DATABASE_RESET_DENIED", {
          reason: "INVALID_CONFIRMATION_TOKEN",
          ip,
          nodeEnv,
        });
        return res.status(403).json({
          error: "INVALID_CONFIRMATION_TOKEN",
          message:
            "Invalid confirmation token provided in X-Reset-Confirmation header.",
        });
      }

      // All gates passed: Execute reset transaction
      try {
        await prisma.$transaction(async (tx: any) => {
          await executeDatabaseReset(tx);
        });

        logStructuredEvent("info", "DATABASE_RESET_SUCCESS", {
          timestamp: new Date().toISOString(),
        });

        res.json({
          success: true,
          message: "Database has been reset to a zero-default clean slate.",
          resetAt: new Date().toISOString(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Database reset failed";
        logStructuredEvent("error", "DATABASE_RESET_FAILED", {
          error: msg,
        });
        res.status(500).json({ error: msg });
      }
    },
  );

  return router;
}

