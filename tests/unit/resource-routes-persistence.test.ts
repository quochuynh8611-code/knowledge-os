import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createResourceRouter } from "../../src/server/routes/resourceRoutes";

describe("Slice 1 RED-A: Resource Route Persistence Contract (POST /api/resources)", () => {
  let app: express.Express;
  let inMemoryResources: Map<string, any>;
  let mockPrisma: any;

  beforeEach(() => {
    inMemoryResources = new Map<string, any>();

    mockPrisma = {
      resource: {
        findMany: vi.fn().mockImplementation(async () => {
          return Array.from(inMemoryResources.values());
        }),
        findUnique: vi.fn().mockImplementation(async ({ where }) => {
          if (!where?.id) return null;
          return inMemoryResources.get(where.id) || null;
        }),
        create: vi.fn().mockImplementation(async ({ data }) => {
          const id = data.id || `res-auto-${Date.now()}`;
          if (inMemoryResources.has(id)) {
            const err: any = new Error("Unique constraint failed on the fields: (`id`)");
            err.code = "P2002";
            err.meta = { target: ["id"] };
            throw err;
          }
          const record = {
            id,
            createdAt: new Date(),
            ...data,
          };
          inMemoryResources.set(id, record);
          return record;
        }),
        update: vi.fn().mockImplementation(async ({ where, data }) => {
          const existing = inMemoryResources.get(where.id);
          if (!existing) {
            const err: any = new Error("Record to update not found.");
            err.code = "P2025";
            throw err;
          }
          const updated = {
            ...existing,
            ...data,
          };
          inMemoryResources.set(where.id, updated);
          return updated;
        }),
        delete: vi.fn().mockImplementation(async ({ where }) => {
          const existing = inMemoryResources.get(where.id);
          if (!existing) {
            const err: any = new Error("Record to delete not found.");
            err.code = "P2025";
            throw err;
          }
          inMemoryResources.delete(where.id);
          return existing;
        }),
      },
    };

    app = express();
    app.use(express.json());
    app.use("/api", createResourceRouter(mockPrisma));
  });

  // Case A: Tạo Resource stable ID: Response 201, payload persistence có openTarget đã trim
  it("Case A: Tạo Resource với stable ID trả về 201 và lưu openTarget đã trim vào cơ sở dữ liệu", async () => {
    const payload = {
      id: "res-stable-001",
      topicId: "topic-test-01",
      title: "Nghiên cứu Kinh Kim Cang",
      type: "pdf",
      filePath: "02_PDF_Source/kim_cang.pdf",
      openTarget: "  archive://doc-kim-cang-uuid  ",
    };

    const res = await request(app).post("/api/resources").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("res-stable-001");
    expect(res.body.openTarget).toBe("archive://doc-kim-cang-uuid");

    // Kiểm tra state thực tế được lưu trong database boundary
    const persisted = inMemoryResources.get("res-stable-001");
    expect(persisted).toBeDefined();
    expect(persisted.openTarget).toBe("archive://doc-kim-cang-uuid");
  });

  // Case B: Gửi lại cùng stable ID: Response 200, không tạo thêm logical Resource
  it("Case B: Gửi lại cùng stable ID thực hiện cập nhật idempotent (200 OK) và không tạo bản ghi trùng", async () => {
    // Khởi tạo bản ghi ban đầu
    inMemoryResources.set("res-stable-002", {
      id: "res-stable-002",
      topicId: "topic-test-01",
      title: "Tiêu đề gốc",
      type: "book",
      url: "https://example.com/initial",
      openTarget: "archive://doc-initial",
      createdAt: new Date(),
    });

    const updatePayload = {
      id: "res-stable-002",
      topicId: "topic-test-01",
      title: "Tiêu đề đã chỉnh sửa",
      type: "book",
      url: "https://example.com/updated",
      openTarget: "archive://doc-updated",
    };

    const res = await request(app).post("/api/resources").send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Tiêu đề đã chỉnh sửa");
    expect(res.body.openTarget).toBe("archive://doc-updated");

    // Khẳng định tổng số bản ghi không tăng lên (không tạo bản ghi thứ hai)
    expect(inMemoryResources.size).toBe(1);
    const persisted = inMemoryResources.get("res-stable-002");
    expect(persisted.title).toBe("Tiêu đề đã chỉnh sửa");
    expect(persisted.openTarget).toBe("archive://doc-updated");
  });

  // Case C: Tạo mới thiếu openTarget: Response/Persistence hợp đồng không có override (null hoặc không xác định)
  it("Case C: Tạo mới không truyền openTarget trả về kết quả tạo hợp lệ (201) và không gán giá trị rác cho openTarget", async () => {
    const payload = {
      id: "res-stable-003",
      topicId: "topic-test-01",
      title: "Tài liệu không có openTarget",
      type: "article",
      url: "https://example.com/doc",
    };

    const res = await request(app).post("/api/resources").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("res-stable-003");
    // Hợp đồng response: khi omitted lúc create, response không được chứa chuỗi rác hay định dạng sai
    expect(res.body.openTarget ?? null).toBeNull();
    const persisted = inMemoryResources.get("res-stable-003");
    expect(persisted).toBeDefined();
    // Lưu ý kiến trúc: Mock in-memory trả undefined cho key chưa được set; DB thực tế với schema nullable sẽ persist NULL.
    expect(persisted.openTarget ?? null).toBeNull();
  });

  // Case D: Update thiếu openTarget: Không ghi đè giá trị hiện có
  it("Case D: Cập nhật tài liệu hiện có nhưng omitted openTarget phải giữ nguyên giá trị đã lưu", async () => {
    inMemoryResources.set("res-stable-004", {
      id: "res-stable-004",
      topicId: "topic-test-01",
      title: "Tiêu đề trước update",
      type: "pdf",
      filePath: "02_PDF_Source/doc.pdf",
      openTarget: "archive://doc-preserve-target",
      createdAt: new Date(),
    });

    // Payload chỉ đổi title, hoàn toàn không có trường openTarget (omitted)
    const updatePayload = {
      id: "res-stable-004",
      topicId: "topic-test-01",
      title: "Tiêu đề sau update",
      type: "pdf",
      filePath: "02_PDF_Source/doc.pdf",
    };

    const res = await request(app).post("/api/resources").send(updatePayload);

    expect(res.status).toBe(200);
    const persisted = inMemoryResources.get("res-stable-004");
    expect(persisted.title).toBe("Tiêu đề sau update");
    // Giá trị openTarget không bị ghi đè thành null hay undefined
    expect(persisted.openTarget).toBe("archive://doc-preserve-target");
  });

  // Case E: Update openTarget null: Persistence nhận NULL
  it("Case E: Cập nhật tài liệu với openTarget là null thực hiện xóa override và cập nhật NULL", async () => {
    inMemoryResources.set("res-stable-005", {
      id: "res-stable-005",
      topicId: "topic-test-01",
      title: "Tài liệu đang có openTarget",
      type: "article",
      url: "https://example.com/clear",
      openTarget: "obsidian://open?vault=test&file=doc",
      createdAt: new Date(),
    });

    const updatePayload = {
      id: "res-stable-005",
      topicId: "topic-test-01",
      title: "Tài liệu đang có openTarget",
      type: "article",
      url: "https://example.com/clear",
      openTarget: null,
    };

    const res = await request(app).post("/api/resources").send(updatePayload);

    expect(res.status).toBe(200);
    const persisted = inMemoryResources.get("res-stable-005");
    expect(persisted.openTarget).toBeNull();
  });

  // Case F: Update empty/whitespace: Persistence nhận NULL
  it("Case F: Cập nhật tài liệu với chuỗi rỗng hoặc khoảng trắng chuẩn hóa thành NULL", async () => {
    inMemoryResources.set("res-stable-006", {
      id: "res-stable-006",
      topicId: "topic-test-01",
      title: "Tài liệu chuẩn bị xóa bằng chuỗi rỗng",
      type: "book",
      filePath: "01_Books/sample.epub",
      openTarget: "archive://doc-old",
      createdAt: new Date(),
    });

    const updatePayload = {
      id: "res-stable-006",
      topicId: "topic-test-01",
      title: "Tài liệu chuẩn bị xóa bằng chuỗi rỗng",
      type: "book",
      filePath: "01_Books/sample.epub",
      openTarget: "    ",
    };

    const res = await request(app).post("/api/resources").send(updatePayload);

    expect(res.status).toBe(200);
    const persisted = inMemoryResources.get("res-stable-006");
    expect(persisted.openTarget).toBeNull();
  });

  // Case G: Payload thiếu trường bắt buộc: Response 400
  it("Case G: Payload thiếu trường bắt buộc (title) bị từ chối với mã 400 Bad Request", async () => {
    const invalidPayload = {
      id: "res-invalid-001",
      topicId: "topic-test-01",
      type: "pdf",
      url: "https://example.com/missing-title",
      // thiếu title
    };

    const res = await request(app).post("/api/resources").send(invalidPayload);

    expect(res.status).toBe(400);
    expect(inMemoryResources.has("res-invalid-001")).toBe(false);
  });

  // Case H: DB dependency ném lỗi: Không trả response thành công
  it("Case H: Khi tầng cơ sở dữ liệu ném lỗi, máy chủ không trả response thành công", async () => {
    mockPrisma.resource.create.mockRejectedValueOnce(new Error("Database connection pool exhausted"));
    mockPrisma.resource.findUnique.mockRejectedValueOnce(new Error("Database connection pool exhausted"));

    const payload = {
      id: "res-db-fail-001",
      topicId: "topic-test-01",
      title: "Tài liệu kiểm tra lỗi DB",
      type: "pdf",
      url: "https://example.com/error",
    };

    const res = await request(app).post("/api/resources").send(payload);

    expect(res.status).not.toBe(200);
    expect(res.status).not.toBe(201);
    expect(res.status).toBe(500);
    expect(inMemoryResources.has("res-db-fail-001")).toBe(false);
  });
});
