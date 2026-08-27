import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  CategoryCreateSchema,
  CategoryUpdateSchema,
} from "../../lib/validation";

export function createCategoryRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.get("/categories", async (_req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { order: "asc" },
      });
      res.json(categories);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Database error";
      res.status(500).json({ error: msg });
    }
  });

  router.post("/categories", async (req, res) => {
    const parsed = CategoryCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const slug =
        parsed.data.slug ||
        parsed.data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      const type = parsed.data.type || slug;

      const category = await prisma.category.create({
        data: {
          id: req.body.id || undefined,
          name: parsed.data.name,
          slug,
          type,
          description: parsed.data.description,
          parentId: parsed.data.parentId,
          icon: parsed.data.icon,
          color: parsed.data.color,
          order: parsed.data.order ?? 0,
        },
      });
      res.status(201).json(category);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create category";
      res.status(500).json({ error: msg });
    }
  });

  router.put("/categories/:id", async (req, res) => {
    const parsed = CategoryUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    try {
      const category = await prisma.category.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      res.json(category);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update category";
      res.status(500).json({ error: msg });
    }
  });

  router.delete("/categories/:id", async (req, res) => {
    try {
      await prisma.category.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, id: req.params.id });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete category";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
