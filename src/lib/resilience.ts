import {
  DbHealthResponseSchema,
  ValidatedDbHealthResponse,
} from "./validation";
import { logStructuredEvent } from "./security";

export const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.1-pro-preview",
];

/**
 * Phân định lỗi AI có thể thử lại (Retryable) hay lỗi cấu trúc/xác thực không được phép thử lại
 */
export function isRetryableGeminiError(error: any): boolean {
  const status = error?.status || error?.code || error?.error?.code;
  const message = (error?.message || "").toLowerCase();

  // 1. Non-retryable status codes (Fast-Fail)
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === "INVALID_ARGUMENT" ||
    status === "PERMISSION_DENIED" ||
    status === "UNAUTHENTICATED" ||
    status === "NOT_FOUND"
  ) {
    return false;
  }

  // 2. Explicit Retryable status codes
  if (
    status === 503 ||
    status === 429 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED"
  ) {
    return true;
  }

  // 3. Inspect message strings
  if (
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("unavailable") ||
    message.includes("rate limit") ||
    message.includes("quota") ||
    message.includes("resource has been exhausted") ||
    message.includes("503") ||
    message.includes("429")
  ) {
    return true;
  }

  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gọi Gemini AI với cơ chế Bounded Retry và Multi-Model Fallback có kiểm soát ranh giới
 */
export async function generateContentWithResilience(
  ai: any,
  params: {
    contents: string;
    config?: any;
    primaryModel?: string;
  },
): Promise<{ text: string; modelUsed: string }> {
  const primary = params.primaryModel || "gemini-3.6-flash";
  const modelQueue = Array.from(new Set([primary, ...CANDIDATE_MODELS]));
  let lastError: any = null;

  for (const model of modelQueue) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        const text = response.text || "";
        return { text, modelUsed: model };
      } catch (err: any) {
        lastError = err;

        // Nếu là lỗi non-retryable (400, 401, Invalid Arg), ngắt ngay lập tức!
        if (!isRetryableGeminiError(err)) {
          logStructuredEvent("warn", "GEMINI_NON_RETRYABLE_ERROR", {
            model,
            attempt,
            error: err?.message || String(err),
            status: err?.status || err?.code,
          });
          throw err;
        }

        logStructuredEvent("warn", "GEMINI_RETRYABLE_ERROR", {
          model,
          attempt,
          error: err?.message || String(err),
        });

        if (attempt < 2) {
          await sleep(1500 * attempt);
          continue;
        }
        // Khi attempt 2 thất bại, thoát vòng lặp attempt để thử model tiếp theo trong queue
        break;
      }
    }
  }

  logStructuredEvent("error", "GEMINI_FALLBACK_EXHAUSTED", {
    modelsAttempted: modelQueue,
    finalError: lastError?.message || String(lastError),
  });

  throw lastError;
}

/**
 * Kiểm tra sức khỏe kết nối Cơ sở dữ liệu PostgreSQL theo chuẩn Latency Policy
 */
export async function checkDbHealth(
  db: any,
): Promise<ValidatedDbHealthResponse> {
  const start = Date.now();
  try {
    await db.$queryRawUnsafe("SELECT 1");
    const latencyMs = Date.now() - start;
    const status =
      latencyMs < 100 ? "healthy" : latencyMs < 1000 ? "degraded" : "unhealthy";

    return DbHealthResponseSchema.parse({
      status,
      latencyMs,
      database: "postgresql",
      connected: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    logStructuredEvent("warn", "DATABASE_HEALTH_PROBE_FAILED", {
      latencyMs,
      error: err?.message || String(err),
    });

    return DbHealthResponseSchema.parse({
      status: "unhealthy",
      latencyMs: Math.max(0, latencyMs),
      database: "postgresql",
      connected: false,
      timestamp: new Date().toISOString(),
    });
  }
}
