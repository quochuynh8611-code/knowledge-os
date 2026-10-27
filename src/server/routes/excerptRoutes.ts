import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  ResearchExcerptCreateSchema,
  ResearchExcerptUpdateSchema,
} from "../../lib/validation";

export function createExcerptRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  // ==========================================
  // INBOX ITEMS ROUTES (Declared first to avoid :id collisions)
  // ==========================================

  // GET /excerpts/inbox — Get all research inbox items
  router.get("/excerpts/inbox", async (_req, res) => {
    try {
      const items = await prisma.researchInboxItem.findMany({
        include: {
          excerpt: true,
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      });
      res.json(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch inbox items";
      console.error("GET /excerpts/inbox error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // POST /excerpts/inbox — Create research inbox item
  router.post("/excerpts/inbox", async (req, res) => {
    try {
      const { excerptId, priority = 0 } = req.body;
      if (!excerptId || typeof excerptId !== "string") {
        return res.status(400).json({ error: "excerptId không được để trống" });
      }

      // Check if excerpt exists
      if (typeof prisma.researchExcerpt?.findUnique === "function") {
        const excerpt = await prisma.researchExcerpt.findUnique({
          where: { id: excerptId },
        });
        if (!excerpt) {
          return res.status(404).json({
            error: "Research excerpt không tồn tại",
            code: "EXCERPT_NOT_FOUND",
          });
        }
      }

      const inboxItem = await prisma.researchInboxItem.create({
        data: {
          excerptId,
          priority: typeof priority === "number" ? priority : 0,
          isProcessed: false,
        },
        include: {
          excerpt: true,
        },
      });

      res.status(201).json(inboxItem);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create inbox item";
      console.error("POST /excerpts/inbox error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // PATCH /excerpts/inbox/:id/process — Mark inbox item as processed
  router.patch("/excerpts/inbox/:id/process", async (req, res) => {
    try {
      const { id } = req.params;
      const isProcessed =
        req.body.isProcessed !== undefined ? Boolean(req.body.isProcessed) : true;

      const item = await prisma.researchInboxItem.update({
        where: { id },
        data: { isProcessed },
        include: { excerpt: true },
      });
      res.json(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process inbox item";
      console.error("PATCH /excerpts/inbox/:id/process error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // PATCH /excerpts/inbox/:id — Update inbox item (alias)
  router.patch("/excerpts/inbox/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data: any = {};
      if (req.body.isProcessed !== undefined) {
        data.isProcessed = Boolean(req.body.isProcessed);
      }
      if (typeof req.body.priority === "number") {
        data.priority = req.body.priority;
      }

      const item = await prisma.researchInboxItem.update({
        where: { id },
        data,
        include: { excerpt: true },
      });
      res.json(item);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update inbox item";
      console.error("PATCH /excerpts/inbox/:id error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // DELETE /excerpts/inbox/:id — Delete inbox item
  router.delete("/excerpts/inbox/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.researchInboxItem.delete({
        where: { id },
      });
      res.json({ success: true, id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete inbox item";
      console.error("DELETE /excerpts/inbox/:id error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // ==========================================
  // EXCERPTS CRUD
  // ==========================================

  // GET /excerpts — List excerpts with optional filters (topicId, sourceNoteId/targetNoteId, tag)
  router.get("/excerpts", async (req, res) => {
    try {
      const where: any = {};
      if (req.query.topicId && typeof req.query.topicId === "string") {
        where.topicId = req.query.topicId;
      }
      if (req.query.sourceNoteId && typeof req.query.sourceNoteId === "string") {
        where.targetNoteId = req.query.sourceNoteId;
      } else if (req.query.targetNoteId && typeof req.query.targetNoteId === "string") {
        where.targetNoteId = req.query.targetNoteId;
      }
      if (req.query.status && typeof req.query.status === "string") {
        where.status = req.query.status;
      }
      if (
        req.query.archivedDocumentId &&
        typeof req.query.archivedDocumentId === "string"
      ) {
        where.archivedDocumentId = req.query.archivedDocumentId;
      }
      if (req.query.tag && typeof req.query.tag === "string") {
        where.userNote = { contains: req.query.tag, mode: "insensitive" };
      }

      const excerpts = await prisma.researchExcerpt.findMany({
        where,
        include: {
          inboxItem: true,
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(excerpts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch excerpts";
      console.error("GET /excerpts error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // POST /excerpts — Create excerpt with Zod validation
  router.post("/excerpts", async (req, res) => {
    const parsed = ResearchExcerptCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    try {
      const {
        archivedDocumentId,
        topicId,
        targetNoteId,
        selectedText,
        contextPrefix,
        contextSuffix,
        positionSelector,
        highlightColor,
        citationSnapshot,
        userNote,
        status,
      } = parsed.data;

      const excerpt = await prisma.researchExcerpt.create({
        data: {
          archivedDocumentId,
          topicId: topicId || null,
          targetNoteId: targetNoteId || null,
          selectedText,
          contextPrefix: contextPrefix || null,
          contextSuffix: contextSuffix || null,
          positionSelector: positionSelector as any,
          highlightColor: highlightColor || "#F59E0B",
          citationSnapshot: (citationSnapshot as any) || null,
          userNote: userNote || null,
          status: status || "active",
        },
        include: {
          inboxItem: true,
        },
      });

      res.status(201).json(excerpt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create excerpt";
      console.error("POST /excerpts error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // PUT /excerpts/:id — Update excerpt (content, note, tags, status, etc.)
  router.put("/excerpts/:id", async (req, res) => {
    const parsed = ResearchExcerptUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    try {
      const { id } = req.params;
      const {
        highlightColor,
        userNote,
        status,
        targetNoteId,
        selectedText,
        topicId,
      } = parsed.data;

      const data: any = {};
      if (highlightColor !== undefined) data.highlightColor = highlightColor;
      if (userNote !== undefined) data.userNote = userNote;
      if (status !== undefined) data.status = status;
      if (targetNoteId !== undefined) data.targetNoteId = targetNoteId;
      if (selectedText !== undefined) data.selectedText = selectedText;
      if (topicId !== undefined) data.topicId = topicId;

      const updated = await prisma.researchExcerpt.update({
        where: { id },
        data,
        include: {
          inboxItem: true,
        },
      });

      res.json(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update excerpt";
      console.error("PUT /excerpts/:id error:", err);
      res.status(500).json({ error: msg });
    }
  });

  // DELETE /excerpts/:id — Delete excerpt
  router.delete("/excerpts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await prisma.researchExcerpt.delete({
        where: { id },
      });
      res.json({ success: true, id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete excerpt";
      console.error("DELETE /excerpts/:id error:", err);
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
