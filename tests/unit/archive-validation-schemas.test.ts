import { describe, it, expect } from "vitest";
import {
  ArchivedDocumentFormatEnum,
  ArchivedDocumentCreateSchema,
  ResearchExcerptCreateSchema,
  ResearchInboxItemUpdateSchema,
  ArchiveUploadQuerySchema,
} from "../../src/lib/validation";

describe("Phase 18A Wave 1: Archive & Excerpt Validation Contracts", () => {
  describe("1. Archive Format & Upload Validation", () => {
    it("accepts valid formats: pdf, epub, md", () => {
      expect(ArchivedDocumentFormatEnum.safeParse("pdf").success).toBe(true);
      expect(ArchivedDocumentFormatEnum.safeParse("epub").success).toBe(true);
      expect(ArchivedDocumentFormatEnum.safeParse("md").success).toBe(true);
    });

    it("rejects invalid formats such as docx, mobi, txt, exe", () => {
      expect(ArchivedDocumentFormatEnum.safeParse("docx").success).toBe(false);
      expect(ArchivedDocumentFormatEnum.safeParse("mobi").success).toBe(false);
      expect(ArchivedDocumentFormatEnum.safeParse("exe").success).toBe(false);
      expect(ArchivedDocumentFormatEnum.safeParse("").success).toBe(false);
    });

    it("validates ArchivedDocumentCreateSchema with correct fields", () => {
      const validPayload = {
        fileName: "Dhammapada.pdf",
        fileSize: 1024 * 500, // 500 KB
        mimeType: "application/pdf",
        fileFormat: "pdf",
        contentHash: "a".repeat(64), // Valid 64-char SHA256 hex
        storageRelPath: "pdf/aa/Dhammapada.pdf",
      };

      const result = ArchivedDocumentCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects file exceeding max size limit (50 MB)", () => {
      const oversizedPayload = {
        fileName: "HugeBook.pdf",
        fileSize: 55 * 1024 * 1024, // 55 MB (> 50 MB)
        mimeType: "application/pdf",
        fileFormat: "pdf",
        contentHash: "b".repeat(64),
        storageRelPath: "pdf/bb/HugeBook.pdf",
      };

      const result = ArchivedDocumentCreateSchema.safeParse(oversizedPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("50MB");
      }
    });

    it("rejects dangerous filenames containing path traversal (.. or / or \\)", () => {
      const dangerousPayload = {
        fileName: "../../../etc/passwd",
        fileSize: 1024,
        mimeType: "text/markdown",
        fileFormat: "md",
        contentHash: "c".repeat(64),
        storageRelPath: "md/cc/passwd",
      };

      const result = ArchivedDocumentCreateSchema.safeParse(dangerousPayload);
      expect(result.success).toBe(false);
    });

    it("validates upload query schema for format and originalName", () => {
      const validQuery = {
        originalName: "Milinda-Panha.epub",
        fileFormat: "epub",
      };
      expect(ArchiveUploadQuerySchema.safeParse(validQuery).success).toBe(true);

      const invalidQuery = {
        originalName: "",
        fileFormat: "invalid_format",
      };
      expect(ArchiveUploadQuerySchema.safeParse(invalidQuery).success).toBe(false);
    });
  });

  describe("2. Research Excerpt Validation", () => {
    it("validates valid excerpt creation payload", () => {
      const validExcerpt = {
        archivedDocumentId: "archived-doc-uuid-1",
        selectedText: "Tâm dẫn đầu mọi pháp, tâm là chủ, tâm tạo tác.",
        highlightColor: "#F59E0B",
        positionSelector: {
          pageNumber: 14,
          charRange: [120, 168],
        },
        citationSnapshot: {
          title: "Kinh Pháp Cú",
          author: "Đức Phật",
          locator: "Phẩm Song Yêu, Kệ số 1",
          formatted: "Đức Phật. Kinh Pháp Cú, Phẩm Song Yêu.",
        },
      };

      const result = ResearchExcerptCreateSchema.safeParse(validExcerpt);
      expect(result.success).toBe(true);
    });

    it("rejects excerpt with empty selectedText", () => {
      const invalidExcerpt = {
        archivedDocumentId: "archived-doc-uuid-1",
        selectedText: "   ", // whitespace only
        positionSelector: { pageNumber: 1 },
      };

      const result = ResearchExcerptCreateSchema.safeParse(invalidExcerpt);
      expect(result.success).toBe(false);
    });

    it("rejects excerpt missing archivedDocumentId", () => {
      const invalidExcerpt = {
        selectedText: "Some valid text",
        positionSelector: { pageNumber: 1 },
      };

      const result = ResearchExcerptCreateSchema.safeParse(invalidExcerpt);
      expect(result.success).toBe(false);
    });
  });

  describe("3. Research Inbox Item Validation", () => {
    it("validates inbox item update schema", () => {
      const validUpdate = {
        isProcessed: true,
        priority: 1,
      };

      const result = ResearchInboxItemUpdateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });
  });
});
