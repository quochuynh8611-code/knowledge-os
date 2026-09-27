import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import fs from "fs";
import path from "path";
import os from "os";
import { LocalArchiveStorage } from "../../src/lib/localArchiveStorage";
import { createArchiveRouter } from "../../src/server/routes/archiveRoutes";

describe("Phase 18A Wave 1: Archive Express Router Integration Tests", () => {
  let tempArchiveDir: string;
  let storage: LocalArchiveStorage;
  let mockPrisma: any;
  let app: express.Express;

  beforeEach(() => {
    tempArchiveDir = fs.mkdtempSync(path.join(os.tmpdir(), "archive-routes-test-"));
    storage = new LocalArchiveStorage({ archiveRoot: tempArchiveDir });

    const inMemoryDocs: Record<string, any> = {};

    mockPrisma = {
      archivedDocument: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `archived-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          };
          inMemoryDocs[record.id] = record;
          return record;
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inMemoryDocs[where.id] || null;
          return null;
        }),
        // findFirst used for contentHash fallback lookup in GET /archive/file/:id
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          if (where.contentHash) {
            return Object.values(inMemoryDocs).find((d: any) => d.contentHash === where.contentHash) || null;
          }
          return null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return Object.values(inMemoryDocs);
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

  it("1. POST /api/archive/upload stores binary file and creates ArchivedDocument record", async () => {
    const fileBuffer = Buffer.from("# Khảo cứu Vi Diệu Pháp\n\nNội dung khảo cứu chi tiết.");

    const res = await request(app)
      .post("/api/archive/upload?originalName=Vi-Dieu-Phap.md&fileFormat=md")
      .set("Content-Type", "text/markdown")
      .send(fileBuffer);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.document).toBeDefined();
    expect(res.body.document.fileName).toBe("Vi-Dieu-Phap.md");
    expect(res.body.document.fileFormat).toBe("md");
    expect(res.body.document.fileSize).toBe(fileBuffer.byteLength);
    expect(res.body.document.contentHash).toBeDefined();
    expect(res.body.document.id).toBeDefined();

    // Verify does NOT leak absolute system path in response
    expect(JSON.stringify(res.body)).not.toContain(tempArchiveDir);
  });

  it("2. POST /api/archive/upload rejects unsupported file format with 400", async () => {
    const dummyBuffer = Buffer.from("Binary executable content");

    const res = await request(app)
      .post("/api/archive/upload?originalName=Malware.exe&fileFormat=exe")
      .set("Content-Type", "application/octet-stream")
      .send(dummyBuffer);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_FORMAT");
  });

  it("3. POST /api/archive/upload rejects path traversal in originalName with 400", async () => {
    const content = Buffer.from("Some content");

    const res = await request(app)
      .post("/api/archive/upload?originalName=../../../dangerous.md&fileFormat=md")
      .set("Content-Type", "text/markdown")
      .send(content);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_FILENAME");
  });

  it("4. GET /api/archive/file/:id streams binary file with correct Content-Type", async () => {
    // 1. Upload a file first
    const pdfContent = Buffer.from("%PDF-1.4 Mock PDF stream content");
    const uploadRes = await request(app)
      .post("/api/archive/upload?originalName=Sample.pdf&fileFormat=pdf")
      .set("Content-Type", "application/pdf")
      .send(pdfContent);

    expect(uploadRes.status).toBe(201);
    const docId = uploadRes.body.document.id;

    // 2. Stream it back
    const streamRes = await request(app).get(`/api/archive/file/${docId}`);
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers["content-type"]).toContain("application/pdf");
    expect(streamRes.body).toEqual(pdfContent);
  });

  it("5. GET /api/archive/file/:id returns 404 for non-existent document id", async () => {
    const res = await request(app).get("/api/archive/file/non-existent-doc-id");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("DOCUMENT_NOT_FOUND");
  });

  it("6. GET /api/archive/list returns list of archived documents", async () => {
    // Upload 1 document
    const mdContent = Buffer.from("# Topic 1");
    await request(app)
      .post("/api/archive/upload?originalName=Topic.md&fileFormat=md")
      .set("Content-Type", "text/markdown")
      .send(mdContent);

    const listRes = await request(app).get("/api/archive/list");
    expect(listRes.status).toBe(200);
    expect(listRes.body.documents).toBeInstanceOf(Array);
    expect(listRes.body.documents.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.total).toBeGreaterThanOrEqual(1);
  });

  // ── New Tests: contentHash fallback lookup ────────────────────────────────

  // Scenario: Client resolver routes archive hash path as /api/archive/file/<contentHash>
  // The :id param is a SHA-256 hash (64 hex chars), NOT a UUID.
  // Backend must fall back to findFirst({ where: { contentHash } }) when findUnique by id
  // returns null (as it will, since id is a UUID, not the hash).

  it("7. [FAILING] GET /api/archive/file/:contentHash streams file when :id is a SHA-256 contentHash (not UUID)", async () => {
    // Given: an uploaded EPUB file — we capture its contentHash from the upload response
    const epubContent = Buffer.from("PK\x03\x04MockEpubContent");
    const uploadRes = await request(app)
      .post("/api/archive/upload?originalName=Luan-Giai-Tu-Vi.epub&fileFormat=epub")
      .set("Content-Type", "application/epub+zip")
      .send(epubContent);

    expect(uploadRes.status).toBe(201);
    const contentHash = uploadRes.body.document.contentHash;
    const docId = uploadRes.body.document.id;

    // Sanity: contentHash is NOT the same as the UUID id
    expect(contentHash).not.toBe(docId);
    expect(contentHash).toHaveLength(64); // SHA-256 hex

    // When: client fetches /api/archive/file/<contentHash>  (NOT the UUID id)
    // This is exactly what resolveResourceReaderDescriptor now produces for hashed archive paths.
    // BEFORE fix: returns 404 (findUnique({ where: { id: contentHash } }) finds nothing)
    // AFTER fix:  returns 200 (fallback findFirst({ where: { contentHash } }) finds the doc)
    const streamRes = await request(app).get(`/api/archive/file/${contentHash}`);

    // Status 200 and correct Content-Type prove the fallback lookup succeeded.
    // Note: supertest does not auto-parse application/epub+zip as Buffer — binary body
    // integrity is covered by test 4 (PDF), which uses the same streaming code path.
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers["content-type"]).toContain("application/epub+zip");
    expect(streamRes.headers["content-length"]).toBeDefined();
  });


  it("8. [FAILING] GET /api/archive/file/:contentHash serves MD file via contentHash fallback", async () => {
    // Given: an uploaded markdown file
    const mdContent = Buffer.from("# 00 Dashboard Phat Hoc\n\nNội dung bài học Phật Học.");
    const uploadRes = await request(app)
      .post("/api/archive/upload?originalName=00_Dashboard_Phat_Hoc.md&fileFormat=md")
      .set("Content-Type", "text/markdown")
      .send(mdContent);

    expect(uploadRes.status).toBe(201);
    const contentHash = uploadRes.body.document.contentHash;

    // When: client fetches by contentHash
    const streamRes = await request(app).get(`/api/archive/file/${contentHash}`);

    // BEFORE fix: 404; AFTER fix: 200 with correct Content-Type
    expect(streamRes.status).toBe(200);
    expect(streamRes.headers["content-type"]).toContain("text/markdown");
  });

  it("9. GET /api/archive/file/:id returns 404 when neither UUID id nor contentHash match (both lookups fail)", async () => {
    // Given: no uploaded documents
    const nonExistentHash = "a".repeat(64);

    const res = await request(app).get(`/api/archive/file/${nonExistentHash}`);

    // Both findUnique by id AND findFirst by contentHash return null → 404
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("DOCUMENT_NOT_FOUND");
  });
});
