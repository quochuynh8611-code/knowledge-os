import type { Request, Response, NextFunction } from "express";

/**
 * Interface cho cấu hình bộ giới hạn tần suất (Rate Limiter)
 */
export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export interface RateLimiter {
  check(ip: string): RateLimitCheckResult;
  reset(): void;
}

/**
 * Tạo bộ đếm tần suất trượt trong bộ nhớ (In-Memory Sliding Window Rate Limiter)
 */
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { windowMs, maxRequests } = options;
  const requestLogs = new Map<string, number[]>();

  return {
    check(ip: string): RateLimitCheckResult {
      const now = Date.now();
      const timestamps = requestLogs.get(ip) || [];

      // Lọc bỏ các timestamp đã quá hạn
      const recent = timestamps.filter((t) => now - t < windowMs);

      if (recent.length >= maxRequests) {
        const oldest = recent[0];
        const retryAfterMs = Math.max(0, windowMs - (now - oldest));
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

        requestLogs.set(ip, recent);
        return {
          allowed: false,
          retryAfterSeconds,
          remaining: 0,
        };
      }

      recent.push(now);
      requestLogs.set(ip, recent);

      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: maxRequests - recent.length,
      };
    },

    reset(): void {
      requestLogs.clear();
    },
  };
}

/**
 * Express Middleware áp dụng Rate Limiting cho endpoint
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  customMessage = "Quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau.",
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-ip";

    const result = limiter.check(ip);

    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, result.remaining).toString(),
    );

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfterSeconds.toString());
      return res.status(429).json({
        error: "TOO_MANY_REQUESTS",
        message: customMessage,
        retryAfterSeconds: result.retryAfterSeconds,
      });
    }

    next();
  };
}

/**
 * Xóa bỏ và che giấu các thông tin nhạy cảm trong đối tượng dữ liệu
 */
function sanitizeMetadata(data: unknown): unknown {
  if (typeof data === "string") {
    // Ẩn mật khẩu trong connection string database: postgresql://user:pass@host
    let sanitized = data.replace(
      /(:\/\/[^:]+:)([^@]+)(@)/g,
      "$1[REDACTED]$3",
    );
    // Ẩn Gemini API Keys dạng AIzaSy...
    sanitized = sanitized.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, "[REDACTED_API_KEY]");
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata);
  }

  if (data !== null && typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("key") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token")
      ) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeMetadata(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

/**
 * Tạo chuỗi log có cấu trúc chuẩn JSON (Structured JSON Logging)
 */
export function formatStructuredLog(
  level: "info" | "warn" | "error",
  event: string,
  metadata: Record<string, unknown> = {},
): string {
  const sanitizedMeta = sanitizeMetadata(metadata) as Record<string, unknown>;
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata: sanitizedMeta,
  };
  return JSON.stringify(logEntry);
}

/**
 * Helper log có cấu trúc ghi ra console
 */
export function logStructuredEvent(
  level: "info" | "warn" | "error",
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  const json = formatStructuredLog(level, event, metadata);
  if (level === "error") {
    console.error(json);
  } else if (level === "warn") {
    console.warn(json);
  } else {
    console.log(json);
  }
}
