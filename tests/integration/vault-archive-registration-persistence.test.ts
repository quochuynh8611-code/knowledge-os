import express from "express";
import request from "supertest";
import { describe as describeSuite, it as testCase, expect as assertExpect, beforeEach as suiteBeforeEach, vi } from "vitest";
import { LocalArchiveStorage } from "../../src/lib/localArchiveStorage";
import { createArchiveRouter } from "../../src/server/routes/archiveRoutes";

describeSuite("Phase A: Vault Archive Registration & Position Persistence Integration (Red Stage)", () => {
  let mockPrisma: any;
  let app: express.Express;
  let inMemoryDocs: Record<string, any>;

  suiteBeforeEach(() => {
    inMemoryDocs = {};

    mockPrisma = {
      archivedDocument: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `archived-vault-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
          if (where.sourceKey) {
            return Object.values(inMemoryDocs).find((d: any) => d.sourceKey === where.sourceKey) || null;
          }
          return null;
        }),
        findFirst: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inMemoryDocs[where.id] || null;
          if (where.sourceKey) {
            return Object.values(inMemoryDocs).find((d: any) => d.sourceKey === where.sourceKey) || null;
          }
          if (where.contentHash) {
            return Object.values(inMemoryDocs).find((d: any) => d.contentHash === where.contentHash) || null;
          }
          return null;
        }),
        findMany: vi.fn().mockImplementation(async () => {
          return Object.values(inMemoryDocs);
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const doc = inMemoryDocs[where.id] || Object.values(inMemoryDocs).find((d: any) => d.id === where.id);
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
    app.use(express.json());
    app.use("/api", createArchiveRouter({ prisma: mockPrisma }));
  });

  // ── Nhóm A: Archive registration for Vault ─────────────────────────────────

  testCase("should_register_vault_markdown_document_idempotently", async () => {
    const res = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "01_Notes/Kien-truc-he-thong.md",
        fileName: "Kien-truc-he-thong.md",
        fileFormat: "md",
        fileSize: 4096,
      });

    assertExpect(res.status).toBe(200);
    assertExpect(res.body.success).toBe(true);
    assertExpect(res.body.document).toBeDefined();
    assertExpect(res.body.document.id).toBeDefined();
    assertExpect(res.body.document.sourceType).toBe("vault");
    assertExpect(res.body.document.sourcePath).toBe("01_Notes/Kien-truc-he-thong.md");
    assertExpect(res.body.document.sourceKey).toBe("vault:01_Notes/Kien-truc-he-thong.md");
    // Quy ước an toàn storageRelPath ảo cho Vault: không trỏ nhầm vào LocalArchiveStorage
    assertExpect(res.body.document.storageRelPath).toBe("vault://01_Notes/Kien-truc-he-thong.md");
    // Synthetic deterministic hash for schema compatibility
    assertExpect(res.body.document.contentHash).toBeDefined();
    assertExpect(res.body.document.contentHash.length).toBe(64);
  });

  testCase("should_register_vault_epub_document_idempotently", async () => {
    const res = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "05_EPUB_Export/thien_dinh.epub",
        fileName: "thien_dinh.epub",
        fileFormat: "epub",
        fileSize: 1048576,
      });

    assertExpect(res.status).toBe(200);
    assertExpect(res.body.success).toBe(true);
    assertExpect(res.body.document.fileFormat).toBe("epub");
    assertExpect(res.body.document.sourceKey).toBe("vault:05_EPUB_Export/thien_dinh.epub");
  });

  testCase("should_return_existing_document_when_sourceKey_already_exists", async () => {
    // Register first time
    const res1 = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "Books/Triet-hoc.md",
        fileFormat: "md",
      });
    assertExpect(res1.status).toBe(200);
    const firstDocId = res1.body.document.id;

    // Register second time with same vault path
    const res2 = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "Books/Triet-hoc.md",
        fileFormat: "md",
      });
    assertExpect(res2.status).toBe(200);
    assertExpect(res2.body.document.id).toBe(firstDocId);
    assertExpect(res2.body.document.sourceKey).toBe("vault:Books/Triet-hoc.md");
  });

  testCase("should_not_duplicate_records_for_same_vault_path", async () => {
    await request(app).post("/api/archive/vault/register").send({ path: "Docs/SOP.md", fileFormat: "md" });
    await request(app).post("/api/archive/vault/register").send({ path: "Docs/SOP.md", fileFormat: "md" });
    await request(app).post("/api/archive/vault/register").send({ path: "Docs/SOP.md", fileFormat: "md" });

    const allDocs = Object.values(inMemoryDocs);
    const sopDocs = allDocs.filter((d: any) => d.sourceKey === "vault:Docs/SOP.md");
    assertExpect(sopDocs.length).toBe(1);
  });

  // ── Nhóm C: Position persistence for Vault ─────────────────────────────────

  testCase("should_persist_markdown_position_for_registered_vault_document", async () => {
    const regRes = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "Research/Ai-Agents.md",
        fileFormat: "md",
      });
    assertExpect(regRes.status).toBe(200);
    const docId = regRes.body.document.id;

    // Update position via official PATCH route using real UUID
    const patchRes = await request(app)
      .patch(`/api/archive/document/${encodeURIComponent(docId)}/position`)
      .send({
        lastPosition: {
          headingId: "kien-truc-agent",
          updatedAt: new Date().toISOString(),
        },
      });

    assertExpect(patchRes.status).toBe(200);
    assertExpect(patchRes.body.document.lastPosition.headingId).toBe("kien-truc-agent");
    assertExpect(patchRes.body.document.sourceType).toBe("vault");
  });

  testCase("should_persist_epub_position_for_registered_vault_document", async () => {
    const regRes = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "Books/kinh_kim_cang.epub",
        fileFormat: "epub",
      });
    assertExpect(regRes.status).toBe(200);
    const docId = regRes.body.document.id;

    const patchRes = await request(app)
      .patch(`/api/archive/document/${encodeURIComponent(docId)}/position`)
      .send({
        lastPosition: {
          cfi: "epubcfi(/6/8[chap3]!/4/2/10)",
          updatedAt: new Date().toISOString(),
        },
      });

    assertExpect(patchRes.status).toBe(200);
    assertExpect(patchRes.body.document.lastPosition.cfi).toBe("epubcfi(/6/8[chap3]!/4/2/10)");
  });

  testCase("should_update_lastReadAt_and_readCount_for_vault_document", async () => {
    const regRes = await request(app)
      .post("/api/archive/vault/register")
      .send({
        path: "Study/Y-hoc.md",
        fileFormat: "md",
      });
    const docId = regRes.body.document.id;

    await request(app)
      .patch(`/api/archive/document/${encodeURIComponent(docId)}/position`)
      .send({
        lastPosition: { headingId: "muc-1" },
      });

    const secondPatch = await request(app)
      .patch(`/api/archive/document/${encodeURIComponent(docId)}/position`)
      .send({
        lastPosition: { headingId: "muc-2" },
      });

    assertExpect(secondPatch.status).toBe(200);
    // Preserves Slice 2 semantics: readCount starts at 1 on open/register and increments with each position patch
    assertExpect(secondPatch.body.document.readCount).toBe(3);
    assertExpect(secondPatch.body.document.lastReadAt).toBeDefined();
  });
});
