import { describe, it, expect } from "vitest";
import { sanitizeSyncError } from "../../src/lib/syncErrorSanitizer";

describe("syncErrorSanitizer pure helper", () => {
  it("returns default friendly fallback when no error or empty string is provided", () => {
    expect(sanitizeSyncError(undefined).userMessage).toBe(
      "Không thể lưu thay đổi vào lúc này. Hệ thống sẽ tự động thử lại."
    );
    expect(sanitizeSyncError("").userMessage).toBe(
      "Không thể lưu thay đổi vào lúc này. Hệ thống sẽ tự động thử lại."
    );
  });

  it("sanitizes network and offline related errors", () => {
    const netErrors = [
      "Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "TypeError: fetch failed",
      "ECONNREFUSED 127.0.0.1:3000",
      "ETIMEDOUT",
      "Network timeout",
    ];

    for (const err of netErrors) {
      const res = sanitizeSyncError(err);
      expect(res.userMessage).toContain("Không thể kết nối máy chủ");
      expect(res.rawError).toBe(err);
    }
  });

  it("sanitizes database and Prisma ORM errors without leaking stack or constraint details", () => {
    const prismaErrors = [
      "PrismaClientKnownRequestError: Unique constraint failed on the fields: (`id`)",
      "Invalid `prisma.note.create()` invocation: Foreign key constraint failed",
      "PrismaClientInitializationError: Can't reach database server at `localhost:5432`",
    ];

    for (const err of prismaErrors) {
      const res = sanitizeSyncError(err);
      expect(res.userMessage).toBe("Dữ liệu có thể đã tồn tại hoặc bị xung đột phiên bản.");
      expect(res.userMessage).not.toContain("Prisma");
      expect(res.userMessage).not.toContain("Foreign key");
      expect(res.rawError).toBe(err);
    }
  });

  it("sanitizes HTTP 401 and 403 authorization errors", () => {
    const authErrors = [
      "HTTP 401: Unauthorized",
      "HTTP 403: Forbidden - token expired",
      "Authentication token missing or invalid",
    ];

    for (const err of authErrors) {
      const res = sanitizeSyncError(err);
      expect(res.userMessage).toBe("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục lưu.");
    }
  });

  it("sanitizes HTTP 404 not found errors", () => {
    const notFoundErrors = [
      "HTTP 404: Not Found",
      "Resource with ID note-123 does not exist",
    ];

    for (const err of notFoundErrors) {
      const res = sanitizeSyncError(err);
      expect(res.userMessage).toBe("Mục dữ liệu gốc không còn tồn tại trên máy chủ.");
    }
  });

  it("sanitizes HTTP 500 and general server crash errors", () => {
    const serverErrors = [
      "HTTP 500: Internal Server Error",
      "HTTP 502: Bad Gateway",
      "HTTP 503: Service Unavailable",
      "Internal Server Error: panic in handler",
    ];

    for (const err of serverErrors) {
      const res = sanitizeSyncError(err);
      expect(res.userMessage).toBe("Máy chủ đang bận xử lý hoặc gặp sự cố tạm thời. Sẽ tự động thử lại.");
      expect(res.userMessage).not.toContain("panic");
      expect(res.userMessage).not.toContain("500");
    }
  });

  it("sanitizes generic unknown errors safely", () => {
    const randomError = "Some unexpected runtime exception occurred in backend worker process";
    const res = sanitizeSyncError(randomError);
    expect(res.userMessage).toBe("Không thể lưu thay đổi vào lúc này. Hệ thống sẽ tự động thử lại.");
    expect(res.rawError).toBe(randomError);
  });
});
