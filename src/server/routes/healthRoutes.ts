import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { checkDbHealth } from "../../lib/resilience";

export function createHealthRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  // Health check endpoint (App & Gemini Key status)
  router.get("/health", (req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Database Health check endpoint (Phase 2B / Phase 4)
  router.get("/health/db", async (_req, res) => {
    const health = await checkDbHealth(prisma);
    res.json(health);
  });

  return router;
}
