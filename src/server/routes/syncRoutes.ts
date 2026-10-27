import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { HydratePayloadSchema } from "../../lib/validation";
import {
  normalizeTopicTags,
  generateTagSlug,
  resolveTopicIds,
} from "../../lib/researchStorageHelpers";
import { syncTopicTags } from "../services/tagSyncService";
import { syncNoteTopicLinks } from "../services/noteCascadeService";

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

        // Topic ID resolution map (resolves by id or slug to real database topic id)
        const topicIdMap = new Map<string, string>();
        if (typeof tx.topic?.findMany === "function") {
          const existingDbTopics = (await tx.topic.findMany()) || [];
          for (const t of existingDbTopics) {
            if (t.id) topicIdMap.set(t.id, t.id);
            if (t.slug) topicIdMap.set(t.slug, t.id);
          }
        }

        // Categories: routine sync ONLY updates existing categories; forceOverwrite allows explicit creation (restore/import)
        for (const cat of payload.categories) {
          const existingId = (cat.id && categoryIdMap.get(cat.id)) || (cat.slug && categoryIdMap.get(cat.slug));
          if (payload.forceOverwrite) {
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
          } else if (existingId) {
            const savedCat = await tx.category.update({
              where: { id: existingId },
              data: {
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
          }
          // Unknown categories in routine sync are ignored (never recreated from client cache)
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

        // Topics: routine sync ONLY updates existing topics; forceOverwrite allows explicit creation (restore/import)
        for (const topic of payload.topics) {
          const normTags = normalizeTopicTags(topic.tags || []);
          const resolvedCategoryId =
            categoryIdMap.get(topic.categoryId) || topic.categoryId;

          const existingTopicId =
            (topic.id && topicIdMap.get(topic.id)) ||
            (topic.slug && topicIdMap.get(topic.slug));

          if (!payload.forceOverwrite && !existingTopicId) {
            // Unknown topics in routine sync are ignored (never recreated from client cache)
            continue;
          }

          // Fail fast with explicit descriptive error if category does not exist
          if (categoryIdMap.size > 0 && !categoryIdMap.has(topic.categoryId)) {
            throw new Error(
              `Foreign key guard: Danh mục với ID/Slug '${topic.categoryId}' không tồn tại cho chủ đề '${topic.title}' (slug: ${topic.slug}).`
            );
          }

          let savedTopicId = topic.id;
          if (payload.forceOverwrite) {
            const saved = await tx.topic.upsert({
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
            savedTopicId = saved?.id || topic.id;
          } else if (existingTopicId) {
            const saved = await tx.topic.update({
              where: { id: existingTopicId },
              data: {
                title: topic.title,
                categoryId: resolvedCategoryId,
                type: topic.type,
                description: topic.description,
                content: topic.content,
                tags: normTags,
              },
            });
            savedTopicId = saved?.id || existingTopicId;
          }
          // Luôn cập nhật topicIdMap sau khi upsert/update để note section có thể
          // resolve FK ngay trong cùng transaction (kể cả topic vừa được tạo mới)
          if (savedTopicId) {
            topicIdMap.set(savedTopicId, savedTopicId);
            if (topic.id) topicIdMap.set(topic.id, savedTopicId);
            if (topic.slug) topicIdMap.set(topic.slug, savedTopicId);
          }
          topicsCount++;

          // Canonical TopicTag synchronization & pruning (ADR-079 / PR-2)
          if (savedTopicId) {
            await syncTopicTags(tx, savedTopicId, topic.tags || []);
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

          // FK guard: validate primaryTopicId tồn tại trong topicIdMap trước khi upsert
          // topicIdMap được cập nhật sau mỗi topic upsert/update ở trên nên luôn fresh
          const resolvedPrimaryTopicId = primaryTopicId
            ? topicIdMap.get(primaryTopicId)
            : undefined;

          if (!resolvedPrimaryTopicId) {
            if (payload.forceOverwrite) {
              // forceOverwrite: lỗi cứng vì đây là restore/import toàn phần
              throw new Error(
                `Foreign key guard: Topic với ID '${primaryTopicId}' không tồn tại cho note '${note.title}' (id: ${note.id}). Đảm bảo topic được include trong payload trước note.`
              );
            } else {
              // Routine sync: bỏ qua note mồ côi (topic chưa tồn tại trên server)
              // Sẽ được sync lại trong lần tiếp theo khi topic đã được tạo
              continue;
            }
          }

          await tx.note.upsert({
            where: { id: note.id },
            create: {
              id: note.id,
              topicId: resolvedPrimaryTopicId,
              title: note.title,
              content: note.content,
              sourcePath: (note as any).sourcePath,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
            update: {
              topicId: resolvedPrimaryTopicId,
              title: note.title,
              content: note.content,
              sourcePath: (note as any).sourcePath,
              type: note.type,
              isPrivate: note.isPrivate ?? false,
              tags: note.tags,
            },
          });
          notesCount++;

          // Canonical NoteTopicLink synchronization & pruning (ADR-079 / PR-3)
          if (tx.noteTopicLink) {
            const validResolvedTopicIds = resolvedTopicIds
              .map((tid) => topicIdMap.get(tid))
              .filter((tid): tid is string => Boolean(tid));

            await syncNoteTopicLinks(tx, note.id, validResolvedTopicIds);
          }
        }

        // Resources
        for (const resItem of payload.resources) {
          // FK guard: validate topicId tồn tại trước khi upsert resource
          const resolvedResourceTopicId = resItem.topicId
            ? topicIdMap.get(resItem.topicId)
            : undefined;

          if (resItem.topicId && !resolvedResourceTopicId) {
            if (payload.forceOverwrite) {
              throw new Error(
                `Foreign key guard: Topic với ID '${resItem.topicId}' không tồn tại cho resource '${resItem.title}' (id: ${resItem.id}).`
              );
            } else {
              // Routine sync: bỏ qua resource mồ côi
              continue;
            }
          }

          await tx.resource.upsert({
            where: { id: resItem.id },
            create: {
              id: resItem.id,
              topicId: resolvedResourceTopicId ?? resItem.topicId,
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

        // Links (KnowledgeLink persistence)
        for (const link of payload.links || []) {
          // Self-link guard: reject self links
          if (link.sourceId === link.targetId) {
            continue;
          }

          const resolvedSourceId =
            (link.sourceId && topicIdMap.get(link.sourceId)) || link.sourceId;
          const resolvedTargetId =
            (link.targetId && topicIdMap.get(link.targetId)) || link.targetId;

          const sourceExists = Boolean(
            (link.sourceId && topicIdMap.has(link.sourceId)) ||
            (resolvedSourceId && topicIdMap.has(resolvedSourceId))
          );
          const targetExists = Boolean(
            (link.targetId && topicIdMap.has(link.targetId)) ||
            (resolvedTargetId && topicIdMap.has(resolvedTargetId))
          );

          if (!sourceExists || !targetExists) {
            // Orphan link: skip in routine sync and forceOverwrite
            continue;
          }

          const linkId =
            link.id ||
            `klink-${resolvedSourceId}-${resolvedTargetId}-${link.linkType}`;

          if (typeof tx.knowledgeLink?.upsert === "function") {
            await tx.knowledgeLink.upsert({
              where: { id: linkId },
              create: {
                id: link.id || undefined,
                sourceId: resolvedSourceId,
                targetId: resolvedTargetId,
                linkType: link.linkType,
                strength: link.strength ?? 3,
                notes: link.notes ?? null,
                explanation: link.explanation ?? null,
              },
              update: {
                strength: link.strength ?? 3,
                notes: link.notes ?? null,
                explanation: link.explanation ?? null,
              },
            });
            linksCount++;
          }
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
