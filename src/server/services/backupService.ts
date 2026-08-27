import type { PrismaClient } from "@prisma/client";
import {
  calculateBackupChecksum,
  BackupSnapshotSchema,
  type ValidatedBackupSnapshot,
} from "../../lib/validation";

export async function buildBackupSnapshotFromDb(
  db: PrismaClient | any,
): Promise<ValidatedBackupSnapshot> {
  const [categories, topics, notes, resources, tags] = await Promise.all([
    db.category.findMany({ orderBy: { order: "asc" } }),
    db.topic.findMany({
      include: {
        studyProgress: true,
        sourceLinks: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    db.note.findMany({ orderBy: { createdAt: "asc" } }),
    db.resource.findMany({ orderBy: { createdAt: "asc" } }),
    db.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  const formattedCategories = categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: (c.type || c.slug) as any,
    description: c.description ?? undefined,
    parentId: c.parentId ?? undefined,
    icon: c.icon ?? undefined,
    color: c.color ?? undefined,
    order: c.order,
  }));

  const formattedTopics = topics.map((t: any) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    categoryId: t.categoryId,
    type: (t.type || "general") as any,
    parentId: t.parentId ?? undefined,
    description: t.description,
    content: t.content,
    tags: t.tags,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    links: (t.sourceLinks || []).map((l: any) => ({
      id: l.id,
      sourceId: l.sourceId,
      targetId: l.targetId,
      linkType: l.linkType as
        "related" | "prerequisite" | "advanced" | "contradicts",
      strength: l.strength,
      notes: l.notes ?? undefined,
    })),
    studyProgress: t.studyProgress
      ? {
          topicId: t.studyProgress.topicId,
          status: t.studyProgress.status as
            "not_started" | "in_progress" | "completed" | "reviewing",
          progress: t.studyProgress.progress,
          interval: t.studyProgress.interval,
          easeFactor: t.studyProgress.easeFactor,
          repetitions: t.studyProgress.repetitions,
          totalNotes: t.studyProgress.totalNotes,
          timeSpent: t.studyProgress.timeSpent,
          startDate: t.studyProgress.startDate?.toISOString() ?? undefined,
          endDate: t.studyProgress.endDate?.toISOString() ?? undefined,
          lastStudied: t.studyProgress.lastStudied?.toISOString() ?? undefined,
          nextReview: t.studyProgress.nextReview?.toISOString() ?? undefined,
        }
      : undefined,
  }));

  const formattedNotes = notes.map((n: any) => ({
    id: n.id,
    topicId: n.topicId,
    title: n.title,
    content: n.content,
    type: n.type as "study" | "insight" | "question" | "summary",
    isPrivate: n.isPrivate,
    tags: n.tags,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  const formattedResources = resources.map((r: any) => ({
    id: r.id,
    topicId: r.topicId,
    title: r.title,
    type: r.type as "book" | "article" | "video" | "audio" | "pdf" | "link",
    author: r.author ?? undefined,
    url: r.url ?? undefined,
    filePath: r.filePath ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));

  const formattedTags = tags.map((t: any) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color ?? undefined,
    count: t.count,
  }));

  const canonicalData = {
    categories: formattedCategories,
    topics: formattedTopics,
    notes: formattedNotes,
    resources: formattedResources,
    tags: formattedTags,
  };

  const checksum = calculateBackupChecksum(canonicalData);

  const snapshot = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    checksum,
    counts: {
      categories: formattedCategories.length,
      topics: formattedTopics.length,
      notes: formattedNotes.length,
      resources: formattedResources.length,
      tags: formattedTags.length,
    },
    data: canonicalData,
  };

  return BackupSnapshotSchema.parse(snapshot);
}

export async function executeReplaceRestore(
  tx: any,
  data: ValidatedBackupSnapshot["data"],
): Promise<void> {
  // 1. Xóa toàn bộ dữ liệu hiện hữu theo thứ tự quan hệ ngược (Reverse FK Order)
  await tx.resource.deleteMany();
  await tx.note.deleteMany();
  await tx.knowledgeLink.deleteMany();
  await tx.studyProgress.deleteMany();
  await tx.topic.deleteMany();
  await tx.tag.deleteMany();
  await tx.category.deleteMany();

  // 2. Nạp Categories
  for (const cat of data.categories) {
    await tx.category.create({
      data: {
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
    });
  }

  // 3. Nạp Tags
  for (const tag of data.tags) {
    await tx.tag.create({
      data: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color ?? "#D97706",
        count: tag.count ?? 0,
      },
    });
  }

  // 4. Nạp Topics & StudyProgress
  for (const topic of data.topics) {
    await tx.topic.create({
      data: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        categoryId: topic.categoryId,
        type: topic.type,
        parentId: topic.parentId,
        description: topic.description,
        content: topic.content,
        tags: topic.tags,
        createdAt: topic.createdAt ? new Date(topic.createdAt) : undefined,
        updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : undefined,
      },
    });

    if (topic.studyProgress) {
      await tx.studyProgress.create({
        data: {
          id: `sp-${topic.id}`,
          topicId: topic.id,
          status: topic.studyProgress.status,
          progress: topic.studyProgress.progress,
          interval: topic.studyProgress.interval,
          easeFactor: topic.studyProgress.easeFactor,
          repetitions: topic.studyProgress.repetitions,
          totalNotes: topic.studyProgress.totalNotes,
          timeSpent: topic.studyProgress.timeSpent,
          startDate: topic.studyProgress.startDate
            ? new Date(topic.studyProgress.startDate)
            : null,
          endDate: topic.studyProgress.endDate
            ? new Date(topic.studyProgress.endDate)
            : null,
          lastStudied: topic.studyProgress.lastStudied
            ? new Date(topic.studyProgress.lastStudied)
            : null,
          nextReview: topic.studyProgress.nextReview
            ? new Date(topic.studyProgress.nextReview)
            : null,
        },
      });
    }
  }

  // 5. Nạp KnowledgeLinks (sau khi toàn bộ Topics đã tồn tại)
  for (const topic of data.topics) {
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        await tx.knowledgeLink.create({
          data: {
            id: link.id,
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
        });
      }
    }
  }

  // 6. Nạp Notes
  for (const note of data.notes) {
    await tx.note.create({
      data: {
        id: note.id,
        topicId: note.topicId,
        title: note.title,
        content: note.content,
        type: note.type,
        isPrivate: note.isPrivate ?? false,
        tags: note.tags,
        createdAt: note.createdAt ? new Date(note.createdAt) : undefined,
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : undefined,
      },
    });
  }

  // 7. Nạp Resources
  for (const resItem of data.resources) {
    await tx.resource.create({
      data: {
        id: resItem.id,
        topicId: resItem.topicId,
        title: resItem.title,
        type: resItem.type,
        author: resItem.author,
        url: resItem.url,
        filePath: resItem.filePath,
        notes: resItem.notes,
        createdAt: resItem.createdAt ? new Date(resItem.createdAt) : undefined,
      },
    });
  }
}

export async function executeMergeRestore(
  tx: any,
  data: ValidatedBackupSnapshot["data"],
): Promise<void> {
  // 1. Categories
  for (const cat of data.categories) {
    await tx.category.upsert({
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
  }

  // 2. Tags
  for (const tag of data.tags) {
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
  }

  // 3. Topics with LWW
  for (const topic of data.topics) {
    const existing = await tx.topic.findUnique({
      where: { slug: topic.slug },
      include: { studyProgress: true },
    });

    if (existing) {
      const isNewer =
        !topic.updatedAt ||
        !existing.updatedAt ||
        new Date(topic.updatedAt) >= new Date(existing.updatedAt);

      if (isNewer) {
        await tx.topic.update({
          where: { slug: topic.slug },
          data: {
            title: topic.title,
            categoryId: topic.categoryId,
            type: topic.type,
            description: topic.description,
            content: topic.content,
            tags: topic.tags,
            updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : new Date(),
          },
        });
      }

      // Merge Study Progress keeping highest progress & timeSpent
      if (topic.studyProgress) {
        if (existing.studyProgress) {
          await tx.studyProgress.update({
            where: { topicId: existing.id },
            data: {
              progress: Math.max(
                existing.studyProgress.progress,
                topic.studyProgress.progress,
              ),
              timeSpent: Math.max(
                existing.studyProgress.timeSpent,
                topic.studyProgress.timeSpent,
              ),
              status:
                topic.studyProgress.progress >= existing.studyProgress.progress
                  ? topic.studyProgress.status
                  : existing.studyProgress.status,
            },
          });
        } else {
          await tx.studyProgress.create({
            data: {
              id: `sp-${existing.id}`,
              topicId: existing.id,
              status: topic.studyProgress.status,
              progress: topic.studyProgress.progress,
              interval: topic.studyProgress.interval,
              easeFactor: topic.studyProgress.easeFactor,
              repetitions: topic.studyProgress.repetitions,
              totalNotes: topic.studyProgress.totalNotes,
              timeSpent: topic.studyProgress.timeSpent,
            },
          });
        }
      }
    } else {
      // New topic in merge mode
      await tx.topic.create({
        data: {
          id: topic.id,
          title: topic.title,
          slug: topic.slug,
          categoryId: topic.categoryId,
          type: topic.type,
          parentId: topic.parentId,
          description: topic.description,
          content: topic.content,
          tags: topic.tags,
          createdAt: topic.createdAt ? new Date(topic.createdAt) : undefined,
          updatedAt: topic.updatedAt ? new Date(topic.updatedAt) : undefined,
        },
      });

      if (topic.studyProgress) {
        await tx.studyProgress.create({
          data: {
            id: `sp-${topic.id}`,
            topicId: topic.id,
            status: topic.studyProgress.status,
            progress: topic.studyProgress.progress,
            interval: topic.studyProgress.interval,
            easeFactor: topic.studyProgress.easeFactor,
            repetitions: topic.studyProgress.repetitions,
            totalNotes: topic.studyProgress.totalNotes,
            timeSpent: topic.studyProgress.timeSpent,
          },
        });
      }
    }

    // Knowledge links
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        await tx.knowledgeLink.upsert({
          where: { id: link.id },
          create: {
            id: link.id,
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
          update: {
            sourceId: link.sourceId,
            targetId: link.targetId,
            linkType: link.linkType,
            strength: link.strength,
            notes: link.notes,
          },
        });
      }
    }
  }

  // 4. Notes with LWW
  for (const note of data.notes) {
    const existingNote = await tx.note.findUnique({
      where: { id: note.id },
    });
    if (existingNote) {
      const isNewer =
        !note.updatedAt ||
        !existingNote.updatedAt ||
        new Date(note.updatedAt) >= new Date(existingNote.updatedAt);
      if (isNewer) {
        await tx.note.update({
          where: { id: note.id },
          data: {
            title: note.title,
            content: note.content,
            type: note.type,
            isPrivate: note.isPrivate ?? false,
            tags: note.tags,
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
          },
        });
      }
    } else {
      await tx.note.create({
        data: {
          id: note.id,
          topicId: note.topicId,
          title: note.title,
          content: note.content,
          type: note.type,
          isPrivate: note.isPrivate ?? false,
          tags: note.tags,
          createdAt: note.createdAt ? new Date(note.createdAt) : undefined,
          updatedAt: note.updatedAt ? new Date(note.updatedAt) : undefined,
        },
      });
    }
  }

  // 5. Resources
  for (const resItem of data.resources) {
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
        createdAt: resItem.createdAt ? new Date(resItem.createdAt) : undefined,
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
  }
}
