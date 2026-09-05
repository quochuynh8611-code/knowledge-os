import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { prisma } from "./src/lib/prisma";
import { getGenAI } from "./src/server/services/geminiService";
import { createHealthRouter } from "./src/server/routes/healthRoutes";
import { createGeminiRouter } from "./src/server/routes/geminiRoutes";
import { createCategoryRouter } from "./src/server/routes/categoryRoutes";
import { createTopicRouter } from "./src/server/routes/topicRoutes";
import { createNoteRouter } from "./src/server/routes/noteRoutes";
import { createResourceRouter } from "./src/server/routes/resourceRoutes";
import { createStudyProgressRouter } from "./src/server/routes/studyProgressRoutes";
import { createSyncRouter } from "./src/server/routes/syncRoutes";
import { createBackupRouter } from "./src/server/routes/backupRoutes";
import { createDocsRouter } from "./src/server/routes/docsRoutes";
import { createObsidianVaultRouter } from "./src/server/routes/obsidianVaultRoutes";
import { createObsidianVaultTreeRouter } from "./src/server/routes/obsidianVaultTree";
import {
  createRateLimiter,
  createRateLimitMiddleware,
  logStructuredEvent,
} from "./src/lib/security";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Rate limiters for sensitive endpoints (Phase 4 Security Guardrails)
  const geminiRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
  });

  const restoreRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
  });

  // Apply rate limiting to all /api/gemini endpoints
  app.use(
    "/api/gemini",
    createRateLimitMiddleware(
      geminiRateLimiter,
      "Quá nhiều yêu cầu nghiên cứu AI (tối đa 10 req/phút). Vui lòng thử lại sau.",
    ),
  );

  // Health check routes
  app.use("/api", createHealthRouter(prisma));

  // Antigravity & Gemini Research Scholar Endpoints
  app.use("/api", createGeminiRouter(getGenAI));

  // ==========================================
  // REST CRUD & PERSISTENCE ENDPOINTS (PHASE 2A)
  // ==========================================

  // 0. Categories CRUD
  app.use("/api", createCategoryRouter(prisma));

  // 1. Topics CRUD
  app.use("/api", createTopicRouter(prisma));

  // 2. Notes CRUD
  app.use("/api", createNoteRouter(prisma));

  // 3. Resources CRUD
  app.use("/api", createResourceRouter(prisma));

  // 4. Spaced Repetition Review Progress
  app.use("/api", createStudyProgressRouter(prisma));

  // 5. Idempotent Hydration Sync Endpoint
  app.use("/api", createSyncRouter(prisma));

  // ==========================================
  // BACKUP ROUTES (EXPORT & RESTORE)
  // ==========================================
  app.use("/api", createBackupRouter(prisma, restoreRateLimiter));

  // ==========================================
  // ARCHITECTURE DOCUMENTATION & SPECS ROUTES
  // ==========================================
  app.use("/api", createDocsRouter());

  // ==========================================
  // READ-ONLY OBSIDIAN VAULT BRIDGE (PHASE P4.1 & P4.2)
  // ==========================================
  app.use("/api", createObsidianVaultRouter(() => process.env.OBSIDIAN_VAULT_ROOT));
  app.use("/api", createObsidianVaultTreeRouter(() => process.env.OBSIDIAN_VAULT_ROOT));

  // Vite middleware for development or Static Serving in Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    logStructuredEvent("info", "SERVER_STARTUP", {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || "development",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      url: `http://localhost:${PORT}`,
    });
    console.log(`Knowledge OS Server running on http://localhost:${PORT}`);
  });
}

startServer();
