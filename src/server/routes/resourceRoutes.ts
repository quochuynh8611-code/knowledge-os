import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { ResourceCreateSchema } from "../../lib/validation";

export function createResourceRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/resources", async (_req, res) => {
    try {
      const resources = await prisma.resource.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(resources);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/resources", async (req, res) => {
    const parsed = ResourceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const resource = await prisma.resource.create({
        data: {
          id: req.body.id || undefined,
          topicId: parsed.data.topicId,
          title: parsed.data.title,
          type: parsed.data.type,
          author: parsed.data.author,
          url: parsed.data.url,
          filePath: parsed.data.filePath,
          notes: parsed.data.notes,
        },
      });
      res.status(201).json(resource);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create resource";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/resources/:id", async (req, res) => {
    try {
      await prisma.resource.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: unknown }).code === "P2025"
      ) {
        return res.json({
          success: true,
          id: req.params.id,
          alreadyDeleted: true,
        });
      }
      const msg =
        err instanceof Error ? err.message : "Failed to delete resource";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
