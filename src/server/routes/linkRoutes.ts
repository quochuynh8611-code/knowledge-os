import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { KnowledgeLinkCreateSchema } from "../../lib/validation";

export function createLinkRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  // POST /links — Create or idempotent upsert KnowledgeLink
  router.post("/links", async (req, res) => {
    const parsed = KnowledgeLinkCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const {
      sourceId,
      targetId,
      linkType = "related",
      strength = 3,
      notes = null,
      explanation = null,
      id,
    } = parsed.data;

    // 1. Guard: Self-link rejection
    if (sourceId === targetId) {
      return res.status(400).json({
        error: "Không được tạo liên kết tự trỏ chính nó (self-link)",
        code: "SELF_LINK_NOT_ALLOWED",
      });
    }

    try {
      // 2. Guard: Source & Target topic existence
      if (typeof prisma.topic?.findUnique === "function") {
        const [sourceTopic, targetTopic] = await Promise.all([
          prisma.topic.findUnique({ where: { id: sourceId } }),
          prisma.topic.findUnique({ where: { id: targetId } }),
        ]);

        if (!sourceTopic || !targetTopic) {
          return res.status(400).json({
            error: "Topic nguồn hoặc đích không tồn tại",
            code: "TOPIC_NOT_FOUND",
            details: {
              sourceExists: Boolean(sourceTopic),
              targetExists: Boolean(targetTopic),
            },
          });
        }
      }

      // 3. Duplicate guard: check existing link with same sourceId, targetId, linkType
      let existingLink: any = null;
      if (typeof prisma.knowledgeLink?.findFirst === "function") {
        existingLink = await prisma.knowledgeLink.findFirst({
          where: {
            sourceId,
            targetId,
            linkType,
          },
        });
      }

      if (existingLink) {
        // Idempotent update
        if (typeof prisma.knowledgeLink?.update === "function") {
          const updated = await prisma.knowledgeLink.update({
            where: { id: existingLink.id },
            data: {
              strength,
              notes: notes !== undefined ? notes : existingLink.notes,
              explanation: explanation !== undefined ? explanation : existingLink.explanation,
            },
          });
          return res.status(200).json(updated);
        }
        return res.status(200).json(existingLink);
      }

      // 4. Create new KnowledgeLink
      const created = await prisma.knowledgeLink.create({
        data: {
          id: id || undefined,
          sourceId,
          targetId,
          linkType,
          strength,
          notes,
          explanation,
        },
      });

      return res.status(201).json(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      return res.status(500).json({ error: msg });
    }
  });

  // DELETE /links/:id — Remove KnowledgeLink
  router.delete("/links/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: "Link ID không được để trống" });
      }

      try {
        await prisma.knowledgeLink.delete({
          where: { id },
        });
        return res.json({ success: true, id });
      } catch (deleteError: any) {
        // Prisma P2025: Record to delete does not exist (idempotent delete)
        if (deleteError?.code === "P2025") {
          return res.json({ success: true, id, alreadyDeleted: true });
        }
        throw deleteError;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      return res.status(500).json({ error: msg });
    }
  });

  // GET /links — List or filter KnowledgeLinks
  router.get("/links", async (req, res) => {
    try {
      const { topicId, sourceId, targetId } = req.query;

      const whereClause: any = {};
      if (topicId && typeof topicId === "string") {
        whereClause.OR = [{ sourceId: topicId }, { targetId: topicId }];
      } else {
        if (sourceId && typeof sourceId === "string") {
          whereClause.sourceId = sourceId;
        }
        if (targetId && typeof targetId === "string") {
          whereClause.targetId = targetId;
        }
      }

      const links = await prisma.knowledgeLink.findMany({
        where: whereClause,
        include: {
          source: { select: { id: true, title: true, slug: true } },
          target: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(links);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      return res.status(500).json({ error: msg });
    }
  });

  return router;
}
