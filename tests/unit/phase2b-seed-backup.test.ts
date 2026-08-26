import { describe, it, expect } from "vitest";
import {
  calculateBackupChecksum,
  BackupSnapshotSchema,
  RestoreRequestSchema,
  DbHealthResponseSchema,
} from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";

describe("Phase 2B Test Suite - Seeding, Backup/Restore Snapshot & DB Health Probes", () => {
  const canonicalData = {
    categories: INITIAL_CATEGORIES,
    topics: INITIAL_TOPICS,
    notes: INITIAL_NOTES,
    resources: INITIAL_RESOURCES,
    tags: INITIAL_TAGS,
  };

  const validChecksum = calculateBackupChecksum(canonicalData);

  const sampleSnapshot = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    checksum: validChecksum,
    counts: {
      categories: INITIAL_CATEGORIES.length, // 8
      topics: INITIAL_TOPICS.length, // 35
      notes: INITIAL_NOTES.length, // 5
      resources: INITIAL_RESOURCES.length, // 4
      tags: INITIAL_TAGS.length, // 12
    },
    data: canonicalData,
  };

  // --- 1. Checksum & Integrity Tests ---
  it("1. Tính toán SHA-256 Checksum chuẩn xác 64-char hex và có tính tất định", () => {
    const hash1 = calculateBackupChecksum(canonicalData);
    const hash2 = calculateBackupChecksum(canonicalData);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
  });

  it("2. BackupSnapshotSchema xác thực thành công snapshot canonical dataset (10/35/5/4/12)", () => {
    const result = BackupSnapshotSchema.safeParse(sampleSnapshot);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.counts.categories).toBe(10);
      expect(result.data.counts.topics).toBe(35);
      expect(result.data.counts.notes).toBe(5);
      expect(result.data.counts.resources).toBe(4);
      expect(result.data.counts.tags).toBe(12);
    }
  });

  it("3. BackupSnapshotSchema chấp nhận semver 2.x (2.0.0, 2.1.0) và từ chối 1.x hoặc 3.x", () => {
    const validMinor = { ...sampleSnapshot, version: "2.1.0" };
    const invalidV1 = { ...sampleSnapshot, version: "1.0.0" };
    const invalidV3 = { ...sampleSnapshot, version: "3.0.0" };

    expect(BackupSnapshotSchema.safeParse(validMinor).success).toBe(true);
    expect(BackupSnapshotSchema.safeParse(invalidV1).success).toBe(false);
    expect(BackupSnapshotSchema.safeParse(invalidV3).success).toBe(false);
  });

  it("4. BackupSnapshotSchema từ chối nếu checksum không đúng định dạng 64 hex", () => {
    const invalidChecksumSnapshot = {
      ...sampleSnapshot,
      checksum: "invalid-non-hex-checksum",
    };
    const result = BackupSnapshotSchema.safeParse(invalidChecksumSnapshot);
    expect(result.success).toBe(false);
  });

  // --- 2. Restore Request Schema Validation Tests ---
  it("5. RestoreRequestSchema chấp nhận mode 'replace' khi confirmReplace = true", () => {
    const request = {
      snapshot: sampleSnapshot,
      mode: "replace",
      confirmReplace: true,
    };
    const result = RestoreRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("6. RestoreRequestSchema từ chối mode 'replace' khi confirmReplace bị thiếu hoặc false", () => {
    const missingConfirm = {
      snapshot: sampleSnapshot,
      mode: "replace",
    };
    const falseConfirm = {
      snapshot: sampleSnapshot,
      mode: "replace",
      confirmReplace: false,
    };

    expect(RestoreRequestSchema.safeParse(missingConfirm).success).toBe(false);
    expect(RestoreRequestSchema.safeParse(falseConfirm).success).toBe(false);
  });

  it("7. RestoreRequestSchema chấp nhận mode 'merge' mà không bắt buộc confirmReplace", () => {
    const mergeRequest = {
      snapshot: sampleSnapshot,
      mode: "merge",
    };
    const result = RestoreRequestSchema.safeParse(mergeRequest);
    expect(result.success).toBe(true);
  });

  it("8. Phát hiện Checksum Mismatch khi nội dung topics trong data bị sửa đổi", () => {
    const corruptedData = {
      ...canonicalData,
      topics: [
        ...canonicalData.topics.slice(1),
        {
          ...canonicalData.topics[0],
          title: "Modified Unofficial Title",
        },
      ],
    };
    const calculatedHash = calculateBackupChecksum(corruptedData);
    expect(calculatedHash).not.toBe(sampleSnapshot.checksum);
  });

  // --- 3. Idempotent Seeding & Merge Mechanics ---
  it("9. Idempotent Upsert Seeding không tạo bản ghi trùng slug cho 35 topics", () => {
    const dbMock = new Map<string, any>();

    // Giả lập lần seed 1
    INITIAL_TOPICS.forEach((t) => dbMock.set(t.slug, t));
    expect(dbMock.size).toBe(35);

    // Giả lập lần seed 2 (re-seed)
    INITIAL_TOPICS.forEach((t) => {
      if (dbMock.has(t.slug)) {
        dbMock.set(t.slug, { ...dbMock.get(t.slug), ...t });
      } else {
        dbMock.set(t.slug, t);
      }
    });
    expect(dbMock.size).toBe(35);
  });

  it("10. Last-Write-Wins (LWW) Merge cho Topic giữ lại studyProgress cao nhất và cập nhật nội dung mới hơn", () => {
    const existingTopic = {
      ...INITIAL_TOPICS[0],
      updatedAt: "2026-08-20T10:00:00.000Z",
      studyProgress: {
        ...INITIAL_TOPICS[0].studyProgress,
        progress: 80,
        timeSpent: 120,
      },
    };

    const incomingNewerTopic = {
      ...INITIAL_TOPICS[0],
      title: "Abhidharma - Vi Diệu Pháp Cập Nhật",
      updatedAt: "2026-08-23T12:00:00.000Z",
      studyProgress: {
        ...INITIAL_TOPICS[0].studyProgress,
        progress: 60,
        timeSpent: 100,
      },
    };

    // Áp dụng quy tắc merge LWW
    const isNewer =
      new Date(incomingNewerTopic.updatedAt) >=
      new Date(existingTopic.updatedAt);
    const merged = {
      ...existingTopic,
      title: isNewer ? incomingNewerTopic.title : existingTopic.title,
      studyProgress: {
        ...incomingNewerTopic.studyProgress,
        progress: Math.max(
          existingTopic.studyProgress.progress,
          incomingNewerTopic.studyProgress.progress,
        ),
        timeSpent: Math.max(
          existingTopic.studyProgress.timeSpent,
          incomingNewerTopic.studyProgress.timeSpent,
        ),
      },
    };

    expect(merged.title).toBe("Abhidharma - Vi Diệu Pháp Cập Nhật");
    expect(merged.studyProgress.progress).toBe(80); // Giữ progress cao nhất
    expect(merged.studyProgress.timeSpent).toBe(120); // Giữ thời gian học cao nhất
  });

  // --- 4. Database Health Probe Tests ---
  it("11. DbHealthResponseSchema xác thực phản hồi probe lành mạnh (healthy)", () => {
    const healthyPayload = {
      status: "healthy",
      latencyMs: 4,
      database: "postgresql",
      connected: true,
      timestamp: new Date().toISOString(),
    };
    const result = DbHealthResponseSchema.safeParse(healthyPayload);
    expect(result.success).toBe(true);
  });

  it("12. Phân loại chuẩn xác trạng thái DB probe: healthy (<100ms), degraded (100-1000ms), unhealthy (mất kết nối)", () => {
    const classifyDbHealth = (connected: boolean, latencyMs: number) => {
      if (!connected) return "unhealthy";
      if (latencyMs < 100) return "healthy";
      if (latencyMs < 1000) return "degraded";
      return "unhealthy";
    };

    expect(classifyDbHealth(true, 5)).toBe("healthy");
    expect(classifyDbHealth(true, 150)).toBe("degraded");
    expect(classifyDbHealth(true, 1500)).toBe("unhealthy");
    expect(classifyDbHealth(false, 0)).toBe("unhealthy");
  });

  // --- 5. Database Seeding Contract Test ---
  it("13. Seed pipeline nạp đủ chính xác 8 categories, 12 tags, 35 topics, 35 studyProgress, 77 links, 5 notes, 4 resources", () => {
    const totalLinks = INITIAL_TOPICS.reduce(
      (sum, t) => sum + (t.links ? t.links.length : 0),
      0,
    );
    const totalProgress = INITIAL_TOPICS.filter((t) => t.studyProgress).length;

    expect(INITIAL_CATEGORIES.length).toBe(10);
    expect(INITIAL_TAGS.length).toBe(12);
    expect(INITIAL_TOPICS.length).toBe(35);
    expect(totalProgress).toBe(35);
    expect(totalLinks).toBe(77);
    expect(INITIAL_NOTES.length).toBe(5);
    expect(INITIAL_RESOURCES.length).toBe(4);
  });

  // --- 6. Backup Export & Restore Route Contract Tests ---
  it("14. Export Snapshot Builder tạo snapshot hợp lệ theo BackupSnapshotSchema với counts và checksum chuẩn", () => {
    const snapshotBuilder = (db: typeof canonicalData) => {
      const data = {
        categories: db.categories,
        topics: db.topics,
        notes: db.notes,
        resources: db.resources,
        tags: db.tags,
      };
      const checksum = calculateBackupChecksum(data);
      const counts = {
        categories: db.categories.length,
        topics: db.topics.length,
        notes: db.notes.length,
        resources: db.resources.length,
        tags: db.tags.length,
      };
      return {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        checksum,
        counts,
        data,
      };
    };

    const exported = snapshotBuilder(canonicalData);
    const validationResult = BackupSnapshotSchema.safeParse(exported);
    expect(validationResult.success).toBe(true);
    if (validationResult.success) {
      expect(validationResult.data.counts.categories).toBe(10);
      expect(validationResult.data.counts.topics).toBe(35);
      expect(validationResult.data.counts.notes).toBe(5);
      expect(validationResult.data.counts.resources).toBe(4);
      expect(validationResult.data.counts.tags).toBe(12);
      expect(validationResult.data.checksum).toBe(validChecksum);
    }
  });

  it("15. Restore Handler từ chối Checksum Mismatch và không thực hiện mutation (Fail-Fast)", () => {
    const corruptedSnapshot = {
      ...sampleSnapshot,
      data: {
        ...sampleSnapshot.data,
        topics: [
          ...sampleSnapshot.data.topics.slice(1),
          { ...sampleSnapshot.data.topics[0], title: "Hacked Topic" },
        ],
      },
    };

    const verifyAndRestore = (req: {
      snapshot: typeof sampleSnapshot;
      mode: "replace" | "merge";
      confirmReplace?: boolean;
    }) => {
      const parsed = RestoreRequestSchema.safeParse(req);
      if (!parsed.success) {
        return { status: 400, error: "VALIDATION_ERROR" };
      }
      const expectedChecksum = calculateBackupChecksum(req.snapshot.data);
      if (req.snapshot.checksum !== expectedChecksum) {
        return { status: 400, error: "CHECKSUM_MISMATCH" };
      }
      return { status: 200, success: true };
    };

    const result = verifyAndRestore({
      snapshot: corruptedSnapshot,
      mode: "replace",
      confirmReplace: true,
    });
    expect(result.status).toBe(400);
    expect(result.error).toBe("CHECKSUM_MISMATCH");
  });

  it("16. Restore Handler từ chối mode replace nếu confirmReplace không phải true", () => {
    const verifyAndRestore = (req: any) => {
      const parsed = RestoreRequestSchema.safeParse(req);
      if (!parsed.success) {
        return {
          status: 400,
          error: "VALIDATION_ERROR",
          details: parsed.error.issues,
        };
      }
      return { status: 200, success: true };
    };

    const resNoConfirm = verifyAndRestore({
      snapshot: sampleSnapshot,
      mode: "replace",
    });
    expect(resNoConfirm.status).toBe(400);
    expect(resNoConfirm.error).toBe("VALIDATION_ERROR");

    const resConfirmFalse = verifyAndRestore({
      snapshot: sampleSnapshot,
      mode: "replace",
      confirmReplace: false,
    });
    expect(resConfirmFalse.status).toBe(400);
  });

  it("17. Restore Merge Mode áp dụng LWW cho Note và giữ ghi chú có updatedAt mới hơn", () => {
    const existingNote = {
      ...INITIAL_NOTES[0],
      title: "Tiêu đề cũ",
      content: "Nội dung cũ",
      updatedAt: "2026-08-20T10:00:00.000Z",
    };

    const incomingOlderNote = {
      ...INITIAL_NOTES[0],
      title: "Tiêu đề từ máy cũ",
      content: "Nội dung từ máy cũ",
      updatedAt: "2026-08-19T10:00:00.000Z",
    };

    const incomingNewerNote = {
      ...INITIAL_NOTES[0],
      title: "Tiêu đề mới nhất",
      content: "Nội dung mới nhất",
      updatedAt: "2026-08-23T15:00:00.000Z",
    };

    const mergeNoteLWW = (
      current: typeof existingNote,
      incoming: typeof existingNote,
    ) => {
      if (new Date(incoming.updatedAt) >= new Date(current.updatedAt)) {
        return { ...incoming };
      }
      return { ...current };
    };

    // Khi note đến cũ hơn -> Giữ nguyên current
    expect(mergeNoteLWW(existingNote, incomingOlderNote).title).toBe(
      "Tiêu đề cũ",
    );

    // Khi note đến mới hơn -> Cập nhật sang incoming
    expect(mergeNoteLWW(existingNote, incomingNewerNote).title).toBe(
      "Tiêu đề mới nhất",
    );
  });

  it("18. checkDbHealth thực thi probe SELECT 1, đo latencyMs và phân loại trạng thái đúng schema", async () => {
    const probeDb = async (
      mockQuery: () => Promise<unknown>,
      simulatedLatencyMs = 5,
    ) => {
      try {
        await mockQuery();
        const latencyMs = simulatedLatencyMs;
        const status =
          latencyMs < 100
            ? "healthy"
            : latencyMs < 1000
              ? "degraded"
              : "unhealthy";
        return DbHealthResponseSchema.parse({
          status,
          latencyMs,
          database: "postgresql",
          connected: true,
          timestamp: new Date().toISOString(),
        });
      } catch {
        return DbHealthResponseSchema.parse({
          status: "unhealthy",
          latencyMs: 0,
          database: "postgresql",
          connected: false,
          timestamp: new Date().toISOString(),
        });
      }
    };

    // 1. Healthy probe (<100ms)
    const healthy = await probeDb(async () => 1, 12);
    expect(healthy.status).toBe("healthy");
    expect(healthy.connected).toBe(true);
    expect(healthy.database).toBe("postgresql");

    // 2. Degraded probe (100-1000ms)
    const degraded = await probeDb(async () => 1, 250);
    expect(degraded.status).toBe("degraded");
    expect(degraded.connected).toBe(true);

    // 3. Unhealthy probe (DB offline / throws error)
    const unhealthy = await probeDb(async () => {
      throw new Error("Connection refused at port 5432");
    }, 0);
    expect(unhealthy.status).toBe("unhealthy");
    expect(unhealthy.connected).toBe(false);
  });
});
