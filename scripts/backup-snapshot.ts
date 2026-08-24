#!/usr/bin/env tsx
import path from "path";
import fs from "fs";
import { prisma } from "../src/lib/prisma";
import {
  createSnapshot,
  writeSnapshotAtomic,
  verifySnapshotFile,
  pruneSnapshots,
  SnapshotDataInput,
} from "../src/lib/snapshotManager";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../src/data/initialData";

/**
 * Parses CLI arguments into structured options
 */
function parseCliArgs(args: string[]) {
  const options = {
    outDir: path.resolve(process.cwd(), "backups"),
    dryRun: false,
    verifyPath: undefined as string | undefined,
    prune: false,
    retention: 10,
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--prune") {
      options.prune = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--verify" && i + 1 < args.length) {
      options.verifyPath = args[++i];
    } else if (arg.startsWith("--verify=")) {
      options.verifyPath = arg.split("=")[1];
    } else if (arg === "--out-dir" && i + 1 < args.length) {
      options.outDir = path.resolve(process.cwd(), args[++i]);
    } else if (arg.startsWith("--out-dir=")) {
      options.outDir = path.resolve(process.cwd(), arg.split("=")[1]);
    } else if (arg === "--retention" && i + 1 < args.length) {
      options.retention = parseInt(args[++i], 10) || 10;
    } else if (arg.startsWith("--retention=")) {
      options.retention = parseInt(arg.split("=")[1], 10) || 10;
    } else if (!arg.startsWith("--") && !options.verifyPath && !options.prune) {
      // Positional argument for verify if not flag-assigned
      options.verifyPath = arg;
    }
  }

  return options;
}

/**
 * Fetches canonical data from Prisma DB with offline fallback to initial canonical dataset
 */
async function fetchSnapshotData(): Promise<SnapshotDataInput> {
  try {
    const [categories, topics, notes, resources, tags] = await Promise.all([
      prisma.category.findMany({ orderBy: { order: "asc" } }),
      prisma.topic.findMany({
        include: {
          studyProgress: true,
          sourceLinks: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.note.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.resource.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.tag.findMany({ orderBy: { name: "asc" } }),
    ]);

    if (categories.length === 0 && topics.length === 0) {
      return {
        categories: INITIAL_CATEGORIES,
        topics: INITIAL_TOPICS,
        notes: INITIAL_NOTES,
        resources: INITIAL_RESOURCES,
        tags: INITIAL_TAGS,
      };
    }

    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        type: c.type as any,
        description: c.description ?? undefined,
        parentId: c.parentId ?? undefined,
        icon: c.icon ?? undefined,
        color: c.color ?? undefined,
      })),
      topics: topics.map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        categoryId: t.categoryId,
        type: t.type as any,
        parentId: t.parentId ?? undefined,
        description: t.description,
        content: t.content,
        tags: t.tags,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        links: (t.sourceLinks || []).map((l) => ({
          id: l.id,
          sourceId: l.sourceId,
          targetId: l.targetId,
          linkType: l.linkType as any,
          strength: l.strength,
          notes: l.notes ?? undefined,
        })),
        studyProgress: t.studyProgress
          ? {
              topicId: t.studyProgress.topicId,
              status: t.studyProgress.status as any,
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
          : {
              topicId: t.id,
              status: "not_started" as const,
              progress: 0,
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              totalNotes: 0,
              timeSpent: 0,
            },
      })),
      notes: notes.map((n) => ({
        id: n.id,
        topicId: n.topicId,
        title: n.title,
        content: n.content,
        type: n.type as any,
        isPrivate: n.isPrivate,
        tags: n.tags,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      resources: resources.map((r) => ({
        id: r.id,
        topicId: r.topicId,
        title: r.title,
        url: r.url ?? undefined,
        filePath: r.filePath ?? undefined,
        type: r.type as any,
        author: r.author ?? undefined,
        notes: r.notes ?? undefined,
        createdAt: r.createdAt.toISOString(),
      })),
      tags: tags.map((tg) => ({
        id: tg.id,
        name: tg.name,
        slug: tg.slug,
        color: tg.color ?? undefined,
        count: tg.count ?? 0,
      })),
    };
  } catch {
    return {
      categories: INITIAL_CATEGORIES,
      topics: INITIAL_TOPICS,
      notes: INITIAL_NOTES,
      resources: INITIAL_RESOURCES,
      tags: INITIAL_TAGS,
    };
  } finally {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);

  if (options.help) {
    console.log(`
Knowledge OS — Headless Snapshot & Backup CLI

Usage:
  npx tsx scripts/backup-snapshot.ts [options]

Commands & Options:
  --dry-run            Mô phỏng tạo snapshot trong bộ nhớ mà không ghi tệp
  --verify <filepath>  Kiểm tra tính toàn vẹn (Schema & SHA-256 Checksum) của tệp snapshot
  --prune              Dọn dẹp các tệp snapshot cũ theo chính sách lưu giữ
  --retention <N>      Số lượng snapshot tối đa giữ lại (Mặc định: 10)
  --out-dir <path>     Thư mục lưu trữ snapshot (Mặc định: ./backups)
  --json               Định dạng kết quả đầu ra JSON có cấu trúc (cho CI/CD)
  --help, -h           Hiển thị trợ giúp
    `);
    process.exit(0);
  }

  // MODE 1: VERIFY SNAPSHOT
  if (options.verifyPath) {
    const targetFile = path.resolve(process.cwd(), options.verifyPath);
    const result = await verifySnapshotFile(targetFile);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.status === "VALID") {
        console.log(`✅ [VALID] Snapshot toàn vẹn: ${path.basename(targetFile)}`);
        console.log(`   • Version: ${result.snapshot?.version}`);
        console.log(`   • Exported At: ${result.snapshot?.exportedAt}`);
        console.log(`   • SHA-256 Checksum: ${result.snapshot?.checksum}`);
        console.log(
          `   • Counts: ${result.snapshot?.counts.categories} categories, ${result.snapshot?.counts.topics} topics, ${result.snapshot?.counts.notes} notes, ${result.snapshot?.counts.resources} resources, ${result.snapshot?.counts.tags} tags`
        );
      } else if (result.status === "INVALID_CHECKSUM") {
        console.error(`❌ [INVALID_CHECKSUM] Lỗi mã băm: ${result.error}`);
        process.exit(1);
      } else {
        console.error(`❌ [INVALID_SCHEMA] Lỗi cấu trúc: ${result.error}`);
        process.exit(2);
      }
    }
    process.exit(0);
  }

  // MODE 2: PRUNE SNAPSHOTS ONLY
  if (options.prune) {
    const pruneResult = await pruneSnapshots(options.outDir, options.retention);
    if (options.json) {
      console.log(JSON.stringify(pruneResult, null, 2));
    } else {
      console.log(`🧹 [PRUNE] Dọn dẹp hoàn tất tại thư mục: ${options.outDir}`);
      console.log(`   • Đã giữ lại (${pruneResult.retained.length}): ${pruneResult.retained.join(", ") || "None"}`);
      console.log(`   • Đã xóa (${pruneResult.deleted.length}): ${pruneResult.deleted.join(", ") || "None"}`);
      if (pruneResult.preservedNonSnapshots.length > 0) {
        console.log(`   • Bảo toàn (${pruneResult.preservedNonSnapshots.length}): ${pruneResult.preservedNonSnapshots.join(", ")}`);
      }
    }
    process.exit(0);
  }

  // MODE 3: CREATE SNAPSHOT (Standard or Dry-Run)
  const data = await fetchSnapshotData();
  const snapshotResult = createSnapshot(data, { checkSizeLimit: true });

  if (snapshotResult.warnings && snapshotResult.warnings.length > 0) {
    for (const w of snapshotResult.warnings) {
      console.warn(`⚠️ ${w}`);
    }
  }

  const writeResult = await writeSnapshotAtomic(options.outDir, snapshotResult.snapshot, {
    dryRun: options.dryRun,
  });

  // Automatically apply retention pruning on creation if not in dry-run
  let pruneSummary: any = undefined;
  if (!options.dryRun && fs.existsSync(options.outDir)) {
    pruneSummary = await pruneSnapshots(options.outDir, options.retention);
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          dryRun: options.dryRun,
          filePath: writeResult.filePath,
          sizeBytes: writeResult.sizeBytes,
          checksum: snapshotResult.snapshot.checksum,
          counts: snapshotResult.snapshot.counts,
          exportedAt: snapshotResult.snapshot.exportedAt,
          prune: pruneSummary,
        },
        null,
        2
      )
    );
  } else {
    if (options.dryRun) {
      console.log(`🔍 [DRY-RUN] Mô phỏng tạo Snapshot thành công (Không ghi tệp vào đĩa)`);
      console.log(`   • Dung lượng ước tính: ${writeResult.sizeBytes} bytes`);
      console.log(`   • SHA-256 Checksum: ${snapshotResult.snapshot.checksum}`);
      console.log(
        `   • Số lượng bản ghi: ${snapshotResult.snapshot.counts.categories} categories, ${snapshotResult.snapshot.counts.topics} topics, ${snapshotResult.snapshot.counts.notes} notes, ${snapshotResult.snapshot.counts.resources} resources, ${snapshotResult.snapshot.counts.tags} tags`
      );
    } else {
      console.log(`🚀 [SUCCESS] Đã tạo snapshot thành công!`);
      console.log(`   • Đường dẫn: ${writeResult.filePath}`);
      console.log(`   • Dung lượng: ${writeResult.sizeBytes} bytes`);
      console.log(`   • SHA-256 Checksum: ${snapshotResult.snapshot.checksum}`);
      console.log(
        `   • Tổng cộng: ${snapshotResult.snapshot.counts.topics} topics, ${snapshotResult.snapshot.counts.categories} categories, ${snapshotResult.snapshot.counts.notes} notes, ${snapshotResult.snapshot.counts.resources} resources`
      );
      if (pruneSummary && pruneSummary.deleted.length > 0) {
        console.log(`   • Đã tự động dọn dẹp ${pruneSummary.deleted.length} snapshot cũ.`);
      }
    }
  }
}

main().catch((err) => {
  console.error("❌ Lỗi thực thi snapshot:", err);
  process.exit(1);
});
