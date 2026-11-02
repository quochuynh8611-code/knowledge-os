/**
 * Test Suite: Isolated DB Round-Trip & Concurrency Verification
 *
 * STATUS: PREPARED BUT NOT EXECUTED (PENDING HUMAN GATE APPROVAL FOR DB PROVISIONING).
 *
 * SAFETY INVARIANTS:
 * 1. Skipped automatically in normal test runs when `TEST_DB_ALLOW_MUTATION !== 'true'`.
 * 2. Uses `createIsolatedTestDbClient` (driver adapter pattern for Prisma 7).
 * 3. Never mutates live `knowledge_os` database.
 *
 * SCENARIOS DEFINED:
 * 1. Baseline Schema Verification: Ensures table exists and structure matches pre-rehearsal state.
 * 2. Migration Rehearsal Verification: Verifies column `openTarget` presence and nullable type.
 * 3. CRUD Round-Trip via Route: INSERT -> SELECT -> UPDATE (explicit null) -> SELECT -> UPDATE (trim).
 * 4. Omitted Semantics Round-Trip: Update without openTarget preserves existing value.
 * 5. Concurrent Stable-ID Race Gate: Two simultaneous POST requests with identical stable ID.
 *    Expectation: Both succeed (HTTP 200/201), exact 1 record exists in DB.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import {
  createIsolatedTestDbClient,
  type IsolatedTestDbContext,
} from "../helpers/testDbClientFactory";
import { type TestDbTargetConfig } from "../helpers/testDbGuard";
import { createResourceRouter } from "../../src/server/routes/resourceRoutes";

const isOptedIn = process.env.TEST_DB_ALLOW_MUTATION === "true";

// Expected dedicated target config
const dedicatedTargetConfig: TestDbTargetConfig = {
  expectedHost: process.env.TEST_DB_EXPECTED_HOST || "localhost",
  expectedPort: process.env.TEST_DB_EXPECTED_PORT
    ? parseInt(process.env.TEST_DB_EXPECTED_PORT, 10)
    : 5432,
  expectedDatabase:
    process.env.TEST_DB_EXPECTED_DATABASE || "knowledge_os_disposable_test",
  expectedSchema: process.env.TEST_DB_EXPECTED_SCHEMA || "public",
  expectedRole: process.env.TEST_DB_EXPECTED_ROLE || "test_runner",
  connectTimeoutMs: 3000,
};

describe.skipIf(!isOptedIn)(
  "Slice 1 Isolated PostgreSQL Round-Trip & Concurrency Gate [REQUIRES DEDICATED DB]",
  () => {
    let testCtx: IsolatedTestDbContext;
    let app: express.Express;

    beforeAll(async () => {
      testCtx = await createIsolatedTestDbClient(dedicatedTargetConfig);
      app = express();
      app.use(express.json());
      app.use("/api", createResourceRouter(testCtx.prisma));

      // Seed dữ liệu cha (Category -> Topic) bằng test Prisma client để thỏa mãn Foreign Key Resource_topicId_fkey
      await testCtx.prisma.category.create({
        data: {
          id: "cat-pg-test",
          name: "Danh mục kiểm thử DB",
          slug: "danh-muc-kiem-thu-db",
          type: "custom",
          description: "Dành riêng cho kiểm thử tích hợp DB",
        },
      });

      await testCtx.prisma.topic.create({
        data: {
          id: "topic-pg-test",
          categoryId: "cat-pg-test",
          title: "Chủ đề kiểm thử DB",
          slug: "chu-de-kiem-thu-db",
          type: "custom",
          description: "Dành riêng cho kiểm thử tích hợp DB",
        },
      });
    });

    afterAll(async () => {
      if (testCtx) {
        await testCtx.disconnect();
      }
    });

    it("1. Baseline & Migration Check: Column openTarget exists with type text and nullable", async () => {
      const columnInfo = await testCtx.pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'Resource' AND column_name = 'openTarget';
      `);

      expect(columnInfo.rows).toHaveLength(1);
      expect(columnInfo.rows[0].column_name).toBe("openTarget");
      expect(columnInfo.rows[0].data_type).toBe("text");
      expect(columnInfo.rows[0].is_nullable).toBe("YES");
    });

    it("2. INSERT -> SELECT -> UPDATE (explicit null) -> SELECT round-trip", async () => {
      const insertPayload = {
        id: "res-pg-001",
        topicId: "topic-pg-test",
        title: "Tài liệu kiểm thử round-trip",
        type: "pdf",
        filePath: "02_PDF_Source/test.pdf",
        openTarget: "  archive://doc-initial-target  ",
      };

      const resInsert = await request(app)
        .post("/api/resources")
        .send(insertPayload);

      expect(resInsert.status).toBe(201);
      expect(resInsert.body.openTarget).toBe("archive://doc-initial-target");

      // Verify direct SQL persistence
      const sqlCheck1 = await testCtx.pool.query(
        'SELECT "id", "openTarget" FROM "Resource" WHERE "id" = $1',
        ["res-pg-001"]
      );
      expect(sqlCheck1.rows[0].openTarget).toBe("archive://doc-initial-target");

      // Update explicit null
      const resUpdateNull = await request(app)
        .post("/api/resources")
        .send({
          id: "res-pg-001",
          topicId: "topic-pg-test",
          title: "Tài liệu kiểm thử round-trip",
          type: "pdf",
          filePath: "02_PDF_Source/test.pdf",
          openTarget: null,
        });

      expect(resUpdateNull.status).toBe(200);
      expect(resUpdateNull.body.openTarget).toBeNull();

      // Verify direct SQL persistence of NULL
      const sqlCheck2 = await testCtx.pool.query(
        'SELECT "id", "openTarget" FROM "Resource" WHERE "id" = $1',
        ["res-pg-001"]
      );
      expect(sqlCheck2.rows[0].openTarget).toBeNull();
    });

    it("3. Omitted openTarget preserves existing value in live DB", async () => {
      await testCtx.pool.query(
        'INSERT INTO "Resource" ("id", "topicId", "title", "type", "filePath", "openTarget") VALUES ($1, $2, $3, $4, $5, $6)',
        [
          "res-pg-002",
          "topic-pg-test",
          "Tài liệu trước update",
          "book",
          "path.pdf",
          "obsidian://vault/file",
        ]
      );

      const resOmitted = await request(app)
        .post("/api/resources")
        .send({
          id: "res-pg-002",
          topicId: "topic-pg-test",
          title: "Tài liệu sau update",
          type: "book",
          filePath: "path.pdf",
          // openTarget omitted
        });

      expect(resOmitted.status).toBe(200);

      const sqlCheck = await testCtx.pool.query(
        'SELECT "title", "openTarget" FROM "Resource" WHERE "id" = $1',
        ["res-pg-002"]
      );
      expect(sqlCheck.rows[0].title).toBe("Tài liệu sau update");
      expect(sqlCheck.rows[0].openTarget).toBe("obsidian://vault/file");
    });

    it("4. Concurrent Stable-ID Race Gate: Two simultaneous POST requests with identical stable ID", async () => {
      const stableId = "res-pg-race-001";

      const reqA = request(app).post("/api/resources").send({
        id: stableId,
        topicId: "topic-pg-test",
        title: "Request A concurrently dispatched",
        type: "article",
        url: "https://example.com/a",
        openTarget: "archive://target-a",
      });

      const reqB = request(app).post("/api/resources").send({
        id: stableId,
        topicId: "topic-pg-test",
        title: "Request B concurrently dispatched",
        type: "article",
        url: "https://example.com/b",
        openTarget: "archive://target-b",
      });

      const [resA, resB] = await Promise.all([reqA, reqB]);

      // Both requests must complete successfully without uncaught server errors (500)
      expect([200, 201]).toContain(resA.status);
      expect([200, 201]).toContain(resB.status);

      // Criteria: One request creates (201), the other updates (200)
      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 201]);

      // Verify exact count in PostgreSQL database: must be exactly 1
      const countCheck = await testCtx.pool.query(
        'SELECT "id", "openTarget" FROM "Resource" WHERE "id" = $1',
        [stableId]
      );
      expect(countCheck.rows).toHaveLength(1);

      // openTarget cuối cùng phải là một trong hai giá trị hợp lệ đã gửi
      expect(["archive://target-a", "archive://target-b"]).toContain(
        countCheck.rows[0].openTarget
      );
    });
  }
);
