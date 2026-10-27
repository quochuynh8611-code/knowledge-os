import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { createBackupRouter } from "../../src/server/routes/backupRoutes";
import { createRateLimiter } from "../../src/lib/security";

/**
 * Integration Test Suite: Destructive /api/data/reset Endpoint Security Hardening (ADR-077)
 *
 * Requirements:
 * 1. Confirmation token ONLY accepted via HTTP header `X-Reset-Confirmation`.
 * 2. Fail-closed: Must reject requests (503) when server secret token is unconfigured or empty.
 * 3. Environment policy: Production mode requires ALLOW_DATABASE_RESET=true flag (403).
 * 4. Timing-safe comparison: Token mismatched or length-mismatched returns 403 (never throws 500).
 * 5. Body confirmToken without header is strictly rejected with 403.
 * 6. Rate limiter: Max 3 requests/minute per client, returns 429 on exhaustion.
 * 7. Structured audit logging on denial, success, and transaction failure.
 */
describe("Destructive Reset Endpoint Security (Integration ADR-077)", () => {
  const ORIGINAL_ENV = process.env;
  let mockPrisma: any;
  let mockLimiter: any;
  let app: express.Express;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };

    const mockTx: any = new Proxy(
      {},
      {
        get: () => ({
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        }),
      },
    );

    mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(mockTx)),
    };

    mockLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 5 });
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("1. Reset không có header X-Reset-Confirmation phải trả về HTTP 403 (RESET_CONFIRMATION_REQUIRED)", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("RESET_CONFIRMATION_REQUIRED");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("2. Reset với sai confirmation token (cùng độ dài) phải trả về HTTP 403 (INVALID_CONFIRMATION_TOKEN)", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "wrong-xx-secure-token-xyz");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("INVALID_CONFIRMATION_TOKEN");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("3. Reset với token sai độ dài không được làm server throw 500 (trả về HTTP 403 INVALID_CONFIRMATION_TOKEN)", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    // Token ngắn hơn hoặc dài hơn đáng kể
    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "short");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("INVALID_CONFIRMATION_TOKEN");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("4. Body chứa confirmToken nhưng thiếu header X-Reset-Confirmation vẫn phải bị từ chối 403", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .send({ confirmToken: "correct-secure-token-xyz" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("RESET_CONFIRMATION_REQUIRED");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("5. Reset đúng confirmation token qua header trong môi trường non-prod phải thành công (HTTP 200)", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "correct-secure-token-xyz");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("6. Reset trong production khi chưa bật ALLOW_DATABASE_RESET=true phải bị chặn (HTTP 403)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_DATABASE_RESET;
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "correct-secure-token-xyz");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("RESET_DISALLOWED_IN_PRODUCTION");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("7. Reset trong production có bật ALLOW_DATABASE_RESET=true và đúng header token phải thành công (HTTP 200)", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_DATABASE_RESET = "true";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "correct-secure-token-xyz");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("8. Fail-closed: Khi RESET_CONFIRMATION_TOKEN chưa được cấu hình hoặc rỗng trên server, phải từ chối (HTTP 503)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.RESET_CONFIRMATION_TOKEN;

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "any-token");

    expect(res.status).toBe(503);
    expect(res.body.error).toBe("RESET_DISABLED_UNCONFIGURED");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("9. Rate limiting: Reset bị giới hạn tần suất sau khi vượt quá 3 request/phút (HTTP 429)", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESET_CONFIRMATION_TOKEN = "correct-secure-token-xyz";

    const customResetLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 3 });
    app.use("/api", createBackupRouter(mockPrisma, mockLimiter, customResetLimiter));

    // Thực hiện 3 request thành công
    for (let i = 0; i < 3; i++) {
      const okRes = await request(app)
        .post("/api/data/reset")
        .set("X-Reset-Confirmation", "correct-secure-token-xyz");
      expect(okRes.status).toBe(200);
    }

    // Request thứ 4 phải bị chặn 429
    const blockedRes = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "correct-secure-token-xyz");

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error).toBe("TOO_MANY_REQUESTS");
  });

  it("10. Chốt chặn 1: Trên môi trường cá nhân (development/localhost), nếu thiếu header X-Reset-Confirmation, server tự động fallback thành công 200", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESET_CONFIRMATION_TOKEN;

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    // Gửi request không có bất kỳ header X-Reset-Confirmation nào
    const res = await request(app)
      .post("/api/data/reset")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("11. Chốt chặn 1: Trên môi trường cá nhân (development/localhost), client gửi default token thì server luôn chấp nhận 200", async () => {
    process.env.NODE_ENV = "development";
    process.env.RESET_CONFIRMATION_TOKEN = "custom-server-token-123";

    app.use("/api", createBackupRouter(mockPrisma, mockLimiter));

    // Client gửi DEFAULT_RESET_CONFIRMATION_TOKEN
    const res = await request(app)
      .post("/api/data/reset")
      .set("X-Reset-Confirmation", "knowledge-os-secure-local-reset-secret-2026");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});
