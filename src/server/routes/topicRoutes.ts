import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  TopicCreateSchema,
  TopicUpdateSchema,
} from "../../lib/validation";

export function createTopicRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/topics", async (_req, res) => {
    try {
      const topics = await prisma.topic.findMany({
        include: {
          category: true,
          notes: true,
          resources: true,
          studyProgress: true,
          sourceLinks: true,
          targetLinks: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      res.json(topics);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/topics", async (req, res) => {
    const parsed = TopicCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      let resolvedType = parsed.data.type;
      if (!resolvedType || resolvedType === "general") {
        const cat = await prisma.category.findUnique({
          where: { id: parsed.data.categoryId },
        });
        if (cat) {
          resolvedType = (cat.type || cat.slug) as any;
        }
      }

      const topic = await prisma.topic.create({
        data: {
          id: req.body.id || undefined,
          title: parsed.data.title,
          slug:
            parsed.data.slug ||
            parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          categoryId: parsed.data.categoryId,
          type: resolvedType || "general",
          parentId: parsed.data.parentId,
          description: parsed.data.description,
          content: parsed.data.content,
          tags: parsed.data.tags,
        },
      });
      res.status(201).json(topic);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create topic";
      res.status(500).json({ error: msg });
    }
  });

  router.put("/topics/:id", async (req, res) => {
    const parsed = TopicUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const topic = await prisma.topic.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(topic);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update topic";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/topics/:id", async (req, res) => {
    try {
      await prisma.topic.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete topic";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
