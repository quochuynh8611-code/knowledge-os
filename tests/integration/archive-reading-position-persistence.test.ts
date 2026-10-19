import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalArchiveStorage } from "../../src/lib/localArchiveStorage";
import { createArchiveRouter } from "../../src/server/routes/archiveRoutes";

describe("Phase 18B: Archive Reading Position Persistence Tests", () => {
  let tempArchiveDir: string;
  let storage: LocalArchiveStorage;
  let mockPrisma: any;
  let app: express.Express;
  let inMemoryDocs: Record<string, any>;

  beforeEach(() => {
    tempArchiveDir = fs.mkdtempSync(path.join(os.tmpdir(), "archive-reading-test-"));
    storage = new LocalArchiveStorage({ archiveRoot: tempArchiveDir });
    inMemoryDocs = {};

    mockPrisma = {
      archivedDocument: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `archived-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastReadAt: null,
            readCount: 0,
            ...data,
          };
          inMemoryDocs[record.id] = record;
          return record;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inMemoryDocs[where.id] || null;
          return null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inMemoryDocs[where.id] || null;
          if (where.contentHash) {
            return Object.values(inMemoryDocs).find((d: any) => d.contentHash === where.contentHash) || null;
          }
          return null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return Object.values(inMemoryDocs);
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const doc = inMemoryDocs[where.id] || Object.values(inMemoryDocs).find((d: any) => d.contentHash === where.id);
          if (!doc) throw new Error("Record to update not found");
          const updated = {
            ...doc,
            ...data,
            readCount: (doc.readCount || 0) + (data.readCount?.increment ? 1 : 0),
            updatedAt: new Date(),
          };
          inMemoryDocs[doc.id] = updated;
          return updated;
        }),
      },
    };

    app = express();
    app.use(express.json({ limit: "15mb" }));
    app.use(express.raw({ type: ["application/pdf", "application/epub+zip", "text/markdown", "application/octet-stream"], limit: "50mb" }));
    app.use("/api", createArchiveRouter({ prisma: mockPrisma, storage }));
  });

  afterEach(() => {
    if (fs.existsSync(tempArchiveDir)) {
      fs.rmSync(tempArchiveDir, { recursive: true, force: true });
    }
  });

  it("should_update_lastPosition_for_markdown_document", async () => {
    // 1. Setup existing markdown doc
    const doc = await mockPrisma.archivedDocument.create({
      data: {
        id: "doc-md-001",
        fileName: "research_notes.md",
        fileSize: 1200,
        mimeType: "text/markdown",
        fileFormat: "md",
        contentHash: "a".repeat(64),
        storageRelPath: "md/aa/research_notes.md",
      },
    });

    const positionPayload = {
      lastPosition: {
        headingId: "chuong-2-phuong-phap",
        percentage: 42,
        updatedAt: new Date().toISOString(),
      },
    };

    const res = await request(app)
      .patch(`/api/archive/document/${doc.id}/position`)
      .send(positionPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.document.lastPosition).toBeDefined();
    expect(res.body.document.lastPosition.headingId).toBe("chuong-2-phuong-phap");
    expect(res.body.document.lastPosition.percentage).toBe(42);
  });

  it("should_update_lastPosition_for_epub_document", async () => {
    // 1. Setup existing epub doc
    const doc = await mockPrisma.archivedDocument.create({
      data: {
        id: "doc-epub-001",
        fileName: "thien_dinh.epub",
        fileSize: 50000,
        mimeType: "application/epub+zip",
        fileFormat: "epub",
        contentHash: "b".repeat(64),
        storageRelPath: "epub/bb/thien_dinh.epub",
      },
    });

    const positionPayload = {
      lastPosition: {
        cfi: "epubcfi(/6/14[ch07]!/4/2/10:48)",
        percentage: 75,
        updatedAt: new Date().toISOString(),
      },
    };

    const res = await request(app)
      .patch(`/api/archive/document/${doc.id}/position`)
      .send(positionPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.document.lastPosition.cfi).toBe("epubcfi(/6/14[ch07]!/4/2/10:48)");
    expect(res.body.document.lastPosition.percentage).toBe(75);
  });

  it("should_preserve_existing_archive_fields_when_saving_reader_state", async () => {
    const doc = await mockPrisma.archivedDocument.create({
      data: {
        id: "doc-immutable-001",
        fileName: "original_name.epub",
        fileSize: 45000,
        mimeType: "application/epub+zip",
        fileFormat: "epub",
        contentHash: "c".repeat(64),
        storageRelPath: "epub/cc/original_name.epub",
      },
    });

    const res = await request(app)
      .patch(`/api/archive/document/${doc.id}/position`)
      .send({
        lastPosition: {
          cfi: "epubcfi(/6/4!/4/2:0)",
          percentage: 10,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.document.id).toBe("doc-immutable-001");
    expect(res.body.document.fileName).toBe("original_name.epub");
    expect(res.body.document.contentHash).toBe("c".repeat(64));
    expect(res.body.document.storageRelPath).toBe("epub/cc/original_name.epub");
    expect(res.body.document.fileSize).toBe(45000);
  });

  it("should_not_duplicate_same_document_state_updates", async () => {
    const doc = await mockPrisma.archivedDocument.create({
      data: {
        id: "doc-idempotent-001",
        fileName: "book.epub",
        fileSize: 20000,
        mimeType: "application/epub+zip",
        fileFormat: "epub",
        contentHash: "d".repeat(64),
        storageRelPath: "epub/dd/book.epub",
      },
    });

    // Update 1
    await request(app)
      .patch(`/api/archive/document/${doc.id}/position`)
      .send({
        lastPosition: { cfi: "epubcfi(/6/2!/4/1:0)", percentage: 5 },
      });

    // Update 2
    await request(app)
      .patch(`/api/archive/document/${doc.id}/position`)
      .send({
        lastPosition: { cfi: "epubcfi(/6/4!/4/2:0)", percentage: 12 },
      });

    const allDocs = await mockPrisma.archivedDocument.findMany({});
    expect(allDocs.length).toBe(1);
    expect(allDocs[0].lastPosition.cfi).toBe("epubcfi(/6/4!/4/2:0)");
  });
});
