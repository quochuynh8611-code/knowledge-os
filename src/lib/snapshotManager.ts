import fs from "fs";
import path from "path";
import { Category, Topic, Note, Resource, Tag } from "../types";
import {
  BackupSnapshotSchema,
  ValidatedBackupSnapshot,
  calculateBackupChecksum,
  validateBackupSnapshotPreflight,
} from "./validation";

export const MAX_BACKUP_SIZE = 15 * 1024 * 1024; // 15MB limit
export const SNAPSHOT_FILENAME_REGEX = /^snapshot-\d{8}T\d{6}Z-[a-f0-9]{8}\.json$/;

export interface SnapshotDataInput {
  categories: Category[];
  topics: Topic[];
  notes: Note[];
  resources: Resource[];
  tags: Tag[];
}

export interface SnapshotResult {
  snapshot: ValidatedBackupSnapshot;
  sizeBytes: number;
  warnings?: string[];
}

export interface WriteSnapshotOptions {
  dryRun?: boolean;
  createDir?: boolean;
}

export interface VerifyResult {
  status: "VALID" | "INVALID_SCHEMA" | "INVALID_CHECKSUM";
  error?: string;
  snapshot?: ValidatedBackupSnapshot;
}

export interface PruneResult {
  retained: string[];
  deleted: string[];
  preservedNonSnapshots: string[];
}

/**
 * Creates a validated backup snapshot from 5 data collections,
 * calculating deterministic SHA-256 checksum and checking safety boundaries.
 */
export function createSnapshot(
  data: SnapshotDataInput,
  options?: { checkSizeLimit?: boolean }
): SnapshotResult {
  const exportedAt = new Date().toISOString();

  // Normalize data payload
  const formattedCategories = data.categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    description: c.description ?? undefined,
    parentId: c.parentId ?? undefined,
    icon: c.icon ?? undefined,
    color: c.color ?? undefined,
    order: (c as any).order ?? undefined,
  }));

  const formattedTopics = data.topics.map((t) => ({
    id: t.id,
    title: t.title,
    slug: t.slug,
    categoryId: t.categoryId,
    type: t.type,
    parentId: t.parentId ?? undefined,
    description: t.description,
    content: t.content,
    tags: t.tags || [],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    links: (t.links || []).map((l) => ({
      id: l.id,
      sourceId: l.sourceId,
      targetId: l.targetId,
      linkType: l.linkType,
      strength: l.strength,
      notes: l.notes ?? undefined,
    })),
    studyProgress: {
      topicId: t.studyProgress?.topicId || t.id,
      status: t.studyProgress?.status || "not_started",
      progress: t.studyProgress?.progress ?? 0,
      interval: t.studyProgress?.interval ?? 0,
      easeFactor: t.studyProgress?.easeFactor ?? 2.5,
      repetitions: t.studyProgress?.repetitions ?? 0,
      totalNotes: t.studyProgress?.totalNotes ?? 0,
      timeSpent: t.studyProgress?.timeSpent ?? 0,
      startDate: t.studyProgress?.startDate ?? undefined,
      endDate: t.studyProgress?.endDate ?? undefined,
      lastStudied: t.studyProgress?.lastStudied ?? undefined,
      nextReview: t.studyProgress?.nextReview ?? undefined,
    },
  }));

  const formattedNotes = data.notes.map((n) => ({
    id: n.id,
    topicId: n.topicId,
    title: n.title,
    content: n.content,
    type: n.type,
    isPrivate: n.isPrivate ?? false,
    tags: n.tags || [],
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));

  const formattedResources = data.resources.map((r) => ({
    id: r.id,
    topicId: r.topicId,
    title: r.title,
    url: r.url ?? undefined,
    filePath: r.filePath ?? undefined,
    type: r.type,
    author: r.author ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
  }));

  const formattedTags = data.tags.map((tg) => ({
    id: tg.id,
    name: tg.name,
    slug: tg.slug,
    color: tg.color ?? undefined,
    count: tg.count ?? 0,
  }));

  const snapshotPayload = {
    categories: formattedCategories,
    topics: formattedTopics,
    notes: formattedNotes,
    resources: formattedResources,
    tags: formattedTags,
  };

  const checksum = calculateBackupChecksum(snapshotPayload);

  const rawSnapshot = {
    version: "2.0.0",
    exportedAt,
    checksum,
    counts: {
      categories: formattedCategories.length,
      topics: formattedTopics.length,
      notes: formattedNotes.length,
      resources: formattedResources.length,
      tags: formattedTags.length,
    },
    data: snapshotPayload,
  };

  const validatedSnapshot = BackupSnapshotSchema.parse(rawSnapshot);
  const jsonString = JSON.stringify(validatedSnapshot, null, 2);
  const sizeBytes = Buffer.byteLength(jsonString, "utf-8");

  const warnings: string[] = [];
  if (sizeBytes > MAX_BACKUP_SIZE || options?.checkSizeLimit) {
    if (sizeBytes > MAX_BACKUP_SIZE) {
      warnings.push(
        `BACKUP_SIZE_WARNING: Dung lượng snapshot (${(sizeBytes / (1024 * 1024)).toFixed(2)}MB) vượt ngưỡng an toàn 15MB`
      );
    }
  }

  return {
    snapshot: validatedSnapshot,
    sizeBytes,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Formats snapshot filename following pattern: snapshot-{YYYYMMDDTHHmmssZ}-{shortChecksum}.json
 */
export function formatSnapshotFilename(snapshot: ValidatedBackupSnapshot): string {
  const date = new Date(snapshot.exportedAt);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const mins = String(date.getUTCMinutes()).padStart(2, "0");
  const secs = String(date.getUTCSeconds()).padStart(2, "0");

  const timestampStr = `${year}${month}${day}T${hours}${mins}${secs}Z`;
  const shortChecksum = snapshot.checksum.slice(0, 8);

  return `snapshot-${timestampStr}-${shortChecksum}.json`;
}

/**
 * Writes snapshot file atomically using temporary file rename strategy.
 * If dryRun is enabled, validates in-memory without touching disk.
 */
export async function writeSnapshotAtomic(
  dirPath: string,
  snapshot: ValidatedBackupSnapshot,
  options?: WriteSnapshotOptions
): Promise<{ filePath?: string; written: boolean; sizeBytes: number }> {
  const jsonContent = JSON.stringify(snapshot, null, 2);
  const sizeBytes = Buffer.byteLength(jsonContent, "utf-8");

  if (options?.dryRun) {
    return {
      filePath: undefined,
      written: false,
      sizeBytes,
    };
  }

  if (options?.createDir !== false) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  const filename = formatSnapshotFilename(snapshot);
  const finalFilePath = path.join(dirPath, filename);
  const tempFilePath = path.join(
    dirPath,
    `.snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
  );

  try {
    fs.writeFileSync(tempFilePath, jsonContent, "utf-8");
    fs.renameSync(tempFilePath, finalFilePath);

    return {
      filePath: finalFilePath,
      written: true,
      sizeBytes,
    };
  } catch (error) {
    // Clean up temporary file on failure
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // ignore cleanup error
      }
    }
    throw error;
  }
}

/**
 * Verifies a snapshot file from disk for both Schema validity and SHA-256 Checksum integrity.
 */
export async function verifySnapshotFile(filePath: string): Promise<VerifyResult> {
  if (!fs.existsSync(filePath)) {
    return {
      status: "INVALID_SCHEMA",
      error: `File không tồn tại: ${filePath}`,
    };
  }

  let rawContent: string;
  try {
    rawContent = fs.readFileSync(filePath, "utf-8");
  } catch (err: any) {
    return {
      status: "INVALID_SCHEMA",
      error: `Không thể đọc file: ${err.message}`,
    };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    return {
      status: "INVALID_SCHEMA",
      error: "Tệp tin không phải định dạng JSON hợp lệ",
    };
  }

  const preflight = validateBackupSnapshotPreflight(parsedJson);
  if (!preflight.valid) {
    if (preflight.checksumMatch === false) {
      return {
        status: "INVALID_CHECKSUM",
        error: `Mã băm SHA-256 không khớp (Mong đợi: ${preflight.expectedChecksum}, Tính toán: ${preflight.calculatedChecksum})`,
      };
    }
    return {
      status: "INVALID_SCHEMA",
      error: preflight.error || "Cấu trúc không hợp chuẩn BackupSnapshotSchema",
    };
  }

  return {
    status: "VALID",
    snapshot: preflight.snapshot,
  };
}

/**
 * Prunes older snapshots in the specified directory, keeping the N latest snapshots.
 * Preserves non-snapshot files untouched.
 */
export async function pruneSnapshots(
  dirPath: string,
  retentionCount: number
): Promise<PruneResult> {
  if (!fs.existsSync(dirPath)) {
    return {
      retained: [],
      deleted: [],
      preservedNonSnapshots: [],
    };
  }

  const entries = fs.readdirSync(dirPath);
  const snapshotFiles: string[] = [];
  const preservedNonSnapshots: string[] = [];

  for (const entry of entries) {
    if (SNAPSHOT_FILENAME_REGEX.test(entry)) {
      snapshotFiles.push(entry);
    } else {
      preservedNonSnapshots.push(entry);
    }
  }

  // Sort snapshot files descending (newest first based on ISO-timestamp in filename)
  snapshotFiles.sort((a, b) => b.localeCompare(a));

  const safeRetention = Math.max(0, retentionCount);
  const retained = snapshotFiles.slice(0, safeRetention);
  const toDelete = snapshotFiles.slice(safeRetention);

  const deleted: string[] = [];
  for (const file of toDelete) {
    const fullPath = path.join(dirPath, file);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        deleted.push(file);
      }
    } catch {
      // Ignore file deletion error
    }
  }

  return {
    retained,
    deleted,
    preservedNonSnapshots,
  };
}
