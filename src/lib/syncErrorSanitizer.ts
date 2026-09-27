export interface SanitizedSyncError {
  userMessage: string;
  rawError?: string;
  category: "network" | "conflict" | "auth" | "not_found" | "server" | "generic";
}

/**
 * Pure function to sanitize raw technical errors (Prisma, database, network, HTTP status codes)
 * into friendly, non-alarming Vietnamese microcopy for end-users,
 * while preserving the raw error for diagnostics mode.
 */
export function sanitizeSyncError(rawError?: string): SanitizedSyncError {
  if (!rawError || typeof rawError !== "string" || !rawError.trim()) {
    return {
      userMessage: "Không thể lưu thay đổi vào lúc này. Hệ thống sẽ tự động thử lại.",
      category: "generic",
    };
  }

  const err = rawError.trim();
  const lower = err.toLowerCase();

  // Network / Connection / Timeout
  if (
    lower.includes("fetch") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("etimedout") ||
    lower.includes("timeout") ||
    lower.includes("connection reset") ||
    lower.includes("enotfound") ||
    lower.includes("offline")
  ) {
    return {
      userMessage: "Không thể kết nối máy chủ. Thay đổi đã được giữ an toàn trên máy và sẽ tự động gửi lại khi có mạng.",
      rawError: err,
      category: "network",
    };
  }

  // Database / Prisma / Conflict / Constraints
  if (
    lower.includes("prisma") ||
    lower.includes("constraint") ||
    lower.includes("duplicate") ||
    lower.includes("conflict") ||
    lower.includes("foreign key") ||
    lower.includes("unique") ||
    lower.includes("validation error")
  ) {
    return {
      userMessage: "Dữ liệu có thể đã tồn tại hoặc bị xung đột phiên bản.",
      rawError: err,
      category: "conflict",
    };
  }

  // Auth / Permission
  if (
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("authentication") ||
    lower.includes("permission denied")
  ) {
    return {
      userMessage: "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục lưu.",
      rawError: err,
      category: "auth",
    };
  }

  // Not Found
  if (
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("cannot find")
  ) {
    return {
      userMessage: "Mục dữ liệu gốc không còn tồn tại trên máy chủ.",
      rawError: err,
      category: "not_found",
    };
  }

  // Server error / Crash / 500 / 502 / 503
  if (
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("504") ||
    lower.includes("internal server error") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable") ||
    lower.includes("panic")
  ) {
    return {
      userMessage: "Máy chủ đang bận xử lý hoặc gặp sự cố tạm thời. Sẽ tự động thử lại.",
      rawError: err,
      category: "server",
    };
  }

  // Fallback
  return {
    userMessage: "Không thể lưu thay đổi vào lúc này. Hệ thống sẽ tự động thử lại.",
    rawError: err,
    category: "generic",
  };
}
