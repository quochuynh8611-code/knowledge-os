import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { HydratePayloadSchema } from "../../lib/validation";
import {
  normalizeTopicTags,
  generateTagSlug,
  resolveTopicIds,
} from "../../lib/researchStorageHelpers";

export function createSyncRouter(prisma: PrismaClient | any): Router {
  const router = Router();

  router.post("/sync/hydrate", async (req, res) => {
    const parsed = HydratePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const payload = parsed.data;
    try {
      // 1. Kiểm tra session đã hoàn thành trước đó (Idempotency check)
      const existing = await prisma.syncSession.findUnique({
        where: { clientSyncId: payload.clientSyncId },
      });
      if (existing && existing.status === "completed") {
        return res.json({
          success: true,
          clientSyncId: existing.clientSyncId,
          serverTimestamp: existing.processedAt.toISOString(),
          summary: existing.summary,
        });
      }

      // 2. Transactional upsert toàn bộ dữ liệu trong 1 giao dịch ACID
      const summary = await prisma.$transaction(async (tx: any) => {
        let categoriesCount = 0;
        let topicsCount = 0;
        let notesCount = 0;
        let resourcesCount = 0;
        let tagsCount = 0;
        let linksCount = 0;
        let progressCount = 0;

        // Category ID resolution map (resolves by id or slug to real database category id)
        const categoryIdMap = new Map<string, string>();
        if (typeof tx.category?.findMany === "function") {
          const existingDbCategories = (await tx.category.findMany()) || [];
          for (const c of existingDbCategories) {
            if (c.id) categoryIdMap.set(c.id, c.id);
            if (c.slug) categoryIdMap.set(c.slug, c.id);
          }
        }

        // Categories
        for (const cat of payload.categories) {
          const savedCat = await tx.category.upsert({
            where: { slug: cat.slug },
            create: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              type: cat.type,
              description: cat.description,
              parentId: cat.parentId,
              icon: cat.icon,
              color: cat.color,
              order: cat.order ?? 0,
            },
            update: {
              name: cat.name,
              type: cat.type,
              description: cat.description,
              icon: cat.icon,
              color: cat.color,
              order: cat.order ?? 0,
            },
          });
          categoriesCount++;
          if (savedCat?.id) {
            categoryIdMap.set(savedCat.id, savedCat.id);
            if (savedCat.slug) categoryIdMap.set(savedCat.slug, savedCat.id);
          }
          if (cat.id && savedCat?.id) categoryIdMap.set(cat.id, savedCat.id);
          if (cat.slug && savedCat?.id) categoryIdMap.set(cat.slug, savedCat.id);
        }

        // Tags
        for (const tag of payload.tags) {
          await tx.tag.upsert({
            where: { slug: tag.slug },
            create: {
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              color: tag.color ?? "#D97706",
              count: tag.count ?? 0,
            },
            update: {
              name: tag.name,
              color: tag.color ?? "#D97706",
              count: tag.count ?? 0,
            },
          });
          tagsCount++;
        }

        // Topics
        for (const topic of payload.topics) {
          const normTags = normalizeTopicTags(topic.tags || []);
          const resolvedCategoryId =
            categoryIdMap.get(topic.categoryId) || topic.categoryId;

          // Fail fast with explicit descriptive error if category does not exist
          if (categoryIdMap.size > 0 && !categoryIdMap.has(topic.categoryId)) {
            throw new Error(
              `Foreign key guard: Danh mục với ID/Slug '${topic.categoryId}' không tồn tại cho chủ đề '${topic.title}' (slug: ${topic.slug}).`
            );
          }

          await tx.topic.upsert({
            where: { slug: topic.slug },
            create: {
              id: topic.id,
              title: topic.title,
              slug: topic.slug,
              categoryId: resolvedCategoryId,
              type: topic.type,
              parentId: topic.parentId,
              description: topic.description,
              content: topic.content,
              tags: normTags,
            },
            update: {
              title: topic.title,
              categoryId: resolvedCategoryId,
              type: topic.type,
              description: topic.description,
              content: topic.content,
              tags: normTags,
            },
          });
          topicsCount++;

          // Dual-write TopicTag relations
          if (tx.topicTag && normTags.length > 0) {
            for (const tagName of normTags) {
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
              await tx.topicTag.upsert({
                where: {
                  topicId_tagId: {
                    topicId: topic.id,
                    tagId: tag.id,
                  },
                },
                create: {
                  topicId: topic.id,
                  tagId: tag.id,
                },
                update: {},
              });
            }
          }

          // Study Progress
          if (topic.studyProgress) {
            await tx.studyProgress.upsert({
              where: { topicId: topic.id },
              create: {
                topicId: topic.id,
                status: topic.studyProgress.status,
                progress: topic.studyProgress.progress,
                interval: topic.studyProgress.interval,
                easeFactor: topic.studyProgress.easeFactor,
                repetitions: topic.studyProgress.repetitions,
                totalNotes: topic.studyProgress.totalNotes,
                timeSpent: topic.studyProgress.timeSpent,
                nextReview: topic.studyProgress.nextReview
                  ? new Date(topic.studyProgress.nextReview)
                  : null,
                lastStudied: topic.studyProgress.lastStudied
                  ? new Date(topic.studyProgress.lastStudied)
                  : null,
              },
              update: {
                status: topic.studyProgress.status,
                progress: topic.studyProgress.progress,
                interval: topic.studyProgress.interval,
                easeFactor: topic.studyProgress.easeFactor,
                repetitions: topic.studyProgress.repetitions,
                totalNotes: topic.studyProgress.totalNotes,
                timeSpent: topic.studyProgress.timeSpent,
              },
            });
            progressCount++;
          }
        }

        // Notes
        for (const note of payload.notes) {
          const resolvedTopicIds = resolveTopicIds(note as any);
          const primaryTopicId = resolvedTopicIds[0] || note.topicId;

          await tx.note.upsert({
            where: { id: note.id },
            create: {
              id: note.id,
              topicId: primaryTopicId,
              title: note.title,
              content: note.content,
              sourcePath: (note as any).sourcePath,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
            update: {
              topicId: primaryTopicId,
              title: note.title,
              content: note.content,
              sourcePath: (note as any).sourcePath,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
          });
          notesCount++;

          // Dual-write NoteTopicLink relations
          if (tx.noteTopicLink && resolvedTopicIds.length > 0) {
            for (const tid of resolvedTopicIds) {
              await tx.noteTopicLink.upsert({
                where: {
                  noteId_topicId: {
                    noteId: note.id,
                    topicId: tid,
                  },
                },
                create: {
                  noteId: note.id,
                  topicId: tid,
                },
                update: {},
              });
            }
          }
        }

        // Resources
        for (const resItem of payload.resources) {
          await tx.resource.upsert({
            where: { id: resItem.id },
            create: {
              id: resItem.id,
              topicId: resItem.topicId,
              title: resItem.title,
              type: resItem.type,
              author: resItem.author,
              url: resItem.url,
              filePath: resItem.filePath,
              notes: resItem.notes,
            },
            update: {
              title: resItem.title,
              type: resItem.type,
              author: resItem.author,
              url: resItem.url,
              filePath: resItem.filePath,
              notes: resItem.notes,
            },
          });
          resourcesCount++;
        }

        // Persistent SyncSession record
        await tx.syncSession.create({
          data: {
            clientSyncId: payload.clientSyncId,
            clientTimestamp: new Date(payload.clientTimestamp),
            status: "completed",
            summary: {
              categoriesUpserted: categoriesCount,
              topicsUpserted: topicsCount,
              notesUpserted: notesCount,
              resourcesUpserted: resourcesCount,
              tagsUpserted: tagsCount,
              linksUpserted: linksCount,
              progressMerged: progressCount,
            },
          },
        });

        return {
          categoriesUpserted: categoriesCount,
          topicsUpserted: topicsCount,
          notesUpserted: notesCount,
          resourcesUpserted: resourcesCount,
          tagsUpserted: tagsCount,
          linksUpserted: linksCount,
          progressMerged: progressCount,
        };
      });

      res.json({
        success: true,
        clientSyncId: payload.clientSyncId,
        serverTimestamp: new Date().toISOString(),
        summary,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Hydration transaction failed";
      res.status(500).json({ error: msg });
    }
  });

  return router;
}
