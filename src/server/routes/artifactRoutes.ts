import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ArtifactIngestionService } from "../services/artifactIngestionService";
import {
  IngestArtifactSchema,
  ReviewArtifactSchema,
  ImportArtifactNoteSchema,
  ImportArtifactFlashcardsSchema,
} from "../../lib/researchHubValidation";

export function createArtifactRouter(prisma: PrismaClient) {
  const router = Router();
  const ingestionService = new ArtifactIngestionService(prisma);

  // POST /api/artifacts/ingest
  router.post("/artifacts/ingest", async (req: Request, res: Response) => {
    try {
      const parsed = IngestArtifactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu artifact không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const { artifact, isDuplicate } = await ingestionService.ingestArtifact({
        sessionId: req.body.sessionId,
        sourcePackageId: parsed.data.sourcePackageId,
        taskPromptId: parsed.data.taskPromptId,
        topicId: parsed.data.topicId,
        artifactType: parsed.data.artifactType,
        title: parsed.data.title,
        rawContent: parsed.data.rawContent,
        citations: parsed.data.citations,
        metadata: parsed.data.metadata,
      });

      return res.status(isDuplicate ? 200 : 201).json({
        artifact,
        isDuplicate,
      });
    } catch (error) {
      console.error("[ArtifactRouter] Error in POST /artifacts/ingest:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/artifacts/:id
  router.get("/artifacts/:id", async (req: Request, res: Response) => {
    try {
      const artifact = await ingestionService.getArtifactById(req.params.id);
      if (!artifact) {
        return res.status(404).json({ error: "Artifact không tồn tại" });
      }
      return res.json(artifact);
    } catch (error) {
      console.error("[ArtifactRouter] Error in GET /artifacts/:id:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // PATCH /api/artifacts/:id/review
  router.patch("/artifacts/:id/review", async (req: Request, res: Response) => {
    try {
      const parsed = ReviewArtifactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu review không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const updated = await ingestionService.reviewArtifact(req.params.id, parsed.data.status);
      return res.json(updated);
    } catch (error) {
      console.error("[ArtifactRouter] Error in PATCH /artifacts/:id/review:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/artifacts/:id/import-note
  router.post("/artifacts/:id/import-note", async (req: Request, res: Response) => {
    try {
      const parsed = ImportArtifactNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu import note không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const result = await ingestionService.importToNote(req.params.id, {
        title: parsed.data.title,
        type: parsed.data.type,
        tags: parsed.data.tags,
        targetTopicId: parsed.data.targetTopicId,
      });

      return res.status(201).json(result);
    } catch (error) {
      console.error("[ArtifactRouter] Error in POST /artifacts/:id/import-note:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/artifacts/:id/import-flashcards
  router.post("/artifacts/:id/import-flashcards", async (req: Request, res: Response) => {
    try {
      const parsed = ImportArtifactFlashcardsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Dữ liệu import flashcards không hợp lệ",
          details: parsed.error.issues,
        });
      }

      const result = await ingestionService.importToFlashcards(
        req.params.id,
        parsed.data.flashcards,
        parsed.data.targetTopicId
      );

      return res.status(201).json(result);
    } catch (error) {
      console.error("[ArtifactRouter] Error in POST /artifacts/:id/import-flashcards:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
