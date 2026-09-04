import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  NoteCreateSchema,
  NoteUpdateSchema,
} from "../../lib/validation";
import { resolveTopicIds } from "../../lib/researchStorageHelpers";

async function executeInTx<T>(
  prisma: any,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  if (typeof prisma.$transaction === "function") {
    return prisma.$transaction(callback);
  }
  return callback(prisma);
}

async function syncNoteTopicLinks(
  tx: any,
  noteId: string,
  targetTopicIds: string[]
) {
  if (!tx.noteTopicLink) return;

  const existingLinks: Array<{ topicId: string }> =
    await tx.noteTopicLink.findMany({
      where: { noteId },
      select: { topicId: true },
    });

  const existingTopicIds = new Set(existingLinks.map((l) => l.topicId));
  const newTopicIds = new Set(targetTopicIds);

  const toRemove = [...existingTopicIds].filter((tid) => !newTopicIds.has(tid));
  if (toRemove.length > 0) {
    await tx.noteTopicLink.deleteMany({
      where: {
        noteId,
        topicId: { in: toRemove },
      },
    });
  }

  for (const topicId of targetTopicIds) {
    await tx.noteTopicLink.upsert({
      where: {
        noteId_topicId: { noteId, topicId },
      },
      create: {
        noteId,
        topicId,
      },
      update: {},
    });
  }
}

export function createNoteRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/notes", async (_req, res) => {
    try {
      const notes = await prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
        include: { additionalTopics: true },
      });
      const mapped = notes.map((n: any) => {
        const rawIds = [
          n.topicId,
          ...(n.additionalTopics ? n.additionalTopics.map((l: any) => l.topicId) : []),
        ].filter(Boolean);
        const topicIds = rawIds.length > 0 ? [...new Set(rawIds)] : undefined;
        return {
          ...n,
          ...(topicIds ? { topicIds } : {}),
        };
      });
      res.json(mapped);
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
      const resolvedTopicIds = resolveTopicIds({
        ...parsed.data,
        topicId: parsed.data.topicId || (parsed.data.topicIds ? parsed.data.topicIds[0] : ""),
      } as any);
      const primaryTopicId = resolvedTopicIds[0];

      const note = await executeInTx(prisma, async (tx) => {
        const clientProvidedId = req.body.id ? String(req.body.id).trim() : undefined;

        let targetNote: any = null;

        // Check if note with provided ID already exists (idempotency guard)
        if (clientProvidedId && typeof tx.note?.findUnique === "function") {
          targetNote = await tx.note.findUnique({
            where: { id: clientProvidedId },
          });
        }

        if (targetNote) {
          // Idempotent update of existing note record
          const updatedNote = await tx.note.update({
            where: { id: clientProvidedId },
            data: {
              topicId: primaryTopicId,
              title: parsed.data.title,
              content: parsed.data.content,
              sourcePath: parsed.data.sourcePath,
              type: parsed.data.type,
              isPrivate: parsed.data.isPrivate,
              tags: parsed.data.tags,
            },
          });

          await syncNoteTopicLinks(tx, updatedNote.id, resolvedTopicIds);

          return {
            note: {
              ...updatedNote,
              topicIds: resolvedTopicIds,
            },
            isNew: false,
          };
        }

        try {
          const createdNote = await tx.note.create({
            data: {
              id: clientProvidedId || undefined,
              topicId: primaryTopicId,
              title: parsed.data.title,
              content: parsed.data.content,
              sourcePath: parsed.data.sourcePath,
              type: parsed.data.type,
              isPrivate: parsed.data.isPrivate,
              tags: parsed.data.tags,
            },
          });

          await syncNoteTopicLinks(tx, createdNote.id, resolvedTopicIds);

          return {
            note: {
              ...createdNote,
              topicIds: resolvedTopicIds,
            },
            isNew: true,
          };
        } catch (createErr: any) {
          // If race condition triggers P2002 on primary key id, fallback to idempotent update
          if (createErr?.code === "P2002" && clientProvidedId) {
            const fallbackUpdated = await tx.note.update({
              where: { id: clientProvidedId },
              data: {
                topicId: primaryTopicId,
                title: parsed.data.title,
                content: parsed.data.content,
                sourcePath: parsed.data.sourcePath,
                type: parsed.data.type,
                isPrivate: parsed.data.isPrivate,
                tags: parsed.data.tags,
              },
            });

            await syncNoteTopicLinks(tx, fallbackUpdated.id, resolvedTopicIds);

            return {
              note: {
                ...fallbackUpdated,
                topicIds: resolvedTopicIds,
              },
              isNew: false,
            };
          }
          throw createErr;
        }
      });

      res.status(note.isNew ? 201 : 200).json(note.note);
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ error: "Unique constraint conflict", code: "P2002" });
      }
      if (err?.code === "P2003") {
        return res.status(400).json({ error: "Foreign key constraint failed", code: "P2003" });
      }
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Note not found", code: "P2025" });
      }
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
      const updatedNote = await executeInTx(prisma, async (tx) => {
        let resolvedTopicIds: string[] | undefined;
        let primaryTopicId: string | undefined;

        if (parsed.data.topicIds !== undefined || parsed.data.topicId !== undefined) {
          resolvedTopicIds = resolveTopicIds({
            ...parsed.data,
            topicId: parsed.data.topicId || (parsed.data.topicIds ? parsed.data.topicIds[0] : ""),
          } as any);
          primaryTopicId = resolvedTopicIds[0];
        }

        const updateData: any = {
          ...parsed.data,
        };
        delete updateData.topicIds;
        if (primaryTopicId) {
          updateData.topicId = primaryTopicId;
        }

        const note = await tx.note.update({
          where: { id: req.params.id },
          data: updateData,
        });

        if (resolvedTopicIds) {
          await syncNoteTopicLinks(tx, note.id, resolvedTopicIds);
        }

        return {
          ...note,
          ...(resolvedTopicIds ? { topicIds: resolvedTopicIds } : {}),
        };
      });

      res.json(updatedNote);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update note";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/notes/:id", async (req, res) => {
    try {
      await executeInTx(prisma, async (tx) => {
        if (tx.noteTopicLink) {
          await tx.noteTopicLink.deleteMany({
            where: { noteId: req.params.id },
          });
        }
        await tx.note.delete({
          where: { id: req.params.id },
        });
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete note";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
