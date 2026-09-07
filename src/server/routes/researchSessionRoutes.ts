import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ResearchSessionService } from "../services/researchSessionService";
import {
  CreateResearchSessionSchema,
  UpdateResearchSessionSchema,
  PackageSourceSchema,
  GeneratePromptSchema,
} from "../../lib/researchHubValidation";

export function createResearchSessionRouter(prisma: PrismaClient) {
  const router = Router();
  const sessionService = new ResearchSessionService(prisma);

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

  return router;
}
