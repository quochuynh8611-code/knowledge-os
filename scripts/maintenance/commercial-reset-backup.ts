import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { prisma } from "../../src/lib/prisma";

export interface BackupManifest {
  timestamp: string;
  gitCommit: string;
  database: string;
  recordCounts: Record<string, number>;
  files: {
    name: string;
    path: string;
    sizeBytes: number;
    sha256: string;
  }[];
  pgDumpStatus: "success" | "skipped" | "failed";
  pgDumpError?: string;
}

/**
 * Sanitizes connection string to show only host:port/database without credentials.
 */
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

/**
 * Computes SHA-256 hash of a file.
 */
export function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Cleans connection URL for pg_dump by removing custom query parameters.
 */
export function cleanUrlForPgDump(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query params like ?schema=public which pg_dump rejects
    parsed.search = "";
    return parsed.toString();
  } catch {
    return url.split("?")[0] || url;
  }
}

/**
 * Finds pg_dump binary on the system.
 */
export function findPgDumpPath(): string {
  const commonPaths = [
    "pg_dump",
    "/opt/homebrew/bin/pg_dump",
    "/usr/local/bin/pg_dump",
    "/usr/bin/pg_dump",
    "/usr/lib/postgresql/16/bin/pg_dump",
    "/usr/lib/postgresql/15/bin/pg_dump",
    "/usr/lib/postgresql/14/bin/pg_dump",
  ];

  for (const binPath of commonPaths) {
    try {
      execSync(`"${binPath}" --version`, { stdio: "ignore" });
      return binPath;
    } catch {
      // Continue searching
    }
  }
  return "pg_dump";
}

export async function runCommercialResetBackup(): Promise<BackupManifest> {
  const rawDbUrl =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/knowledge_os?schema=public";
  const sanitizedDb = sanitizeDatabaseUrl(rawDbUrl);

  const timestampIso = new Date().toISOString();
  const safeTimestamp = timestampIso.replace(/:/g, "-");
  const backupDir = path.resolve(
    process.cwd(),
    `backups/commercial-reset-${safeTimestamp}`
  );

  fs.mkdirSync(backupDir, { recursive: true });

  let gitCommit = "unknown";
  try {
    gitCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    // Git commit fallback
  }

  // 1. Fetch comprehensive datasets
  const [
    categories,
    topics,
    notes,
    resources,
    knowledgeLinks,
    studyProgress,
    tags,
    noteTopicLinks,
    topicTags,
    knowledgeProgressSnapshots,
    flashcards,
    flashcardSchedules,
    flashcardReviews,
    researchSessions,
    groundedArtifacts,
    researchTimelineEvents,
    artifactImports,
    syncSessions,
  ] = await Promise.all([
    prisma.category.findMany({
      include: {
        topics: {
          include: {
            notes: true,
            resources: true,
            studyProgress: true,
            sourceLinks: true,
            targetLinks: true,
            noteLinks: true,
            topicTags: true,
            snapshots: true,
            flashcards: {
              include: {
                schedule: true,
                reviews: true,
              },
            },
            researchSessions: {
              include: {
                artifacts: true,
                sourcePackages: true,
                taskPrompts: true,
                timelineEvents: true,
              },
            },
            researchTimelineEvents: true,
          },
        },
      },
    }),
    prisma.topic.findMany(),
    prisma.note.findMany(),
    prisma.resource.findMany(),
    prisma.knowledgeLink.findMany(),
    prisma.studyProgress.findMany(),
    prisma.tag.findMany(),
    prisma.noteTopicLink.findMany(),
    prisma.topicTag.findMany(),
    prisma.knowledgeProgressSnapshot.findMany(),
    prisma.flashcard.findMany({
      include: {
        schedule: true,
        reviews: true,
      },
    }),
    prisma.flashcardSchedule.findMany(),
    prisma.flashcardReview.findMany(),
    prisma.researchSession.findMany({
      include: {
        artifacts: true,
        sourcePackages: true,
        taskPrompts: true,
        timelineEvents: true,
      },
    }),
    prisma.groundedArtifact.findMany(),
    prisma.researchTimelineEvent.findMany(),
    prisma.artifactImport.findMany(),
    prisma.syncSession.findMany(),
  ]);

  const recordCounts: Record<string, number> = {
    categories: categories.length,
    topics: topics.length,
    notes: notes.length,
    resources: resources.length,
    knowledgeLinks: knowledgeLinks.length,
    studyProgress: studyProgress.length,
    tags: tags.length,
    noteTopicLinks: noteTopicLinks.length,
    topicTags: topicTags.length,
    knowledgeProgressSnapshots: knowledgeProgressSnapshots.length,
    flashcards: flashcards.length,
    flashcardSchedules: flashcardSchedules.length,
    flashcardReviews: flashcardReviews.length,
    researchSessions: researchSessions.length,
    groundedArtifacts: groundedArtifacts.length,
    researchTimelineEvents: researchTimelineEvents.length,
    artifactImports: artifactImports.length,
    syncSessions: syncSessions.length,
  };

  // 2. Write JSON dataset snapshot
  const jsonFileName = `personal-dataset-snapshot-${safeTimestamp}.json`;
  const jsonFilePath = path.join(backupDir, jsonFileName);
  const snapshotData = {
    metadata: {
      timestamp: timestampIso,
      gitCommit,
      database: sanitizedDb,
      recordCounts,
    },
    tables: {
      categories,
      topics,
      notes,
      resources,
      knowledgeLinks,
      studyProgress,
      tags,
      noteTopicLinks,
      topicTags,
      knowledgeProgressSnapshots,
      flashcards,
      flashcardSchedules,
      flashcardReviews,
      researchSessions,
      groundedArtifacts,
      researchTimelineEvents,
      artifactImports,
      syncSessions,
    },
  };

  fs.writeFileSync(jsonFilePath, JSON.stringify(snapshotData, null, 2), "utf-8");

  const jsonStat = fs.statSync(jsonFilePath);
  const jsonSha256 = computeSha256(jsonFilePath);

  const manifestFiles: BackupManifest["files"] = [
    {
      name: jsonFileName,
      path: jsonFilePath,
      sizeBytes: jsonStat.size,
      sha256: jsonSha256,
    },
  ];

  // 3. Perform SQL dump via pg_dump
  const sqlFileName = `full-database-${safeTimestamp}.sql`;
  const sqlFilePath = path.join(backupDir, sqlFileName);
  let pgDumpStatus: BackupManifest["pgDumpStatus"] = "success";
  let pgDumpError: string | undefined;

  const pgDumpBin = findPgDumpPath();
  const cleanedUrl = cleanUrlForPgDump(rawDbUrl);

  try {
    execSync(`"${pgDumpBin}" --clean --if-exists -d "${cleanedUrl}" -f "${sqlFilePath}"`, {
      stdio: "pipe",
    });

    const sqlStat = fs.statSync(sqlFilePath);
    const sqlSha256 = computeSha256(sqlFilePath);

    manifestFiles.push({
      name: sqlFileName,
      path: sqlFilePath,
      sizeBytes: sqlStat.size,
      sha256: sqlSha256,
    });
  } catch (error) {
    pgDumpStatus = "failed";
    pgDumpError = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ [BACKUP WARNING] pg_dump failed: ${pgDumpError}`);
  }

  // 4. Write manifest.json
  const manifest: BackupManifest = {
    timestamp: timestampIso,
    gitCommit,
    database: sanitizedDb,
    recordCounts,
    files: manifestFiles,
    pgDumpStatus,
    pgDumpError,
  };

  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  return manifest;
}

// Auto-run if executed directly
if (
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("commercial-reset-backup.ts") ||
    process.argv[1].endsWith("commercial-reset-backup.js"))
) {
  runCommercialResetBackup()
    .then((manifest) => {
      console.log(
        JSON.stringify(
          {
            status: "SUCCESS",
            message: "Backup created successfully.",
            manifest,
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
