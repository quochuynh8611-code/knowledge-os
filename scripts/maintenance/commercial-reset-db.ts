import { prisma } from "../../src/lib/prisma";

export const REQUIRED_RESET_CONFIRMATION = "XOA TOAN BO DATA CA NHAN";

export interface ResetCliArgs {
  valid: boolean;
  mode: "dry-run" | "execute";
  exitCode?: number;
  errorMessage?: string;
}

export function sanitizeDatabaseUrl(url?: string): string {
  if (!url || typeof url !== "string") {
    return "unknown-database";
  }
  try {
    const parsed = new URL(url);
    const host = parsed.host || "localhost:5432";
    const pathname = parsed.pathname || "/knowledge_os";
    return `${host}${pathname}`;
  } catch {
    const cleaned = url.replace(/^[^:]+:\/\/[^@]+@/, "");
    return cleaned.split("?")[0] || "unknown-database";
  }
}

export function parseResetCliArgs(args: string[]): ResetCliArgs {
  let mode: "dry-run" | "execute" = "dry-run";
  let hasExecute = false;
  let confirmValue: string | null = null;

  for (const arg of args) {
    if (arg === "--dry-run") {
      mode = "dry-run";
    } else if (arg === "--execute") {
      hasExecute = true;
      mode = "execute";
    } else if (arg.startsWith("--confirm=")) {
      let raw = arg.slice("--confirm=".length);
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        raw = raw.slice(1, -1);
      }
      confirmValue = raw;
    } else {
      return {
        valid: false,
        mode: "dry-run",
        exitCode: 2,
        errorMessage: `Unknown or disallowed argument: ${arg}`,
      };
    }
  }

  if (hasExecute) {
    if (!confirmValue) {
      return {
        valid: false,
        mode: "execute",
        exitCode: 2,
        errorMessage: `Missing required --confirm parameter for --execute. Must pass: --confirm="${REQUIRED_RESET_CONFIRMATION}"`,
      };
    }
    if (confirmValue !== REQUIRED_RESET_CONFIRMATION) {
      return {
        valid: false,
        mode: "execute",
        exitCode: 2,
        errorMessage: `Invalid confirmation phrase "${confirmValue}". Required: "${REQUIRED_RESET_CONFIRMATION}"`,
      };
    }
  }

  return {
    valid: true,
    mode,
  };
}

export async function runCommercialReset(options: {
  mode: "dry-run" | "execute";
}): Promise<{
  mode: "dry-run" | "execute";
  database: string;
  beforeCounts: Record<string, number>;
  deletedRecords?: Record<string, number>;
  seededRecords?: Record<string, unknown>;
  afterCounts?: Record<string, number>;
}> {
  const rawDbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/knowledge_os?schema=public";
  const sanitizedDb = sanitizeDatabaseUrl(rawDbUrl);

  const [
    categoryCount,
    topicCount,
    noteCount,
    resourceCount,
    tagCount,
    studyProgressCount,
    snapshotCount,
    flashcardCount,
    sessionCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.topic.count(),
    prisma.note.count(),
    prisma.resource.count(),
    prisma.tag.count(),
    prisma.studyProgress.count(),
    prisma.knowledgeProgressSnapshot.count(),
    prisma.flashcard.count(),
    prisma.researchSession.count(),
  ]);

  const beforeCounts = {
    categories: categoryCount,
    topics: topicCount,
    notes: noteCount,
    resources: resourceCount,
    tags: tagCount,
    studyProgress: studyProgressCount,
    snapshots: snapshotCount,
    flashcards: flashcardCount,
    researchSessions: sessionCount,
  };

  if (options.mode === "dry-run") {
    return {
      mode: "dry-run",
      database: sanitizedDb,
      beforeCounts,
      deletedRecords: {
        categoriesToBeDeleted: categoryCount,
        topicsCascadeDeleted: topicCount,
        notesCascadeDeleted: noteCount,
        resourcesCascadeDeleted: resourceCount,
        tagsToBeDeleted: tagCount,
        studyProgressCascadeDeleted: studyProgressCount,
        snapshotsCascadeDeleted: snapshotCount,
        flashcardsCascadeDeleted: flashcardCount,
        researchSessionsCascadeDeleted: sessionCount,
      },
      seededRecords: {
        categoriesCount: 0,
        topicsCount: 0,
        flashcardsCount: 0,
        notesCount: 0,
      },
    };
  }

  // EXECUTE MODE:
  // 1. Delete all categories (cascading all dependent records) and standalone tags
  const deleteCategoriesResult = await prisma.category.deleteMany({});
  const deleteTagsResult = await prisma.tag.deleteMany({});

  // 2. Post-mutation counts
  const [
    afterCategoryCount,
    afterTopicCount,
    afterNoteCount,
    afterResourceCount,
    afterTagCount,
    afterStudyProgressCount,
    afterSnapshotCount,
    afterFlashcardCount,
    afterSessionCount,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.topic.count(),
    prisma.note.count(),
    prisma.resource.count(),
    prisma.tag.count(),
    prisma.studyProgress.count(),
    prisma.knowledgeProgressSnapshot.count(),
    prisma.flashcard.count(),
    prisma.researchSession.count(),
  ]);

  const afterCounts = {
    categories: afterCategoryCount,
    topics: afterTopicCount,
    notes: afterNoteCount,
    resources: afterResourceCount,
    tags: afterTagCount,
    studyProgress: afterStudyProgressCount,
    snapshots: afterSnapshotCount,
    flashcards: afterFlashcardCount,
    researchSessions: afterSessionCount,
  };

  return {
    mode: "execute",
    database: sanitizedDb,
    beforeCounts,
    deletedRecords: {
      categoriesDeleted: deleteCategoriesResult.count,
      tagsDeleted: deleteTagsResult.count,
    },
    seededRecords: {
      categoriesCount: 0,
      topicsCount: 0,
      flashcardsCount: 0,
      notesCount: 0,
    },
    afterCounts,
  };
}

// Auto-run if executed directly
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("commercial-reset-db.ts") ||
    process.argv[1].endsWith("commercial-reset-db.js"))
) {
  const args = process.argv.slice(2);
  const parsed = parseResetCliArgs(args);

  if (!parsed.valid) {
    console.error(`\n❌ [CLI ERROR] ${parsed.errorMessage}\n`);
    process.exitCode = parsed.exitCode ?? 2;
  } else {
    runCommercialReset({ mode: parsed.mode })
      .then((result) => {
        console.log(
          JSON.stringify(
            {
              status: "SUCCESS",
              result,
            },
            null,
            2
          )
        );
        process.exitCode = 0;
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
}
