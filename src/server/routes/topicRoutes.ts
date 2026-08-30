import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import {
  TopicCreateSchema,
  TopicUpdateSchema,
} from "../../lib/validation";
import {
  normalizeTopicTags,
  generateTagSlug,
} from "../../lib/researchStorageHelpers";

async function syncTopicTags(
  tx: any,
  topicId: string,
  normalizedTags: string[],
): Promise<void> {
  if (!tx.tag || !tx.topicTag) return;

  const tagRecords: { id: string; slug: string }[] = [];
  for (const tagName of normalizedTags) {
    const slug = generateTagSlug(tagName);
    const tag = await tx.tag.upsert({
      where: { slug },
      create: {
        id: `tag-${slug}`,
        name: tagName,
        slug,
        color: "#D97706",
        count: 0,
      },
      update: {
        name: tagName,
      },
    });
    tagRecords.push(tag);
  }

  const currentTagIds = new Set(tagRecords.map((t) => t.id));

  // Find existing relations for this topic
  const existingLinks = (await tx.topicTag.findMany({
    where: { topicId },
  })) || [];

  // Prune obsolete links
  const linksToDelete = existingLinks.filter(
    (link: any) => !currentTagIds.has(link.tagId),
  );
  if (linksToDelete.length > 0) {
    await tx.topicTag.deleteMany({
      where: {
        topicId,
        tagId: { in: linksToDelete.map((l: any) => l.tagId) },
      },
    });
  }

  // Create new relations
  const existingTagIds = new Set(existingLinks.map((l: any) => l.tagId));
  for (const tag of tagRecords) {
    if (!existingTagIds.has(tag.id)) {
      await tx.topicTag.upsert({
        where: {
          topicId_tagId: {
            topicId,
            tagId: tag.id,
          },
        },
        create: {
          topicId,
          tagId: tag.id,
        },
        update: {},
      });
    }
  }
}

export function createTopicRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  const executeInTx = async <T>(fn: (tx: any) => Promise<T>): Promise<T> => {
    if (typeof prisma.$transaction === "function") {
      return prisma.$transaction(fn);
    }
    return fn(prisma);
  };

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
      const normalizedTags = normalizeTopicTags(parsed.data.tags || []);

      let resolvedType = parsed.data.type;
      let targetCategoryId = parsed.data.categoryId;

      // Validate & resolve category by id or slug if category model is available
      if (typeof prisma.category?.findUnique === "function") {
        let cat = await prisma.category.findUnique({
          where: { id: targetCategoryId },
        });
        if (!cat) {
          cat = await prisma.category.findUnique({
            where: { slug: targetCategoryId },
          });
        }
        if (cat) {
          targetCategoryId = cat.id;
          if (!resolvedType || resolvedType === "general") {
            resolvedType = (cat.type || cat.slug) as any;
          }
        } else {
          return res.status(400).json({
            error: `Danh mục với ID hoặc Slug '${targetCategoryId}' không tồn tại`,
            code: "CATEGORY_NOT_FOUND",
          });
        }
      }

      const targetSlug =
        parsed.data.slug ||
        parsed.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const targetId = req.body.id || undefined;

      const result = await executeInTx(async (tx: any) => {
        let existingById: any = null;
        if (targetId && typeof tx.topic?.findUnique === "function") {
          existingById = await tx.topic.findUnique({
            where: { id: targetId },
          });
        }

        let existingBySlug: any = null;
        if (typeof tx.topic?.findUnique === "function") {
          existingBySlug = await tx.topic.findUnique({
            where: { slug: targetSlug },
          });
        }

        // Slug collision guard: Slug already claimed by a different topic ID
        if (
          existingBySlug &&
          ((targetId && existingBySlug.id !== targetId) ||
            (!targetId && existingById && existingBySlug.id !== existingById.id) ||
            (!targetId && !existingById))
        ) {
          const error: any = new Error(
            `Slug '${targetSlug}' đã được sử dụng bởi chủ đề khác (ID: '${existingBySlug.id}')`
          );
          error.statusCode = 409;
          error.code = "SLUG_COLLISION";
          throw error;
        }

        // Idempotent Update: Topic with this ID already exists
        const existingTopic =
          existingById ||
          (existingBySlug && existingBySlug.id === targetId ? existingBySlug : null);

        if (existingTopic) {
          const updated = await tx.topic.update({
            where: { id: existingTopic.id },
            data: {
              title: parsed.data.title,
              slug: targetSlug,
              categoryId: targetCategoryId,
              type: resolvedType || "general",
              parentId: parsed.data.parentId,
              description: parsed.data.description,
              content: parsed.data.content,
              tags: normalizedTags,
            },
          });

          if (normalizedTags.length > 0) {
            await syncTopicTags(tx, updated.id, normalizedTags);
          }

          return { topic: updated, isCreated: false };
        }

        // Create new topic
        const created = await tx.topic.create({
          data: {
            id: targetId,
            title: parsed.data.title,
            slug: targetSlug,
            categoryId: targetCategoryId,
            type: resolvedType || "general",
            parentId: parsed.data.parentId,
            description: parsed.data.description,
            content: parsed.data.content,
            tags: normalizedTags,
          },
        });

        if (normalizedTags.length > 0) {
          await syncTopicTags(tx, created.id, normalizedTags);
        }

        return { topic: created, isCreated: true };
      });

      res.status(result.isCreated ? 201 : 200).json(result.topic);
    } catch (err: any) {
      if (
        err?.statusCode === 409 ||
        err?.code === "SLUG_COLLISION" ||
        err?.code === "P2002"
      ) {
        return res.status(409).json({
          error: err.message || "Slug conflict",
          code: "SLUG_COLLISION",
        });
      }
      if (
        err?.statusCode === 400 ||
        err?.code === "CATEGORY_NOT_FOUND" ||
        err?.code === "P2003"
      ) {
        return res.status(400).json({
          error: err.message || "Foreign key constraint failed",
          code: err.code || "FOREIGN_KEY_VIOLATION",
        });
      }
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
      const updateData = { ...parsed.data };
      if (updateData.categoryId && typeof prisma.category?.findUnique === "function") {
        let cat = await prisma.category.findUnique({
          where: { id: updateData.categoryId },
        });
        if (!cat) {
          cat = await prisma.category.findUnique({
            where: { slug: updateData.categoryId },
          });
        }
        if (cat) {
          updateData.categoryId = cat.id;
        } else {
          return res.status(400).json({
            error: `Danh mục với ID hoặc Slug '${updateData.categoryId}' không tồn tại`,
            code: "CATEGORY_NOT_FOUND",
          });
        }
      }
      let normalizedTags: string[] | undefined;
      if (updateData.tags) {
        normalizedTags = normalizeTopicTags(updateData.tags);
        updateData.tags = normalizedTags;
      }

      const topic = await executeInTx(async (tx: any) => {
        const updated = await tx.topic.update({
          where: { id: req.params.id },
          data: updateData,
        });

        if (normalizedTags !== undefined) {
          await syncTopicTags(tx, req.params.id, normalizedTags);
        }

        return updated;
      });

      res.json(topic);
    } catch (err: any) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Topic not found" });
      }
      if (err?.code === "P2002") {
        return res.status(409).json({ error: "Slug conflict", code: "SLUG_COLLISION" });
      }
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
    } catch (err: any) {
      if (err?.code === "P2025") {
        return res.status(404).json({ error: "Topic not found" });
      }
      const msg = err instanceof Error ? err.message : "Failed to delete topic";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}

