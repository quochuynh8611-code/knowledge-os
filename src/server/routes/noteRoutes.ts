import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  NoteCreateSchema,
  NoteUpdateSchema,
} from "../../lib/validation";

export function createNoteRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/notes", async (_req, res) => {
    try {
      const notes = await prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
      });
      res.json(notes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/notes", async (req, res) => {
    const parsed = NoteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const note = await prisma.note.create({
        data: {
          id: req.body.id || undefined,
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          content: parsed.data.content,
          type: parsed.data.type,
          isPrivate: parsed.data.isPrivate,
          tags: parsed.data.tags,
        },
      });
      res.status(201).json(note);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create note";
      res.status(500).json({ error: msg });
    }
  });

  router.put("/notes/:id", async (req, res) => {
    const parsed = NoteUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const note = await prisma.note.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(note);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update note";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/notes/:id", async (req, res) => {
    try {
      await prisma.note.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete note";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
