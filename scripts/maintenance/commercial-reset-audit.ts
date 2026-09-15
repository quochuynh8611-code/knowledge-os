import { prisma } from "../../src/lib/prisma";

export interface AuditReport {
  timestamp: string;
  status: "PASSED" | "FAILED";
  invariants: {
    categoriesCountEqualsOne: boolean;
    categoryDongYExists: boolean;
    topicsCountEqualsOne: boolean;
    flashcardsCountInRange: boolean;
    notesCountEqualsOne: boolean;
    noOrphanResources: boolean;
    noLegacySessions: boolean;
  };
  counts: {
    categories: number;
    topics: number;
    notes: number;
    flashcards: number;
    flashcardSchedules: number;
    resources: number;
    tags: number;
    studyProgress: number;
    knowledgeProgressSnapshots: number;
    researchSessions: number;
    groundedArtifacts: number;
  };
  categoryDetails: {
    id: string;
    name: string;
    slug: string;
    type: string;
    parentId: string | null;
  } | null;
  topicDetails: {
    id: string;
    title: string;
    slug: string;
    categoryId: string;
  } | null;
  flashcardsList: {
    id: string;
    front: string;
    back: string;
  }[];
  notesList: {
    id: string;
    title: string;
    type: string;
  }[];
  failureReasons: string[];
}

export async function runCommercialResetAudit(): Promise<AuditReport> {
  const [
    categoryCount,
    topicCount,
    noteCount,
    flashcardCount,
    flashcardScheduleCount,
    resourceCount,
    tagCount,
    studyProgressCount,
    snapshotCount,
    sessionCount,
    artifactCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.topic.count(),
    prisma.note.count(),
    prisma.flashcard.count(),
    prisma.flashcardSchedule.count(),
    prisma.resource.count(),
    prisma.tag.count(),
    prisma.studyProgress.count(),
    prisma.knowledgeProgressSnapshot.count(),
    prisma.researchSession.count(),
    prisma.groundedArtifact.count(),
  ]);

  const category = await prisma.category.findFirst({
    where: { slug: "dong-y" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      parentId: true,
    },
  });

  const topic = await prisma.topic.findFirst({
    where: { slug: "ly-luan-co-ban-dong-y" },
    select: {
      id: true,
      title: true,
      slug: true,
      categoryId: true,
    },
  });

  const flashcards = await prisma.flashcard.findMany({
    select: {
      id: true,
      front: true,
      back: true,
    },
  });

  const notes = await prisma.note.findMany({
    select: {
      id: true,
      title: true,
      type: true,
    },
  });

  const failureReasons: string[] = [];

  const categoriesCountEqualsOne = categoryCount === 1;
  if (!categoriesCountEqualsOne) {
    failureReasons.push(`Expected 1 category, found ${categoryCount}`);
  }

  const categoryDongYExists =
    category !== null && category.name === "Đông Y" && category.slug === "dong-y";
  if (!categoryDongYExists) {
    failureReasons.push(
      `Category 'Đông Y' (slug: dong-y) was not found or has incorrect properties`
    );
  }

  const topicsCountEqualsOne = topicCount === 1;
  if (!topicsCountEqualsOne) {
    failureReasons.push(`Expected 1 topic, found ${topicCount}`);
  }

  const flashcardsCountInRange = flashcardCount >= 1 && flashcardCount <= 2;
  if (!flashcardsCountInRange) {
    failureReasons.push(`Expected 1-2 flashcards, found ${flashcardCount}`);
  }

  const notesCountEqualsOne = noteCount === 1;
  if (!notesCountEqualsOne) {
    failureReasons.push(`Expected 1 note, found ${noteCount}`);
  }

  const noOrphanResources = resourceCount === 0;
  if (!noOrphanResources) {
    failureReasons.push(`Expected 0 residual resources, found ${resourceCount}`);
  }

  const noLegacySessions = sessionCount === 0;
  if (!noLegacySessions) {
    failureReasons.push(
      `Expected 0 residual research sessions, found ${sessionCount}`
    );
  }

  const passed = failureReasons.length === 0;

  return {
    timestamp: new Date().toISOString(),
    status: passed ? "PASSED" : "FAILED",
    invariants: {
      categoriesCountEqualsOne,
      categoryDongYExists,
      topicsCountEqualsOne,
      flashcardsCountInRange,
      notesCountEqualsOne,
      noOrphanResources,
      noLegacySessions,
    },
    counts: {
      categories: categoryCount,
      topics: topicCount,
      notes: noteCount,
      flashcards: flashcardCount,
      flashcardSchedules: flashcardScheduleCount,
      resources: resourceCount,
      tags: tagCount,
      studyProgress: studyProgressCount,
      knowledgeProgressSnapshots: snapshotCount,
      researchSessions: sessionCount,
      groundedArtifacts: artifactCount,
    },
    categoryDetails: category,
    topicDetails: topic,
    flashcardsList: flashcards,
    notesList: notes,
    failureReasons,
  };
}

// Auto-run if executed directly
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("commercial-reset-audit.ts") ||
    process.argv[1].endsWith("commercial-reset-audit.js"))
) {
  runCommercialResetAudit()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.status === "PASSED" ? 0 : 1;
    })
    .catch((error) => {
      console.error(
        JSON.stringify(
          {
            status: "ERROR",
            message: error instanceof Error ? error.message : String(error),
          },
          null,
          2
        )
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
