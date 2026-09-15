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
        category: {
          id: "cat-root-dong-y",
          name: "Đông Y",
          slug: "dong-y",
          type: "dong-y",
        },
        topic: {
          id: "topic-dong-y-co-ban",
          title: "Lý Luận Cơ Bản Đông Y",
          slug: "ly-luan-co-ban-dong-y",
        },
        flashcardsCount: 2,
        notesCount: 1,
      },
    };
  }

  // EXECUTE MODE:
  // 1. Delete all categories (cascading all dependent records) and standalone tags
  const deleteCategoriesResult = await prisma.category.deleteMany({});
  const deleteTagsResult = await prisma.tag.deleteMany({});

  // 2. Seed 1 template category "Đông Y"
  const createdCategory = await prisma.category.create({
    data: {
      id: "cat-root-dong-y",
      name: "Đông Y",
      slug: "dong-y",
      type: "dong-y",
      description:
        "Lĩnh vực nghiên cứu Đông Y — Lý luận cơ bản, Tạng tượng, Bát cương, Dược học và Kinh lạc châm cứu.",
      icon: "Layers",
      color: "#059669",
      order: 0,
      parentId: null,
    },
  });

  // 3. Seed 1 starter topic
  const createdTopic = await prisma.topic.create({
    data: {
      id: "topic-dong-y-co-ban",
      title: "Lý Luận Cơ Bản Đông Y",
      slug: "ly-luan-co-ban-dong-y",
      categoryId: createdCategory.id,
      type: "dong-y",
      description:
        "Nền tảng âm dương, ngũ hành, tạng tượng và khí huyết trong Đông Y học cổ truyền.",
      content: "Nội dung cơ bản về Đông Y học cổ truyền.",
      tags: ["dong-y", "ly-luan-co-ban"],
    },
  });

  // 4. Seed 2 template flashcards with SM-2 schedule
  const card1 = await prisma.flashcard.create({
    data: {
      id: "card-commercial-1",
      topicId: createdTopic.id,
      type: "basic",
      front: "Học thuyết Âm Dương trong Đông Y bao gồm những quy luật cơ bản nào?",
      back: "Bao gồm 4 quy luật: Âm Dương đối lập, Âm Dương hỗ căn, Âm Dương tiêu trưởng, Âm Dương bình hành.",
      lifecycleStatus: "active",
      schedule: {
        create: {
          state: "new",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          dueAt: new Date(),
        },
      },
    },
  });

  const card2 = await prisma.flashcard.create({
    data: {
      id: "card-commercial-2",
      topicId: createdTopic.id,
      type: "basic",
      front: "Ngũ hành tương sinh theo thứ tự như thế nào?",
      back: "Mộc sinh Hỏa -> Hỏa sinh Thổ -> Thổ sinh Kim -> Kim sinh Thủy -> Thủy sinh Mộc.",
      lifecycleStatus: "active",
      schedule: {
        create: {
          state: "new",
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          dueAt: new Date(),
        },
      },
    },
  });

  // 5. Seed 1 Onboarding Note
  const createdNote = await prisma.note.create({
    data: {
      id: "note-commercial-onboarding",
      topicId: createdTopic.id,
      title: "Hướng dẫn bắt đầu sử dụng Knowledge OS",
      content: `# Chào mừng bạn đến với Knowledge OS!

Đây là không gian học tập, nghiên cứu và quản lý tri thức cá nhân hóa theo phương pháp chuyên sâu.

## Các tính năng chính:
- **Cây chủ đề (Topic Tree)**: Tổ chức tri thức theo từng lĩnh vực khoa học, chuyên ngành.
- **Ghi chú thông minh (Notes)**: Hỗ trợ ghi chú Markdown, liên kết đa chiều.
- **Flashcards & Spaced Repetition (SM-2)**: Ôn tập ngắt quãng thông minh giúp ghi nhớ dài hạn.
- **Research Hub**: Tích hợp nghiên cứu chuyên sâu và tài liệu tham khảo.

Hãy bắt đầu khám phá bằng cách tạo chủ đề mới hoặc thêm flashcards của riêng bạn!`,
      type: "summary",
      isPrivate: false,
      tags: ["huong-dan", "onboarding"],
    },
  });

  // 6. Post-mutation counts
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
      category: createdCategory,
      topic: createdTopic,
      flashcards: [card1.id, card2.id],
      note: createdNote.id,
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
