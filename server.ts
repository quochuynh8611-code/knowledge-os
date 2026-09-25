import express from "express";
import path from "path";
import dotenv from "dotenv";
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
import { createFlashcardRouter } from "./src/server/routes/flashcardRoutes";
import { createDocsRouter } from "./src/server/routes/docsRoutes";
import { createArchiveRouter } from "./src/server/routes/archiveRoutes";
import { createResearchSessionRouter } from "./src/server/routes/researchSessionRoutes";
import { createResearchProviderRuntimeDiagnostics } from "./src/server/bootstrap/researchProviderComposition";
import { ResearchProviderConfig } from "./src/server/config/researchProviderConfig";
import { ProviderRegistry } from "./src/server/services/providers/providerRegistry";
import { createArtifactRouter } from "./src/server/routes/artifactRoutes";
import { createObsidianVaultRoutes } from "./src/server/routes/obsidianVaultRoutes";
import { createObsidianVaultTreeRouter } from "./src/server/routes/obsidianVaultTree";
import { createObsidianSearchRouter } from "./src/server/routes/obsidianSearchRoutes";
import { createObsidianAttachmentRouter } from "./src/server/routes/obsidianAttachmentRoutes";
import { createObsidianWatcherRouter } from "./src/server/routes/obsidianWatcherRoutes";
import { ObsidianVaultManager } from "./src/lib/vault-manager";
import { ManagedVaultProfile } from "./src/lib/vault-manager.types";
import {
  createRateLimiter,
  createRateLimitMiddleware,
  logStructuredEvent,
} from "./src/lib/security";
import { resolveServerPort } from "./src/server/serverConfig";

dotenv.config();

export interface ServerAppDeps {
  prismaClient?: typeof prisma;
  researchDiagnostics?: {
    config: ResearchProviderConfig;
    providerRegistry: ProviderRegistry | null;
  };
}

/**
 * Builds and configures Express application with all middleware and routes.
 * Pure additive test seam for deterministic server bootstrap testing.
 */
export function createServerApp(deps?: ServerAppDeps): express.Express {
  const app = express();
  const activePrisma = deps?.prismaClient || prisma;

  app.use(express.json({ limit: "15mb" }));
  app.use(
    express.raw({
      type: ["application/pdf", "application/epub+zip", "text/markdown", "application/octet-stream"],
      limit: "50mb",
    })
  );

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

  // Read-only Obsidian Vault Profile Manager
  const defaultProfiles: ManagedVaultProfile[] = [];
  if (process.env.OBSIDIAN_VAULTS_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.OBSIDIAN_VAULTS_CONFIG);
      if (Array.isArray(parsed)) {
        defaultProfiles.push(...parsed);
      }
    } catch {
      // Ignore invalid JSON config
    }
  }

  if (defaultProfiles.length === 0 && process.env.OBSIDIAN_VAULT_ROOT) {
    defaultProfiles.push({
      vaultId: "default",
      label: path.basename(process.env.OBSIDIAN_VAULT_ROOT) || "Default Vault",
      rootPath: process.env.OBSIDIAN_VAULT_ROOT,
    });
  }

  const obsidianVaultManager = new ObsidianVaultManager({
    profiles: defaultProfiles,
    defaultVaultId: defaultProfiles[0]?.vaultId,
  });

  // Health check routes
  app.use("/api", createHealthRouter(activePrisma));

  // Antigravity & Gemini Research Scholar Endpoints
  app.use("/api", createGeminiRouter(getGenAI, () => obsidianVaultManager));

  // ==========================================
  // REST CRUD & PERSISTENCE ENDPOINTS (PHASE 2A)
  // ==========================================

  // 0. Categories CRUD
  app.use("/api", createCategoryRouter(activePrisma));

  // 1. Topics CRUD
  app.use("/api", createTopicRouter(activePrisma));

  // 2. Notes CRUD
  app.use("/api", createNoteRouter(activePrisma));

  // 3. Resources CRUD
  app.use("/api", createResourceRouter(activePrisma));

  // 4. Spaced Repetition Review Progress
  app.use("/api", createStudyProgressRouter(activePrisma));

  // 5. Idempotent Hydration Sync Endpoint
  app.use("/api", createSyncRouter(activePrisma));

  // 6. Flashcards & Spaced Repetition Subsystem (Phase F4)
  app.use("/api", createFlashcardRouter(activePrisma));

  // 7. NotebookLM Research Hub v2.1 Pipeline Endpoints (With Runtime Injection)
  let researchDiagnostics = deps?.researchDiagnostics;
  if (researchDiagnostics === undefined && (!deps || !("researchDiagnostics" in deps))) {
    try {
      researchDiagnostics = createResearchProviderRuntimeDiagnostics();
    } catch (diagError) {
      console.error("[ResearchProvider] Failed to initialize provider diagnostics:", diagError);
      researchDiagnostics = undefined;
    }
  }

  app.use(
    "/api",
    createResearchSessionRouter(activePrisma, {
      providerDiagnostics: researchDiagnostics,
    })
  );
  app.use("/api", createArtifactRouter(activePrisma));

  // ==========================================
  // BACKUP ROUTES (EXPORT & RESTORE)
  // ==========================================
  app.use("/api", createBackupRouter(activePrisma, restoreRateLimiter));

  // ==========================================
  // ARCHITECTURE DOCUMENTATION & SPECS ROUTES
  // ==========================================
  app.use("/api", createDocsRouter());

  // ==========================================
  // PHASE 18A: LOCAL ARCHIVE STORAGE ROUTES
  // ==========================================
  app.use("/api", createArchiveRouter({ prisma: activePrisma }));

  // ==========================================
  // READ-ONLY OBSIDIAN VAULT BRIDGE & VAULT PROFILE MANAGER (PHASE P4.1 - P4.3B)
  // ==========================================
  app.use("/api", createObsidianVaultRoutes(obsidianVaultManager));
  app.use("/api", createObsidianVaultTreeRouter(() => obsidianVaultManager.getActiveVaultRoot()));
  app.use(
    "/api",
    createObsidianSearchRouter(
      (vaultId?: string) => {
        if (vaultId) {
          return obsidianVaultManager.getVaultProfile(vaultId)?.rootPath || null;
        }
        return obsidianVaultManager.getActiveVaultRoot();
      },
      () => obsidianVaultManager.getActiveIndex()
    )
  );
  app.use("/api", createObsidianAttachmentRouter(() => obsidianVaultManager.getActiveVaultRoot()));
  app.use("/api", createObsidianWatcherRouter(() => obsidianVaultManager.getActiveVaultRoot(), () => obsidianVaultManager.getActiveWatcher()));

  return app;
}

async function startServer() {
  const PORT = resolveServerPort(process.env.PORT);
  const app = createServerApp();

  // Vite middleware for development or Static Serving in Production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  startServer();
}
