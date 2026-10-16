import crypto from "crypto";
import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ResearchSessionService } from "../services/researchSessionService";
import {
  ProviderException,
  sanitizeProviderErrorMessage,
} from "../services/providers/errors";
import {
  ResearchProviderConfig,
  isProviderAllowed,
} from "../config/researchProviderConfig";
import { ProviderRegistry } from "../services/providers/providerRegistry";
import { ResearchOrchestrator } from "../services/providers/researchOrchestrator";
import { SourcePayload } from "../services/providers/types";
import {
  CreateResearchSessionSchema,
  UpdateResearchSessionSchema,
  PackageSourceSchema,
  GeneratePromptSchema,
} from "../../lib/researchHubValidation";

export interface ResearchSessionRouterDeps {
  sessionService?: ResearchSessionService;
  providerDiagnostics?: {
    config: ResearchProviderConfig;
    providerRegistry: ProviderRegistry | null;
  };
  researchOrchestrator?: ResearchOrchestrator;
  directExecutionGating?: {
    isEnabled: () => boolean;
  };
}

export function createResearchSessionRouter(
  prisma: PrismaClient,
  deps?: ResearchSessionRouterDeps
) {
  const router = Router();
  const sessionService = deps?.sessionService || new ResearchSessionService(prisma);

  // POST /api/research-sessions — Get or create session for topic
  router.post("/research-sessions", async (req: Request, res: Response) => {
    try {
      const parsed = CreateResearchSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const session = await sessionService.getOrCreateSessionForTopic(
        parsed.data.topicId,
        parsed.data.notebookUrl,
        parsed.data.notebookId
      );

      return res.status(200).json(session);
    } catch (error) {
      console.error("[ResearchSessionRouter] Error in POST /research-sessions:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/research-sessions/:id
  router.get("/research-sessions/:id", async (req: Request, res: Response) => {
    try {
      const session = await sessionService.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Phiên nghiên cứu không tồn tại" });
      }
      return res.json(session);
    } catch (error) {
      console.error("[ResearchSessionRouter] Error in GET /research-sessions/:id:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/research-sessions/:sessionId/provider-execution — Read-only Provider Execution Status
  router.get(
    "/research-sessions/:sessionId/provider-execution",
    async (req: Request, res: Response) => {
      try {
        const sessionId = req.params.sessionId;
        const rawCorrelationId = req.query.correlationId;

        if (
          !rawCorrelationId ||
          typeof rawCorrelationId !== "string" ||
          rawCorrelationId.trim() === ""
        ) {
          return res.status(400).json({
            error: "Tham số query 'correlationId' là bắt buộc và không được để trống",
          });
        }

        const correlationId = rawCorrelationId.trim();

        // 1. Verify session existence
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Phiên nghiên cứu không tồn tại" });
        }

        // 2. Query provider execution snapshot (read-only)
        const snapshot = await sessionService.getProviderExecutionSnapshot({
          correlationId,
        });

        return res.status(200).json({
          sessionId,
          correlationId,
          snapshot,
        });
      } catch (error: unknown) {
        if (error instanceof ProviderException) {
          const sanitizedMessage = sanitizeProviderErrorMessage(error.message);
          if (error.errorCode === "INVALID_ARGUMENT") {
            return res.status(400).json({ error: sanitizedMessage });
          }
          if (
            error.errorCode === "PERMISSION_DENIED" ||
            error.errorCode === "AUTHENTICATION_FAILED"
          ) {
            return res.status(403).json({ error: sanitizedMessage });
          }
          if (
            error.errorCode === "CAPABILITY_UNSUPPORTED" ||
            error.errorCode === "PROVIDER_UNAVAILABLE" ||
            error.errorCode === "PROVIDER_TIMEOUT"
          ) {
            return res.status(503).json({ error: sanitizedMessage });
          }
          return res.status(500).json({ error: sanitizedMessage });
        }

        const rawMessage = error instanceof Error ? error.message : String(error);
        const sanitized = sanitizeProviderErrorMessage(rawMessage);
        return res.status(500).json({ error: sanitized });
      }
    }
  );

  // GET /api/research/providers — Read-only Provider Diagnostics
  router.get("/research/providers", async (_req: Request, res: Response) => {
    try {
      if (!deps?.providerDiagnostics || !deps.providerDiagnostics.config) {
        return res.status(503).json({
          error: "Dịch vụ chẩn đoán provider chưa sẵn sàng",
        });
      }

      const { config, providerRegistry } = deps.providerDiagnostics;

      if (!config.enableProviderRouting) {
        return res.status(200).json({
          routingEnabled: false,
          defaultProviderId: config.defaultProviderId,
          allowProviderFallback: config.allowProviderFallback,
          providers: [],
        });
      }

      const rawProviders = providerRegistry ? providerRegistry.getAllProviders() : [];
      const filteredProviders = rawProviders
        .filter((p) => isProviderAllowed(p.metadata.id, config))
        .sort((a, b) => a.metadata.id.localeCompare(b.metadata.id))
        .map((p) => {
          const caps = p.getCapabilities();
          const capabilityNames = (Object.keys(caps) as Array<keyof typeof caps>).filter(
            (k) => caps[k] === true
          );

          return {
            id: p.metadata.id,
            displayName: p.metadata.name || p.metadata.id,
            capabilities: capabilityNames,
            allowed: true,
          };
        });

      return res.status(200).json({
        routingEnabled: true,
        defaultProviderId: config.defaultProviderId,
        allowProviderFallback: config.allowProviderFallback,
        providers: filteredProviders,
      });
    } catch (error: unknown) {
      if (error instanceof ProviderException) {
        const sanitizedMessage = sanitizeProviderErrorMessage(error.message);
        if (error.errorCode === "INVALID_ARGUMENT") {
          return res.status(400).json({ error: sanitizedMessage });
        }
        if (
          error.errorCode === "PERMISSION_DENIED" ||
          error.errorCode === "AUTHENTICATION_FAILED"
        ) {
          return res.status(403).json({ error: sanitizedMessage });
        }
        if (
          error.errorCode === "CAPABILITY_UNSUPPORTED" ||
          error.errorCode === "PROVIDER_UNAVAILABLE" ||
          error.errorCode === "PROVIDER_TIMEOUT"
        ) {
          return res.status(503).json({ error: sanitizedMessage });
        }
        return res.status(500).json({ error: sanitizedMessage });
      }

      const rawMessage = error instanceof Error ? error.message : String(error);
      const sanitized = sanitizeProviderErrorMessage(rawMessage);
      return res.status(500).json({ error: sanitized });
    }
  });

  // PATCH /api/research-sessions/:id
  router.patch("/research-sessions/:id", async (req: Request, res: Response) => {
    try {
      const parsed = UpdateResearchSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const updated = await sessionService.updateSession(req.params.id, parsed.data);
      return res.json(updated);
    } catch (error) {
      console.error("[ResearchSessionRouter] Error in PATCH /research-sessions/:id:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/research-sessions/:id/package-sources
  router.post("/research-sessions/:id/package-sources", async (req: Request, res: Response) => {
    try {
      const parsed = PackageSourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const newPackage = await sessionService.packageSources(
        req.params.id,
        parsed.data.content,
        parsed.data.sourceCount
      );

      return res.status(201).json(newPackage);
    } catch (error) {
      console.error("[ResearchSessionRouter] Error in POST /package-sources:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/research-sessions/:id/task-prompt
  router.post("/research-sessions/:id/task-prompt", async (req: Request, res: Response) => {
    try {
      const parsed = GeneratePromptSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const newPrompt = await sessionService.saveTaskPrompt(
        req.params.id,
        parsed.data.promptMode,
        parsed.data.promptText,
        parsed.data.cliCommandHint
      );

      return res.status(201).json(newPrompt);
    } catch (error) {
      console.error("[ResearchSessionRouter] Error in POST /task-prompt:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/research-sessions/:sessionId/execute-live — Direct Execution Gated Endpoint
  router.post(
    "/research-sessions/:sessionId/execute-live",
    async (req: Request, res: Response) => {
      try {
        // Gating Check: Fail-closed unless explicitly enabled via environment or DI
        const isGatedEnabled = deps?.directExecutionGating?.isEnabled
          ? deps.directExecutionGating.isEnabled()
          : process.env.NOTEBOOKLM_DIRECT_EXECUTION === "true";

        if (!isGatedEnabled) {
          return res.status(403).json({
            error:
              "Tính năng khảo cứu trực tiếp qua NotebookLM MCP chưa được kích hoạt trên hệ thống (Gating: NOTEBOOKLM_DIRECT_EXECUTION is off)",
            code: "DIRECT_EXECUTION_DISABLED",
          });
        }

        const sessionId = req.params.sessionId;

        // Verify session existence
        const session = await sessionService.getSessionById(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Phiên nghiên cứu không tồn tại" });
        }

        // Verify orchestrator availability
        const orchestrator = deps?.researchOrchestrator;
        if (!orchestrator) {
          return res.status(503).json({
            error:
              "Dịch vụ điều phối khảo cứu trực tiếp (ResearchOrchestrator) chưa được cấu hình",
            code: "ORCHESTRATOR_UNAVAILABLE",
          });
        }

        const {
          promptArtifactType = "study_guide",
          customInstructions,
          ephemeralWorkspace = true,
          preferredProviderId = "notebooklm-enterprise",
          sources: overrideSources,
        } = req.body || {};

        // Resolve sources: fallback to session's packaged source if available
        let sources: SourcePayload[] = [];
        if (
          overrideSources &&
          Array.isArray(overrideSources) &&
          overrideSources.length > 0
        ) {
          sources = overrideSources;
        } else if (session.sourcePackages && session.sourcePackages.length > 0) {
          const latestPackage = session.sourcePackages[0];
          sources.push({
            type: "inline-text",
            sourceId: latestPackage.id,
            title: `Nguồn tài liệu v${latestPackage.version}`,
            mimeType: "text/markdown",
            textContent: latestPackage.content,
            contentHash: latestPackage.contentHash,
          });
        }

        // Resolve prompt
        const queryPrompt =
          typeof customInstructions === "string" && customInstructions.trim()
            ? customInstructions.trim()
            : session.taskPrompts && session.taskPrompts.length > 0
            ? session.taskPrompts[0].promptText
            : `Hãy phân tích chuyên sâu tài liệu nguồn và lập một bản ${promptArtifactType} chi tiết với đầy đủ luận điểm.`;

        const workspaceTitle = session.topic?.title
          ? `[RESEARCH-LIVE] ${session.topic.title}`
          : `[RESEARCH-LIVE] Phiên ${sessionId}`;

        const startTime = Date.now();
        const directResult = await orchestrator.executeDirectResearch({
          workspaceTitle,
          sources,
          queryPrompt,
          ephemeralWorkspace,
          preferredProviderId,
          correlationId: `live-${sessionId}-${Date.now()}`,
        });
        const executionDurationMs = Date.now() - startTime;

        const contentHash = crypto
          .createHash("sha256")
          .update(directResult.answer)
          .digest("hex");
        const artifactTitle = `${promptArtifactType.toUpperCase()}: ${
          session.topic?.title || "Khảo cứu trực tiếp"
        }`;
        const idempotencyKey = `live-art-${sessionId}-${directResult.workspaceId}-${Date.now()}`;

        let savedArtifact: any = null;
        if (prisma?.groundedArtifact) {
          try {
            savedArtifact = await prisma.groundedArtifact.create({
              data: {
                sessionId,
                topicId: session.topicId,
                sourcePackageId: session.sourcePackages?.[0]?.id || null,
                taskPromptId: session.taskPrompts?.[0]?.id || null,
                artifactType: promptArtifactType,
                title: artifactTitle,
                rawContent: directResult.answer,
                contentHash,
                idempotencyKey,
                status: "received",
                citationCount: directResult.citedSourceIds.length,
                metadata: {
                  providerId: directResult.providerId,
                  remoteWorkspaceId: directResult.workspaceId,
                  cleanupStatus: directResult.cleanupStatus,
                  citedSourceIds: directResult.citedSourceIds,
                  citations: directResult.citations || null,
                  references: directResult.references || null,
                  rawCitations: directResult.rawCitations || null,
                  executionDurationMs,
                },
              },
            });

            if (prisma?.artifactCitation && Array.isArray(directResult.references)) {
              for (const ref of directResult.references) {
                try {
                  await prisma.artifactCitation.create({
                    data: {
                      artifactId: savedArtifact.id,
                      markerIndex: ref.citationNumber || 1,
                      sourceTitle: ref.sourceTitle || ref.sourceId || "Nguồn trích dẫn",
                      quote: ref.citedText || null,
                    },
                  });
                } catch (citeErr) {
                  console.warn(
                    "[ResearchSessionRouter] Error saving ArtifactCitation:",
                    citeErr
                  );
                }
              }
            }

            if (prisma?.researchTimelineEvent) {
              await prisma.researchTimelineEvent.create({
                data: {
                  sessionId,
                  topicId: session.topicId,
                  eventType: "direct_research_executed",
                  eventData: {
                    artifactId: savedArtifact.id,
                    providerId: directResult.providerId,
                    cleanupStatus: directResult.cleanupStatus,
                    citedSourceCount: directResult.citedSourceIds.length,
                    executionDurationMs,
                  },
                },
              });
            }
          } catch (dbErr) {
            console.warn(
              "[ResearchSessionRouter] Error saving GroundedArtifact to database:",
              dbErr
            );
          }
        }

        return res.status(200).json({
          sessionId,
          artifactId: savedArtifact?.id || `art-live-${Date.now()}`,
          artifactType: promptArtifactType,
          title: artifactTitle,
          content: directResult.answer,
          citedSourceIds: directResult.citedSourceIds,
          citations: directResult.citations || {},
          references: directResult.references || [],
          cleanupStatus: directResult.cleanupStatus,
          executionDurationMs,
        });
      } catch (error: unknown) {
        if (error instanceof ProviderException) {
          const sanitizedMessage = sanitizeProviderErrorMessage(error.message);
          if (error.errorCode === "INVALID_ARGUMENT") {
            return res.status(400).json({ error: sanitizedMessage });
          }
          if (
            error.errorCode === "PERMISSION_DENIED" ||
            error.errorCode === "AUTHENTICATION_FAILED"
          ) {
            return res.status(403).json({ error: sanitizedMessage });
          }
          if (
            error.errorCode === "CAPABILITY_UNSUPPORTED" ||
            error.errorCode === "PROVIDER_UNAVAILABLE" ||
            error.errorCode === "PROVIDER_TIMEOUT"
          ) {
            return res.status(503).json({ error: sanitizedMessage });
          }
          return res.status(500).json({ error: sanitizedMessage });
        }

        const rawMessage = error instanceof Error ? error.message : String(error);
        const sanitized = sanitizeProviderErrorMessage(rawMessage);
        return res.status(500).json({ error: sanitized });
      }
    }
  );

  return router;
}
