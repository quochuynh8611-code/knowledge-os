import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Gemini Service & AI Client Singleton Contract", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.GEMINI_API_KEY;
  });

  it("1. Trả về null khi GEMINI_API_KEY không được thiết lập", async () => {
    delete process.env.GEMINI_API_KEY;
    const { getGenAI } = await import("../../src/server/services/geminiService");
    const client = getGenAI();
    expect(client).toBeNull();
  });

  it("2. Khởi tạo GoogleGenAI instance thành công khi có GEMINI_API_KEY", async () => {
    process.env.GEMINI_API_KEY = "test-ai-key-12345";
    const { getGenAI } = await import("../../src/server/services/geminiService");
    const client = getGenAI();
    expect(client).not.toBeNull();
    expect(typeof client).toBe("object");
  });

  it("3. Giữ nguyên mô hình lazy singleton qua nhiều lần gọi liên tiếp", async () => {
    process.env.GEMINI_API_KEY = "test-ai-key-12345";
    const { getGenAI } = await import("../../src/server/services/geminiService");
    const clientFirst = getGenAI();
    const clientSecond = getGenAI();
    expect(clientFirst).toBe(clientSecond);
  });
});
