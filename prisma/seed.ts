import { prisma } from "../src/lib/prisma";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../src/data/initialData";

export async function seed() {
  console.log(
    "🚀 Bắt đầu quá trình nạp dữ liệu chuẩn (Canonical Database Seeding)...",
  );

  let categoriesUpserted = 0;
  let tagsUpserted = 0;
  let topicsUpserted = 0;
  let progressUpserted = 0;
  let linksUpserted = 0;
  let notesUpserted = 0;
  let resourcesUpserted = 0;

  // 1. Categories (8)
  for (const cat of INITIAL_CATEGORIES) {
    await prisma.category.upsert({
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
      },
      update: {
        name: cat.name,
        type: cat.type,
        description: cat.description,
        parentId: cat.parentId,
        icon: cat.icon,
        color: cat.color,
      },
    });
    categoriesUpserted++;
  }

  // 2. Tags (12)
  for (const tag of INITIAL_TAGS) {
    await prisma.tag.upsert({
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
    tagsUpserted++;
  }

  // 3. Topics (35)
  for (const topic of INITIAL_TOPICS) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      create: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        categoryId: topic.categoryId,
        type: topic.type,
        parentId: topic.parentId,
        description: topic.description,
        content: topic.content,
        tags: topic.tags,
      },
      update: {
        title: topic.title,
        categoryId: topic.categoryId,
        type: topic.type,
        parentId: topic.parentId,
        description: topic.description,
        content: topic.content,
        tags: topic.tags,
      },
    });
    topicsUpserted++;
  }

  // 4. StudyProgress (35)
  for (const topic of INITIAL_TOPICS) {
    if (topic.studyProgress) {
      await prisma.studyProgress.upsert({
        where: { topicId: topic.id },
        create: {
          id: `sp-${topic.id}`,
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
      progressUpserted++;
    }
  }

  // 5. KnowledgeLinks (77)
  for (const topic of INITIAL_TOPICS) {
    if (topic.links && topic.links.length > 0) {
      for (const link of topic.links) {
        await prisma.knowledgeLink.upsert({
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
        linksUpserted++;
      }
    }
  }

  // 6. Notes (5)
  for (const note of INITIAL_NOTES) {
    await prisma.note.upsert({
      where: { id: note.id },
      create: {
        id: note.id,
        topicId: note.topicId,
        title: note.title,
        content: note.content,
        type: note.type,
        isPrivate: note.isPrivate ?? false,
        tags: note.tags,
      },
      update: {
        topicId: note.topicId,
        title: note.title,
        content: note.content,
        type: note.type,
        isPrivate: note.isPrivate ?? false,
        tags: note.tags,
      },
    });
    notesUpserted++;
  }

  // 7. Resources (4)
  for (const resItem of INITIAL_RESOURCES) {
    await prisma.resource.upsert({
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
        topicId: resItem.topicId,
        title: resItem.title,
        type: resItem.type,
        author: resItem.author,
        url: resItem.url,
        filePath: resItem.filePath,
        notes: resItem.notes,
      },
    });
    resourcesUpserted++;
  }

  const summary = {
    categories: categoriesUpserted,
    tags: tagsUpserted,
    topics: topicsUpserted,
    studyProgress: progressUpserted,
    knowledgeLinks: linksUpserted,
    notes: notesUpserted,
    resources: resourcesUpserted,
  };

  console.log("✅ Hoàn tất nạp dữ liệu (Seed Summary):", summary);
  return summary;
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .catch((e) => {
      console.error("❌ Lỗi Seeding cơ sở dữ liệu:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
