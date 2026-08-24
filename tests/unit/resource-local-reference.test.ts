/**
 * Resource Local File Reference & Web URL Schema Contract Test Suite
 *
 * ADR: ADR-011 (docs/adr/ADR-011-resource-local-file-reference.md)
 * Gherkin: docs/gherkin/resource-local-reference.feature
 * Schemas: src/lib/validation.ts (ResourceSchema, ResourceCreateSchema, ResourceUpdateSchema)
 * Types: src/types/index.ts (Resource, ResourceType)
 */

import { describe, it, expect } from "vitest";
import {
  ResourceSchema,
  ResourceCreateSchema,
  ResourceUpdateSchema,
  BackupSnapshotSchema,
  calculateBackupChecksum,
} from "../../src/lib/validation";
import {
  INITIAL_CATEGORIES,
  INITIAL_TOPICS,
  INITIAL_NOTES,
  INITIAL_RESOURCES,
  INITIAL_TAGS,
} from "../../src/data/initialData";
import { Resource } from "../../src/types";

describe("ADR-011: Resource Local File Reference & Web URL Schema Contract Tests", () => {
  // ---------------------------------------------------------------------------
  // 1. Local file reference with filePath
  // ---------------------------------------------------------------------------
  it("1. ResourceCreateSchema accepts valid local file reference with filePath", () => {
    const localResourceInput = {
      topicId: "topic-abhidharma-tong-quan",
      topicTitle: "Abhidharma - Vi Diệu Pháp Toàn Tập",
      title: "Thắng Pháp Tập Yếu Luận Bản Scan PDF",
      type: "pdf" as const,
      author: "Trưởng Lão Anuruddha",
      filePath: "/Users/mr.chem/Documents/PhatHoc/Abhidhammattha-Sangaha.pdf",
      notes: "Tệp PDF cục bộ tra cứu 89 tâm và 52 tâm sở",
    };

    const parseResult = ResourceCreateSchema.safeParse(localResourceInput);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.filePath).toBe(
        "/Users/mr.chem/Documents/PhatHoc/Abhidhammattha-Sangaha.pdf",
      );
      expect(parseResult.data.title).toBe("Thắng Pháp Tập Yếu Luận Bản Scan PDF");
      expect(parseResult.data.type).toBe("pdf");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Web URL resource
  // ---------------------------------------------------------------------------
  it("2. ResourceCreateSchema accepts valid Web URL resource", () => {
    const webResourceInput = {
      topicId: "topic-thien-vipassana",
      topicTitle: "Thiền Vipassana (Minh Sát Tuệ) & Tứ Niệm Xứ",
      title: "Đại Niệm Xứ Kinh (Mahā Satipaṭṭhāna Sutta)",
      type: "article" as const,
      author: "HT. Thích Minh Châu dịch",
      url: "https://suttacentral.net/dn22",
      notes: "Văn bản kinh điển Pali trực tuyến",
    };

    const parseResult = ResourceCreateSchema.safeParse(webResourceInput);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.url).toBe("https://suttacentral.net/dn22");
      expect(parseResult.data.type).toBe("article");
    }
  });

  // ---------------------------------------------------------------------------
  // 3. Hybrid resource with both URL and filePath
  // ---------------------------------------------------------------------------
  it("3. ResourceCreateSchema accepts hybrid resource with both URL and filePath", () => {
    const hybridInput = {
      topicId: "topic-kinh-dich",
      topicTitle: "Kinh Dịch - Đạo Biến Dịch & 64 Quẻ",
      title: "Chu Dịch Toàn Thư & Thập Dực Khảo Luận",
      type: "book" as const,
      author: "Phục Hy, Chu Văn Vương, Khổng Tử",
      url: "https://ctext.org/book-of-changes/vi",
      filePath: "/Volumes/Data/Books/KinhDich/ChuDichToanThu.pdf",
      notes: "Có cả bản đọc online và bản scan lưu trong ổ cứng",
    };

    const parseResult = ResourceCreateSchema.safeParse(hybridInput);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.url).toBe("https://ctext.org/book-of-changes/vi");
      expect(parseResult.data.filePath).toBe(
        "/Volumes/Data/Books/KinhDich/ChuDichToanThu.pdf",
      );
    }
  });

  // ---------------------------------------------------------------------------
  // 4. FAILING TEST: Source Presence Enforcement
  // ResourceCreateSchema MUST reject payloads with no url AND no filePath
  // ---------------------------------------------------------------------------
  it("4. ResourceCreateSchema FAILS when both url and filePath are missing or empty", () => {
    const missingBoth = {
      topicId: "topic-01",
      title: "Tài liệu không có nguồn",
      type: "book" as const,
    };
    const result1 = ResourceCreateSchema.safeParse(missingBoth);
    expect(result1.success).toBe(false);

    const emptyStrings = {
      topicId: "topic-01",
      title: "Tài liệu nguồn rỗng",
      type: "book" as const,
      url: "",
      filePath: "",
    };
    const result2 = ResourceCreateSchema.safeParse(emptyStrings);
    expect(result2.success).toBe(false);

    const whitespaceOnly = {
      topicId: "topic-01",
      title: "Tài liệu nguồn toàn khoảng trắng",
      type: "book" as const,
      url: "   ",
      filePath: "   ",
    };
    const result3 = ResourceCreateSchema.safeParse(whitespaceOnly);
    expect(result3.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Invariant: Zero Binary Ingestion (Metadata-only payload size)
  // ---------------------------------------------------------------------------
  it("5. Invariant: Resource payload is strictly lightweight metadata (< 2KB, no binary)", () => {
    const resource: Resource = {
      id: "res-test-01",
      topicId: "topic-ky-mon-don-giap",
      topicTitle: "Kỳ Môn Độn Giáp",
      title: "Kỳ Môn Độn Giáp Bí Kíp Toàn Thư (Bát Môn & Cửu Tinh Bàn)",
      type: "pdf",
      author: "Gia Cát Lượng",
      filePath: "/Users/mr.chem/Documents/HuyenHoc/KyMonBiKip.pdf",
      notes: "Tài liệu cổ bản tra cứu 1080 cục bàn Kỳ Môn Âm Dương Độn.",
      createdAt: new Date().toISOString(),
    };

    const serialized = JSON.stringify(resource);
    const byteSize = Buffer.byteLength(serialized, "utf8");

    expect(byteSize).toBeLessThan(2048);
    expect(serialized).not.toContain("data:application/pdf;base64");
  });

  // ---------------------------------------------------------------------------
  // 6. Backward compatibility with all 4 INITIAL_RESOURCES
  // ---------------------------------------------------------------------------
  it("6. Backward compatibility: all 4 INITIAL_RESOURCES pass ResourceSchema validation", () => {
    expect(INITIAL_RESOURCES.length).toBe(4);

    INITIAL_RESOURCES.forEach((res) => {
      const parseResult = ResourceSchema.safeParse(res);
      expect(
        parseResult.success,
        `Resource "${res.id}" failed schema validation`,
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Partial update with ResourceUpdateSchema
  // ---------------------------------------------------------------------------
  it("7. ResourceUpdateSchema allows partial updates to filePath or url", () => {
    const updateOnlyPath = {
      filePath: "/New/Path/To/Resource.pdf",
    };
    const resultPath = ResourceUpdateSchema.safeParse(updateOnlyPath);
    expect(resultPath.success).toBe(true);

    const updateOnlyUrl = {
      url: "https://new-link.org/document",
    };
    const resultUrl = ResourceUpdateSchema.safeParse(updateOnlyUrl);
    expect(resultUrl.success).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Backup Snapshot & Checksum preserves filePath integrity
  // ---------------------------------------------------------------------------
  it("8. Backup Snapshot and Checksum preserve filePath field without mutation", () => {
    const sampleResources: Resource[] = [
      ...INITIAL_RESOURCES,
      {
        id: "res-local-01",
        topicId: "topic-abhidharma-tong-quan",
        topicTitle: "Abhidharma",
        title: "Tài liệu cục bộ",
        type: "pdf",
        filePath: "/Users/test/local.pdf",
        createdAt: "2026-08-24T00:00:00.000Z",
      },
    ];

    const canonicalData = {
      categories: INITIAL_CATEGORIES,
      topics: INITIAL_TOPICS,
      notes: INITIAL_NOTES,
      resources: sampleResources,
      tags: INITIAL_TAGS,
    };

    const checksum = calculateBackupChecksum(canonicalData);

    const snapshot = {
      version: "2.0.0",
      exportedAt: "2026-08-24T00:00:00.000Z",
      checksum,
      counts: {
        categories: canonicalData.categories.length,
        topics: canonicalData.topics.length,
        notes: canonicalData.notes.length,
        resources: canonicalData.resources.length,
        tags: canonicalData.tags.length,
      },
      data: canonicalData,
    };

    const parseResult = BackupSnapshotSchema.safeParse(snapshot);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      const parsedLocalRes = parseResult.data.data.resources.find(
        (r) => r.id === "res-local-01",
      );
      expect(parsedLocalRes?.filePath).toBe("/Users/test/local.pdf");
    }
  });
});
