import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiDataRepository } from "../../src/services/dataRepository";

describe("ApiDataRepository.resetAllData - Security Header and Error Gating", () => {
  let mockFetch: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("1. Gửi kèm X-Reset-Confirmation header khi gọi /api/data/reset", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const repo = new ApiDataRepository("/api");

    const result = await repo.resetAllData();
    expect(result).toBe(true);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("http://localhost:3000/api/data/reset");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Reset-Confirmation": "knowledge-os-secure-local-reset-secret-2026",
    });
  });

  it("2. Ném lỗi rõ ràng khi backend từ chối reset (HTTP 403 / 503)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: "INVALID_CONFIRMATION_TOKEN", message: "Forbidden" }),
    });

    const repo = new ApiDataRepository("/api");

    await expect(repo.resetAllData()).rejects.toThrow(/Backend resetAllData failed \(403\)/);
  });
});
