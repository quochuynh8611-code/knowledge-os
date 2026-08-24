import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  createSnapshot,
  formatSnapshotFilename,
  writeSnapshotAtomic,
  verifySnapshotFile,
  pruneSnapshots,
  SnapshotDataInput,
  SnapshotResult,
  VerifyResult,
} from "../../src/lib/snapshotManager";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";
import { calculateBackupChecksum } from "../../src/lib/validation";

describe("Workstream 5C: Automated Snapshot Maintenance & Headless Backup Core", () => {
  let tempDir: string;

  const mockSnapshotData: SnapshotDataInput = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };

  beforeEach(() => {
    // Create an isolated temp directory for file operations
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-os-backup-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("1. createSnapshot & formatSnapshotFilename", () => {
    it("creates a valid snapshot with metadata header, deterministic checksum, and counts", () => {
      const result: SnapshotResult = createSnapshot(mockSnapshotData);

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.version).toBe("2.0.0");
      expect(result.snapshot.exportedAt).toBeDefined();

      // Counts match collections
      expect(result.snapshot.counts.categories).toBe(INITIAL_CATEGORIES.length);
      expect(result.snapshot.counts.topics).toBe(INITIAL_TOPICS.length);
      expect(result.snapshot.counts.notes).toBe(INITIAL_NOTES.length);
      expect(result.snapshot.counts.resources).toBe(INITIAL_RESOURCES.length);
      expect(result.snapshot.counts.tags).toBe(INITIAL_TAGS.length);

      // Checksum matches canonical calculation on snapshot data
      const calculatedChecksum = calculateBackupChecksum(result.snapshot.data);
      expect(result.snapshot.checksum).toBe(calculatedChecksum);
      expect(result.snapshot.checksum).toMatch(/^[a-f0-9]{64}$/);

      // Size is non-negative
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it("formats snapshot filename adhering strictly to naming pattern snapshot-{timestamp}-{shortChecksum}.json", () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const filename = formatSnapshotFilename(snapshot);

      // Format: snapshot-YYYYMMDDTHHmmssZ-xxxxxxxx.json
      const pattern = /^snapshot-\d{8}T\d{6}Z-[a-f0-9]{8}\.json$/;
      expect(filename).toMatch(pattern);
      expect(filename.endsWith(`-${snapshot.checksum.slice(0, 8)}.json`)).toBe(true);
    });

    it("emits size warning when snapshot payload exceeds 15MB limit", () => {
      // Create artificial large content
      const largeDescription = "X".repeat(16 * 1024 * 1024); // 16MB
      const largeData: SnapshotDataInput = {
        ...mockSnapshotData,
        topics: [
          ...mockSnapshotData.topics,
          {
            id: "large-topic",
            title: "Large Topic",
            slug: "large-topic",
            type: "phat-hoc",
            categoryId: "cat-1",
            description: largeDescription,
            content: "",
            tags: [],
            links: [],
            studyProgress: {
              topicId: "large-topic",
              status: "not_started",
              progress: 0,
              interval: 0,
              easeFactor: 2.5,
              repetitions: 0,
              totalNotes: 0,
              timeSpent: 0,
            },
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
        ],
      };

      const result = createSnapshot(largeData, { checkSizeLimit: true });
      expect(result.warnings).toBeDefined();
      expect(
        result.warnings?.some((w) => w.includes("15MB") || w.includes("MAX_BACKUP_SIZE"))
      ).toBe(true);
    });
  });

  describe("2. writeSnapshotAtomic & Dry-Run Mode", () => {
    it("writes snapshot file atomically using temp file and renameSync", async () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const result = await writeSnapshotAtomic(tempDir, snapshot);

      expect(result.written).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath!)).toBe(true);

      // Verify no dangling .tmp files in directory
      const tempFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith(".tmp"));
      expect(tempFiles.length).toBe(0);

      // Verify file content
      const content = JSON.parse(fs.readFileSync(result.filePath!, "utf-8"));
      expect(content.checksum).toBe(snapshot.checksum);
    });

    it("does not write physical file to disk when dryRun mode is enabled", async () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const result = await writeSnapshotAtomic(tempDir, snapshot, { dryRun: true });

      expect(result.written).toBe(false);
      expect(result.filePath).toBeUndefined();

      // No files created in tempDir
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBe(0);
    });

    it("cleans up temporary .tmp file if writing process encounters an error", async () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const invalidDir = path.join(tempDir, "non-existent-sub-dir", "nested");

      await expect(
        writeSnapshotAtomic(invalidDir, snapshot, { createDir: false })
      ).rejects.toThrow();

      // Ensure no .tmp left behind
      if (fs.existsSync(tempDir)) {
        const tempFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith(".tmp"));
        expect(tempFiles.length).toBe(0);
      }
    });
  });

  describe("3. verifySnapshotFile", () => {
    it("returns VALID for an authentic, unmodified snapshot file", async () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const writeResult = await writeSnapshotAtomic(tempDir, snapshot);

      const verifyResult: VerifyResult = await verifySnapshotFile(writeResult.filePath!);
      expect(verifyResult.status).toBe("VALID");
      expect(verifyResult.snapshot).toBeDefined();
      expect(verifyResult.snapshot?.checksum).toBe(snapshot.checksum);
    });

    it("returns INVALID_CHECKSUM when snapshot data has been altered without updating checksum", async () => {
      const { snapshot } = createSnapshot(mockSnapshotData);
      const writeResult = await writeSnapshotAtomic(tempDir, snapshot);

      // Tamper file content (modify category name)
      const raw = JSON.parse(fs.readFileSync(writeResult.filePath!, "utf-8"));
      raw.data.categories[0].name = "Tampered Category Name";
      fs.writeFileSync(writeResult.filePath!, JSON.stringify(raw, null, 2), "utf-8");

      const verifyResult: VerifyResult = await verifySnapshotFile(writeResult.filePath!);
      expect(verifyResult.status).toBe("INVALID_CHECKSUM");
      expect(verifyResult.error).toContain("SHA-256");
    });

    it("returns INVALID_SCHEMA when snapshot file structure violates BackupSnapshotSchema", async () => {
      const invalidFilePath = path.join(tempDir, "invalid-schema.json");
      fs.writeFileSync(
        invalidFilePath,
        JSON.stringify({ version: "1.0.0", invalidField: true }),
        "utf-8"
      );

      const verifyResult: VerifyResult = await verifySnapshotFile(invalidFilePath);
      expect(verifyResult.status).toBe("INVALID_SCHEMA");
      expect(verifyResult.error).toBeDefined();
    });
  });

  describe("4. pruneSnapshots & Retention Policy", () => {
    it("safely prunes older snapshot files, keeps N latest snapshots, and preserves non-snapshot files", async () => {
      // Create 5 mock snapshot files with different timestamps
      const timestamps = [
        "20260820T100000Z",
        "20260821T100000Z",
        "20260822T100000Z",
        "20260823T100000Z",
        "20260824T100000Z",
      ];

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const filename = `snapshot-${ts}-a1b2c3d${i}.json`;
        fs.writeFileSync(path.join(tempDir, filename), JSON.stringify({ mock: true }));
      }

      // Create non-snapshot files that must NEVER be touched
      fs.writeFileSync(path.join(tempDir, "notes.txt"), "Important notes");
      fs.writeFileSync(path.join(tempDir, ".gitkeep"), "");

      // Prune with retention count = 3 (keep 3 newest, delete 2 oldest)
      const pruneResult = await pruneSnapshots(tempDir, 3);

      expect(pruneResult.retained.length).toBe(3);
      expect(pruneResult.deleted.length).toBe(2);

      // Verify the 2 oldest were deleted
      expect(pruneResult.deleted).toContain("snapshot-20260820T100000Z-a1b2c3d0.json");
      expect(pruneResult.deleted).toContain("snapshot-20260821T100000Z-a1b2c3d1.json");

      // Verify the 3 newest are retained
      expect(pruneResult.retained).toContain("snapshot-20260822T100000Z-a1b2c3d2.json");
      expect(pruneResult.retained).toContain("snapshot-20260823T100000Z-a1b2c3d3.json");
      expect(pruneResult.retained).toContain("snapshot-20260824T100000Z-a1b2c3d4.json");

      // Verify non-snapshot files are preserved untouched
      expect(fs.existsSync(path.join(tempDir, "notes.txt"))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, ".gitkeep"))).toBe(true);
      expect(pruneResult.preservedNonSnapshots).toContain("notes.txt");
    });
  });
});
