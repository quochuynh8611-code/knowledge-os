import type { PrismaClient } from "@prisma/client";
import {
  calculateBackupChecksum,
  BackupSnapshotSchema,
  type ValidatedBackupSnapshot,
} from "../../lib/validation";

export async function buildBackupSnapshotFromDb(
  db: PrismaClient | any,
): Promise<ValidatedBackupSnapshot> {
  const [
    categories,
    topics,
    notes,
    resources,
    tags,
    flashcards,
    archivedDocuments,
    noteTopicLinks,
  ] = await Promise.all([
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
    db.flashcard
      ? db.flashcard.findMany({
          include: {
            schedule: true,
            reviews: { orderBy: { reviewedAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    db.archivedDocument
      ? db.archivedDocument.findMany({ orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    db.noteTopicLink
      ? db.noteTopicLink.findMany({ orderBy: { id: "asc" } })
      : Promise.resolve([]),
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

  const formattedFlashcards = (flashcards || []).map((f: any) => ({
    id: f.id,
    topicId: f.topicId,
    noteId: f.noteId ?? undefined,
    resourceId: f.resourceId ?? undefined,
    type: f.type,
    front: f.front,
    back: f.back,
    lifecycleStatus: f.lifecycleStatus,
    idempotencyKey: f.idempotencyKey ?? undefined,
    createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
    updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
    schedule: f.schedule
      ? {
          id: f.schedule.id,
          flashcardId: f.schedule.flashcardId,
          state: f.schedule.state,
          dueAt: f.schedule.dueAt instanceof Date ? f.schedule.dueAt.toISOString() : f.schedule.dueAt,
          interval: f.schedule.interval,
          easeFactor: f.schedule.easeFactor,
          repetitions: f.schedule.repetitions,
          lapses: f.schedule.lapses,
          lastReviewedAt: f.schedule.lastReviewedAt instanceof Date ? f.schedule.lastReviewedAt.toISOString() : f.schedule.lastReviewedAt ?? undefined,
          updatedAt: f.schedule.updatedAt instanceof Date ? f.schedule.updatedAt.toISOString() : f.schedule.updatedAt,
        }
      : undefined,
    reviews: (f.reviews || []).map((r: any) => ({
      id: r.id,
      clientEventId: r.clientEventId,
      flashcardId: r.flashcardId,
      topicId: r.topicId,
      rating: r.rating,
      reviewDurationMs: r.reviewDurationMs,
      reviewedAt: r.reviewedAt instanceof Date ? r.reviewedAt.toISOString() : r.reviewedAt,
      stateBefore: r.stateBefore,
      stateAfter: r.stateAfter,
      intervalBefore: r.intervalBefore,
      intervalAfter: r.intervalAfter,
      easeFactorBefore: r.easeFactorBefore,
      easeFactorAfter: r.easeFactorAfter,
      dueBeforeAt: r.dueBeforeAt instanceof Date ? r.dueBeforeAt.toISOString() : r.dueBeforeAt,
      dueAfterAt: r.dueAfterAt instanceof Date ? r.dueAfterAt.toISOString() : r.dueAfterAt,
    })),
  }));

  const formattedArchivedDocuments = (archivedDocuments || []).map((doc: any) => ({
    id: doc.id,
    resourceId: doc.resourceId ?? undefined,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    fileFormat: doc.fileFormat,
    contentHash: doc.contentHash,
    storageRelPath: doc.storageRelPath,
    lastPosition: doc.lastPosition ?? undefined,
    lastReadAt: doc.lastReadAt instanceof Date ? doc.lastReadAt.toISOString() : doc.lastReadAt ?? undefined,
    readCount: doc.readCount ?? 0,
    sourceType: doc.sourceType ?? undefined,
    sourcePath: doc.sourcePath ?? undefined,
    sourceKey: doc.sourceKey ?? undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  }));

  const formattedNoteTopicLinks = (noteTopicLinks || []).map((link: any) => ({
    id: link.id,
    noteId: link.noteId,
    topicId: link.topicId,
  }));

  const canonicalData = {
    categories: formattedCategories,
    topics: formattedTopics,
    notes: formattedNotes,
    resources: formattedResources,
    tags: formattedTags,
    flashcards: formattedFlashcards,
    archivedDocuments: formattedArchivedDocuments,
    noteTopicLinks: formattedNoteTopicLinks,
  };

  const preliminaryChecksum = calculateBackupChecksum(canonicalData);

  const snapshot = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    checksum: preliminaryChecksum,
    counts: {
      categories: formattedCategories.length,
      topics: formattedTopics.length,
      notes: formattedNotes.length,
      resources: formattedResources.length,
      tags: formattedTags.length,
      flashcards: formattedFlashcards.length,
      archivedDocuments: formattedArchivedDocuments.length,
      noteTopicLinks: formattedNoteTopicLinks.length,
    },
    data: canonicalData,
  };

  const parsed = BackupSnapshotSchema.parse(snapshot);
  parsed.checksum = calculateBackupChecksum(parsed.data);
  return parsed;
}

export const createBackupSnapshot = buildBackupSnapshotFromDb;

/**
 * Deletes all database records across all tables in reverse foreign key order.
 * Ensures an atomic clean slate (Zero-Default Universal Baseline).
 */
export async function executeDatabaseReset(tx: any): Promise<void> {
  if (tx.researchInboxItem) await tx.researchInboxItem.deleteMany();
  if (tx.researchExcerpt) await tx.researchExcerpt.deleteMany();
  if (tx.archivedDocument) await tx.archivedDocument.deleteMany();
  if (tx.researchTimelineEvent) await tx.researchTimelineEvent.deleteMany();
  if (tx.artifactCitation) await tx.artifactCitation.deleteMany();
  if (tx.artifactImport) await tx.artifactImport.deleteMany();
  if (tx.groundedArtifact) await tx.groundedArtifact.deleteMany();
  if (tx.taskPrompt) await tx.taskPrompt.deleteMany();
  if (tx.sourcePackage) await tx.sourcePackage.deleteMany();
  if (tx.researchSession) await tx.researchSession.deleteMany();
  if (tx.flashcardReview) await tx.flashcardReview.deleteMany();
  if (tx.flashcardSchedule) await tx.flashcardSchedule.deleteMany();
  if (tx.flashcard) await tx.flashcard.deleteMany();
  if (tx.noteTopicLink) await tx.noteTopicLink.deleteMany();
  if (tx.topicTag) await tx.topicTag.deleteMany();
  if (tx.knowledgeProgressSnapshot) await tx.knowledgeProgressSnapshot.deleteMany();
  if (tx.knowledgeLink) await tx.knowledgeLink.deleteMany();
  if (tx.studyProgress) await tx.studyProgress.deleteMany();
  if (tx.resource) await tx.resource.deleteMany();
  if (tx.note) await tx.note.deleteMany();
  if (tx.topic) await tx.topic.deleteMany();
  if (tx.tag) await tx.tag.deleteMany();
  if (tx.category) await tx.category.deleteMany();
  if (tx.syncSession) await tx.syncSession.deleteMany();
}

export async function executeReplaceRestore(
  tx: any,
  data: ValidatedBackupSnapshot["data"],
): Promise<void> {
  // 1. Xóa toàn bộ dữ liệu hiện hữu theo thứ tự quan hệ ngược (Reverse FK Order)
  await executeDatabaseReset(tx);

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

  // 8. Nạp NoteTopicLinks (sau Notes và Topics)
  if (tx.noteTopicLink && data.noteTopicLinks && data.noteTopicLinks.length > 0) {
    for (const link of data.noteTopicLinks) {
      await tx.noteTopicLink.create({
        data: {
          id: link.id,
          noteId: link.noteId,
          topicId: link.topicId,
        },
      });
    }
  }

  // 9. Nạp Flashcards, Schedules & Reviews
  if (tx.flashcard && data.flashcards && data.flashcards.length > 0) {
    for (const card of data.flashcards) {
      await tx.flashcard.create({
        data: {
          id: card.id,
          topicId: card.topicId,
          noteId: card.noteId ?? null,
          resourceId: card.resourceId ?? null,
          type: card.type,
          front: card.front,
          back: card.back,
          lifecycleStatus: card.lifecycleStatus ?? "active",
          idempotencyKey: card.idempotencyKey ?? null,
          createdAt: card.createdAt ? new Date(card.createdAt) : undefined,
          updatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
        },
      });

      if (tx.flashcardSchedule && card.schedule) {
        await tx.flashcardSchedule.create({
          data: {
            id: card.schedule.id,
            flashcardId: card.id,
            state: card.schedule.state,
            dueAt: new Date(card.schedule.dueAt || (card.schedule as any).due),
            interval: card.schedule.interval ?? 0,
            easeFactor: card.schedule.easeFactor ?? 2.5,
            repetitions: card.schedule.repetitions ?? 0,
            lapses: card.schedule.lapses ?? 0,
            lastReviewedAt: (card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              ? new Date(card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              : null,
            updatedAt: card.schedule.updatedAt ? new Date(card.schedule.updatedAt) : new Date(),
          },
        });
      }

      if (tx.flashcardReview && card.reviews && card.reviews.length > 0) {
        for (const review of card.reviews) {
          await tx.flashcardReview.create({
            data: {
              id: review.id,
              clientEventId: review.clientEventId,
              flashcardId: card.id,
              topicId: review.topicId,
              rating: review.rating,
              reviewDurationMs: review.reviewDurationMs ?? 0,
              reviewedAt: new Date(review.reviewedAt),
              stateBefore: review.stateBefore,
              stateAfter: review.stateAfter,
              intervalBefore: review.intervalBefore,
              intervalAfter: review.intervalAfter,
              easeFactorBefore: review.easeFactorBefore,
              easeFactorAfter: review.easeFactorAfter,
              dueBeforeAt: new Date(review.dueBeforeAt || (review as any).dueBefore),
              dueAfterAt: new Date(review.dueAfterAt || (review as any).dueAfter),
            },
          });
        }
      }
    }
  }

  // 10. Nạp ArchivedDocuments
  if (tx.archivedDocument && data.archivedDocuments && data.archivedDocuments.length > 0) {
    for (const doc of data.archivedDocuments) {
      await tx.archivedDocument.create({
        data: {
          id: doc.id,
          resourceId: doc.resourceId ?? null,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileFormat: doc.fileFormat,
          contentHash: doc.contentHash,
          storageRelPath: doc.storageRelPath,
          lastPosition: doc.lastPosition ?? undefined,
          lastReadAt: doc.lastReadAt ? new Date(doc.lastReadAt) : null,
          readCount: doc.readCount ?? 0,
          sourceType: doc.sourceType ?? null,
          sourcePath: doc.sourcePath ?? null,
          sourceKey: doc.sourceKey ?? null,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        },
      });
    }
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

  // 6. NoteTopicLinks
  if (tx.noteTopicLink && data.noteTopicLinks && data.noteTopicLinks.length > 0) {
    for (const link of data.noteTopicLinks) {
      const existing = await tx.noteTopicLink.findUnique({
        where: { id: link.id },
      });
      if (!existing) {
        await tx.noteTopicLink.create({
          data: {
            id: link.id,
            noteId: link.noteId,
            topicId: link.topicId,
          },
        });
      }
    }
  }

  // 7. Flashcards & Schedules
  if (tx.flashcard && data.flashcards && data.flashcards.length > 0) {
    for (const card of data.flashcards) {
      await tx.flashcard.upsert({
        where: { id: card.id },
        create: {
          id: card.id,
          topicId: card.topicId,
          noteId: card.noteId ?? null,
          resourceId: card.resourceId ?? null,
          type: card.type,
          front: card.front,
          back: card.back,
          lifecycleStatus: card.lifecycleStatus ?? "active",
          idempotencyKey: card.idempotencyKey ?? null,
          createdAt: card.createdAt ? new Date(card.createdAt) : undefined,
          updatedAt: card.updatedAt ? new Date(card.updatedAt) : undefined,
        },
        update: {
          front: card.front,
          back: card.back,
          type: card.type,
          lifecycleStatus: card.lifecycleStatus ?? "active",
          updatedAt: card.updatedAt ? new Date(card.updatedAt) : new Date(),
        },
      });

      if (tx.flashcardSchedule && card.schedule) {
        await tx.flashcardSchedule.upsert({
          where: { flashcardId: card.id },
          create: {
            id: card.schedule.id,
            flashcardId: card.id,
            state: card.schedule.state,
            dueAt: new Date(card.schedule.dueAt || (card.schedule as any).due),
            interval: card.schedule.interval ?? 0,
            easeFactor: card.schedule.easeFactor ?? 2.5,
            repetitions: card.schedule.repetitions ?? 0,
            lapses: card.schedule.lapses ?? 0,
            lastReviewedAt: (card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              ? new Date(card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              : null,
            updatedAt: card.schedule.updatedAt ? new Date(card.schedule.updatedAt) : new Date(),
          },
          update: {
            state: card.schedule.state,
            dueAt: new Date(card.schedule.dueAt || (card.schedule as any).due),
            interval: card.schedule.interval ?? 0,
            easeFactor: card.schedule.easeFactor ?? 2.5,
            repetitions: card.schedule.repetitions ?? 0,
            lapses: card.schedule.lapses ?? 0,
            lastReviewedAt: (card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              ? new Date(card.schedule.lastReviewedAt || (card.schedule as any).lastReviewed)
              : null,
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  // 8. ArchivedDocuments
  if (tx.archivedDocument && data.archivedDocuments && data.archivedDocuments.length > 0) {
    for (const doc of data.archivedDocuments) {
      await tx.archivedDocument.upsert({
        where: { id: doc.id },
        create: {
          id: doc.id,
          resourceId: doc.resourceId ?? null,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          fileFormat: doc.fileFormat,
          contentHash: doc.contentHash,
          storageRelPath: doc.storageRelPath,
          lastPosition: doc.lastPosition ?? undefined,
          lastReadAt: doc.lastReadAt ? new Date(doc.lastReadAt) : null,
          readCount: doc.readCount ?? 0,
          sourceType: doc.sourceType ?? null,
          sourcePath: doc.sourcePath ?? null,
          sourceKey: doc.sourceKey ?? null,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : undefined,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : undefined,
        },
        update: {
          lastPosition: doc.lastPosition ?? undefined,
          lastReadAt: doc.lastReadAt ? new Date(doc.lastReadAt) : null,
          readCount: doc.readCount ?? 0,
          updatedAt: new Date(),
        },
      });
    }
  }
}
