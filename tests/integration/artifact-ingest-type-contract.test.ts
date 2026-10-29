import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createArtifactRouter } from "../../src/server/routes/artifactRoutes";

describe("Phase 14: Artifact Ingest Type Contract Alignment", () => {
  let app: express.Express;
  let mockPrisma: any;
  let inMemoryArtifacts: Record<string, any>;

  beforeEach(() => {
    inMemoryArtifacts = {};

    mockPrisma = {
      groundedArtifact: {
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (where.id) return inMemoryArtifacts[where.id] || null;
          if (where.idempotencyKey) {
            return (
              Object.values(inMemoryArtifacts).find(
                (a: any) => a.idempotencyKey === where.idempotencyKey
              ) || null
            );
          }
          return null;
        }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          const record = {
            id: `artifact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            citationCount: data.citations?.create?.length || 0,
            ...data,
          };
          inMemoryArtifacts[record.id] = record;
          return record;
        }),
      },
      artifactCitation: {
        create: vi.fn().mockImplementation(async ({ data }) => data),
      },
      researchSession: {
        update: vi.fn().mockImplementation(async () => ({})),
      },
      researchTimelineEvent: {
        create: vi.fn().mockImplementation(async () => ({})),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createArtifactRouter(mockPrisma as any));
  });

  // Scenario 1: Lưu mindmap_outline thành công
  it("Scenario 1: Given backend ingest endpoint đang chạy, When POST /api/artifacts/ingest với artifactType 'mindmap_outline', Then HTTP status là 201 và response giữ nguyên artifactType 'mindmap_outline'", async () => {
    const payload = {
      sessionId: "session-test-01",
      topicId: "topic-test-01",
      artifactType: "mindmap_outline",
      title: "Mindmap Outline Tri Thức Khảo Cứu",
      rawContent: "# Tiêu Đề Trung Tâm\n## Nhánh Cấp 1\n- Nút con [liên quan]",
      citations: [],
      metadata: { source: "antigravity-2.0" },
    };

    const res = await request(app)
      .post("/api/artifacts/ingest")
      .send(payload)
      .expect(201);

    expect(res.body.artifact).toBeDefined();
    expect(res.body.artifact.artifactType).toBe("mindmap_outline");
    expect(res.body.artifact.title).toBe(payload.title);
    expect(res.body.isDuplicate).toBe(false);

    // Verify stored in DB
    const saved = Object.values(inMemoryArtifacts).find(
      (a: any) => a.artifactType === "mindmap_outline"
    );
    expect(saved).toBeDefined();
    expect(saved.artifactType).toBe("mindmap_outline");
  });

  // Scenario 2: Các artifact type NotebookLM đều được chấp nhận
  it("Scenario 2: Given danh sách artifact type hợp lệ từ NotebookLM Studio, When lần lượt POST từng type, Then không có request nào trả HTTP 400 vì invalid artifactType", async () => {
    const notebookLMTypes = [
      "source_pack",
      "study_guide",
      "briefing_doc",
      "audio_overview_summary",
      "faq",
      "dialectic_matrix",
      "socratic_inquiry",
      "mindmap_outline",
    ];

    for (const type of notebookLMTypes) {
      const payload = {
        sessionId: "session-test-multi",
        topicId: "topic-test-01",
        artifactType: type,
        title: `Artifact Title for ${type}`,
        rawContent: `Content for ${type} with specific research body.`,
        citations: [],
      };

      const res = await request(app)
        .post("/api/artifacts/ingest")
        .send(payload);

      expect(res.status, `Failed on artifactType "${type}": ${JSON.stringify(res.body)}`).toBe(201);
      expect(res.body.artifact.artifactType).toBe(type);
    }
  });

  // Scenario 3: Type cũ vẫn hợp lệ
  it("Scenario 3: Given artifactType là study_guide, briefing_doc, qa_pair hoặc raw_markdown, When POST /api/artifacts/ingest, Then request vẫn thành công", async () => {
    const legacyTypes = ["study_guide", "briefing_doc", "qa_pair", "raw_markdown"];

    for (const type of legacyTypes) {
      const payload = {
        sessionId: "session-test-legacy",
        topicId: "topic-test-01",
        artifactType: type,
        title: `Legacy Artifact for ${type}`,
        rawContent: `Content for legacy type ${type}.`,
        citations: [],
      };

      const res = await request(app)
        .post("/api/artifacts/ingest")
        .send(payload);

      expect(res.status, `Legacy type "${type}" should succeed`).toBe(201);
      expect(res.body.artifact.artifactType).toBe(type);
    }
  });

  // Scenario 4: Type không hợp lệ vẫn bị chặn
  it("Scenario 4: Given artifactType là 'not_a_real_type', When POST /api/artifacts/ingest, Then HTTP status là 400 và error message rõ ràng", async () => {
    const payload = {
      sessionId: "session-test-invalid",
      topicId: "topic-test-01",
      artifactType: "not_a_real_type",
      title: "Invalid Type Artifact",
      rawContent: "Some content here",
    };

    const res = await request(app)
      .post("/api/artifacts/ingest")
      .send(payload)
      .expect(400);

    expect(res.body.error).toBe("Dữ liệu artifact không hợp lệ");
    expect(res.body.details).toBeDefined();
    const issue = res.body.details.find((d: any) => d.path?.includes("artifactType"));
    expect(issue).toBeDefined();
  });

  // Scenario 5: Retry pending artifact thành công
  it("Scenario 5: Given artifact mindmap_outline đã lưu pending, When người dùng bấm Retry đồng bộ, Then backend chấp nhận artifact, trả về 201 hoặc 200, và không tạo artifact trùng khi gọi lần 2", async () => {
    const retryPayload = {
      sessionId: "session-test-retry",
      topicId: "topic-test-01",
      artifactType: "mindmap_outline",
      title: "Mindmap Pending Draft To Retry",
      rawContent: "# Mindmap Root Node\n## Subtopic\n- Leaf 1",
      citations: [],
      metadata: {
        localDraftId: "local-draft-uuid-001",
      },
    };

    // First retry call
    const res1 = await request(app)
      .post("/api/artifacts/ingest")
      .send(retryPayload)
      .expect(201);

    expect(res1.body.artifact).toBeDefined();
    expect(res1.body.artifact.artifactType).toBe("mindmap_outline");
    expect(res1.body.isDuplicate).toBe(false);

    // Second retry call with same content (simulating idempotency check on duplicate retry)
    const res2 = await request(app)
      .post("/api/artifacts/ingest")
      .send(retryPayload)
      .expect(200);

    expect(res2.body.artifact).toBeDefined();
    expect(res2.body.artifact.id).toBe(res1.body.artifact.id);
    expect(res2.body.isDuplicate).toBe(true);

    // Total artifacts in DB should be exactly 1
    expect(Object.keys(inMemoryArtifacts).length).toBe(1);
  });
});
